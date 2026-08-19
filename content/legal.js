// ── kinwove legal pages — Privacy Policy + Terms of Service ───────────────────
// Server-rendered static HTML (crawlable, App-Store-linkable) served at /privacy
// and /terms. Plain-language, honest, grounded in what the app actually does.
//
// ⚠️ Drafted in good faith, NOT legal advice. Daniel should have these reviewed
// (a lawyer, or a reputable template service) before relying on them commercially
// — especially the payments, liability, and children's-data sections. Update the
// EFFECTIVE date and the company/jurisdiction line when finalized.

import { TERMS_VERSION } from '../src/constants.js';

const EFFECTIVE = 'August 19, 2026';
const CONTACT = 'hello@kinwove.com';
// TODO(Daniel): confirm legal entity name + province for the governing-law line.
const ENTITY = 'kinwove';
const JURISDICTION = 'the Province of British Columbia, Canada';

const PRIVACY = {
  title: 'Privacy Policy',
  intro: `kinwove is a place to explore faith honestly — with an AI companion, a community, and Bible tools. This policy explains, in plain language, what we collect, why, and the control you have. We are a Canadian service and follow Canadian privacy law (PIPEDA); where other laws apply to you (such as the GDPR), we honor the equivalent rights.`,
  sections: [
    { h: 'What we collect', p: `<strong>Account &amp; profile:</strong> your email, the name you choose, and optional details you provide (such as where you are in your faith journey). <strong>What you create:</strong> your questions to the AI, posts, prayers, comments, notes, and messages. <strong>Payments:</strong> if you subscribe, our payment processor (Stripe) handles your card — we never see or store card numbers, only a customer reference. <strong>Basic usage:</strong> privacy-friendly, aggregate analytics (via Plausible) with no cross-site tracking and no advertising cookies.` },
    { h: 'How we use it', p: `To provide the service: answer your questions, show your community, deliver the Bible tools, and send the emails you've asked for (daily verse, welcome notes) — each with a one-tap unsubscribe. We use your intake details to make the AI's answers more relevant to you. We do <strong>not</strong> sell your personal information, and we do not use your private conversations for advertising.` },
    { h: 'Your AI conversations', p: `Your chats with the AI are private to your account. They are processed by our AI provider (Anthropic) solely to generate your answer, and are not sold or made public. We may review anonymized, aggregated patterns to improve quality and safety, and — as noted below — content that indicates someone may be in danger may trigger a safety response.` },
    { h: 'Who we share it with (service providers)', p: `We use trusted providers strictly to run kinwove: <strong>Supabase</strong> (secure database &amp; sign-in), <strong>Anthropic</strong> (AI), <strong>Stripe</strong> (payments), <strong>Resend</strong> (email delivery), <strong>American Bible Society / api.bible</strong> (scripture text &amp; audio), and <strong>Plausible</strong> (privacy-first analytics). Each receives only what it needs to do its job. We may also disclose information if required by law or to protect someone's safety.` },
    { h: 'Safety', p: `kinwove is not a crisis service. If our systems detect that you may be at risk of harm, we may surface crisis resources and, within a church's care feature, alert that church's care team so a real person can reach out. If you are in immediate danger, please contact your local emergency number or a crisis line such as 988 (US &amp; Canada).` },
    { h: 'Your rights &amp; choices', p: `You can edit your profile, unsubscribe from any email, block other members, and <strong>delete your account</strong> at any time from Settings — which removes your personal data. You may also request a copy of your data. To exercise any right, use the in-app controls or email us at <a href="mailto:${CONTACT}">${CONTACT}</a>.` },
    { h: 'Children', p: `kinwove is intended for people aged 13 and older. Younger members may only be added by their church through its youth program, with the involvement of a parent or guardian and the church. We do not knowingly collect data from children under 13 outside that supervised path; if you believe we have, contact us and we will remove it.` },
    { h: 'Data retention &amp; security', p: `We keep your information for as long as your account is active, then delete it on request or account closure (some records may persist briefly in backups). We protect your data with industry-standard measures, though no online service can promise perfect security.` },
    { h: 'Changes', p: `We'll update this page when our practices change and revise the date above. Significant changes will be communicated in the app or by email.` },
    { h: 'Contact', p: `Questions about your privacy? Email <a href="mailto:${CONTACT}">${CONTACT}</a>. This service is operated by ${ENTITY} and governed by the laws of ${JURISDICTION}.` },
  ],
};

