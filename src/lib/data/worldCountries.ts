export interface CountryPreset {
  name: string;
  code: string;
  flag: string;
  region: string;
}

export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
}

export const WORLD_COUNTRIES_CATALOG: CountryPreset[] = [
  // East Africa & Great Lakes
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', region: 'East Africa' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', region: 'East Africa' },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬', region: 'East Africa' },
  { name: 'Rwanda', code: 'RW', flag: '🇷🇼', region: 'East Africa' },
  { name: 'Burundi', code: 'BI', flag: '🇧🇮', region: 'East Africa' },
  { name: 'Democratic Republic of the Congo', code: 'CD', flag: '🇨🇩', region: 'Central / East Africa' },
  { name: 'South Sudan', code: 'SS', flag: '🇸🇸', region: 'East Africa' },
  { name: 'Somalia', code: 'SO', flag: '🇸🇴', region: 'Horn of Africa' },
  { name: 'Ethiopia', code: 'ET', flag: '🇪🇹', region: 'Horn of Africa' },

  // West & Central Africa (Nollywood & Regional)
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', region: 'West Africa (Nollywood)' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', region: 'West Africa' },
  { name: 'Senegal', code: 'SN', flag: '🇸🇳', region: 'West Africa' },
  { name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', region: 'West Africa' },
  { name: 'Cameroon', code: 'CM', flag: '🇨🇲', region: 'Central Africa' },

  // Southern & North Africa
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', region: 'Southern Africa' },
  { name: 'Zambia', code: 'ZM', flag: '🇿🇲', region: 'Southern Africa' },
  { name: 'Zimbabwe', code: 'ZW', flag: '🇿🇼', region: 'Southern Africa' },
  { name: 'Malawi', code: 'MW', flag: '🇲🇼', region: 'Southern Africa' },
  { name: 'Mozambique', code: 'MZ', flag: '🇲🇿', region: 'Southern Africa' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬', region: 'North Africa / Middle East' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', region: 'North Africa' },

  // Americas (Hollywood & Latin Cinema)
  { name: 'United States', code: 'US', flag: '🇺🇸', region: 'North America (Hollywood)' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', region: 'North America' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', region: 'Latin America' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', region: 'South America' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', region: 'South America' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', region: 'South America' },
  { name: 'Jamaica', code: 'JM', flag: '🇯🇲', region: 'Caribbean' },

  // Asia (Bollywood, K-Drama, Martial Arts, Anime)
  { name: 'India', code: 'IN', flag: '🇮🇳', region: 'South Asia (Bollywood)' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', region: 'East Asia (K-Drama / Cinema)' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', region: 'East Asia (Anime & Action)' },
  { name: 'China', code: 'CN', flag: '🇨🇳', region: 'East Asia (Martial Arts)' },
  { name: 'Hong Kong', code: 'HK', flag: '🇭🇰', region: 'East Asia (Kung-Fu Classics)' },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭', region: 'Southeast Asia' },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭', region: 'Southeast Asia' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', region: 'Southeast Asia' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰', region: 'South Asia' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', region: 'Eurasia (Turkish Dramas)' },

  // Europe & UK
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', region: 'Europe (British Cinema)' },
  { name: 'France', code: 'FR', flag: '🇫🇷', region: 'Western Europe' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', region: 'Central Europe' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', region: 'Southern Europe' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', region: 'Southern Europe' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', region: 'Western Europe' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪', region: 'Nordics' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴', region: 'Nordics' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', region: 'Nordics' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪', region: 'Western Europe' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺', region: 'Eastern Europe' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱', region: 'Eastern Europe' },

  // Oceania & Middle East
  { name: 'Australia', code: 'AU', flag: '🇦🇺', region: 'Oceania' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', region: 'Oceania' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', region: 'Middle East' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', region: 'Middle East' },
  { name: 'Israel', code: 'IL', flag: '🇮🇱', region: 'Middle East' },
];
