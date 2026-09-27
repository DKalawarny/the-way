// ── The single source of truth for languages the AI will answer in ───────────
//
// ⚠️ THIS FILE EXISTS BECAUSE THE LIST WAS IN THREE PLACES. Profile.jsx held
// the picker, and Chat.jsx and BibleReader.jsx each held their OWN copy of a
// code→name map used to build the "Respond in X" prompt line. Adding a language
// to the picker without adding it to both maps produced the worst possible
// failure: the option appears, the person selects it, and the app answers in
// English anyway — silently, with nothing logged. Import from here instead.
//
// `label` is English (used in the prompt line, so the model reads a name it
// knows). `native` is what the person actually picking sees.
//
// ⚠️ Adding a language changes ONLY the language the AI replies in. The
// interface chrome stays English, and Bible text depends on what api.bible
// carries for that language — check before telling anyone a language is
// "supported".
export const LANGUAGES = [
  // European
  { code: 'en',    label: 'English',    native: 'English' },
  { code: 'es',    label: 'Spanish',    native: 'Español' },
  { code: 'fr',    label: 'French',     native: 'Français' },
  { code: 'pt',    label: 'Portuguese', native: 'Português' },
  { code: 'de',    label: 'German',     native: 'Deutsch' },
  { code: 'it',    label: 'Italian',    native: 'Italiano' },
  { code: 'pl',    label: 'Polish',     native: 'Polski' },
  { code: 'ro',    label: 'Romanian',   native: 'Română' },
  { code: 'nl',    label: 'Dutch',      native: 'Nederlands' },
  { code: 'lt',    label: 'Lithuanian', native: 'Lietuvių' },
  { code: 'ru',    label: 'Russian',    native: 'Русский' },
  { code: 'uk',    label: 'Ukrainian',  native: 'Українська' },

  // East + Southeast Asia
  { code: 'ja',    label: 'Japanese',                        native: '日本語' },
  { code: 'ko',    label: 'Korean',                          native: '한국어' },
  { code: 'zh',    label: 'Simplified Chinese (Mandarin)',   native: '简体中文' },
  { code: 'zh-TW', label: 'Traditional Chinese (Mandarin)',  native: '繁體中文' },
  { code: 'yue',   label: 'Cantonese',                       native: '粵語' },
  { code: 'vi',    label: 'Vietnamese',                      native: 'Tiếng Việt' },
  { code: 'th',    label: 'Thai',                            native: 'ไทย' },
  { code: 'my',    label: 'Burmese (Myanmar)',               native: 'မြန်မာ' },
  { code: 'lo',    label: 'Lao',                             native: 'ລາວ' },
  { code: 'km',    label: 'Khmer',                           native: 'ខ្មែរ' },
  { code: 'id',    label: 'Indonesian',                      native: 'Bahasa Indonesia' },
  { code: 'ms',    label: 'Malay',                           native: 'Bahasa Melayu' },
  { code: 'tl',    label: 'Tagalog',                         native: 'Tagalog' },

  // South Asia
  { code: 'hi',    label: 'Hindi',    native: 'हिन्दी' },
  { code: 'bn',    label: 'Bengali',  native: 'বাংলা' },
  { code: 'ur',    label: 'Urdu',     native: 'اردو' },
  { code: 'ta',    label: 'Tamil',    native: 'தமிழ்' },
  { code: 'ne',    label: 'Nepali',   native: 'नेपाली' },
  { code: 'si',    label: 'Sinhala',  native: 'සිංහල' },
  { code: 'dv',    label: 'Dhivehi',  native: 'ދިވެހި' },

  // Middle East + Central Asia
  { code: 'ar',    label: 'Arabic',                  native: 'العربية' },
  { code: 'fa',    label: 'Persian (Farsi)',         native: 'فارسی' },
  { code: 'prs',   label: 'Dari',                    native: 'دری' },
  { code: 'ps',    label: 'Pashto',                  native: 'پښتو' },
  { code: 'ku',    label: 'Kurdish (Kurmanji)',      native: 'Kurdî' },
  { code: 'tr',    label: 'Turkish',                 native: 'Türkçe' },
  { code: 'az',    label: 'Azerbaijani',             native: 'Azərbaycan dili' },
  { code: 'uz',    label: 'Uzbek',                   native: 'Oʻzbekcha' },
  { code: 'tg',    label: 'Tajik',                   native: 'Тоҷикӣ' },
  { code: 'tk',    label: 'Turkmen',                 native: 'Türkmençe' },

  // Africa
  { code: 'am',    label: 'Amharic',   native: 'አማርኛ' },
  { code: 'ti',    label: 'Tigrinya',  native: 'ትግርኛ' },
  { code: 'so',    label: 'Somali',    native: 'Soomaali' },
  { code: 'sw',    label: 'Swahili',   native: 'Kiswahili' },
  { code: 'ha',    label: 'Hausa',     native: 'Hausa' },
  { code: 'yo',    label: 'Yorùbá',    native: 'Yorùbá' },
  { code: 'ig',    label: 'Igbo',      native: 'Igbo' },
];

// code → English name, for the "Respond in X" line appended to the system prompt.
export const LANG_NAMES = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.label]));

// Scripts that read right-to-left. The AI is told to use native conventions, but
// anything rendering these strings in the UI needs dir="rtl" to lay out correctly.
export const RTL_LANGS = new Set(['ar', 'fa', 'prs', 'ps', 'ur', 'dv']);

// The single instruction appended to a system prompt. Built here so Chat and
// BibleReader cannot phrase it differently or forget it.
export function languageInstruction(code) {
  const lang = code ?? 'en';
  if (lang === 'en') return '';
  return `\n\nRespond in ${LANG_NAMES[lang] ?? lang}. Use the script and conventions native speakers expect.`;
}
