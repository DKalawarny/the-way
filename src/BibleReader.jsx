import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { T } from './theme.js';
import { useSpeechRecognition } from './useSpeechRecognition.js';
import { useTextToSpeech } from './useTextToSpeech.js';
import { authedFetch } from './supabase.js';
import { verseCountFor } from './bibleVerseCounts.js';
import { useAiUsage } from './useAiUsage.js';
import AiLimitWall, { AiUsageWarning } from './AiLimitWall.jsx';
import Tip from './Tip.jsx';

// Bible API is proxied through /api/bible to keep the key server-side

const VERSIONS = [
  { id: '78a9f6124f344018-01', name: 'New International Version', abbr: 'NIV' },
  { id: 'de4e12af7f28f599-02', name: 'King James Version',        abbr: 'KJV' },
  { id: '63097d2a0a2f7db3-01', name: 'New King James Version',    abbr: 'NKJV' },
  { id: '06125adad2d5898a-01', name: 'American Standard Version', abbr: 'ASV' },
];

const OT = [
  { id:'GEN',name:'Genesis',ch:50 },{ id:'EXO',name:'Exodus',ch:40 },{ id:'LEV',name:'Leviticus',ch:27 },
  { id:'NUM',name:'Numbers',ch:36 },{ id:'DEU',name:'Deuteronomy',ch:34 },{ id:'JOS',name:'Joshua',ch:24 },
  { id:'JDG',name:'Judges',ch:21 },{ id:'RUT',name:'Ruth',ch:4 },{ id:'1SA',name:'1 Samuel',ch:31 },
  { id:'2SA',name:'2 Samuel',ch:24 },{ id:'1KI',name:'1 Kings',ch:22 },{ id:'2KI',name:'2 Kings',ch:25 },
  { id:'1CH',name:'1 Chronicles',ch:29 },{ id:'2CH',name:'2 Chronicles',ch:36 },{ id:'EZR',name:'Ezra',ch:10 },
  { id:'NEH',name:'Nehemiah',ch:13 },{ id:'EST',name:'Esther',ch:10 },{ id:'JOB',name:'Job',ch:42 },
  { id:'PSA',name:'Psalms',ch:150 },{ id:'PRO',name:'Proverbs',ch:31 },{ id:'ECC',name:'Ecclesiastes',ch:12 },
  { id:'SNG',name:'Song of Solomon',ch:8 },{ id:'ISA',name:'Isaiah',ch:66 },{ id:'JER',name:'Jeremiah',ch:52 },
  { id:'LAM',name:'Lamentations',ch:5 },{ id:'EZK',name:'Ezekiel',ch:48 },{ id:'DAN',name:'Daniel',ch:12 },
  { id:'HOS',name:'Hosea',ch:14 },{ id:'JOL',name:'Joel',ch:3 },{ id:'AMO',name:'Amos',ch:9 },
  { id:'OBA',name:'Obadiah',ch:1 },{ id:'JON',name:'Jonah',ch:4 },{ id:'MIC',name:'Micah',ch:7 },
  { id:'NAM',name:'Nahum',ch:3 },{ id:'HAB',name:'Habakkuk',ch:3 },{ id:'ZEP',name:'Zephaniah',ch:3 },
  { id:'HAG',name:'Haggai',ch:2 },{ id:'ZEC',name:'Zechariah',ch:14 },{ id:'MAL',name:'Malachi',ch:4 },
];
const NT = [
  { id:'MAT',name:'Matthew',ch:28 },{ id:'MRK',name:'Mark',ch:16 },{ id:'LUK',name:'Luke',ch:24 },
  { id:'JHN',name:'John',ch:21 },{ id:'ACT',name:'Acts',ch:28 },{ id:'ROM',name:'Romans',ch:16 },
  { id:'1CO',name:'1 Corinthians',ch:16 },{ id:'2CO',name:'2 Corinthians',ch:13 },{ id:'GAL',name:'Galatians',ch:6 },
  { id:'EPH',name:'Ephesians',ch:6 },{ id:'PHP',name:'Philippians',ch:4 },{ id:'COL',name:'Colossians',ch:4 },
  { id:'1TH',name:'1 Thessalonians',ch:5 },{ id:'2TH',name:'2 Thessalonians',ch:3 },{ id:'1TI',name:'1 Timothy',ch:6 },
  { id:'2TI',name:'2 Timothy',ch:4 },{ id:'TIT',name:'Titus',ch:3 },{ id:'PHM',name:'Philemon',ch:1 },
  { id:'HEB',name:'Hebrews',ch:13 },{ id:'JAS',name:'James',ch:5 },{ id:'1PE',name:'1 Peter',ch:5 },
  { id:'2PE',name:'2 Peter',ch:3 },{ id:'1JN',name:'1 John',ch:5 },{ id:'2JN',name:'2 John',ch:1 },
  { id:'3JN',name:'3 John',ch:1 },{ id:'JUD',name:'Jude',ch:1 },{ id:'REV',name:'Revelation',ch:22 },
];
const ALL_BOOKS = [...OT, ...NT];
const TOTAL_CHAPTERS = ALL_BOOKS.reduce((s, b) => s + b.ch, 0); // 1189

// ── Achievement badges ────────────────────────────────────────────────────────
function bookGroupComplete(bookIds, completedSet, bibleId) {
  for (const bid of bookIds) {
    const b = ALL_BOOKS.find((x) => x.id === bid);
    if (!b) continue;
    for (let ch = 1; ch <= b.ch; ch++) {
      if (!completedSet.has(`${bibleId}:${bid}:${ch}`)) return false;
    }
  }
  return true;
}

function countForVersion(completedSet, bibleId) {
  let n = 0;
  const prefix = `${bibleId}:`;
  for (const k of completedSet) if (k.startsWith(prefix)) n++;
  return n;
}

const BADGES = [
  { id: 'first_step',    name: 'Let There Be Light',   desc: '"In the beginning God created the heavens and the earth." — Gen 1:1',          check: (c, id) => countForVersion(c, id) >= 1 },
  { id: 'well_read',     name: 'Seek and You Will Find', desc: '"Seek and you will find; knock and the door will be opened to you." — Matt 7:7', check: (c, id) => countForVersion(c, id) >= 10 },
  { id: 'seeking',       name: 'He Restores My Soul',   desc: '"He restores my soul. He leads me in paths of righteousness." — Ps 23:3',       check: (c, id) => countForVersion(c, id) >= 25 },
  { id: 'faithful',      name: 'Year of Jubilee',       desc: '"Proclaim liberty throughout the land to all its inhabitants." — Lev 25:10',    check: (c, id) => countForVersion(c, id) >= 50 },
  { id: 'devoted',       name: 'A Hundredfold',         desc: '"Other seeds fell on good soil and produced grain, a hundredfold." — Matt 13:8', check: (c, id) => countForVersion(c, id) >= 100 },
  { id: 'scholar',       name: 'Great Is Thy Faithfulness', desc: '"His mercies never come to an end; they are new every morning." — Lam 3:23', check: (c, id) => countForVersion(c, id) >= 250 },
  { id: 'scribe',        name: 'Lamp to My Feet',        desc: '"Your word is a lamp to my feet and a light to my path." — Ps 119:105',        check: (c, id) => countForVersion(c, id) >= 500 },
  { id: 'genesis',       name: 'In the Beginning',      desc: '"In the beginning, God…" — Complete Genesis, the foundation of all things',     check: (c, id) => bookGroupComplete(['GEN'], c, id) },
  { id: 'the_law',       name: 'The Law of Moses',      desc: '"Be careful to obey all the law my servant Moses gave you." — Josh 1:7',        check: (c, id) => bookGroupComplete(['GEN','EXO','LEV','NUM','DEU'], c, id) },
  { id: 'the_psalms',    name: 'Praise the Lord',       desc: '"Let everything that has breath praise the Lord." — Psalm 150:6',               check: (c, id) => bookGroupComplete(['PSA'], c, id) },
  { id: 'the_gospels',   name: 'The Good News',         desc: '"The beginning of the gospel of Jesus Christ, the Son of God." — Mark 1:1',     check: (c, id) => bookGroupComplete(['MAT','MRK','LUK','JHN'], c, id) },
  { id: 'new_testament', name: 'The New Covenant',      desc: '"This cup is the new covenant in my blood, poured out for you." — Luke 22:20',  check: (c, id) => bookGroupComplete(NT.map((b) => b.id), c, id) },
  { id: 'old_testament', name: 'The Ancient Paths',     desc: '"Ask for the ancient paths, where the good way is, and walk in it." — Jer 6:16', check: (c, id) => bookGroupComplete(OT.map((b) => b.id), c, id) },
  { id: 'the_word',      name: 'The Living Word',       desc: '"The word of God is living and active, sharper than any two-edged sword." — Heb 4:12', check: (c, id) => countForVersion(c, id) >= 1189 },
];

// Books to clear when resetting a book-group achievement badge
const ACHIEVEMENT_RESET = {
  genesis:      ['GEN'],
  the_law:      ['GEN','EXO','LEV','NUM','DEU'],
  the_psalms:   ['PSA'],
  the_gospels:  ['MAT','MRK','LUK','JHN'],
  new_testament: NT.map((b) => b.id),
  old_testament: OT.map((b) => b.id),
  the_word:     ALL_BOOKS.map((b) => b.id),
};

// Colour palette per biblical section — drives BookBadge
const BOOK_CAT_COLORS = {
  law:        { bg1:'#0E2C5C', bg2:'#060F28', rim:'#1A48A0' },
  history:    { bg1:'#5C2C10', bg2:'#2E1608', rim:'#9C4C1C' },
  poetry:     { bg1:'#3C1460', bg2:'#1C0830', rim:'#6830A8' },
  major_prop: { bg1:'#5C1010', bg2:'#2C0808', rim:'#9C1C1C' },
  minor_prop: { bg1:'#4A3808', bg2:'#241C04', rim:'#886818' },
  gospels:    { bg1:'#5A4C08', bg2:'#2C2604', rim:'#A89010' },
  acts:       { bg1:'#0C5430', bg2:'#061C18', rim:'#1C9858' },
  pauline:    { bg1:'#0C4858', bg2:'#06222C', rim:'#187898' },
  general:    { bg1:'#10107A', bg2:'#080838', rim:'#2020C8' },
  revelation: { bg1:'#580808', bg2:'#2C0404', rim:'#981018' },
};
const BOOK_CAT = {
  GEN:'law', EXO:'law', LEV:'law', NUM:'law', DEU:'law',
  JOS:'history', JDG:'history', RUT:'history', '1SA':'history', '2SA':'history',
  '1KI':'history', '2KI':'history', '1CH':'history', '2CH':'history',
  EZR:'history', NEH:'history', EST:'history',
  JOB:'poetry', PSA:'poetry', PRO:'poetry', ECC:'poetry', SNG:'poetry',
  ISA:'major_prop', JER:'major_prop', LAM:'major_prop', EZK:'major_prop', DAN:'major_prop',
  HOS:'minor_prop', JOL:'minor_prop', AMO:'minor_prop', OBA:'minor_prop', JON:'minor_prop',
  MIC:'minor_prop', NAM:'minor_prop', HAB:'minor_prop', ZEP:'minor_prop', HAG:'minor_prop',
  ZEC:'minor_prop', MAL:'minor_prop',
  MAT:'gospels', MRK:'gospels', LUK:'gospels', JHN:'gospels',
  ACT:'acts',
  ROM:'pauline', '1CO':'pauline', '2CO':'pauline', GAL:'pauline', EPH:'pauline',
  PHP:'pauline', COL:'pauline', '1TH':'pauline', '2TH':'pauline',
  '1TI':'pauline', '2TI':'pauline', TIT:'pauline', PHM:'pauline',
  HEB:'general', JAS:'general', '1PE':'general', '2PE':'general',
  '1JN':'general', '2JN':'general', '3JN':'general', JUD:'general',
  REV:'revelation',
};

