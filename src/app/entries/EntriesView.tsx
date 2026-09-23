'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Color mapping for parties
const partyColors: Record<string, string> = {
    liberal: '#D71920',
    conservative: '#034EA2',
    ndp: '#F37021',
    green: '#00A878',
    bloc: '#ADD8E6',
};

// Define types matching the API response
export type Entry = {
    name: string;
    created_at: string;
    total_count: number;
    liberal: number;
    conservative: number;
    ndp: number;
    green: number;
    bloc: number;
};

interface ApiResponse {
    page: number;
    limit: number;
    total: number;
    filtered_count: number;
    entries: Entry[];
}

const EntriesView: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pageNum = parseInt(searchParams.get('page') || '1', 10);
    const limitNum = 12;

    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sorting state
    const [sortKey, setSortKey] = useState<keyof Entry | ''>('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    // Filter state - initialize from localStorage if available
    const [hideIncomplete, setHideIncomplete] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hideIncomplete');
            return saved === 'true';
        }
        return false;
    });
    const [hideSingleParty, setHideSingleParty] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hideSingleParty');
            return saved === 'true';
        }
        return false;
    });

    // Fetch data client-side
    const fetchEntries = async (page: number, limit: number) => {
        setLoading(true);
        setError(null);
        try {
            // Add filter parameters to the API request
            const url = new URL('/api/maps', window.location.origin);
            url.searchParams.append('page', page.toString());
            url.searchParams.append('limit', limit.toString());

            // Only add filter parameters if they are true
            if (hideIncomplete) {
                url.searchParams.append('hideIncomplete', 'true');
            }

            if (hideSingleParty) {
                url.searchParams.append('hideSingleParty', 'true');
            }

            // Add sorting parameters if set
            if (sortKey) {
                url.searchParams.append('sortKey', sortKey);
                url.searchParams.append('sortAsc', sortAsc.toString());
            }

            const res = await fetch(url.toString());

            if (!res.ok) throw new Error(`Error ${res.status}`);
            const json: ApiResponse = await res.json();
            setData(json);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load entries: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries(pageNum, limitNum);
    }, [pageNum, limitNum, hideIncomplete, hideSingleParty, sortKey, sortAsc]);

    const changePage = (newPage: number) => {
        router.push(`/entries?page=${newPage}&limit=${limitNum}`);
    };

    // Apply sorting to entries
    const sortedEntries = useMemo(() => {
        if (!data) return [];

        return [...data.entries].sort((a, b) => {
            // For party-based sorting, find the winning party
            if (['liberal', 'conservative', 'ndp', 'green', 'bloc'].includes(sortKey)) {
                // Get the party with the most ridings for each entry
                const getWinningParty = (entry: Entry) => {
                    const parties = [
                        { name: 'liberal', count: entry.liberal },
                        { name: 'conservative', count: entry.conservative },
                        { name: 'ndp', count: entry.ndp },
                        { name: 'green', count: entry.green },
                        { name: 'bloc', count: entry.bloc }
                    ];
                    return parties.sort((p1, p2) => p2.count - p1.count)[0];
                };

                const aWinner = getWinningParty(a);
                const bWinner = getWinningParty(b);

                // If sorting by a specific party
                if (aWinner.name === sortKey && bWinner.name !== sortKey) {
                    return sortAsc ? 1 : -1;
                } else if (aWinner.name !== sortKey && bWinner.name === sortKey) {
                    return sortAsc ? -1 : 1;
                }

                // If both or neither have the same winning party, sort by count of that party
                // @ts-expect-error -- sortKey is a string, not narrowed to keyof Entry
                const valA = a[sortKey] as number;
                // @ts-expect-error -- sortKey is a string, not narrowed to keyof Entry
                const valB = b[sortKey] as number;
                return sortAsc ? valA - valB : valB - valA;
            }

            // For non-party sorting
            // @ts-expect-error -- sortKey is a string, not narrowed to keyof Entry
            const valA = a[sortKey];
            // @ts-expect-error -- sortKey is a string, not narrowed to keyof Entry
            const valB = b[sortKey];
            let cmp = 0;
            if (sortKey === 'created_at') {
                cmp = new Date(valA as string).getTime() - new Date(valB as string).getTime();
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                cmp = valA - valB;
            } else {
                cmp = String(valA).localeCompare(String(valB));
            }
            return sortAsc ? cmp : -cmp;
        });
    }, [data, sortKey, sortAsc]);

    // Render arrow indicator
    const renderArrow = (key: keyof Entry) =>
        sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

    return (
        <>
            <div className="container">
                <h1>Saved Maps</h1>

                <div className="header-actions">
                    <a href={"/"} className="back-link">← Back to your draft</a>

                    {!loading && data && (
                        <>
                            <div className="filter-controls">
                                <div className="filter-option">
                                    <input
                                        type="checkbox"
                                        id="hide-incomplete"
                                        checked={hideIncomplete}
                                        onChange={(e) => {
                                            const newValue = e.target.checked;
                                            setHideIncomplete(newValue);
                                            localStorage.setItem('hideIncomplete', String(newValue));
                                        }}
                                    />
                                    <label htmlFor="hide-incomplete">Hide incomplete maps</label>
                                </div>
                                <div className="filter-option">
                                    <input
                                        type="checkbox"
                                        id="hide-single-party"
                                        checked={hideSingleParty}
                                        onChange={(e) => {
                                            const newValue = e.target.checked;
                                            setHideSingleParty(newValue);
                                            localStorage.setItem('hideSingleParty', String(newValue));
                                        }}
                                    />
                                    <label htmlFor="hide-single-party">Hide single-party maps ({'>'}80% of ridings)</label>
                                </div>
                            </div>

                            <div className="sort-controls">
                                <label htmlFor="sort-select">Sort by:</label>
                                <select
                                    id="sort-select"
                                    value={sortKey}
                                    onChange={(e) => {
                                        const value = e.target.value as keyof Entry | '';
                                        if (value === sortKey) {
                                            setSortAsc(!sortAsc);
                                        } else {
                                            setSortKey(value);
                                            // Set default sort direction: DESC for parties, ASC for others
                                            const partyFields = ['liberal', 'conservative', 'ndp', 'green', 'bloc'];
                                            setSortAsc(!partyFields.includes(value));
                                        }
                                    }}
                                >
                                    <option value="created_at">Date Saved</option>
                                    <option value="name">Name</option>
                                    <option value="total_count">Total Ridings</option>
                                    <option value="liberal">Liberal</option>
                                    <option value="conservative">Conservative</option>
                                    <option value="ndp">NDP</option>
                                    <option value="green">Green</option>
                                    <option value="bloc">Bloc</option>
                                </select>

                                <button
                                    className="sort-direction"
                                    onClick={() => setSortAsc(!sortAsc)}
                                    title={sortAsc ? "Ascending" : "Descending"}
                                >
                                    {sortAsc ? '↑' : '↓'}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {loading && <p className="info">Loading...</p>}
                {error && <p className="error">{error}</p>}

                {!loading && data && (
                    <>
                        <div className="cards-container">
                            {sortedEntries.map((entry, idx) => (
                                <div key={idx} className="entry-card">
                                    <div className="card-header">
                                        <h2 className="entry-name">{entry.name}</h2>
                                        <a href={`/map/${encodeURIComponent(entry.name)}`} className="view-button">
                                            View Map
                                        </a>
                                    </div>

                                    <div className="card-meta">
                                        <span className="updated-at">
                                            Saved: {new Date(entry.created_at).toLocaleString()}
                                        </span>
                                        <span className="total-count">
                                            Total: <strong>{entry.total_count}</strong> ridings
                                        </span>
                                    </div>

                                    <div className="party-stats">
                                        {Object.entries({
                                            liberal: entry.liberal,
                                            conservative: entry.conservative,
                                            ndp: entry.ndp,
                                            green: entry.green,
                                            bloc: entry.bloc
                                        })
                                        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                                        .map(([party, count]) => (
                                            <div key={party} className="party-bar" style={{
                                                background: partyColors[party as keyof typeof partyColors],
                                                width: `${(count as number / entry.total_count) * 100}%`,
                                                minWidth: (count as number) > 0 ? '5%' : '0'
                                            }}>
                                                <span className="party-count">{count}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="party-legend">
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.liberal }}></span>
                                            <span>Liberal: {entry.liberal}</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.conservative }}></span>
                                            <span>Conservative: {entry.conservative}</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.ndp }}></span>
                                            <span>NDP: {entry.ndp}</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.green }}></span>
                                            <span>Green: {entry.green}</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="color-box" style={{ background: partyColors.bloc }}></span>
                                            <span>Bloc: {entry.bloc}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination controls */}
                        {data.total > 0 && (
                            <div className="pagination-controls">
                                <button 
                                    className="pagination-button"
                                    onClick={() => changePage(pageNum - 1)}
                                    disabled={pageNum <= 1}
                                >
                                    Previous
                                </button>

                                <div className="pagination-pages">
                                    {(() => {
                                        const totalPages = Math.ceil(data.total / limitNum);
                                        const pages = [];

                                        // Always show first page
                                        if (totalPages > 0) {
                                            pages.push(
                                                <button 
                                                    key={1}
                                                    className={`page-number ${pageNum === 1 ? 'active' : ''}`}
                                                    onClick={() => changePage(1)}
                                                    disabled={pageNum === 1}
                                                >
                                                    1
                                                </button>
                                            );
                                        }

                                        // Add ellipsis if needed
                                        if (pageNum > 4) {
                                            pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
                                        }

                                        // Add pages around current page
                                        for (let i = Math.max(2, pageNum - 2); i <= Math.min(totalPages - 1, pageNum + 2); i++) {
                                            if (i <= 1 || i >= totalPages) continue; // Skip first and last page as they're handled separately
                                            pages.push(
                                                <button 
                                                    key={i}
                                                    className={`page-number ${pageNum === i ? 'active' : ''}`}
                                                    onClick={() => changePage(i)}
                                                    disabled={pageNum === i}
                                                >
                                                    {i}
                                                </button>
                                            );
                                        }

                                        // Add ellipsis if needed
                                        if (pageNum < totalPages - 3) {
                                            pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
                                        }

                                        // Always show last page if there's more than one page
                                        if (totalPages > 1) {
                                            pages.push(
                                                <button 
                                                    key={totalPages}
                                                    className={`page-number ${pageNum === totalPages ? 'active' : ''}`}
                                                    onClick={() => changePage(totalPages)}
                                                    disabled={pageNum === totalPages}
                                                >
                                                    {totalPages}
                                                </button>
                                            );
                                        }

                                        return pages;
                                    })()}
                                </div>

                                <span className="pagination-info">
                                    Page {pageNum} of {Math.max(1, Math.ceil((data.filtered_count ?? data.total) / limitNum))}
                                    {'  '}
                                    {(hideIncomplete || hideSingleParty) ? (
                                        <>
                                            ({data.filtered_count ?? data.total} filtered / {data.total} total entries)
                                            {(data.filtered_count ?? data.total) === 0 && (
                                                <span className="no-results">No entries match the current filters</span>
                                            )}
                                        </>
                                    ) : (
                                        <>({data.total} total entries)</>
                                    )}
                                </span>

                                <button 
                                    className="pagination-button"
                                    onClick={() => changePage(pageNum + 1)}
                                    disabled={pageNum >= Math.ceil((data.filtered_count ?? data.total) / limitNum)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
            <style jsx>{`
                .container {
                    max-width: 1200px;
                    margin: 40px auto;
                    padding: 0 20px;
                    font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif;
                    color: #333;
                }

                h1 {
                    text-align: center;
                    color: #222;
                    margin-bottom: 24px;
                    font-size: 32px;
                    font-weight: 700;
                }

                .header-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .back-link {
                    color: #0070f3;
                    text-decoration: none;
                    font-weight: 500;
                    transition: color 0.2s;
                    display: inline-flex;
                    align-items: center;
                }

                .back-link:hover {
                    color: #0051b3;
                    text-decoration: underline;
                }

                .filter-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .filter-option {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .filter-option input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }

                .filter-option label {
                    font-size: 14px;
                    color: #555;
                    cursor: pointer;
                }

                .sort-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .sort-controls label {
                    font-weight: 500;
                    color: #555;
                }

                .sort-controls select {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    background-color: white;
                    font-size: 14px;
                    cursor: pointer;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .sort-controls select:hover,
                .sort-controls select:focus {
                    border-color: #0070f3;
                }

                .sort-direction {
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.2s;
                }

                .sort-direction:hover {
                    background: #e5e5e5;
                    border-color: #ccc;
                }

                .cards-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 24px;
                }

                .entry-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: 1px solid #f0f0f0;
                    padding: 20px;
                }

                .entry-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .entry-name {
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0;
                    color: #222;
                }

                .view-button {
                    background: #0070f3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                    text-decoration: none;
                }

                .view-button:hover {
                    background: #0051b3;
                }

                .card-meta {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    font-size: 14px;
                    color: #666;
                }

                .party-stats {
                    margin-bottom: 16px;
                }

                .party-bar {
                    height: 24px;
                    margin-bottom: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    padding: 0 8px;
                    color: white;
                    font-weight: 500;
                    font-size: 12px;
                    transition: width 0.5s ease-out;
                }

                .party-count {
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }

                .party-legend {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 8px;
                    font-size: 13px;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .color-box {
                    width: 12px;
                    height: 12px;
                    border-radius: 2px;
                }

                .info,
                .error {
                    text-align: center;
                    font-size: 16px;
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    margin-bottom: 24px;
                }

                .info {
                    color: #555;
                }

                .error {
                    color: #d00;
                    border-left: 4px solid #d00;
                }

                /* Pagination controls */
                .pagination-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-top: 32px;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .pagination-button {
                    background: #0070f3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .pagination-button:hover:not(:disabled) {
                    background: #0051b3;
                }

                .pagination-button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }

                .pagination-pages {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .page-number {
                    min-width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    padding: 0 8px;
                }

                .page-number:hover:not(:disabled) {
                    background: #e5e5e5;
                    border-color: #ccc;
                }

                .page-number.active {
                    background: #0070f3;
                    color: white;
                    border-color: #0070f3;
                    cursor: default;
                }

                .ellipsis {
                    font-size: 14px;
                    font-weight: 500;
                    color: #555;
                    padding: 0 4px;
                }

                .pagination-info {
                    white-space: pre;
                    font-size: 14px;
                    font-weight: 500;
                    color: #555;
                }

                .no-results {
                    display: block;
                    color: #d00;
                    font-weight: 500;
                    margin-top: 8px;
                }

                /* Responsive styles for mobile */
                @media (max-width: 768px) {
                    .container {
                        margin: 20px auto;
                        padding: 0 16px;
                    }

                    h1 {
                        font-size: 28px;
                        margin-bottom: 20px;
                    }

                    .header-actions {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }

                    .sort-controls {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .sort-controls select {
                        flex-grow: 1;
                    }

                    .cards-container {
                        grid-template-columns: 1fr;
                    }

                    .pagination-controls {
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 12px;
                    }

                    .pagination-pages {
                        order: 0;
                        width: 100%;
                        justify-content: center;
                        margin: 8px 0;
                    }

                    .pagination-info {
                        order: -1;
                        width: 100%;
                        text-align: center;
                        margin-bottom: 8px;
                    }
                }

                /* Accordion styles */

            `}</style>
        </>
    );
};

export default EntriesView;
