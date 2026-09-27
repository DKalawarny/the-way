// ── kinwove Answers — Persian (Farsi) ────────────────────────────────────────
//
// ⭐ WHY FARSI FIRST. Of every language missing from kinwove, this was the
// largest gap: Iran has one of the fastest-growing underground churches in the
// world, and nothing here reached it. A real logged-out visitor also asked
// "i grew up muslim now im questioning whos jesus" — so the first page
// translated is the one that answers exactly that.
//
// ⚠️ HOW THESE ARE CHECKED, AND WHAT THAT DOES NOT COVER. Every block is
// round-tripped: translated to Farsi, then back to English by a separate
// literal-translation pass, and the back-translation compared to the source for
// added claims, dropped hedges, and altered scripture. That catches MEANING
// drift. It does NOT establish that the Farsi reads naturally to a native
// speaker — no one on this project can judge that, and it should be reviewed by
// one before this is promoted anywhere.
//
// ⚠️ SCRIPTURE. The verse text here is a rendering of the English cited in the
// source page, NOT a quotation from a recognised Persian translation. It is
// labelled that way on the page. Presenting an unverified rendering as though
// it were an established translation would be the worst error available here.
export const ANSWERS_FA = [
  {
    slug: 'is-jesus-really-god',
    lang: 'fa',
    dir: 'rtl',
    question: 'آیا عیسی واقعاً خداست؟',
    category: 'مسیح',
    updated: '2026-09-26',
    answer: 'مسیحیت مدعی است که عیسی تنها یک معلم حکیم نبود، بلکه خدا در قالب انسان بود. او گناهان را آمرزید، کاری که تنها از خدا برمی‌آید، پرستش را پذیرفت و گفت: «پیش از آنکه ابراهیم باشد، من هستم.» یا این سخن راست است، یا او به‌سختی در اشتباه بوده است — اما «صرفاً یک معلم خوب اخلاق» هرگز واقعاً یکی از گزینه‌ها نبوده است.',
    body: [
      {
        h: 'او چیزهایی گفت و کرد که تنها خدا حق انجامشان را دارد',
        p: 'عیسی گناهانی را که مردم در حق یکدیگر مرتکب شده بودند آمرزید، پرستش را پذیرفت و نام خاص خدا را بر خود نهاد. سرسخت‌ترین منتقدانش دقیقاً فهمیدند که او چه ادعایی می‌کند — و به همین سبب او را به کفرگویی متهم کردند. او گزینهٔ «صرفاً یک معلم» را باقی نگذاشت.',
      },
      {
        h: 'دروغ‌گو، دیوانه، یا خداوند',
        p: 'کسی که چنین سخنانی می‌گوید یا دروغ می‌گوید، یا دچار توهم است، یا راست می‌گوید. تنها چیزی که نمی‌تواند باشد این است که صرفاً یک معلم بزرگ اخلاق باشد — زیرا معلمان بزرگ اخلاق ادعای خدا بودن نمی‌کنند. شما باید تصمیم بگیرید که او کدام‌یک از این سه بود.',
      },
      {
        h: 'نخستین پیروان او را همچون خدا پرستیدند',
        p: 'تنها چند سال پس از مرگ او، یهودیانی یکتاپرست و متدیّن — کسانی که پرستش یک انسان برایشان اندیشیدنی نبود — به عیسی دعا می‌کردند و او را خداوند می‌خواندند. چیزی آنان را متقاعد کرده بود که او بیش از یک انسان است.',
      },
    ],
    scriptures: [
      { ref: 'یوحنا ۸:۵۸', text: 'عیسی پاسخ داد: «آمین، آمین، به شما می‌گویم، پیش از آنکه ابراهیم باشد، من هستم.»' },
      { ref: 'یوحنا ۱:۱', text: 'در آغاز کلمه بود، و کلمه نزد خدا بود، و کلمه خدا بود.' },
    ],
    faqs: [
      { q: 'مگر عیسی فقط ادعای پیامبری نکرد؟', a: 'ادعاهای او بسیار فراتر از پیامبری رفت — آمرزیدن گناهان، پذیرفتن پرستش، و برگرفتن نام خدا برای خود. به همین دلیل بود که او را به کفرگویی متهم کردند.' },
      { q: 'کجای کتاب مقدس می‌گوید عیسی خداست؟', a: 'در جاهای بسیار — یوحنا ۱:۱، یوحنا ۸:۵۸، کولسیان باب ۱، و آنجا که عیسی پرستش توما را با گفتن «ای خداوند من و ای خدای من» در یوحنا ۲۰:۲۸ می‌پذیرد.' },
      { q: 'اگر مطمئن نیستم او خداست، آیا می‌توانم پیرو او باشم؟', a: 'بسیاری پیش از آنکه به یقین برسند، پیروی و جست‌وجو را آغاز می‌کنند. ایمان اغلب در طول راه رشد می‌کند، نه پیش از آنکه به راه بیفتید.' },
    ],
    related: [],
    // The English page this was translated from. Used for the hreflang pair and
    // so a reader can reach the source.
    source: 'is-jesus-really-god',
  },
];

export const ANSWERS_FA_BY_SLUG = Object.fromEntries(ANSWERS_FA.map((a) => [a.slug, a]));
