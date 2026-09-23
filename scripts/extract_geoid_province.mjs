// Regenerates src/data/geoid_to_province.json from an electoral-district GeoJSON file.
//
// Usage: node scripts/extract_geoid_province.mjs <path-to-ridings.geojson>
//
// The input is the federal electoral district boundary file (2023 representation
// order) from Statistics Canada / Elections Canada, converted to GeoJSON with
// FED_NUM and ED_NAMEE/ED_NAMEF properties. It is too large to keep in the repo.
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) {
    console.error('Usage: node scripts/extract_geoid_province.mjs <path-to-ridings.geojson>');
    process.exit(1);
}

const dataDir = path.join(import.meta.dirname, '../src/data');

// Read the ridings data
const ridingsData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Read the riding provinces mapping
const ridingProvinces = JSON.parse(fs.readFileSync(path.join(dataDir, 'canada_federal_riding_provinces.json'), 'utf8'));

// Create a mapping from geoid to province
const geoidToProvince = {};

// Iterate through the features in the ridings data
ridingsData.features.forEach(feature => {
    const geoId = feature.properties.FED_NUM;
    const ridingName = feature.properties.ED_NAMEE || feature.properties.ED_NAMEF;

    if (geoId && ridingName) {
        const province = ridingProvinces[ridingName];
        if (province) {
            geoidToProvince[geoId] = province;
        } else {
            console.log(`Province not found for riding: ${ridingName} (${geoId})`);
        }
    }
});

// Write the mapping to a new file
const outputPath = path.join(dataDir, 'geoid_to_province.json');
fs.writeFileSync(outputPath, JSON.stringify(geoidToProvince, null, 2));

console.log(`Created mapping from geoid to province at ${outputPath}`);
console.log(`Total ridings mapped: ${Object.keys(geoidToProvince).length}`);
