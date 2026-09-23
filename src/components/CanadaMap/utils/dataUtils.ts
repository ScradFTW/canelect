// Data utility functions for the CanadaMap component
import { Party, PartyRidings, RidingsByProvince, Riding } from '../types/types';

// Function to calculate national counts and total
export const calculateNationalCounts = (
    data: any,
    ridingParties: PartyRidings
): { nationalCounts: Record<string, number>, nationalTotal: number } => {
    const counts: Record<string, number> = {};
    let total = 0;

    (data?.features || []).forEach((feat: any) => {
        const geoId = feat.properties?.FED_NUM;
        if (!geoId) return;

        const party = ridingParties[geoId];
        total++;

        if (party) {
            counts[party] = (counts[party] || 0) + 1;
        }
    });
    
    return { nationalCounts: counts, nationalTotal: total };
};

// Function to get undecided ridings grouped by province
export const getUndecidedRidingsByProvince = (
    data: any,
    ridingParties: PartyRidings,
    GEOID_TO_PROVINCE: Record<string, string>,
    RIDING_PROVINCES: Record<string, string>
): RidingsByProvince => {
    if (!data?.features) return {};

    // Create an object to hold ridings grouped by province
    const groupedRidings: RidingsByProvince = {};

    // Filter for undecided ridings and group by province
    data.features
        .filter((feat: any) => {
            const geoId = feat.properties?.FED_NUM;
            return geoId && !ridingParties[geoId]; // Filter for undecided ridings
        })
        .forEach((feat: any) => {
            const geoId = feat.properties.FED_NUM;
            const name = feat.properties.ED_NAMEE || feat.properties.ED_NAMEF || 'Name not found';
            const province = GEOID_TO_PROVINCE[geoId] || RIDING_PROVINCES[name] || 'Unknown';

            if (!groupedRidings[province]) {
                groupedRidings[province] = [];
            }

            groupedRidings[province].push({
                id: geoId,
                name: name
            });
        });

    // Sort ridings alphabetically within each province
    Object.keys(groupedRidings).forEach(province => {
        groupedRidings[province].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groupedRidings;
};

// Function to get assigned ridings grouped by province
export const getAssignedRidingsByProvince = (
    data: any,
    ridingParties: PartyRidings,
    GEOID_TO_PROVINCE: Record<string, string>,
    RIDING_PROVINCES: Record<string, string>
): Record<string, Array<Riding & { party: Party }>> => {
    if (!data?.features) return {};

    // Create an object to hold ridings grouped by province
    const groupedRidings: Record<string, Array<Riding & { party: Party }>> = {};

    // Filter for assigned ridings and group by province
    data.features.forEach((feat: any) => {
        const geoId = feat.properties?.FED_NUM;
        const party = geoId ? ridingParties[geoId] : null;

        if (geoId && party) {
            const name = feat.properties.ED_NAMEE || feat.properties.ED_NAMEF || 'Name not found';
            const province = GEOID_TO_PROVINCE[geoId] || RIDING_PROVINCES[name] || 'Unknown';

            if (!groupedRidings[province]) {
                groupedRidings[province] = [];
            }

            groupedRidings[province].push({
                id: geoId,
                name: name,
                party: party
            });
        }
    });

    // Sort ridings alphabetically within each province
    Object.keys(groupedRidings).forEach(province => {
        groupedRidings[province].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groupedRidings;
};

// Function to check if device is mobile
export const checkIsMobile = (): boolean => {
    // Safe check for window object (for SSR)
    if (typeof window !== 'undefined') {
        return window.innerWidth <= 768;
    }
    return false;
};

// Function to add resize listener for mobile detection
export const addResizeListener = (
    setIsMobile: React.Dispatch<React.SetStateAction<boolean>>
): () => void => {
    // Safe check for window object (for SSR)
    if (typeof window !== 'undefined') {
        // Add resize listener
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);

        // Return cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }
    
    // Return empty cleanup function if window is not available
    return () => {};
};