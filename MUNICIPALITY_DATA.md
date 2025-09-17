# Municipality Tax Data

## Current Status

✅ **The current municipality data in `/src/data/municipalities.ts` contains real 2025 tax rates** from Skatteverket.

## Tax Table Data

The CSV file `/public/tax_table.csv` contains official Swedish tax table data for 2025 from:
https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen/oppetdata/Skattetabeller%20f%C3%B6r%20m%C3%A5nadsl%C3%B6n

## How to Update with Real Data

### Method 1: Using the Node.js Script (Recommended)

1. Run the update script:
   ```bash
   npm run update-municipalities
   ```

This will fetch current tax data from Skatteverket API and generate an updated `municipalities.ts` file.

## Why We Use Static Data

The Swedish government APIs (Skatteverket) have CORS restrictions that prevent direct browser access. Static data provides:

1. **Reliable access** without API dependency
2. **Consistent performance** in production
3. **Annual update cycle** matching tax data updates

## Data Sources

- **Municipality tax rates**: Skatteverket API (updated annually)
- **Tax tables**: Official CSV from Skatteverket (updated annually)

## Contributing

When updating municipality data, please:

1. Use the automated script when possible
2. Update the "Last updated" comment in the file
3. Include data source information
4. Test the fallback functionality

## File Structure

```
/src/data/municipalities.ts          # Static fallback data
/scripts/update-municipality-data.js # Automated update script
/MUNICIPALITY_DATA.md               # This documentation
```