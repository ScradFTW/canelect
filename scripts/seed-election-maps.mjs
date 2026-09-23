// Seeds the maps table with real federal election results, computed from
// Elections Canada's published data, so the site has something to browse.
//
// Usage: DATABASE_URL=postgresql://... node scripts/seed-election-maps.mjs [--dry-run]
//
// Maps (all on the 343 ridings of the 2023 representation order):
// - 2025 results: winner of each riding in the 45th general election
// - 2021 results: Elections Canada's transposition of the 44th general
//   election's votes onto the 2023 boundaries (the 2021 election itself was
//   held on the old 338 ridings, so this is its official "notional" result)
// - Two what-ifs: 2025 riding vote shares with a uniform 3-point swing
//   between the Liberals and Conservatives, one in each direction
//
// Safe to re-run: each map is upserted by name.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const SOURCES = {
    ge45: 'https://www.elections.ca/res/rep/off/ovrGE45/62/data_donnees/table_tableau12.csv',
    ge44Transposed: 'https://www.elections.ca/res/rep/tra/2023rep/csv/Transposition_343_FED.csv',
};

const PARTIES = ['Liberal', 'Conservative', 'NDP', 'Bloc Quebecois', 'Green'];

const RIDING_IDS = new Set(Object.keys(JSON.parse(fs.readFileSync(
    path.join(import.meta.dirname, '../src/data/geoid_to_province.json'), 'utf8'))));

/** Minimal RFC 4180 CSV parser (quoted fields, embedded commas and quotes). */
function parseCsv(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') inQuotes = false;
            else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(field); rows.push(row); row = []; field = '';
        } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const [header, ...body] = rows.filter(r => r.some(Boolean));
    return body.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

async function fetchCsv(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return parseCsv((await res.text()).replace(/^﻿/, ''));
}

/** Maps Elections Canada's party labels to the app's five parties (or null). */
function partyOf(label) {
    if (label.includes('Liberal')) return 'Liberal';
    if (label.includes('Conservative')) return 'Conservative';
    if (label.includes('New Democratic')) return 'NDP';
    if (label.includes('Bloc Québécois')) return 'Bloc Quebecois';
    if (label.includes('Green Party')) return 'Green';
    return null;
}

/** Vote share (%) by party, per riding, from the 2025 candidate results. */
function ge45Shares(rows) {
    const shares = {};
    for (const r of rows) {
        const id = r['Electoral District Number/Numéro de circonscription'];
        const party = partyOf(r['Candidate/Candidat']);
        if (!party) continue;
        shares[id] ??= {};
        shares[id][party] = (shares[id][party] ?? 0) + parseFloat(r['Percentage of Votes Obtained /Pourcentage des votes obtenus']);
    }
    return shares;
}

/** Official 2025 winners, from the "Majority" column Elections Canada fills in for each winner. */
function ge45Winners(rows) {
    const map = {};
    for (const r of rows) {
        if (!r['Majority/Majorité']) continue;
        const party = partyOf(r['Candidate/Candidat']);
        if (!party) throw new Error(`2025 winner outside the five parties: ${r['Candidate/Candidat']}`);
        map[r['Electoral District Number/Numéro de circonscription']] = party;
    }
    return map;
}

function ge44TransposedWinners(rows) {
    const votes = {};
    for (const r of rows) {
        if (r.Transposed_Votes === '' || r.Transposed_Votes === 'NA') continue;
        (votes[r.FED_NUM] ??= {})[r.Political_Party_EN] = parseFloat(r.Transposed_Votes);
    }
    return Object.fromEntries(Object.entries(votes).map(([id, byParty]) => {
        const top = Object.keys(byParty).reduce((a, b) => (byParty[a] >= byParty[b] ? a : b));
        const party = partyOf(top);
        if (!party) throw new Error(`2021 notional winner outside the five parties: ${id} ${top}`);
        return [id, party];
    }));
}

/** Moves `points` of vote share from one party to another in every riding, then re-picks winners. */
function uniformSwing(shares, from, to, points) {
    return Object.fromEntries(Object.entries(shares).map(([id, s]) => {
        const swung = {...s, [from]: (s[from] ?? 0) - points, [to]: (s[to] ?? 0) + points};
        const winner = Object.keys(swung).reduce((a, b) => (swung[a] >= swung[b] ? a : b));
        return [id, winner];
    }));
}

function check(name, map) {
    const ids = Object.keys(map);
    const bad = ids.filter(id => !RIDING_IDS.has(id) || !PARTIES.includes(map[id]));
    if (ids.length !== RIDING_IDS.size || bad.length) {
        throw new Error(`${name}: ${ids.length} ridings, ${bad.length} invalid (${bad.slice(0, 3).join(', ')})`);
    }
    const seats = Object.fromEntries(PARTIES.map(p => [p, ids.filter(id => map[id] === p).length]));
    console.log(`${name}: ${JSON.stringify(seats)}`);
}

const [ge45Rows, ge44Rows] = await Promise.all([fetchCsv(SOURCES.ge45), fetchCsv(SOURCES.ge44Transposed)]);
const shares = ge45Shares(ge45Rows);

const maps = {
    '2025-election-results': ge45Winners(ge45Rows),
    '2021-election-results': ge44TransposedWinners(ge44Rows),
    'Conservatives-3-points-stronger-than-2025': uniformSwing(shares, 'Liberal', 'Conservative', 3),
    'Liberals-3-points-stronger-than-2025': uniformSwing(shares, 'Conservative', 'Liberal', 3),
};
for (const [name, map] of Object.entries(maps)) check(name, map);

if (process.argv.includes('--dry-run')) process.exit(0);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const client = new pg.Client({connectionString: process.env.DATABASE_URL});
await client.connect();
try {
    await client.query(`CREATE TABLE IF NOT EXISTS maps
                        (
                            id         SERIAL PRIMARY KEY,
                            name       TEXT UNIQUE NOT NULL,
                            ridings    JSONB       NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )`);
    for (const [name, map] of Object.entries(maps)) {
        await client.query(
            `INSERT INTO maps (name, ridings) VALUES ($1, $2::jsonb)
             ON CONFLICT (name) DO UPDATE SET ridings = EXCLUDED.ridings`,
            [name, JSON.stringify(map)]);
    }
    console.log(`Upserted ${Object.keys(maps).length} maps.`);
} finally {
    await client.end();
}
