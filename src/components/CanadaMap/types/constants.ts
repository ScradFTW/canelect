// Constants for the CanadaMap component
import { Party } from './types';

// Ordered list of parties for cycling
export const partyValues: Party[] = [
    Party.Liberal,
    Party.Conservative,
    Party.NDP,
    Party.Green,
    Party.Bloc,
];

// Map each Party to its color
export const partyColors: Record<Party, string> = {
    [Party.Liberal]: '#D71920',
    [Party.Conservative]: '#006cdd',
    [Party.NDP]: '#F37021',
    [Party.Green]: '#00A878',
    [Party.Bloc]: '#ADD8E6',
};

// Tooltip options for map
export const tooltipOptions = {
    sticky: true,
    direction: 'auto' as const,
};
