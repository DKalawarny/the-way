import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T, RADIUS, SPACE, SHADOW } from './theme.js';
import PostImageGrid from './PostImageGrid.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const SermonDiscussion = lazy(() => import('./SermonDiscussion.jsx'));

const KIND_LABEL = {
  daily_verse:    'Daily question',
  group_question: 'Discussion question',
  going_deeper:   'Going deeper',
  kid_version:    'For kids',
};

const KIND_TONE = {
  daily_verse:    { rail: T.gold,     eyebrow: T.goldDark,  bg: 'rgba(184,115,58,0.08)' },
  group_question: { rail: '#3F6B5E',  eyebrow: T.resolvedText, bg: 'rgba(63,107,94,0.08)'  },
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

export default function SermonView({ session, profile, sermonId, onBack, onChangeSermon, onOpenChurch, chromeless = false }) {
  const [sermon, setSermon]   = useState(null);
  const [churchName, setChurchName] = useState('');
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [siblings, setSiblings] = useState([]); // other published sermons for same church
  // Pastor-only: when true, also reveal items that haven't dropped yet
  // (drafts with no scheduled_at, or future-scheduled).
  const [pastorPreview, setPastorPreview] = useState(false);

  // Always open at the top of the page
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [sermonId]);

  const isPastor = !!(sermon && session?.user?.id && sermon.pastor_id === session.user.id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sermonId) return;
      setLoading(true);
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase
          .from('sermons')
          .select('id, church_id, pastor_id, title, scripture_ref, summary, week_starts_on, image_urls')
          .eq('id', sermonId)
          .maybeSingle(),
        supabase
          .from('sermon_content')
          .select('id, kind, day, body, scripture, sort_order, created_at, scheduled_at')
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

  // Load sibling sermons + church name once we know the church_id
  useEffect(() => {
    if (!sermon?.church_id) return;
    supabase
      .from('sermons')
      .select('id, title, week_starts_on')
      .eq('church_id', sermon.church_id)
      .eq('is_published', true)
      .order('week_starts_on', { ascending: false })
      .then(({ data }) => setSiblings(data ?? []));
    supabase
      .from('churches')
      .select('name')
      .eq('id', sermon.church_id)
      .maybeSingle()
      .then(({ data }) => setChurchName(data?.name ?? ''));
  }, [sermon?.church_id]);

  if (loading) {
    return (
      <div className="scene" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>Loading sermon…</div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="scene" style={{ minHeight: '100vh', padding: '40px 20px 80px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer',
            padding: '10px 0', marginBottom: 8, minHeight: 44, display: 'flex', alignItems: 'center',
          }}>← Back</button>
          <div style={{ fontFamily: T.serif, fontSize: 18, color: T.inkMuted }}>Sermon not found.</div>
        </div>
      </div>
    );
  }

  const week    = formatWeekOf(sermon.week_starts_on);
  const now     = Date.now();
  // Daily questions = new unified flow (daily_verse) PLUS any legacy
  // group_question rows on older sermons.
  const dailyAll = items.filter((i) => i.kind === 'daily_verse' || i.kind === 'group_question');

  // A daily_verse is hidden if it has no scheduled_at (draft) or its
  // scheduled_at is in the future. Legacy group_question rows always show.
  const isHiddenForMembers = (it) => {
    if (it.kind !== 'daily_verse') return false;
    if (it.scheduled_at == null) return true;
    return new Date(it.scheduled_at).getTime() > now;
  };

  const visibleDailies = dailyAll.filter((i) => !isHiddenForMembers(i));
  const hiddenCount    = dailyAll.length - visibleDailies.length;
  const dailies        = (isPastor && pastorPreview) ? dailyAll : visibleDailies;
  const deepers        = items.filter((i) => i.kind === 'going_deeper');
  const kids           = items.filter((i) => i.kind === 'kid_version');

  return (
    <div className="scene" style={{ minHeight: '100vh', paddingBottom: 90 }}>
      {/* Top bar — hidden when wrapped in ChurchModeShell (shell owns nav). */}
      {!chromeless && (
        <header style={{
          background: T.white, borderBottom: `1px solid ${T.line}`,
          position: 'sticky', top: 0, zIndex: 10,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}>
          <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center' }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer',
              padding: '0 12px 0 0', minHeight: 44, display: 'flex', alignItems: 'center',
            }}>← Sermons</button>
            {onOpenChurch && sermon?.church_id && churchName && (
              <button onClick={() => onOpenChurch(sermon.church_id)} style={{
                marginLeft: 'auto', background: 'none', border: 'none', color: T.goldDark,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                padding: '0 0 0 12px', minHeight: 44, display: 'flex', alignItems: 'center',
                maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{churchName} →</button>
            )}
          </div>
        </header>
      )}

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
            <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> Sunday {week ?? ''}
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
          {Array.isArray(sermon.image_urls) && sermon.image_urls.length > 0 && (
            <PostImageGrid urls={sermon.image_urls} />
          )}
        </article>

        {/* Daily questions — the heart of the page.
            Each one drops here (and into the church feed) on its scheduled
            day. Visitors only see items that have already dropped. Pastors
            see the same gated view by default with a "Preview as pastor"
            toggle to reveal scheduled / draft items. */}
        {dailyAll.length > 0 && (
          <section style={{ marginBottom: SPACE[6] }}>
            <div style={{ marginBottom: SPACE[4], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <div className="section-eyebrow">Daily questions</div>
              <div className="rule-gold" style={{ flex: 1 }} />
            </div>

            {/* Pastor-only: preview toggle when there are unreleased items. */}
            {isPastor && hiddenCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, flexWrap: 'wrap',
                background: T.parchment, border: `1px solid ${T.goldLight}`,
                borderRadius: RADIUS.lg, padding: '10px 14px', marginBottom: SPACE[4],
              }}>
                <div style={{ fontSize: 12.5, color: T.goldDark, fontStyle: 'italic' }}>
                  {pastorPreview
                    ? `Previewing all ${dailies.length} questions. Visitors only see ${visibleDailies.length} so far.`
                    : `${visibleDailies.length} of ${dailyAll.length} have dropped. ${hiddenCount} ${hiddenCount === 1 ? 'is' : 'are'} scheduled for later.`}
                </div>
                <button
                  onClick={() => setPastorPreview((v) => !v)}
                  style={{
                    background: pastorPreview ? T.goldDark : 'transparent',
                    color: pastorPreview ? T.cream : T.goldDark,
                    border: `1px solid ${T.goldDark}`, borderRadius: 999,
                    padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pastorPreview ? '✓ Previewing — show visitor view' : '⏰ Preview scheduled'}
                </button>
              </div>
            )}

            {dailies.length === 0 ? (
              <div style={{
                background: T.white, border: `1px dashed ${T.line}`, borderRadius: RADIUS.lg,
                padding: `${SPACE[5]}px ${SPACE[4]}px`, textAlign: 'center',
                fontFamily: T.serif, fontStyle: 'italic', color: T.inkMuted, fontSize: 14, lineHeight: 1.6,
              }}>
                No questions have dropped yet — they'll appear here on their scheduled days.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {dailies.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    number={i + 1}
                    item={q}
                    sermonTitle={sermon?.title}
                    churchId={sermon?.church_id}
                    sessionUserId={session?.user?.id}
                    isPastor={isPastor}
                    isScheduledFuture={isPastor && isHiddenForMembers(q)}
                  />
                ))}
              </div>
            )}
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

        {dailyAll.length === 0 && deepers.length === 0 && kids.length === 0 && (
          <div style={{
            background: T.white, border: `1px dashed ${T.line}`, borderRadius: RADIUS.lg,
            padding: `${SPACE[6]}px ${SPACE[4]}px`, textAlign: 'center',
            fontFamily: T.serif, fontStyle: 'italic', color: T.inkMuted, fontSize: 14.5, lineHeight: 1.6,
          }}>
            Nothing posted for this sermon yet.
            {isPastor && <><br />Open Pastor settings → Sermons to add daily questions, a deeper note, and the kids version.</>}
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

function QuestionCard({ number, item, sermonTitle, churchId, sessionUserId, isPastor, isScheduledFuture }) {
  // Parse body: new format = question first (ends ?), blank line, then context.
  // Legacy: question is the last line ending with ?.
  const rawText = item.body ?? '';
  const paras = rawText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const firstPara = paras[0] ?? '';
  const isQuestionFirst = firstPara.endsWith('?');
  let question, contextLines;
  if (isQuestionFirst) {
    question = firstPara;
    contextLines = paras.slice(1);
  } else {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1] ?? '';
    question = lastLine.endsWith('?') ? lastLine : null;
    contextLines = question ? [lines.slice(0, -1).join(' ')] : [lines.join(' ')];
  }

  const scheduledLabel = item.scheduled_at
    ? new Date(item.scheduled_at).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : 'Not scheduled';

  return (
    <article style={{
      background: T.white,
      border: `1px solid ${T.line}`,
      borderRadius: 14,
      overflow: 'hidden',
      opacity: isScheduledFuture ? 0.78 : 1,
    }}>
      {/* Inner parchment block — matches Feed PostCard sermon_item style exactly */}
      <div style={{
        background: T.parchment,
        border: `1px solid rgba(184,115,58,0.28)`,
        borderRadius: 12,
        padding: '14px 16px',
        margin: '14px 14px 0',
      }}>
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: T.goldDark }}>
            💬 {item.day != null ? `Day ${item.day}` : `Question ${number}`}
          </span>
          {sermonTitle && (
            <span style={{ fontSize: 11, color: T.inkMuted }}>· {sermonTitle}</span>
          )}
          {isScheduledFuture && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
              background: 'rgba(184,115,58,0.12)', color: T.goldDark,
              border: `1px solid ${T.goldLight}`, borderRadius: 999,
              padding: '2px 8px', marginLeft: 4,
            }}>
              {item.scheduled_at ? `⏰ ${scheduledLabel}` : '✎ Draft'}
            </span>
          )}
        </div>
        {/* Question hero */}
        {question && (
          <div style={{
            fontFamily: T.serif, fontSize: 17, fontWeight: 600, lineHeight: 1.5,
            letterSpacing: '-0.02em', color: T.ink,
            marginBottom: (item.scripture || contextLines.length) ? 12 : 0,
          }}>
            {question}
          </div>
        )}
        {/* Scripture / topic label */}
        {item.scripture && (
          <div style={{ fontSize: 11.5, color: T.goldDark, fontStyle: 'italic', marginBottom: contextLines.length ? 8 : 0 }}>
            {item.scripture}
          </div>
        )}
        {/* Context */}
        {contextLines.length > 0 && (
          <div style={{ fontFamily: T.serif, fontSize: 14.5, lineHeight: 1.7, color: T.inkSoft }}>
            {contextLines.join('\n\n')}
          </div>
        )}
        {/* Fallback for items with no parseable question */}
        {!question && contextLines.length === 0 && rawText && (
          <div style={{ fontFamily: T.serif, fontSize: 15, lineHeight: 1.7, color: T.ink, whiteSpace: 'pre-wrap' }}>
            {rawText}
          </div>
        )}
      </div>

      {/* Discussion thread */}
      <div style={{ padding: '10px 14px 14px' }}>
        <Suspense fallback={<div style={{ color: T.inkMuted, fontSize: 13, fontFamily: T.serif, padding: '8px 0' }}>Loading…</div>}>
          <SermonDiscussion
            sermonContentId={item.id}
            churchId={churchId}
            sessionUserId={sessionUserId}
            isPastor={isPastor}
            defaultOpen
          />
        </Suspense>
      </div>
    </article>
  );
}