// Human-readable label shown inside each book seal
const BOOK_LABEL = {
  GEN:'Gen',  EXO:'Exo',  LEV:'Lev',  NUM:'Num',  DEU:'Deu',
  JOS:'Josh', JDG:'Jdg',  RUT:'Ruth',
  '1SA':'1Sa','2SA':'2Sa','1KI':'1Ki','2KI':'2Ki',
  '1CH':'1Ch','2CH':'2Ch',
  EZR:'Ezra', NEH:'Neh',  EST:'Esth', JOB:'Job',
  PSA:'Psa',  PRO:'Pro',  ECC:'Ecc',  SNG:'Song',
  ISA:'Isa',  JER:'Jer',  LAM:'Lam',  EZK:'Ezk',  DAN:'Dan',
  HOS:'Hos',  JOL:'Joel', AMO:'Amos', OBA:'Oba',  JON:'Jon',
  MIC:'Mic',  NAM:'Nah',  HAB:'Hab',  ZEP:'Zep',  HAG:'Hag',
  ZEC:'Zec',  MAL:'Mal',
  MAT:'Matt', MRK:'Mark', LUK:'Luke', JHN:'John', ACT:'Acts',
  ROM:'Rom',  '1CO':'1Co','2CO':'2Co',GAL:'Gal',  EPH:'Eph',
  PHP:'Phil', COL:'Col',  '1TH':'1Th','2TH':'2Th',
  '1TI':'1Ti','2TI':'2Ti',TIT:'Tit',  PHM:'Phm',
  HEB:'Heb',  JAS:'Jas',  '1PE':'1Pe','2PE':'2Pe',
  '1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Rev',
};

const SHIELD_D = 'M40 4 L74 18 L74 46 Q74 66 40 76 Q6 66 6 46 L6 18 Z';
const STAR8_D  = 'M40 2 L46 28 L68 10 L52 32 L78 40 L52 48 L68 70 L46 52 L40 78 L34 52 L12 70 L28 48 L2 40 L28 32 L12 10 L34 28 Z';

// ── Bible section groupings for the illustrated book picker ─────────────────
const BIBLE_SECTIONS = [
  {
    key: 'law',
    label: 'The Law',
    subtitle: 'Genesis · Exodus · Leviticus · Numbers · Deuteronomy',
    desc: 'The foundations — creation, covenant, commandments',
    bookIds: ['GEN','EXO','LEV','NUM','DEU'],
  },
  {
    key: 'history',
    label: 'Historical Books',
    subtitle: 'Joshua through Esther',
    desc: 'Conquest, kingdoms, exile, and the faithfulness of God through it all',
    bookIds: ['JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST'],
  },
  {
    key: 'poetry',
    label: 'Poetry & Wisdom',
    subtitle: 'Job · Psalms · Proverbs · Ecclesiastes · Song of Solomon',
    desc: 'Lament, praise, wisdom, and the depths of the human heart',
    bookIds: ['JOB','PSA','PRO','ECC','SNG'],
  },
  {
    key: 'major_prop',
    label: 'Major Prophets',
    subtitle: 'Isaiah · Jeremiah · Lamentations · Ezekiel · Daniel',
    desc: 'Bold voices calling Israel back to God',
    bookIds: ['ISA','JER','LAM','EZK','DAN'],
  },
  {
    key: 'minor_prop',
    label: 'Minor Prophets',
    subtitle: 'Hosea through Malachi',
    desc: 'Twelve books, one recurring call: return to the Lord',
    bookIds: ['HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL'],
  },
  {
    key: 'gospels',
    label: 'The Gospels',
    subtitle: 'Matthew · Mark · Luke · John',
    desc: 'The life, death, and resurrection of Jesus Christ',
    bookIds: ['MAT','MRK','LUK','JHN'],
  },
  {
    key: 'acts',
    label: 'Acts',
    subtitle: 'The Acts of the Apostles',
    desc: 'The Spirit poured out — the church is born and spreads to the world',
    bookIds: ['ACT'],
  },
  {
    key: 'pauline',
    label: 'Letters of Paul',
    subtitle: 'Romans through Philemon',
    desc: 'Grace, faith, and life in Christ — written to early churches',
    bookIds: ['ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM'],
  },
  {
    key: 'general',
    label: 'General Letters',
    subtitle: 'Hebrews · James · 1 & 2 Peter · 1, 2 & 3 John · Jude',
    desc: 'Letters of wisdom, perseverance, and faith in action',
    bookIds: ['HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD'],
  },
  {
    key: 'revelation',
    label: 'Revelation',
    subtitle: 'The Revelation to John',
    desc: 'The final vision — the Lamb victorious, all things made new',
    bookIds: ['REV'],
  },
];