const TERMS = {
  title: 'Terms of Service',
  intro: `Welcome to kinwove. By creating an account or using the service, you agree to these terms. We've kept them plain — please read them.`,
  sections: [
    { h: 'Who can use kinwove', p: `You must be at least 13 years old (younger members only through a church's supervised youth program). By using kinwove you confirm the information you provide is accurate and that you'll keep your login secure.` },
    { h: `What kinwove is — and isn't`, p: `kinwove offers an AI faith companion, community features, and Bible tools for exploration and encouragement. It is <strong>not</strong> a substitute for professional advice — medical, mental-health, legal, or financial — and it is <strong>not</strong> a crisis or emergency service. In an emergency, contact local emergency services or a crisis line.` },
    { h: 'About the AI', p: `The AI aims to be honest and grounded in scripture, but it can be wrong, incomplete, or reflect the limits of its training. Treat its answers as a thoughtful starting point, not authoritative theological, medical, or legal counsel — and verify anything important, especially quotations and sources.` },
    { h: 'Your content', p: `You own what you create (posts, prayers, comments, notes). By posting, you grant kinwove a limited license to store and display it to the audience you choose so the service can function. Don't post content you don't have the right to share.` },
    { h: 'Community conduct', p: `Be kind. You agree not to harass, threaten, deceive, or endanger others; not to post illegal, hateful, sexually exploitative, or spam content; and not to impersonate others or abuse the platform. We may remove content and suspend or terminate accounts that violate these rules, especially where anyone's safety is at stake.` },
    { h: 'Subscriptions &amp; payments', p: `Some features require a paid plan. Prices are shown before you pay. Subscriptions renew automatically until cancelled; you can cancel anytime and keep access through the paid period. Payments are handled by Stripe. Refunds are handled case by case — contact us.` },
    { h: 'Termination', p: `You can delete your account anytime from Settings. We may suspend or end access for violations of these terms or to protect the community. On termination, your right to use kinwove ends and your data is handled per the Privacy Policy.` },
    { h: 'kinwove is in beta', p: `kinwove is currently in beta and free to use. Features may change, break, or be withdrawn without notice, and data can occasionally be lost — so please don't rely on kinwove as the only copy of anything that matters to you. We'd rather build this in the open with you than wait years for perfect, but that means accepting it as a work in progress. Everything in the section below applies with particular force while the service is free.` },
    { h: 'Disclaimers &amp; liability', p: `kinwove is provided "as is" and "as available," without warranties of any kind, whether express or implied — including any implied warranty that it is fit for a particular purpose, uninterrupted, or error-free. You use it at your own discretion and risk. To the fullest extent permitted by law, neither ${ENTITY} nor its owners, directors, officers, employees, contractors, or suppliers is liable for indirect, incidental, special or consequential damages, or for any loss of data, goodwill, or profits, and their total combined liability for any claim is limited to the amount you paid us in the 12 months before it arose (or, where you paid nothing, one hundred Canadian dollars). Those people and companies are intended beneficiaries of this section and may rely on it directly. Nothing here excludes liability that cannot be excluded by law.` },
    { h: 'Changes to these terms', p: `We may update these terms; we'll revise the date above and, for material changes, notify you in the app or by email. Continued use after changes means you accept them.` },
    { h: 'Governing law &amp; contact', p: `These terms are governed by the laws of ${JURISDICTION}. Questions? Email <a href="mailto:${CONTACT}">${CONTACT}</a>.` },
  ],
};

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderLegalPage(which) {
  const doc = which === 'terms' ? TERMS : PRIVACY;
  const other = which === 'terms' ? { href: '/privacy', label: 'Privacy Policy' } : { href: '/terms', label: 'Terms of Service' };
  const body = doc.sections.map((s) => `
      <section>
        <h2>${s.h}</h2>
        <p>${s.p}</p>
      </section>`).join('');
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${doc.title} — kinwove</title>
<meta name="description" content="${esc(doc.title)} for kinwove — how we handle your data and the terms of using the service.">
<link rel="canonical" href="https://www.kinwove.com/${which === 'terms' ? 'terms' : 'privacy'}">
<style>
  body{margin:0;background:#FAF3E2;color:#2C1810;font-family:Georgia,'Times New Roman',serif;line-height:1.65}
  .wrap{max-width:720px;margin:0 auto;padding:48px 24px 80px}
  .eyebrow{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A85530;font-weight:700}
  h1{font-size:32px;letter-spacing:-0.5px;margin:10px 0 4px}
  .date{font-size:13px;color:#8E7060;margin-bottom:8px}
  .intro{font-size:16px;color:#5A4733;margin:14px 0 8px}
  h2{font-size:19px;margin:30px 0 6px}
  p{font-size:15.5px;color:#3a2c1e;margin:0}
  a{color:#8E5528}
  .foot{margin-top:44px;padding-top:18px;border-top:1px solid rgba(26,17,8,0.12);font-size:13px;color:#8E7060}
  .foot a{color:#A85530;text-decoration:none}
</style></head><body>
  <div class="wrap">
    <div class="eyebrow">✦ kinwove</div>
    <h1>${doc.title}</h1>
    <div class="date">Effective ${EFFECTIVE} &middot; version ${TERMS_VERSION}</div>
    <p class="intro">${doc.intro}</p>
    ${body}
    <div class="foot">
      <a href="/">← Back to kinwove</a> &nbsp;·&nbsp; <a href="${other.href}">${other.label}</a> &nbsp;·&nbsp; <a href="mailto:${CONTACT}">${CONTACT}</a>
    </div>
  </div>
</body></html>`;
}
