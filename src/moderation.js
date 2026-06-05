// ── Content moderation utilities ──────────────────────────────────────────────
// Text:  profanity filter — cleanText() replaces matches with ####
//        containsProfanity() for name/title checks where rejection is better
// Image: moderateImage() calls /api/moderate-image (Claude Haiku vision)
//
// Word list is intentionally short to minimise false positives on a Bible
// platform where theological terms (hell, damn, ass/donkey, whore/Revelation,
// bastard/Deuteronomy) appear naturally in scripture quotation and discussion.

const PROFANITY = [
  // ── Strong profanity ──
  'fuck', 'fucking', 'fucker', 'fuckers', 'fucked', 'fucks',
  'motherfucker', 'motherfucking',
  'shit', 'shitting', 'shitty', 'bullshit',
  'cunt', 'cunts',
  'twat', 'twats',
  'bitch', 'bitches',
  'asshole', 'arshole', 'arsehole',
  // ── Slurs — zero tolerance ──
  'nigger', 'niggers', 'nigga', 'niggas',
  'faggot', 'faggots',
  'retard', 'retards', 'retarded',
  'spic', 'spics',
  'kike', 'kikes',
  'chink', 'chinks',
];

const PROFANITY_RE = new RegExp(
  `\\b(${PROFANITY.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi',
);

/**
 * Replace any flagged words with #### (matched length, so 7 chars → #######).
 * All other content is untouched.
 */
export function cleanText(str) {
  if (!str || typeof str !== 'string') return str;
  PROFANITY_RE.lastIndex = 0;
  return str.replace(PROFANITY_RE, (m) => '#'.repeat(m.length));
}

/**
 * Returns true if the string contains any flagged words.
 * Use this for display names / titles where cleaning would look wrong —
 * show an error instead.
 */
export function containsProfanity(str) {
  if (!str || typeof str !== 'string') return false;
  PROFANITY_RE.lastIndex = 0;
  return PROFANITY_RE.test(str);
}

// ── Image moderation ──────────────────────────────────────────────────────────
/**
 * Send a base64 data-URL to /api/moderate-image (Claude Haiku vision check).
 * Returns true = approved, false = rejected.
 *
 * Fails OPEN — returns true on any network/API error so a slow connection
 * never blocks a legitimate upload. The server logs rejections for review.
 */
export async function moderateImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return true;
  try {
    const res = await fetch('/api/moderate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: dataUrl }),
    });
    if (!res.ok) return true; // fail open
    const json = await res.json();
    // Explicit false = rejected; missing/null/true = approved
    return json.approved !== false;
  } catch {
    return true; // fail open on network error
  }
}
