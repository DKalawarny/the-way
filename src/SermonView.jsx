import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T, RADIUS, SPACE, SHADOW } from './theme.js';

const SermonDiscussion = lazy(() => import('./SermonDiscussion.jsx'));

const KIND_LABEL = {
  daily_verse:    'Daily verse',
  group_question: 'Discussion question',
  going_deeper:   'Going deeper',
  kid_version:    'For kids',
};

const KIND_TONE = {
  daily_verse:    { rail: T.gold,     eyebrow: T.goldDark,  bg: 'rgba(196,129,58,0.08)' },
  group_question: { rail: '#3F6B5E',  eyebrow: '#2F5547',   bg: 'rgba(63,107,94,0.08)'  },
  going_deeper:   { rail: '#7A4E2C',  eyebrow: '#5C3A20',   bg: 'rgba(122,78,44,0.08)'  },
  kid_version:    { rail: '#A56B3F',  eyebrow: '#7A4E2C',   bg: 'rgba(165,107,63,0.08)' },
};

function formatWeekOf(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'long', day: 'numeric',
    });
  } catch { return null; }
}

export default function SermonView({ session, profile, sermonId, onBack }) {
  const [sermon, setSermon]   = useState(null);
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const isPastor = !!(sermon && session?.user?.id && sermon.pastor_id === session.user.id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sermonId) return;
      setLoading(true);
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase
          .from('sermons')
          .select('id, church_id, pastor_id, title, scripture_ref, summary, week_starts_on')
          .eq('id', sermonId)
          .maybeSingle(),
        supabase
          .from('sermon_content')
          .select('id, kind, day, body, scripture, sort_order, created_at')
          .eq('sermon_id', sermonId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
      ]);
      if (cancelled) return;
      setSermon(s ?? null);
      setItems(c ?? []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [sermonId]);

  if (loading) {
    return (
      <div className="scene" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>Loading sermon…</div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="scene" style={{ minHeight: '100vh', padding: '40px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18,
          }}>← Back</button>
          <div style={{ fontFamily: T.serif, fontSize: 18, color: T.inkMuted }}>Sermon not found.</div>
        </div>
      </div>
    );
  }

  const week = formatWeekOf(sermon.week_starts_on);
  const questions = items.filter((i) => i.kind === 'group_question');
  const verses    = items.filter((i) => i.kind === 'daily_verse');
  const deepers   = items.filter((i) => i.kind === 'going_deeper');
  const kids      = items.filter((i) => i.kind === 'kid_version');

  return (
    <div className="scene" style={{ minHeight: '100vh', paddingBottom: 90 }}>
      {/* Top bar */}
      <header style={{
        padding: '0 16px', height: 56, background: T.white,
        borderBottom: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '6px 4px',
        }}>← Back</button>
        <div style={{ marginLeft: 'auto', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700 }}>
          This week
        </div>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: `${SPACE[6]}px ${SPACE[5]}px ${SPACE[4]}px` }}>

        {/* Hero */}
        <article className="float-in" style={{
          position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${T.parchment} 0%, ${T.parchmentDark} 100%)`,
          border: `1px solid ${T.line}`, borderRadius: RADIUS.xl,
          padding: `${SPACE[6]}px ${SPACE[5]}px`, marginBottom: SPACE[6],
          boxShadow: SHADOW.warm,
        }}>
          <div className="section-eyebrow" style={{ marginBottom: 6, color: T.goldDark }}>
            ✦ Sunday {week ?? ''}
          </div>
          <h1 className="editorial-h1" style={{ fontSize: 28, marginBottom: 6 }}>
            {sermon.title}
          </h1>
          {sermon.scripture_ref && (
            <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.goldDark, marginBottom: SPACE[3] }}>
              {sermon.scripture_ref}
            </div>
          )}
          {sermon.summary && (
            <p style={{ fontFamily: T.serif, fontSize: 15.5, color: T.inkSoft, lineHeight: 1.7, margin: 0 }}>
              {sermon.summary}
            </p>
          )}
        </article>

        {/* Discussion questions — the heart of the page */}
        {questions.length > 0 && (
          <section style={{ marginBottom: SPACE[6] }}>
            <div style={{ marginBottom: SPACE[4], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <div className="section-eyebrow">Discuss</div>
              <div className="rule-gold" style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  number={i + 1}
                  item={q}
                  churchId={sermon?.church_id}
                  sessionUserId={session?.user?.id}
                  isPastor={isPastor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Going deeper notes (no discussion — read only) */}
        {deepers.length > 0 && (
          <section style={{ marginBottom: SPACE[6] }}>
            <div style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <div className="section-eyebrow">Going deeper</div>
              <div className="rule-gold" style={{ flex: 1 }} />
            </div>
            {deepers.map((d) => (
              <ContentCard key={d.id} item={d} />
            ))}
          </section>
        )}

        {/* Daily verses */}
        {verses.length > 0 && (
          <section style={{ marginBottom: SPACE[6] }}>
            <div style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <div className="section-eyebrow">Daily verses</div>
              <div className="rule-gold" style={{ flex: 1 }} />
            </div>
            {verses.map((v) => (
              <ContentCard key={v.id} item={v} />
            ))}
          </section>
        )}

        {/* Kids */}
        {kids.length > 0 && (
          <section style={{ marginBottom: SPACE[6] }}>
            <div style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <div className="section-eyebrow">For kids</div>
              <div className="rule-gold" style={{ flex: 1 }} />
            </div>
            {kids.map((k) => (
              <ContentCard key={k.id} item={k} />
            ))}
          </section>
        )}

        {questions.length === 0 && verses.length === 0 && deepers.length === 0 && kids.length === 0 && (
          <div style={{
            background: T.white, border: `1px dashed ${T.line}`, borderRadius: RADIUS.lg,
            padding: `${SPACE[6]}px ${SPACE[4]}px`, textAlign: 'center',
            fontFamily: T.serif, fontStyle: 'italic', color: T.inkMuted, fontSize: 14.5, lineHeight: 1.6,
          }}>
            Nothing posted for this sermon yet.
            {isPastor && <><br />Open ChurchAdmin → Sermons to add talking points and questions.</>}
          </div>
        )}

        {/* FB-style sermon thread — sermon at top of the page, comments below.
            One unified place to react to Sunday, distinct from the
            per-question threads above (which are a more focused study tool).
            Expanded by default so the comment box is right there. */}
        <section style={{ marginTop: SPACE[6] }}>
          <div style={{ marginBottom: SPACE[4], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
            <div className="section-eyebrow">Discussion</div>
            <div className="rule-gold" style={{ flex: 1 }} />
          </div>
          <div style={{
            background: T.white, border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
            padding: `${SPACE[5]}px ${SPACE[5]}px ${SPACE[4]}px`,
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkMuted, lineHeight: 1.6, marginBottom: SPACE[3] }}>
              What stood out from Sunday? Replies show your name unless you check "Anonymously."
            </div>
            <Suspense fallback={<div style={{ color: T.inkMuted, fontSize: 13, fontFamily: T.serif }}>Loading…</div>}>
              <SermonDiscussion
                sermonId={sermon.id}
                churchId={sermon.church_id}
                sessionUserId={session?.user?.id}
                isPastor={isPastor}
                defaultOpen
              />
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuestionCard({ number, item, churchId, sessionUserId, isPastor }) {
  const tone = KIND_TONE.group_question;
  return (
    <article style={{
      position: 'relative',
      background: `linear-gradient(180deg, ${tone.bg}, ${T.white} 70%)`,
      border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
      padding: `${SPACE[5]}px ${SPACE[5]}px ${SPACE[4]}px ${SPACE[6]}px`,
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: tone.rail }} />
      <div className="section-eyebrow" style={{ color: tone.eyebrow, marginBottom: 6 }}>
        Question {number}
      </div>
      {item.scripture && (
        <div style={{ fontSize: 12, fontWeight: 600, color: T.goldDark, letterSpacing: 0.4, marginBottom: 6 }}>
          {item.scripture}
        </div>
      )}
      <div className="editorial-h2" style={{ fontSize: 19, lineHeight: 1.4, marginBottom: SPACE[4] }}>
        {item.body}
      </div>
      <Suspense fallback={<div style={{ color: T.inkMuted, fontSize: 13, fontFamily: T.serif }}>Loading…</div>}>
        <SermonDiscussion
          sermonContentId={item.id}
          churchId={churchId}
          sessionUserId={sessionUserId}
          isPastor={isPastor}
          defaultOpen
        />
      </Suspense>
    </article>
  );
}

function ContentCard({ item }) {
  const tone = KIND_TONE[item.kind] ?? KIND_TONE.daily_verse;
  return (
    <article style={{
      position: 'relative',
      background: T.white, border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
      padding: `${SPACE[4]}px ${SPACE[5]}px`, marginBottom: SPACE[3],
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: tone.rail }} />
      {item.day != null && (
        <div className="section-eyebrow" style={{ color: tone.eyebrow, marginBottom: 4 }}>
          Day {item.day}
        </div>
      )}
      {item.scripture && (
        <div style={{ fontSize: 12, fontWeight: 600, color: T.goldDark, letterSpacing: 0.4, marginBottom: 4 }}>
          {item.scripture}
        </div>
      )}
      <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {item.body}
      </div>
    </article>
  );
}
