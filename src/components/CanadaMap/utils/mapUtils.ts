// Map utility functions for the CanadaMap component
import L from 'leaflet';
import {CANADA_EXTENT, DEFAULT_CENTER, DEFAULT_WIDTH, DEFAULT_ZOOM, MAP_PROJECTION} from '../types/mapProjection';
import { toast } from 'react-toastify';
import throttle from 'lodash/throttle';
import * as turf from '@turf/turf';
import { Party, PartyRidings } from '../types/types';
import { partyColors, partyValues, tooltipOptions } from '../types/constants';

// Throttled toast function to prevent too many toasts
export const throttledToast = throttle((message: string, style?: React.CSSProperties) => {
    toast.info(message, {toastId: message, style});
}, 1000);

// Function to style map features based on party
export const featureStyle = (ridingParties: PartyRidings) => (feat: any) => {
    const geoId = feat.properties?.FED_NUM;
    const party = geoId ? ridingParties[geoId] : null;
    return {
        color: '#444', 
        weight: 3, 
        fillOpacity: 0.7, 
        fillColor: party ? partyColors[party] : '#E0E0E0'
    };
};

// Function to handle feature interactions
export const createOnEachFeature = (
    ridingParties: PartyRidings,
    // Leaflet binds this handler once per layer, so read the current map through a ref
    ridingPartiesRef: React.RefObject<PartyRidings>,
    setRidingParties: React.Dispatch<React.SetStateAction<PartyRidings>>,
    editable: boolean,
    sillyName: string
) => (feat: any, layer: L.Layer) => {
    const geoId = feat.properties?.FED_NUM;
    if (!geoId) return;

    const updateTooltip = (pr: PartyRidings, open: boolean) => {
        layer.unbindTooltip();
        const selectedParty = pr[geoId] || 'undecided';
        const tooltipText = `${feat.properties.ED_NAMEE || feat.properties.ED_NAMEF || 'Name not found'} (${selectedParty})`;
        // Leaflet treats string content as HTML; give it an element holding plain text
        const content = document.createElement('span');
        content.textContent = tooltipText;
        layer.bindTooltip(content, tooltipOptions);
        if (open) layer.openTooltip();
    };

    // Bind only; tooltips open on hover, or on click to confirm the change
    updateTooltip(ridingParties, false);

    const ridingName = feat.properties.ED_NAMEE || feat.properties.ED_NAMEF || 'Name not found';

    layer.on('click', () => {
        // Saved maps are read-only; editing happens on a copy
        if (!editable) {
            throttledToast(`Saved maps can't be changed. Use "Edit a copy" to build on ${sillyName}.`, {
                background: '#f44336',
                color: '#fff'
            });
            return;
        }

        const current = ridingPartiesRef.current[geoId] ?? null;
        const idx = partyValues.indexOf(current as Party);
        const next = idx < 0
            ? partyValues[0]
            : idx < partyValues.length - 1
                ? partyValues[idx + 1]
                : null;
        const nextPartyRidings = {...ridingPartiesRef.current, [geoId]: next};

        // Update the ref now so a quick second click cycles from this value
        ridingPartiesRef.current = nextPartyRidings;
        setRidingParties(nextPartyRidings);
        updateTooltip(nextPartyRidings, true);

        const background = next ? partyColors[next] : '#E0E0E0';
        const color = (!next || next === Party.Bloc) ? '#000' : '#fff';
        throttledToast(`${ridingName} updated to ${next ?? '"undecided"'}`, {background, color});
    });
};

// Function to randomize all ridings
export const randomizeAll = (
    data: any,
    setRidingParties: React.Dispatch<React.SetStateAction<PartyRidings>>
) => {
    if (!data) return;

    const newParties: PartyRidings = {};
    data.features.forEach((feat: any) => {
        const geoId = feat.properties?.FED_NUM;
        if (!geoId) return;

        newParties[geoId] = partyValues[Math.floor(Math.random() * partyValues.length)];
    });
    setRidingParties(newParties);
};

// Function to set all ridings to a specific party
export const setAllRidingsToParty = (
    data: any,
    party: Party,
    setRidingParties: React.Dispatch<React.SetStateAction<PartyRidings>>
) => {
    if (!data) return;

    if (window.confirm(`Are you sure you want to set all ridings to ${party}? This will override any existing selections.`)) {
        const newParties: PartyRidings = {};

        // Set all ridings to the selected party
        data.features.forEach((feat: any) => {
            const geoId = feat.properties?.FED_NUM;
            if (geoId) {
                newParties[geoId] = party;
            }
        });

        setRidingParties(newParties);
        toast.success(`All ridings set to ${party}`);
    }
};

// Function to set all undecided ridings in a province to a specific party
export const setProvinceUndecidedRidingsToParty = (
    province: string,
    party: Party,
    undecidedRidingsByProvince: Record<string, Array<{ id: string, name: string }>>,
    setRidingParties: React.Dispatch<React.SetStateAction<PartyRidings>>,
    editable: boolean
) => {
    if (!editable) return;

    if (window.confirm(`Are you sure you want to set all undecided ridings in ${province} to ${party}?`)) {
        const provinceRidings = undecidedRidingsByProvince[province] || [];
        if (provinceRidings.length === 0) return;

        setRidingParties(prev => {
            const newParties = {...prev};

            // Set all undecided ridings in the province to the selected party
            provinceRidings.forEach(riding => {
                newParties[riding.id] = party;
            });

            return newParties;
        });

        toast.success(`All undecided ridings in ${province} set to ${party}`);
    }
};

