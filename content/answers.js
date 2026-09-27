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
  // ── For pastors ────────────────────────────────────────────────────────────
  // Every stranger who has ever signed up for kinwove arrived via an AI search
  // engine, and the /answers pages are why — real server-rendered HTML a model
  // can read and cite. There were 48 of them and all 48 were written for
  // seekers, so a pastor could not find kinwove at all.
  //
  // These deliberately target pastoral problems rather than tool queries.
  // "AI sermon generator" is contested by eight dedicated products with
  // exact-match domains; "what do I do when someone leaves my church hurt" is
  // not, and it is closer to what kinwove is actually for.
  {
    slug: 'how-do-i-keep-my-congregation-engaged-between-sundays',
    question: 'How do I keep my congregation engaged between Sundays?',
    category: 'For Pastors',
    updated: '2026-09-21',
    answer:
      'The gap is not attention, it is continuity. Most people leave on Sunday with a real question and no way to keep pulling the thread before it fades by Tuesday. What works is giving them somewhere to take the question during the week, not sending them more content.',
    body: [
      { h: 'The problem is Tuesday, not Sunday',
        p: 'Almost nobody disengages during the sermon. They disengage on Tuesday, when the thing that landed on Sunday meets a week that has no room for it. By the time the next Sunday comes around, the thread is gone and you start again. More announcements and more posts do not fix that, because the issue is not that people forgot — it is that they had nowhere to put what they were thinking.' },
      { h: 'A question travels further than a reminder',
        p: 'One honest question from Sunday, asked again midweek, does more than a devotional nobody opens. It gives someone a reason to think rather than a thing to consume. And the answers tell you something a headcount never will — what your people are actually wrestling with, in their words, while it is still live.' },
      { h: 'Most of what people want to ask, they will not ask you',
        p: 'Not because they distrust you, but because asking the pastor makes a doubt official. People will type a question at eleven at night that they would never raise in a foyer. A church that gives them a private place to ask is not competing with pastoral conversation — it is usually the thing that leads to one.' },
    ],
    scriptures: [
      { ref: 'Acts 17:11', text: 'Now the Berean Jews were of more noble character than those in Thessalonica, for they received the message with great eagerness and examined the Scriptures every day to see if what Paul said was true.' },
      { ref: 'Deuteronomy 6:7', text: 'Impress them on your children. Talk about them when you sit at home and when you walk along the road, when you lie down and when you get up.' },
    ],
    faqs: [
      { q: 'Is a church app just another thing nobody opens?', a: 'Usually, when it is built around announcements. Attendance tools get opened when there is an event. Something people take a real question to gets opened when they have one, which is more often and less predictable.' },
      { q: 'How do I know if it is working?', a: 'Not by installs. By whether questions are being asked midweek, and whether they are the kind of questions people were not asking out loud before.' },
      { q: 'Does this replace small groups?', a: 'No, and it should not try. It tends to surface what someone brings to a group rather than substitute for the room.' },
    ],
    related: ['what-do-i-do-when-someone-leaves-my-church-hurt', 'should-my-church-use-ai'],
  },

  {
    slug: 'what-do-i-do-when-someone-leaves-my-church-hurt',
    question: 'What do I do when someone leaves my church hurt?',
    category: 'For Pastors',
    updated: '2026-09-21',
    answer:
      'Most people who leave hurt do not leave loudly. They step back from serving, then from attending, then they are gone, and the first real conversation about it never happens. What helps is making it possible to stay connected without having to stage a confrontation first.',
    body: [
      { h: 'They rarely tell you the real reason',
        p: 'The stated reason is usually a scheduling change or a season of busyness. The actual reason is often something smaller and sharper — a comment, being overlooked, carrying too much for too long without anyone noticing. By the time someone can name it, they have usually already left, and the naming happens to a friend rather than to you.' },
      { h: 'Burnout in a volunteer looks like commitment right up until it does not',
        p: 'The people who leave hurt are very often the ones who were doing the most. They say yes, they cover gaps, they are dependable, and then they are gone. The warning sign is not complaining — it is a reliable person going quiet.' },
      { h: 'The door back has to be low',
        p: 'Someone who left hurt will not book a meeting with the pastor. They might read something. They might ask a question anonymously at midnight. Keeping a low, undramatic way to stay near a church matters more than any exit conversation, because it does not require them to decide anything first.' },
    ],
    scriptures: [
      { ref: 'Psalm 34:18', text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.' },
      { ref: 'Galatians 6:2', text: 'Carry each other\u2019s burdens, and in this way you will fulfill the law of Christ.' },
    ],
    faqs: [
      { q: 'Should I chase someone who has stepped back?', a: 'Contact them, but without an agenda about returning. A message that asks how they are and expects nothing lands very differently from one that is trying to recover an attender.' },
      { q: 'What if I was part of the hurt?', a: 'Then saying so plainly, without explaining why it happened, does more than any process. Most people are not waiting for an explanation. They are waiting to hear that it was seen.' },
      { q: 'How do I stop this happening to the next person?', a: 'Watch the people carrying the most, and check on them when nothing is wrong. Church hurt concentrates among the committed.' },
    ],
    related: ['how-do-i-pastor-someone-who-is-deconstructing', 'how-do-i-keep-my-congregation-engaged-between-sundays'],
  },

  {
    slug: 'how-do-i-pastor-someone-who-is-deconstructing',
    question: 'How do I pastor someone who is deconstructing?',
    category: 'For Pastors',
    updated: '2026-09-21',
    answer:
      'Deconstruction is usually not a rejection of Jesus. It is the collapse of a particular account of him, often one that was over-certain. The fastest way to lose someone is to answer questions they have not asked yet, and the surest way to keep them is to let the questions stay open longer than is comfortable.',
    body: [
      { h: 'Early pushback loses them permanently',
        p: 'Someone who has started asking hard questions has usually been asking them privately for a long time before you hear one. The first time they say it out loud is a test of whether it is safe to say the second one. Correcting quickly, even gently, answers that test in the wrong direction.' },
      { h: 'It is usually a person, not an argument',
        p: 'Very few people deconstruct because of a book. Most deconstruct because something happened — a leader who was not what they seemed, a prayer that went unanswered in the worst way, a church that closed ranks. The intellectual questions come later and are real, but they are rarely the root.' },
      { h: 'Honest uncertainty is more credible than a tidy answer',
        p: 'Saying you do not know, when you do not, buys more trust than any apologetic. People in this position have usually had enough confident answers. What they have not had is someone who could stay in the room without needing the question resolved.' },
    ],
    scriptures: [
      { ref: 'Mark 9:24', text: 'Immediately the boy\u2019s father exclaimed, "I do believe; help me overcome my unbelief!"' },
      { ref: 'John 20:27', text: 'Then he said to Thomas, "Put your finger here; see my hands. Reach out your hand and put it into my side. Stop doubting and believe."' },
    ],
    faqs: [
      { q: 'Should I recommend apologetics resources?', a: 'Only if they ask. Handing someone material unprompted usually reads as being handled rather than heard.' },
      { q: 'What if they stop attending?', a: 'Attendance is often the last thing to go and the first thing to come back. Staying in contact while they are not attending matters more than getting them back in a seat.' },
      { q: 'Is deconstruction the same as losing faith?', a: 'Frequently not. A good number of people who go through it end up with a faith that holds better, precisely because it survived the questions.' },
    ],
    related: ['what-do-i-do-when-someone-leaves-my-church-hurt', 'how-can-i-believe-when-i-have-doubts'],
  },

  {
    slug: 'should-my-church-use-ai',
    question: 'Should my church use AI?',
    category: 'For Pastors',
    updated: '2026-09-21',
    answer:
      'For research and preparation, it is a reasonable tool and a fast one. For anything that speaks to your congregation in your name, the risk is not that it writes badly — it is that it writes confidently about things it has got wrong, and nobody checks.',
    body: [
      { h: 'The real failure mode is confident invention',
        p: 'A language model will produce a quotation from a commentator who never wrote it, in the right register, with the right cadence. It does not sound uncertain when it is wrong. That is manageable for your own study, where you check sources anyway, and much less manageable when the output goes straight to a congregation.' },
      { h: 'Preparation is a different question from proclamation',
        p: 'Using AI to find every place a word appears, or to summarise four views on a passage before you pick one, is closer to a concordance than to ghostwriting. Using it to produce the sermon is a different act, and worth being honest with yourself about which one you are doing.' },
      { h: 'Your people will ask it anyway',
        p: 'Whether or not a church adopts AI, its members are already typing their hardest questions into one at eleven at night. The practical question is not whether AI enters the conversation, but whether anything in it points back toward a real person in a real church.' },
    ],
    scriptures: [
      { ref: '1 Thessalonians 5:21', text: 'But test them all; hold on to what is good.' },
      { ref: 'Proverbs 18:17', text: 'In a lawsuit the first to speak seems right, until someone comes forward and cross-examines.' },
    ],
    faqs: [
      { q: 'Is it dishonest to use AI in sermon prep?', a: 'Not inherently, any more than using a commentary is. It becomes a problem when it replaces the study rather than speeding it up, or when it is hidden.' },
      { q: 'How do I stop it inventing citations?', a: 'Check every quotation against the source before it leaves your desk. Tools that quote retrieved text rather than recalling it from memory are meaningfully safer.' },
      { q: 'Should I tell my congregation we use it?', a: 'For administration, nobody expects disclosure. For anything presented as your own words, most people would want to know, and finding out later costs more than saying so.' },
    ],
    related: ['how-do-i-keep-my-congregation-engaged-between-sundays', 'how-do-i-pastor-someone-who-is-deconstructing'],
  },

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
  // ── Added 2026-09-26 from real questions asked by logged-out visitors ───────
  // Every one of these came out of qa_events — someone typed it into the box
  // with no account. Demand is measured, not guessed. Judas and "was the Bible
  // rewritten" were each asked by two different people.
  {
    slug: 'did-judas-go-to-heaven',
    question: 'Did Judas go to heaven?',
    category: 'Eternal Life',
    updated: '2026-09-26',
    answer: 'The Bible never says. Jesus calls Judas "the son of destruction" (John 17:12) and Acts says he "went where he belongs" (Acts 1:25), which sounds final — but Scripture stops short of a verdict, and Christians have disagreed for two thousand years. The honest answer is that we are not told.',
    body: [
      {
        h: 'What the text actually says',
        p: 'Matthew says Judas was "seized with remorse," returned the thirty pieces of silver, said "I have sinned, for I have betrayed innocent blood," and hanged himself (Matthew 27:3–5). Jesus had earlier said of him that it would be better for that man if he had not been born (Matthew 26:24). Acts 1:25 says he left his apostolic ministry "to go where he belongs." Those are heavy words. But none of them is a sentence pronounced on his soul, and the Bible — which is not shy about judgment elsewhere — does not give one here.',
      },
      {
        h: 'The word behind "remorse" is worth knowing',
        p: 'Matthew 27:3 uses metamelomai, a word meaning regret or being sorry afterward. The New Testament\'s usual word for repentance is metanoia, which means a change of mind that turns you around. Some readers make a great deal of that difference: Judas felt the weight of what he had done, but grief is not the same as turning back. Others point out that the two words overlap in Greek and that building a doctrine of someone\'s eternity on one verb is more than the text can carry. Both cautions are fair.',
      },
      {
        h: 'Peter is the comparison the Gospels invite',
        p: 'On the same night, Peter denied knowing Jesus three times — publicly, with curses (Matthew 26:69–75). He also wept bitterly. The difference in the story is not the size of the failure but what each man did next: one went back to the others and was restored by Jesus on a beach (John 21:15–19), the other went off alone. That is the contrast the Gospels draw, and it is about despair versus return, not about a sin too big to forgive.',
      },
      {
        h: 'Why the answer stays open',
        p: 'Christians have landed in different places. Many read John 17:12 and Acts 1:25 as settling it. Others note that Jesus said he lost none the Father gave him "except" Judas — and that the same Jesus prayed forgiveness over the people killing him. The reason this page will not hand you a verdict is that Scripture does not, and pretending otherwise would be inventing an answer to make the question stop. What the Bible is unambiguous about is the door: "whoever comes to me I will never drive away" (John 6:37).',
      },
    ],
    scriptures: [
      { ref: 'Matthew 27:3–5', text: 'When Judas, who had betrayed him, saw that Jesus was condemned, he was seized with remorse and returned the thirty pieces of silver.' },
      { ref: 'John 17:12', text: 'None has been lost except the one doomed to destruction so that Scripture would be fulfilled.' },
      { ref: 'Acts 1:25', text: 'To take over this apostolic ministry, which Judas left to go where he belongs.' },
      { ref: 'John 6:37', text: 'Whoever comes to me I will never drive away.' },
    ],
    faqs: [
      { q: 'Does the Bible say Judas went to hell?', a: 'It does not say so directly. John 17:12 calls him "the one doomed to destruction" and Acts 1:25 says he went "where he belongs," and many Christians read those as a verdict. But neither line is a statement about his eternal destiny in the way the question expects, and the New Testament never says plainly where Judas is.' },
      { q: 'Could Judas have been forgiven if he had asked?', a: 'On the Bible\'s own terms, yes. Peter denied Jesus and was restored days later. Paul described himself as the worst of sinners and was forgiven. Nothing in Scripture describes betrayal as the one sin placed beyond reach — what it describes is Judas not coming back.' },
      { q: 'Did Judas have a choice, if the betrayal was prophesied?', a: 'This is one of the oldest arguments in Christian thought, and it is not settled. Scripture holds both that the betrayal fulfilled prophecy and that Judas is held responsible for it, without explaining how both are true. Anyone who tells you the tension resolves neatly is adding to the text.' },
      { q: 'Why does it matter what happened to Judas?', a: 'Usually because of the question underneath it: is there a point past which someone has gone too far? The Bible\'s answer to that one is much clearer than its answer about Judas — the invitation stays open to anyone who comes.' },
    ],
    related: ['will-god-forgive-me', 'am-i-too-far-gone-for-god', 'is-hell-real'],
  },
  {
    slug: 'has-the-bible-been-changed',
    question: 'Has the Bible been changed or rewritten over the centuries?',
    category: 'Bible',
    updated: '2026-09-26',
    answer: 'Not in the way the question usually imagines. We do not have one late copy at the end of a chain — we have thousands of early ones from scattered places, and they can be compared against each other. Most differences are spelling and word order. The handful that matter are printed in your Bible, in the footnotes.',
    body: [
      {
        h: 'Why the "telephone game" picture does not fit',
        p: 'Telephone works because each person hears only the previous whisper. Manuscripts do not work that way. Copies spread outward across Egypt, Syria, Greece, Italy and North Africa, in different languages, under communities that disagreed with each other — and we have those copies. There are roughly 5,800 Greek manuscripts of the New Testament, plus thousands in Latin, Syriac and Coptic, some within a century or so of the originals. Comparing them is how scholars detect changes rather than guess about them.',
      },
      {
        h: 'The Dead Sea Scrolls were a live test',
        p: 'Before 1947, the oldest complete Hebrew manuscripts of Isaiah were medieval. Then a scroll of Isaiah turned up at Qumran roughly a thousand years older. If a millennium of copying quietly rewrote the text, this was where it would show. It did not: the scroll matches the later text closely, with differences that are overwhelmingly spelling and minor wording. That is a real, checkable result, not an article of faith.',
      },
      {
        h: 'What the real differences look like',
        p: 'Most variants are invisible in translation — a spelling, a swapped word order, a repeated line, a name written in full instead of short. Two longer passages are genuinely disputed: the ending of Mark (16:9–20) and the woman caught in adultery (John 7:53–8:11). Notice what your Bible already does with them. It prints them with a footnote saying the earliest manuscripts do not include them. A text being quietly rewritten does not advertise its own uncertain passages in the margin.',
      },
      {
        h: 'Where the honest uncertainty actually is',
        p: 'You can say truthfully that we do not possess the original documents, that scribes made mistakes, and that a small number of passages are contested. What the evidence does not support is the bigger claim — that the content was reshaped to say something new. The doctrines people assume were inserted later are in the earliest manuscripts we have. If you want to press on this, press on the footnotes; that is where the real argument lives, and it is smaller and more interesting than the rumour.',
      },
    ],
    scriptures: [
      { ref: 'Isaiah 40:8', text: 'The grass withers and the flowers fall, but the word of our God endures forever.' },
      { ref: 'Luke 1:1–3', text: 'Many have undertaken to draw up an account of the things that have been fulfilled among us... I myself have carefully investigated everything from the beginning.' },
    ],
    faqs: [
      { q: 'Did the Council of Nicaea change the Bible?', a: 'No. Nicaea (325 AD) debated how to describe Jesus\' relationship to the Father and produced a creed. It did not edit the biblical text and did not decide the canon — that is a persistent internet claim with no support in the records of the council itself.' },
      { q: 'What about all the translation differences?', a: 'Those are translation choices, not changes to the text. Versions differ over how to render Hebrew and Greek into English — word-for-word versus meaning-for-meaning. You can compare several versions of a verse side by side and see the range for yourself.' },
      { q: 'Were books removed from the Bible?', a: 'Some books were weighed and not included, which is different from removal. Catholic and Orthodox Bibles include books Protestant Bibles do not. The disagreement is old, public, and documented — not a secret deletion.' },
      { q: 'How can scholars know what the original said?', a: 'By comparing manuscripts. When copies from different centuries and regions agree, that reading is almost certainly early; when they diverge, the divergence itself is visible and gets footnoted. It is the same method used on any ancient text, and the New Testament has far more surviving copies than most.' },
    ],
    related: ['can-i-trust-the-bible', 'who-decided-which-books-are-in-the-bible', 'what-is-the-book-of-enoch'],
  },
  {
    slug: 'who-decided-which-books-are-in-the-bible',
    question: 'Who decided which books are in the Bible?',
    category: 'Bible',
    updated: '2026-09-26',
    answer: 'No single person or council picked them. Books that were already being read everywhere, that traced back to apostles, and that agreed with the rest gradually became recognised as Scripture. Later councils confirmed a list the churches were already using — they ratified, they did not choose.',
    body: [
      {
        h: 'It was recognition, not selection',
        p: 'The usual picture is a committee in a room with a pile of books and a vote. The history is slower and more ordinary. Letters and Gospels circulated, were read aloud in gatherings, copied, and sent on. Over time some were used everywhere and treated as carrying apostolic authority; others were valued but local, or clearly later. By the time anyone drew up an official list, the list mostly described existing practice.',
      },
      {
        h: 'The tests they applied',
        p: 'Three criteria come up again and again in the ancient sources. Was it connected to an apostle or their circle? Was it received broadly, not just by one region or faction? Did it agree with the faith already handed down? Those are the tests that kept out later writings — many second-century gospels fail the first test plainly, being written long after the people whose names they carry.',
      },
      {
        h: 'The dates worth knowing',
        p: 'The Muratorian Fragment, usually dated around 170 AD, already lists most of the New Testament. Athanasius\' Easter letter of 367 AD names the 27 books we now have. The councils of Hippo (393) and Carthage (397) affirmed that list. Note the order: the list existed in use for generations before the councils, which is the opposite of the story where a council invents it.',
      },
      {
        h: 'Where the genuine arguments were',
        p: 'Some books were debated for a long time — Hebrews, James, 2 Peter, 2 and 3 John, Jude, Revelation. That debate is recorded; nobody hid it. And the disagreement never fully closed: Catholic and Orthodox Bibles include books Protestant Bibles place outside the canon, and the Ethiopian Orthodox canon is wider still. You can hold that history honestly without concluding the whole thing was arbitrary.',
      },
    ],
    scriptures: [
      { ref: '2 Peter 3:15–16', text: 'Paul also wrote you... His letters contain some things that are hard to understand, which ignorant and unstable people distort, as they do the other Scriptures.' },
      { ref: '1 Thessalonians 2:13', text: 'You accepted it not as a human word, but as it actually is, the word of God.' },
    ],
    faqs: [
      { q: 'Did Constantine choose the books of the Bible?', a: 'No. This claim spread through popular fiction rather than history. Constantine convened Nicaea in 325 to address a dispute about Christ\'s divinity; the canon was not its subject, and lists resembling our New Testament predate him.' },
      { q: 'Why were the "lost gospels" left out?', a: 'Most were written well after the apostolic period — the Gospel of Thomas, Judas and Mary come from the second century or later — so they failed the apostolic test, and several conflict sharply with the earlier material. They were known and rejected, not undiscovered.' },
      { q: 'Why do Catholic Bibles have more books?', a: 'Catholic and Orthodox Bibles include the deuterocanonical books (Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees and additions). They were in the Greek Old Testament used by early Christians; the Reformers followed the Hebrew canon instead. Both sides have argued it in public for five centuries.' },
      { q: 'Could a book still be added?', a: 'In practice, no. The tests themselves rule it out — nothing new can now be apostolic in origin or already received by the ancient churches.' },
    ],
    related: ['what-is-the-book-of-enoch', 'has-the-bible-been-changed', 'can-i-trust-the-bible'],
  },
  {
    slug: 'can-you-believe-in-evolution-and-the-bible',
    question: 'Can you believe in evolution and the Bible?',
    category: 'Faith & Doubt',
    updated: '2026-09-26',
    answer: 'Many Christians do, including scientists and pastors. Others hold a young earth and read Genesis 1 as sequential days. Christianity has not settled this, and no historic creed makes a position on it a condition of faith — the creeds say God made the world, not how long it took.',
    body: [
      {
        h: 'The range of views, stated fairly',
        p: 'Young-earth creationism reads the six days as six ordinary days and the earth as thousands of years old. Old-earth creationism accepts the scientific age of the universe while holding that God acted specially at points. Evolutionary creation holds that evolution is the mechanism God used, the way gravity is the mechanism by which he holds planets in orbit. Intelligent design argues some structures point to a designer. These are all held by people who take the Bible seriously.',
      },
      {
        h: 'The real question is what kind of writing Genesis 1 is',
        p: 'That is not a dodge; it is the actual disagreement. Genesis 1 is patterned — three days of forming, three of filling, a refrain closing each. Ancient readers encountered it alongside other creation accounts and would have noticed what it pointedly does not say: no warring gods, sun and moon demoted to lamps rather than deities. Whether that patterning signals poetry making a theological claim, or a plain chronological record, is where the argument lives.',
      },
      {
        h: 'This debate is older than Darwin',
        p: 'Augustine, writing around 400 AD, warned Christians not to make confident scientific pronouncements from Genesis that informed outsiders could see were false — he thought it brought the faith into disrepute. He had no stake in evolution; he was arguing about how to read the text. Origen raised similar questions earlier. The idea that a non-literal reading is a modern retreat is not historically accurate.',
      },
      {
        h: 'What does not change either way',
        p: 'On every one of these views, the world is made rather than accidental, human beings bear God\'s image and carry a dignity that is given rather than earned, and something has gone wrong that we did not fix ourselves. If you are weighing Christianity, you do not have to resolve the age of the earth first. Plenty of believers hold that question open for life.',
      },
    ],
    scriptures: [
      { ref: 'Genesis 1:1', text: 'In the beginning God created the heavens and the earth.' },
      { ref: 'Psalm 19:1', text: 'The heavens declare the glory of God; the skies proclaim the work of his hands.' },
      { ref: 'Colossians 1:16–17', text: 'In him all things were created... and in him all things hold together.' },
    ],
    faqs: [
      { q: 'Do you have to believe in a literal six-day creation to be a Christian?', a: 'No historic creed requires it, and major traditions — Catholic, Orthodox, Anglican and many Protestant bodies — contain people on both sides. Some individual churches and denominations do hold a required position, so it can matter locally even though it is not a universal test of faith.' },
      { q: 'Are there scientists who are Christians?', a: 'Yes, including prominent ones. Francis Collins led the Human Genome Project and writes as a Christian who accepts evolution. The categories "scientist" and "believer" have never been mutually exclusive in practice.' },
      { q: 'What about Adam and Eve?', a: 'This is the sharpest point in the discussion, and views genuinely differ: a first historical couple, a representative pair within a population, or a theological portrait of humanity. Christians who accept evolution hold a range of positions here rather than one.' },
      { q: 'Does evolution disprove God?', a: 'It is a description of a mechanism, and a mechanism does not settle whether there is intention behind it. Knowing how a process works tells you how, not whether anyone meant it. People draw opposite conclusions from the same biology, which is a clue the biology alone is not doing the deciding.' },
    ],
    related: ['do-christians-take-the-bible-literally', 'is-there-evidence-that-god-exists', 'do-genesis-1-and-2-contradict'],
  },
  {
    slug: 'are-there-dinosaurs-in-the-bible',
    question: 'Are there dinosaurs in the Bible?',
    category: 'Bible',
    updated: '2026-09-26',
    answer: 'Not by name — the word "dinosaur" was coined in 1841, long after the Bible was written. Two creatures in Job, Behemoth and Leviathan, are sometimes proposed. Most scholars read them as a hippopotamus and a crocodile, or as symbols of untamed chaos, rather than as dinosaurs.',
    body: [
      {
        h: 'Behemoth and Leviathan',
        p: 'In Job 40–41 God describes two creatures at length. Behemoth eats grass like an ox, lies among the reeds in the marsh, and has a tail that "sways like a cedar." Leviathan is armoured, breathes fire and smoke, and cannot be caught with a hook. Some readers see a sauropod and a dragon-like reptile. Others note the marsh habitat and grass diet fit a hippo, and the armour and river setting fit a crocodile, with the fire imagery doing what poetry does.',
      },
      {
        h: 'What those chapters are doing',
        p: 'Context matters more than the zoology. God is answering Job out of a storm, and the whole speech is a list of things Job did not make and cannot control — the sea, the stars, the wild ox, the ostrich, the hawk. Behemoth and Leviathan are the climax of that argument. Whatever animal stands behind them, they are there to make Job feel small, and the poetry is heightened deliberately.',
      },
      {
        h: 'Why the Bible does not discuss them',
        p: 'Scripture is not a catalogue of the natural world. It never mentions kangaroos, penguins or bacteria either, and no one finds that suspicious. It is written to people in a particular place about who God is and what he is doing, in the categories they had. Expecting a species list is asking it for a kind of book it is not.',
      },
      {
        h: 'Where the actual disagreement is',
        p: 'Nobody disputes that fossils exist. The disagreement is about timeline: whether dinosaurs died out tens of millions of years before humans, or co-existed with them on a young-earth reading. That is the same argument as the age of the earth, and Christians land in different places on it — see the evolution page for the range.',
      },
    ],
    scriptures: [
      { ref: 'Job 40:15', text: 'Look at Behemoth, which I made along with you and which feeds on grass like an ox.' },
      { ref: 'Job 41:1', text: 'Can you pull in Leviathan with a fishhook or tie down its tongue with a rope?' },
      { ref: 'Psalm 104:24–26', text: 'How many are your works, Lord!... There is the sea, vast and spacious... and Leviathan, which you formed to frolic there.' },
    ],
    faqs: [
      { q: 'Is Leviathan a dragon?', a: 'In the Old Testament\'s imagery, Leviathan often functions as a sea monster standing for chaos that only God can master — the same role sea-monsters play in other ancient Near Eastern literature. Isaiah 27:1 uses it symbolically of God\'s enemies. Whether a real animal lies behind the image is debated.' },
      { q: 'Does the Bible say how old the earth is?', a: 'No. It gives genealogies, and a young-earth figure is reached by adding those up — an approach associated with Archbishop Ussher in the 1600s. Whether biblical genealogies are complete lists or selective ones is itself disputed, since they demonstrably skip generations elsewhere.' },
      { q: 'Did dinosaurs go on the ark?', a: 'The text does not say. Young-earth accounts often propose juveniles were taken aboard; readers who accept an old earth see no issue because the animals were long extinct. It depends entirely on the timeline you hold.' },
    ],
    related: ['can-you-believe-in-evolution-and-the-bible', 'do-christians-take-the-bible-literally', 'can-i-trust-the-bible'],
  },
  {
    slug: 'do-men-have-fewer-ribs-than-women',
    question: 'Do men have one fewer rib than women?',
    category: 'Bible',
    updated: '2026-09-26',
    answer: 'No. Men and women both have twelve pairs — twenty-four ribs. The idea comes from Genesis 2, but the Bible never claims men are short a rib, and it would not follow anyway: an injury to a parent does not change what their children are born with.',
    body: [
      {
        h: 'The anatomy, plainly',
        p: 'Every standard anatomy text gives the same count for both sexes: twelve pairs. A small percentage of people of either sex are born with an extra cervical rib or one fewer, and that variation is not sex-linked. This is about as settled as a medical fact can be, and it has been checkable for as long as anyone has been able to count.',
      },
      {
        h: 'Genesis does not say what people think it says',
        p: 'Genesis 2:21–22 describes God taking something from the man\'s side while he sleeps and building the woman from it. That is the whole claim. There is no verse anywhere saying men therefore have fewer ribs — that inference was added by readers, not by the text. Notably, it is also the wrong kind of inference: acquired changes are not inherited, which is why circumcision has never produced a generation born circumcised.',
      },
      {
        h: 'The Hebrew word is more interesting than the myth',
        p: 'The word is tsela. Everywhere else in the Old Testament it usually means "side" — the side of the tabernacle, the side of a hill, side chambers of the temple. "Rib" is a reasonable rendering here but not the obvious one. Read as "side," the picture shifts: not a spare part, but one being divided into two. Ancient Jewish commentators made much of that, and so did Matthew Henry, in a line often quoted — not from the head to rule over him, nor from the feet to be trampled, but from the side to stand beside him.',
      },
      {
        h: 'Why this question is worth asking out loud',
        p: 'People usually raise it as a gotcha, sometimes half-expecting embarrassment. It deserves a straight answer instead: the science is clear, and the text never made the claim. Plenty of arguments against Christianity are substantial and worth a long conversation. This one is a misreading that got repeated, and it is fine to just set it down.',
      },
    ],
    scriptures: [
      { ref: 'Genesis 2:21–22', text: 'So the Lord God caused the man to fall into a deep sleep; and while he was sleeping, he took one of the man\'s ribs and then closed up the place with flesh.' },
      { ref: 'Genesis 2:23', text: 'This is now bone of my bones and flesh of my flesh; she shall be called "woman," for she was taken out of man.' },
    ],
    faqs: [
      { q: 'Where did the missing-rib idea come from?', a: 'From assuming Genesis 2 must have left a permanent mark, and from repetition. It was widespread enough in the 1500s that the anatomist Vesalius had to publicly point out that the count is the same in both sexes.' },
      { q: 'Does it matter whether tsela means rib or side?', a: 'Not for doctrine, but it changes the picture. "Side" suggests one whole being separated into two who belong together, which is exactly what the man\'s response in verse 23 is reaching for.' },
      { q: 'Does Genesis 2 make women secondary?', a: 'The text argues the opposite of what it is often quoted for. The man is alone and it is "not good"; the woman is called a helper using a Hebrew word most often applied to God himself, and the man\'s reaction is recognition, not ownership.' },
    ],
    related: ['do-genesis-1-and-2-contradict', 'do-christians-take-the-bible-literally', 'can-i-trust-the-bible'],
  },
  {
    slug: 'do-genesis-1-and-2-contradict',
    question: 'Do Genesis 1 and 2 contradict each other?',
    category: 'Bible',
    updated: '2026-09-26',
    answer: 'They tell the same story at different scales. Genesis 1 is a wide shot of the whole cosmos across six days; Genesis 2 zooms in on one garden and one couple. The tension people notice — the order of trees, animals and the man — turns on whether chapter 2 is sequential at all.',
    body: [
      {
        h: 'What actually differs',
        p: 'In Genesis 1, vegetation appears on day three, animals on days five and six, and humanity last — male and female together. In Genesis 2, the man is formed, then a garden is planted, then animals are brought to him to name, then the woman. Read as two chronologies, they clash. That is a real observation, and it has been noticed for a very long time.',
      },
      {
        h: 'The wide-shot, close-up convention',
        p: 'Ancient Near Eastern narrative often gives a general account and then doubles back to treat one part in detail. Genesis does it repeatedly afterwards — the nations are listed in chapter 10, then chapter 11 goes back to explain Babel. Chapter 2 opens by marking the seventh day, which reads as closing the first account rather than continuing it. On that reading it is not a second timeline but a close-up.',
      },
      {
        h: 'The verb question',
        p: 'Genesis 2:19 says God "formed" the animals and brought them to the man. Hebrew narrative verbs do not carry tense the way English does, and some translations render it "had formed" — the NIV does. If that is right, the verse is recalling something already done, not sequencing it after the man. Hebrew scholars disagree about whether the pluperfect is justified here, which is worth knowing rather than glossing over.',
      },
      {
        h: 'The two-source reading',
        p: 'Many scholars hold that the chapters come from different sources — the first more structured and liturgical, the second earthier, using a different name for God. Christians respond in different ways: some reject the theory, others accept it and hold that the final text is composed deliberately, two complementary angles set side by side by an editor who could plainly see the differences and kept both anyway.',
      },
      {
        h: 'What each is for',
        p: 'The two chapters answer different questions. Genesis 1 asks who made everything and says it is ordered, intended, good. Genesis 2 asks what human beings are for and answers with dust and breath, work, limits, and the first thing called "not good" — being alone. Read together they say the universe has an author and you are not incidental to it.',
      },
    ],
    scriptures: [
      { ref: 'Genesis 1:27', text: 'So God created mankind in his own image, in the image of God he created them; male and female he created them.' },
      { ref: 'Genesis 2:7', text: 'Then the Lord God formed a man from the dust of the ground and breathed into his nostrils the breath of life.' },
      { ref: 'Genesis 2:18', text: 'It is not good for the man to be alone. I will make a helper suitable for him.' },
    ],
    faqs: [
      { q: 'Are there two creation stories in the Bible?', a: 'There are two accounts in Genesis 1 and 2, and poetic passages elsewhere — Psalm 104, Proverbs 8, Job 38 — that describe creation differently again. Whether "two stories" or one told twice depends on how you read chapter 2\'s relationship to chapter 1.' },
      { q: 'Why does God have different names in the two chapters?', a: 'Chapter 1 uses Elohim, chapter 2 uses YHWH Elohim. Source critics treat this as evidence of different authors; others argue the shift is deliberate — the transcendent creator of chapter 1 named personally in chapter 2, where he is walking in a garden.' },
      { q: 'Does this mean the Bible has errors?', a: 'It means the Bible was written by real people in real genres, which its own authors never hid. Whether the difference is an error depends on whether chapter 2 claims to be sequential, and the text does not say that it does.' },
    ],
    related: ['can-you-believe-in-evolution-and-the-bible', 'do-christians-take-the-bible-literally', 'has-the-bible-been-changed'],
  },
  {
    slug: 'what-does-christianity-say-about-reincarnation',
    question: 'What does Christianity say about reincarnation?',
    category: 'Eternal Life',
    updated: '2026-09-26',
    answer: 'Christianity does not teach it. The New Testament describes one life, then judgment, then resurrection — not a return in another body. The hope it offers is not coming back as someone else, but being raised as yourself, recognisably you, with the damage undone.',
    body: [
      {
        h: 'The verse that sets the shape',
        p: 'Hebrews 9:27 says people are destined to die once, and after that to face judgment. That is the assumption underneath the whole New Testament: a single life that counts, not a sequence of attempts. Whatever else Christians argue about regarding the afterlife, none of the historic traditions teach rebirth into another body on earth.',
      },
      {
        h: 'Resurrection is a different idea, and the difference matters',
        p: 'Reincarnation treats the body as temporary housing — you move on, the shell is discarded. Christianity claims the opposite: bodies matter, and the promise is that yours is raised and made new. Paul spends a whole chapter on it (1 Corinthians 15), and the resurrection accounts are pointed about it — the risen Jesus eats fish, is touched, keeps his scars. Not a spirit escaping a body. A body brought back.',
      },
      {
        h: 'The two passages people raise',
        p: 'In John 9:2 the disciples ask whether a man born blind sinned, which sounds like pre-existence — Jesus rejects the premise of the question entirely. And Jesus says of John the Baptist that he is "the Elijah who was to come" (Matthew 11:14), while John himself denies being Elijah (John 1:21). Luke 1:17 resolves it: John comes "in the spirit and power of Elijah." A role taken up, not a soul returned.',
      },
      {
        h: 'If reincarnation is what you actually believe',
        p: 'It is worth naming what draws people to it, because it is usually something reasonable — a sense that one life is too short to get anywhere, or that justice needs more time than we get. Christianity answers those with different machinery: not more attempts, but grace, which is the claim that you are not working your way up across lifetimes because the distance was closed from the other side. You can find that unconvincing. But it is a real answer to the real concern, not an evasion of it.',
      },
    ],
    scriptures: [
      { ref: 'Hebrews 9:27', text: 'Just as people are destined to die once, and after that to face judgment.' },
      { ref: '1 Corinthians 15:42–44', text: 'The body that is sown is perishable, it is raised imperishable... it is sown a natural body, it is raised a spiritual body.' },
      { ref: 'Luke 1:17', text: 'And he will go on before the Lord, in the spirit and power of Elijah.' },
    ],
    faqs: [
      { q: 'Did early Christians believe in reincarnation?', a: 'There is no evidence the mainstream did. Origen speculated about the pre-existence of souls, which is a different idea and was later condemned. The claim that reincarnation was taught and then removed from the Bible has no manuscript support — and we have manuscripts old enough to check.' },
      { q: 'What about near-death experiences or past-life memories?', a: 'Christians vary in how they interpret these. Some see genuine spiritual experience, others psychological or cultural explanations. What is fair to say is that such accounts are interpreted through the framework the person already holds, which is why they tend to match the expectations of the culture they occur in.' },
      { q: 'If there is only one life, what about people who never hear about Jesus?', a: 'One of the oldest open questions in Christian thought, and answers genuinely differ. What most traditions hold in common is that God is just and nobody is judged for information they could not have had. Beyond that, Christians disagree, and pretending otherwise would be false.' },
    ],
    related: ['what-happens-when-you-die', 'is-hell-real', 'what-is-heaven-like'],
  },
  {
    slug: 'what-if-church-hurt-you',
    question: 'What if church hurt you, or felt like it was all about money?',
    category: 'Church',
    updated: '2026-09-26',
    answer: 'Then you saw something real and you are right to name it. Jesus was angrier about religious money and religious pretending than about almost anything else. Leaving a church that was harming you is not leaving God, and nothing here will tell you to go back to it.',
    body: [
      {
        h: 'Your read was probably accurate',
        p: 'People who walk out of churches are often told they were too sensitive, or looking for an excuse. Usually they were not. If the giving talk arrived every week, if questions were treated as disloyalty, if a leader was untouchable, if you left services feeling smaller — those are not misperceptions. They are the things the New Testament warns about, written down because they were already happening in the first century.',
      },
      {
        h: 'What Jesus did about religious money',
        p: 'The one time the Gospels show Jesus physically overturning anything, it is tables in a temple where faith had been turned into commerce. He reserved his hardest language not for the irreligious but for religious professionals — calling them whitewashed tombs, saying they loaded people with burdens they would not lift themselves. If church money made you angry, you are in the same place the story puts Jesus.',
      },
      {
        h: 'The distinction that has to be made honestly',
        p: 'It is easy to say "the church failed you, God did not" — and it can sound like a dodge, because for a lot of people the church was the only face God had. So take it slowly. A church is people with authority, and authority can be misused. That is a claim Christianity makes about human beings, not an exception to it. Every character in the Bible who abuses religious power is in there as a warning, not an embarrassment to be explained away.',
      },
      {
        h: 'You are allowed to take your time',
        p: 'There is no obligation to find a new church this month, or this year. Some people need a long distance before anything churchlike is safe again. If you eventually want to try, it is fair to ask blunt questions first — who has power here, where does the money go, what happens when someone disagrees, can I leave without being pursued. Any healthy church can answer those. A church that treats the questions as an attack has answered them.',
      },
      {
        h: 'And in the meantime',
        p: 'You can keep asking about God without a building. Reading, praying badly, arguing with it, asking the questions you were told not to ask — none of that requires an institution\'s permission. Plenty of people do their most honest thinking about faith in exactly this stretch, after they stop performing it for a room.',
      },
    ],
    scriptures: [
      { ref: 'Matthew 21:12–13', text: 'Jesus entered the temple courts and drove out all who were buying and selling there... "My house will be called a house of prayer, but you are making it a den of robbers."' },
      { ref: 'Matthew 23:4', text: 'They tie up heavy, cumbersome loads and put them on other people\'s shoulders, but they themselves are not willing to lift a finger to move them.' },
      { ref: '1 Timothy 3:3', text: 'Not violent but gentle, not quarrelsome, not a lover of money.' },
      { ref: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
    ],
    faqs: [
      { q: 'Is it a sin to stop going to church?', a: 'The New Testament encourages Christians not to give up meeting together, and it is written to people in community. But it is not a command to stay somewhere harmful, and nothing in it suggests God is keeping an attendance record against someone who left a place that was hurting them.' },
      { q: 'Does the Bible actually require tithing?', a: 'Christians disagree. Tithing is Old Testament law; the New Testament talks about generous, un-pressured giving — "not reluctantly or under compulsion" (2 Corinthians 9:7). Compulsion is the part that gets quietly dropped when giving is being pushed from a stage.' },
      { q: 'How do I know if a church is healthy?', a: 'Watch what happens to people who disagree, whether the finances are open, whether leaders are accountable to anyone who can actually say no, and whether you can leave without pressure. Those tell you more than the preaching or the music.' },
      { q: 'Can I be a Christian without a church?', a: 'People do, and many are in that position for reasons that were not their choice. Most Christians would say community matters and is worth finding eventually — but "eventually," and not the one that hurt you.' },
    ],
    related: ['why-should-i-go-to-church', 'how-do-i-find-a-church', 'does-god-love-me'],
  },
  // ── Added 2026-09-26 — the church side ─────────────────────────────────────
  // Two kinds here. The leader-pain and sermon-craft pages come from qa_events:
  // three separate people described burning out or being hurt while leading,
  // and two asked for real sermon help. The adoption pages are Daniel's call —
  // "maybe someone comes across it and wants to sign up passively" — and he is
  // right that a page nobody wrote cannot be stumbled on.
  //
  // ⚠️ NOTE ON VOICE. These are written FOR the pastor, not ABOUT them, and the
  // existing pastor pages are all about caring for somebody else. Nothing here
  // tells a hurting leader to try harder.
  {
    slug: 'what-do-i-do-when-im-the-pastor-who-is-burned-out',
    question: "What do I do when I'm the pastor who's burned out?",
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'Stop treating it as a spiritual failure first. Burnout in ministry is usually a load problem, not a faith problem — too many roles, no day off that holds, and nobody pastoring you. The first move is telling one person the truth, before deciding anything bigger.',
    body: [
      {
        h: 'It is not a sign you were never called',
        p: 'The first thing most burned-out pastors reach for is the possibility that they were wrong about all of it. That is worth naming because it is so common and so rarely true. Exhaustion is a poor witness in its own trial — it argues that everything was always false, using evidence it collected while depleted. Elijah asked to die immediately after the most public victory of his life. What God sent first was food and sleep, twice, before any conversation.',
      },
      {
        h: 'The load is usually the actual problem',
        p: 'Small-church ministry quietly becomes six jobs: preaching, counselling, admin, facilities, finance, and being publicly cheerful about it. Any one of those is a role. Together they are unsustainable no matter how strong the calling, and the sustainability question is separate from the calling question. Before deciding whether to leave, it is worth writing down every actual task of the last month. Most pastors are shocked by the list, and it reframes the problem from "what is wrong with me" to "what would be wrong with anyone doing this."',
      },
      {
        h: 'Nobody is pastoring you',
        p: 'This is the part that makes ministry burnout different. The person the congregation brings its worst weeks to has, very often, nowhere to bring their own. You cannot be pastored by the people you pastor — the roles will not hold it. That means it has to come from outside: another pastor in a different town, a spiritual director, a counsellor, a denominational contact if you have one. Not a friend inside the congregation, however close. That arrangement fails for both of you.',
      },
      {
        h: 'What to do this week',
        p: 'Tell one person outside your church the unedited version. Not a prayer-request version. If you are having thoughts of ending your life, treat that as urgent and tell someone today — a doctor, a crisis line, someone who can sit with you. Then, if you can, take a real day off with your phone somewhere else, and notice how strongly you resist it. That resistance is information about how far this has gone.',
      },
      {
        h: 'Leaving is a legitimate option, but not this week',
        p: 'Some pastors do need to leave a post, and some need to leave vocational ministry, and neither is a betrayal. But exhaustion is a bad chair to make that decision from. The usual counsel is to get rest and outside support in place first, and revisit it clear-headed. The decision made when you are slept and supported is the one worth trusting.',
      },
    ],
    scriptures: [
      { ref: '1 Kings 19:5–7', text: 'All at once an angel touched him and said, "Get up and eat."... "Get up and eat, for the journey is too much for you."' },
      { ref: 'Exodus 18:17–18', text: 'What you are doing is not good. You and these people who come to you will only wear yourselves out. The work is too heavy for you; you cannot handle it alone.' },
      { ref: 'Matthew 11:28–29', text: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
      { ref: 'Mark 6:31', text: 'Come with me by yourselves to a quiet place and get some rest.' },
    ],
    faqs: [
      { q: 'Is burnout a sin or a lack of faith?', a: 'No. Scripture shows exhausted leaders — Moses, Elijah, Jeremiah, Paul describing being "under great pressure, far beyond our ability to endure." In every case the response is provision and help, not rebuke. Jethro\'s advice to Moses is essentially an organisational restructure.' },
      { q: 'Should I tell my elders or my congregation?', a: 'Usually elders or whoever you are accountable to, first, and in a form you control. Congregations vary enormously in how they receive this. If there is any chance the information will be used against you, get outside counsel before disclosing anything.' },
      { q: 'How do I take a sabbath when Sunday is a work day?', a: 'Pick a different fixed day and defend it like an appointment, because that is what it is. The common failure is leaving it flexible — a flexible day off is absorbed within about three weeks.' },
      { q: 'What if I cannot afford to take time off?', a: 'Many pastors cannot, and pretending otherwise is useless. Then the realistic move is subtraction: what can be dropped, delegated badly, or done to a lower standard for three months. Something is going to give. It is better for that to be a choice than a collapse.' },
    ],
    related: ['i-was-hurt-serving-in-church-leadership', 'what-does-the-bible-say-about-rest', 'what-does-the-bible-say-about-depression'],
  },
  {
    slug: 'i-was-hurt-serving-in-church-leadership',
    question: 'What if I was hurt while serving in church leadership?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'It is a particular kind of injury: the place you served became the place that hurt you, so the usual source of comfort is the wound. That is not fragility. Leaders get criticised in ways members never see, and often have nowhere to say so.',
    body: [
      {
        h: 'Why this one cuts differently',
        p: 'When someone is hurt at work, church is often where they go to recover. When you are hurt at church while leading it, that route closes — the community, the building, the songs and the people are all inside the injury. Add that most of the criticism arrived about you rather than to you, and that you were expected to keep leading worship the following Sunday as though none of it had happened.',
      },
      {
        h: 'What you are not allowed to say out loud',
        p: 'Leaders absorb things they cannot repeat. You know why a family really left. You were told something in confidence that was about you. You heard the meeting-after-the-meeting. Carrying information you cannot discharge is its own weight, and it is one of the reasons leadership hurt lingers longer than it seems it should.',
      },
      {
        h: 'Some of it was ordinary, some was not',
        p: 'Worth separating honestly, because the response differs. Ordinary hardship: people leaving, disagreement, criticism of a decision, the loneliness of the role. Not ordinary: being bullied, having your character attacked, financial pressure tied to compliance, being pushed out without process, or being told that submission meant silence. The first is the cost of the work. The second is abuse and should be named as such, not spiritualised into a lesson.',
      },
      {
        h: 'You are allowed to step back',
        p: 'Stepping down from a role is not stepping away from God, and you do not need to have forgiven everyone before you are permitted to rest. Forgiveness in the Bible is not the same as returning to the arrangement that injured you, and it is not a prerequisite for getting out of it. Reconciliation takes two; you only ever controlled your half.',
      },
      {
        h: 'Coming back, if you ever want to',
        p: 'Some people return to leadership, some to a pew somewhere else, some take years. All of those are real outcomes. If you do try again, it is reasonable to ask blunt questions first — who holds the leaders accountable, what happens when someone disagrees, can a person step down without being punished for it. You have earned the right to ask.',
      },
    ],
    scriptures: [
      { ref: 'Psalm 55:12–14', text: 'If an enemy were insulting me, I could endure it... But it is you, a man like myself, my companion, my close friend, with whom I once enjoyed sweet fellowship at the house of God.' },
      { ref: '2 Corinthians 1:8', text: 'We were under great pressure, far beyond our ability to endure, so that we despaired of life itself.' },
      { ref: '2 Timothy 4:16', text: 'At my first defense, no one came to my support, but everyone deserted me. May it not be held against them.' },
    ],
    faqs: [
      { q: 'Am I bitter for still being angry about it?', a: 'Anger at genuine wrong is not bitterness — Scripture is full of it, most of the Psalms included. Bitterness is a direction it can settle into over years. Being angry about something that actually happened, recently, is just accurate.' },
      { q: 'Do I have to forgive the people who did this?', a: 'Christians are called to forgive, and it is worth saying clearly that forgiveness is not pretending it was acceptable, not resuming the relationship, and not a switch you can throw on command. It is usually slow, and it does not require the other person to have access to you.' },
      { q: 'Should I warn the next church about what happened?', a: 'If there was misconduct affecting others — especially anything involving safeguarding — reporting it is a responsibility, not gossip. If it was conflict and hurt without misconduct, most counsellors advise dealing with it in a safe setting first rather than carrying the case forward.' },
      { q: 'Can I still love God if I cannot walk into a church?', a: 'Yes. Plenty of people have done their most honest praying in exactly that stretch. The building is not the relationship, and God is not standing behind the people who hurt you.' },
    ],
    related: ['what-do-i-do-when-im-the-pastor-who-is-burned-out', 'what-if-church-hurt-you', 'how-do-i-forgive-someone-who-hurt-me'],
  },
  {
    slug: 'im-the-only-one-leading-my-church',
    question: "What if I'm the only one leading, with no team and no support?",
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'Most churches are small and most pastors are doing several jobs at once — often bivocational, frequently unpaid. The trap is measuring a one-person church against a resourced one with staff. Sustainability, not scale, is the thing to solve first, and it starts with deciding what is allowed to be done badly.',
    body: [
      {
        h: 'You are the norm, not the exception',
        p: 'Media attention goes to large churches, so solo pastors often assume they are failing at something everyone else has worked out. Most congregations worldwide are small, and most of the people leading them are doing it alongside other work, with no staff. The model in your head — a team, a budget, a building manager — describes a minority of churches.',
      },
      {
        h: 'Decide what is allowed to be done badly',
        p: 'One person cannot do six roles well, and trying is how the whole thing ends. The useful exercise is deciding in advance which things are done properly and which are done to a lower standard on purpose. Perhaps the preaching and the visiting are protected, and the newsletter goes out late, the social media stops, and the building fund waits. Naming it as a decision keeps it from becoming a private sense of failure.',
      },
      {
        h: 'Delegate badly rather than not at all',
        p: 'Solo leaders often hold on because nobody else will do it to the standard they would. That reasoning ends in one exhausted person doing everything. A volunteer doing a task at seventy per cent is a genuine gain, and the drop in quality is usually less visible to everyone else than it is to you. It also gives people a stake, which is how churches grow leaders.',
      },
      {
        h: 'Find one peer outside your church',
        p: 'The single most protective factor solo pastors report is one other pastor to talk to — someone with no stake in your congregation. A monthly call is enough. Denominational networks, local ministerial associations and online groups exist for this, and if none is available near you, pastors in other towns are usually glad to be asked.',
      },
    ],
    scriptures: [
      { ref: 'Exodus 18:21–22', text: 'Select capable men... and appoint them as officials... That will make your load lighter, because they will share it with you.' },
      { ref: 'Ecclesiastes 4:9–10', text: 'Two are better than one... If either of them falls down, one can help the other up. But pity anyone who falls and has no one to help them up.' },
      { ref: 'Zechariah 4:10', text: 'Who dares despise the day of small things?' },
    ],
    faqs: [
      { q: 'Is a small church a failing church?', a: 'Nothing in the New Testament measures a church by size. The letters are written to house churches. Faithfulness, care and truth are the measures used; attendance is not one of them.' },
      { q: 'How do I lead when I also work another job?', a: 'Bivocational ministry has a long history — Paul made tents. It usually means fewer commitments held properly rather than many held loosely, and being honest with the congregation about what you can and cannot do.' },
      { q: 'What if my congregation expects more than I can give?', a: 'Expectations that are never discussed tend to grow. Stating plainly what is realistic, ideally with elders or leaders present, is usually better received than pastors fear — and it gives people the chance to step up.' },
    ],
    related: ['what-do-i-do-when-im-the-pastor-who-is-burned-out', 'how-do-i-keep-my-congregation-engaged-between-sundays', 'what-does-the-bible-say-about-rest'],
  },
  {
    slug: 'how-do-i-preach-on-lament-without-losing-hope',
    question: 'How do I preach on lament without losing hope?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: "Let the lament be as long as the text makes it. Most sermons on grief rush to resolution in the last five minutes, which teaches people their sorrow is a stage to get through. The Bible's laments sit in it — and one of them never resolves at all.",
    body: [
      {
        h: 'The pressure to resolve is the problem',
        p: 'Preachers feel it acutely: you cannot send people home in despair. So the sermon spends twenty minutes on the pain and five on the hope, and the five minutes carry all the weight. What the congregation actually hears is that grief is the setup and comfort is the point — so anyone still in the grief a year later concludes they are doing it wrong.',
      },
      {
        h: 'Psalm 88 is the permission slip',
        p: 'Psalm 88 is in the Bible and it does not turn. It ends with darkness as the psalmist\'s closest friend. No resolution, no "but yet." That psalm is a pastoral gift precisely because someone decided it belonged in the book of prayers. Preaching it as written — without patching the ending — tells people their unresolved season is not outside the life of faith.',
      },
      {
        h: 'Where the turn belongs, when there is one',
        p: 'Most laments do turn, and the turn is worth showing rather than asserting. In Psalm 13 the shift comes after four verses of "how long"; in Lamentations 3 the famous line about mercies new every morning sits in the middle of a book about a destroyed city, surrounded on both sides by grief. Show the structure. Hope that is earned by the text lands differently from hope bolted on because the service has to end.',
      },
      {
        h: 'Practical moves in the room',
        p: 'Say plainly that some people present are in this today and are not being asked to feel better by the end. Use the text\'s own words rather than paraphrasing the pain into something milder. Resist illustrations where the grief gets fixed. If you pray at the close, pray the lament too, not only the hope — congregations learn what is permitted by what gets prayed aloud.',
      },
      {
        h: 'And for the preacher',
        p: 'Pastors often preach lament while in it. That can be the most honest sermon a congregation hears, and it can also be more than you can carry from the front. It is legitimate to preach this text in a season when you cannot say the hopeful part with full conviction — the text says it for you, which is part of why it was written down.',
      },
    ],
    scriptures: [
      { ref: 'Psalm 88:18', text: 'You have taken from me friend and neighbor — darkness is my closest friend.' },
      { ref: 'Psalm 13:1–2', text: 'How long, Lord? Will you forget me forever? How long will you hide your face from me?' },
      { ref: 'Lamentations 3:22–23', text: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning." },
      { ref: 'John 11:35', text: 'Jesus wept.' },
    ],
    faqs: [
      { q: 'Is it wrong to end a sermon without resolution?', a: 'Not if the text does. Psalm 88 ends in darkness, and preaching it honestly may be the most comforting thing a grieving person hears that year — because it tells them Scripture has a category for where they are.' },
      { q: 'How much of my own grief should I share?', a: 'Enough to be honest, not so much that the congregation ends up caring for you from the pews. A useful test: are you telling them about a wound, or bleeding on them? Processed pain preaches; raw pain usually needs somewhere else first.' },
      { q: 'What about people who need hope right now?', a: 'They still get it — hope that has taken the loss seriously is sturdier than hope that skipped it. What honest lament removes is the pressure to perform recovery on someone else\'s schedule.' },
      { q: 'Should lament ever be part of a normal Sunday?', a: 'Many pastors argue it should be, precisely so that grief is not reserved for funerals. Congregations that only ever sing triumph give people nothing to say to God on the worst week of their lives.' },
    ],
    related: ['what-does-the-bible-say-about-grief', 'where-do-i-find-sermon-illustrations', 'what-do-i-do-when-im-the-pastor-who-is-burned-out'],
  },
  {
    slug: 'where-do-i-find-sermon-illustrations',
    question: "Where do I find sermon illustrations that don't feel canned?",
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'The recycled ones — the starfish, the footprints, the drowning man refusing three rescues — fail because the congregation has heard them. Better sources are close at hand: the text itself, your own week, the work your people actually do, and history that is specific enough to be surprising.',
    body: [
      {
        h: 'Why the famous ones stopped working',
        p: 'An illustration works by making an abstract claim concrete and slightly surprising. The circulated classics have lost the surprise — many in your congregation have heard them from two other preachers — and a recognised illustration signals that the sermon came from a file rather than from wrestling with the passage. That signal costs more than the illustration gains.',
      },
      {
        h: 'Four sources that stay fresh',
        p: 'Your own week, told small and without a hero: the argument in the kitchen, the thing you got wrong on Tuesday. The work your congregation actually does — nurses, tradespeople, teachers, carers all have processes that map onto grace, patience and repair, and using them tells people their working life is visible from the pulpit. History specific enough to be strange rather than the same three anecdotes. And the Bible itself: the surrounding narrative is usually a better illustration of the doctrine than anything imported.',
      },
      {
        h: 'Make it carry one thing',
        p: 'The common failure is an illustration that is more interesting than the point, so people remember the story and not the claim. Test it by asking what a listener would say the sermon was about if they only remembered this. If the answer is the story, it needs shortening or cutting.',
      },
      {
        h: 'Using AI for this honestly',
        p: 'A model is useful for the first stage — analogies you have not thought of, historical examples to go and verify, a way into a passage you have preached too often. It is not a source of facts. Anything specific it hands you (a date, a study, a quotation, a moving story about a named person) has to be checked before it goes in front of people, because fabricated detail in a sermon is a real cost to your credibility. Using it as a thinking partner is fine; using it as a research assistant without verification is not.',
      },
    ],
    scriptures: [
      { ref: 'Matthew 13:34', text: 'Jesus spoke all these things to the crowd in parables; he did not say anything to them without using a parable.' },
      { ref: 'Mark 4:33', text: 'With many similar parables Jesus spoke the word to them, as much as they could understand.' },
      { ref: '1 Corinthians 2:1', text: 'I did not come with eloquence or human wisdom as I proclaimed to you the testimony about God.' },
    ],
    faqs: [
      { q: 'Is it dishonest to tell a story that happened to someone else?', a: 'Not if you say so. Telling another person\'s story as your own is the line, and congregations rarely forget catching a preacher at it. "A friend told me" costs nothing and keeps you honest.' },
      { q: 'How many illustrations should a sermon have?', a: 'Most preaching guides suggest one strong image per main point at most, and many good sermons carry a single one throughout. More than that and they compete with each other.' },
      { q: 'Can I use stories about my own family?', a: 'With their permission, and with real care as children get older. A good rule many pastors adopt: nothing your child would be embarrassed to have repeated at school, and nothing your spouse has not heard first.' },
      { q: 'Are illustration websites worth it?', a: 'They are convenient and they are also where the overused ones come from — if it is in a database, others have used it. Better as a prompt for your own thinking than as a source to lift from.' },
    ],
    related: ['how-do-i-preach-on-lament-without-losing-hope', 'should-my-church-use-ai', 'how-do-i-keep-my-congregation-engaged-between-sundays'],
  },
  {
    slug: 'does-my-church-need-an-app',
    question: 'Does my church need an app?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'Most small churches do not need a custom app, and the ones that buy one often find it sits unused. The real question is narrower: is there something your congregation needs between Sundays that a website and a group chat genuinely cannot do?',
    body: [
      {
        h: 'Start with the problem, not the product',
        p: 'Churches usually arrive at "we need an app" by way of a different frustration — people are disconnected midweek, announcements are not landing, newcomers disappear after three visits. An app may or may not touch those. Write the actual problem down first in one sentence. If it is "our announcements are not read," an app mostly relocates the unread announcement.',
      },
      {
        h: 'What a free website and a group chat already do',
        p: 'Service times, location, what to expect on a first visit, a sermon archive, a giving link — a plain website does all of that and is what visitors search for. Group messaging handles reminders and prayer chains. Between them they cover a large share of what small churches say they want, at no cost, and people are already competent with both.',
      },
      {
        h: 'Where a dedicated space earns its place',
        p: 'The case is stronger when something needs to be ongoing, private, and not tangled with the rest of someone\'s digital life. Prayer requests people would not post in a group chat. Sermon discussion that continues through the week. A place a newcomer can read and lurk without having to announce themselves. Those are hard to do in a chat thread, which scrolls, and on a website, which does not hold a conversation.',
      },
      {
        h: 'The questions worth asking any provider',
        p: 'What happens to our data if we stop paying? Who can see prayer requests and personal information, and is that enforced technically or by policy? What does it cost after the first year? Can we export what our congregation has written? How do you handle minors? A provider that answers those plainly is telling you something; one that deflects is also telling you something.',
      },
      {
        h: 'An honest note about kinwove',
        p: 'kinwove is one of the tools in this category, and it is in free beta — so this page would be poor advice if it pretended otherwise. It is built around Bible study, questions people are nervous to ask aloud, prayer and sermon discussion, rather than around push notifications and event admin. If what your church needs is check-in, rotas and giving, other tools do that better and this page would rather say so than sell you something you will not use.',
      },
    ],
    scriptures: [
      { ref: 'Acts 2:46', text: 'Every day they continued to meet together in the temple courts. They broke bread in their homes and ate together with glad and sincere hearts.' },
      { ref: 'Hebrews 10:24–25', text: 'And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together.' },
    ],
    faqs: [
      { q: 'Will an app make our congregation more connected?', a: 'Only if it carries something people already want to do. Tools amplify existing habits more than they create them — a congregation that talks midweek will talk more, and one that does not usually will not start because of software.' },
      { q: 'How much do church apps cost?', a: 'Widely — from free tiers to several hundred dollars a month for platforms with giving, check-in and event management. The larger cost is usually staff time to keep it populated, which is easy to underestimate.' },
      { q: 'What about older members who are not online?', a: 'Any digital tool has to be additional rather than the only channel, or you exclude the people most likely to need care. If an announcement only exists in the app, some of your congregation does not have it.' },
      { q: 'Is it safe to put prayer requests in an app?', a: 'Depends entirely on the provider. Prayer requests contain health, family and mental-health information. Ask specifically who can read them and whether that is enforced by the database or by a promise — the difference matters.' },
    ],
    related: ['should-my-church-use-ai', 'how-do-i-keep-my-congregation-engaged-between-sundays', 'how-do-we-follow-up-with-first-time-visitors'],
  },
  {
    slug: 'how-do-we-follow-up-with-first-time-visitors',
    question: 'How do we follow up with first-time visitors?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'Lightly, quickly, and with an exit. One short message within a few days, from a person rather than the church, that does not ask for anything. The most common mistake is not following up too little — it is following up too hard.',
    body: [
      {
        h: 'What visitors are actually worried about',
        p: 'Most first-time visitors arrive braced for two things: being singled out during the service, and being pursued afterwards. That fear shapes everything — it is why people sit at the back, leave during the last song, and give a fake-ish email if a card is pressed on them. Any follow-up that confirms the fear ends the relationship faster than no follow-up at all.',
      },
      {
        h: 'The shape that works',
        p: 'One message, a few days later, from a named human being. Warm, three or four sentences, no request attached. Say you were glad they came, offer one concrete thing they might want to know, and make the exit explicit — that there is no obligation to reply and no one will chase them. Then actually do not chase them. A second unanswered message is usually where people decide the place is not safe to explore quietly.',
      },
      {
        h: 'Stop making people identify themselves at the door',
        p: 'Connection cards, stand-up-and-wave welcomes and visitor gifts all force a decision on someone whose main need is to observe without commitment. Letting people be anonymous for as long as they want is a feature, not a gap. The ones who want contact will find a way to make it; the ones who do not will come back, which is the actual goal.',
      },
      {
        h: 'Make the first visit legible before it happens',
        p: 'Much of what follow-up tries to repair could be prevented by the website. What time it really starts, how long it runs, what people wear, whether children stay in, where to park, whether anyone will ask them to speak, what happens with money. Anxiety about those details keeps people away and makes the ones who come guarded. Answering them plainly does more than any follow-up sequence.',
      },
      {
        h: 'A realistic measure',
        p: 'Most visitors do not return, and that is normal — people are looking for a fit, and yours will not be it for many of them. The useful question is not whether someone came back but whether leaving was easy and being there was comfortable. Those are the things that make someone recommend you to a friend even after they chose elsewhere.',
      },
    ],
    scriptures: [
      { ref: 'Romans 15:7', text: 'Accept one another, then, just as Christ accepted you, in order to bring praise to God.' },
      { ref: 'Hebrews 13:2', text: 'Do not forget to show hospitality to strangers, for by so doing some people have shown hospitality to angels without knowing it.' },
      { ref: 'Luke 14:13–14', text: 'When you give a banquet, invite the poor, the crippled, the lame, the blind, and you will be blessed.' },
    ],
    faqs: [
      { q: 'How soon should we contact someone?', a: 'Within a few days is usual — soon enough to be connected to the visit, late enough not to feel like surveillance. Same-day messages often read as intense to someone who has not decided anything yet.' },
      { q: 'Should the pastor do the follow-up?', a: 'In a small church it is natural, though it can feel weightier to the visitor than a message from an ordinary member. What matters more is that it comes from a person with a name rather than a church-wide account.' },
      { q: 'What if they gave us their details but never replied?', a: 'Treat that as an answer and leave it. Giving contact details under mild social pressure is not consent to a sequence, and people notice the difference between welcome and pursuit.' },
      { q: 'Is it worth asking why someone did not come back?', a: 'Rarely useful and often uncomfortable to receive. If you want that information, it is better gathered from people who stayed — asking what nearly stopped them coming back in the first month.' },
    ],
    related: ['does-my-church-need-an-app', 'how-do-i-find-a-church', 'how-do-i-keep-my-congregation-engaged-between-sundays'],
  },
  {
    slug: 'why-are-young-adults-leaving-our-church',
    question: 'Why are young adults leaving our church, and what can we do?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'Surveys keep finding the same reasons, and they are not the ones churches expect. Not music, not style — but questions being shut down, hypocrisy in leadership, and how the church treats people it disagrees with. Programmes aimed at the symptom rarely move it.',
    body: [
      {
        h: 'What people actually say when they leave',
        p: 'Asked directly, young adults cite being unable to raise doubts without becoming a project, watching how leaders behaved when they thought it did not count, and how people outside the church were spoken about. Style complaints come up, but far down the list and usually as an acceptable thing to say instead of the real one. Churches that respond with a rebrand are answering the polite version of the question.',
      },
      {
        h: 'Doubt is the hinge',
        p: 'The single most repeated theme is what happened when someone admitted uncertainty. If the response was concern, correction, or a quiet change in how they were treated, they learned the community was conditional on agreement — and most people will not stay in a place where honesty costs them standing. Churches where doubt can be said out loud and survive it keep a noticeably higher share of their young adults, which makes sense: they never forced the choice.',
      },
      {
        h: 'What tends to help',
        p: 'Give questions somewhere real to go — a setting where hard ones get taken seriously rather than deflected, and where "we do not know" is an available answer. Give young adults actual responsibility rather than a designated ministry slot. Be visibly accountable about money and power, because that generation assumes institutions hide both and is watching to see if yours does. And speak about people who disagree with you as you would if they were in the room.',
      },
      {
        h: 'What usually does not',
        p: 'A separate young adults service, a new band, coffee, social media, or an event series aimed at a demographic. None of these is bad. They just do not address why people said they left, and they can make things worse by signalling that the church heard "we are boring" when what was said was closer to "we did not trust you with the truth."',
      },
      {
        h: 'Some of them come back, and how you part matters',
        p: 'A meaningful share of people who leave in their twenties return later, and the biggest factor in whether that door stays open is how they were treated on the way out. Someone pursued, guilted, or gossiped about does not come back. Someone who left and was told they were still welcome sometimes does, years later.',
      },
    ],
    scriptures: [
      { ref: 'Mark 9:24', text: 'Immediately the boy\'s father exclaimed, "I do believe; help me overcome my unbelief!"' },
      { ref: 'Jude 1:22', text: 'Be merciful to those who doubt.' },
      { ref: 'John 20:27', text: 'Then he said to Thomas, "Put your finger here; see my hands. Reach out your hand and put it into my side. Stop doubting and believe."' },
      { ref: '1 Timothy 4:12', text: 'Don\'t let anyone look down on you because you are young, but set an example for the believers.' },
    ],
    faqs: [
      { q: 'Is this just a phase they grow out of?', a: 'Some return, many do not, and treating it as a phase is itself one of the complaints — it tells someone their reasoning is being waited out rather than engaged. Better to take the stated reasons at face value.' },
      { q: 'Should we change our music or service style?', a: 'Only if you want to for its own sake. Style shows up in surveys but well below integrity, honesty about doubt, and how outsiders are treated. Changing the music and nothing else tends to disappoint everyone.' },
      { q: 'How do we let people doubt without teaching error?', a: 'By separating the question from the verdict. A church can hold clear convictions and still be a place where someone can say "I am not sure I believe this" without consequence. What drives people out is not being corrected, it is being managed.' },
      { q: 'What about young adults who moved away?', a: 'Plenty of departures are practical rather than spiritual — university, work, rent. Worth knowing which you are dealing with before diagnosing a crisis, and worth staying in touch with the ones who simply moved.' },
    ],
    related: ['how-do-i-pastor-someone-who-is-deconstructing', 'how-can-i-believe-when-i-have-doubts', 'what-if-church-hurt-you'],
  },
  // ── Added 2026-09-26 — SEARCH-INTENT pages ─────────────────────────────────
  // Daniel: "i mean a pastor looking for a study platform or a place to organize
  // his congregation a chat board etc."
  //
  // A different axis from every other page here. The rest answer someone with a
  // QUESTION; these answer someone already SHOPPING — they have decided they
  // need a tool and are comparing. That person searches in categories ("church
  // discussion board", "online bible study platform"), not in questions.
  //
  // ⚠️ THESE MUST STAY HONEST TO WORK. A buyer comparing options can tell a
  // sales page from a useful one in about ten seconds, and this audience talks
  // to each other. Each page names what kinwove does NOT do and says it is in
  // free beta. No competitor is named with specifics I have not verified.
  {
    slug: 'best-platform-for-church-small-groups',
    question: 'What is the best platform for church small groups and Bible study?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'There is no single best one — the honest question is which of four jobs you need done: midweek messaging, structured study, private prayer, or admin and giving. Most churches try to buy one tool for all four, and that is usually why it ends up unused.',
    body: [
      {
        h: 'Separate the four jobs before you compare anything',
        p: 'Midweek chatter is one job. Structured study — a plan, a passage, questions that carry over week to week — is another. Prayer that people would not post in a group chat is a third. Admin, rotas, check-in and giving is a fourth, and it is the one most "church platforms" are actually built around. Tools that are excellent at the fourth are often weak at the second, which is how a church ends up paying for software its small groups never open.',
      },
      {
        h: 'What general-purpose tools do well, and where they stop',
        p: 'Group messaging apps are free, everyone already has them, and nobody needs training — for reminders and quick coordination they are hard to beat. They stop at three points: conversation scrolls away, so a study thread is gone by the following week; there is no privacy boundary, so sensitive prayer sits in the same place as the rota; and there is no way for a newcomer to read quietly before joining in. Social network groups add reach but put your congregation\'s spiritual conversation inside an advertising business.',
      },
      {
        h: 'What to actually check before committing',
        p: 'Who can read prayer requests, and is that enforced by the database or by a promise in the marketing copy? What happens to everything your people wrote if you stop paying — can you export it? What does year two cost? How are minors handled? Does it work for the member who only has a phone and limited data? Ask those five in writing. The answers, and the willingness to give them, tell you more than any feature list.',
      },
      {
        h: 'The adoption problem is bigger than the feature problem',
        p: 'Almost every church that regrets a platform decision regrets it for the same reason: nobody used it. Assume that anything requiring a new account, a new app and a new habit will lose most of your congregation unless a leader is in there every week giving people a reason to return. Before buying, decide who that person is. If the answer is "the pastor, on top of everything else," look again at the page on being the only one leading.',
      },
      {
        h: 'Where kinwove fits, honestly',
        p: 'kinwove is built for the second and third jobs — Bible study, questions people are nervous to ask out loud, prayer, and sermon discussion that continues through the week. It is in free beta. It does not do check-in, rotas, childcare records or giving, and if those are your actual problem, a church management system is the right category and this is not it. It is also worth knowing it works for individuals, so a leader can try it alone before asking a congregation to sign up for anything.',
      },
    ],
    scriptures: [
      { ref: 'Acts 2:42', text: 'They devoted themselves to the apostles\' teaching and to fellowship, to the breaking of bread and to prayer.' },
      { ref: 'Colossians 3:16', text: 'Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom.' },
    ],
    faqs: [
      { q: 'Do we need paid software for small groups?', a: 'Often not. Plenty of thriving small groups run on a messaging thread and a printed study guide. Paid tools earn their place when you need privacy boundaries, content that persists, or study material you are not writing yourself.' },
      { q: 'What is the difference between a church management system and a study platform?', a: 'A church management system is an administrative database — membership, giving, rotas, attendance. A study platform is where the spiritual conversation happens. Some products claim both; be sceptical about which half was built first and which was added to complete a feature grid.' },
      { q: 'How do we get people to actually use it?', a: 'One named person posting into it every week, and a real reason to open it — a question people want to answer, a study that continues. Tools do not create habits; someone tending it does.' },
      { q: 'What about churches with older congregations?', a: 'Anything digital has to be additive, never the only channel. If an announcement exists only online, part of your congregation does not have it — and the people most likely to need pastoral care are often the ones least likely to be there.' },
    ],
    related: ['does-my-church-need-an-app', 'how-do-we-organize-our-congregation-online', 'how-do-i-keep-my-congregation-engaged-between-sundays'],
  },
  {
    slug: 'how-do-we-organize-our-congregation-online',
    question: 'How do we organise our congregation online?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'Decide what has to reach everyone, what is a conversation, and what is private — then give each its own channel. Most church communication problems are one channel doing all three jobs, which is why announcements get missed and prayer requests end up somewhere they should not be.',
    body: [
      {
        h: 'Three channels, not one',
        p: 'Broadcast is anything that must reach everyone: service changes, closures, deaths. Conversation is the ongoing life of the church — study, questions, encouragement. Confidential is prayer and pastoral need. Collapse all three into one group chat and each undermines the others: the announcement is buried under conversation, and someone shares something private in front of two hundred people because it was the only place to say it.',
      },
      {
        h: 'Broadcast should be boring and duplicated',
        p: 'Use something with near-universal reach, keep the volume low enough that people still read it, and always duplicate offline for members who are not online — a notice sheet, a phone call rota. The test of a broadcast channel is whether an urgent message on a Saturday night actually lands. If you are not confident it would, it is not a broadcast channel.',
      },
      {
        h: 'Conversation needs a reason to return',
        p: 'This is where most church spaces die. A forum nobody posts in is worse than none, because the silence is visible. Conversation works when something recurring lives there — the sermon discussion each week, a study people are working through, a question worth answering. Someone has to tend it, and that should be a named person who is not the pastor if at all possible.',
      },
      {
        h: 'Confidential needs a real boundary',
        p: 'Prayer requests routinely contain health information, family breakdown, addiction and mental health. That deserves more than an honour system. Ask any tool you are considering who can technically read it — the answer for a normal group chat is everyone in the group, and for many platforms it is any administrator. Decide deliberately who that should be and tell your congregation plainly, because they are entitled to know before they type.',
      },
      {
        h: 'Write the rules down once',
        p: 'A short, public note on what goes where, who moderates, and what happens if someone is unkind, saves an enormous amount of pastoral repair later. Include what you do with people\'s data and how someone leaves. Churches routinely collect more personal information than they have any plan for.',
      },
    ],
    scriptures: [
      { ref: '1 Corinthians 14:40', text: 'But everything should be done in a fitting and orderly way.' },
      { ref: 'Proverbs 11:13', text: 'A gossip betrays a confidence, but a trustworthy person keeps a secret.' },
      { ref: 'Galatians 6:2', text: 'Carry each other\'s burdens, and in this way you will fulfill the law of Christ.' },
    ],
    faqs: [
      { q: 'Is a group chat enough for a small church?', a: 'For a genuinely small congregation that already knows each other, often yes — for broadcast and conversation. The gap it leaves is confidential prayer, which most churches only notice after something private has been shared with everyone.' },
      { q: 'Should the church have its own space or use social media?', a: 'Social platforms bring reach and cost nothing up front. The trade is that your congregation\'s spiritual conversation sits inside an advertising business, beside a feed designed to pull attention away, and you do not control who sees what.' },
      { q: 'Who should moderate?', a: 'Not the pastor alone. Name two or three people, agree in advance what gets removed, and make sure someone other than the person being complained about can act.' },
      { q: 'What about safeguarding and young people?', a: 'Any space including minors needs a policy before it opens — who has access, whether adults can message children directly, and how concerns are reported. If a platform cannot tell you how it handles this, that is an answer.' },
    ],
    related: ['best-platform-for-church-small-groups', 'church-discussion-board-for-congregations', 'does-my-church-need-an-app'],
  },
  {
    slug: 'church-discussion-board-for-congregations',
    question: 'How do we set up a discussion board for our congregation?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'The hard part is not setting one up, it is giving people a reason to post. Most church boards die within two months because they launched empty and general. The ones that survive are anchored to something recurring — usually the sermon — and tended by a named person.',
    body: [
      {
        h: 'Why most church boards go quiet',
        p: 'A board launches with a general invitation to discuss anything, which gives nobody a specific reason to be the first to speak. People look, see three posts from the pastor, and do not return. Silence then becomes self-reinforcing, because an empty board signals that nobody is there. The fix is not promotion; it is anchoring it to something that happens every week regardless.',
      },
      {
        h: 'Anchor it to Sunday',
        p: 'The sermon is the one thing your whole congregation shares and already has opinions about. A question posted from it each week — a real question, not a comprehension check — gives people something specific to answer. It also means the board is never empty, because there is new content whether or not anyone replies. Churches that report a working discussion space almost always describe some version of this.',
      },
      {
        h: 'Someone has to tend it, and not the pastor',
        p: 'Every living board has a person who reads everything, replies to the quiet contributors, and makes sure nobody\'s first post sits ignored. That is a real job of maybe twenty minutes a week. It should not default to the pastor: if the pastor is the only voice, it becomes a broadcast channel with a comment box, and members write for approval rather than to each other.',
      },
      {
        h: 'Decide the rules before you need them',
        p: 'Agree in advance what is out of bounds, who can remove a post, and how someone raises a concern about another member. Church boards tend to break on politics, on doctrinal disputes between members, and on one person posting far more than everyone else. All three are much easier to handle with a written norm to point at than as a judgement call about a specific person.',
      },
      {
        h: 'Let people read without joining in',
        p: 'The majority will never post, and that is normal rather than failure. Newcomers especially need to watch for weeks before they are ready to be visible — forcing an introduction post is one of the reliable ways to lose them. Judge it by whether people are reading and whether the ones who do post get answered, not by how many contribute.',
      },
      {
        h: 'Where kinwove fits',
        p: 'kinwove includes a sermon discussion space of exactly this shape — a question carried through the week, with the congregation able to answer and reply — plus a prayer wall and Bible study alongside it. It is in free beta. It is not a general-purpose forum with categories and threads, so if you want a traditional message board with sub-forums, that is a different kind of product.',
      },
    ],
    scriptures: [
      { ref: 'Proverbs 27:17', text: 'As iron sharpens iron, so one person sharpens another.' },
      { ref: 'Acts 17:11', text: 'They received the message with great eagerness and examined the Scriptures every day to see if what Paul said was true.' },
      { ref: 'Ephesians 4:29', text: 'Do not let any unwholesome talk come out of your mouths, but only what is helpful for building others up.' },
    ],
    faqs: [
      { q: 'How many people do we need for a board to work?', a: 'Fewer than most expect — twenty engaged members can sustain a weekly conversation. What matters is consistency of the anchor post and someone replying, not headcount.' },
      { q: 'What do we do about arguments?', a: 'Have a stated norm, act early and privately rather than publicly, and be willing to close a thread. Most church board conflicts are not really about the topic, and moving the conversation off the board and into a phone call usually resolves what replies will not.' },
      { q: 'Should posting be anonymous?', a: 'An anonymous option lets people ask things they would never sign their name to, which is often where the real questions are. The trade-off is accountability, so most spaces that offer it keep it to specific areas such as prayer or questions rather than everywhere.' },
      { q: 'Can we just use a Facebook group?', a: 'Many churches do, and the reach is genuine. The trade-offs are that not everyone has an account, the conversation sits next to an attention-optimised feed, and you do not own or control the space.' },
    ],
    related: ['how-do-we-organize-our-congregation-online', 'best-platform-for-church-small-groups', 'how-do-i-keep-my-congregation-engaged-between-sundays'],
  },
  {
    slug: 'online-bible-study-platform-for-churches',
    question: 'What should we look for in an online Bible study platform?',
    category: 'For Pastors',
    updated: '2026-09-26',
    answer: 'Look at what it does when someone asks a hard question. Study tools are easy to compare on features and hard to compare on the thing that matters — whether a member with a real doubt gets a serious answer or a deflection that teaches them not to ask again.',
    body: [
      {
        h: 'The feature list is the least useful comparison',
        p: 'Every product in this category has reading plans, notes, highlights and a search. Those are table stakes and they look identical on a website. What separates them is editorial: which translations, whose commentary, what happens at the edges where Christians disagree, and whether the tool will admit uncertainty. None of that appears on a pricing page.',
      },
      {
        h: 'Test it with the question your members actually have',
        p: 'Before deciding, put a genuinely hard question into whatever you are evaluating. Did Judas go to heaven. Why does Genesis 1 not match Genesis 2. Why did God command what he commanded in Joshua. A tool that hands back confident certainty where the church has argued for centuries will eventually embarrass you in front of a member who knows better. One that says "Christians differ here, and this is why" is safe to put in front of a congregation.',
      },
      {
        h: 'Ask where the answers come from',
        p: 'If a platform uses AI — most new ones do — ask what it is grounded in, whether it cites what it draws on, and what it does when it does not know. AI that fabricates a plausible-sounding commentary attribution is worse than no AI, because it is wrong in a register that sounds authoritative. Ask also whether a member\'s conversations are private from church staff, and be clear with your congregation either way.',
      },
      {
        h: 'Consider who it is for',
        p: 'Tools built for seminary-trained users assume vocabulary most congregations do not have. Tools built for daily devotion often cannot go deep enough for someone in real difficulty. Be honest about which of your people you are buying for — and whether the sceptic, the new believer and the forty-year member can all use the same thing.',
      },
      {
        h: 'What kinwove does and does not do',
        p: 'kinwove is built around asking: tap any verse for a plain explanation, the historical context, cross-references, the underlying Hebrew or Greek, or a comparison of translations, and ask follow-up questions in plain language. It answers honestly where Christians disagree and says when it does not know, which is the test above. It is in free beta. It has no curriculum library, no video content and no group-admin tooling, so a church wanting a packaged course to run on a projector is better served elsewhere.',
      },
    ],
    scriptures: [
      { ref: '2 Timothy 2:15', text: 'Do your best to present yourself to God as one approved, a worker who does not need to be ashamed and who correctly handles the word of truth.' },
      { ref: 'Acts 8:30–31', text: '"Do you understand what you are reading?" "How can I," he said, "unless someone explains it to me?"' },
      { ref: 'Nehemiah 8:8', text: 'They read from the Book of the Law of God, making it clear and giving the meaning so that the people understood what was being read.' },
    ],
    faqs: [
      { q: 'Is it safe to let AI answer Bible questions?', a: 'It depends entirely on how it behaves at the limits. The risks are confident invention and flattening genuine disagreement into one answer. Test it with a contested question before putting it in front of your congregation, and prefer tools that cite and that will say they do not know.' },
      { q: 'Will this replace our in-person study?', a: 'It should not, and the good ones do not try. What a tool adds is the six days between meetings — the question someone has on Wednesday that will be forgotten by the next gathering.' },
      { q: 'What about members who ask things they would not say in group?', a: 'That is the strongest argument for having one. A great deal of honest doubt never gets voiced in a room, and a private place to ask often surfaces what pastoral conversation never reaches.' },
      { q: 'How much should this cost?', a: 'The range runs from free to per-seat subscriptions. Judge it on whether members will actually use it — an unused paid platform is the most common outcome in this category, and it is not primarily a pricing failure.' },
    ],
    related: ['best-platform-for-church-small-groups', 'should-my-church-use-ai', 'church-discussion-board-for-congregations'],
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
  /* Ask box — these pages are where search and ChatGPT drop people, and until
     now they dead-ended in two links to more static pages. The form hands the
     question to the app's existing ?q= handler: guests get three free
     exchanges, signed-in people get it sent straight into their chat. */
  .askbox{margin-top:34px;border-top:1px solid var(--line);padding-top:22px}
  .askbox .cat{margin-bottom:10px}
  .askbox form{display:flex;gap:8px;flex-wrap:wrap}
  .askbox input{flex:1 1 240px;min-width:0;padding:13px 15px;font-size:16px;font-family:inherit;
    color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:10px;outline:none}
  .askbox input:focus{border-color:var(--gold)}
  .askbox button{padding:13px 22px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;
    color:#fff;background:var(--ink);border:none;border-radius:999px}
  .askbox .note{font-size:12.5px;color:var(--muted);margin-top:9px}
</style></head><body>
<div class="bar"><a href="${SITE}"><span class="star">✦</span>kinwove</a></div>
<main>${bodyHtml}</main>
</body></html>`;
}

// ── /for-churches ───────────────────────────────────────────────────────────
// On Daniel's list since 31 July. Until now /for-churches, /pastors and
// /sermon-prep all returned the SPA fallback — a pastor who received an outreach
// email and looked kinwove up landed on "You don't have to have it figured out
// to belong here", which tells them nothing about what is being offered to them.
//
// Deliberately does not lead with sermon writing. AlignedAI gives that away free
// to 4,600+ pastors and monetises donation processing; competing on their
// strongest, cheapest feature is a bad trade. What kinwove has that they do not
// is somewhere a congregation's actual doubts can go.
export function renderForChurchesPage() {
  const canonical = `${SITE}/for-churches`;
  const title = 'kinwove for churches — where your congregation takes the questions they do not ask out loud';
  const description =
    'A place your people can take the questions they would not raise in a foyer — honest answers grounded in scripture, a prayer wall, and somewhere the week between Sundays actually goes. Free while in beta.';
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'WebPage',
      name: title, description, url: canonical,
      publisher: { '@type': 'Organization', name: 'kinwove', url: SITE },
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: [
        { q: 'What does kinwove actually do for a church?',
          a: 'It gives your congregation somewhere to take the questions they are not raising on a Sunday — answered honestly, grounded in scripture, without pressure. Alongside that: a prayer wall, a feed for your church, and sermon discussion.' },
        { q: 'Is this a sermon writing tool?',
          a: 'No. There are good tools for that and kinwove is not trying to be one. This is about the six days after the sermon rather than the writing of it.' },
        { q: 'What does it cost?',
          a: 'Nothing at the moment. kinwove is in free beta and is not taking payment from churches while that lasts.' },
        { q: 'What happens to what people type into it?',
          a: 'Conversations belong to the person who had them. A pastor does not get a feed of what their congregation has been asking, and kinwove stores no IP address and does no location tracking.' },
        { q: 'How much work is this for me?',
          a: 'A church page takes a few minutes to set up. After that the useful part runs without you — people ask what they were going to ask anyway, and you see the prayer wall.' },
      ].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  const bodyHtml = `
    <div class="cat">kinwove for churches</div>
    <h1>The questions your people are not asking you</h1>
    <div class="answer">Most of what someone is wrestling with never reaches the foyer. Not because they distrust you — because asking the pastor makes a doubt official. kinwove gives them somewhere to ask it at eleven at night, honestly, and usually that is what leads to a conversation with you rather than replacing one.</div>

    <h2>What it is</h2>
    <p>A place your congregation can take a hard question and get a straight answer — grounded in scripture, willing to say "I don't know", and built for people who are doubting or new rather than people who already speak the language. Around that sits a prayer wall, a feed for your church, and somewhere the week between Sundays can go.</p>

    <h2>What it is not</h2>
    <p>It is not a sermon writer. There are several good ones and kinwove is not trying to be another. It is not church management, giving, or a website builder. It does not hand you a dashboard of what your congregation has been confessing at midnight — those conversations belong to the people who had them.</p>

    <h2>Why a pastor might want it</h2>
    <p>Because the discipleship problem is Tuesday, not Sunday. People leave with something real and by midweek it has been crowded out, and nothing in a normal church app is built for the moment they wanted to keep pulling the thread. A question asked honestly midweek does more than a devotional nobody opens.</p>
    <p>And because some of your people are already typing their hardest questions into an AI tonight. That is happening whether or not a church is involved. The only open question is whether anything in that conversation points back toward a real person in a real church.</p>

    <blockquote>Now the Berean Jews were of more noble character than those in Thessalonica, for they received the message with great eagerness and examined the Scriptures every day to see if what Paul said was true.<span class="ref">Acts 17:11</span></blockquote>

    <h2>Honest about where this is</h2>
    <p>kinwove is young. It is in free beta, it is not taking money from churches, and it does not yet have a congregation using it at scale — you would be early, with everything that means both ways. If that is the wrong stage for your church, that is a completely reasonable read.</p>
    <p>What that also means: if you tell us what your people actually need, it can still be built around that.</p>

    <h2>Questions</h2>
    <div class="faq">
      <h3>Is this a sermon writing tool?</h3>
      <p>No. This is about the six days after the sermon rather than the writing of it.</p>
      <h3>What does it cost?</h3>
      <p>Nothing while kinwove is in beta. No card, no trial clock.</p>
      <h3>Do I see what my congregation asks?</h3>
      <p>No. Their conversations are theirs. You see the prayer wall, and what people choose to post.</p>
      <h3>How much setup is it?</h3>
      <p>A few minutes for a church page and a join code. After that it mostly runs without you.</p>
      <h3>What do you do with people's data?</h3>
      <p>kinwove stores no IP address and does no location tracking. Conversations belong to the person who had them.</p>
    </div>

    <p style="margin-top:32px"><a class="cta" href="${SITE}/?church=1">Set up your church page →</a></p>
    <p style="font-size:14px;color:var(--muted)">Or write to <a href="mailto:hello@kinwove.com" style="color:var(--gold)">hello@kinwove.com</a> and ask a real question first. A person answers.</p>
  `;

  return shell({ title, description, canonical, jsonLd, bodyHtml });
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
    <div class="askbox">
      <div class="cat">Still wondering something?</div>
      <form action="${SITE}/" method="get">
        <input type="text" name="q" required maxlength="500" autocomplete="off"
               placeholder="Ask your own question…" aria-label="Ask your own question">
        <button type="submit">Ask</button>
      </form>
      <div class="note">Three questions free, no account needed.</div>
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
