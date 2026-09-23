// The home-page draft lives only in this browser's localStorage
import {PartyRidings} from '../types/types';

const DRAFT_KEY = 'draftRidings';

export function loadDraft(): PartyRidings {
    try {
        const saved = localStorage.getItem(DRAFT_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

export function saveDraft(ridings: PartyRidings): void {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(ridings));
    } catch {
        // Storage unavailable (private mode, quota); the draft just won't persist
    }
}

export function hasDraft(): boolean {
    return Object.values(loadDraft()).some(Boolean);
}
