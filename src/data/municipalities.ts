/**
 * Static municipality data as fallback for when Skatteverket API is unavailable
 *
 * ⚠️  This data was automatically generated from Skatteverket API
 *
 * To update this data:
 * 1. Start the development server: npm run dev
 * 2. Run: node scripts/update-municipality-data.js
 *
 * Last updated: 2025-09-17
 * Data source: Skatteverket API for tax year 2025
 */

export interface StaticMunicipality {
  kod: number;
  namn: string;
  kommunalskatt: number;
  regionskatt: number;
  begravningsavgift: number;
}

export const STATIC_MUNICIPALITIES: StaticMunicipality[] = [
  {
    kod: 1490,
    namn: 'Borås',
    kommunalskatt: 21.31,
    regionskatt: 11.48,
    begravningsavgift: 0.293,
  },
  {
    kod: 484,
    namn: 'Eskilstuna',
    kommunalskatt: 22.02,
    regionskatt: 10.83,
    begravningsavgift: 0.293,
  },
  {
    kod: 2180,
    namn: 'Gävle',
    kommunalskatt: 22.26,
    regionskatt: 11.51,
    begravningsavgift: 0.293,
  },
  {
    kod: 1480,
    namn: 'Göteborg',
    kommunalskatt: 21.12,
    regionskatt: 11.48,
    begravningsavgift: 0.293,
  },
  {
    kod: 1380,
    namn: 'Halmstad',
    kommunalskatt: 20.98,
    regionskatt: 11.4,
    begravningsavgift: 0.293,
  },
  {
    kod: 1283,
    namn: 'Helsingborg',
    kommunalskatt: 20.21,
    regionskatt: 11.18,
    begravningsavgift: 0.293,
  },
  {
    kod: 126,
    namn: 'Huddinge',
    kommunalskatt: 19.47,
    regionskatt: 12.38,
    begravningsavgift: 0.293,
  },
  {
    kod: 680,
    namn: 'Jönköping',
    kommunalskatt: 21.64,
    regionskatt: 11.76,
    begravningsavgift: 0.293,
  },
  {
    kod: 1780,
    namn: 'Karlstad',
    kommunalskatt: 21.27,
    regionskatt: 12.28,
    begravningsavgift: 0.293,
  },
  {
    kod: 580,
    namn: 'Linköping',
    kommunalskatt: 20.2,
    regionskatt: 11.55,
    begravningsavgift: 0.293,
  },
  {
    kod: 1281,
    namn: 'Lund',
    kommunalskatt: 21.24,
    regionskatt: 11.18,
    begravningsavgift: 0.293,
  },
  {
    kod: 1280,
    namn: 'Malmö',
    kommunalskatt: 21.24,
    regionskatt: 11.18,
    begravningsavgift: 0.293,
  },
  {
    kod: 182,
    namn: 'Nacka',
    kommunalskatt: 17.88,
    regionskatt: 12.38,
    begravningsavgift: 0.293,
  },
  {
    kod: 581,
    namn: 'Norrköping',
    kommunalskatt: 21.75,
    regionskatt: 11.55,
    begravningsavgift: 0.293,
  },
  {
    kod: 1880,
    namn: 'Örebro',
    kommunalskatt: 21.35,
    regionskatt: 12.3,
    begravningsavgift: 0.293,
  },
  {
    kod: 181,
    namn: 'Södertälje',
    kommunalskatt: 20.15,
    regionskatt: 12.38,
    begravningsavgift: 0.293,
  },
  {
    kod: 184,
    namn: 'Solna',
    kommunalskatt: 17.37,
    regionskatt: 12.38,
    begravningsavgift: 0.293,
  },
  {
    kod: 180,
    namn: 'Stockholm',
    kommunalskatt: 18.22,
    regionskatt: 12.38,
    begravningsavgift: 0.07,
  },
  {
    kod: 2281,
    namn: 'Sundsvall',
    kommunalskatt: 22.59,
    regionskatt: 11.29,
    begravningsavgift: 0.293,
  },
  {
    kod: 160,
    namn: 'Täby',
    kommunalskatt: 17.55,
    regionskatt: 12.38,
    begravningsavgift: 0.293,
  },
  {
    kod: 2480,
    namn: 'Umeå',
    kommunalskatt: 22.8,
    regionskatt: 11.35,
    begravningsavgift: 0.293,
  },
  {
    kod: 380,
    namn: 'Uppsala',
    kommunalskatt: 21.14,
    regionskatt: 11.71,
    begravningsavgift: 0.293,
  },
  {
    kod: 1980,
    namn: 'Västerås',
    kommunalskatt: 20.36,
    regionskatt: 10.88,
    begravningsavgift: 0.293,
  },
  {
    kod: 780,
    namn: 'Växjö',
    kommunalskatt: 20.19,
    regionskatt: 12,
    begravningsavgift: 0.293,
  },
];
