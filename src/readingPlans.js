// ── Curated reading plans ─────────────────────────────────────────────────────
// Static, hand-picked plans that ride the existing chapter-completion system
// (progress = how many of the plan's chapters are in the reader's completed
// set, so chapters read outside the plan still count). Day = one chapter.

function range(b, from, to) {
  const out = [];
  for (let c = from; c <= to; c++) out.push({ b, c });
  return out;
}

export const READING_PLANS = [
  {
    id: 'meet-jesus',
    emoji: '🕊',
    title: 'Meet Jesus',
    tagline: 'The Gospel of John in 21 days — the closest look at Jesus there is. Come and see for yourself.',
    days: range('JHN', 1, 21),
  },
  {
    id: 'red-letters',
    emoji: '📕',
    title: 'The Red Letters',
    tagline: 'Eighteen chapters where Jesus does the talking — his words shown in red, the way the old red-letter Bibles printed them. Read them, or have them read to you.',
    days: [
      { b: 'MAT', c: 5,  t: 'The Sermon on the Mount begins' },
      { b: 'MAT', c: 6,  t: 'The Lord\u2019s Prayer, and do not worry' },
      { b: 'MAT', c: 7,  t: 'Ask, seek, knock' },
      { b: 'MAT', c: 13, t: 'The kingdom parables' },
      { b: 'MRK', c: 4,  t: 'The sower and the storm' },
      { b: 'LUK', c: 6,  t: 'The sermon on the plain' },
      { b: 'LUK', c: 10, t: 'The good Samaritan' },
      { b: 'LUK', c: 12, t: 'Do not be anxious' },
      { b: 'LUK', c: 15, t: 'The lost sheep, the lost coin, the lost son' },
      { b: 'JHN', c: 6,  t: 'The bread of life' },
      { b: 'JHN', c: 10, t: 'The good shepherd' },
      { b: 'JHN', c: 13, t: 'The upper room \u2014 a new commandment' },
      { b: 'JHN', c: 14, t: 'The way, the truth, and the life' },
      { b: 'JHN', c: 15, t: 'The vine and the branches' },
      { b: 'JHN', c: 16, t: 'Sorrow will turn to joy' },
      { b: 'JHN', c: 17, t: 'His prayer for you' },
      { b: 'MAT', c: 25, t: 'The sheep and the goats' },
      { b: 'MAT', c: 28, t: 'The great commission' },
    ],
  },
  {
    id: 'psalms-anxious',
    emoji: '🌿',
    title: 'Psalms for Anxious Seasons',
    tagline: 'Fourteen psalms for when the ground feels unsteady — honest prayers from people who felt it too.',
    days: [23, 27, 34, 42, 46, 55, 61, 62, 91, 94, 116, 121, 131, 139].map((c) => ({ b: 'PSA', c })),
  },
  {
    id: 'the-story-begins',
    emoji: '🌅',
    title: 'The Story Begins',
    tagline: 'Eighteen chapters through Genesis — how it all starts: creation, the flood, and one family whose story shapes everything after.',
    days: [...range('GEN', 1, 3), ...range('GEN', 6, 9), { b: 'GEN', c: 12 }, { b: 'GEN', c: 15 }, { b: 'GEN', c: 22 }, { b: 'GEN', c: 37 }, ...range('GEN', 39, 45), { b: 'GEN', c: 50 }].slice(0, 18),
  },
  {
    id: 'church-is-born',
    emoji: '🔥',
    title: 'The Church Is Born',
    tagline: 'Acts 1–12 — Pentecost, the first believers, and a movement nothing could stop.',
    days: range('ACT', 1, 12),
  },
];

// Progress helpers — completedSet holds `BOOK:CH` keys.
export function planProgress(plan, completedSet) {
  const done = plan.days.filter((d) => completedSet.has(`${d.b}:${d.c}`)).length;
  return { done, total: plan.days.length, pct: Math.round((done / plan.days.length) * 100) };
}

export function planNextDay(plan, completedSet) {
  return plan.days.find((d) => !completedSet.has(`${d.b}:${d.c}`)) ?? null;
}