// SVG art for each Bible section — symbolically accurate, no figurative depictions
// color prop: undefined = cream (for dark mode); pass a hex/rgba for light mode
function SectionIcon({ sectionKey, size = 36, color }) {
  const s = size;
  const c = color ?? 'rgba(255,240,195,0.92)';
  const icons = {
    law: (
      // Two stone tablets with engraved lines (the Ten Commandments)
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect x="3" y="6" width="14" height="18" rx="3" fill="none" stroke={c} strokeWidth="1.8"/>
        <path d="M10 6 Q10 3 10 3 Q10 3 10 6" stroke={c} strokeWidth="1.8"/>
        <line x1="6" y1="12" x2="14" y2="12" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        <line x1="6" y1="15.5" x2="14" y2="15.5" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        <line x1="6" y1="19" x2="14" y2="19" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        <rect x="23" y="6" width="14" height="18" rx="3" fill="none" stroke={c} strokeWidth="1.8"/>
        <path d="M30 6 Q30 3 30 3 Q30 3 30 6" stroke={c} strokeWidth="1.8"/>
        <line x1="26" y1="12" x2="34" y2="12" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        <line x1="26" y1="15.5" x2="34" y2="15.5" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        <line x1="26" y1="19" x2="34" y2="19" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        {/* Small flame above tablets */}
        <path d="M20 5 Q18 2 20 0 Q22 2 20 5" fill={c} opacity="0.7"/>
      </svg>
    ),
    history: (
      // Crown — symbol of the kings of Israel and Judah
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M6 28 L6 14 L14 20 L20 8 L26 20 L34 14 L34 28 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
        <line x1="6" y1="28" x2="34" y2="28" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="20" cy="8" r="1.5" fill={c}/>
        <circle cx="6" cy="14" r="1.5" fill={c}/>
        <circle cx="34" cy="14" r="1.5" fill={c}/>
      </svg>
    ),
    poetry: (
      // Lyre — instrument of praise, associated with David and the Psalms
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M12 30 Q8 20 12 10 Q20 4 28 10 Q32 20 28 30" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <line x1="12" y1="30" x2="28" y2="30" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="16" y1="30" x2="16" y2="14" stroke={c} strokeWidth="1.2" opacity="0.75"/>
        <line x1="20" y1="30" x2="20" y2="11" stroke={c} strokeWidth="1.2" opacity="0.75"/>
        <line x1="24" y1="30" x2="24" y2="14" stroke={c} strokeWidth="1.2" opacity="0.75"/>
        <line x1="10" y1="19" x2="30" y2="19" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    major_prop: (
      // Burning torch — the fire of prophecy
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect x="17" y="22" width="6" height="14" rx="2" fill="none" stroke={c} strokeWidth="1.8"/>
        <path d="M20 22 Q15 16 17 8 Q20 13 20 18 Q20 13 23 8 Q25 16 20 22" fill={c} opacity="0.8"/>
        <path d="M20 20 Q18 15 19 10 Q20 14 20 17 Q20 14 21 10 Q22 15 20 20" fill="rgba(255,220,120,0.5)"/>
      </svg>
    ),
    minor_prop: (
      // Dove in flight — symbol of peace and God's messenger (appears in Jonah, Hosea, etc.)
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M20 22 Q12 18 8 12 Q16 10 22 14" fill={c} opacity="0.85" stroke={c} strokeWidth="0.8"/>
        <path d="M20 22 Q14 26 8 28 Q12 22 20 22" fill={c} opacity="0.6"/>
        <ellipse cx="22" cy="20" rx="8" ry="5" fill={c} opacity="0.9"/>
        <path d="M28 18 Q34 14 36 10 Q34 16 30 20" fill={c} opacity="0.8" stroke={c} strokeWidth="0.5"/>
        <circle cx="26" cy="18" r="1.2" fill="rgba(30,10,0,0.5)"/>
        <path d="M30 22 Q34 24 32 26 Q30 24 28 24" fill={c} opacity="0.5"/>
      </svg>
    ),
    gospels: (
      // Star of Bethlehem — eight-pointed star, the sign of Christ's birth (Matthew 2)
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M20 4 L22 16 L32 8 L24 18 L36 20 L24 22 L32 32 L22 24 L20 36 L18 24 L8 32 L16 22 L4 20 L16 18 L8 8 L18 16 Z" fill={c} opacity="0.9"/>
        <circle cx="20" cy="20" r="3" fill="rgba(255,220,100,0.5)"/>
      </svg>
    ),
    acts: (
      // Flame divided into tongues — Pentecost (Acts 2)
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M20 32 Q14 26 16 16 Q20 22 20 28 Q20 22 24 16 Q26 26 20 32" fill={c} opacity="0.85"/>
        <path d="M12 28 Q8 22 10 12 Q14 18 14 24 Q14 18 16 12 Q18 22 12 28" fill={c} opacity="0.65"/>
        <path d="M28 28 Q24 22 26 12 Q30 18 30 24 Q30 18 32 12 Q34 22 28 28" fill={c} opacity="0.65"/>
        <path d="M20 30 Q18 26 19 22 Q20 25 20 27 Q20 25 21 22 Q22 26 20 30" fill="rgba(255,230,150,0.6)"/>
      </svg>
    ),
    pauline: (
      // Scroll with quill — the letters of Paul, written to the churches
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M8 8 Q8 5 12 5 L30 5 Q34 5 34 8 L34 32 Q34 35 30 35 L12 35 Q8 35 8 32 Z" fill="none" stroke={c} strokeWidth="1.8"/>
        <path d="M8 8 Q4 8 4 11 Q4 14 8 14" stroke={c} strokeWidth="1.5" fill="none"/>
        <path d="M8 32 Q4 32 4 29 Q4 26 8 26" stroke={c} strokeWidth="1.5" fill="none"/>
        <line x1="13" y1="14" x2="27" y2="14" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        <line x1="13" y1="19" x2="27" y2="19" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        <line x1="13" y1="24" x2="22" y2="24" stroke={c} strokeWidth="1.3" opacity="0.7"/>
        {/* Quill tip */}
        <path d="M26 28 Q32 20 36 6 Q30 14 28 22 Q28 24 26 28" fill={c} opacity="0.7"/>
      </svg>
    ),
    general: (
      // Open book with olive branch — wisdom letters and peace
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M20 10 Q20 8 20 8 L6 10 L6 32 L20 30 L34 32 L34 10 L20 10" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
        <line x1="20" y1="10" x2="20" y2="30" stroke={c} strokeWidth="1.5"/>
        <line x1="9" y1="15" x2="18" y2="15" stroke={c} strokeWidth="1.2" opacity="0.65"/>
        <line x1="9" y1="19" x2="18" y2="19" stroke={c} strokeWidth="1.2" opacity="0.65"/>
        <line x1="9" y1="23" x2="18" y2="23" stroke={c} strokeWidth="1.2" opacity="0.65"/>
        <line x1="22" y1="15" x2="31" y2="15" stroke={c} strokeWidth="1.2" opacity="0.65"/>
        <line x1="22" y1="19" x2="31" y2="19" stroke={c} strokeWidth="1.2" opacity="0.65"/>
        <line x1="22" y1="23" x2="31" y2="23" stroke={c} strokeWidth="1.2" opacity="0.65"/>
      </svg>
    ),
    revelation: (
      // Seven-branched menorah (lampstand) — referenced in Rev 1-2 as the seven churches
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" aria-hidden>
        {/* Stand */}
        <line x1="20" y1="24" x2="20" y2="34" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        <line x1="14" y1="34" x2="26" y2="34" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        {/* Seven branches */}
        {[-12,-8,-4,0,4,8,12].map((dx, i) => (
          <g key={i}>
            {/* Branch arm */}
            {dx !== 0 && <path d={dx < 0
              ? `M20 24 Q${20+dx/2} 24 ${20+dx} 20`
              : `M20 24 Q${20+dx/2} 24 ${20+dx} 20`}
              stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round"/>}
            {/* Stem up */}
            <line x1={20+dx} y1={dx === 0 ? 10 : 20} x2={20+dx} y2={dx === 0 ? 24 : 10} stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
            {/* Flame */}
            <path d={`M${20+dx} ${dx === 0 ? 10 : 10} Q${18+dx} ${dx === 0 ? 6 : 6} ${20+dx} ${dx === 0 ? 4 : 4} Q${22+dx} ${dx === 0 ? 6 : 6} ${20+dx} ${dx === 0 ? 10 : 10}`} fill={c} opacity={i === 3 ? 0.95 : 0.65}/>
          </g>
        ))}
      </svg>
    ),
  };
  return icons[sectionKey] ?? null;
}

function BadgeArt({ id, size = 72, earned = true }) {
  // Defined inside the component so JSX is always in render scope
  const ic = 'rgba(255,240,195,0.95)';
  const ART = {
    first_step:    { shape:'circle', bg1:'#2A6020', bg2:'#0E2E0A', rim:'#50A838',
      icon: <g fill="none" stroke={ic} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="40" y1="57" x2="40" y2="38"/>
        <path d="M40 47 Q29 37 33 24 Q40 29 40 44"/>
        <path d="M40 44 Q47 29 51 24 Q51 37 40 47"/>
        <line x1="33" y1="60" x2="47" y2="60" strokeWidth="2"/>
      </g> },

    well_read:     { shape:'circle', bg1:'#7A4820', bg2:'#3A2010', rim:'#C87838',
      icon: <g fill="none" stroke={ic} strokeWidth="2" strokeLinecap="round">
        <line x1="40" y1="24" x2="40" y2="58"/>
        <path d="M40 26 Q28 24 21 27 L21 56 Q28 54 40 56"/>
        <path d="M40 26 Q52 24 59 27 L59 56 Q52 54 40 56"/>
        <line x1="25" y1="34" x2="38" y2="34" strokeWidth="1.5"/>
        <line x1="25" y1="40" x2="38" y2="40" strokeWidth="1.5"/>
        <line x1="25" y1="46" x2="38" y2="46" strokeWidth="1.5"/>
        <line x1="42" y1="34" x2="55" y2="34" strokeWidth="1.5"/>
        <line x1="42" y1="40" x2="55" y2="40" strokeWidth="1.5"/>
        <line x1="42" y1="46" x2="55" y2="46" strokeWidth="1.5"/>
      </g> },

    seeking:       { shape:'circle', bg1:'#8B4A08', bg2:'#4A2605', rim:'#E09020',
      icon: <g strokeLinecap="round">
        <rect x="34" y="42" width="12" height="20" rx="2" fill={ic} opacity="0.25" stroke={ic} strokeWidth="2"/>
        <line x1="40" y1="39" x2="40" y2="42" stroke={ic} strokeWidth="2.5"/>
        <path d="M40 38 Q46 30 44 22 Q41 27 38 23 Q36 30 38 35 Q39 36 40 38" fill={ic} stroke="none"/>
        <path d="M40 36 Q43 31 42 27 Q40 30 39 28 Q38 32 39 35" fill="rgba(255,248,200,0.7)" stroke="none"/>
      </g> },

    faithful:      { shape:'circle', bg1:'#7A1A1A', bg2:'#3A0808', rim:'#C03030',
      icon: <g fill={ic}>
        <rect x="37" y="17" width="6" height="46" rx="3"/>
        <rect x="21" y="31" width="38" height="6" rx="3"/>
        <circle cx="40" cy="34" r="4" fill="rgba(255,200,200,0.3)"/>
      </g> },

    devoted:       { shape:'circle', bg1:'#8A6E10', bg2:'#4A3A08', rim:'#E8C020',
      icon: <g>
        <polygon points="40,16 43.5,32 56,21 48,36 64,40 48,44 56,59 43.5,48 40,64 36.5,48 24,59 32,44 16,40 32,36 24,21 36.5,32" fill={ic} opacity="0.92"/>
        <circle cx="40" cy="40" r="7" fill="rgba(255,248,180,0.35)"/>
        <circle cx="40" cy="40" r="4" fill="rgba(255,250,210,0.6)"/>
      </g> },

    scholar:       { shape:'circle', bg1:'#1A5050', bg2:'#0A2A2A', rim:'#309898',
      icon: <g fill="none" stroke={ic} strokeWidth="2.2" strokeLinecap="round">
        <ellipse cx="26" cy="40" rx="5" ry="14" fill={ic} opacity="0.2"/>
        <rect x="26" y="27" width="28" height="26" rx="2" fill={ic} opacity="0.15"/>
        <ellipse cx="54" cy="40" rx="5" ry="14" fill={ic} opacity="0.2"/>
        <line x1="31" y1="34" x2="49" y2="34"/>
        <line x1="31" y1="40" x2="49" y2="40"/>
        <line x1="31" y1="46" x2="43" y2="46"/>
      </g> },

    scribe:        { shape:'circle', bg1:'#4A3010', bg2:'#241808', rim:'#907030',
      icon: <g fill="none" stroke={ic} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 21 L26 59 Q26 62 29 62 L52 62 Q55 62 55 59 L55 27 L48 20 L26 20 Q23 20 23 23"/>
        <path d="M48 20 L48 27 L55 27"/>
        <path d="M44 22 Q54 14 60 18 Q52 22 50 32 L44 54" strokeWidth="2.2"/>
        <path d="M60 18 Q55 26 50 32"/>
        <line x1="30" y1="37" x2="44" y2="37" strokeWidth="1.5"/>
        <line x1="30" y1="43" x2="43" y2="43" strokeWidth="1.5"/>
        <line x1="30" y1="49" x2="40" y2="49" strokeWidth="1.5"/>
      </g> },

    genesis:       { shape:'shield', bg1:'#1A5C24', bg2:'#0A3012', rim:'#30A040',
      icon: <g fill="none" stroke={ic} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="40" y1="64" x2="40" y2="44"/>
        <path d="M40 64 Q34 67 29 64"/>
        <path d="M40 64 Q46 67 51 64"/>
        <path d="M40 52 Q27 47 23 34 Q32 37 40 47"/>
        <path d="M40 52 Q53 47 57 34 Q48 37 40 47"/>
        <path d="M40 44 Q29 37 27 24 Q36 29 40 40"/>
        <path d="M40 44 Q51 37 53 24 Q44 29 40 40"/>
        <path d="M40 38 Q37 27 38 18 Q40 22 42 18 Q43 27 40 38"/>
      </g> },

    the_law:       { shape:'shield', bg1:'#5A4C38', bg2:'#302820', rim:'#C0A060',
      icon: <g fill="none" stroke={ic} strokeWidth="2.2" strokeLinecap="round">
        <path d="M18 60 L18 34 Q18 22 26 22 L36 22 L36 60 Z" fill={ic} opacity="0.15"/>
        <path d="M18 34 Q18 22 26 22 L36 22 L36 60 L18 60 Z"/>
        <path d="M44 60 L44 34 Q44 22 52 22 L62 22 L62 60 Z" fill={ic} opacity="0.15"/>
        <path d="M44 34 Q44 22 52 22 L62 22 L62 60 L44 60 Z"/>
        <line x1="21" y1="31" x2="33" y2="31" strokeWidth="1.5"/><line x1="21" y1="37" x2="33" y2="37" strokeWidth="1.5"/>
        <line x1="21" y1="43" x2="33" y2="43" strokeWidth="1.5"/><line x1="21" y1="49" x2="33" y2="49" strokeWidth="1.5"/><line x1="21" y1="55" x2="33" y2="55" strokeWidth="1.5"/>
        <line x1="47" y1="31" x2="59" y2="31" strokeWidth="1.5"/><line x1="47" y1="37" x2="59" y2="37" strokeWidth="1.5"/>
        <line x1="47" y1="43" x2="59" y2="43" strokeWidth="1.5"/><line x1="47" y1="49" x2="59" y2="49" strokeWidth="1.5"/><line x1="47" y1="55" x2="59" y2="55" strokeWidth="1.5"/>
      </g> },

    the_psalms:    { shape:'shield', bg1:'#38185A', bg2:'#1E0A30', rim:'#7840B8',
      icon: <g fill="none" stroke={ic} strokeWidth="2" strokeLinecap="round">
        <path d="M28 64 Q22 32 38 18"/>
        <line x1="28" y1="64" x2="58" y2="64"/>
        <path d="M38 18 Q58 15 58 36"/>
        <line x1="58" y1="36" x2="58" y2="64"/>
        <line x1="34" y1="30" x2="34" y2="64"/>
        <line x1="40" y1="24" x2="40" y2="64"/>
        <line x1="46" y1="22" x2="46" y2="64"/>
        <line x1="52" y1="24" x2="52" y2="64"/>
      </g> },

    the_gospels:   { shape:'shield', bg1:'#183858', bg2:'#0A1E30', rim:'#3870C0',
      icon: <g>
        <ellipse cx="36" cy="46" rx="14" ry="7" transform="rotate(-12 36 46)" fill={ic} opacity="0.9"/>
        <circle cx="21" cy="38" r="6" fill={ic} opacity="0.9"/>
        <polygon points="14,38 12,34 12,42" fill={ic} opacity="0.9"/>
        <path d="M36 42 Q47 26 60 32 Q52 28 44 38 Q41 40 36 42" fill={ic} opacity="0.9"/>
        <path d="M38 46 Q50 38 62 44 Q54 40 46 46" fill={ic} opacity="0.6"/>
        <path d="M12 38 Q10 46 14 52" fill="none" stroke="#6EC84A" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="11" cy="44" r="2.5" fill="#5AB038"/>
        <circle cx="13" cy="50" r="2" fill="#5AB038"/>
      </g> },

    new_testament: { shape:'shield', bg1:'#181E50', bg2:'#0A1030', rim:'#2840A8',
      icon: <g fill="none" stroke={ic} strokeLinecap="round" strokeLinejoin="round">
        <line x1="25" y1="20" x2="55" y2="62" strokeWidth="3.5"/>
        <line x1="55" y1="20" x2="25" y2="62" strokeWidth="3.5"/>
        <line x1="40" y1="16" x2="40" y2="64" strokeWidth="3.5"/>
        <path d="M40 16 Q56 16 56 30 Q56 44 40 44" strokeWidth="3"/>
        <line x1="30" y1="35" x2="50" y2="35" strokeWidth="2.5"/>
      </g> },

    old_testament: { shape:'shield', bg1:'#5A3810', bg2:'#2C1C08', rim:'#C07828',
      icon: <g fill="none" stroke={ic} strokeWidth="2.2" strokeLinecap="round">
        <line x1="30" y1="62" x2="50" y2="62"/>
        <line x1="40" y1="58" x2="40" y2="62"/>
        <line x1="40" y1="22" x2="40" y2="58"/>
        <path d="M40 46 Q34 42 28 44 L28 22"/>
        <path d="M40 46 Q46 42 52 44 L52 22"/>
        <path d="M40 52 Q32 46 24 50 L24 22"/>
        <path d="M40 52 Q48 46 56 50 L56 22"/>
        <circle cx="24" cy="20" r="2.5" fill={ic} stroke="none"/>
        <circle cx="28" cy="20" r="2.5" fill={ic} stroke="none"/>
        <circle cx="32" cy="20" r="2.5" fill={ic} stroke="none"/>
        <circle cx="40" cy="20" r="2.5" fill={ic} stroke="none"/>
        <circle cx="48" cy="20" r="2.5" fill={ic} stroke="none"/>
        <circle cx="52" cy="20" r="2.5" fill={ic} stroke="none"/>
        <circle cx="56" cy="20" r="2.5" fill={ic} stroke="none"/>
      </g> },

    the_word:      { shape:'star', bg1:'#907010', bg2:'#503808', rim:'#F0C828',
      icon: <g>
        <rect x="37" y="18" width="6" height="44" rx="3" fill={ic} opacity="0.95"/>
        <rect x="18" y="37" width="44" height="6" rx="3" fill={ic} opacity="0.95"/>
        <line x1="25" y1="25" x2="31" y2="31" stroke={ic} strokeWidth="4" strokeLinecap="round" opacity="0.65"/>
        <line x1="55" y1="25" x2="49" y2="31" stroke={ic} strokeWidth="4" strokeLinecap="round" opacity="0.65"/>
        <line x1="25" y1="55" x2="31" y2="49" stroke={ic} strokeWidth="4" strokeLinecap="round" opacity="0.65"/>
        <line x1="55" y1="55" x2="49" y2="49" stroke={ic} strokeWidth="4" strokeLinecap="round" opacity="0.65"/>
        <circle cx="40" cy="40" r="9" fill={ic} opacity="0.25"/>
        <circle cx="40" cy="40" r="5" fill={ic} opacity="0.5"/>
        <circle cx="40" cy="40" r="3" fill="rgba(255,248,200,0.9)"/>
      </g> },
  };

  const def = ART[id];
  if (!def) return null;

  const uid      = `b${id.replace(/_/g, '')}`;
  const gid      = `${uid}g`;
  const rimId    = `${uid}r`;
  const isCircle = def.shape === 'circle';
  const pathD    = def.shape === 'star' ? STAR8_D : SHIELD_D;

  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      style={{ filter: earned ? 'drop-shadow(0 3px 7px rgba(0,0,0,0.55))' : 'grayscale(1)', opacity: earned ? 1 : 0.35, display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={def.bg1}/><stop offset="100%" stopColor={def.bg2}/>
        </linearGradient>
        <linearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={def.rim}/><stop offset="100%" stopColor={def.bg2}/>
        </linearGradient>
      </defs>
      {isCircle ? <circle cx="40" cy="40" r="37" fill={`url(#${rimId})`}/> : <path d={pathD} fill={`url(#${rimId})`}/>}
      {isCircle
        ? <circle cx="40" cy="40" r="33" fill={`url(#${gid})`}/>
        : <g transform="translate(40,40) scale(0.91) translate(-40,-40)"><path d={pathD} fill={`url(#${gid})`}/></g>}
      {isCircle
        ? <ellipse cx="40" cy="27" rx="18" ry="8" fill="rgba(255,255,255,0.11)"/>
        : <ellipse cx="40" cy="26" rx="14" ry="6" fill="rgba(255,255,255,0.09)"/>}
      {def.icon}
      {earned && <circle cx="26" cy="22" r="3.5" fill="rgba(255,255,255,0.2)"/>}
    </svg>
  );
}

// Per-book completion seal — unique shape+colour per biblical section, abbr as text
function BookBadge({ bookId, size = 28, earned = false }) {
  const isOT = OT.some((b) => b.id === bookId);
  const cat  = BOOK_CAT[bookId] ?? 'general';
  const col  = BOOK_CAT_COLORS[cat];
  const uid    = `bk${bookId.replace(/[^a-z0-9]/gi, '')}`;
  const gid    = `${uid}g`;
  const rId    = `${uid}r`;
  const label  = BOOK_LABEL[bookId] ?? bookId;
  const fSize  = label.length <= 3 ? 17 : label.length === 4 ? 13.5 : 11;
  const lSpace = label.length <= 3 ? 0.5 : 0.2;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      style={{ filter: earned ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' : 'grayscale(1)', opacity: earned ? 1 : 0.32, display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col.bg1}/><stop offset="100%" stopColor={col.bg2}/>
        </linearGradient>
        <linearGradient id={rId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col.rim}/><stop offset="100%" stopColor={col.bg2}/>
        </linearGradient>
      </defs>
      {isOT ? (
        <>
          <path d={SHIELD_D} fill={`url(#${rId})`}/>
          <g transform="translate(40,40) scale(0.91) translate(-40,-40)">
            <path d={SHIELD_D} fill={`url(#${gid})`}/>
          </g>
          <ellipse cx="40" cy="26" rx="14" ry="6" fill="rgba(255,255,255,0.09)"/>
        </>
      ) : (
        <>
          <circle cx="40" cy="40" r="37" fill={`url(#${rId})`}/>
          <circle cx="40" cy="40" r="33" fill={`url(#${gid})`}/>
          <ellipse cx="40" cy="27" rx="18" ry="8" fill="rgba(255,255,255,0.11)"/>
        </>
      )}
      <text x="40" y={isOT ? '45' : '43'}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={fSize} fontWeight="700"
        fill="rgba(255,240,195,0.95)" letterSpacing={lSpace}>
        {label}
      </text>
      {earned && <circle cx="26" cy="22" r="3.5" fill="rgba(255,255,255,0.22)"/>}
    </svg>
  );
}

const QUICK_ACTIONS = [
  { id: 'simple',   label: 'Explain simply',     prompt: (v,b,c) => `Explain ${b} ${c}:${v.number} in plain, simple language. "${v.text}"` },
  { id: 'context',  label: 'Historical context',  prompt: (v,b,c) => `What's the historical and cultural context behind ${b} ${c}:${v.number}? "${v.text}"` },
  { id: 'refs',     label: 'Cross-references',    prompt: (v,b,c) => `What other Bible passages connect to ${b} ${c}:${v.number}? "${v.text}"` },
  { id: 'language', label: 'Original language',   prompt: (v,b,c) => `What does the original Hebrew or Greek say for ${b} ${c}:${v.number}, and does anything get lost in translation? "${v.text}"` },
  { id: 'compare',  label: 'Compare versions',    compare: true },
];

function parseVerses(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const verses = [];
  let current = null;
  function walk(node) {
    if (node.nodeType === 1) {
      if (node.classList?.contains('note')) return;
      const num = node.getAttribute?.('data-number');
      if (num && !isNaN(parseInt(num))) {
        if (current) verses.push({ ...current, text: current.text.trim() });
        current = { number: parseInt(num), text: '' };
        return;
      }
      for (const child of node.childNodes) walk(child);
    } else if (node.nodeType === 3 && current) {
      current.text += node.textContent;
    }
  }
  const root = doc.body.firstChild;
  if (root) for (const child of root.childNodes) walk(child);
  if (current?.text?.trim()) verses.push({ ...current, text: current.text.trim() });
  return verses.filter((v) => v.text);
}

async function fetchChapter(bibleId, bookId, chapterNum) {
  const chapterId = `${bookId}.${chapterNum}`;
  const res = await authedFetch(`/api/bible/${bibleId}/chapters/${chapterId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

const LIGHT = {
  bg: '#FAF7F2', text: '#1C1008', muted: '#7A5C3A',
  verse: '#B8733A', border: 'rgba(184,115,58,0.18)',
  card: '#FFFFFF', cardBorder: 'rgba(184,115,58,0.15)',
  inputBg: '#F3EDE4', section: '#F3EDE4',
};
const DARK = {
  bg: '#0E0906', text: 'rgba(253,248,240,0.92)', muted: 'rgba(253,248,240,0.45)',
  verse: '#B8733A', border: 'rgba(184,115,58,0.2)',
  card: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(184,115,58,0.2)',
  inputBg: 'rgba(255,255,255,0.07)', section: 'rgba(255,255,255,0.04)',
};

// Parse a human-readable Bible reference into { bookId, chapter, verse }.
// Handles: "Romans 8:28", "Psalm 23:1", "1 Peter 5:7", "Lamentations 3:22–23"
function parseRef(refStr) {
  if (!refStr) return null;
  // Normalize em/en dashes
  const norm = refStr.replace(/[\u2013\u2014]/g, '-').trim();
  // Extract verse number (first number after colon, before any dash)
  const verseMatch = norm.match(/:(\d+)/);
  const verse = verseMatch ? parseInt(verseMatch[1], 10) : null;
  // Strip verse portion to isolate book + chapter
  const s = norm.replace(/:.+/, '').trim();
  const m = s.match(/^(.+?)\s+(\d+)$/);
  if (!m) return null;
  let bookName = m[1].trim();
  const chapter = parseInt(m[2], 10);
  if (/^psalm$/i.test(bookName)) bookName = 'Psalms'; // Psalm → Psalms
  const book = ALL_BOOKS.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
  return book ? { bookId: book.id, chapter, verse } : null;
}

export default function BibleReader({ session, profile, homeKey = 0, onClose, onOpenChat, jumpRef }) {
  // ── Navigation state ────────────────────────────────────────────────────────
  const [view, setView]         = useState('home');      // 'home' | 'chapters' | 'reading'
  const [chapBook, setChapBook] = useState(ALL_BOOKS[0]); // book shown in chapters view

  // ── Reading state ───────────────────────────────────────────────────────────
  const [bibleId, setBibleId] = useState(() => localStorage.getItem('rdr_bible') ?? '78a9f6124f344018-01');
  const [bookId,  setBookId]  = useState(() => localStorage.getItem('rdr_book')  ?? 'GEN');
  const [chNum,   setChNum]   = useState(() => parseInt(localStorage.getItem('rdr_ch') ?? '1'));
  const [verses,  setVerses]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [dark,    setDark]    = useState(() => localStorage.getItem('rdr_dark') === '1');
  const [chatDark, setChatDark] = useState(() => localStorage.getItem('rdr_chat_dark') === '1');
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [lastVerse,     setLastVerse]     = useState(null); // persists after deselect for quick actions
  const [chatOpen,      setChatOpen]      = useState(false);
  const [chatMsgs,      setChatMsgs]      = useState([]);
  const [chatInput,     setChatInput]     = useState('');
  const [chatBusy,     setChatBusy]     = useState(false);
  const [rdCopiedIdx,  setRdCopiedIdx]  = useState(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versePickerOpen, setVersePickerOpen] = useState(false);
  const [highlightVerse, setHighlightVerse] = useState(null);
  const [tileVersePickerFor, setTileVersePickerFor] = useState(null); // chapter number whose tile picker is open
  const [pendingVerseScroll, setPendingVerseScroll] = useState(null);
  const [completed, setCompleted] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('rdr_done') ?? '[]')); }
    catch { return new Set(); }
  });
  const [newBadge, setNewBadge] = useState(null); // badge just earned → show toast

  // ── AI usage gate ───────────────────────────────────────────────────────────
  const aiUsage = useAiUsage(session?.user?.id, profile?.plan ?? 'free');
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [booksOpen,  setBooksOpen]  = useState(false);
  const prevEarnedRef = useRef(null); // tracks which badges were earned before last markDone
  const [newBookDone, setNewBookDone] = useState(null); // book just fully completed
  const prevBookDoneRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(null); // { label, bookIds, chCount }
  const [winW, setWinW] = useState(() => window.innerWidth);

  const chatEndRef        = useRef(null);
  const chatInputRef      = useRef(null);
  const readAreaRef       = useRef(null);
  const chatScrollRef     = useRef(null);
  const chatUserScrolled  = useRef(false);
  const { listening: micListening, toggle: toggleMic, supported: micSupported } =
    useSpeechRecognition((t) => { setChatInput(t); chatInputRef.current?.focus(); });
  const ttsVoice = profile?.tts_voice ?? 'onyx';
  const { speakingId: rdSpeakingId, speak: rdSpeak, supported: rdTtsSupported } = useTextToSpeech({ voice: ttsVoice });
  const isDesktop    = winW >= 768;
  const C = dark ? DARK : LIGHT;
  const CC = chatDark ? DARK : LIGHT;
  const book  = ALL_BOOKS.find((b) => b.id === bookId) ?? ALL_BOOKS[0];
  const isDone = completed.has(`${bibleId}:${bookId}:${chNum}`);
  const hasHistory = localStorage.getItem('rdr_book') !== null;
  const earnedBadgeIds = useMemo(
    () => new Set(BADGES.filter((b) => b.check(completed, bibleId)).map((b) => b.id)),
    [completed, bibleId],
  );

  // Helpers
  // Single pass over completed → O(n) map instead of O(66n) per render
  const bookDoneMap = useMemo(() => {
    const map = {};
    for (const k of completed) {
      const colon1 = k.indexOf(':');
      const colon2 = k.indexOf(':', colon1 + 1);
      if (k.slice(0, colon1) === bibleId) {
        const bid = k.slice(colon1 + 1, colon2);
        map[bid] = (map[bid] ?? 0) + 1;
      }
    }
    return map;
  }, [completed, bibleId]);

  const bookDone  = (b) => bookDoneMap[b.id] ?? 0;
  const bookPct   = (b) => Math.round((bookDone(b) / b.ch) * 100);
  const totalDone = Object.values(bookDoneMap).reduce((s, v) => s + v, 0);

  function resetBooks(bookIds) {
    const newCompleted = new Set(
      [...completed].filter((k) => !bookIds.some((id) => k.startsWith(`${bibleId}:${id}:`)))
    );
    setCompleted(newCompleted);
    localStorage.setItem('rdr_done', JSON.stringify([...newCompleted]));
    // Nullify refs so toasts can re-fire when books are re-completed
    prevBookDoneRef.current = null;
    prevEarnedRef.current   = null;
  }

  useEffect(() => {
    const handler = () => setWinW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Tap the Read tab while already in Read → jump back to home
  useEffect(() => {
    if (homeKey > 0) setView('home');
  }, [homeKey]);

  // External deep-link: jump to a specific passage (e.g. from daily verse tap)
  // If a verse number is present, scroll to it and highlight it once the chapter loads.
  useEffect(() => {
    if (!jumpRef) return;
    const parsed = parseRef(jumpRef);
    if (!parsed) return;
    setBookId(parsed.bookId);
    setChNum(parsed.chapter);
    if (parsed.verse != null) setPendingVerseScroll(parsed.verse);
    setView('reading');
  }, [jumpRef]);

  useEffect(() => {
    if (view === 'reading') loadChapter();
    setVersePickerOpen(false);
    setHighlightVerse(null);
  }, [bibleId, bookId, chNum, view]);

  useEffect(() => {
    localStorage.setItem('rdr_bible', bibleId);
    localStorage.setItem('rdr_book',  bookId);
    localStorage.setItem('rdr_ch',    String(chNum));
    localStorage.setItem('rdr_dark',  dark ? '1' : '0');
    localStorage.setItem('rdr_chat_dark', chatDark ? '1' : '0');
  }, [bibleId, bookId, chNum, dark, chatDark]);

  // Load persisted chat + last verse whenever chapter changes; auto-open if history exists
  useEffect(() => {
    const chatKey  = `rdr_chat_${bibleId}:${bookId}:${chNum}`;
    const verseKey = `rdr_verse_${bibleId}:${bookId}:${chNum}`;
    try {
      const saved = JSON.parse(localStorage.getItem(chatKey) ?? '[]');
      setChatMsgs(saved);
      if (saved.length > 0) setChatOpen(true);
    } catch { setChatMsgs([]); }
    try { setLastVerse(JSON.parse(localStorage.getItem(verseKey) ?? 'null')); } catch { setLastVerse(null); }
  }, [bibleId, bookId, chNum]);

  // Save chat whenever messages change
  useEffect(() => {
    if (chatMsgs.length === 0) return;
    localStorage.setItem(`rdr_chat_${bibleId}:${bookId}:${chNum}`, JSON.stringify(chatMsgs));
  }, [chatMsgs]);

  // Save last verse whenever it changes
  useEffect(() => {
    if (!lastVerse) return;
    localStorage.setItem(`rdr_verse_${bibleId}:${bookId}:${chNum}`, JSON.stringify(lastVerse));
  }, [lastVerse]);

  useEffect(() => {
    if (!chatUserScrolled.current) {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMsgs]);

  function handleChatScroll() {
    const el = chatScrollRef.current;
    if (!el) return;
    chatUserScrolled.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
  }

  // ── Badge detection ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (prevEarnedRef.current === null) {
      prevEarnedRef.current = new Set(BADGES.filter((b) => b.check(completed, bibleId)).map((b) => b.id));
      return;
    }
    for (const badge of BADGES) {
      if (!prevEarnedRef.current.has(badge.id) && badge.check(completed, bibleId)) {
        prevEarnedRef.current = new Set([...prevEarnedRef.current, badge.id]);
        setNewBadge(badge);
        const t = setTimeout(() => setNewBadge(null), 4000);
        return () => clearTimeout(t);
      }
    }
  }, [completed, bibleId]);

  // ── Book completion detection ─────────────────────────────────────────────
  useEffect(() => {
    if (prevBookDoneRef.current === null) {
      prevBookDoneRef.current = new Set(ALL_BOOKS.filter((b) => bookDone(b) === b.ch).map((b) => b.id));
      return;
    }
    for (const b of ALL_BOOKS) {
      if (!prevBookDoneRef.current.has(b.id) && bookDone(b) === b.ch) {
        prevBookDoneRef.current = new Set([...prevBookDoneRef.current, b.id]);
        setNewBookDone(b);
        const t = setTimeout(() => setNewBookDone(null), 3600);
        return () => clearTimeout(t);
      }
    }
  }, [completed, bibleId]);

  // ── Reading logic ───────────────────────────────────────────────────────────
  async function loadChapter() {
    setLoading(true); setError(null); setSelectedVerse(null);
    readAreaRef.current?.scrollTo(0, 0);
    try {
      const data = await fetchChapter(bibleId, bookId, chNum);
      const parsed = parseVerses(data.content ?? '');
      setVerses(parsed);
      // pendingVerseScroll is consumed by the useEffect below, AFTER React
      // commits the new verses to the DOM — do not query the DOM here.
    } catch (e) {
      setError('Could not load this chapter. Try again.');
    }
    setLoading(false);
  }

  // Scroll to + highlight a specific verse AFTER the verses re-render.
  // useEffect runs post-commit so the data-verse spans are in the DOM.
  useEffect(() => {
    if (pendingVerseScroll == null || verses.length === 0) return;
    const target = pendingVerseScroll;
    setPendingVerseScroll(null);
    const el = readAreaRef.current?.querySelector(`[data-verse="${target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightVerse(target);
      setTimeout(() => setHighlightVerse((cur) => cur === target ? null : cur), 3000);
    }
  }, [verses, pendingVerseScroll]);

  function goChapter(n) {
    if (n < 1) {
      const idx = ALL_BOOKS.findIndex((b) => b.id === bookId);
      if (idx > 0) { setBookId(ALL_BOOKS[idx - 1].id); setChNum(ALL_BOOKS[idx - 1].ch); }
    } else if (n > book.ch) {
      const idx = ALL_BOOKS.findIndex((b) => b.id === bookId);
      if (idx < ALL_BOOKS.length - 1) { setBookId(ALL_BOOKS[idx + 1].id); setChNum(1); }
    } else {
      setChNum(n);
    }
  }

  function markDone() {
    const key = `${bibleId}:${bookId}:${chNum}`;
    if (completed.has(key)) { goChapter(chNum + 1); return; }
    const next = new Set([...completed, key]);
    setCompleted(next);
    localStorage.setItem('rdr_done', JSON.stringify([...next]));

    // Detect book completion synchronously — before goChapter() batches a bookId change.
    // bookDoneMap doesn't include `key` yet, so prevDone+1 = new total for this book.
    const prevDone = bookDoneMap[bookId] ?? 0;
    if (prevDone + 1 === book.ch && !prevBookDoneRef.current?.has(bookId)) {
      if (prevBookDoneRef.current) {
        prevBookDoneRef.current = new Set([...prevBookDoneRef.current, bookId]);
      }
      setNewBookDone(book);
      setTimeout(() => setNewBookDone(null), 3600);
    }

    goChapter(chNum + 1);
  }

  function openChapter(b, n, verseNum = null) {
    setBookId(b.id); setChNum(n);
    setPendingVerseScroll(verseNum);
    setView('reading');
  }

  function tapVerse(v) {
    const next = selectedVerse?.number === v.number ? null : v;
    setSelectedVerse(next);
    if (next) setLastVerse(next);
  }

  async function compareVersions(v) {
    const verseId = `${bookId}.${chNum}.${v.number}`;
    setChatOpen(true);
    setSelectedVerse(null);

    // Fetch the verse from all 4 versions in parallel
    const results = await Promise.all(
      VERSIONS.map(async (ver) => {
        try {
          const res  = await authedFetch(`/api/bible/${ver.id}/verses/${verseId}`);
          const json = await res.json();
          const text = (json.data?.content ?? '').trim();
          return { abbr: ver.abbr, text: text || null };
        } catch {
          return { abbr: ver.abbr, text: null };
        }
      })
    );

    const found   = results.filter((r) => r.text);
    const missing = results.filter((r) => !r.text);

    if (found.length === 0) {
      sendChat(`Could not retrieve any translations for ${book.name} ${chNum}:${v.number}. Please try again.`);
      return;
    }

    const lines = found.map((r) => `${r.abbr}: "${r.text}"`).join('\n');
    const note  = missing.length > 0 ? `\n\n(Note: ${missing.map(r => r.abbr).join(', ')} could not be retrieved.)` : '';
    const prompt = `Here is ${book.name} ${chNum}:${v.number} across translations:\n\n${lines}${note}\n\nWhat are the meaningful differences between these translations, and what do they reveal about the original text or intent?`;
    sendChat(prompt);
  }

  function sendQuickAction(action, verseOverride) {
    const v = verseOverride ?? selectedVerse ?? lastVerse;
    if (!v) return;
    if (action.compare) { compareVersions(v); return; }
    const prompt = action.prompt(v, book.name, chNum);
    setSelectedVerse(null); setChatOpen(true); sendChat(prompt);
  }

  const getSystemPrompt = useCallback(() => {
    const passage = verses.map((v) => `[${v.number}] ${v.text}`).join('\n');
    return `You are a Bible reading companion. The reader is in ${book.name} chapter ${chNum} (${VERSIONS.find((v) => v.id === bibleId)?.abbr ?? 'KJV'}).

Passage:
${passage}

Answer questions about this passage clearly and honestly. Offer plain-language explanations, historical context, cross-references, and original language insights when relevant. Keep answers readable on a phone screen — short paragraphs, no walls of text. Don't be preachy.`;
  }, [verses, book, chNum, bibleId]);

  async function sendChat(text) {
    const prompt = (text ?? chatInput).trim();
    if (!prompt || chatBusy) return;
    if (aiUsage.atLimit) return;
    chatUserScrolled.current = false;
    setChatInput('');
    const userMsg = { role: 'user', content: prompt };
    setChatMsgs((prev) => [...prev, userMsg]);
    setChatBusy(true);
    try {
      const res = await authedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: getSystemPrompt(), messages: [...chatMsgs, userMsg], personType: profile?.person_type ?? 'curious' }),
      });
      if (!res.ok || !res.body) throw new Error();
      setChatMsgs((prev) => [...prev, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split('\n\n'); buf = events.pop() ?? '';
        for (const raw of events) {
          const lines = raw.split('\n');
          const ev   = lines.find((l) => l.startsWith('event: '))?.slice(7).trim();
          const data = lines.find((l) => l.startsWith('data: '))?.slice(6);
          if (ev === 'text' && data) {
            try { setChatMsgs((prev) => { const a = [...prev]; a[a.length-1] = { ...a[a.length-1], content: a[a.length-1].content + JSON.parse(data).delta }; return a; }); }
            catch {}
          }
        }
      }
    } catch {}
    aiUsage.increment();
    setChatBusy(false);
  }

  // ── Version picker (shared across views) ────────────────────────────────────
  const VersionPicker = (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowVersions((v) => !v)}
        style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: C.verse, cursor: 'pointer', letterSpacing: 1 }}
      >
        {VERSIONS.find((v) => v.id === bibleId)?.abbr} ▾
      </button>
      {showVersions && (
        <div style={{ position: 'absolute', top: '110%', right: 'auto', left: 0, background: dark ? '#1A0E07' : T.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 50, minWidth: 210, maxWidth: 'calc(100vw - 24px)' }}>
          {VERSIONS.map((v) => (
            <button key={v.id} onClick={() => { setBibleId(v.id); setShowVersions(false); }} style={{
              width: '100%', textAlign: 'left', background: bibleId === v.id ? 'rgba(184,115,58,0.1)' : 'transparent',
              border: 'none', borderBottom: `1px solid ${C.border}`, padding: '11px 14px',
              cursor: 'pointer', color: C.text, fontSize: 13,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{v.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.verse, letterSpacing: 1 }}>{v.abbr}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const DarkToggle = (
    <button onClick={() => setDark((d) => !d)} style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 999, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: C.muted }}>
      {dark ? '☀' : '🌙'}
    </button>
  );

  const ChatDarkToggle = (
    <button onClick={() => setChatDark((d) => !d)} style={{ background: CC.inputBg, border: `1px solid ${CC.border}`, borderRadius: 999, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: CC.muted }}>
      {chatDark ? '☀' : '🌙'}
    </button>
  );

  // ── Badge toast (shown across all views) ────────────────────────────────────
  const BadgeToast = newBadge ? (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, display: 'flex', alignItems: 'center', gap: 14,
      background: T.ink, color: T.cream,
      borderRadius: 999, padding: '12px 20px',
      boxShadow: '0 8px 32px rgba(44,24,16,0.35)',
      border: `1.5px solid rgba(184,115,58,0.5)`,
      animation: 'badgeSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      whiteSpace: 'nowrap',
    }}>
      <BadgeArt id={newBadge.id} size={46} earned={true}/>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.goldLight, fontWeight: 700, marginBottom: 1 }}>Badge earned</div>
        <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{newBadge.name}</div>
        <div style={{ fontSize: 11, color: 'rgba(253,248,240,0.6)', marginTop: 1 }}>{newBadge.desc}</div>
      </div>
    </div>
  ) : null;

  // ── Book-complete celebration ────────────────────────────────────────────────
  const BookDoneToast = newBookDone ? (
    <>
      {/* Dimmed backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 600, pointerEvents: 'none',
        background: 'rgba(0,0,0,0.6)',
        animation: 'backdropFade 3.6s ease both',
      }}/>
      {/* Outer wrapper just handles centering — no animation here */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 601, pointerEvents: 'none',
      }}>
        {/* Card bounces in/out */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          background: 'rgba(10,6,3,0.97)',
          border: '1.5px solid rgba(184,115,58,0.55)',
          borderRadius: 32, padding: 'clamp(24px, 5vw, 44px) clamp(20px, 5vw, 56px) clamp(24px, 5vw, 36px)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.85), 0 0 80px rgba(184,115,58,0.1)',
          animation: 'bookCompleteIn 3.6s cubic-bezier(0.34,1.56,0.64,1) both',
          position: 'relative', overflow: 'visible',
        }}>
          {/* Expanding gold burst ring */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 140, height: 140, marginTop: -70, marginLeft: -70,
            borderRadius: '50%', border: '3px solid rgba(184,115,58,0.75)',
            animation: 'burstRing 0.75s 0.15s ease-out both',
            pointerEvents: 'none',
          }}/>
          {/* Second, slightly delayed ring */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 110, height: 110, marginTop: -55, marginLeft: -55,
            borderRadius: '50%', border: '2px solid rgba(184,115,58,0.45)',
            animation: 'burstRing 0.75s 0.32s ease-out both',
            pointerEvents: 'none',
          }}/>
          {/* Badge — double spin */}
          <div style={{ animation: 'bookBadgeSpin 0.9s cubic-bezier(0.34,1.56,0.64,1) both', zIndex: 1 }}>
            <BookBadge bookId={newBookDone.id} size={116} earned={true}/>
          </div>
          {/* Text slides in after badge lands */}
          <div style={{
            textAlign: 'center',
            animation: 'textSlideIn 0.38s 0.52s ease both',
            opacity: 0,
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', color: T.goldLight, fontWeight: 700, marginBottom: 8 }}>
              Book Complete
            </div>
            <div style={{ fontFamily: T.display, fontSize: 30, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {newBookDone.name}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.4)', marginTop: 8, letterSpacing: '0.03em' }}>
              {newBookDone.ch} {newBookDone.ch === 1 ? 'chapter' : 'chapters'} read
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null;

  // ── Reset confirmation sheet ─────────────────────────────────────────────────
  const ConfirmResetSheet = confirmReset ? (
    <div style={{
      position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
      zIndex: 610, background: T.ink, borderRadius: 22,
      padding: '18px 24px 16px', minWidth: 280, maxWidth: 340,
      border: '1.5px solid rgba(184,115,58,0.35)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
      animation: 'badgeSlideUp 0.25s ease both',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.cream, letterSpacing: '-0.012em', textAlign: 'center' }}>
        Reset {confirmReset.label}?
      </div>
      <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.5)', textAlign: 'center', lineHeight: 1.5 }}>
        This will unmark all {confirmReset.chCount} {confirmReset.chCount === 1 ? 'chapter' : 'chapters'} as read.{'\n'}
        You can earn the badge again by re-reading.
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
        <button
          onClick={() => { resetBooks(confirmReset.bookIds); setConfirmReset(null); }}
          style={{ background: T.error, color: T.cream, border: 'none', borderRadius: 999, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Reset
        </button>
        <button
          onClick={() => setConfirmReset(null)}
          style={{ background: 'rgba(255,255,255,0.1)', color: T.cream, border: 'none', borderRadius: 999, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  // ── HOME VIEW ────────────────────────────────────────────────────────────────
  if (view === 'home') return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: T.sans, paddingBottom: 'calc(62px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 'var(--global-header-h, 0px)', zIndex: 20, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ padding: '0 164px 0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: C.text, letterSpacing: '-0.012em' }}>Read</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {VersionPicker}
          {DarkToggle}
        </div>
        </div>
      </div>

      <div style={{ overflowY: 'auto', padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>

        {/* Continue reading card */}
        <div
          onClick={() => setView('reading')}
          style={{
            background: `linear-gradient(135deg, rgba(184,115,58,0.12) 0%, rgba(184,115,58,0.06) 100%)`,
            border: `1.5px solid rgba(184,115,58,0.3)`,
            borderRadius: 18, padding: '20px 22px', cursor: 'pointer',
            marginBottom: 28, transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 24px rgba(184,115,58,0.18)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.verse, fontWeight: 700, marginBottom: 10 }}>
            {hasHistory ? 'Continue Reading' : 'Start Reading'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 600, color: C.text, marginBottom: 4, letterSpacing: '-0.018em', lineHeight: 1.1 }}>
                {book.name}
              </div>
              <div style={{ fontSize: 14, color: C.muted }}>
                Chapter {chNum} · {VERSIONS.find((v) => v.id === bibleId)?.abbr}
              </div>
            </div>
            <div style={{
              background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: T.cream, borderRadius: 999, padding: '10px 20px',
              fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
              boxShadow: '0 2px 12px rgba(184,115,58,0.35)',
            }}>
              {hasHistory ? 'Continue →' : 'Begin →'}
            </div>
          </div>

          {/* Progress bar for current book */}
          {bookPct(book) > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 5 }}>
                <span>{book.name}</span>
                <span>{bookDone(book)}/{book.ch} chapters</span>
              </div>
              <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${bookPct(book)}%`, background: `linear-gradient(90deg, ${T.gold}, #c47020)`, borderRadius: 2, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* Overall progress */}
        {totalDone > 0 && (
          <div style={{ background: C.section, borderRadius: 14, padding: '16px 18px', marginBottom: 28, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: '-0.01em' }}>Overall progress</span>
              <span style={{ fontSize: 13, color: C.verse, fontWeight: 700 }}>{totalDone} / {TOTAL_CHAPTERS}</span>
            </div>
            <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(totalDone / TOTAL_CHAPTERS) * 100}%`, background: `linear-gradient(90deg, ${T.gold}, #c47020)`, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              {Math.round((totalDone / TOTAL_CHAPTERS) * 100)}% of the Bible read
            </div>
          </div>
        )}

        {/* ── Badges ── */}
        {(() => {
          const earnedMilestones = BADGES.filter((b) => earnedBadgeIds.has(b.id));
          const lockedMilestones = BADGES.filter((b) => !earnedBadgeIds.has(b.id));
          const earnedBooks      = ALL_BOOKS.filter((b) => bookDone(b) === b.ch);
          const lockedBooks      = ALL_BOOKS.filter((b) => bookDone(b) !== b.ch);
          const totalEarned      = earnedMilestones.length + earnedBooks.length;
          const totalBadges      = BADGES.length + ALL_BOOKS.length;
          return (
            <div style={{ marginBottom: 32 }}>
              {/* Section header */}
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.verse, fontWeight: 700, marginBottom: 18 }}>
                Badges · {totalEarned}/{totalBadges}
              </div>

              {/* ── Milestones ── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Milestones</span>
                  {lockedMilestones.length > 0 && (
                    <button onClick={() => setBadgesOpen((v) => !v)}
                      style={{ background: 'none', border: 'none', fontSize: 12, color: C.muted, cursor: 'pointer', padding: 0 }}>
                      {badgesOpen ? 'Hide locked' : `+${lockedMilestones.length} locked`}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.4 }}>
                  Special badges for reading milestones — like finishing 100 chapters or completing the Gospels.
                </div>

                {earnedMilestones.length === 0 ? (
                  <div style={{ background: C.section, borderRadius: 14, border: `1px solid ${C.border}`, padding: '18px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      <BadgeArt id="first_step" size={52} earned={false}/>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>Read your first chapter to earn your first milestone.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    {earnedMilestones.map((badge) => {
                      const resetBookIds = ACHIEVEMENT_RESET[badge.id];
                      const chCount = resetBookIds
                        ? resetBookIds.reduce((s, id) => s + (ALL_BOOKS.find((b) => b.id === id)?.ch ?? 0), 0)
                        : 0;
                      return (
                        <div key={badge.id} title={badge.desc}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 72, textAlign: 'center', flex: '0 0 auto',
                            animation: 'badgePop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                          <BadgeArt id={badge.id} size={64} earned={true}/>
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.goldDark, lineHeight: 1.3 }}>{badge.name}</span>
                          {resetBookIds && (
                            <button onClick={() => setConfirmReset({ label: badge.name, bookIds: resetBookIds, chCount })}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10, color: C.muted }}>
                              ↺ reset
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {badgesOpen && lockedMilestones.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 14 }}>
                    {lockedMilestones.map((badge) => (
                      <div key={badge.id} title={badge.desc}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 72, textAlign: 'center', flex: '0 0 auto' }}>
                        <BadgeArt id={badge.id} size={64} earned={false}/>
                        <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, lineHeight: 1.3 }}>{badge.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* divider */}
              <div style={{ height: 1, background: C.border, marginBottom: 24 }}/>

              {/* ── Book Seals ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Book Seals</span>
                  <button onClick={() => setBooksOpen((v) => !v)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: C.muted, cursor: 'pointer', padding: 0 }}>
                    {booksOpen ? 'Earned only' : `All ${ALL_BOOKS.length} books`}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.4 }}>
                  One seal per book of the Bible — earned by reading every chapter. {earnedBooks.length}/{ALL_BOOKS.length} collected.
                </div>

                {earnedBooks.length === 0 && !booksOpen ? (
                  <div style={{ background: C.section, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Finish every chapter in a book to collect its seal.</div>
                    <button onClick={() => setBooksOpen(true)}
                      style={{ marginTop: 10, background: 'none', border: `1px solid ${C.border}`, borderRadius: 999, padding: '5px 14px', fontSize: 11, color: C.muted, cursor: 'pointer' }}>
                      Preview all 66 seals
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {(booksOpen ? ALL_BOOKS : earnedBooks).map((b) => {
                      const bEarned = bookDone(b) === b.ch;
                      return (
                        <div key={b.id}
                          title={bEarned ? `${b.name} — complete · tap to reset` : `${b.name} — ${bookDone(b)}/${b.ch} chapters`}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            width: 62, textAlign: 'center', flex: '0 0 auto',
                            animation: bEarned ? 'badgePop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' : 'none' }}>
                          {bEarned ? (
                            <button onClick={() => setConfirmReset({ label: b.name, bookIds: [b.id], chCount: b.ch })}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}>
                              <BookBadge bookId={b.id} size={54} earned={true}/>
                            </button>
                          ) : (
                            <BookBadge bookId={b.id} size={54} earned={false}/>
                          )}
                          <span style={{ fontSize: 9, fontWeight: bEarned ? 700 : 600,
                            color: bEarned ? T.goldDark : C.muted, lineHeight: 1.3,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {b.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Book grids — organised by canonical section with illustrated headers */}
        {['Old Testament', 'New Testament'].map((testament) => {
          const isOT = testament === 'Old Testament';
          const sections = BIBLE_SECTIONS.filter((s) =>
            isOT ? !['gospels','acts','pauline','general','revelation'].includes(s.key)
                 : ['gospels','acts','pauline','general','revelation'].includes(s.key)
          );
          return (
            <div key={testament} style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.verse, fontWeight: 700, marginBottom: 20 }}>{testament}</div>
              {sections.map((section) => {
                const sectionBooks = ALL_BOOKS.filter((b) => section.bookIds.includes(b.id));
                const colors = BOOK_CAT_COLORS[section.key] ?? BOOK_CAT_COLORS.law;
                return (
                  <div key={section.key} style={{ marginBottom: 28 }}>
                    {/* Section banner */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: dark
                        ? `linear-gradient(135deg, ${colors.bg1}cc, ${colors.bg2}ee)`
                        : `linear-gradient(135deg, ${colors.bg1}33, ${colors.bg2}18)`,
                      border: `1px solid ${colors.rim}${dark ? '55' : '77'}`,
                      borderRadius: 12, padding: '12px 16px', marginBottom: 12,
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: `${colors.bg1}${dark ? 'cc' : '88'}`,
                        border: `1px solid ${colors.rim}${dark ? '66' : '99'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <SectionIcon sectionKey={section.key} size={30} color={dark ? undefined : 'rgba(255,255,255,0.93)'} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontFamily: T.display, fontSize: 15, fontWeight: 700,
                          color: dark ? 'rgba(255,240,200,0.95)' : colors.bg1,
                          letterSpacing: '-0.01em', marginBottom: 2,
                        }}>{section.label}</div>
                        <div style={{ fontSize: 11, color: dark ? `${colors.rim}cc` : colors.bg1, opacity: dark ? 1 : 0.65, lineHeight: 1.3 }}>
                          {section.desc}
                        </div>
                      </div>
                    </div>
                    {/* Books grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                      {sectionBooks.map((b) => {
                const pct      = bookPct(b);
                const done     = bookDone(b);
                const isCurrent = b.id === bookId;
                const bEarned  = done === b.ch;
                return (
                  <button
                    key={b.id}
                    onClick={() => { setChapBook(b); setView('chapters'); }}
                    style={{
                      background: isCurrent ? 'rgba(184,115,58,0.1)' : C.card,
                      border: `1.5px solid ${bEarned ? 'rgba(184,115,58,0.55)' : isCurrent ? 'rgba(184,115,58,0.4)' : C.cardBorder}`,
                      boxShadow: bEarned ? '0 0 14px rgba(184,115,58,0.18)' : 'none',
                      borderRadius: 14, padding: '12px 14px', paddingRight: 42,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(184,115,58,0.4)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(184,115,58,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = bEarned ? 'rgba(184,115,58,0.55)' : isCurrent ? 'rgba(184,115,58,0.4)' : C.cardBorder; e.currentTarget.style.boxShadow = bEarned ? '0 0 14px rgba(184,115,58,0.18)' : 'none'; }}
                  >
                    <button
                      key={bEarned ? `${b.id}-e` : `${b.id}-l`}
                      title={bEarned ? `Tap to reset ${b.name}` : `Complete ${b.name} to unlock`}
                      onClick={bEarned ? (e) => { e.stopPropagation(); setConfirmReset({ label: b.name, bookIds: [b.id], chCount: b.ch }); } : undefined}
                      style={{
                        position: 'absolute', top: 7, right: 7, lineHeight: 0,
                        background: 'none', border: 'none', padding: 0,
                        cursor: bEarned ? 'pointer' : 'default',
                        animation: bEarned ? 'badgePop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
                      }}
                    >
                      <BookBadge bookId={b.id} size={28} earned={bEarned}/>
                    </button>
                    <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '-0.01em', marginBottom: 4 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: pct > 0 ? 8 : 0 }}>
                      {pct === 100 ? '✓ Complete' : pct > 0 ? `${done} of ${b.ch} ch` : `${b.ch} chapters`}
                    </div>
                    {pct > 0 && (
                      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? T.gold : `linear-gradient(90deg, ${T.gold}, #c47020)`, borderRadius: 2 }} />
                      </div>
                    )}
                  </button>
                );
              })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {BadgeToast}
      {BookDoneToast}
      {ConfirmResetSheet}
    </div>
  );

  // ── CHAPTERS VIEW ────────────────────────────────────────────────────────────
  if (view === 'chapters') {
    const cb   = chapBook;
    const pct  = bookPct(cb);
    const done = bookDone(cb);
    const chapters = Array.from({ length: cb.ch }, (_, i) => i + 1);
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: T.sans, paddingBottom: 'calc(62px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 'var(--global-header-h, 0px)', zIndex: 20, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: '0 164px 0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: C.verse, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={15} strokeWidth={2} /> Books
          </button>
          <span style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: C.text, letterSpacing: '-0.012em' }}>{cb.name}</span>
          <div style={{ display: 'flex', gap: 8 }}>{DarkToggle}</div>
          </div>
        </div>

        <div style={{ padding: '20px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
          {/* Book progress */}
          <div style={{ background: C.section, borderRadius: 14, padding: '14px 16px', marginBottom: 24, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.muted }}>{done} of {cb.ch} chapters read</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {done > 0 && (
                  <button
                    onClick={() => setConfirmReset({ label: cb.name, bookIds: [cb.id], chCount: done })}
                    style={{ background: 'none', border: 'none', fontSize: 11, color: C.muted, cursor: 'pointer', padding: 0 }}
                  >
                    ↺ Reset
                  </button>
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: C.verse }}>{pct}%</span>
              </div>
            </div>
            <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.gold}, #c47020)`, borderRadius: 3 }} />
            </div>
          </div>

          {/* Chapter grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 8 }}>
            {chapters.map((n) => {
              const isRead    = completed.has(`${bibleId}:${cb.id}:${n}`);
              const isCurrent = cb.id === bookId && n === chNum;
              const vc        = verseCountFor(cb.id, n);
              return (
                <div
                  key={n}
                  onClick={() => openChapter(cb, n)}
                  role="button"
                  tabIndex={0}
                  style={{
                    height: 68, borderRadius: 12, border: `2px solid`, position: 'relative',
                    borderColor: isCurrent ? T.gold : isRead ? 'rgba(184,115,58,0.4)' : C.cardBorder,
                    background: isRead
                      ? `linear-gradient(135deg, rgba(184,115,58,0.18) 0%, rgba(184,115,58,0.08) 100%)`
                      : isCurrent ? 'rgba(184,115,58,0.08)' : C.card,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 3,
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!isRead && !isCurrent) { e.currentTarget.style.borderColor = 'rgba(184,115,58,0.5)'; e.currentTarget.style.background = 'rgba(184,115,58,0.06)'; } }}
                  onMouseLeave={(e) => { if (!isRead && !isCurrent) { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.background = C.card; } }}
                >
                  <span style={{ fontSize: 16, color: isRead || isCurrent ? C.verse : C.text, fontWeight: 700, lineHeight: 1 }}>
                    {isRead ? `✓ ${n}` : n}
                  </span>
                  <span style={{ fontSize: 10, color: C.muted, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {vc ? `${n}:1–${n}:${vc}` : ''}
                  </span>
                  {/* Verse picker — small explicit button in top-right corner, well away from the main tap area */}
                  {vc && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setTileVersePickerFor({ ch: n, vc }); }}
                      title="Jump to a verse"
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 20, height: 20,
                        background: 'transparent', border: `1px solid ${C.border}`,
                        borderRadius: 4, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: C.muted, lineHeight: 1,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >≡</button>
                  )}
                </div>
              );
            })}
          </div>

          {tileVersePickerFor && (
            <div
              onClick={() => setTileVersePickerFor(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="modal-sheet"
                style={{
                  background: C.card, color: C.text, borderRadius: 16, border: `1px solid ${C.border}`,
                  maxWidth: 460, width: '100%', maxHeight: '80vh', overflowY: 'auto',
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: C.text }}>
                    {cb.name} {tileVersePickerFor.ch} · pick a verse
                  </div>
                  <button onClick={() => setTileVersePickerFor(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}><X size={16} strokeWidth={2} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))', gap: 6 }}>
                  {Array.from({ length: tileVersePickerFor.vc }, (_, i) => i + 1).map((vn) => (
                    <button
                      key={vn}
                      onClick={() => {
                        const ch = tileVersePickerFor.ch;
                        setTileVersePickerFor(null);
                        openChapter(cb, ch, vn);
                      }}
                      style={{
                        background: 'transparent', border: `1px solid ${C.cardBorder}`,
                        borderRadius: 8, padding: '7px 4px', fontSize: 12, fontWeight: 600,
                        color: C.text, cursor: 'pointer',
                      }}
                    >
                      {tileVersePickerFor.ch}:{vn}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {BadgeToast}
        {BookDoneToast}
        {ConfirmResetSheet}
      </div>
    );
  }

  // ── READING VIEW ─────────────────────────────────────────────────────────────

  // Chat panel (shared between mobile sheet and desktop side)
  const ChatPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: chatDark ? '#130B05' : '#FDFAF4', borderLeft: chatDark ? 'none' : '3px solid rgba(184,115,58,0.45)' }}>

      {/* Header */}
      <div style={{ padding: '10px 14px 10px 16px', borderBottom: `1px solid ${chatDark ? CC.border : 'rgba(184,115,58,0.22)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: chatDark ? '#1A1108' : '#F5E9CA' }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: chatDark ? CC.muted : 'rgba(154,99,40,0.7)', fontWeight: 700, marginBottom: 2 }}>Commentary</div>
          <span style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: chatDark ? CC.text : '#3D2510', letterSpacing: '-0.01em' }}>
            {book.name} {chNum}
            <span style={{ fontWeight: 400, color: chatDark ? CC.muted : 'rgba(101,64,24,0.7)', marginLeft: 7, fontSize: 12 }}>
              {VERSIONS.find((v) => v.id === bibleId)?.abbr}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {ChatDarkToggle}
          <button onClick={() => setChatOpen(false)} style={{ background: 'rgba(101,64,24,0.1)', border: 'none', color: chatDark ? CC.muted : '#8E5528', cursor: 'pointer', padding: '5px 8px', borderRadius: 8, display: 'flex', alignItems: 'center' }}><X size={15} strokeWidth={2} /></button>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatScrollRef} onScroll={handleChatScroll} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
        {chatMsgs.map((m, i) => {
          const isAssistant = m.role === 'assistant';
          const isStreaming  = isAssistant && chatBusy && i === chatMsgs.length - 1;
          const showActions  = isAssistant && !isStreaming && m.content && lastVerse;
          return (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: isAssistant ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth: '88%',
                  background: isAssistant
                    ? (chatDark ? CC.section : '#F5EDD8')
                    : (chatDark ? T.gold : '#8B5A1A'),
                  color: isAssistant ? CC.text : T.cream,
                  border: isAssistant ? `1px solid ${chatDark ? CC.border : 'rgba(184,115,58,0.28)'}` : 'none',
                  borderRadius: isAssistant ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                  padding: '10px 14px', fontSize: 14, fontFamily: T.serif, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                }}>
                  {m.content || (isStreaming ? '…' : '')}
                </div>
              </div>

              {/* Action row for assistant messages */}
              {isAssistant && !isStreaming && m.content ? (
                <div style={{ paddingLeft: 2, marginTop: 5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(m.content);
                        setRdCopiedIdx(i);
                        setTimeout(() => setRdCopiedIdx(null), 2000);
                      } catch {}
                    }}
                    title="Copy response"
                    style={{
                      background: 'transparent', border: 'none', padding: '2px 6px',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                      color: rdCopiedIdx === i ? CC.verse : CC.muted, fontSize: 11,
                      transition: 'color 0.2s',
                    }}
                  >
                    {rdCopiedIdx === i ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                    {rdCopiedIdx === i ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => rdSpeak(i, m.content)}
                    title={rdSpeakingId === i ? 'Stop' : 'Listen'}
                    style={{
                      background: 'transparent', border: 'none', padding: '2px 6px',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                      color: rdSpeakingId === i ? CC.verse : CC.muted, fontSize: 11,
                      transition: 'color 0.15s',
                    }}
                  >
                    {rdSpeakingId === i ? (
                      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
                        {[1, 0.5, 0.8, 0.4].map((h, k) => (
                          <span key={k} style={{ width: 2.5, borderRadius: 2, background: CC.verse, height: `${h * 100}%`, animation: `micPulse 0.8s ease-in-out ${k * 0.15}s infinite alternate` }} />
                        ))}
                      </span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    )}
                    {rdSpeakingId === i ? 'Stop' : 'Listen'}
                  </button>
                </div>
              ) : null}

              {/* Quick-action row under each assistant response */}
              {showActions && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7, paddingLeft: 2 }}>
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => sendQuickAction(a, lastVerse)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${CC.border}`,
                        borderRadius: 999,
                        padding: '3px 10px',
                        fontSize: 11, fontWeight: 500,
                        color: CC.muted, cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = CC.verse;
                        e.currentTarget.style.color = CC.verse;
                        e.currentTarget.style.background = 'rgba(184,115,58,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = CC.border;
                        e.currentTarget.style.color = CC.muted;
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input or limit wall */}
      {aiUsage.atLimit ? (
        <AiLimitWall plan={profile?.plan ?? 'free'} panelMode />
      ) : (
        <div style={{ flexShrink: 0 }}>
          <AiUsageWarning remaining={aiUsage.remaining} />
          <div style={{ padding: '10px 12px 14px', borderTop: `1px solid ${chatDark ? CC.border : 'rgba(184,115,58,0.2)'}`, background: chatDark ? 'transparent' : '#FAF3E4' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: chatDark ? CC.inputBg : '#FDF8EE', borderRadius: 999, border: `1px solid ${chatDark ? CC.border : 'rgba(184,115,58,0.3)'}`, padding: '6px 6px 6px 14px' }}>
              <input
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } }}
                placeholder={micListening ? 'Listening…' : 'Ask about this passage…'}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontFamily: T.serif, color: CC.text, outline: 'none' }}
              />
              {micSupported && (
                <button
                  onClick={() => toggleMic(chatInput)}
                  title={micListening ? 'Stop listening' : 'Speak your question'}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', border: 'none', flexShrink: 0,
                    background: micListening ? 'rgba(220,38,38,0.12)' : 'transparent',
                    color: micListening ? '#dc2626' : CC.muted,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    animation: micListening ? 'micPulse 1.2s ease-in-out infinite' : 'none',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                    <path d="M19 10a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V22h2v-3.06A9 9 0 0 0 21 10z"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => sendChat()}
                disabled={!chatInput.trim() || chatBusy}
                style={{
                  width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: chatInput.trim() && !chatBusy ? `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)` : CC.border,
                  color: T.cream, fontSize: 15, cursor: chatInput.trim() && !chatBusy ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
              >→</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 62px)', background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Bible sub-header — sits directly below the global app header */}
      <div style={{
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        padding: '0 14px',
        height: isDesktop ? 52 : 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, zIndex: 20,
      }}>
        {/* Back to chapters */}
        <button
          onClick={() => { setChapBook(book); setView('chapters'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: C.verse, fontSize: 13, fontWeight: 600, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
        >
          <ArrowLeft size={15} strokeWidth={2} /> {book.name}
        </button>

        {/* Center: book + chapter (desktop keeps chapter nav; mobile just shows title) */}
        {isDesktop ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => goChapter(chNum - 1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 999, width: 30, height: 30, cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} strokeWidth={2} /></button>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, minWidth: 28, textAlign: 'center' }}>{chNum}</span>
            <button onClick={() => goChapter(chNum + 1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 999, width: 30, height: 30, cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} strokeWidth={2} /></button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
              Chapter {chNum}
            </div>
            <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted, fontWeight: 600, lineHeight: 1, marginTop: 1 }}>
              {VERSIONS.find((v) => v.id === bibleId)?.abbr}
            </div>
          </div>
        )}

        {/* Right controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isDesktop && (
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, marginRight: 2 }}>
              {VERSIONS.find((v) => v.id === bibleId)?.abbr}
            </span>
          )}
          {DarkToggle}
          <button
            onClick={() => { setChatOpen((o) => !o); if (!chatOpen) setTimeout(() => chatInputRef.current?.focus(), 300); }}
            style={{
              width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
              background: chatOpen ? `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)` : C.inputBg,
              border: `1px solid ${chatOpen ? 'transparent' : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, color: chatOpen ? T.cream : C.verse,
              boxShadow: chatOpen ? '0 2px 10px rgba(184,115,58,0.4)' : 'none',
              transition: 'all 0.18s',
              WebkitTapHighlightColor: 'transparent',
            }}
            title={chatOpen ? 'Close commentary' : 'Ask about this chapter'}
          >✦</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Reading area */}
        <div ref={readAreaRef} style={{ flex: 1, overflowY: 'auto', padding: isDesktop ? '32px 40px 120px' : '24px 20px 200px' }}>
          <div style={{ maxWidth: '65ch', margin: '0 auto' }}>
            <div style={{ fontFamily: T.serif, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: C.verse, fontWeight: 600, marginBottom: 24 }}>
              {book.name} · Chapter {chNum}
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted, fontFamily: T.serif, fontSize: 16 }}>Loading…</div>
            )}
            {error && (
              <div style={{ background: 'rgba(184,115,58,0.08)', border: `1px solid rgba(184,115,58,0.3)`, borderRadius: 12, padding: '16px 18px', color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
                {error}
              </div>
            )}

            {!loading && !error && verses.length > 0 && (
              <>
                <div style={{ marginBottom: 16, position: 'relative' }}>
                  <button
                    onClick={() => setVersePickerOpen((v) => !v)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: versePickerOpen ? 'rgba(184,115,58,0.12)' : C.section,
                      border: `1px solid ${versePickerOpen ? T.gold : C.border}`,
                      borderRadius: 999, padding: '6px 14px', fontSize: 12.5, fontWeight: 600,
                      color: C.verse, cursor: 'pointer',
                    }}
                  >
                    Go to verse <span style={{ fontSize: 10 }}>{versePickerOpen ? '▴' : '▾'}</span>
                  </button>
                  {versePickerOpen && (
                    <div style={{
                      marginTop: 8, padding: 10, borderRadius: 12,
                      background: C.card, border: `1px solid ${C.border}`,
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 6,
                    }}>
                      {verses.map((v) => (
                        <button
                          key={v.number}
                          onClick={() => {
                            setVersePickerOpen(false);
                            const el = readAreaRef.current?.querySelector(`[data-verse="${v.number}"]`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              setHighlightVerse(v.number);
                              setTimeout(() => setHighlightVerse((cur) => cur === v.number ? null : cur), 1800);
                            }
                          }}
                          style={{
                            background: 'transparent', border: `1px solid ${C.cardBorder}`,
                            borderRadius: 8, padding: '6px 0', fontSize: 13, fontWeight: 600,
                            color: C.text, cursor: 'pointer',
                          }}
                        >
                          {v.number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              <Tip
                tipId="bible_verse_tap"
                icon="👆"
                text="Tap any verse to get AI explanations, historical context, cross-references, and original language insights."
                style={{ marginBottom: 20 }}
              />

              <div style={{ fontFamily: T.serif, fontSize: 18, lineHeight: 1.9, color: C.text }}>
                {verses.map((v) => {
                  const sel = selectedVerse?.number === v.number;
                  const hl  = highlightVerse === v.number;
                  return (
                    <span key={v.number}>
                      <span
                        data-verse={v.number}
                        onClick={() => tapVerse(v)}
                        style={{
                          background: sel ? 'rgba(184,115,58,0.15)' : hl ? 'rgba(184,115,58,0.28)' : 'transparent',
                          borderRadius: 4, cursor: 'pointer',
                          padding: (sel || hl) ? '2px 4px' : '2px 0',
                          transition: 'background 0.4s', display: 'inline',
                        }}
                      >
                        <sup style={{ fontSize: 10, fontWeight: 700, color: C.verse, marginRight: 3, verticalAlign: 'super', lineHeight: 1 }}>{v.number}</sup>
                        {v.text}
                      </span>
                      {' '}
                      {sel && (
                        <span style={{ display: 'inline-block', verticalAlign: 'top' }}>
                          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', background: dark ? '#1A0E07' : T.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '8px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', margin: '4px 0 4px 4px' }}>
                            {QUICK_ACTIONS.map((a) => (
                              <button key={a.id} onClick={() => sendQuickAction(a)} style={{ background: 'rgba(184,115,58,0.1)', border: `1px solid rgba(184,115,58,0.25)`, borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: C.verse, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {a.label}
                              </button>
                            ))}
                          </span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
              </>
            )}

            {!loading && !error && verses.length > 0 && (
              <div style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
                {isDone ? (
                  <div style={{ color: C.verse, fontFamily: T.serif, fontSize: 16 }}>✓ Chapter read — well done</div>
                ) : (
                  <button onClick={markDone} style={{ background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`, color: T.cream, border: 'none', borderRadius: 999, padding: '14px 36px', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(184,115,58,0.35)' }}>
                    Mark read → next chapter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop side chat */}
        {isDesktop && chatOpen && (
          <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {ChatPanel}
          </div>
        )}
      </div>

      {/* Mobile bottom sheet chat */}
      {!isDesktop && chatOpen && (
        <div onClick={() => setChatOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 110 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 62, left: 0, right: 0, height: '65vh', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
            {ChatPanel}
          </div>
        </div>
      )}

      {/* Mobile bottom chapter nav — sits above the main bottom nav */}
      {!isDesktop && (() => {
        const idx = ALL_BOOKS.findIndex((b) => b.id === bookId);
        const hasPrev = chNum > 1 || idx > 0;
        const hasNext = chNum < book.ch || idx < ALL_BOOKS.length - 1;
        const prevLabel = chNum > 1
          ? `Ch ${chNum - 1}`
          : idx > 0 ? ALL_BOOKS[idx - 1].name : '';
        const nextLabel = chNum < book.ch
          ? `Ch ${chNum + 1}`
          : idx < ALL_BOOKS.length - 1 ? ALL_BOOKS[idx + 1].name : '';
        return (
          <div style={{
            position: 'fixed',
            bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))',
            left: 0, right: 0,
            height: 58,
            zIndex: 50,
            display: 'flex',
            alignItems: 'stretch',
            background: dark ? '#1A0E07' : '#F5EDD8',
            borderTop: `1px solid ${C.border}`,
          }}>
            <button
              onClick={() => { if (hasPrev) goChapter(chNum - 1); }}
              disabled={!hasPrev}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'none', border: 'none', cursor: hasPrev ? 'pointer' : 'default',
                color: hasPrev ? C.verse : C.muted, fontSize: 13, fontWeight: 600,
                borderRight: `1px solid ${C.border}`,
                opacity: hasPrev ? 1 : 0.35,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
              <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prevLabel}</span>
            </button>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '0 16px', flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.muted, fontWeight: 700, lineHeight: 1 }}>Chapter</span>
              <span style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{chNum} <span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>/ {book.ch}</span></span>
            </div>

            <button
              onClick={() => { if (hasNext) markDone(); }}
              disabled={!hasNext}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'none', border: 'none', cursor: hasNext ? 'pointer' : 'default',
                color: hasNext ? C.verse : C.muted, fontSize: 13, fontWeight: 600,
                borderLeft: `1px solid ${C.border}`,
                opacity: hasNext ? 1 : 0.35,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextLabel}</span>
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        );
      })()}

      {BadgeToast}
      {BookDoneToast}
      {ConfirmResetSheet}
    </div>
  );
}
