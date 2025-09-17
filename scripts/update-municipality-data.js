/**
 * Script to fetch current Swedish municipality tax data from Skatteverket API
 * and generate updated static fallback data.
 *
 * Usage: node scripts/update-municipality-data.js
 *
 * This script requires the development server to be running with proxy configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Major Swedish municipalities to include in fallback data
const MAJOR_MUNICIPALITIES = [
  'Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Linköping', 'Västerås',
  'Örebro', 'Norrköping', 'Helsingborg', 'Jönköping', 'Lund', 'Umeå',
  'Gävle', 'Borås', 'Södertälje', 'Eskilstuna', 'Halmstad', 'Växjö',
  'Karlstad', 'Sundsvall', 'Täby', 'Nacka', 'Solna', 'Huddinge'
];

async function fetchWithDelay(url, delay = 100) {
  const response = await fetch(url);
  await new Promise(resolve => setTimeout(resolve, delay));
  return response;
}

async function updateMunicipalityData() {
  try {
    console.log('Fetching municipalities from Skatteverket API...');

    // Note: This assumes the dev server is running on localhost:5174 with proxy
    const DEV_SERVER_BASE = 'http://localhost:5174';

    const municipalitiesResponse = await fetch(`${DEV_SERVER_BASE}/api/skatteverket/2025/kommuner`);

    if (!municipalitiesResponse.ok) {
      throw new Error(`Failed to fetch municipalities: ${municipalitiesResponse.statusText}`);
    }

    const allMunicipalities = await municipalitiesResponse.json();
    console.log(`Found ${allMunicipalities.length} municipalities`);

    // Filter to major municipalities
    const majorMunicipalities = allMunicipalities.filter(m =>
      MAJOR_MUNICIPALITIES.includes(m.namn)
    );

    console.log(`Fetching tax rates for ${majorMunicipalities.length} major municipalities...`);

    const municipalityData = [];

    for (const municipality of majorMunicipalities) {
      try {
        console.log(`Fetching rates for ${municipality.namn} (${municipality.kod})...`);

        const ratesResponse = await fetchWithDelay(
          `${DEV_SERVER_BASE}/api/skatteverket/2025/kommuner/${municipality.kod}`,
          100 // 100ms delay between requests
        );

        if (!ratesResponse.ok) {
          console.warn(`Failed to fetch rates for ${municipality.namn}: ${ratesResponse.statusText}`);
          continue;
        }

        const rates = await ratesResponse.json();

        municipalityData.push({
          kod: municipality.kod,
          namn: municipality.namn,
          kommunalskatt: rates.kommunalskatt,
          regionskatt: rates.lan?.regionskatt || rates.regionskatt,
          begravningsavgift: rates.begravningsavgift
        });

        console.log(`✓ ${municipality.namn}: ${rates.kommunalskatt}% + ${rates.lan?.regionskatt || rates.regionskatt}%`);

      } catch (err) {
        console.warn(`Failed to get rates for ${municipality.namn}:`, err.message);
      }
    }

    // Sort by name
    municipalityData.sort((a, b) => a.namn.localeCompare(b.namn));

    // Generate the TypeScript file content
    const fileContent = `/**
 * Static municipality data as fallback for when Skatteverket API is unavailable
 *
 * ⚠️  This data was automatically generated from Skatteverket API
 *
 * To update this data:
 * 1. Start the development server: npm run dev
 * 2. Run: node scripts/update-municipality-data.js
 *
 * Last updated: ${new Date().toISOString().split('T')[0]}
 * Data source: Skatteverket API for tax year 2025
 */

export interface StaticMunicipality {
  kod: string;
  namn: string;
  kommunalskatt: number;
  regionskatt: number;
  begravningsavgift: number;
}

export const STATIC_MUNICIPALITIES: StaticMunicipality[] = ${JSON.stringify(municipalityData, null, 2)};
`;

    // Write to file
    const filePath = path.join(__dirname, '..', 'src', 'data', 'municipalities.ts');
    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log(`\\n✅ Successfully updated ${filePath}`);
    console.log(`Generated data for ${municipalityData.length} municipalities`);

  } catch (error) {
    console.error('❌ Failed to update municipality data:', error.message);
    console.log('\\nMake sure:');
    console.log('1. Development server is running (npm run dev)');
    console.log('2. Server is accessible at http://localhost:5174');
    console.log('3. Proxy configuration is working');
    process.exit(1);
  }
}

// Run the script
updateMunicipalityData();