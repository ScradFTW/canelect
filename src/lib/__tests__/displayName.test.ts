import {describe, expect, it} from 'vitest';
import {displayName} from '../displayName';

describe('displayName', () => {
    it.each([
        ['polite-moose', 'Polite moose'],
        ['2025-election-results', '2025 election results'],
        ['snow‑capped-loon', 'Snow‑capped loon'],
        ['canuck-portage-417', 'Canuck portage 417'],
        ['--odd--name--', 'Odd name'],
        ['', ''],
    ])('%j -> %j', (input, expected) => {
        expect(displayName(input)).toBe(expected);
    });
});
