# Localization System

This directory contains the localization system for the application. It provides a simple way to manage and use translated strings throughout the application.

## Structure

- `en.ts`: Contains all English strings organized by component/page
- `utils.ts`: Utility functions for accessing localized strings
- `index.ts`: Exports everything from the localization directory and provides a React hook

## How to Use

### In React Components

```tsx
import { useTranslation } from '@/localization';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('some.key')}</h1>
      <p>{t('some.other.key')}</p>
      
      {/* With replacements */}
      <p>{t('greeting', { name: 'John' })}</p>
    </div>
  );
}
```

### Outside React Components

```tsx
import { t } from '@/localization';

// Simple usage
const message = t('some.key');

// With replacements
const greeting = t('greeting', { name: 'John' });
```

## Adding New Strings

1. Add the new string to the appropriate section in `en.ts`
2. Use the string in your component with the `t` function

Example:
```tsx
// In en.ts
const en = {
  // ...
  myComponent: {
    newString: 'This is a new string'
  }
  // ...
};

// In your component
const message = t('myComponent.newString');
```

## Adding New Languages

To add a new language:

1. Create a new file for the language (e.g., `fr.ts`) with the same structure as `en.ts`
2. Update the `SupportedLanguage` type in `utils.ts` to include the new language
3. Update the `getLocale` function in `utils.ts` to return the new language based on the current language setting

Example:
```tsx
// In fr.ts
const fr = {
  // Same structure as en.ts but with French translations
};

export default fr;

// In utils.ts
import fr from './fr';

export type SupportedLanguage = 'en' | 'fr';

export const getLocale = () => {
  switch (currentLanguage) {
    case 'en':
      return en;
    case 'fr':
      return fr;
    default:
      return en;
  }
};
```

## String Formatting

The `t` function supports string formatting with replacements. Use curly braces to define placeholders in your strings:

```tsx
// In en.ts
const en = {
  // ...
  greeting: 'Hello, {name}!'
  // ...
};

// In your component
const greeting = t('greeting', { name: 'John' }); // "Hello, John!"
```