import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T, SHADOW } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import { useUiKit } from './uikit.jsx';

export default function ChurchPage({ session, profile, churchId, onBack, onProfileUpdate, onViewProfile, onOpenSermon, onOpenAdmin, onOpenChurchHub, onRequestJoin }) {
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latestSermon, setLatestSermon] = useState(null); // newest is_published=true sermon
  const { showToast, ui: uikitUi } = useUiKit();

  const isMember = profile?.church_id === churchId;
  const isPastor = church?.pastor_id && church.pastor_id === session?.user?.id;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?church=${churchId}` : '';

  useEffect(() => {
    if (!churchId) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('churches')
        .select('*, pastor:profiles!pastor_id(id, display_name, avatar_config, city, country, tradition)')
        .eq('id', churchId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('church_id', churchId),
      // Sermon-of-the-week — visitors land here wondering "what does this church
      // teach?" Show the most recent published sermon as the answer.
      supabase
        .from('sermons')
        .select('id, title, scripture_ref, summary, week_starts_on')
        .eq('church_id', churchId)
        .eq('is_published', true)
        .order('week_starts_on', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([{ data: c }, { count }, { data: serm }]) => {
      setChurch(c);
      setMemberCount(count ?? 0);
      setLatestSermon(serm ?? null);
      setLoading(false);
    });
  }, [churchId]);

  async function handleJoin() {
    if (!session?.user?.id) return;
    setJoining(true);
    const { error } = await supabase
      .from('profiles')
      .update({ church_id: churchId })
      .eq('id', session.user.id);
    setJoining(false);
    if (error) {
      // Most common cause: church_blocks row prevents rejoin (the trigger
      // raises a clear message). Surface it instead of swallowing —
      // previously the button silently flickered and nothing happened.
      const msg = /block/i.test(error.message)
        ? "You can't rejoin this church. Reach out to a pastor if this is a mistake."
        : `Couldn't join: ${error.message}`;
      showToast(msg, 'error');
      return;
    }
    onProfileUpdate?.({ ...profile, church_id: churchId });
    setMemberCount((c) => c + 1);
    showToast('Welcome — you’re now a member.', 'success');
  }

  async function handleLeave() {
    if (!session?.user?.id) return;
    setJoining(true);
    const { error } = await supabase
      .from('profiles')
      .update({ church_id: null })
      .eq('id', session.user.id);
    setJoining(false);
    if (error) {
      showToast(`Couldn't leave: ${error.message}`, 'error');
      return;
    }
    onProfileUpdate?.({ ...profile, church_id: null });
    setMemberCount((c) => Math.max(0, c - 1));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }

  if (!church) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, padding: '40px 20px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18 }}>
            ← Back
          </button>
          <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink }}>Church not found.</div>
        </div>
      </div>
    );
  }

  // Pastor / member viewing their own church see a small banner reminding
  // them this is the *visitor* view — edit chrome lives in Pastor settings.
  const showPreviewBanner = isPastor || isMember;

  return (
    <div className="scene" style={{ minHeight: '100vh', paddingBottom: 60 }}>
      {uikitUi}
      {/* Top bar */}
      <header style={{
        padding: '0 16px', height: 56, background: T.white,
        borderBottom: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '6px 4px' }}>
          ← Back
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={copyLink} style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '6px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
          }}>
            {copied ? '✓ Copied' : '↗ Share'}
          </button>
        </div>
      </header>

      {/* Preview banner — only the pastor / members see this */}
      {showPreviewBanner && (
        <div style={{
          background: T.parchment,
          borderBottom: `1px solid ${T.goldLight}`,
          padding: '8px 16px',
        }}>
          <div style={{
            maxWidth: 640, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            fontSize: 12, color: T.goldDark,
          }}>
            <span style={{ fontStyle: 'italic' }}>
              Preview — this is what visitors see.
            </span>
            {isPastor && onOpenAdmin && (
              <button
                onClick={() => onOpenAdmin('settings')}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  fontSize: 11.5, color: T.goldDark, fontWeight: 600,
                  cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2,
                  fontFamily: 'inherit',
                }}
              >
                Edit in Pastor settings →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sanctuary-doorway hero — same dark identity as ChurchHub & ChurchAdmin
          so the whole church section reads as one room. Body below stays cream. */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${T.ink} 0%, #1A0F08 55%, #3A2516 100%)`,
        borderBottom: '1px solid rgba(196,129,58,0.35)',
        boxShadow: SHADOW.candle,
        overflow: 'hidden',
        color: T.cream,
      }}>
        {/* Candlelight gold-grain — same texture as ChurchHub, glows on dark */}
        <div className="texture-bg" style={{
          position: 'absolute', inset: 0,
          opacity: 0.55,
          maskImage: 'radial-gradient(ellipse 70% 80% at 50% 30%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 30%, #000 30%, transparent 75%)',
          pointerEvents: 'none',
        }} />
        <div className="stagger-in" style={{ position: 'relative', maxWidth: 640, margin: '0 auto', padding: '36px 16px 28px', textAlign: 'center' }}>
          <div className="halo" style={{ '--i': 0,
            width: 92, height: 92, borderRadius: '50%',
            background: 'rgba(253,248,240,0.06)',
            border: `2px solid ${T.gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 42, margin: '0 auto 18px',
            boxShadow: '0 0 32px rgba(196,129,58,0.35), inset 0 1px 0 rgba(253,248,240,0.10)',
          }}>
            ⛪
          </div>
          <h1 style={{ '--i': 1, fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.cream, margin: '0 0 4px', lineHeight: 1.08, letterSpacing: '-0.022em' }}>
            {church.name}
            {church.verification_status === 'verified' && (
              <span title="Verified against the public registry" style={{ marginLeft: 8, color: T.gold, fontSize: 19, verticalAlign: 'middle' }}>
                ✓
              </span>
            )}
          </h1>
          <div style={{ '--i': 2, fontSize: 13, color: 'rgba(253,248,240,0.65)', marginBottom: (church.service_info || church.street_address) ? 8 : 14 }}>
            {[church.denomination, [church.city, church.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
          </div>
          {/* Visit info — first thing a QR-scanning visitor needs: when & where. */}
          {(church.service_info || church.street_address) && (
            <div style={{ '--i': 3,
              fontSize: 13, color: T.goldLight, fontStyle: 'italic',
              fontFamily: T.serif, lineHeight: 1.55, marginBottom: 14,
              maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
            }}>
              {church.service_info && <span>{church.service_info}</span>}
              {church.service_info && church.street_address && <span style={{ color: 'rgba(253,248,240,0.45)' }}>{' · '}</span>}
              {church.street_address && <span>{church.street_address}</span>}
            </div>
          )}
          {/* Activity pill — social proof at the conversion moment.
              "0 members" / "1 member" reads as dead air; for fresh churches
              we drop the count and frame as "New on The Way" so the visitor
              doesn't see emptiness. Threshold of 3 picked deliberately —
              once a handful of people have joined the page reads as alive. */}
          <div style={{ '--i': 4, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: T.cream, fontWeight: 600,
            background: 'rgba(253,248,240,0.10)',
            border: '1px solid rgba(253,248,240,0.25)',
            borderRadius: 999, padding: '4px 12px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.gold, animation: 'haloPulse 2.4s ease-in-out infinite' }} />
            {memberCount >= 3
              ? `${memberCount} members on The Way`
              : 'New on The Way'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {/* What's inside — sells the value of joining at the conversion moment.
            Shows for anyone who isn't already a member or the pastor (covers
            both signed-out QR-scanners and signed-in browsers). The Join /
            Sign-up CTAs that follow now have context — without this card, a
            signed-in non-member only saw a bare "Join this church" button
            with no preview of what membership actually unlocks. */}
        {!isMember && !isPastor && (
          <div style={{
            background: T.white,
            border: `1px solid ${T.line}`,
            borderRadius: 14,
            padding: '18px 20px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 12 }}>
              What's inside
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                {
                  icon: '🙏',
                  title: 'Prayer wall',
                  body: 'Pray with your church between Sundays. Anonymous when you need it to be.',
                },
                {
                  icon: '✦',
                  title: 'Sunday\u2019s sermon, all week',
                  body: 'Go deeper with what your pastor preached — questions, discussion, and notes.',
                },
                {
                  icon: '·',
                  title: 'Quiet space',
                  body: 'No algorithms, no ads, no strangers. Just our church.',
                },
              ].map((row) => (
                <div key={row.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(196,129,58,0.10)', border: `1px solid ${T.goldLight}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: T.goldDark,
                  }}>{row.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.serif, fontSize: 14.5, fontWeight: 700, color: T.ink, lineHeight: 1.35 }}>
                      {row.title}
                    </div>
                    <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55, marginTop: 2 }}>
                      {row.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending verification notice (pastor's own church only) */}
        {isPastor && church.verification_status === 'pending' && (
          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`,
            borderLeft: `4px solid ${T.gold}`, borderRadius: 12,
            padding: '14px 18px', marginBottom: 18,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
              ⏱ Pending verification
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>
              Your church is hidden from the directory and the QR code until we confirm your registration on the public registry. Usually 2 business days.
            </div>
          </div>
        )}

        {/* Join / Leave button */}
        {session && !isPastor && (
          <button
            onClick={isMember ? handleLeave : handleJoin}
            disabled={joining}
            style={{
              width: '100%',
              background: isMember ? 'transparent' : T.ink,
              color: isMember ? T.inkMuted : T.cream,
              border: isMember ? `1px solid ${T.line}` : 'none',
              borderRadius: 999, padding: '13px 20px',
              fontSize: 15, fontWeight: 600,
              cursor: joining ? 'not-allowed' : 'pointer',
              opacity: joining ? 0.6 : 1, marginBottom: 24,
            }}
          >
            {joining ? '…' : isMember ? '✓ You\u2019re a member' : 'Join this church'}
          </button>
        )}

        {/* Signed-out visitor — the QR-scanner from Sunday's bulletin.
            Without this CTA they see a read-only page with no path forward.
            Click stashes the church id in App-level pending state, sends
            them through auth, and once their profile is set we auto-attach
            them as a member and land them on the congregation hub. */}
        {!session && onRequestJoin && (
          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`,
            borderRadius: 14, padding: '18px 20px', marginBottom: 18,
          }}>
            {/* Lighter framing — the value pitch already lives in What's
                inside above. This card just makes the action effortless. */}
            <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.65, marginBottom: 14 }}>
              Sign up to join {church.name} — takes about a minute.
            </div>
            <button
              onClick={onRequestJoin}
              style={{
                width: '100%',
                background: T.ink, color: T.cream, border: 'none',
                borderRadius: 999, padding: '13px 20px',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Sign up &amp; join this church →
            </button>
          </div>
        )}

        {/* Member action — one door, not two.
            Members already have Ask-someone / Ask-AI inside the Hub; surfacing
            both here split attention and made the visitor page feel like an
            app screen instead of a doorway. A single "Open hub" link sends
            them where the actual conversation lives. */}
        {isMember && !isPastor && onOpenChurchHub && (
          <button
            onClick={onOpenChurchHub}
            className="lift"
            style={{
              width: '100%',
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
              padding: '14px 16px', marginBottom: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(196,129,58,0.10)', border: `1px solid ${T.goldLight}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: T.goldDark,
            }}>✦</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, fontWeight: 700, lineHeight: 1.3 }}>
                Open congregation hub
              </div>
              <div style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2, lineHeight: 1.45 }}>
                Posts, prayer, and ways to reach someone.
              </div>
            </div>
            <span style={{ color: T.goldDark, fontSize: 18, flexShrink: 0 }}>→</span>
          </button>
        )}

        {/* Sermon-of-the-week — answers a visitor's #1 question:
            "what does this church actually teach?" Sits above About so it
            lands in the first scan. Hidden when no published sermon exists. */}
        {latestSermon && (
          <div style={{
            background: T.parchment,
            border: `1px solid ${T.goldLight}`,
            borderRadius: 14,
            padding: '18px 20px',
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(196,129,58,0.10)',
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              ✦ This week's sermon
            </div>
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, lineHeight: 1.2, letterSpacing: '-0.015em', marginBottom: 6 }}>
              {latestSermon.title}
            </div>
            {latestSermon.scripture_ref && (
              <div style={{ fontSize: 13, color: T.goldDark, fontStyle: 'italic', marginBottom: 8 }}>
                {latestSermon.scripture_ref}
              </div>
            )}
            {latestSermon.summary && (
              <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.65, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                {latestSermon.summary}
              </div>
            )}
            {onOpenSermon && (
              <button onClick={() => onOpenSermon(latestSermon.id)} style={{
                background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '9px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}>
                Read this sermon →
              </button>
            )}
          </div>
        )}

        {/* About */}
        {church.about && (
          <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
              About
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {church.about}
            </div>
          </div>
        )}

        {/* Pinned post — visitor-facing only. Pastor edits this in Pastor settings. */}
        {church.pinned_post && (
          <div style={{
            background: 'rgba(196,129,58,0.06)', border: `1px solid ${T.goldLight}`,
            borderLeft: `4px solid ${T.gold}`, borderRadius: 12, padding: '16px 18px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              ✦ From the pastor
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {church.pinned_post}
            </div>
          </div>
        )}

        {/* Pastor card */}
        {church.pastor && (
          <button
            onClick={() => onViewProfile?.(church.pastor.id)}
            style={{
              width: '100%', textAlign: 'left',
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
              padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer',
            }}
          >
            <Avatar name={church.pastor.display_name} avatarConfig={church.pastor.avatar_config} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 2 }}>
                Pastor
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: T.ink }}>{church.pastor.display_name}</div>
              {(church.pastor.city || church.pastor.country) && (
                <div style={{ fontSize: 12, color: T.inkMuted }}>
                  {[church.pastor.city, church.pastor.country].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
            <div style={{ color: T.inkMuted, fontSize: 18 }}>›</div>
          </button>
        )}

        {/* Website */}
        {church.website && (
          <a href={church.website.startsWith('http') ? church.website : `https://${church.website}`} target="_blank" rel="noreferrer" style={{
            display: 'block', background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
            padding: '14px 16px', marginBottom: 16, color: T.goldDark, fontSize: 14, textDecoration: 'none',
          }}>
            ↗ Visit church website
          </a>
        )}
      </div>
    </div>
  );
}
