// Leaflet-dependent map projection constants
// This file should only be imported on the client side
import L from 'leaflet';
import proj4 from 'proj4';
import 'proj4leaflet';

// Define the StatCan LCC (EPSG:3347) projection
proj4.defs(
    "EPSG:3347",
    "+proj=lcc +lat_1=49 +lat_2=77 +lat_0=63.390675 " +
    "+lon_0=-91.8666666666667 +x_0=6200000 +y_0=3000000 " +
    "+datum=NAD83 +units=m +no_defs"
);

// Metres per pixel at each zoom level. The two coarsest levels let a
// phone-width map zoom out far enough to show all of southern Canada.
const resolutions = [
    32768, 16384, 8192, 4096, 2048, 1024, 512, 256,
    128, 64, 32, 16, 8, 4, 2, 1, 0.5
];

export const MIN_ZOOM = 0;
export const MAX_ZOOM = 14;

// The default view, framed for a 1200px-wide map (~4,900 m/px)
export const DEFAULT_CENTER: [number, number] = [53, -90];
export const DEFAULT_ZOOM = 2.75;
export const DEFAULT_WIDTH = 1200;

// Extent of every riding in EPSG:3347 metres, [minX, minY, maxX, maxY].
// Computed from src/data/turfed_ridings.json; update if the boundaries change.
export const CANADA_EXTENT = [3658201, 658873, 9019157, 6083005] as const;

// the "origin" is the top-left corner of the full-extent tile grid
// (min easting, max northing) from the EPSG:3347 bbox on epsg.io
const origin = [-1113994.32, 5936205.02];

// @ts-expect-error -- proj4leaflet adds L.Proj at runtime; it ships no types
export const MAP_PROJECTION = new L.Proj.CRS(
    "EPSG:3347",
    proj4.defs("EPSG:3347"),
    {
        origin,
        resolutions
    }
);