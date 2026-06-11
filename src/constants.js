export const PERSON_TYPES = [
  {
    id: 'curious',
    emoji: '🌱',
    label: 'Just Curious',
    description: "Never really read it. Just want to know what's in there.",
  },
  {
    id: 'seeking',
    emoji: '🕯️',
    label: 'Used to Believe',
    description: "Grew up in faith or stepped away. Trying to figure out where I stand.",
    hasIntake: true,
  },
  {
    id: 'skeptic',
    emoji: '🤔',
    label: 'Skeptic',
    description: "Real doubts, hard questions. Don't dodge them.",
    hasIntake: true,
  },
  {
    id: 'heard-things',
    emoji: '👁️',
    label: "I've Heard Things",
    description: 'Giants, lost books, hidden texts. What is actually there?',
  },
  {
    id: 'new-faith',
    emoji: '✨',
    label: 'New to Faith',
    description: "Early in the journey. Want to understand, not be preached at.",
    hasIntake: true,
  },
  {
    id: 'deeper',
    emoji: '📖',
    label: 'Going Deeper',
    description: 'Know the stories. Now I want the history, language, and layers.',
  },
  {
    id: 'inter-faith',
    emoji: '🌍',
    label: 'Other Faiths',
    description: 'Understand other faiths and talk about Jesus with confidence.',
  },
  {
    id: 'kids',
    emoji: '🌟',
    label: 'For Kids',
    description: 'Simple words, fun examples. Explain it like I\'m a child.',
  },
  {
    id: 'relationships',
    emoji: '💛',
    label: 'Relationships',
    description: 'Dating, marriage, family, forgiveness — through a faith lens.',
  },
  {
    id: 'life',
    emoji: '🧭',
    label: 'Life Questions',
    description: "Real life questions — purpose, anxiety, money, identity, decisions — answered from scripture.",
  },
];

export const INTAKE_QUESTIONS = {
  seeking: [
    {
      id: 'belief',
      q: 'Where are you right now, honestly?',
      options: [
        "I don't believe in God",
        "I'm not sure what I believe",
        'I believe in something — not sure what',
        'I believe in God but not sure about Christianity',
        'I used to believe and I\'m trying to find my way back',
      ],
    },
    {
      id: 'barrier',
      q: 'What makes faith hardest for you?',
      options: [
        'Too much suffering in the world',
        'Bad experiences with religion or church',
        'It just seems scientifically unlikely',
        'Hypocrisy I\'ve seen in believers',
        'I\'ve never felt anything spiritual',
        'Something personal I haven\'t named yet',
      ],
    },
    {
      id: 'brought',
      q: 'What brought you here today?',
      options: [
        'Curiosity — no specific reason',
        'Something hard happened in my life',
        'Someone I trust suggested it',
        'I\'ve been thinking about this for a while',
        'I\'m not sure, honestly',
      ],
    },
  ],
  skeptic: [
    {
      id: 'skeptic_type',
      q: 'What kind of skeptic are you?',
      options: [
        'Intellectual — the evidence just isn\'t there for me',
        'Moral — I have problems with things the Bible says',
        'Personal — religion hurt me or people I love',
        'Scientific — it conflicts with what I know to be true',
        'All of the above, honestly',
      ],
    },
    {
      id: 'openness',
      q: 'How open are you to being wrong?',
      options: [
        'Genuinely open — I want to follow the evidence',
        'Somewhat open — I have my doubts about my doubts',
        'Not very — but I\'m willing to engage honestly',
        'I mostly want my questions taken seriously',
      ],
    },
  ],
  'new-faith': [
    {
      id: 'stage',
      q: 'Where are you in the journey?',
      options: [
        'Just started — days or weeks in',
        'A few months in, still finding my footing',
        'I believe but I don\'t really understand the Bible yet',
        'I grew up in faith, stepped away, and I\'m returning',
      ],
    },
    {
      id: 'need',
      q: 'What would help you most right now?',
      options: [
        'Understanding what the Bible actually says',
        'Making sense of the confusing or hard parts',
        'Knowing how to pray and what it\'s supposed to feel like',
        'Finding out if my doubts are okay to have',
      ],
    },
  ],
};

