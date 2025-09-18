/**
 * Script to fetch current Swedish municipality tax data from Skatteverket API
 * and generate updated static fallback data.
 *
 * Usage: node scripts/update-municipality-data.js [--full]
 *
 * This script fetches data directly from Skatteverket's API.
 * Use --full flag to fetch all 290 municipalities, otherwise fetches major municipalities only.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Major Swedish municipalities to include in fallback data
const MAJOR_MUNICIPALITIES = [
  'Stockholm',
  'Göteborg',
  'Malmö',
  'Uppsala',
  'Linköping',
  'Västerås',
  'Örebro',
  'Norrköping',
  'Helsingborg',
  'Jönköping',
  'Lund',
  'Umeå',
  'Gävle',
  'Borås',
  'Södertälje',
  'Eskilstuna',
  'Halmstad',
  'Växjö',
  'Karlstad',
  'Sundsvall',
  'Täby',
  'Nacka',
  'Solna',
  'Huddinge',
];

async function fetchWithDelay(url, delay = 100) {
  const response = await fetch(url);
  await new Promise((resolve) => setTimeout(resolve, delay));
  return response;
}

async function updateMunicipalityData() {
  try {
    // Check for --full flag in command line arguments
    const args = process.argv.slice(2);
    const fetchAll = args.includes('--full');

    console.log(`Fetching municipalities from Skatteverket API${fetchAll ? ' (all municipalities)' : ' (major municipalities only)'}...`);

    // Fetch directly from Skatteverket API
    const SKATTEVERKET_BASE = 'https://www7.skatteverket.se/portal-wapi/open/skatteberakning/v1/api/skattesats';

    const municipalitiesResponse = await fetch(
      `${SKATTEVERKET_BASE}/2025/kommuner`
    );

    if (!municipalitiesResponse.ok) {
      throw new Error(
        `Failed to fetch municipalities: ${municipalitiesResponse.statusText}`
      );
    }

    const allMunicipalities = await municipalitiesResponse.json();
    console.log(`Found ${allMunicipalities.length} municipalities`);

    // Filter municipalities based on flag
    const selectedMunicipalities = allMunicipalities.filter((m) =>
      fetchAll ? true : MAJOR_MUNICIPALITIES.includes(m.namn)
    );

    console.log(
      `Fetching tax rates for ${selectedMunicipalities.length} ${fetchAll ? 'municipalities' : 'major municipalities'}...`
    );

    const municipalityData = [];

    for (const municipality of selectedMunicipalities) {
      try {
        console.log(
          `Fetching rates for ${municipality.namn} (${municipality.kod})...`
        );

        const ratesResponse = await fetchWithDelay(
          `${SKATTEVERKET_BASE}/2025/kommuner/${municipality.kod}`,
          100 // 100ms delay between requests
        );

        if (!ratesResponse.ok) {
          console.warn(
            `Failed to fetch rates for ${municipality.namn}: ${ratesResponse.statusText}`
          );
          continue;
        }

        const rates = await ratesResponse.json();

        const regionskatt = rates.lan?.regionskatt || rates.regionskatt;

        const municipalityEntry = {
          kod: municipality.kod,
          namn: municipality.namn,
          kommunalskatt: rates.kommunalskatt,
          begravningsavgift: rates.begravningsavgift,
        };

        // Only add regionskatt if it exists (Gotland doesn't have regional tax)
        if (regionskatt !== undefined) {
          municipalityEntry.regionskatt = regionskatt;
        }

        municipalityData.push(municipalityEntry);

        console.log(
          `✓ ${municipality.namn}: ${rates.kommunalskatt}% + ${rates.lan?.regionskatt || rates.regionskatt}%`
        );
      } catch (err) {
        console.warn(
          `Failed to get rates for ${municipality.namn}:`,
          err.message
        );
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
 * Run: node scripts/update-municipality-data.js [--full]
 * Use --full flag to fetch all 290 municipalities, otherwise fetches major municipalities only
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
    const filePath = path.join(
      __dirname,
      '..',
      'src',
      'data',
      'municipalities.ts'
    );
    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log(`\\n✅ Successfully updated ${filePath}`);
    console.log(`Generated data for ${municipalityData.length} municipalities`);
  } catch (error) {
    console.error('❌ Failed to update municipality data:', error.message);
    console.log('\\nMake sure you have internet connectivity to access Skatteverket API.');
    process.exit(1);
  }
}

// Run the script
updateMunicipalityData();
