// Types for the CanadaMap component

// Define parties via enum, with null if not selected
export enum Party {
    Liberal = 'Liberal',
    Conservative = 'Conservative',
    NDP = 'NDP',
    Green = 'Green',
    Bloc = 'Bloc Quebecois',
}

// Type for mapping riding IDs to parties
export type PartyRidings = Record<string, Party | null>;

// Props for the CanadaMap component
export interface CanadaMapProps {
    initRidings: PartyRidings;
    /** Display name of the map being shown (saved map name or projection title) */
    sillyName: string;
    /** True for the draft editor on the home page; saved maps are read-only */
    editable: boolean;
}

// Riding data structure
export interface Riding {
    id: string;
    name: string;
    party?: Party;
}

// Grouped ridings by province
export type RidingsByProvince = Record<string, Riding[]>;