export const STARTERS = {
  curious: [
    'What is the Bible, really?',
    'Where should someone actually start reading?',
    'What are the stories everyone seems to know?',
    'Why do so many people take this seriously?',
    'What is the difference between the Old and New Testament?',
  ],
  skeptic: [
    'Why are there so many different versions?',
    'Do historians think any of this actually happened?',
    'How do I read this without turning my brain off?',
    'What is the strongest argument against the resurrection?',
    'Why does the Bible endorse things we consider immoral today?',
  ],
  'heard-things': [
    'Who were the Nephilim?',
    'What is the Book of Enoch and why is it not in most Bibles?',
    'What were the giants in Genesis 6?',
    'What are the lost gospels actually about?',
    'What is the Watchers tradition?',
  ],
  'new-faith': [
    'What is the gospel in one honest paragraph?',
    'How do I pray if I have never prayed before?',
    'What does grace actually mean?',
    'What does it mean to follow Jesus practically?',
    'How do I read the Bible without getting lost?',
  ],
  deeper: [
    'How does Paul read the Old Testament?',
    'What is the Ethiopian Bible canon?',
    'How does second-temple literature shape the New Testament?',
    'What is the New Perspective on Paul?',
    'How do chiastic structures work in Genesis?',
  ],
  group: [
    'Give us a discussion opener for Mark 1.',
    'How do we read Psalms together as a group?',
    'What are good open-ended questions for Genesis 1–3?',
    'How do we handle disagreement within the group?',
    'What is lectio divina and how do we practice it?',
  ],
  seeking: [
    "I want to believe, but I'm not sure how.",
    "Does faith require turning off your brain?",
    "What would it actually mean to follow Jesus?",
    "Is doubt something faith can survive?",
    "Why do people who have faith seem so certain?",
  ],
  'inter-faith': [
    'What does Islam teach about Jesus — and where does the Bible respond?',
    'Why do Jews not accept Jesus as the Messiah, and what does the Old Testament say?',
    'How do I respond when someone says the Bible has been corrupted?',
    'What Old Testament prophecies point directly to Jesus?',
    "What does the Quran say about Jesus that Muslims might not expect?",
  ],
  guided: [
    'Start me at the very beginning — Genesis 1.',
    'What is the Bible actually about, big picture?',
    'Walk me through the story of Jesus from start to finish.',
    'Take me through the Easter story in plain English.',
    'I want to understand the Psalms — where do I start?',
  ],
  kids: [
    'Who made the world?',
    'Why did Noah build a big boat?',
    'Who was David and why did he fight a giant?',
    'What is the Bible about?',
    'Why is Jesus so important?',
  ],
  relationships: [
    'How do I forgive someone who hasn\'t apologized?',
    'What does the Bible actually say about dating?',
    'I\'m struggling in my marriage — what does faith say?',
    'How do I honour my parents when they\'ve hurt me?',
    'I\'m lonely. What does faith say about that?',
  ],
  life: [
    'I don\'t know what I\'m supposed to do with my life.',
    'What does the Bible say about anxiety and worry?',
    'How do I make a big decision I\'m not sure about?',
    'I feel stuck. Is that something faith speaks to?',
    'What does scripture say about money and how I use it?',
  ],
};