function ContentCard({ item }) {
  const tone = KIND_TONE[item.kind] ?? KIND_TONE.daily_verse;
  const isKid = item.kind === 'kid_version';

  // Kid version is generated as: kid-friendly summary, blank line,
  // "Questions to talk about:" header, then 2–3 numbered questions.
  // Split it so the summary reads as prose and the questions read as a list.
  // Falls back gracefully if the body wasn't formatted that way (older rows
  // are just a paragraph — render as-is).
  let kidSummary = null;
  let kidQuestions = null;
  if (isKid && item.body) {
    const headerRe = /\n\s*Questions to talk about:?\s*\n/i;
    const m = item.body.match(headerRe);
    if (m) {
      kidSummary = item.body.slice(0, m.index).trim();
      const tail = item.body.slice(m.index + m[0].length);
      kidQuestions = tail
        .split('\n')
        .map((l) => l.replace(/^\s*(?:\d+[.)]|[-•])\s*/, '').trim())
        .filter(Boolean);
    }
  }

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
        <div style={{
          fontSize: 12, fontWeight: 700, color: T.ink, letterSpacing: 0.4,
          lineHeight: 1.3, marginBottom: 8,
        }}>
          {item.scripture}
        </div>
      )}
      {isKid && kidSummary && kidQuestions ? (
        <>
          <div style={{
            fontFamily: T.serif, fontSize: 15.5, color: T.ink, lineHeight: 1.7,
            whiteSpace: 'pre-wrap', marginBottom: SPACE[4],
          }}>
            {kidSummary}
          </div>
          <div style={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: tone.eyebrow, marginBottom: 8,
          }}>
            Questions to talk about
          </div>
          <ol style={{
            margin: 0, paddingLeft: 22, fontFamily: T.serif, fontSize: 15,
            color: T.ink, lineHeight: 1.6,
          }}>
            {kidQuestions.map((q, i) => (
              <li key={i} style={{ marginBottom: i === kidQuestions.length - 1 ? 0 : 6 }}>{q}</li>
            ))}
          </ol>
        </>
      ) : (
        <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {item.body}
        </div>
      )}
    </article>
  );
}
