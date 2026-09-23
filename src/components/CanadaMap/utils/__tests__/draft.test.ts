// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {hasDraft, loadDraft, saveDraft} from '../draft';
import {Party} from '../../types/types';

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('draft storage', () => {
    it('starts empty', () => {
        expect(loadDraft()).toEqual({});
        expect(hasDraft()).toBe(false);
    });

    it('round-trips a saved draft', () => {
        saveDraft({'10001': Party.Liberal, '10002': null});

        expect(loadDraft()).toEqual({'10001': 'Liberal', '10002': null});
        expect(hasDraft()).toBe(true);
    });

    it('does not count a draft of only undecided ridings', () => {
        saveDraft({'10001': null});
        expect(hasDraft()).toBe(false);
    });

    it('treats corrupted storage as an empty draft', () => {
        localStorage.setItem('draftRidings', '{not json');
        expect(loadDraft()).toEqual({});
    });

    it('keeps working when storage is unavailable (e.g. private mode)', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        expect(() => saveDraft({'10001': Party.Liberal})).not.toThrow();
        expect(loadDraft()).toEqual({});
    });
});