// Function to set all assigned ridings in a province to a specific party
export const setProvinceAssignedRidingsToParty = (
    province: string,
    party: Party,
    assignedRidingsByProvince: Record<string, Array<{ id: string, name: string, party: Party }>>,
    setRidingParties: React.Dispatch<React.SetStateAction<PartyRidings>>,
    editable: boolean
) => {
    if (!editable) return;

    if (window.confirm(`Are you sure you want to set all assigned ridings in ${province} to ${party}?`)) {
        const provinceRidings = assignedRidingsByProvince[province] || [];
        if (provinceRidings.length === 0) return;

        setRidingParties(prev => {
            const newParties = {...prev};

            // Set all assigned ridings in the province to the selected party
            provinceRidings.forEach(riding => {
                newParties[riding.id] = party;
            });

            return newParties;
        });

        toast.success(`All assigned ridings in ${province} set to ${party}`);
    }
};

// Function to center the map on a specific riding
export const centerMapOnRiding = (
    ridingId: string,
    map: L.Map | null,
    data: any,
    mapWrapperRef: React.RefObject<HTMLDivElement|null>
) => {
    if (!map || !data) {
        return;
    }

    // Find the riding feature by ID
    const ridingFeature = data.features.find((feat: any) =>
        feat.properties?.FED_NUM === ridingId
    );

    if (ridingFeature) {
        // Create a GeoJSON layer for this feature to get its bounds
        const layer = L.geoJSON(ridingFeature);
        const bounds = layer.getBounds();

        // Fit the map to the riding's bounds so it fills the height of the view
        map.fitBounds(bounds, {
            animate: true,
            duration: 1,
            padding: [20, 20] // Add some padding around the riding for better visibility
        });

        // Scroll to the map
        if (mapWrapperRef.current) {
            mapWrapperRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        // Highlight the riding briefly with a toast notification
        const ridingName = ridingFeature.properties.ED_NAMEE || ridingFeature.properties.ED_NAMEF || 'Selected riding';
        throttledToast(`Centered on ${ridingName}`, {background: '#E0E0E0', color: '#000'});
    }
};

// Function to reset map view
// Wide maps get the default framing (southern Canada, Arctic islands cropped),
// zoomed out by the width ratio. Once a map is too narrow for that framing to
// show more than the whole country would, fit and centre the full extent instead.

export const resetMapView = (map: L.Map | null) => {
    if (!map) return;
    const size = map.getSize();
    const widthZoom = DEFAULT_ZOOM + Math.log2(size.x / DEFAULT_WIDTH);

    const [minX, minY, maxX, maxY] = CANADA_EXTENT;
    const padding = 16;
    const metresPerPixel = Math.max((maxX - minX) / (size.x - padding), (maxY - minY) / (size.y - padding));
    const fitZoom = map.options.crs!.zoom(1 / metresPerPixel);

    // Round down to the map's 0.25 zoom steps so the framed area never gets cut off
    const snap = (z: number) => Math.max(map.getMinZoom(), Math.floor(z * 4) / 4);
    if (widthZoom >= fitZoom) {
        map.setView(DEFAULT_CENTER, snap(widthZoom));
    } else {
        const center: L.LatLng = MAP_PROJECTION.projection.unproject(L.point((minX + maxX) / 2, (minY + maxY) / 2));
        map.setView(center, snap(fitZoom));
    }
};

// Function to reset all ridings
export const resetRidings = async (
    setIsResetting: React.Dispatch<React.SetStateAction<boolean>>,
    setRidingParties: React.Dispatch<React.SetStateAction<PartyRidings>>
) => {
    if (window.confirm("Are you sure you want to reset the map? This will clear all ridings (and cant be undone)")) {
        setIsResetting(true);
        setRidingParties({});
        setTimeout(() => setIsResetting(false), 200);
    }
};

// Function to simplify GeoJSON data using turf.js
export const simplifyGeoJSON = (geoJSON: any, tolerance: number = 0.001) => {
    if (!geoJSON || !geoJSON.features) {
        console.error('Invalid GeoJSON data provided for simplification');
        return geoJSON;
    }

    try {
        // Create a deep copy of the GeoJSON to avoid modifying the original
        const simplifiedGeoJSON = JSON.parse(JSON.stringify(geoJSON));

        // Simplify each feature in the FeatureCollection
        simplifiedGeoJSON.features = simplifiedGeoJSON.features.map((feature: any) => {
            // Skip features without geometry
            if (!feature.geometry) return feature;

            // Use turf.simplify to reduce the number of points in the geometry
            // The tolerance parameter controls the level of simplification
            // Higher values = more simplification (fewer points)
            return turf.simplify(feature, {
                tolerance,
                highQuality: false, // Use Douglas-Peucker algorithm for better quality
                mutate: true // Modify the input to avoid creating a new object
            });
        });

        // Calculate and log the size reduction
        const originalSize = JSON.stringify(geoJSON).length;
        const simplifiedSize = JSON.stringify(simplifiedGeoJSON).length;
        const reductionPercentage = ((originalSize - simplifiedSize) / originalSize * 100).toFixed(2);

        console.log(`Simplified GeoJSON: Reduced complexity with tolerance ${tolerance}`);
        console.log(`Size reduction: ${originalSize} -> ${simplifiedSize} bytes (${reductionPercentage}% reduction)`);

        return simplifiedGeoJSON;
    } catch (error) {
        console.error('Error simplifying GeoJSON:', error);
        return geoJSON; // Return original if simplification fails
    }
};
