// ── kinwove Answers — crawlable, GEO-optimized faith-question pages ───────────
// These are REAL server-rendered HTML pages (not the React SPA), so Google and
// AI engines (ChatGPT, Perplexity, Gemini) can actually read + cite them.
//
// Each page follows 2026 AI-citation best practice:
//   • a tight 40–60 word direct answer up top (the block engines lift verbatim)
//   • scripture as evidence (citations lift AI visibility ~30–40%)
//   • an FAQ section with FAQPage schema
//   • Article schema + a fresh dateModified
//   • a soft CTA into the app + internal links to related answers
//
// To add a question: append an object below. Keep `answer` self-contained and
// ~40–60 words. Voice = grace-first, honest about uncertainty, never preachy,
// welcoming to skeptics (see src/prompts.js).

export const ANSWERS = [
  {
    slug: 'is-the-resurrection-of-jesus-real',
    question: 'Is the resurrection of Jesus real?',
    category: 'Faith & Doubt',
    updated: '2026-07-06',
    answer:
      'There is no way to prove the resurrection like a lab experiment, but it rests on unusually early evidence: eyewitness reports circulating within a few years, followers who died rather than recant, and a movement that exploded around one claim — that a crucified man was seen alive. You can weigh it honestly without pretending it is simple.',
    body: [
      { h: 'The evidence is earlier than most people assume',
        p: 'The claim was not a legend that grew over centuries. In 1 Corinthians 15, Paul passes on a creed most scholars date to within a few years of the crucifixion — naming specific people who said they saw Jesus alive, most still living when he wrote. Whatever you conclude, you are dealing with early testimony, not distant myth.' },
      { h: 'The behavior of the first followers is hard to explain away',
        p: 'The disciples went from hiding in fear to publicly proclaiming a risen Jesus — and many were killed for refusing to take it back. People die for things they believe are true. They rarely die for something they know they made up. That does not prove they were right, but it means they were not simply lying.' },
      { h: 'Honest doubt is welcome here',
        p: 'You do not have to arrive at certainty to explore this. Thomas doubted out loud in a room full of believers and was not shamed for it — he was invited to look closer. If you are weighing the evidence with real questions, you are exactly the kind of person this was written for.' },
    ],
    scriptures: [
      { ref: '1 Corinthians 15:3–6', text: 'For what I received I passed on to you as of first importance: that Christ died for our sins according to the Scriptures, that he was buried, that he was raised on the third day… and that he appeared to more than five hundred.' },
      { ref: 'John 20:27', text: 'Then he said to Thomas, "Put your finger here; see my hands. Reach out your hand and put it into my side. Stop doubting and believe."' },
    ],
    faqs: [
      { q: 'Can the resurrection be proven?', a: 'Not the way a repeatable experiment can. It is a historical claim, so it is weighed by evidence — the early eyewitness reports, the empty tomb accounts, and the transformation of the first followers — rather than proven with certainty.' },
      { q: 'Do you have to believe it to explore Christianity?', a: 'No. Many people start with honest questions and no firm conclusion. Doubt is treated as a starting point here, not a disqualification.' },
      { q: 'Why do Christians say it matters so much?', a: 'Because the entire Christian claim hinges on it — that death was defeated and forgiveness is real. Paul himself said if it did not happen, the faith is empty.' },
    ],
    related: ['why-does-god-allow-suffering', 'how-can-i-believe-when-i-have-doubts'],
  },

  {
    slug: 'why-does-god-allow-suffering',
    question: 'Why does God allow suffering?',
    category: 'Suffering & Evil',
    updated: '2026-07-06',
    answer:
      'Christianity does not give a tidy formula for why suffering happens, but it makes two claims: that a world with real love requires real freedom, which can be misused, and that God did not stay distant from pain — he entered it. The answer it offers is less an explanation and more a presence in the middle of it.',
    body: [
      { h: 'The honest starting point: it does not fully explain it',
        p: 'The Bible never hands you a clean equation for suffering. The book of Job spends dozens of chapters refusing easy answers. If someone tells you Christianity solves the problem of pain neatly, they are overselling it. What it offers is different — and, for many people, deeper.' },
      { h: 'Love requires freedom, and freedom can be misused',
        p: 'A world where people can genuinely love is a world where they can also genuinely harm. You cannot have one without the possibility of the other. Much of the worst suffering comes from freedom turned against others — not from God causing it, but from God allowing a world where love is real enough to be refused.' },
      { h: 'God did not watch from a distance',
        p: 'The central Christian claim is not that God explains suffering from far away, but that he stepped into it — betrayed, tortured, and killed. Whatever you are carrying, the faith says you are not carrying it in front of a God who has never felt pain. He is described again and again as close to the brokenhearted.' },
    ],
    scriptures: [
      { ref: 'Psalm 34:18', text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.' },
      { ref: 'John 16:33', text: 'In this world you will have trouble. But take heart! I have overcome the world.' },
      { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him.' },
    ],
    faqs: [
      { q: 'Does God cause suffering?', a: 'Christianity distinguishes between God causing suffering and God allowing a world where freedom, and therefore harm, is possible. Much suffering flows from that freedom being misused, not from God directly willing pain.' },
      { q: 'What comfort does faith actually offer in pain?', a: 'Less a tidy explanation, more a presence — the claim that God entered suffering himself and stays near those who are hurting, and that pain is not the end of the story.' },
      { q: 'Is it okay to be angry at God about suffering?', a: 'Yes. The Bible is full of people crying out honestly — the Psalms especially. Bringing your anger to God is treated as a form of relationship, not rebellion.' },
    ],
    related: ['is-the-resurrection-of-jesus-real', 'how-can-i-believe-when-i-have-doubts'],
  },

  {
    slug: 'how-can-i-believe-when-i-have-doubts',
    question: 'How can I believe in God when I have doubts?',
    category: 'Faith & Doubt',
    updated: '2026-07-06',
    answer:
      'Doubt is not the opposite of faith — certainty is not required to begin. Throughout the Bible, people believe and question at the same time. Faith is less a switch you flip and more a direction you lean while still carrying questions. You are allowed to explore honestly without first resolving every doubt.',
    body: [
      { h: 'Doubt and faith are not enemies',
        p: 'A lot of people assume you need to silence every question before you are allowed to believe. The Bible does not model that. A father once said to Jesus, "I do believe; help my unbelief" — belief and doubt in the same breath — and he was not turned away. Honest questions are treated as part of the journey, not a barrier to it.' },
      { h: 'You do not have to start with certainty',
        p: 'Faith is not pretending to be sure of things you are not sure of. It is more like taking a step in a direction while still holding open questions. Many people begin by simply being willing to explore — reading, asking, praying tentatively — long before they would call themselves certain of anything.' },
      { h: 'Bring the questions, not a performance',
        p: 'You do not need to clean yourself up or fake conviction first. The invitation is to come as you actually are — skeptical, wondering, half-convinced — and keep asking. That is not second-class faith. For a lot of people, it is exactly where real faith starts.' },
    ],
    scriptures: [
      { ref: 'Mark 9:24', text: 'Immediately the boy’s father exclaimed, "I do believe; help me overcome my unbelief!"' },
      { ref: 'Matthew 7:7', text: 'Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.' },
    ],
    faqs: [
      { q: 'Is doubt a sin?', a: 'No. The Bible repeatedly shows people of deep faith wrestling with doubt. Doubt is treated as part of an honest relationship with God, not as failure.' },
      { q: 'Do I need to be sure before I can pray?', a: 'No. Many people pray tentatively, even skeptically, as a way of exploring. You can start a conversation with God without first resolving your questions.' },
      { q: 'What if my doubts never fully go away?', a: 'Faith and questions often coexist for a lifetime. Leaning toward trust while still holding some questions is a normal, honest form of belief — not a lesser one.' },
    ],
    related: ['is-the-resurrection-of-jesus-real', 'why-does-god-allow-suffering'],
  },

  {
    slug: 'can-i-trust-the-bible',
    question: `Can I trust the Bible?`,
    category: 'Bible',
    updated: '2026-07-06',
    answer: `The Bible is a library written over centuries, and its reliability is testable: it has more early manuscripts than any ancient text, they agree closely, and archaeology keeps confirming its people and places. You can question it honestly — many who set out to disprove it ended up trusting it — without checking your mind at the door.`,
    body: [
      { h: `It has stronger manuscript evidence than any ancient text`, p: `No ancient document comes close to the Bible in how early and how widely its manuscripts survive — thousands of copies, some within a couple of generations of the events. Where copies differ, it is mostly spelling and word order, not the core message. You are not reading a text that drifted freely over time.` },
      { h: `It was written to be examined, not just accepted`, p: `The Bible names real rulers, cities, and dates you can check. Luke opens his gospel saying he carefully investigated everything. It invites scrutiny rather than demanding blind acceptance — which is part of why many skeptics who studied it closely came away convinced.` },
      { h: `Reliable does not mean simple`, p: `There are hard passages and honest tensions worth wrestling with. Trusting the Bible does not mean pretending those do not exist — it means engaging them openly. That is exactly what kinwove is for.` },
    ],
    scriptures: [
      { ref: `2 Timothy 3:16`, text: `All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness.` },
      { ref: `Isaiah 40:8`, text: `The grass withers and the flowers fall, but the word of our God endures forever.` },
    ],
    faqs: [
      { q: `Hasn't the Bible been changed over time?`, a: `The manuscript evidence argues against it: thousands of early copies let scholars trace the text closely, and the differences that exist are minor, not changes to core teaching.` },
      { q: `Do you have to take every word literally?`, a: `No. The Bible holds history, poetry, letters, and parables — different kinds of writing read different ways. Reading it well means reading each part as what it is.` },
      { q: `Where should a beginner start?`, a: `Many start with the Gospel of John or Mark to meet Jesus directly, then Psalms for honest prayer. You can also just ask kinwove where to begin.` },
    ],
    related: ['is-jesus-really-god', 'how-can-i-believe-when-i-have-doubts'],
  },

  {
    slug: 'is-jesus-really-god',
    question: `Is Jesus really God?`,
    category: 'Jesus Christ',
    updated: '2026-07-06',
    answer: `Christianity claims Jesus was not just a wise teacher but God in human form. He forgave sins as only God can, accepted worship, and said "before Abraham was born, I am." Either that is true, or he was profoundly mistaken — but "just a good moral teacher" was never really on the table.`,
    body: [
      { h: `He said and did things only God could rightly do`, p: `Jesus forgave sins against other people, accepted worship, and applied God's own name to himself. His fiercest critics understood exactly what he was claiming — they accused him of blasphemy for it. He did not leave "just a teacher" as an option.` },
      { h: `Liar, lunatic, or Lord`, p: `A man who says what Jesus said is either lying, deluded, or telling the truth. The one thing he cannot be is merely a great moral teacher — because great moral teachers do not claim to be God. You have to decide which of the three he was.` },
      { h: `The first followers worshiped him as God`, p: `Within a few years of his death, devout Jewish monotheists — people for whom worshiping a human was unthinkable — were praying to Jesus and calling him Lord. Something convinced them he was more than a man.` },
    ],
    scriptures: [
      { ref: `John 8:58`, text: `"Very truly I tell you," Jesus answered, "before Abraham was born, I am!"` },
      { ref: `John 1:1`, text: `In the beginning was the Word, and the Word was with God, and the Word was God.` },
    ],
    faqs: [
      { q: `Didn't Jesus just claim to be a prophet?`, a: `His claims went far beyond prophethood — forgiving sins, accepting worship, taking God's name for himself. That is why he was charged with blasphemy.` },
      { q: `Where does the Bible say Jesus is God?`, a: `In many places — John 1:1, John 8:58, Colossians 1, and Jesus accepting Thomas's worship as "My Lord and my God" in John 20:28.` },
      { q: `Can I follow Jesus if I'm not sure he's God?`, a: `Many people start following and exploring before they are certain. Faith often grows on the way, not before you set out.` },
    ],
    related: ['is-the-resurrection-of-jesus-real', 'is-christianity-the-only-way-to-god'],
  },

  {
    slug: 'what-happens-when-you-die',
    question: `What happens when you die?`,
    category: 'Eternal Life',
    updated: '2026-07-06',
    answer: `Christianity teaches death is not the end but a doorway — that there is life beyond it, and what you do with Jesus in this life matters for the next. The hope it describes is not vague survival but resurrection, reunion, and a God who promises to wipe every tear away.`,
    body: [
      { h: `Death is described as a doorway, not a wall`, p: `The Bible does not treat death as final erasure but as a passage. Jesus told a dying man beside him, "today you will be with me in paradise." The Christian hope is not that we drift into nothing, but that we continue — and are made whole.` },
      { h: `The hope is resurrection, not just a ghostly afterlife`, p: `Christianity's promise is bodily resurrection and a renewed world, not merely floating souls — everything broken finally restored, with no more death, mourning, or pain.` },
      { h: `What you do with Jesus matters`, p: `The Bible is honest that this life carries weight for the next, and that how we respond to God's offer of grace matters. But the tone is invitation, not fear — a door held open, not a threat.` },
    ],
    scriptures: [
      { ref: `John 11:25`, text: `I am the resurrection and the life. The one who believes in me will live, even though they die.` },
      { ref: `Revelation 21:4`, text: `He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain.` },
    ],
    faqs: [
      { q: `Is heaven real?`, a: `Christianity teaches heaven is real — not a distant cloud, but being fully with God in a restored world, free of pain and death.` },
      { q: `What about hell?`, a: `The Bible speaks of separation from God as a real possibility, but frames the whole message as an invitation into life, not primarily a threat.` },
      { q: `Can anyone know for sure what happens after death?`, a: `No one can prove it. Christianity offers it as hope grounded in Jesus's resurrection — a reason to trust, not a lab result.` },
    ],
    related: ['is-the-resurrection-of-jesus-real', 'does-god-love-me'],
  },

  {
    slug: 'how-do-i-start-praying',
    question: `How do I start praying?`,
    category: 'Prayer',
    updated: '2026-07-06',
    answer: `Prayer is simpler than most people think: it is just honest talking to God in your own words. You do not need special language, a certain posture, or the right feelings. You can start with a single sentence — even "God, I don't know if you're there, but I'm listening." That counts.`,
    body: [
      { h: `There is no formula to get right`, p: `Prayer is not a spell with magic words. Jesus actually warned against long, showy prayers and taught a short, plain one as a model. If you can talk, you can pray.` },
      { h: `Start honest, not polished`, p: `You do not have to sound religious or hide how you actually feel. The Psalms are full of raw, unfiltered prayers — anger, fear, doubt, joy. God is not waiting for eloquence. He is after honesty.` },
      { h: `A simple way to begin`, p: `Find a quiet minute and say what is true — what you are grateful for, what you are afraid of, what you need. Then listen for a moment. That is prayer, and you can do it anywhere.` },
    ],
    scriptures: [
      { ref: `Matthew 6:6`, text: `But when you pray, go into your room, close the door and pray to your Father, who is unseen.` },
      { ref: `Philippians 4:6`, text: `Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.` },
    ],
    faqs: [
      { q: `Do I have to pray out loud?`, a: `No. You can pray silently, in writing, or out loud — whatever helps you be honest.` },
      { q: `What if I don't know what to say?`, a: `Start with one true sentence. "Help," "thank you," or "I don't understand" are all real prayers.` },
      { q: `Does God actually hear me?`, a: `Christianity teaches God is near to everyone who calls on him honestly — that no sincere prayer goes unheard.` },
    ],
    related: ['how-do-i-become-a-christian', 'does-god-love-me'],
  },

  {
    slug: 'how-do-i-become-a-christian',
    question: `How do I become a Christian?`,
    category: 'Salvation',
    updated: '2026-07-06',
    answer: `Becoming a Christian is not about cleaning up your life first or passing a test. At its core it is a turning: trusting that Jesus is who he said he is, that his death covers your wrongs, and asking him into your life. It can be as simple as an honest prayer, meant sincerely.`,
    body: [
      { h: `It starts with grace, not performance`, p: `You do not become a Christian by being good enough — the whole point is that no one is. It is a gift you receive, not a status you earn. That is what grace means: unearned love.` },
      { h: `The turning has a few simple parts`, p: `Historically it is summed up as: believe Jesus is Lord and rose from the dead, turn from going your own way, and receive him. Not a ritual performed perfectly — a direction you choose.` },
      { h: `A prayer to begin`, p: `There are no magic words, but many start with something like: "Jesus, I believe you're real. I've gone my own way and I need you. Forgive me, and come into my life." If you mean it, that is the beginning.` },
    ],
    scriptures: [
      { ref: `Romans 10:9`, text: `If you declare with your mouth, "Jesus is Lord," and believe in your heart that God raised him from the dead, you will be saved.` },
      { ref: `Ephesians 2:8`, text: `For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God.` },
    ],
    faqs: [
      { q: `Do I have to fix my life first?`, a: `No. You come as you are. Change tends to follow, but it is never the entry requirement — grace is.` },
      { q: `Is there a specific prayer I have to say?`, a: `No exact words are required. What matters is honestly turning to Jesus and meaning it.` },
      { q: `What do I do after?`, a: `Start talking to God, reading the Gospels, and finding others on the same road. kinwove can help with all three.` },
    ],
    related: ['how-do-i-start-praying', 'will-god-forgive-me'],
  },

  {
    slug: 'is-there-evidence-that-god-exists',
    question: `Is there evidence that God exists?`,
    category: 'Faith & Doubt',
    updated: '2026-07-06',
    answer: `There is no single knockdown proof of God, but there are real reasons people find persuasive: that anything exists at all, that the universe is finely tuned for life, that we have a deep sense of right and wrong, and that longing for meaning is nearly universal. It is a case to weigh, not a formula to force.`,
    body: [
      { h: `Why is there something rather than nothing?`, p: `The universe had a beginning, and everything that begins seems to have a cause. That does not prove God, but it points many thoughtful people toward a cause beyond the universe itself — something outside space and time.` },
      { h: `The universe looks strangely fit for life`, p: `The physical constants that make life possible sit in an astonishingly narrow range. Some explain this away; others find it easier to believe it was intended. Both are honest responses to a genuinely striking fact.` },
      { h: `Our moral sense is hard to explain away`, p: `Almost everyone feels that some things are truly wrong, not just unpopular. That deep intuition — that justice and love are real — fits a universe with a moral God more naturally than one without.` },
    ],
    scriptures: [
      { ref: `Romans 1:20`, text: `For since the creation of the world God's invisible qualities have been clearly seen, being understood from what has been made.` },
      { ref: `Psalm 19:1`, text: `The heavens declare the glory of God; the skies proclaim the work of his hands.` },
    ],
    faqs: [
      { q: `Can God's existence be proven?`, a: `Not with mathematical certainty. It is weighed through reasoning and evidence — the origin of the universe, fine-tuning, morality, experience — like a case, not a proof.` },
      { q: `Doesn't science explain everything without God?`, a: `Science explains how things work, not why anything exists at all. Many scientists hold faith; the two are not necessarily in conflict.` },
      { q: `Is it okay to want more certainty?`, a: `Yes. Wanting good reasons is healthy. Faith and honest questioning belong together.` },
    ],
    related: ['how-can-i-believe-when-i-have-doubts', 'is-jesus-really-god'],
  },

  {
    slug: 'what-is-the-meaning-of-life',
    question: `What is the meaning of life?`,
    category: 'Purpose',
    updated: '2026-07-06',
    answer: `Christianity's answer is that you were made on purpose, by a God who loves you, to know him and to love others — and that your life has weight beyond what you produce or achieve. Meaning is not something you have to manufacture alone; it is something you were built for and can be found.`,
    body: [
      { h: `You are not an accident`, p: `The Christian claim is that you were intended — known before you were born, made in God's image. Whatever else is true of your life, it starts from being wanted, not random. That reframes everything.` },
      { h: `Meaning is relational, not just achievement`, p: `The deepest purpose the Bible describes is not success but love — being loved by God and loving others. That is why people who "have it all" often still feel empty. We were made for connection, not accumulation.` },
      { h: `Your worth is not earned`, p: `You do not have to justify your existence by being impressive. Christianity says your value is given, not achieved — both humbling and freeing. You can stop auditioning for a place you already have.` },
    ],
    scriptures: [
      { ref: `Jeremiah 1:5`, text: `Before I formed you in the womb I knew you, before you were born I set you apart.` },
      { ref: `Ephesians 2:10`, text: `For we are God's handiwork, created in Christ Jesus to do good works.` },
    ],
    faqs: [
      { q: `What if I don't feel like my life has purpose?`, a: `Christianity locates purpose in being loved and made on purpose, not in feelings or output — so it holds even on the days it does not feel true.` },
      { q: `Isn't meaning just something we make up?`, a: `Christianity says meaning is discovered, not invented — that you were made for something and can find it rather than manufacture it.` },
      { q: `How do I find my specific purpose?`, a: `It usually starts with knowing you are loved, then loving others with what you have been given. The specifics unfold from there.` },
    ],
    related: ['does-god-love-me', 'am-i-too-far-gone-for-god'],
  },

  {
    slug: 'is-christianity-the-only-way-to-god',
    question: `Is Christianity the only way to God?`,
    category: 'Faith & Doubt',
    updated: '2026-07-06',
    answer: `Christianity does make an exclusive claim — that Jesus is the way to God — which can sound arrogant. But it is less a boast about Christians being better and more a claim about what Jesus uniquely did: opened a door none of us could open ourselves. It is worth understanding before dismissing.`,
    body: [
      { h: `The claim is about Jesus, not about Christians`, p: `Christianity does not say Christians are superior people or that others are foolish. It says Jesus did something unique — bridging the gap between God and humanity himself. The exclusivity is about him, not the people who follow him.` },
      { h: `Every worldview makes exclusive claims`, p: `The idea that "all paths lead to God" is itself an exclusive claim — it says every religion that denies it is wrong. There is no neutral ground. The honest question is not whether a view is exclusive, but whether it is true.` },
      { h: `It is an open door, not a closed club`, p: `The same faith that says Jesus is the only way also says that door is open to absolutely anyone — no matter your past, background, or how far off you feel. Exclusive path, radically inclusive welcome.` },
    ],
    scriptures: [
      { ref: `John 14:6`, text: `Jesus answered, "I am the way and the truth and the life. No one comes to the Father except through me."` },
      { ref: `Revelation 22:17`, text: `Whoever is thirsty, let them come; and whoever wishes, let them take the free gift of the water of life.` },
    ],
    faqs: [
      { q: `Isn't it arrogant to say one religion is right?`, a: `It can sound that way, but every worldview — including "all are equal" — claims to be the true one. The real question is which is true, not which sounds humblest.` },
      { q: `What about people who never heard of Jesus?`, a: `The Bible leaves some of this in God's hands and describes him as perfectly just and more merciful than we are. Christians trust God to judge fairly.` },
      { q: `Can I explore Christianity while respecting my background?`, a: `Yes. Many people explore honestly, bringing their questions and heritage with them. You are welcome here exactly as you are.` },
    ],
    related: ['is-jesus-really-god', 'is-there-evidence-that-god-exists'],
  },

  {
    slug: 'does-god-love-me',
    question: `Does God love me?`,
    category: 'Grace',
    updated: '2026-07-06',
    answer: `Yes — and not because of what you have done or how you feel. The central Christian claim is that God loves you as you are, not as you should be. It is summed up in one line: while we were still a mess, Christ died for us. His love is a fact about him, not a reward for you.`,
    body: [
      { h: `His love is not earned — that is the whole point`, p: `You do not have to become lovable first. The Bible's most famous line about God's love says he acted "while we were still sinners" — at our worst, not our best. His love comes before your performance, not after it.` },
      { h: `It is personal, not just general`, p: `This is not a vague cosmic warmth toward humanity in general. The Bible describes a God who knows the hairs on your head, who is close to the brokenhearted, who calls you by name. You, specifically.` },
      { h: `True even when you don't feel it`, p: `Feelings come and go. God's love is described as steady and unfailing, not dependent on your mood or track record. On the days you feel least lovable, it is exactly as true.` },
    ],
    scriptures: [
      { ref: `Romans 5:8`, text: `But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.` },
      { ref: `Zephaniah 3:17`, text: `The Lord your God is with you; he will take great delight in you; he will rejoice over you with singing.` },
    ],
    faqs: [
      { q: `Does God love me even after what I've done?`, a: `Yes. The Bible is emphatic that nothing you have done places you beyond God's love or reach.` },
      { q: `Why doesn't it feel like God loves me?`, a: `Feelings are not a reliable gauge. God's love is described as constant and unearned — true even when it does not feel true.` },
      { q: `How do I experience God's love?`, a: `Many start by asking him to make it real, reading how Jesus treated broken people, and being honest in prayer.` },
    ],
    related: ['am-i-too-far-gone-for-god', 'will-god-forgive-me'],
  },

  {
    slug: 'what-does-the-bible-say-about-anxiety',
    question: `What does the Bible say about anxiety?`,
    category: 'Mental Health',
    updated: '2026-07-06',
    answer: `The Bible speaks to anxiety often, and never with shame. Its repeated message is: you are not carrying this alone, so hand it over. "Do not be afraid" appears more than any other command — not because life isn't hard, but because God promises to be with you in it. An invitation to release, not a rebuke for feeling it.`,
    body: [
      { h: `Anxiety is not treated as a failure of faith`, p: `The Bible is full of people crying out in fear and being met with compassion, not scolding. Even Jesus felt deep distress. Feeling anxious does not mean something is wrong with your faith — it means you are human.` },
      { h: `The recurring invitation: hand it over`, p: `Again and again the Bible says to bring your worries to God rather than carry them alone — to "cast your anxiety on him, because he cares for you." Not "try harder to stop worrying," but "give it to someone bigger."` },
      { h: `Peace is offered, not demanded`, p: `The promise is not a life without hard things, but a peace that can hold you inside them — one the Bible says "transcends understanding." Practical: pray honestly, name what you fear, and release it, one day at a time.` },
    ],
    scriptures: [
      { ref: `Philippians 4:6-7`, text: `Do not be anxious about anything... and the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.` },
      { ref: `1 Peter 5:7`, text: `Cast all your anxiety on him because he cares for you.` },
    ],
    faqs: [
      { q: `Is anxiety a sin?`, a: `No. The Bible treats fear and worry with compassion, not condemnation, and repeatedly meets anxious people with reassurance.` },
      { q: `Does faith mean I won't feel anxious?`, a: `No. It means you do not carry it alone. Many people of deep faith also seek counseling and medical help — faith and care work together.` },
      { q: `What verse helps most with anxiety?`, a: `Philippians 4:6-7 is the one many return to: bring it to God, and receive a peace beyond understanding.` },
    ],
    related: ['does-god-love-me', 'how-do-i-start-praying'],
  },

  {
    slug: 'will-god-forgive-me',
    question: `Will God forgive me?`,
    category: 'Grace',
    updated: '2026-07-06',
    answer: `Yes — Christianity's core promise is that no sin is too big for God's forgiveness. It is not earned by making up for it; it is received. The Bible says if you confess, God is faithful to forgive and clean the slate entirely — removing your wrongs "as far as the east is from the west."`,
    body: [
      { h: `Forgiveness is the point, not the fine print`, p: `Christianity is not grudging about this. Forgiveness is the center of the message — it is why Jesus came. Whatever you have done, the door is described as open and the offer already made.` },
      { h: `It is received, not earned`, p: `You cannot pay God back into forgiving you — and you do not have to. The Bible says forgiveness is a gift, secured by Jesus, not by your penance. Your job is simply to receive it honestly.` },
      { h: `The slate is truly wiped`, p: `This is not partial or probationary. Scripture uses total images: sins removed as far as east from west, thrown into the depths of the sea, remembered no more. Forgiven means forgiven.` },
    ],
    scriptures: [
      { ref: `1 John 1:9`, text: `If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness.` },
      { ref: `Psalm 103:12`, text: `As far as the east is from the west, so far has he removed our transgressions from us.` },
    ],
    faqs: [
      { q: `Is any sin too big to be forgiven?`, a: `No. The Bible presents no sin as beyond God's forgiveness for those who honestly turn to him.` },
      { q: `Do I have to earn forgiveness?`, a: `No. It is received as a gift, not earned by good deeds or self-punishment.` },
      { q: `What if I keep doing the same thing?`, a: `God's forgiveness is not a limited quantity. The invitation to return is always open, again and again.` },
    ],
    related: ['am-i-too-far-gone-for-god', 'how-do-i-become-a-christian'],
  },

  {
    slug: 'am-i-too-far-gone-for-god',
    question: `Am I too far gone for God?`,
    category: 'Grace',
    updated: '2026-07-06',
    answer: `No one is too far gone. This is one of the most consistent messages in the Bible — that no past, no failure, and no distance puts you beyond God's reach. The people Jesus welcomed most were the ones everyone else had written off. If you are wondering whether there is still room for you, the answer is yes.`,
    body: [
      { h: `The Bible is full of "unqualified" people God used`, p: `Moses was a murderer. David committed adultery. Peter denied Jesus. Paul persecuted Christians. Not one was too far gone — several became the story's heroes. Your past is not a disqualification.` },
      { h: `Jesus went straight to the written-off`, p: `The religious crowd was scandalized that Jesus spent his time with the people they had given up on. That was the point. He said he came for those who know they need help, not those who think they do not.` },
      { h: `The distance you feel is not the distance that's real`, p: `Feeling far from God is not the same as being beyond him. The most famous story Jesus told is about a son who blew everything and came home — and his father ran to meet him while he was still a long way off.` },
    ],
    scriptures: [
      { ref: `Luke 15:20`, text: `But while he was still a long way off, his father saw him and was filled with compassion for him; he ran to his son and threw his arms around him.` },
      { ref: `Romans 8:38-39`, text: `Neither death nor life, neither the present nor the future, will be able to separate us from the love of God that is in Christ Jesus our Lord.` },
    ],
    faqs: [
      { q: `Is it ever too late to turn to God?`, a: `As long as you are alive, the Bible presents the door as open. No amount of time or wrong closes it.` },
      { q: `What if my past is really bad?`, a: `Some of the Bible's central figures had terrible pasts. God's reach is not limited by the size of your regrets.` },
      { q: `How do I come back to God?`, a: `Simply turn toward him honestly — a prayer as plain as "I'm here, I need you" is enough to start.` },
    ],
    related: ['will-god-forgive-me', 'does-god-love-me'],
  },

  {
    slug: 'what-is-the-gospel',
    question: `What is the gospel?`,
    category: 'Salvation',
    updated: '2026-07-06',
    answer: `The gospel means "good news," and it is this: that God loves you, that Jesus lived, died, and rose to deal with everything broken between you and God, and that this rescue is a gift you receive rather than a reward you earn. In short — you are more flawed than you feared, and more loved than you hoped.`,
    body: [
      { h: `It is news, not advice`, p: `Most religion is advice — do these things and get to God. The gospel is news — that God already came to you. It is not a to-do list; it is an announcement of something already done.` },
      { h: `The core of it in one line`, p: `Jesus took what we owed and offered us what we could never earn. His death paid the debt; his resurrection opened the door. All that is left is to receive it.` },
      { h: `Why it is called "good"`, p: `Because it does not depend on you being good enough — which is a relief, since no one is. It meets you at your worst and calls you loved anyway.` },
    ],
    scriptures: [
      { ref: `John 3:16`, text: `For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.` },
      { ref: `Romans 5:8`, text: `But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.` },
    ],
    faqs: [
      { q: `What does "gospel" actually mean?`, a: `It is an old word for "good news" — specifically the news that God has rescued people through Jesus.` },
      { q: `Is the gospel about being a good person?`, a: `No. It is the opposite — that you cannot be good enough on your own, so God did for you what you could not do for yourself.` },
      { q: `How do I respond to it?`, a: `By receiving it — trusting Jesus and turning to him. It is a gift to accept, not a standard to meet.` },
    ],
    related: ['how-do-i-become-a-christian', 'what-is-grace'],
  },

  {
    slug: 'who-is-the-holy-spirit',
    question: `Who is the Holy Spirit?`,
    category: 'Holy Spirit',
    updated: '2026-07-06',
    answer: `The Holy Spirit is God himself present and active — not a force or an "it," but the third person of the Trinity. Christians describe the Spirit as God living within them: comforting, guiding, convicting, and giving strength. Where God can feel distant, the Spirit is the nearness.`,
    body: [
      { h: `Not a force, but God present`, p: `The Bible speaks of the Spirit as personal — he can be grieved, he speaks, he guides. He is God with us and in us, not an impersonal energy.` },
      { h: `What the Spirit does`, p: `Comforts the hurting, gives wisdom, produces character over time (love, joy, peace, patience), and makes God's presence real rather than theoretical.` },
      { h: `Why it matters for you`, p: `It means faith is not you white-knuckling toward God from a distance. The Spirit is God closing the distance — living in ordinary people and slowly changing them from the inside.` },
    ],
    scriptures: [
      { ref: `John 14:26`, text: `But the Advocate, the Holy Spirit, whom the Father will send in my name, will teach you all things.` },
      { ref: `Galatians 5:22-23`, text: `But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness.` },
    ],
    faqs: [
      { q: `Is the Holy Spirit a person or a force?`, a: `Christianity describes the Spirit as a person — God himself — not an impersonal force.` },
      { q: `How do I receive the Holy Spirit?`, a: `The Bible teaches the Spirit comes to those who turn to Jesus — it is part of what happens when you become a Christian, not a separate achievement.` },
      { q: `Can I feel the Holy Spirit?`, a: `Sometimes, but it is not mainly about feelings. The Spirit is often known by slow change — growing peace, wisdom, and love over time.` },
    ],
    related: ['what-is-the-trinity', 'what-is-the-gospel'],
  },

  {
    slug: 'what-is-the-trinity',
    question: `What is the Trinity?`,
    category: 'Jesus Christ',
    updated: '2026-07-06',
    answer: `The Trinity is the Christian belief that God is one being who exists as three persons — Father, Son, and Holy Spirit. Not three gods, and not one person wearing three masks, but one God in three. It is genuinely hard to picture, which is honest: an infinite God being fully understandable would be more suspicious.`,
    body: [
      { h: `One God, three persons`, p: `Christians are firmly monotheists — one God. But the Bible presents Father, Son, and Spirit as each fully God, distinct yet united. That tension is the Trinity.` },
      { h: `Why analogies fall short`, p: `Water as ice, liquid, and steam; or a person as parent, worker, and friend — every analogy breaks down, because nothing in creation is quite like it. That is expected when describing the Creator.` },
      { h: `Why it actually matters`, p: `It means God is, in his very nature, relationship and love — not a solitary ruler, but a communion of love that has always existed. That shapes everything about how Christians see God.` },
    ],
    scriptures: [
      { ref: `Matthew 28:19`, text: `Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.` },
      { ref: `2 Corinthians 13:14`, text: `May the grace of the Lord Jesus Christ, and the love of God, and the fellowship of the Holy Spirit be with you all.` },
    ],
    faqs: [
      { q: `Do Christians believe in three gods?`, a: `No. Christianity is monotheistic — one God — who exists as three persons: Father, Son, and Holy Spirit.` },
      { q: `Is the word "Trinity" in the Bible?`, a: `The word itself is not, but the idea is drawn from many passages where Father, Son, and Spirit are each called God and shown as distinct.` },
      { q: `Do I have to fully understand it to be a Christian?`, a: `No. Even lifelong Christians find it mysterious. You are not required to explain it, only to trust the God it describes.` },
    ],
    related: ['is-jesus-really-god', 'who-is-the-holy-spirit'],
  },

  {
    slug: 'what-does-the-bible-say-about-depression',
    question: `What does the Bible say about depression?`,
    category: 'Mental Health',
    updated: '2026-07-06',
    answer: `The Bible never shames people for depression — it is full of them. David, Elijah, and even Jesus knew deep anguish. Its message is not "snap out of it" but "you are not alone in this, and it is not the end of your story." Faith and seeking real help — counseling, medicine — belong together.`,
    body: [
      { h: `Scripture is honest about the darkness`, p: `The Psalms include raw cries like "why, my soul, are you so downcast?" Elijah asked to die. The Bible does not pretend faith erases pain — it gives words to it.` },
      { h: `You are not carrying it alone`, p: `The repeated promise is God's nearness in the low places: "close to the brokenhearted." Not a fix on demand, but a presence that does not leave.` },
      { h: `Faith and help are not rivals`, p: `Seeking a counselor, a doctor, or medication is not a lack of faith — it is stewarding the life you have. Many faithful people carry depression and get real help for it. Both are good.` },
    ],
    scriptures: [
      { ref: `Psalm 34:18`, text: `The Lord is close to the brokenhearted and saves those who are crushed in spirit.` },
      { ref: `Psalm 42:11`, text: `Why, my soul, are you downcast? Put your hope in God, for I will yet praise him.` },
    ],
    faqs: [
      { q: `Is depression a sin or a lack of faith?`, a: `No. The Bible shows people of deep faith wrestling with despair. Depression is treated with compassion, not blame.` },
      { q: `Should Christians take medication or see a therapist?`, a: `Many do, and Scripture gives no reason not to. Caring for your mind is part of caring for the life God gave you.` },
      { q: `What can I do right now if I'm struggling?`, a: `Tell someone, reach out for help, and if you are in crisis, contact a crisis line. You are not meant to carry this alone.` },
    ],
    related: ['what-does-the-bible-say-about-anxiety', 'does-god-love-me'],
  },

  {
    slug: 'how-do-i-read-the-bible-as-a-beginner',
    question: `How do I read the Bible as a beginner?`,
    category: 'Bible',
    updated: '2026-07-06',
    answer: `Don't start at page one. Begin with the Gospel of John or Mark to meet Jesus directly, then try Psalms for honest prayer and Proverbs for daily wisdom. Read a little at a time, ask what it says about God and people, and don't worry about understanding everything at once.`,
    body: [
      { h: `Start with Jesus, not Genesis`, p: `Genesis-to-front is where many beginners get stuck. Start with a Gospel — John or Mark — where you meet Jesus himself. Everything else makes more sense in that light.` },
      { h: `Small and steady beats marathon`, p: `A few verses read slowly and thought about beats rushing chapters. Ask three simple questions: what does this say about God, about people, and about me?` },
      { h: `It is okay not to get it all`, p: `Some passages are hard, and even scholars debate them. Confusion is not failure — it is an invitation to ask. You can bring any question to kinwove as you read.` },
    ],
    scriptures: [
      { ref: `Psalm 119:105`, text: `Your word is a lamp for my feet, a light on my path.` },
      { ref: `Joshua 1:8`, text: `Keep this Book of the Law always on your lips; meditate on it day and night.` },
    ],
    faqs: [
      { q: `Which Bible translation should a beginner use?`, a: `A readable modern one like the NIV or NLT is a great start — clear English without losing the meaning.` },
      { q: `Where exactly should I start reading?`, a: `The Gospel of John or Mark to meet Jesus, then Psalms and Proverbs. Skip trying to read cover to cover at first.` },
      { q: `What if I don't understand what I read?`, a: `That is normal. Note your questions and ask — kinwove can explain passages in plain language as you go.` },
    ],
    related: ['can-i-trust-the-bible', 'how-do-i-start-praying'],
  },

  {
    slug: 'what-is-grace',
    question: `What is grace?`,
    category: 'Grace',
    updated: '2026-07-06',
    answer: `Grace is love you did not earn and cannot repay. It is the heart of Christianity: not "be good and God will accept you," but "God accepts you, and that changes you." Grace means the acceptance comes first — before you clean up, before you deserve it, before you even ask.`,
    body: [
      { h: `Unearned, on purpose`, p: `Every other system runs on earning — do more, get more. Grace flips it: the gift comes first, freely, precisely to people who could never earn it. That is what makes it grace and not wages.` },
      { h: `It is not a license, it is a change`, p: `People worry grace means "do whatever you want." In practice it does the opposite — being loved when you least deserve it tends to change you more than any threat ever could.` },
      { h: `Why it is such a relief`, p: `Grace means you can stop performing. You do not have to earn your place; it is given. For anyone worn out from trying to be enough, that is the best news there is.` },
    ],
    scriptures: [
      { ref: `Ephesians 2:8-9`, text: `For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God — not by works, so that no one can boast.` },
      { ref: `2 Corinthians 12:9`, text: `My grace is sufficient for you, for my power is made perfect in weakness.` },
    ],
    faqs: [
      { q: `What is the simple definition of grace?`, a: `Unearned love and favor from God — receiving good you did not earn and could not repay.` },
      { q: `Does grace mean I can do whatever I want?`, a: `No. Grace is not permission to do wrong; it is love that changes you from the inside, which usually leads away from it.` },
      { q: `How is grace different from mercy?`, a: `Mercy is not getting the punishment you deserve; grace is getting the good you do not deserve. They go together.` },
    ],
    related: ['does-god-love-me', 'what-is-the-gospel'],
  },

  {
    slug: 'why-do-i-need-jesus-if-im-a-good-person',
    question: `Why do I need Jesus if I'm a good person?`,
    category: 'Salvation',
    updated: '2026-07-06',
    answer: `Christianity does not say you are worthless — it says "good enough" was never the standard, for anyone. The point is not that you are terrible, but that none of us fully lives up to even our own ideals, and Jesus offers relationship, not just moral improvement. It is less about being bad and more about being loved.`,
    body: [
      { h: `Everyone falls short of their own standard`, p: `You do not have to be a villain to sense the gap. Most honest people admit they do not fully live up to what they know is right. The bar is not "better than average"; it is perfect, and no one clears it.` },
      { h: `It is about relationship, not a report card`, p: `Jesus does not offer mainly to make you a nicer person. He offers connection with God — something being good, on its own, cannot manufacture. Good people can still be far from God.` },
      { h: `Grace is for good people too`, p: `The gift is not only for the obviously broken. It is for the respectable, the moral, the "I'm basically fine" — all of whom are also invited to receive rather than earn.` },
    ],
    scriptures: [
      { ref: `Romans 3:23`, text: `For all have sinned and fall short of the glory of God.` },
      { ref: `Ephesians 2:8-9`, text: `For it is by grace you have been saved, through faith... not by works, so that no one can boast.` },
    ],
    faqs: [
      { q: `Isn't being a good person enough?`, a: `Christianity says goodness is real but not the point — the offer is relationship with God, which good behavior alone cannot create.` },
      { q: `Does Christianity think I'm a bad person?`, a: `No. It says everyone, good and bad alike, falls short of perfection and is equally invited into grace.` },
      { q: `So do good works matter at all?`, a: `Yes — but as a response to being loved, not as the way to earn it. Grace comes first; good living flows from it.` },
    ],
    related: ['what-is-grace', 'how-do-i-become-a-christian'],
  },

  {
    slug: 'does-god-answer-prayer',
    question: `Does God answer prayer?`,
    category: 'Prayer',
    updated: '2026-07-06',
    answer: `Christianity teaches that God hears and answers prayer — but not like a vending machine. Sometimes the answer is yes, sometimes no, sometimes wait. The promise is not that you always get what you ask, but that you are always heard, and that God works for good even through the answers you did not want.`,
    body: [
      { h: `Heard is the first promise`, p: `Before results, the Bible's core claim is that God listens — that no honest prayer disappears into silence. You are heard even when the answer is not yet clear.` },
      { h: `"No" and "wait" are answers too`, p: `A loving parent does not grant every request. Some unanswered prayers, looking back, were mercies. God answering wisely is better than God answering instantly.` },
      { h: `Prayer changes the one praying`, p: `Prayer is not only about outcomes; it is a relationship. Many people find that even when circumstances do not change, they do — gaining peace, perspective, or strength to endure.` },
    ],
    scriptures: [
      { ref: `1 John 5:14`, text: `This is the confidence we have in approaching God: that if we ask anything according to his will, he hears us.` },
      { ref: `Matthew 7:7`, text: `Ask and it will be given to you; seek and you will find; knock and the door will be opened.` },
    ],
    faqs: [
      { q: `Why do some prayers go unanswered?`, a: `Christianity frames "no" and "wait" as real answers from a wise, loving God — not silence. Sometimes an unanswered prayer is later seen as a mercy.` },
      { q: `Does God answer the prayers of non-Christians?`, a: `The Bible shows God responding to honest seekers of all kinds. You do not have to have it all figured out to pray.` },
      { q: `How do I know if God answered?`, a: `Answers come as yes, no, wait, or an unexpected redirect. Looking back over time often makes them clearer than they felt in the moment.` },
    ],
    related: ['how-do-i-start-praying', 'why-does-god-feel-so-far-away'],
  },

  {
    slug: 'what-does-the-bible-say-about-money',
    question: `What does the Bible say about money?`,
    category: 'Money & Giving',
    updated: '2026-07-06',
    answer: `The Bible talks about money constantly — not to shame wealth, but to warn that money makes a terrible master. It is a tool, not a god. Generosity is treated as freedom, greed as a trap, and contentment as worth more than riches. The heart follows the treasure, so watch where yours goes.`,
    body: [
      { h: `Money is a tool, not the enemy`, p: `The Bible does not call money evil — it calls the love of money a root of trouble. Wealth is fine; being owned by it is the danger.` },
      { h: `Generosity is framed as freedom`, p: `Giving is presented not as loss but as liberation — proof that money has not captured you. "It is more blessed to give than to receive" is about the giver's freedom, not just the receiver's gain.` },
      { h: `Contentment beats accumulation`, p: `"Godliness with contentment is great gain." The Bible keeps redirecting from "how much can I get" to "is my heart free" — because where your treasure is, your heart follows.` },
    ],
    scriptures: [
      { ref: `1 Timothy 6:10`, text: `For the love of money is a root of all kinds of evil.` },
      { ref: `Matthew 6:21`, text: `For where your treasure is, there your heart will be also.` },
    ],
    faqs: [
      { q: `Is it a sin to be rich?`, a: `No. The Bible warns against loving money and trusting it, not against having it. Wealth is a responsibility, not a crime.` },
      { q: `Do I have to give money to God or church?`, a: `Generosity is encouraged throughout the Bible as a joyful freedom, not a fee. It is framed as good for the giver, not a toll.` },
      { q: `What does the Bible say about debt or greed?`, a: `It cautions against being enslaved by debt and against greed, and points instead toward contentment and open-handedness.` },
    ],
    related: ['what-is-the-meaning-of-life', 'what-does-the-bible-say-about-anxiety'],
  },

  {
    slug: 'what-does-the-bible-say-about-loneliness',
    question: `What does the Bible say about loneliness?`,
    category: 'Mental Health',
    updated: '2026-07-06',
    answer: `The Bible takes loneliness seriously and answers it two ways: with the promise that God is always present — "I will never leave you" — and with the design that we were made for community, not isolation. You are not meant to do life alone, and even when people are absent, you are not truly abandoned.`,
    body: [
      { h: `The promise of presence`, p: `Again and again, God's answer to fear and isolation is "I am with you." The Bible insists you are never fully alone, even in the moments it feels most true.` },
      { h: `We were made for each other`, p: `From the start, "it is not good for man to be alone." Loneliness is not a personal failing — it is a signal that you were built for connection, and it is worth answering by reaching toward others.` },
      { h: `A first step out`, p: `Isolation deepens itself. Even one honest conversation, one message sent, one community joined can begin to break it. Faith communities exist partly for exactly this.` },
    ],
    scriptures: [
      { ref: `Deuteronomy 31:6`, text: `Be strong and courageous... for the Lord your God goes with you; he will never leave you nor forsake you.` },
      { ref: `Psalm 68:6`, text: `God sets the lonely in families.` },
    ],
    faqs: [
      { q: `Does God care that I'm lonely?`, a: `Yes. The Bible repeatedly promises God's presence to the isolated and describes him as setting the lonely in community.` },
      { q: `Is loneliness a sign something is wrong with me?`, a: `No. It is a normal human signal that you were made for connection — not a flaw, but a pointer toward reaching out.` },
      { q: `What can I actually do about it?`, a: `Small steps: one honest conversation, one message, one community. kinwove exists partly to help people not walk it alone.` },
    ],
    related: ['does-god-love-me', 'why-should-i-go-to-church'],
  },

  {
    slug: 'is-hell-real',
    question: `Is hell real?`,
    category: 'Eternal Life',
    updated: '2026-07-06',
    answer: `The Bible does speak of hell as real — but it is best understood as the tragic possibility of a life fully turned away from God, not a threat God delights in. The emphasis of Scripture is overwhelmingly on the invitation: God "wants everyone to come to repentance." Hell is what he is rescuing people from, not longing to send them to.`,
    body: [
      { h: `Taken seriously, not sensationally`, p: `The Bible treats separation from God as a real and weighty possibility. But the lurid pop-culture image is not the center of the message — the rescue is.` },
      { h: `Freedom makes refusal possible`, p: `A God who honors real freedom is a God whose love can be genuinely refused. Many describe hell less as God locking people out and more as God honoring a "no" some insist on.` },
      { h: `The tone is invitation`, p: `Scripture keeps stressing that God "is patient with you, not wanting anyone to perish." The point of talking about hell is to say: there is a way home, and it is open.` },
    ],
    scriptures: [
      { ref: `2 Peter 3:9`, text: `The Lord is not slow in keeping his promise... he is patient with you, not wanting anyone to perish, but everyone to come to repentance.` },
      { ref: `1 Timothy 2:4`, text: `God our Savior, who wants all people to be saved and to come to a knowledge of the truth.` },
    ],
    faqs: [
      { q: `Does God send people to hell?`, a: `The Bible frames it more as honoring a freely chosen turning-away, with God relentlessly inviting people home rather than eager to condemn.` },
      { q: `How can a loving God allow hell?`, a: `Real love requires real freedom, including the freedom to refuse God. Christianity presents God as doing everything to rescue, not to condemn.` },
      { q: `Should fear of hell be why I follow God?`, a: `Christianity invites people primarily through love and grace, not fear. The healthiest reason to come is that God is good, not just that hell is bad.` },
    ],
    related: ['what-happens-when-you-die', 'is-christianity-the-only-way-to-god'],
  },

  {
    slug: 'how-do-i-know-gods-will-for-my-life',
    question: `How do I know God's will for my life?`,
    category: 'Purpose',
    updated: '2026-07-06',
    answer: `God's will is less a hidden map you have to crack and more a direction you can walk. Most of it is already clear — love God, love people, live with integrity. For the specific decisions, the Bible points to prayer, wisdom, godly counsel, and trusting that God guides people who are genuinely willing to follow.`,
    body: [
      { h: `Most of God's will is not secret`, p: `The Bible spends far more time on how to live than on which job to take. Love, honesty, kindness, humility — start living the clear parts, and the specific ones tend to clarify.` },
      { h: `Guidance, not a treasure hunt`, p: `You do not have to fear "missing" some single hidden plan. God is described as guiding willing people step by step — "he will make your paths straight" — not hiding the ball.` },
      { h: `Practical ways to discern`, p: `Pray honestly, seek wisdom in Scripture, ask trusted people who know you, notice your gifts and the needs around you, and take a faithful next step. Direction usually comes as you move, not before.` },
    ],
    scriptures: [
      { ref: `Proverbs 3:5-6`, text: `Trust in the Lord with all your heart... in all your ways submit to him, and he will make your paths straight.` },
      { ref: `Micah 6:8`, text: `And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.` },
    ],
    faqs: [
      { q: `What if I make the wrong decision?`, a: `Christianity presents God as able to guide and redeem willing people even through mistakes. You are not one wrong choice away from ruining a hidden plan.` },
      { q: `Does God have one specific plan for me?`, a: `The Bible emphasizes God's character and clear commands more than a single secret blueprint, while trusting he guides the details as you walk with him.` },
      { q: `How do I hear God's guidance?`, a: `Through prayer, Scripture, wise counsel, your circumstances and gifts — and a willingness to actually follow what becomes clear.` },
    ],
    related: ['what-is-the-meaning-of-life', 'how-do-i-start-praying'],
  },

  {
    slug: 'what-does-it-mean-to-be-born-again',
    question: `What does it mean to be born again?`,
    category: 'Salvation',
    updated: '2026-07-06',
    answer: `"Born again" is Jesus's own phrase for a fresh start so deep it is like beginning life over. It is not about religious behavior but inner renewal — God giving you a new heart and a new beginning, no matter your past. Less turning over a new leaf, more receiving a new life.`,
    body: [
      { h: `Jesus's own image`, p: `A religious leader named Nicodemus asked Jesus how to enter God's kingdom, and Jesus answered, "you must be born again." It is his picture of a beginning so total it is like a second birth.` },
      { h: `Inner change, not just behavior`, p: `It is not mainly about joining a religion or cleaning up your habits. The Bible describes God giving "a new heart" — a change that starts inside and works outward.` },
      { h: `A real fresh start`, p: `Whatever your history, being born again means the slate is genuinely new. Not your old self trying harder, but a new life received as a gift.` },
    ],
    scriptures: [
      { ref: `John 3:3`, text: `Jesus replied, "Very truly I tell you, no one can see the kingdom of God unless they are born again."` },
      { ref: `2 Corinthians 5:17`, text: `Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!` },
    ],
    faqs: [
      { q: `Does "born again" mean joining a specific denomination?`, a: `No. It is Jesus's term for spiritual rebirth — a new beginning through him — not a label for one church group.` },
      { q: `How do I get "born again"?`, a: `The Bible ties it to turning to Jesus in faith. It is God's work in you, received rather than achieved.` },
      { q: `Does it erase my past?`, a: `That is the point — a genuinely new start. The old is described as gone, the new as here.` },
    ],
    related: ['how-do-i-become-a-christian', 'am-i-too-far-gone-for-god'],
  },

  {
    slug: 'why-should-i-go-to-church',
    question: `Why should I go to church?`,
    category: 'Church',
    updated: '2026-07-06',
    answer: `You do not have to attend church to have faith — but Christianity was never meant to be done alone. Church, at its best, is people carrying each other: encouragement, honesty, belonging, and shared purpose. It is less a building or a performance and more a family you are not meant to grow without.`,
    body: [
      { h: `Faith was designed to be shared`, p: `The Bible assumes community, not solo spirituality — "let us encourage one another." We grow, are held accountable, and are carried in ways isolation can never provide.` },
      { h: `It is people, not a building`, p: `Church is not the architecture or the service; it is the people. At its best it is a place to be known, to serve, and to belong — especially on the days faith feels thin.` },
      { h: `Honest about its flaws`, p: `Churches are full of imperfect people and sometimes get it wrong. That is worth naming. But a good community — flawed and real — still beats trying to do life and faith entirely alone.` },
    ],
    scriptures: [
      { ref: `Hebrews 10:24-25`, text: `And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together... but encouraging one another.` },
      { ref: `Ecclesiastes 4:9-10`, text: `Two are better than one... If either of them falls down, one can help the other up.` },
    ],
    faqs: [
      { q: `Can I be a Christian without going to church?`, a: `Yes, faith is personal — but the Bible strongly encourages community, because we are not designed to grow alone.` },
      { q: `What if I've been hurt by a church?`, a: `That is real and worth honoring. Not all communities are healthy; the goal is a good one, not just any one — and it is okay to take time.` },
      { q: `How do I find a good church?`, a: `Look for honesty, grace, and genuine care over performance. kinwove's directory can help you find a community near you.` },
    ],
    related: ['what-does-the-bible-say-about-loneliness', 'how-do-i-become-a-christian'],
  },

  {
    slug: 'what-does-the-bible-say-about-fear',
    question: `What does the Bible say about fear?`,
    category: 'Mental Health',
    updated: '2026-07-06',
    answer: `"Do not be afraid" is the most repeated command in the Bible — said not because life is safe, but because God promises to be with you in it. Scripture does not scold fear; it meets it with presence. The antidote it offers is not pretending you are not afraid, but not facing it alone.`,
    body: [
      { h: `Fear is met with presence, not shame`, p: `Over and over, God's response to frightened people is "I am with you." The point is not to feel no fear, but to know you are not alone in it.` },
      { h: `Courage is fear plus company`, p: `Biblical courage is not the absence of fear; it is moving forward because God goes with you. "Be strong and courageous... for the Lord your God will be with you."` },
      { h: `Perfect love drives out fear`, p: `The deeper answer is love. The more secure you are in being loved by God, the less power fear holds. "There is no fear in love; perfect love drives out fear."` },
    ],
    scriptures: [
      { ref: `Isaiah 41:10`, text: `So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.` },
      { ref: `1 John 4:18`, text: `There is no fear in love. But perfect love drives out fear.` },
    ],
    faqs: [
      { q: `Why does the Bible say "do not fear" so often?`, a: `Because fear is universal — and God's repeated answer is his presence: you do not face it alone.` },
      { q: `Does faith mean I'll never be afraid?`, a: `No. It means fear does not have the final word. Courage in the Bible is acting while afraid, trusting God is with you.` },
      { q: `What verse helps most with fear?`, a: `Isaiah 41:10 — "do not fear, for I am with you" — is one many people hold onto.` },
    ],
    related: ['what-does-the-bible-say-about-anxiety', 'does-god-love-me'],
  },

  {
    slug: 'why-does-god-feel-so-far-away',
    question: `Why does God feel so far away?`,
    category: 'Faith & Doubt',
    updated: '2026-07-06',
    answer: `Feeling distant from God is one of the most common experiences of faith — and feeling far is not the same as being far. Even great believers went through it; some of the Psalms are written from exactly that place. The distance is usually in the feeling, not the reality, and it rarely lasts.`,
    body: [
      { h: `You are in good company`, p: `The Psalms cry out "why do you hide your face?" — and they are Scripture. Feeling God's absence is not a sign you have failed at faith; it is part of many honest faith journeys.` },
      { h: `Feelings are not the measure`, p: `God's nearness is described as a fact, not a mood — "I will never leave you." Emotions rise and fall; the promise does not. You can be held even when you do not feel it.` },
      { h: `What can help`, p: `Keep showing up honestly — even prayers of "I don't feel you, but I'm still here" count. Community, Scripture, and time often bring the felt sense back. Dry seasons usually pass.` },
    ],
    scriptures: [
      { ref: `Psalm 13:1`, text: `How long, Lord? Will you forget me forever? How long will you hide your face from me?` },
      { ref: `Deuteronomy 31:8`, text: `The Lord himself goes before you and will be with you; he will never leave you nor forsake you.` },
    ],
    faqs: [
      { q: `Does God actually leave people?`, a: `The Bible promises the opposite — that God never leaves. Feeling distant is common, but it is described as a feeling, not the reality.` },
      { q: `Did I do something to push God away?`, a: `Not necessarily. Spiritual dryness happens to almost everyone, often for no clear reason. It is not proof of failure.` },
      { q: `How do I feel close to God again?`, a: `Keep showing up honestly in prayer, community, and Scripture. The felt closeness usually returns with time; the promise holds in the meantime.` },
    ],
    related: ['how-can-i-believe-when-i-have-doubts', 'does-god-answer-prayer'],
  },

  {
    slug: 'what-is-faith',
    question: `What is faith?`,
    category: 'Faith & Doubt',
    updated: '2026-07-06',
    answer: `Faith is not pretending to be certain about things you cannot see. It is trust — leaning your weight on what you have good reason to believe, even without total proof. You already live by faith every day: in people, in chairs, in tomorrow. Faith in God is that same trust, aimed higher.`,
    body: [
      { h: `Trust, not blind certainty`, p: `Faith is often caricatured as believing without reason. Biblically it is closer to trust — confidence based on what you have come to know of God's character, not a leap into the dark.` },
      { h: `You already live by faith`, p: `You trust a chair to hold you, a friend to keep a promise, a pilot you have never met. None of it is total certainty. Faith is not foreign to you — it is how you already move through life.` },
      { h: `Faith and doubt can coexist`, p: `Faith does not require the absence of questions. It is leaning toward trust while still holding some doubts — and that is a normal, honest kind of belief, not a lesser one.` },
    ],
    scriptures: [
      { ref: `Hebrews 11:1`, text: `Now faith is confidence in what we hope for and assurance about what we do not see.` },
      { ref: `Mark 9:24`, text: `Immediately the boy's father exclaimed, "I do believe; help me overcome my unbelief!"` },
    ],
    faqs: [
      { q: `Is faith the same as blind belief?`, a: `No. Biblical faith is trust grounded in reasons and in God's character, not belief with your eyes shut.` },
      { q: `Can I have faith and still doubt?`, a: `Yes. Faith and doubt regularly coexist. Leaning toward trust while holding questions is a normal form of belief.` },
      { q: `How do I grow in faith?`, a: `The same way you grow any trust — by getting to know the person. Prayer, Scripture, and experience deepen it over time.` },
    ],
    related: ['how-can-i-believe-when-i-have-doubts', 'is-there-evidence-that-god-exists'],
  },

  {
    slug: 'how-do-i-forgive-someone-who-hurt-me',
    question: `How do I forgive someone who hurt me?`,
    category: 'Relationships',
    updated: '2026-07-06',
    answer: `Forgiveness is not saying what happened was okay, forgetting it, or forcing reconciliation. It is choosing to release the debt and hand the desire for revenge to God, for your own freedom as much as anything. It is usually a process, not a single moment — and it does not mean the wound was not real.`,
    body: [
      { h: `What forgiveness is not`, p: `It is not excusing, forgetting, or automatically restoring trust with someone unsafe. You can forgive and still set boundaries. Forgiveness releases the offense; it does not deny it.` },
      { h: `It is mostly for you`, p: `Holding onto revenge keeps you chained to the person who hurt you. Forgiveness hands that weight to God — "leave room for God's justice" — and frees you to stop carrying it.` },
      { h: `A process, not a switch`, p: `Deep hurts rarely forgive in one moment. It is often a decision you make again and again, with God's help, until the grip loosens. That is normal, not failure.` },
    ],
    scriptures: [
      { ref: `Colossians 3:13`, text: `Bear with each other and forgive one another... Forgive as the Lord forgave you.` },
      { ref: `Ephesians 4:32`, text: `Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.` },
    ],
    faqs: [
      { q: `Does forgiving mean I have to reconcile?`, a: `No. Forgiveness releases the offense; reconciliation requires trust and safety, which are not always wise or possible.` },
      { q: `What if I don't feel like forgiving?`, a: `Forgiveness starts as a choice, not a feeling. The feelings often follow later, sometimes long after the decision.` },
      { q: `How does God's forgiveness relate to mine?`, a: `The Bible ties them together — we forgive because we have been forgiven so much ourselves. His grace fuels ours.` },
    ],
    related: ['will-god-forgive-me', 'what-is-grace'],
  },

  {
    slug: 'why-did-jesus-have-to-die',
    question: 'Why did Jesus have to die?',
    category: 'Jesus Christ',
    updated: '2026-07-09',
    answer:
      `Christianity's central claim is that the cross was not an accident but a rescue: Jesus willingly took on himself the weight of human wrong so that forgiveness could be real rather than pretended. Justice and mercy meet there — sin is taken seriously, and people are loved anyway. His death absorbs what we could not fix ourselves.`,
    body: [
      { h: `Forgiveness always costs someone something`, p: `When someone wrongs you deeply and you forgive them, you absorb the cost — the debt does not vanish, you carry it. The cross is that same logic at full scale: God does not wave sin away as if it never mattered. He absorbs it himself. That is why Christians call it grace rather than leniency.` },
      { h: `It was chosen, not suffered helplessly`, p: `The Gospels are insistent on this: Jesus was not cornered by events. He set his face toward Jerusalem knowing what waited there, and said plainly that no one takes his life from him — he lays it down. Whatever else the cross is, it is a decision made out of love, not a tragedy that got out of hand.` },
      { h: `The death is only half the claim`, p: `Christianity never presents the cross alone — it presents cross and resurrection together. The death deals with what is broken; the resurrection announces that death and failure do not get the last word. If you are weighing this, weigh both. One without the other is not the Christian message.` },
    ],
    scriptures: [
      { ref: `John 10:18`, text: `No one takes it from me, but I lay it down of my own accord. I have authority to lay it down and authority to take it up again.` },
      { ref: `Romans 5:8`, text: `But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.` },
      { ref: `1 Peter 2:24`, text: `He himself bore our sins in his body on the cross, so that we might die to sins and live for righteousness; by his wounds you have been healed.` },
    ],
    faqs: [
      { q: `Couldn't God just forgive without a death?`, a: `The Christian answer is that real forgiveness always absorbs a real cost — pretending wrong never happened is not forgiveness, it is denial. The cross is God absorbing the cost himself rather than passing it on.` },
      { q: `Was Jesus's death a punishment from an angry God?`, a: `The New Testament frames it as God's own initiative and love — Father and Son acting together to rescue, not a reluctant victim appeasing a furious deity. "God so loved the world" is the stated motive.` },
      { q: `What does his death actually change for me?`, a: `Christianity claims it makes forgiveness available as a gift: your record does not have to be carried, hidden, or paid off. It was dealt with. Receiving that is what faith means.` },
    ],
    related: ['what-is-the-gospel', 'is-the-resurrection-of-jesus-real', 'what-is-grace'],
  },

  {
    slug: 'what-is-sin',
    question: 'What is sin, really?',
    category: 'Salvation',
    updated: '2026-07-09',
    answer:
      `Sin is not primarily rule-breaking — it is relationship-breaking. The Bible's word means "missing the mark": living turned away from God and, usually, at cost to other people and yourself. That is why the answer to sin is not trying harder but coming home — it is a fracture that gets healed, not a score that gets settled.`,
    body: [
      { h: `Less like a crime, more like a fracture`, p: `Modern ears hear "sin" as a list of banned behaviors. Scripture treats it as something deeper: a bent-away-ness from the God who made you, which then shows up in behaviors. Jesus was hardest not on obvious rule-breakers but on people whose hearts were far away while their conduct looked clean.` },
      { h: `Why the Bible refuses to grade on a curve`, p: `Romans says all have sinned — the saint and the scoundrel alike. That sounds harsh until you see what it does: it removes the ranking system entirely. Nobody gets to look down on anybody. The ground at the foot of the cross is level, which is bad news for pride and very good news for everyone else.` },
      { h: `The diagnosis exists for the sake of the cure`, p: `Christianity talks about sin the way a doctor talks about a tumor — not to shame you, but because naming it is the first step to healing it. Any version of faith that uses sin to crush people has lost the plot. The point of the diagnosis is that a cure exists, and it is offered freely.` },
    ],
    scriptures: [
      { ref: `Romans 3:23–24`, text: `For all have sinned and fall short of the glory of God, and all are justified freely by his grace through the redemption that came by Christ Jesus.` },
      { ref: `Isaiah 53:6`, text: `We all, like sheep, have gone astray, each of us has turned to our own way; and the Lord has laid on him the iniquity of us all.` },
      { ref: `1 John 1:9`, text: `If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness.` },
    ],
    faqs: [
      { q: `Are some sins worse than others?`, a: `Scripture does distinguish consequences — some wrongs wound more deeply — but it refuses a ranking system that lets anyone claim superiority. All of it separates; all of it is forgivable.` },
      { q: `Is being tempted the same as sinning?`, a: `No. Jesus himself was tempted and did not sin. Temptation is the pull; sin is the yielding. Feeling the pull is human, not guilt.` },
      { q: `What do I do about my sin?`, a: `Bring it into the light rather than managing it in the dark. Confession — honest naming before God — is met with forgiveness, not humiliation. That is the consistent promise.` },
    ],
    related: ['what-is-repentance', 'will-god-forgive-me', 'why-do-i-need-jesus-if-im-a-good-person'],
  },

  {
    slug: 'what-is-repentance',
    question: 'What does it mean to repent?',
    category: 'Salvation',
    updated: '2026-07-09',
    answer:
      `Repentance is a change of direction, not a session of self-hatred. The biblical word means to turn — to stop walking away from God and start walking toward him. It involves honestly naming what is wrong, but its energy is hope, not shame: you turn because someone is waiting for you, gladly.`,
    body: [
      { h: `The word means "turn around"`, p: `In both Hebrew and Greek, repentance is movement language — a turning, a homecoming. It is less "feel terrible about yourself" and more "you are headed the wrong way; come back." The feeling that matters is not self-loathing but the dawning sense that home is better than where you were going.` },
      { h: `The father runs — that is the tone of it`, p: `Jesus told a story about a son who blew his inheritance and rehearsed a groveling apology on the road home. He never got to finish it. The father saw him far off and ran. That story is Jesus's own picture of what repentance meets: not a lecture, not probation — a running father and a feast.` },
      { h: `It is a practice, not a one-time event`, p: `Turning happens at the start of faith and then keeps happening — small course corrections for the rest of your life. Christians repent regularly not because grace runs out but because turning back quickly beats drifting far. It gets less dramatic and more natural, like steering.` },
    ],
    scriptures: [
      { ref: `Luke 15:20`, text: `But while he was still a long way off, his father saw him and was filled with compassion for him; he ran to his son, threw his arms around him and kissed him.` },
      { ref: `Acts 3:19`, text: `Repent, then, and turn to God, so that your sins may be wiped out, that times of refreshing may come from the Lord.` },
      { ref: `2 Corinthians 7:10`, text: `Godly sorrow brings repentance that leads to salvation and leaves no regret, but worldly sorrow brings death.` },
    ],
    faqs: [
      { q: `Is repentance just feeling guilty?`, a: `No — guilt can even be a counterfeit of it. Scripture distinguishes godly sorrow, which turns and moves toward God, from worldly sorrow, which just spirals. Repentance is the turning, not the wallowing.` },
      { q: `Do I have to fix myself before coming to God?`, a: `The order is the opposite: you come as you are, and the turning and mending happen in relationship with him. The father ran before the apology was finished.` },
      { q: `What if I keep failing at the same thing?`, a: `Then you keep turning back. Jesus told Peter to forgive seventy-seven times — a picture of God's own patience. Repeated struggle met with repeated return is a normal Christian life, not a failed one.` },
    ],
    related: ['what-is-sin', 'am-i-too-far-gone-for-god', 'how-do-i-become-a-christian'],
  },

  {
    slug: 'what-does-the-bible-say-about-grief',
    question: 'What does the Bible say about grief and losing someone?',
    category: 'Mental Health',
    updated: '2026-07-09',
    answer:
      `The Bible treats grief as love with nowhere to go — real, heavy, and nothing to apologize for. Jesus himself wept at a friend's grave even knowing what came next. Scripture offers no timetable and no shame, but it does offer two things: a God described as near to the brokenhearted, and a hope that death does not get the final word.`,
    body: [
      { h: `Jesus wept — that is not a small detail`, p: `At the tomb of Lazarus, standing minutes from raising him, Jesus cried. Grief is not a failure of faith; the founder of the faith grieved. Whatever anyone has told you about needing to be strong or "having enough faith," the shortest verse in the Bible quietly says otherwise.` },
      { h: `The Psalms give you words when you have none`, p: `Nearly a third of the Psalms are laments — raw, unedited grief addressed straight to God. "How long, Lord?" is scripture. You are allowed to bring God the anger, the numbness, and the questions. The Bible does not ask you to perform okay-ness; it hands you a vocabulary for not being okay.` },
      { h: `Grieving with hope is still grieving`, p: `Paul told grieving believers they do not mourn "as those who have no hope" — but notice he assumed they would mourn. Christian hope does not skip the valley; it walks through it believing reunion and resurrection are real. The sorrow and the hope sit side by side, and both are honest.` },
    ],
    scriptures: [
      { ref: `John 11:35`, text: `Jesus wept.` },
      { ref: `Psalm 34:18`, text: `The Lord is close to the brokenhearted and saves those who are crushed in spirit.` },
      { ref: `1 Thessalonians 4:13`, text: `Brothers and sisters, we do not want you to be uninformed about those who sleep in death, so that you do not grieve like the rest of mankind, who have no hope.` },
      { ref: `Revelation 21:4`, text: `He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away.` },
    ],
    faqs: [
      { q: `Is it wrong to be angry at God after a loss?`, a: `No. The Psalms model exactly that — grief and protest brought directly to God rather than hidden from him. He is described as receiving it, not punishing it.` },
      { q: `How long is grief supposed to last?`, a: `Scripture gives no deadline. People in the Bible mourned for extended seasons, and no one is rebuked for grieving too long. Grief has its own pace; God stays for all of it.` },
      { q: `Will I see the person I lost again?`, a: `Christian hope says yes for those in Christ — resurrection and reunion are core promises, not poetic flourishes. That hope does not erase the ache now, but it changes what the ache means.` },
    ],
    related: ['what-happens-when-you-die', 'what-does-the-bible-say-about-depression', 'why-does-god-allow-suffering'],
  },

  {
    slug: 'what-does-the-bible-say-about-addiction',
    question: 'What does the Bible say about addiction?',
    category: 'Mental Health',
    updated: '2026-07-09',
    answer:
      `The Bible does not use the word addiction, but it knows the experience intimately: doing the thing you hate, being mastered by what promised freedom. It responds without disgust — offering grace instead of shame, community instead of isolation, and a God who is patient with relapse. Faith and practical help, like recovery programs and counseling, belong together.`,
    body: [
      { h: `Paul described the trap exactly`, p: `"I do not do the good I want to do, but the evil I do not want to do — this I keep on doing." That is Romans 7, and anyone in addiction recognizes it instantly. The Bible is not naive about compulsion. It describes the divided will with more honesty than most modern writing, and without a trace of contempt.` },
      { h: `Shame is the fuel; grace cuts the fuel line`, p: `Addiction thrives in secrecy and self-hatred — you use to numb the shame of using. Grace attacks that engine directly: you are loved as-is, before you are fixed. That is why confession to safe people and to God is so central to recovery. What comes into the light loses its leverage in the dark.` },
      { h: `God works through means — use all of them`, p: `Seeking help is not a lack of faith. Recovery programs, counselors, medication, sponsors, honest community — Christians see these as instruments of grace, not alternatives to it. Twelve-step programs themselves grew from Christian soil: admitting powerlessness and turning to a higher power is an old, old road.` },
    ],
    scriptures: [
      { ref: `Romans 7:15, 24–25`, text: `I do not understand what I do. For what I want to do I do not do, but what I hate I do… What a wretched man I am! Who will rescue me from this body that is subject to death? Thanks be to God, who delivers me through Jesus Christ our Lord!` },
      { ref: `1 Corinthians 6:12`, text: `"I have the right to do anything," you say — but not everything is beneficial. "I have the right to do anything" — but I will not be mastered by anything.` },
      { ref: `2 Corinthians 12:9`, text: `My grace is sufficient for you, for my power is made perfect in weakness.` },
    ],
    faqs: [
      { q: `Is addiction a sin or a disease?`, a: `It is rarely useful to force that choice. It involves the body, the brain, wounds, and the will all at once. The Bible's category is bondage — and its posture is rescue and compassion, not blame-sorting.` },
      { q: `Does relapse mean God has given up on me?`, a: `No. Scripture's picture is a father who keeps receiving a returning child. Recovery for most people includes falls; each return to the light counts, and none of them exhausts grace.` },
      { q: `Should I get professional help or just pray?`, a: `Both. Prayer and practical means are allies, not rivals. Seeing a counselor or joining a recovery group is often exactly how the prayer gets answered.` },
    ],
    related: ['am-i-too-far-gone-for-god', 'what-is-grace', 'what-does-the-bible-say-about-depression'],
  },

  {
    slug: 'how-does-god-speak-to-us-today',
    question: 'How does God speak to us today?',
    category: 'Prayer',
    updated: '2026-07-09',
    answer:
      `Christians believe God still speaks — most reliably through the Bible, and also through prayer, wise counsel, circumstances, and the quiet internal nudge many describe as the Holy Spirit. It is rarely an audible voice. The consistent testimony is that his voice today never contradicts what he has already said in scripture.`,
    body: [
      { h: `The Bible is the baseline, not the backup`, p: `If you want to hear God and have never really read the Gospels, start there — that is the one channel Christians across every century agree on. Scripture is described as living and active, and most people who say "God spoke to me" mean a passage suddenly read them as much as they read it.` },
      { h: `The whisper, not the earthquake`, p: `Elijah expected God in wind, earthquake, and fire — and got a low whisper. That story sets the pattern. Most believers describe guidance as quiet: a persistent impression, an unshakeable peace or lack of it, a thought that arrives with unusual weight during prayer. Subtle is normal. Spectacular is rare.` },
      { h: `Test it — you are told to`, p: `Scripture itself says test everything. A genuine nudge from God will not contradict the Bible, will tend toward love and truth rather than ego, and usually survives the scrutiny of wise, mature people you trust. If a "word from God" flatters your worst instincts or isolates you from everyone, be suspicious.` },
    ],
    scriptures: [
      { ref: `1 Kings 19:11–12`, text: `After the earthquake came a fire, but the Lord was not in the fire. And after the fire came a gentle whisper.` },
      { ref: `Hebrews 4:12`, text: `For the word of God is alive and active. Sharper than any double-edged sword… it judges the thoughts and attitudes of the heart.` },
      { ref: `John 10:27`, text: `My sheep listen to my voice; I know them, and they follow me.` },
    ],
    faqs: [
      { q: `Why doesn't God just speak audibly?`, a: `He can, and scripture records it — rarely. The normal pattern, even in the Bible, is quieter: word, whisper, wisdom, community. Many believers suspect the quietness is invitation: it draws you close rather than compelling you from a distance.` },
      { q: `How do I know it's God and not just my own thoughts?`, a: `Test it against scripture, time, and trusted counsel. God's voice tends to sound like Jesus — truthful, loving, sometimes uncomfortable but never degrading. If it contradicts the Bible, it is not him.` },
      { q: `What if I hear nothing at all?`, a: `Silence is a common season, not a verdict. Keep showing up — reading, praying honestly, staying in community. Many of the most trusted voices in Christian history walked long quiet stretches.` },
    ],
    related: ['how-do-i-start-praying', 'does-god-answer-prayer', 'how-do-i-know-gods-will-for-my-life'],
  },

  {
    slug: 'what-is-heaven-like',
    question: 'What is heaven actually like?',
    category: 'Eternal Life',
    updated: '2026-07-09',
    answer:
      `The Bible's picture of heaven is more physical and more interesting than clouds and harps: a renewed creation — "a new heaven and a new earth" — with resurrection bodies, a city, a feast, reunion, and God himself present, wiping away every tear. Less an escape from the world than the world finally made right.`,
    body: [
      { h: `Not clouds — a renewed earth`, p: `The Bible's final chapters do not show souls floating away; they show heaven coming down. Revelation ends with a city descending, God moving in with people, and creation healed. Christian hope is not evacuation from reality but resurrection of it — which is why the promise includes bodies, not just spirits.` },
      { h: `The best analogies are a feast and a homecoming`, p: `Jesus's favorite image for what is coming was a banquet — tables, wine, laughter, invited guests. Add reunion ("we will be with the Lord and with one another") and the picture is less like a formal ceremony and more like the best wedding reception you have ever attended, with no closing time.` },
      { h: `What is absent matters as much as what is present`, p: `No more death, mourning, crying, or pain — the old order gone. Everything that has ever made you say "this is not how it should be" is on the demolition list. And the center of it all is not the scenery but the presence: "God himself will be with them." That presence is what makes it heaven.` },
    ],
    scriptures: [
      { ref: `Revelation 21:1–4`, text: `Then I saw a new heaven and a new earth… God's dwelling place is now among the people, and he will dwell with them… He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain.` },
      { ref: `1 Corinthians 2:9`, text: `What no eye has seen, what no ear has heard, and what no human mind has conceived — the things God has prepared for those who love him.` },
      { ref: `John 14:2–3`, text: `My Father's house has many rooms… I am going there to prepare a place for you… that you also may be where I am.` },
    ],
    faqs: [
      { q: `Will we recognize people we love in heaven?`, a: `The strong implication of scripture is yes — resurrection accounts show a recognizable Jesus, and Paul comforts the grieving with the promise of being together. Reunion is part of the hope, not a folk addition to it.` },
      { q: `Will heaven be boring?`, a: `Only if feasts, exploration, meaningful work, and unbroken relationships bore you. The biblical picture is a renewed creation with things to do — eternal life is described as knowing God, which is a depth to explore, not a waiting room.` },
      { q: `Who gets in?`, a: `Entry is by grace received, not points earned — that is the consistent New Testament claim. It is a gift accepted through trust in Jesus, open to anyone, which is why deathbed thieves and lifelong saints arrive on the same basis.` },
    ],
    related: ['what-happens-when-you-die', 'is-hell-real', 'what-is-the-gospel'],
  },

  {
    slug: 'do-christians-take-the-bible-literally',
    question: 'Do Christians have to take the Bible literally?',
    category: 'Bible',
    updated: '2026-07-09',
    answer:
      `Thoughtful Christians take the Bible seriously, which means reading each part as the kind of writing it is: history as history, poetry as poetry, parable as parable, letters as letters. Nobody thinks God is literally a rock or a hen. The honest question for any passage is not "literal or not?" but "what is this text actually claiming?"`,
    body: [
      { h: `The Bible is a library, not a single book`, p: `Sixty-six documents, written across roughly 1,500 years, in multiple languages and genres: law, chronicle, poetry, prophecy, biography, letters, apocalyptic vision. Reading Psalms the way you read Acts is like reading a love poem the way you read a lab report. Taking scripture seriously starts with respecting what kind of writing you are holding.` },
      { h: `Jesus himself spoke in figures — constantly`, p: `He called himself a door, a vine, bread, and a shepherd, and taught almost entirely in parables. His original hearers did not think he was made of wood. The Bible's own characters model reading with judgment: attentive to metaphor, alert to hyperbole, and dead serious about the truth those figures carry.` },
      { h: `Where it matters most, the claims are meant as fact`, p: `This is not a dodge that dissolves everything into metaphor. The writers plant flags on certain claims as sober history — above all the crucifixion and resurrection, which Paul says were witnessed by hundreds. Christianity stakes itself on those being real events. The genre-reading cuts both ways: poetry is poetry, and testimony is testimony.` },
    ],
    scriptures: [
      { ref: `Psalm 91:4`, text: `He will cover you with his feathers, and under his wings you will find refuge.` },
      { ref: `John 10:9`, text: `I am the gate; whoever enters through me will be saved.` },
      { ref: `1 Corinthians 15:14`, text: `And if Christ has not been raised, our preaching is useless and so is your faith.` },
    ],
    faqs: [
      { q: `Isn't picking genres just picking what's convenient?`, a: `No — genre is a property of the text, not a preference of the reader. Hebrew poetry has recognizable structure; parables are introduced as parables; letters name their senders. Scholars across the spectrum, including skeptical ones, read this way.` },
      { q: `What about the parts that seem to conflict with science?`, a: `Many Christians hold that Genesis answers who and why, not the mechanics of how — ancient cosmology framing theological claims. Christians land in different places here while sharing the same core faith, and the debate is far older than Darwin.` },
      { q: `Can I trust a book I don't fully understand?`, a: `You already trust people you don't fully understand. Start with the Gospels, take them on their own terms, and let the difficult parts wait. Understanding grows by reading, not before it.` },
    ],
    related: ['can-i-trust-the-bible', 'how-do-i-read-the-bible-as-a-beginner'],
  },

  {
    slug: 'what-is-baptism',
    question: 'What is baptism and do I need it?',
    category: 'Church',
    updated: '2026-07-09',
    answer:
      `Baptism is the ancient, physical way Christians go public with faith — going under water as a picture of an old life buried, coming up as a picture of new life begun. Jesus was baptized and told his followers to be. It does not earn salvation, which is by grace, but it marks and celebrates it — like a wedding ring on a marriage.`,
    body: [
      { h: `A funeral and a birth in one motion`, p: `Paul says in baptism you are "buried with Christ and raised with him." Going under the water enacts the death of the old you; rising enacts resurrection. It is theology you can feel — which is precisely why Jesus gave his followers something physical to do, not just something mental to believe.` },
      { h: `It is the going-public moment`, p: `In the early church, baptism was how you crossed the line visibly — the point where private belief became public identity, witnessed by a community that now walked with you. That is still its power. Faith can begin invisibly in a heart, but people are embodied, and commitments become real to us when they are enacted in front of others.` },
      { h: `The thief on the cross settles the "requirement" anxiety`, p: `A criminal dying next to Jesus believed and was promised paradise that day — no baptism possible. Salvation is by grace through faith, full stop. So baptism is not a toll gate; it is obedience and celebration. If you believe, the New Testament's assumption is simply: why wait?` },
    ],
    scriptures: [
      { ref: `Romans 6:4`, text: `We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.` },
      { ref: `Matthew 28:19`, text: `Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.` },
      { ref: `Acts 2:38`, text: `Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of your sins.` },
    ],
    faqs: [
      { q: `Do I have to be baptized to be saved?`, a: `Salvation is by grace through faith — the thief on the cross was saved without baptism. But baptism is Jesus's clear instruction for believers, so the better question than "must I?" is "why wouldn't I?"` },
      { q: `I was baptized as a baby — does that count?`, a: `Christian traditions differ sincerely here. Some honor infant baptism as God's grace preceding your awareness; others practice believer's baptism as a personal public step. Talk with a pastor you trust; this is a family discussion, not a salvation issue.` },
      { q: `How do I actually get baptized?`, a: `Ask at a local church — any pastor will be glad you did. There is usually a short conversation about your faith first, then it happens in a service, a pool, a lake, or wherever there is water and witnesses.` },
    ],
    related: ['how-do-i-become-a-christian', 'what-does-it-mean-to-be-born-again', 'why-should-i-go-to-church'],
  },

  {
    slug: 'what-does-the-bible-say-about-divorce',
    question: 'What does the Bible say about divorce?',
    category: 'Relationships',
    updated: '2026-07-09',
    answer:
      `The Bible treats marriage as sacred and divorce as a tearing God never wanted for anyone — while explicitly acknowledging real grounds like unfaithfulness and abandonment, and never treating divorced people as second-class. If you are divorced or facing it: God's grace is not reduced for you, and safety from abuse is never unfaithfulness.`,
    body: [
      { h: `What Jesus actually said, and why`, p: `Asked about divorce, Jesus pointed back to the beginning — two becoming one flesh — and called divorce a concession to hardened hearts, not the design. His seriousness was protective: in his world, discarded wives were left destitute. He named unfaithfulness as grounds; Paul later added abandonment. The Bible is realistic that some marriages die.` },
      { h: `Divorce is not the unforgivable sin`, p: `Somewhere along the way, church culture treated divorce as a permanent stain, which scripture never does. God himself is described in Jeremiah as having divorced unfaithful Israel — the metaphor would be impossible if divorce made someone untouchable. Divorced people served, led, and belonged in the early church, and they belong now.` },
      { h: `If you are in danger, leaving is not the sin`, p: `Nothing in the Bible obligates anyone to remain under abuse. The same God called a refuge for the oppressed does not chain the oppressed to their oppressor. Getting safe — for you and your children — is wisdom, and churches that say otherwise are misusing the text. Grace covers this ground fully.` },
    ],
    scriptures: [
      { ref: `Matthew 19:8`, text: `Jesus replied, "Moses permitted you to divorce your wives because your hearts were hard. But it was not this way from the beginning."` },
      { ref: `Malachi 2:16`, text: `"The man who hates and divorces his wife," says the Lord, the God of Israel, "does violence to the one he should protect."` },
      { ref: `Psalm 34:18`, text: `The Lord is close to the brokenhearted and saves those who are crushed in spirit.` },
    ],
    faqs: [
      { q: `Can a divorced person remarry?`, a: `Christian traditions read the texts differently, but many hold remarriage is permitted where there were biblical grounds — and all agree grace meets people in their actual histories. Talk it through with a pastor who knows your story, not just the verses.` },
      { q: `Is divorce ever the right choice?`, a: `Scripture names unfaithfulness and abandonment as grounds, and protection from abuse is a moral necessity. Divorce is always a grief — but sometimes it is the least-bad faithful option in a broken situation.` },
      { q: `Does God still love me after my divorce?`, a: `Completely and undiminished. Divorce is a wound, not a disqualification. God is described as especially near the brokenhearted — which includes the divorced, not everyone except them.` },
    ],
    related: ['how-do-i-forgive-someone-who-hurt-me', 'does-god-love-me', 'will-god-forgive-me'],
  },

  {
    slug: 'what-does-the-bible-say-about-self-worth',
    question: 'What does the Bible say about self-worth?',
    category: 'Purpose',
    updated: '2026-07-09',
    answer:
      `The Bible grounds your worth in something no failure, follower count, or opinion can touch: you are made in the image of God, known before birth, and valued enough that Christ died for you. Your worth is conferred, not earned — which means it also cannot be un-earned. That is a foundation, not a mood.`,
    body: [
      { h: `Worth by design, not by performance`, p: `The Bible's first claim about you is Genesis 1: made in the image of God. Not "valuable once successful" or "worthy if attractive" — imaged, from the start, like every human you will ever meet. Every other measure of worth fluctuates. This one was settled before you did anything at all.` },
      { h: `The price tag argument`, p: `In any market, worth is what someone will pay. The Christian claim is staggering on exactly this point: God judged you worth the cross. "While we were still sinners" — not after cleanup, not at your best — Christ died for us. Whatever your inner critic says, it is now arguing with the price God actually paid.` },
      { h: `Known completely, loved anyway`, p: `Psalm 139 says you were seen and known before birth — every day written down, nothing hidden. Most of us fear that full exposure would end love. The gospel says the opposite happened: the one who knows the very worst of you is the one who moved toward you. That is the only self-worth that can survive being fully known.` },
    ],
    scriptures: [
      { ref: `Genesis 1:27`, text: `So God created mankind in his own image, in the image of God he created them; male and female he created them.` },
      { ref: `Psalm 139:13–14`, text: `For you created my inmost being; you knit me together in my mother's womb. I praise you because I am fearfully and wonderfully made.` },
      { ref: `Romans 5:8`, text: `But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.` },
    ],
    faqs: [
      { q: `Isn't self-worth just pride?`, a: `No — pride is inflating yourself above others; biblical worth is receiving a value God assigned to everyone. Humility is not thinking you are worthless; it is being free enough of the worth question to love people.` },
      { q: `I feel worthless — what do I actually do?`, a: `Feelings lag facts. Read Psalm 139 slowly, tell God honestly how you feel, and let trusted people speak truth to you — and if the darkness is heavy or constant, see a counselor too. God works through help.` },
      { q: `Does God value some people more than others?`, a: `No. The image of God is universal, and the New Testament goes out of its way to flatten every hierarchy — Jew and Greek, slave and free. Nobody outranks you in the economy of grace.` },
    ],
    related: ['does-god-love-me', 'what-is-the-meaning-of-life', 'what-does-the-bible-say-about-depression'],
  },

  {
    slug: 'what-does-the-bible-say-about-rest',
    question: 'What does the Bible say about rest and burnout?',
    category: 'Mental Health',
    updated: '2026-07-09',
    answer:
      `Rest is not a reward for finishing — it is a rhythm God built into creation and modeled himself. The Bible commands a day off (Sabbath), shows Jesus napping in boats and withdrawing from crowds, and diagnoses hurry as a spiritual problem, not a virtue. "Come to me, all you who are weary" is a standing invitation.`,
    body: [
      { h: `Rest is in the design, not the fine print`, p: `God rests on the seventh day of creation — not from exhaustion, but to establish a rhythm. Sabbath later becomes one of the Ten Commandments, sitting alongside "do not murder." Scripture takes rest that seriously. A culture that treats exhaustion as a status symbol is arguing with the design specs of being human.` },
      { h: `Jesus was never in a hurry`, p: `Read the Gospels for pace: Jesus sleeps through a storm, withdraws to lonely places while crowds are still asking for him, and walks everywhere. Carrying the most important mission in history, he was unhurried. If he could leave needs unmet to pray and rest, your inbox can survive a Sabbath too.` },
      { h: `Burnout is often a theology problem`, p: `Underneath chronic overwork is usually a belief: it all depends on me. Sabbath is a weekly protest against that lie — you stop, and the world keeps turning, because God runs it and you do not. Psalm 127 is blunt: it is vain to rise early and stay up late, "for he grants sleep to those he loves."` },
    ],
    scriptures: [
      { ref: `Matthew 11:28–29`, text: `Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me… and you will find rest for your souls.` },
      { ref: `Psalm 127:2`, text: `In vain you rise early and stay up late, toiling for food to eat — for he grants sleep to those he loves.` },
      { ref: `Mark 6:31`, text: `Then, because so many people were coming and going that they did not even have a chance to eat, he said to them, "Come with me by yourselves to a quiet place and get some rest."` },
    ],
    faqs: [
      { q: `Is taking a day off really a spiritual practice?`, a: `Yes — Sabbath is one of the Ten Commandments and one Jesus practiced. Stopping is an act of trust: it declares the world is God's responsibility, not yours alone.` },
      { q: `What does Sabbath look like today?`, a: `Not legalism — Jesus said Sabbath was made for man, not man for Sabbath. Pick a regular stretch to stop working, do what restores you, and enjoy God and people. Rhythm matters more than rules.` },
      { q: `What if I literally can't rest — kids, two jobs, caregiving?`, a: `Scripture's God sees that and is not grading you against someone else's calendar. Start with rest in slivers — minutes of prayer, real sleep where possible — and let others help. The invitation "come to me" fits inside any life.` },
    ],
    related: ['what-does-the-bible-say-about-anxiety', 'what-is-the-meaning-of-life'],
  },

  {
    slug: 'how-do-i-find-a-church',
    question: 'How do I find a church as a beginner?',
    category: 'Church',
    updated: '2026-07-09',
    answer:
      `Look for three things: the Bible taught honestly, people who are warm before they know what you can offer, and grace at the center rather than performance. Visit a few — churches differ widely in style, and style is preference, not doctrine. You can just walk in on a Sunday. Nobody expects you to know anything.`,
    body: [
      { h: `What actually matters (and what doesn't)`, p: `Music volume, building size, and dress code are taste. What matters: Is scripture taught seriously and honestly? Is grace the message, or is it pressure and performance? Do people seem genuinely glad you exist? A small church with warm people beats an impressive one where you stay anonymous — unless anonymity is what you need at first, which is also okay.` },
      { h: `Your first visit, demystified`, p: `You can arrive a few minutes early, sit near the back, and just watch. Singing is optional. Nobody will make you speak, and the offering plate is for regulars, not guests. If anyone asks, "it's my first time" is a complete sentence — and usually gets you a warm welcome. Give a church two or three visits before deciding; one odd Sunday happens everywhere.` },
      { h: `Why bother with church at all`, p: `Because faith was never designed to be practiced alone. The New Testament's word for church means assembly — it is a body, and bodies have parts that need each other. Community is where encouragement, honest questions, prayer when life breaks, and casseroles when it really breaks, actually happen. Online content can teach you; it cannot know you.` },
    ],
    scriptures: [
      { ref: `Hebrews 10:24–25`, text: `And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together, as some are in the habit of doing, but encouraging one another.` },
      { ref: `Acts 2:42`, text: `They devoted themselves to the apostles' teaching and to fellowship, to the breaking of bread and to prayer.` },
    ],
    faqs: [
      { q: `What denomination should I choose?`, a: `As a beginner, don't stress the labels. Find a church that teaches the Bible, centers on Jesus, and treats people with grace. The denominational nuances will make more sense later — and matter less than you think at the start.` },
      { q: `What if I've been hurt by church before?`, a: `That wound is real, and God is not the people who hurt you. Take it slow — maybe start with one trusted person or a small group rather than a big service. A healthy church will give you room to heal, not pressure to perform.` },
      { q: `Do I need to believe before I attend?`, a: `Not at all. Churches are full of people mid-question, and any good one welcomes honest seekers. Attending is exploring, not signing anything.` },
    ],
    related: ['why-should-i-go-to-church', 'how-do-i-become-a-christian', 'what-is-baptism'],
  },

  {
    slug: 'what-is-the-book-of-enoch',
    question: `What is the Book of Enoch, and why isn't it in the Bible?`,
    category: 'Bible',
    updated: '2026-07-18',
    answer:
      `1 Enoch is a real ancient Jewish text — visions of angels, judgment, and a coming "Son of Man" — written centuries before Jesus. It was never hidden or banned: most Jewish and Christian traditions weighed it and did not include it in Scripture, though the Ethiopian Orthodox Church still does. Jude even quotes it.`,
    body: [
      { h: `What the book actually is`, p: `1 Enoch is a collection of Jewish writings from roughly the third century BC onward, attributed to the Enoch of Genesis 5 who "walked with God." Its most famous sections describe angels ("Watchers") who abandoned heaven, the giants that followed, cosmic journeys, and a glorious "Son of Man" who judges the earth. It was widely read in the centuries around Jesus — fragments were found among the Dead Sea Scrolls.` },
      { h: `It was weighed, not hidden`, p: `The internet loves the idea of "books the church banned," but the history is less cinematic. Ancient communities knew Enoch well and most concluded it was valuable but not Scripture — it never appears in the Hebrew Bible's canon lists, and the early church largely reached the same judgment. The Ethiopian Orthodox Tewahedo Church is the notable exception: its canon includes 1 Enoch to this day. Different shelf, not a locked vault.` },
      { h: `Why it still matters for readers of the 66 books`, p: `Jude 1:14–15 quotes 1 Enoch directly, and the New Testament's world — its language about angels, judgment, and the Son of Man — is easier to understand when you know what people were reading at the time. You can take Enoch seriously as history without treating it as doctrine. That is exactly how kinwove's AI companion handles it: it can quote the real text, clearly labeled as outside the 66-book canon.` },
    ],
    scriptures: [
      { ref: `Jude 1:14–15`, text: `Enoch, the seventh from Adam, prophesied about them: "See, the Lord is coming with thousands upon thousands of his holy ones to judge everyone."` },
      { ref: `Genesis 5:24`, text: `Enoch walked faithfully with God; then he was no more, because God took him away.` },
    ],
    faqs: [
      { q: `Was the Book of Enoch removed from the Bible?`, a: `No — it was never in the canon most traditions use, so there was nothing to remove. It circulated widely, was weighed by Jewish and Christian communities, and was not included, though the Ethiopian Orthodox Church does count it as Scripture.` },
      { q: `Is it wrong to read the Book of Enoch?`, a: `No. Many pastors and scholars read it for historical background. The key is reading it as an ancient witness to what people believed, not as a basis for doctrine — the same way you might read other writings from the period.` },
      { q: `Why does Jude quote it if it isn't Scripture?`, a: `Quoting a text approvingly doesn't make the whole text Scripture — Paul quotes pagan poets in Acts 17. Jude cites a line his readers knew to make a true point about judgment.` },
    ],
    related: ['can-i-trust-the-bible', 'do-christians-take-the-bible-literally', 'how-do-i-read-the-bible-as-a-beginner'],
  },
];

export const ANSWERS_BY_SLUG = Object.fromEntries(ANSWERS.map((a) => [a.slug, a]));

// ── Rendering ────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const SITE = 'https://www.kinwove.com';
const HEAD_FONT = "Georgia,'Times New Roman',serif";

function shell({ title, description, canonical, jsonLd, bodyHtml }) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="kinwove">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
<style>
  :root{--ink:#1A1108;--soft:#5A4733;--muted:#9C7B5E;--gold:#B8733A;--parch:#FAF3E2;--cream:#F5EDD8;--line:rgba(26,17,8,0.12)}
  *{box-sizing:border-box}body{margin:0;background:var(--parch);color:var(--ink);font-family:Newsreader,Georgia,serif;line-height:1.65;font-size:18px}
  .bar{background:#1A1108;padding:16px 20px}.bar a{color:#FDF8F0;font-family:${HEAD_FONT};font-size:22px;font-weight:600;text-decoration:none}
  .star{color:#D4A24A;margin-right:2px}
  main{max-width:720px;margin:0 auto;padding:28px 20px 64px}
  .cat{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:10px}
  h1{font-family:${HEAD_FONT};font-size:30px;line-height:1.2;margin:0 0 18px;letter-spacing:-0.01em}
  .answer{background:#fff;border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:12px;padding:18px 20px;font-size:19px;color:var(--ink);margin:0 0 28px}
  h2{font-family:${HEAD_FONT};font-size:21px;margin:30px 0 8px}
  p{margin:0 0 14px;color:var(--soft)}
  blockquote{margin:18px 0;padding:14px 18px;background:var(--cream);border-radius:10px;font-style:italic;color:var(--ink)}
  blockquote .ref{display:block;font-style:normal;font-size:13px;color:var(--gold);font-weight:700;margin-top:8px}
  .faq{margin-top:36px;border-top:1px solid var(--line);padding-top:8px}
  .faq h3{font-family:${HEAD_FONT};font-size:17px;margin:22px 0 4px}
  .cta{display:block;text-align:center;margin:36px 0 8px;background:#1A1108;color:#F5EDD8;text-decoration:none;padding:15px 22px;border-radius:999px;font-weight:600;font-size:16px}
  .related{margin-top:34px;border-top:1px solid var(--line);padding-top:18px}
  .related a{display:block;color:var(--gold);text-decoration:none;font-size:16px;margin:8px 0}
  .foot{margin-top:40px;font-size:13px;color:var(--muted)}.foot a{color:var(--gold);text-decoration:none}
  .updated{font-size:12px;color:var(--muted);margin-top:2px}
</style></head><body>
<div class="bar"><a href="${SITE}"><span class="star">✦</span>kinwove</a></div>
<main>${bodyHtml}</main>
</body></html>`;
}

export function renderAnswerPage(a) {
  const canonical = `${SITE}/answers/${a.slug}`;
  const askUrl = `${SITE}/?q=${encodeURIComponent(a.question)}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: a.question, description: a.answer,
      dateModified: a.updated, datePublished: a.updated,
      author: { '@type': 'Organization', name: 'kinwove' },
      publisher: { '@type': 'Organization', name: 'kinwove', url: SITE },
      mainEntityOfPage: canonical,
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: a.faqs.map((f) => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];
  const related = a.related.map((s) => ANSWERS_BY_SLUG[s]).filter(Boolean);
  const bodyHtml = `
    <div class="cat">${esc(a.category)}</div>
    <h1>${esc(a.question)}</h1>
    <div class="answer">${esc(a.answer)}</div>
    ${a.body.map((s) => `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('')}
    ${a.scriptures.map((s) => `<blockquote>${esc(s.text)}<span class="ref">— ${esc(s.ref)}</span></blockquote>`).join('')}
    <a class="cta" href="${esc(askUrl)}">Ask your own question →</a>
    <div class="faq">
      <div class="cat">Common questions</div>
      ${a.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
    </div>
    ${related.length ? `<div class="related"><div class="cat">Keep exploring</div>${related.map((r) => `<a href="${SITE}/answers/${r.slug}">${esc(r.question)} →</a>`).join('')}</div>` : ''}
    <div class="updated">Last updated ${esc(a.updated)}</div>
    <div class="foot">
      <p style="font-style:italic;line-height:1.7;margin:0 0 10px">kinwove's answers are designed never to invent quotes, statistics, or scripture — every Bible reference is verified against the actual text, and where faithful Christians genuinely disagree, we say so.</p>
      <a href="${SITE}/answers">All questions</a> · <a href="${SITE}">kinwove — honest answers to hard faith questions</a>
    </div>`;
  return shell({
    title: `${a.question} | kinwove`,
    description: a.answer.slice(0, 155),
    canonical, jsonLd, bodyHtml,
  });
}

export function renderAnswerIndex() {
  const canonical = `${SITE}/answers`;
  const jsonLd = [{
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Honest answers to hard faith questions', url: canonical,
  }];
  const bodyHtml = `
    <div class="cat">kinwove answers</div>
    <h1>Honest answers to hard faith questions</h1>
    <p>Real questions about faith, doubt, God, and the Bible — answered honestly, without pressure. Ask your own anytime.</p>
    <div class="related" style="border-top:none;margin-top:20px;padding-top:0">
      ${ANSWERS.map((a) => `<a href="${SITE}/answers/${a.slug}">${esc(a.question)} →</a>`).join('')}
    </div>
    <a class="cta" href="${SITE}">Open kinwove →</a>`;
  return shell({
    title: 'Honest answers to hard faith questions | kinwove',
    description: 'Real, honest answers to hard questions about faith, doubt, suffering, the resurrection, and the Bible — no pressure, no agenda.',
    canonical, jsonLd, bodyHtml,
  });
}
