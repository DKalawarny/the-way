import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyPostProblem } from '../src/dailyPostRules.js';

// Real posts from the feed, 28 Sep to 9 Oct 2026, the run that prompted the
// rewrite. Each ends on "good is coming toward you" in some form.
const WORN = [
  'Small steps still count as going somewhere. Something good is making its way to you, slow and sure, and you are not the one holding it all together.',
  'Trust the slow work. What is meant for you is still finding its way, and it has not given up on the route.',
  'The hard stretch you are in right now does not get the last word. Good is still on the move, and it has not once lost sight of you.',
  'Things are shifting in your favor, slowly, and you will not have to make them happen alone.',
  'Breathe out. Good is still leaning toward you, and it never needed you to earn it.',
  'Let that settle in. Quiet good is still at work for you, even on the days you feel forgotten.',
  'What is this stirring in you today?',
  'Search me, God. What do you make of that?',
  'Peace be with you — said to men who had run.',
];
// Must pass: specific, God named, or plain questions. Includes hyphenated words.
const FINE = [
  'Jesus said this to the friends who had just abandoned him. The first word he gives them is peace, not a lecture.',
  'Who is one person you could sit with this week, without trying to fix anything?',
  'The Hebrew word here is hesed, a love that keeps its promises long after it would be easier not to.',
  'Paul wrote this from prison to a church that was worried about him. He spends the letter worrying about them.',
  'A well-known verse, and a two-sided one: it asks something of you before it promises anything.',
  'Is there someone in your life who has been carrying something heavy on their own?',
];

test('catches every worn-out ending from the feed', () => {
  for (const t of WORN) assert.ok(dailyPostProblem(t), `should flag: ${t}`);
});

test('lets specific, verse-led writing through', () => {
  for (const t of FINE) assert.equal(dailyPostProblem(t), null, `should pass: ${t}`);
});
