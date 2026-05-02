import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from './supabase.js';
import { T, SEMANTIC, RADIUS, SPACE, SHADOW } from './theme.js';
import { presetForRole } from './Badge.jsx';
import { useUiKit } from './uikit.jsx';

const Feed         = lazy(() => import('./Feed.jsx'));
const PostComposer = lazy(() => import('./PostComposer.jsx'));

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
  onOpenSermon,
  onFindChurches,
  onProfileUpdate,
}) {
  const churchId = profile?.church_id ?? null;
  const [church, setChurch] = useState(null);
  const [sermon, setSermon] = useState(null);
  const [careCount, setCareCount] = useState(null);
  const [memberCount, setMemberCount] = useState(null);
  const [isPastor, setIsPastor] = useState(false);
  const [isCareTeam, setIsCareTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedRefresh, setFeedRefresh] = useState(0);
  const [pendingInvites, setPendingInvites] = useState([]);  // role invites for me
  const { showToast, ui: uikitUi } = useUiKit();

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
        { data: invites },
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
        session?.user?.id
          ? supabase.from('church_role_invites')
              .select('id, role_key, role_label, message, created_at, invited_by')
              .eq('church_id', churchId).eq('user_id', session.user.id).eq('status', 'pending')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      setChurch(ch ?? null);
      setSermon(serm ?? null);
      setCareCount(care ?? 0);
      setMemberCount(mem ?? 0);
      setIsPastor(!!(ch && session?.user?.id && ch.pastor_id === session.user.id));
      setIsCareTeam(!!careRow);
      setPendingInvites(invites ?? []);
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
            <p style={{ fontFamily: T.serif, fontSize: 15.5, color: T.inkSoft, lineHeight: 1.65, marginBottom: SPACE[5] }}>
              Got an invite code from your pastor or a friend? Enter it below.
              Otherwise, you can browse churches in the directory.
            </p>

            <JoinByCode
              session={session}
              profile={profile}
              onJoined={(ch) => {
                // Push the church_id into the parent profile so React re-renders
                // the hub with the joined-state UI. No page reload needed —
                // the next render hits the "you're in a church" branch.
                onProfileUpdate?.({ ...profile, church_id: ch.id });
              }}
            />

            <div style={{
              display: 'flex', alignItems: 'center', gap: SPACE[3], margin: `${SPACE[5]}px 0`,
            }}>
              <div style={{ flex: 1, height: 1, background: T.line }} />
              <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: 1, background: T.line }} />
            </div>

            <button onClick={onFindChurches} style={{
              background: 'transparent', color: T.goldDark, border: `1px solid ${T.gold}`, borderRadius: RADIUS.pill,
              padding: '11px 22px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
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

  async function respondToInvite(inviteId, accept) {
    const invite = pendingInvites.find((i) => i.id === inviteId);
    const { error } = await supabase
      .from('church_role_invites')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', inviteId);
    if (error) {
      showToast(`Could not respond: ${error.message}`, 'error');
      return;
    }
    // Optimistic remove from banner; if accepted, the trigger will have already
    // added the role row server-side.
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setFeedRefresh((n) => n + 1);
    if (accept && invite) {
      const label = presetForRole(invite.role_key)?.label ?? invite.role_label ?? 'role';
      showToast(`You're now part of the ${label}.`, 'success');
    }
  }

  return (
    <div className="scene" style={{ minHeight: '100vh', paddingBottom: 90 }}>
      {uikitUi}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: `${SPACE[6]}px ${SPACE[5]}px ${SPACE[4]}px` }}>

        {/* ── Identity hero — dark "sanctuary doorway" ─────
            Personal surfaces stay parchment; the church shell goes dark
            so the user knows at a glance which room they've walked into.
            Body + feed below stay light so long-form reading doesn't suffer. */}
        <div className="float-in" style={{
          position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${T.ink} 0%, #1A0F08 55%, #3A2516 100%)`,
          border: '1px solid rgba(196,129,58,0.35)',
          borderRadius: RADIUS.xl,
          padding: `${SPACE[6]}px ${SPACE[5]}px ${SPACE[5]}px`,
          marginBottom: SPACE[6],
          boxShadow: SHADOW.candle,
          color: T.cream,
        }}>
          {/* Candlelight gold-grain — same texture as light hero, glows on dark */}
          <div className="texture-bg" style={{
            position: 'absolute', inset: 0, opacity: 0.55, pointerEvents: 'none',
            maskImage: 'radial-gradient(circle at 100% 0%, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle at 100% 0%, black 20%, transparent 70%)',
          }} />
          <div className="section-eyebrow" style={{ marginBottom: 6, color: T.goldLight, position: 'relative' }}>
            ✦ Your church
          </div>
          <h1 style={{
            fontFamily: T.display, fontSize: 26, fontWeight: 600, color: T.cream,
            letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0, marginBottom: 6,
            position: 'relative',
          }}>
            {church?.name ?? 'Your church'}
          </h1>
          {(isPastor || isCareTeam) && (
            <div style={{
              fontSize: 12, color: T.goldLight, fontStyle: 'italic',
              position: 'relative', marginBottom: 4, fontFamily: T.serif,
            }}>
              {isPastor ? '✦ You\u2019re the pastor here' : '☎ You\u2019re on the care team'}
            </div>
          )}
          <div style={{
            display: 'flex', gap: SPACE[2], flexWrap: 'wrap', alignItems: 'center',
            marginTop: SPACE[3], position: 'relative',
          }}>
            {church?.tradition && (
              <span style={{
                background: 'rgba(253,248,240,0.10)',
                border: '1px solid rgba(253,248,240,0.25)',
                borderRadius: RADIUS.pill, padding: '3px 10px',
                fontSize: 11.5, fontWeight: 600, color: T.cream, letterSpacing: 0.2,
              }}>{church.tradition}</span>
            )}
            <span style={{
              background: 'rgba(253,248,240,0.10)',
              border: '1px solid rgba(253,248,240,0.25)',
              borderRadius: RADIUS.pill, padding: '3px 10px',
              fontSize: 11.5, fontWeight: 600, color: T.cream,
            }}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
          <button onClick={onOpenChurchPage} className="lift" style={{
            position: 'absolute', top: SPACE[4], right: SPACE[4],
            background: 'rgba(253,248,240,0.10)',
            border: '1px solid rgba(253,248,240,0.30)',
            borderRadius: RADIUS.pill, padding: '6px 12px',
            fontSize: 12, fontWeight: 600, color: T.cream, cursor: 'pointer',
          }}>
            View page →
          </button>
        </div>

        {/* ── Pending role invites (member side) ────────── */}
        {pendingInvites.map((inv) => {
          const preset = presetForRole(inv.role_key);
          const label = inv.role_label ?? preset?.label ?? inv.role_key;
          return (
            <div key={inv.id} className="float-in" style={{
              background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: RADIUS.lg,
              padding: `${SPACE[4]}px ${SPACE[5]}px`, marginBottom: SPACE[4],
            }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 4 }}>
                ✦ Invitation from your pastor
              </div>
              <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, lineHeight: 1.25, marginBottom: 4 }}>
                Take on the {label.toLowerCase()} role?
              </div>
              {inv.message && (
                <div style={{
                  fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.55,
                  fontStyle: 'italic', marginBottom: 10,
                  borderLeft: `3px solid ${T.goldLight}`, paddingLeft: 10,
                }}>
                  "{inv.message}"
                </div>
              )}
              {preset?.blurb && !inv.message && (
                <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 10 }}>
                  {preset.blurb}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => respondToInvite(inv.id, true)} style={{
                  background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Accept</button>
                <button onClick={() => respondToInvite(inv.id, false)} style={{
                  background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '8px 16px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
                }}>Not now</button>
              </div>
            </div>
          );
        })}

        {/* ── This week's sermon — the new-member's first answer to
            "what does this church actually teach?" The hub was already
            fetching this row but never rendering it; a brand-new member
            who joined Sunday afternoon used to land on a blank feed +
            three mystery buttons. Now the freshest sermon is the first
            content beat after the hero. Hidden when no sermon is
            published yet. */}
        {sermon && onOpenSermon && (
          <button
            onClick={() => onOpenSermon(sermon.id)}
            className="lift"
            style={{
              width: '100%', textAlign: 'left',
              background: T.parchment,
              border: `1px solid ${T.goldLight}`,
              borderLeft: `4px solid ${T.gold}`,
              borderRadius: RADIUS.lg,
              padding: `${SPACE[4]}px ${SPACE[5]}px`,
              marginBottom: SPACE[4],
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(196,129,58,0.10)',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
              ✦ This week{formatWeekOf(sermon.week_starts_on) ? ` · ${formatWeekOf(sermon.week_starts_on)}` : ''}
            </div>
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.2, marginBottom: 4 }}>
              {sermon.title}
            </div>
            {sermon.scripture_ref && (
              <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: sermon.summary ? 8 : 0 }}>
                {sermon.scripture_ref}
              </div>
            )}
            {sermon.summary && (
              <div style={{
                fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.6,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {sermon.summary}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: T.goldDark }}>
              Read & go deeper →
            </div>
          </button>
        )}

        {/* ── Quick action row (compact entry points) ───── */}
        <div style={{ display: 'flex', gap: SPACE[2], marginBottom: SPACE[5], flexWrap: 'wrap' }}>
          <ActionChip emoji="☎" label="Talk to someone" onClick={onOpenTalkToSomeone} />
          <ActionChip emoji="🙏" label="Pray together"   onClick={onOpenPrayer} />
          <ActionChip emoji="✦" label="Community"        onClick={onOpenFeed} />
        </div>

        {/* ── Church feed (sermon items + posts unified) ─ */}
        <div style={{ marginBottom: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
          <div className="section-eyebrow">Latest</div>
          <div className="rule-gold" style={{ flex: 1 }} />
        </div>

        <Suspense fallback={<div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 40 }}>Loading…</div>}>
          <PostComposer
            session={session}
            scope="church"
            scopeId={churchId}
            placeholder={isPastor
              ? 'Post to your congregation\u2026'
              : `Share with ${church?.name ?? 'your church'}\u2026`}
            onPosted={() => setFeedRefresh((n) => n + 1)}
          />
          <Feed
            source={`church:${churchId}`}
            sessionUserId={session?.user?.id}
            refreshKey={feedRefresh}
            onOpenSermon={onOpenSermon}
            emptyMessage={isPastor
              ? 'Nothing posted yet. Share this Sunday\u2019s sermon or write a note to your congregation.'
              : 'Nothing posted yet — start a conversation or wait for your church to share.'}
          />
        </Suspense>

        {/* ── Care team shortcut ─────────────────────────── */}
        {isCareTeam && !isPastor && onOpenCareInbox && (
          <div style={{
            background: T.white, border: `1px solid ${T.line}`, borderRadius: RADIUS.lg,
            padding: `${SPACE[4]}px ${SPACE[5]}px`, marginBottom: SPACE[5],
            display: 'flex', alignItems: 'center', gap: SPACE[3], flexWrap: 'wrap',
          }}>
            <div className="section-eyebrow" style={{ color: T.goldDark }}>For you</div>
            <button onClick={onOpenCareInbox} style={{
              background: SEMANTIC.care.rail, color: T.cream, border: 'none', borderRadius: RADIUS.pill,
              padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}>Care inbox →</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function JoinByCode({ session, profile, onJoined, prefilledCode = '' }) {
  const [code, setCode] = useState(prefilledCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function submit(e) {
    e?.preventDefault?.();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    if (!session?.user?.id) { setError('Please sign in first.'); return; }
    if (!profile?.display_name) {
      setError('Please finish setting up your profile before joining a church.');
      return;
    }
    setBusy(true);
    setError(null);

    // 1. Look up the church by invite code
    const { data: ch, error: lookupErr } = await supabase
      .from('churches')
      .select('id, name')
      .eq('invite_code', cleaned)
      .maybeSingle();

    if (lookupErr || !ch) {
      setBusy(false);
      setError(`We couldn't find a church with that code. Double-check with whoever sent it.`);
      return;
    }

    // 2. Set profile.church_id (trigger rejects if blocked)
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ church_id: ch.id })
      .eq('id', session.user.id);

    setBusy(false);
    if (updateErr) {
      // Trigger error message bubbles up here
      const msg = (updateErr.message || '').toLowerCase().includes('rejoin')
        ? `You can no longer rejoin ${ch.name}. If this is a mistake, ask the pastor to lift the block.`
        : `Couldn't join: ${updateErr.message}`;
      setError(msg);
      return;
    }

    setSuccess(`Welcome to ${ch.name}.`);
    onJoined?.(ch);
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div style={{
        display: 'flex', gap: 8, width: '100%', maxWidth: 360,
      }}>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null); }}
          placeholder="ABCD1234"
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0,
            background: T.white, border: `1px solid ${T.line}`, borderRadius: 10,
            padding: '11px 14px', fontSize: 16,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            letterSpacing: 2, textTransform: 'uppercase',
            color: T.ink, outline: 'none',
            textAlign: 'center', fontWeight: 600,
          }}
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 10,
            padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            opacity: (busy || !code.trim()) ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >{busy ? 'Joining…' : 'Join'}</button>
      </div>
      {error && (
        <div style={{
          fontSize: 13, color: '#c0392b', fontFamily: T.serif, lineHeight: 1.5,
          maxWidth: 360, textAlign: 'left',
        }}>{error}</div>
      )}
      {success && (
        <div style={{ fontSize: 13.5, color: T.goldDark, fontFamily: T.serif, fontStyle: 'italic' }}>
          {success}
        </div>
      )}
    </form>
  );
}

function ActionChip({ emoji, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="lift"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 999,
        padding: '8px 14px', fontSize: 13, fontWeight: 600, color: T.inkSoft,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 14 }}>{emoji}</span>
      {label}
    </button>
  );
}

