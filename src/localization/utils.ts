import en from './en';

// Type for supported languages
export type SupportedLanguage = 'en';

// Current language (could be extended to support language switching)
let currentLanguage: SupportedLanguage = 'en';

// Get the localization strings for the current language
export const getLocale = () => {
  switch (currentLanguage) {
    case 'en':
    default:
      return en;
  }
};

// Set the current language
export const setLanguage = (language: SupportedLanguage) => {
  currentLanguage = language;
};

// Get a localized string by its key path
export const t = (keyPath: string, replacements?: Record<string, string | number>): string => {
  const keys = keyPath.split('.');
  let value: any = getLocale();
  
  // Navigate through the nested object using the key path
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      console.warn(`Translation key not found: ${keyPath}`);
      return keyPath; // Return the key path as fallback
    }
  }
  
  // If the value is not a string, return the key path
  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string for key: ${keyPath}`);
    return keyPath;
  }
  
  // Replace placeholders with values if replacements are provided
  if (replacements) {
    return value.replace(/{(\w+)}/g, (match, key) => {
      return replacements[key]?.toString() ?? match;
    });
  }
  
  return value;
};