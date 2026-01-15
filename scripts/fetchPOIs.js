/**
 * Fetch nearby POIs for all Capitol units
 * Run: node scripts/fetchPOIs.js
 */

const fs = require('fs');
const path = require('path');

// Your Google Maps API key (set via environment variable)
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error('Error: GOOGLE_MAPS_API_KEY environment variable is required');
  console.error('Run: GOOGLE_MAPS_API_KEY=your_key node scripts/fetchPOIs.js');
  process.exit(1);
}

// POI types to search for
const POI_TYPES = [
  { type: 'cafe', label: 'Coffee Shops' },
  { type: 'restaurant', label: 'Restaurants' },
  { type: 'bar', label: 'Bars' },
  { type: 'gym', label: 'Gyms' },
  { type: 'movie_theater', label: 'Cinemas' },
  { type: 'stadium', label: 'Stadiums' },
  { type: 'school', label: 'Schools' },
  { type: 'lodging', label: 'Hotels' },
  { type: 'shopping_mall', label: 'Shopping' },
  { type: 'transit_station', label: 'Transit' },
];

// Search radius in meters (500 feet ≈ 150 meters)
const RADIUS = 150;

// Rate limiting - Google allows 100 requests per second, but let's be safe
const DELAY_MS = 200;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchNearbyPlaces(lat, lng, type) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${RADIUS}&type=${type}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return data.results.map(place => ({
        name: place.name,
        type: type,
        rating: place.rating || null,
        address: place.vicinity || '',
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      }));
    } else if (data.status === 'ZERO_RESULTS') {
      return [];
    } else {
      console.error(`API Error for ${type}: ${data.status}`);
      return [];
    }
  } catch (error) {
    console.error(`Fetch error for ${type}:`, error.message);
    return [];
  }
}

async function fetchPOIsForUnit(unit) {
  const pois = {};
  let totalCount = 0;

  for (const poiType of POI_TYPES) {
    const places = await fetchNearbyPlaces(unit.lat, unit.lng, poiType.type);
    pois[poiType.type] = {
      label: poiType.label,
      count: places.length,
      places: places.slice(0, 5), // Keep top 5 for each type
    };
    totalCount += places.length;
    await sleep(DELAY_MS);
  }

  return {
    totalPOIs: totalCount,
    radius: RADIUS,
    pois: pois,
  };
}

async function main() {
  // Load inventory
  const inventoryPath = path.join(__dirname, '../data/inventory.json');
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

  console.log(`Fetching POIs for ${inventory.units.length} units...`);
  console.log(`Radius: ${RADIUS}m (~500 feet)`);
  console.log(`POI types: ${POI_TYPES.map(p => p.label).join(', ')}`);
  console.log('---');

  let processed = 0;
  const startTime = Date.now();

  for (const unit of inventory.units) {
    process.stdout.write(`[${processed + 1}/${inventory.units.length}] ${unit.id}... `);

    const nearbyPOIs = await fetchPOIsForUnit(unit);
    unit.nearbyPOIs = nearbyPOIs;

    console.log(`${nearbyPOIs.totalPOIs} POIs found`);
    processed++;

    // Save progress every 10 units
    if (processed % 10 === 0) {
      fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
      console.log('--- Progress saved ---');
    }
  }

  // Final save
  fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('---');
  console.log(`Done! Processed ${processed} units in ${elapsed} minutes`);
  console.log(`Total API requests: ~${processed * POI_TYPES.length}`);

  // Summary
  const totalPOIs = inventory.units.reduce((sum, u) => sum + (u.nearbyPOIs?.totalPOIs || 0), 0);
  console.log(`Total POIs found: ${totalPOIs}`);
}

main().catch(console.error);
