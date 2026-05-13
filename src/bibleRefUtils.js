// ── Bible reference utilities ─────────────────────────────────────────────────
// Converts human-readable scripture references to Bible API verse IDs.
// Used for tappable-ref validation against api.bible (VITE_BIBLE_API_KEY).

const BOOK_CODES = {
  // ── Old Testament ────────────────────────────────────────────────────────────
  genesis: 'GEN', gen: 'GEN',
  exodus: 'EXO', exo: 'EXO', ex: 'EXO',
  leviticus: 'LEV', lev: 'LEV',
  numbers: 'NUM', num: 'NUM',
  deuteronomy: 'DEU', deu: 'DEU', deut: 'DEU', dt: 'DEU',
  joshua: 'JOS', jos: 'JOS', josh: 'JOS',
  judges: 'JDG', jdg: 'JDG', judg: 'JDG',
  ruth: 'RUT', rut: 'RUT',
  '1 samuel': '1SA', '1sa': '1SA', '1 sam': '1SA', 'i samuel': '1SA', '1samuel': '1SA',
  '2 samuel': '2SA', '2sa': '2SA', '2 sam': '2SA', 'ii samuel': '2SA', '2samuel': '2SA',
  '1 kings': '1KI', '1ki': '1KI', 'i kings': '1KI', '1kings': '1KI',
  '2 kings': '2KI', '2ki': '2KI', 'ii kings': '2KI', '2kings': '2KI',
  '1 chronicles': '1CH', '1ch': '1CH', '1 chron': '1CH', 'i chronicles': '1CH', '1chronicles': '1CH',
  '2 chronicles': '2CH', '2ch': '2CH', '2 chron': '2CH', 'ii chronicles': '2CH', '2chronicles': '2CH',
  ezra: 'EZR', ezr: 'EZR',
  nehemiah: 'NEH', neh: 'NEH',
  esther: 'EST', est: 'EST', esth: 'EST',
  job: 'JOB',
  psalm: 'PSA', psalms: 'PSA', psa: 'PSA', ps: 'PSA',
  proverbs: 'PRO', pro: 'PRO', prov: 'PRO', prv: 'PRO',
  ecclesiastes: 'ECC', ecc: 'ECC', eccl: 'ECC', qoheleth: 'ECC',
  'song of solomon': 'SNG', 'song of songs': 'SNG', sng: 'SNG', song: 'SNG', sos: 'SNG',
  isaiah: 'ISA', isa: 'ISA',
  jeremiah: 'JER', jer: 'JER',
  lamentations: 'LAM', lam: 'LAM',
  ezekiel: 'EZK', ezk: 'EZK', ezek: 'EZK',
  daniel: 'DAN', dan: 'DAN',
  hosea: 'HOS', hos: 'HOS',
  joel: 'JOL', jol: 'JOL',
  amos: 'AMO', amo: 'AMO',
  obadiah: 'OBA', oba: 'OBA', obad: 'OBA',
  jonah: 'JON', jon: 'JON',
  micah: 'MIC', mic: 'MIC',
  nahum: 'NAM', nam: 'NAM', nah: 'NAM',
  habakkuk: 'HAB', hab: 'HAB',
  zephaniah: 'ZEP', zep: 'ZEP', zeph: 'ZEP',
  haggai: 'HAG', hag: 'HAG',
  zechariah: 'ZEC', zec: 'ZEC', zech: 'ZEC',
  malachi: 'MAL', mal: 'MAL',
  // ── New Testament ────────────────────────────────────────────────────────────
  matthew: 'MAT', mat: 'MAT', matt: 'MAT',
  mark: 'MRK', mrk: 'MRK', mk: 'MRK',
  luke: 'LUK', luk: 'LUK', lk: 'LUK',
  john: 'JHN', jhn: 'JHN', jn: 'JHN',
  acts: 'ACT', act: 'ACT',
  romans: 'ROM', rom: 'ROM',
  '1 corinthians': '1CO', '1co': '1CO', '1 cor': '1CO', 'i corinthians': '1CO', '1corinthians': '1CO',
  '2 corinthians': '2CO', '2co': '2CO', '2 cor': '2CO', 'ii corinthians': '2CO', '2corinthians': '2CO',
  galatians: 'GAL', gal: 'GAL',
  ephesians: 'EPH', eph: 'EPH',
  philippians: 'PHP', php: 'PHP', phil: 'PHP',
  colossians: 'COL', col: 'COL',
  '1 thessalonians': '1TH', '1th': '1TH', '1 thess': '1TH', 'i thessalonians': '1TH', '1thessalonians': '1TH',
  '2 thessalonians': '2TH', '2th': '2TH', '2 thess': '2TH', 'ii thessalonians': '2TH', '2thessalonians': '2TH',
  '1 timothy': '1TI', '1ti': '1TI', '1 tim': '1TI', 'i timothy': '1TI', '1timothy': '1TI',
  '2 timothy': '2TI', '2ti': '2TI', '2 tim': '2TI', 'ii timothy': '2TI', '2timothy': '2TI',
  titus: 'TIT', tit: 'TIT',
  philemon: 'PHM', phm: 'PHM', phlm: 'PHM',
  hebrews: 'HEB', heb: 'HEB',
  james: 'JAS', jas: 'JAS', jam: 'JAS',
  '1 peter': '1PE', '1pe': '1PE', '1 pet': '1PE', 'i peter': '1PE', '1peter': '1PE',
  '2 peter': '2PE', '2pe': '2PE', '2 pet': '2PE', 'ii peter': '2PE', '2peter': '2PE',
  '1 john': '1JN', '1jn': '1JN', 'i john': '1JN', '1john': '1JN',
  '2 john': '2JN', '2jn': '2JN', 'ii john': '2JN', '2john': '2JN',
  '3 john': '3JN', '3jn': '3JN', 'iii john': '3JN', '3john': '3JN',
  jude: 'JUD', jud: 'JUD',
  revelation: 'REV', rev: 'REV', revelations: 'REV', apocalypse: 'REV',
};

// KJV — always available via api.bible, used as the validation target
export const VALIDATION_BIBLE_ID = 'de4e12af7f28f599-02';

/**
 * Parse a raw reference string like "(John 3:16)" or "(1 Cor 13:4–7)"
 * into its components. Returns null if the reference is unrecognisable.
 */
export function parseRef(raw) {
  const cleaned = raw.replace(/^[\[(]|[\])]$/g, '').trim();
  const m = cleaned.match(
    /^([1-3]?\s?[A-Za-z][A-Za-z ]+?)\s+(\d{1,3}):(\d{1,3})(?:[–\-]\d+)?/
  );
  if (!m) return null;
  const bookRaw = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
  const ch = parseInt(m[2], 10);
  const v  = parseInt(m[3], 10);
  const code = BOOK_CODES[bookRaw];
  if (!code || !ch || !v) return null;
  return { code, ch, v, raw };
}

/** Convert parsed ref to api.bible verse ID format e.g. "JHN.3.16" */
export function toApiVerseId({ code, ch, v }) {
  return `${code}.${ch}.${v}`;
}

/** Parse all recognisable refs from an arbitrary text string */
export function extractRefs(text) {
  const REF_RE = /\([1-3]?\s?[A-Za-z][A-Za-z ]+\s\d{1,3}:\d{1,3}(?:[–\-]\d+)?\)/g;
  const matches = text.match(REF_RE) ?? [];
  const out = new Map(); // raw → verseId
  for (const raw of matches) {
    const parsed = parseRef(raw);
    if (parsed) out.set(raw, toApiVerseId(parsed));
  }
  return out; // Map<raw, verseId>
}
