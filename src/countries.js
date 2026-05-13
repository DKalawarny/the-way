// Converts ISO 3166-1 alpha-2 code to flag emoji ('CA' → '🇨🇦')
export function codeToFlag(code) {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}

// Common countries: [code, name]
export const COUNTRIES = [
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['GB', 'United Kingdom'],
  ['AU', 'Australia'],
  ['NZ', 'New Zealand'],
  ['ZA', 'South Africa'],
  ['NG', 'Nigeria'],
  ['GH', 'Ghana'],
  ['KE', 'Kenya'],
  ['ET', 'Ethiopia'],
  ['UG', 'Uganda'],
  ['TZ', 'Tanzania'],
  ['ZM', 'Zambia'],
  ['RW', 'Rwanda'],
  ['IN', 'India'],
  ['PH', 'Philippines'],
  ['KR', 'South Korea'],
  ['SG', 'Singapore'],
  ['BR', 'Brazil'],
  ['MX', 'Mexico'],
  ['CO', 'Colombia'],
  ['AR', 'Argentina'],
  ['PE', 'Peru'],
  ['CL', 'Chile'],
  ['FR', 'France'],
  ['DE', 'Germany'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['NL', 'Netherlands'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['DK', 'Denmark'],
  ['PL', 'Poland'],
  ['UA', 'Ukraine'],
  ['RO', 'Romania'],
  ['JP', 'Japan'],
  ['ID', 'Indonesia'],
  ['MY', 'Malaysia'],
  ['TH', 'Thailand'],
  ['VN', 'Vietnam'],
  ['CN', 'China'],
  ['EG', 'Egypt'],
  ['JM', 'Jamaica'],
  ['TT', 'Trinidad & Tobago'],
  ['HT', 'Haiti'],
];
