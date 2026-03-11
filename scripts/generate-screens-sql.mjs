import { readFileSync, writeFileSync } from 'fs';

// Parse CSV properly handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const raw = readFileSync('C:\\Users\\Owner\\Downloads\\ALL_PDOOH_Inventory_021225.csv', 'utf-8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

// Line 0 is blank headers, line 1 is actual header
const headerLine = lines[1];
const headers = parseCSVLine(headerLine);
console.log('Headers:', headers);

const targetDimensions = new Set(['1080x1920', '2160x3840']);
const screens = [];

for (let i = 2; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  if (fields.length < 10) continue;

  const [publisher, screenId, panelType, nameStreet, address, postalCode, city, doohFormat, lat, lng] = fields;

  if (!targetDimensions.has(doohFormat)) continue;
  
  // Skip rows with invalid coordinates
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  if (isNaN(latitude) || isNaN(longitude)) continue;

  screens.push({
    publisher,
    screenId,
    panelType,
    nameStreet,
    address,
    postalCode,
    city,
    dimensions: doohFormat,
    latitude,
    longitude,
  });
}

console.log(`Found ${screens.length} screens (1080x1920 + 2160x3840)`);

// Generate SQL
let sql = `-- ============================================================================
-- INSERT PDOOH SCREENS FROM BidTheatre Inventory (Dec 2025)
-- Screens with dimensions 1080x1920 and 2160x3840
-- Source: ALL_PDOOH_Inventory_021225.csv
-- Generated: ${new Date().toISOString().split('T')[0]}
-- ============================================================================

-- Clear existing sample/test screens first
DELETE FROM media_screens WHERE rtb_supplier_name IN ('JCDecaux', 'Clear Channel', 'Bauer Media Outdoor', 'NetPoint Media', 'TradeTracker');

-- Insert real PDOOH inventory
INSERT INTO media_screens (site_url, rtb_supplier_name, site_type, dimensions, location, latitude, longitude, city, network_id, status)
VALUES
`;

// Sanitize: strip HTML tags and replace pipe separators with " / "
function sanitize(val) {
  return val.replace(/<\/?[^>]+>/g, '').replace(/\|/g, ' / ');
}

const values = screens.map(s => {
  const siteUrl = sanitize(s.nameStreet).replace(/'/g, "''");
  const supplier = sanitize(s.publisher).replace(/'/g, "''");
  const siteType = sanitize(s.panelType).replace(/'/g, "''");
  const location = sanitize(s.address).replace(/'/g, "''");
  const city = sanitize(s.city).replace(/'/g, "''");
  return `('${siteUrl}', '${supplier}', '${siteType}', '${s.dimensions}', '${location}', ${s.latitude}, ${s.longitude}, '${city}', '${s.screenId}', 'active')`;
});

sql += values.join(',\n') + ';\n';

writeFileSync('c:\\Users\\Owner\\terveystalo-engine\\supabase\\migrations\\20260311_insert_pdooh_screens.sql', sql, 'utf-8');
console.log(`SQL written with ${values.length} rows`);
