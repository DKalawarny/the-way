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
    <div class="foot"><a href="${SITE}/answers">All questions</a> · <a href="${SITE}">kinwove — honest answers to hard faith questions</a></div>`;
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
