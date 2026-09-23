// Export everything from the localization directory
import en from './en';
import {t, setLanguage, getLocale} from './utils';

export {
    en,
    t,
    setLanguage,
    getLocale
};

// Create a React hook for using translations in components
import {useCallback} from 'react';

export const useTranslation = () => {
    // Return the t function wrapped in useCallback to prevent unnecessary re-renders
    const translate = useCallback((keyPath: string, replacements?: Record<string, string | number>): string => {
        return t(keyPath, replacements);
    }, []);

    return {
        t: translate,
        setLanguage,
        getLocale
    };
};