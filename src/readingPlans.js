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
    tagline: 'The Gospel of John in 21 days — the clearest portrait of who Jesus is, written so you can believe.',
    days: range('JHN', 1, 21),
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
    tagline: 'Eighteen chapters through Genesis — creation, the fall, the flood, and the family God chose to bless the world through.',
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