export const DEEPER_STARTERS = {
  curious: [
    'How did the biblical canon get decided, and who decided it?',
    'What does "inspired text" actually mean theologically?',
    'How does archaeological evidence interact with the biblical narrative?',
    'What changed between the earliest manuscripts and what we read today?',
    'How do Jewish and Christian readings of the same texts differ?',
  ],
  skeptic: [
    'What did early Christians actually disagree about — before the creeds?',
    'How do scholars date the Gospels and what does the gap mean?',
    'What is textual criticism and what has it found?',
    'How should I handle the genocide passages in Joshua?',
    'What is the Documentary Hypothesis and how seriously do scholars take it?',
  ],
  'heard-things': [
    'How does the Dead Sea Scrolls discovery change how we read the Bible?',
    'What is the Nag Hammadi library and what does it tell us?',
    'How did Enochic Judaism influence early Christianity?',
    'What is the relationship between the Apocrypha and the Protestant Bible?',
    'What are the Pseudepigrapha and why were they excluded?',
  ],
  'new-faith': [
    'How do I read the Old Testament as a Christian without flattening it?',
    'What does it mean theologically to die to self?',
    'Why does Paul sometimes seem to contradict Jesus?',
    'What are the spiritual disciplines and how do I start?',
    'How do I sit with doubt without it destroying my faith?',
  ],
  deeper: [
    'How does midrash work and how does it appear in the New Testament?',
    'What is the significance of the temple in biblical theology?',
    'How does apocalyptic literature function — what is it actually doing?',
    'What is divine council theology and where does it appear in scripture?',
    'How do the creation accounts in Genesis 1 and 2 relate to each other?',
  ],
  group: [
    'How do we study Revelation together without descending into speculation?',
    'What is a good approach to reading a whole Gospel together in one semester?',
    'How do we create space for honest doubt in a group setting?',
    'What does healthy accountability look like in a study group?',
    'How do we handle when someone in the group holds a very different view?',
  ],
  seeking: [
    "What does the Bible say about people who struggle to believe?",
    "How do people cross from intellectual interest to actual faith?",
    "What is prayer — and is it worth trying before you're sure God exists?",
    "What did Jesus say to the person who said 'I believe; help my unbelief'?",
    "What would honest next steps look like for someone where I am right now?",
  ],
  'inter-faith': [
    "How does the Quran's denial of the crucifixion (Surah 4:157) compare with historical and manuscript evidence?",
    "How does Isaiah 53 read in its original Hebrew — and why do Jewish and Christian interpretations divide?",
    "What are the strongest Islamic objections to the Trinity, and how does Christian theology respond?",
    "How does the concept of the Word (Logos) in John 1 relate to the Islamic view of the Quran as the uncreated Word of God?",
    "What does the Talmud say about Jesus, and what can a Christian make of it?",
  ],
  guided: [
    "Walk me through Romans — what is Paul actually arguing, chapter by chapter?",
    "Take me through the four Gospels — how do they differ and why does it matter?",
    "Walk me through the Exodus story and what it meant to the people living it.",
    "Take me through Revelation — what kind of writing is it and how do I actually read it?",
    "Walk me through the prophets — who were they, when did they live, and what were they doing?",
  ],
  kids: [
    'Why did God make so many animals for Noah?',
    'What happened when Moses split the sea in half?',
    'How did Jesus feed thousands of people with just a little food?',
    'What does it mean that God loves everyone?',
    "Why did the disciples leave everything to follow Jesus?",
  ],
  relationships: [
    "What does the Bible actually say about divorce — and where does grace fit?",
    "What does Paul mean by 'submit to one another' in Ephesians 5?",
    "What does it look like to honour parents who were harmful?",
    "How do Christian theology and psychology think differently about forgiveness?",
    "What does scripture say about loneliness and singleness honestly?",
  ],
  life: [
    "What does Proverbs actually say about wisdom in decision-making?",
    "How does scripture frame identity — who am I, biblically speaking?",
    "What does the Bible say about ambition and whether it's okay to want more?",
    "How do I hold faith and mental health struggles at the same time?",
    "What does scripture say about contentment when life feels like it's not enough?",
  ],
};

export const PREMIUM_FEATURES = [
  'Unlimited conversations',
  'Full Extended Canon access (Ethiopian Bible, Apocrypha)',
  'Historical Texts library (Enoch, Jubilees, Jasher and more)',
  'Save and export study notes',
  'Deep-dive mode with original-language notes',
  'Ad-free reading',
];

export const ADS = [
  { id: 'a1', text: 'Holy Land tours with honest history — not just the highlights.', tag: 'Sponsored' },
  { id: 'a2', text: 'The ESV Study Bible — now in soft-bound parchment.', tag: 'Sponsored' },
  { id: 'a3', text: 'Retreats for people who want quiet, not quotas.', tag: 'Sponsored' },
];
