// Popular crops list used for selection across the app
export const POPULAR_CROPS: string[] = [
  'Rice',
  'Wheat',
  'Maize',
  'Barley',
  'Bajra (Pearl Millet)',
  'Jowar (Sorghum)',
  'Sugarcane',
  'Cotton',
  'Jute',
  'Tea',
  'Coffee',
  'Pulses',
  'Mustard',
  'Groundnut',
  'Soybean',
  'Sunflower',
  'Potato',
  'Onion',
  'Tomato',
  'Mango'
];

export function normalizeMainCrops(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(String).map(s => s.trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    // Split by comma or semicolon
    return input.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}
