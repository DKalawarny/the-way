export const JOURNEYS = [
  {
    id: 'seeker',
    emoji: '🕯️',
    title: "The Seeker's Path",
    description: "Five honest conversations for someone searching for something real.",
    personType: 'seeking',
    steps: [
      {
        title: 'Who is Jesus, really?',
        subtitle: 'Not the stained-glass version — the actual person.',
        prompt: "Who is Jesus — historically, actually? I want to understand who he was before I decide what I think about him.",
      },
      {
        title: 'If God is good, why is there so much suffering?',
        subtitle: 'The question that stops most people.',
        prompt: "If God exists and is good, why is there so much suffering in the world? This is the thing I can't get past.",
      },
      {
        title: 'Did the resurrection actually happen?',
        subtitle: 'The claim everything else rests on.',
        prompt: "What is the actual evidence for the resurrection? I want to know what historians say, not just what believers say.",
      },
      {
        title: 'What does faith actually ask of me?',
        subtitle: "What changes, and what doesn't.",
        prompt: "If I were to become a Christian, what would that actually mean for my life? What would have to change?",
      },
      {
        title: 'What would a next step look like?',
        subtitle: 'Not a commitment — just a direction.',
        prompt: "I've been thinking about all of this seriously. What would an honest next step look like for someone where I am?",
      },
    ],
  },
  {
    id: 'curious',
    emoji: '🌱',
    title: "The Curious Path",
    description: "Five conversations for someone who wants to understand what the Bible actually is.",
    personType: 'curious',
    steps: [
      {
        title: 'What is the Bible, actually?',
        subtitle: 'How it came together and what it claims to be.',
        prompt: "What is the Bible — how did it come together, who wrote it, and what does it actually claim to be?",
      },
      {
        title: 'The story arc',
        subtitle: 'The thread that runs through all of it.',
        prompt: "What is the overarching story of the Bible? If you had to explain the whole thing as one narrative, what is it?",
      },
      {
        title: 'The figures everyone references',
        subtitle: 'Abraham, Moses, David, Paul — who were they?',
        prompt: "Who are the key figures in the Bible and why do they matter? Give me the real picture, not the Sunday school version.",
      },
      {
        title: 'The passages people argue about',
        subtitle: 'What the hard texts actually say in context.',
        prompt: "What are the passages people most argue about — the ones used to justify things that seem wrong today? What do they actually say in context?",
      },
      {
        title: 'Why does this still matter?',
        subtitle: 'What serious people see in it.',
        prompt: "Why do serious, intelligent people still take the Bible seriously in the 21st century? What is it that keeps drawing people back to it?",
      },
    ],
  },
  {
    id: 'skeptic',
    emoji: '🤔',
    title: "The Skeptic's Path",
    description: "Five conversations that take your doubts seriously and don't dodge the hard stuff.",
    personType: 'skeptic',
    steps: [
      {
        title: 'What historians actually say',
        subtitle: 'Separating faith claims from historical evidence.',
        prompt: "What do secular historians — not believers — actually say about the historical reliability of the Bible and the existence of Jesus?",
      },
      {
        title: 'The manuscript question',
        subtitle: 'How do we know what the original texts said?',
        prompt: "How reliable are the biblical manuscripts? How does textual criticism work and what has it actually found?",
      },
      {
        title: 'The moral objections',
        subtitle: 'Genocide, slavery, women — the real problems.',
        prompt: "How do I deal with the parts of the Bible that seem morally wrong — the genocide passages, slavery, the treatment of women? I can't just ignore them.",
      },
      {
        title: 'The strongest case for',
        subtitle: "Steelmanning what you're skeptical of.",
        prompt: "I want to steelman the case for Christianity. What is the strongest intellectual argument for it — not the emotional one, the actual argument?",
      },
      {
        title: 'What to do with uncertainty',
        subtitle: 'Living honestly between faith and doubt.',
        prompt: "What do you do when you've examined everything honestly and you still don't know? How do serious people live with that uncertainty?",
      },
    ],
  },
  {
    id: 'new-faith',
    emoji: '✨',
    title: "The New Believer's Path",
    description: "Five conversations for someone early in the journey who wants to understand, not just believe.",
    personType: 'new-faith',
    steps: [
      {
        title: 'What is the gospel, really?',
        subtitle: 'In plain language, without the jargon.',
        prompt: "What is the gospel — not the Sunday school version, but what it actually means and why it matters?",
      },
      {
        title: 'How to read the Bible',
        subtitle: 'Without getting lost or overwhelmed.',
        prompt: "I want to read the Bible but I don't know where to start or how to approach it. What's the honest advice?",
      },
      {
        title: 'What prayer actually is',
        subtitle: 'And what to do when it feels like nothing.',
        prompt: "What is prayer — actually? And what do you do when you pray and feel nothing? Is that normal?",
      },
      {
        title: 'The hard parts of following Jesus',
        subtitle: 'What nobody tells you at the start.',
        prompt: "What are the genuinely hard parts of following Jesus that nobody tells you when you start? I want to know what I'm getting into.",
      },
      {
        title: 'What comes next',
        subtitle: 'Building a life around something real.',
        prompt: "I'm a few months into this. How do I build a life where faith is actually central, not just something I think about occasionally?",
      },
    ],
  },
];

const PROGRESS_KEY = 'kinwove:journey_progress';

export function getJourneyProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function advanceJourneyProgress(journeyId, completedStepIndex) {
  const progress = getJourneyProgress();
  progress[journeyId] = Math.max(progress[journeyId] ?? 0, completedStepIndex + 1);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  return progress;
}
