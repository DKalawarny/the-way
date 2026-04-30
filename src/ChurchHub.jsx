import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T, SEMANTIC, RADIUS, SPACE, SHADOW } from './theme.js';

function formatWeekOf(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  } catch { return null; }
}

export default function ChurchHub({
  session,
  profile,
  onOpenChurchPage,
  onOpenFeed,
  onOpenPrayer,
  onOpenTalkToSomeone,
  onOpenCareInbox,
  onOpenPastorDashboard,
  onFindChurches,
}) {
  const churchId = profile?.church_id ?? null;
  const [church, setChurch] = useState(null);
  const [sermon, setSermon] = useState(null);
  const [careCount, setCareCount] = useState(null);
  const [memberCount, setMemberCount] = useState(null);
  const [isPastor, setIsPastor] = useState(false);
  const [isCareTeam, setIsCareTeam] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!churchId) { setLoading(false); return; }
      const [
        { data: ch },
        { data: serm },
        { count: care },
        { count: mem },
        { data: careRow },
      ] = await Promise.all([
        supabase.from('churches').select('id, name, tradition, description, pastor_id').eq('id', churchId).maybeSingle(),
        supabase.from('sermons').select('id, title, scripture_ref, summary, week_starts_on')
          .eq('church_id', churchId).eq('is_published', true)
          .order('week_starts_on', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('care_team_members').select('id', { count: 'exact', head: true })
          .eq('church_id', churchId).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', churchId),
        session?.user?.id
          ? supabase.from('care_team_members').select('id').eq('church_id', churchId).eq('user_id', session.user.id).eq('is_active', true).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setChurch(ch ?? null);
      setSermon(serm ?? null);
      setCareCount(care ?? 0);
      setMemberCount(mem ?? 0);
      setIsPastor(!!(ch && session?.user?.id && ch.pastor_id === session.user.id));
      setIsCareTeam(!!careRow);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [churchId, session?.user?.id]);

  // ── Empty state: no church ────────────────────────────────────
  if (!churchId) {
    return (
      <div className="scene" style={{ minHeight: '100vh', paddingBottom: 90 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: `${SPACE[8]}px ${SPACE[5]}px` }}>
          <div className="float-in" style={{ textAlign: 'center' }}>
            <div className="halo" style={{
              width: 76, height: 76, borderRadius: '50%',
              background: T.parchment, border: `2px solid ${T.gold}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: T.goldDark, margin: `0 auto ${SPACE[5]}px`,
            }}>✦</div>
            <div className="section-eyebrow" style={{ marginBottom: SPACE[2] }}>Belong</div>
            <h1 className="editorial-h1" style={{ fontSize: 28, marginBottom: SPACE[3] }}>
              Find a church to walk with.
            </h1>
            <p style={{ fontFamily: T.serif, fontSize: 15.5, color: T.inkSoft, lineHeight: 1.65, marginBottom: SPACE[6] }}>
              The Way is better with people. Browse churches, or join one a friend recommends.
            </p>
            <button onClick={onFindChurches} className="magnet" style={{
              background: T.ink, color: T.cream, border: 'none', borderRadius: RADIUS.pill,
              padding: '12px 26px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Browse churches →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scene" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>Loading your church…</div>
      </div>
    );
  }

  const sermonWeek = formatWeekOf(sermon?.week_starts_on);

  return (
    <div className="scene" style={{ minHeight: '100vh', paddingBottom: 90 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: `${SPACE[6]}px ${SPACE[5]}px ${SPACE[4]}px` }}>

        {/* ── Identity hero ──────────────────────────────── */}
        <div className="float-in" style={{
          position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${T.parchment} 0%, ${T.parchmentDark} 50%, rgba(216,155,82,0.45) 100%)`,
          border: `1px solid ${T.line}`, borderRadius: RADIUS.xl,
          padding: `${SPACE[6]}px ${SPACE[5]}px ${SPACE[5]}px`,
          marginBottom: SPACE[6],
          boxShadow: SHADOW.warm,
        }}>
          <div className="texture-bg" style={{
            position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none',
            maskImage: 'radial-gradient(circle at 100% 0%, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle at 100% 0%, black 20%, transparent 70%)',
          }} />
          <div className="section-eyebrow" style={{ marginBottom: 6, color: T.goldDark }}>
            ✦ Your church
          </div>
          <h1 className="editorial-h1" style={{ fontSize: 26, marginBottom: 6 }}>
            {church?.name ?? 'Your church'}
          </h1>
          <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap', alignItems: 'center', marginTop: SPACE[3] }}>
            {church?.tradition && (
              <span style={{
                background: 'rgba(255,255,255,0.6)', border: `1px solid ${T.line}`,
                borderRadius: RADIUS.pill, padding: '3px 10px',
                fontSize: 11.5, fontWeight: 600, color: T.inkSoft, letterSpacing: 0.2,
              }}>{church.tradition}</span>
            )}
            <span style={{
              background: T.white, border: `1px solid ${T.line}`,
              borderRadius: RADIUS.pill, padding: '3px 10px',
              fontSize: 11.5, fontWeight: 600, color: T.inkSoft,
            }}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
            {isPastor && (
              <span style={{
                background: T.ink, color: T.cream,
                borderRadius: RADIUS.pill, padding: '3px 10px',
                fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3,
              }}>Pastor</span>
            )}
            {isCareTeam && !isPastor && (
              <span style={{
                background: SEMANTIC.care.rail, color: T.cream,
                borderRadius: RADIUS.pill, padding: '3px 10px',
                fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3,
              }}>Care team</span>
            )}
          </div>
          <button onClick={onOpenChurchPage} className="lift" style={{
            position: 'absolute', top: SPACE[4], right: SPACE[4],
            background: 'rgba(255,255,255,0.8)', border: `1px solid ${T.line}`,
            borderRadius: RADIUS.pill, padding: '6px 12px',
            fontSize: 12, fontWeight: 600, color: T.inkSoft, cursor: 'pointer',
          }}>
            View page →
          </button>
        </div>

        {/* ── This week (sermon focus) ───────────────────── */}
        <section style={{ marginBottom: SPACE[6] }}>
          <div style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
            <div className="section-eyebrow">This week</div>
            <div className="rule-gold" style={{ flex: 1 }} />
          </div>
          {sermon ? (
            <button onClick={onOpenChurchPage} className="lift" style={{
              position: 'relative', textAlign: 'left', width: '100%',
              background: `linear-gradient(180deg, rgba(196,129,58,0.12), ${T.white} 70%)`,
              border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
              padding: `${SPACE[5]}px ${SPACE[5]}px ${SPACE[5]}px ${SPACE[6]}px`,
              cursor: 'pointer', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: T.gold }} />
              {sermonWeek && (
                <div className="section-eyebrow" style={{ color: T.goldDark, marginBottom: 6 }}>
                  Week of {sermonWeek}
                </div>
              )}
              <div className="editorial-h2" style={{ fontSize: 21, marginBottom: 6 }}>
                {sermon.title}
              </div>
              {sermon.scripture_ref && (
                <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: T.goldDark, marginBottom: SPACE[3] }}>
                  {sermon.scripture_ref}
                </div>
              )}
              {sermon.summary && (
                <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.6 }}>
                  {sermon.summary.length > 180 ? sermon.summary.slice(0, 180) + '…' : sermon.summary}
                </div>
              )}
            </button>
          ) : (
            <div style={{
              background: T.white, border: `1px dashed ${T.line}`, borderRadius: RADIUS.lg,
              padding: `${SPACE[5]}px ${SPACE[5]}px`, textAlign: 'center',
              color: T.inkMuted, fontFamily: T.serif, fontSize: 14, fontStyle: 'italic',
            }}>
              {isPastor ? 'No sermon posted yet — share what you\'re preaching this week.' : 'Nothing posted for this week yet.'}
            </div>
          )}
        </section>

        {/* ── Three doors specific to church ─────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[3], marginBottom: SPACE[6] }} className="stagger-in">
          <HubCard
            i={0}
            tone={SEMANTIC.connection}
            eyebrow="Talk to someone"
            title="Reach a real person"
            blurb={careCount > 0
              ? `${careCount} ${careCount === 1 ? 'person is' : 'people are'} on the care team — anonymous if you want.`
              : 'Tap to see who\'s listening.'}
            onClick={onOpenTalkToSomeone}
          />
          <HubCard
            i={1}
            tone={SEMANTIC.prayer}
            eyebrow="Pray together"
            title="Lift something up"
            blurb="Share a need or pray with someone — anonymous if you want."
            onClick={onOpenPrayer}
          />
          <HubCard
            i={2}
            tone={null}
            eyebrow="Community"
            title="See what's being shared"
            blurb="Posts, conversations, and stories from people walking the same road."
            onClick={onOpenFeed}
          />
        </div>

        {/* ── Role-specific shortcuts ────────────────────── */}
        {(isPastor || isCareTeam) && (
          <div style={{
            background: T.white, border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
            padding: `${SPACE[4]}px ${SPACE[5]}px`, marginBottom: SPACE[5],
            display: 'flex', alignItems: 'center', gap: SPACE[3], flexWrap: 'wrap',
          }}>
            <div className="section-eyebrow" style={{ color: T.goldDark }}>For you</div>
            {isPastor && onOpenPastorDashboard && (
              <button onClick={onOpenPastorDashboard} style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: RADIUS.pill,
                padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>Pastor dashboard →</button>
            )}
            {isCareTeam && onOpenCareInbox && (
              <button onClick={onOpenCareInbox} style={{
                background: SEMANTIC.care.rail, color: T.cream, border: 'none', borderRadius: RADIUS.pill,
                padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>Care inbox →</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HubCard({ i, tone, eyebrow, title, blurb, onClick }) {
  const palette = tone ?? { bg: 'rgba(196,129,58,0.10)', rail: T.gold, text: T.goldDark };
  return (
    <button onClick={onClick} className="lift" style={{
      '--i': i,
      position: 'relative', textAlign: 'left',
      background: `linear-gradient(180deg, ${palette.bg}, ${T.white} 70%)`,
      border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
      padding: `${SPACE[5]}px ${SPACE[5]}px ${SPACE[5]}px ${SPACE[6]}px`,
      cursor: 'pointer', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: palette.rail }} />
      <div className="section-eyebrow" style={{ color: palette.text, marginBottom: 6 }}>{eyebrow}</div>
      <div className="editorial-h2" style={{ fontSize: 19, marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.55 }}>{blurb}</div>
    </button>
  );
}
