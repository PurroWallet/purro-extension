// Translation Prevention Constants
// These settings control browser translation behavior for the extension

export const TRANSLATION_SETTINGS = {
    // Disable Google Translate for the entire page
    GOOGLE_TRANSLATE_DISABLED: true,

    // Disable Microsoft Translator
    MICROSOFT_TRANSLATOR_DISABLED: true,

    // Disable all browser translation features
    BROWSER_TRANSLATION_DISABLED: true,

    // Language setting (set to 'en' to prevent auto-detection)
    DEFAULT_LANGUAGE: 'en',

    // Translation meta tag content
    TRANSLATION_META_CONTENT: 'no',

    // Translation class for specific elements
    TRANSLATION_DISABLED_CLASS: 'notranslate'
} as const;

// Meta tags for preventing translation
export const TRANSLATION_META_TAGS = [
    { name: 'google', content: 'notranslate' },
    { name: 'translate', content: 'no' },
    { httpEquiv: 'Content-Language', content: TRANSLATION_SETTINGS.DEFAULT_LANGUAGE }
] as const;

// HTML attributes for preventing translation
export const TRANSLATION_ATTRIBUTES = {
    HTML_TRANSLATE: 'no',
    BODY_CLASS: TRANSLATION_SETTINGS.TRANSLATION_DISABLED_CLASS
} as const; 