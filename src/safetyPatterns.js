// Crisis detection, shared between the client surfaces and the server.
//
// These same patterns already lived inline in CareConversation.jsx and
// TalkToSomeone.jsx. The server needs them too, because of where the safety
// rules actually live: the crisis guidance (988, Samaritans, abuse, minors) is
// part of the system prompt, so it only exists if the model runs. The AI quota
// check returns *before* the model call — which meant a free user typing "I
// don't want to be alive" as their sixth message of the week met a billing wall
// instead of a crisis line (Daniel, 8/24: "make sure no one is cut off if they
// need real help").
//
// Deliberately narrow. This gates a quota bypass, so a false positive costs one
// answer and a false negative costs the thing that matters.
export const CRISIS_PATTERNS = [
  /\b(suicide|kill myself|end my life|don'?t want to (be alive|live)|wanna die|want to die|self[\s-]?harm|cutting myself|hurt myself)\b/i,
  /\b(being (abused|hit|beaten)|he hits|she hits|hits me|raped|sexual(ly)? assault|molest)\b/i,
  /\b(starving myself|throwing up after|purging)\b/i,
  /\b(hurt (someone|them|him|her|people)|kill (someone|them|him|her|people)|harm (someone|them|him|her|people)|going to (shoot|stab|attack))\b/i,
];

export function isCrisisMessage(text) {
  return !!text && CRISIS_PATTERNS.some((p) => p.test(text));
}
