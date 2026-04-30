import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';

function qrUrl(url) {
  return `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=320&margin=2&dark=2C1810&light=FDF8F0`;
}

export default function ChurchPage({ session, profile, churchId, onBack, onProfileUpdate, onViewProfile, onOpenTalkToSomeone, onOpenAnonAsk, onOpenPastorDashboard, onOpenSermons, onOpenCareAdmin }) {
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [editingPin, setEditingPin] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [copied, setCopied] = useState(false);

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
    ]).then(([{ data: c }, { count }]) => {
      setChurch(c);
      setPinDraft(c?.pinned_post ?? '');
      setMemberCount(count ?? 0);
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
    if (!error) {
      onProfileUpdate?.({ ...profile, church_id: churchId });
      setMemberCount((c) => c + 1);
    }
  }

  async function handleLeave() {
    if (!session?.user?.id) return;
    setJoining(true);
    const { error } = await supabase
      .from('profiles')
      .update({ church_id: null })
      .eq('id', session.user.id);
    setJoining(false);
    if (!error) {
      onProfileUpdate?.({ ...profile, church_id: null });
      setMemberCount((c) => Math.max(0, c - 1));
    }
  }

  async function savePin() {
    if (!isPastor) return;
    setSavingPin(true);
    const { error } = await supabase
      .from('churches')
      .update({ pinned_post: pinDraft.trim() || null })
      .eq('id', churchId);
    setSavingPin(false);
    if (!error) {
      setChurch((c) => ({ ...c, pinned_post: pinDraft.trim() || null }));
      setEditingPin(false);
    }
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

  return (
    <div className="scene" style={{ minHeight: '100vh', paddingBottom: 60 }}>
      {/* Top bar */}
      <header style={{
        padding: '0 16px', height: 56, background: T.white,
        borderBottom: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: '6px 4px' }}>
          ← Back
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowQr(true)} title="Share QR code" style={{
            background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '6px 14px', fontSize: 13, color: T.goldDark, fontWeight: 600, cursor: 'pointer',
          }}>
            ⌘ QR code
          </button>
          <button onClick={copyLink} style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '6px 14px', fontSize: 13, color: T.inkSoft, cursor: 'pointer',
          }}>
            {copied ? '✓ Copied' : '↗ Share'}
          </button>
        </div>
      </header>

      {/* Cinematic hero band — fills the dead space with depth instead of cream void */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(180deg, ${T.parchment} 0%, ${T.cream} 90%)`,
        borderBottom: `1px solid ${T.line}`,
        overflow: 'hidden',
      }}>
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
            background: T.cream, border: `2px solid ${T.gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 42, margin: '0 auto 18px',
            boxShadow: '0 6px 20px rgba(196,129,58,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}>
            ⛪
          </div>
          <h1 style={{ '--i': 1, fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.ink, margin: '0 0 4px', lineHeight: 1.08, letterSpacing: '-0.022em' }}>
            {church.name}
            {church.verification_status === 'verified' && (
              <span title="Verified against the public registry" style={{ marginLeft: 8, color: T.gold, fontSize: 19, verticalAlign: 'middle' }}>
                ✓
              </span>
            )}
          </h1>
          <div style={{ '--i': 2, fontSize: 13, color: T.inkMuted, marginBottom: 12 }}>
            {[church.denomination, [church.city, church.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
          </div>
          <div style={{ '--i': 3, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: T.goldDark, fontWeight: 600,
            background: 'rgba(196,129,58,0.08)', border: `1px solid ${T.goldLight}`,
            borderRadius: 999, padding: '4px 12px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.gold, animation: 'haloPulse 2.4s ease-in-out infinite' }} />
            {memberCount} member{memberCount !== 1 ? 's' : ''} on The Way
          </div>
          {isPastor && (
            <div style={{ '--i': 4,
              display: 'inline-block', marginTop: 12, marginLeft: 8,
              fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
              color: T.goldDark, background: 'rgba(196,129,58,0.10)',
              border: `1px solid ${T.goldLight}`, borderRadius: 999,
              padding: '4px 12px', fontWeight: 700,
            }}>
              ✦ You are the pastor
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

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

        {/* Member actions */}
        {isMember && !isPastor && (onOpenTalkToSomeone || onOpenAnonAsk) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {onOpenTalkToSomeone && (
              <button onClick={onOpenTalkToSomeone} className="lift" style={{
                background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
                padding: '16px 14px', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, marginBottom: 8,
                  background: T.parchment, border: `1px solid ${T.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: T.goldDark,
                }}>☎</div>
                <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.ink, fontWeight: 700, marginBottom: 2 }}>Ask someone</div>
                <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.45 }}>Message a real person from the care team.</div>
              </button>
            )}
            {onOpenAnonAsk && (
              <button onClick={onOpenAnonAsk} className="lift" style={{
                background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
                padding: '16px 14px', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, marginBottom: 8,
                  background: 'rgba(196,129,58,0.10)', border: `1px solid ${T.goldLight}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: T.goldDark,
                }}>✦</div>
                <div style={{ fontFamily: T.serif, fontSize: 14.5, color: T.ink, fontWeight: 700, marginBottom: 2 }}>Ask AI</div>
                <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.45 }}>Private, anonymous. No one sees your words.</div>
              </button>
            )}
          </div>
        )}

        {/* Pastor tools */}
        {isPastor && (onOpenPastorDashboard || onOpenSermons || onOpenCareAdmin) && (
          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 14,
            padding: '14px 14px 10px', marginBottom: 18,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 10, padding: '0 4px' }}>
              ✦ Pastor tools
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {onOpenPastorDashboard && (
                <button onClick={onOpenPastorDashboard} style={{
                  background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Dashboard</button>
              )}
              {onOpenSermons && (
                <button onClick={onOpenSermons} style={{
                  background: T.white, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '9px 16px', fontSize: 13, cursor: 'pointer',
                }}>This week's content</button>
              )}
              {onOpenCareAdmin && (
                <button onClick={onOpenCareAdmin} style={{
                  background: T.white, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 999,
                  padding: '9px 16px', fontSize: 13, cursor: 'pointer',
                }}>Care team</button>
              )}
            </div>
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

        {/* Pinned post */}
        {(church.pinned_post || isPastor) && (
          <div style={{
            background: 'rgba(196,129,58,0.06)', border: `1px solid ${T.goldLight}`,
            borderLeft: `4px solid ${T.gold}`, borderRadius: 12, padding: '16px 18px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700 }}>
                ✦ From the pastor
              </div>
              {isPastor && !editingPin && (
                <button onClick={() => setEditingPin(true)} style={{
                  background: 'none', border: 'none', color: T.goldDark, fontSize: 12, cursor: 'pointer', padding: 0,
                }}>Edit</button>
              )}
            </div>

            {editingPin ? (
              <>
                <textarea
                  value={pinDraft}
                  onChange={(e) => setPinDraft(e.target.value.slice(0, 500))}
                  placeholder="A welcome note, this week's focus, an invitation…"
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
                    fontFamily: T.serif, fontSize: 14, color: T.ink, lineHeight: 1.6,
                    background: T.cream, outline: 'none', resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setEditingPin(false); setPinDraft(church.pinned_post ?? ''); }} style={{
                    background: 'none', border: `1px solid ${T.line}`, borderRadius: 999,
                    padding: '7px 14px', fontSize: 13, color: T.inkMuted, cursor: 'pointer',
                  }}>Cancel</button>
                  <button onClick={savePin} disabled={savingPin} style={{
                    background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>{savingPin ? 'Saving…' : 'Save'}</button>
                </div>
              </>
            ) : church.pinned_post ? (
              <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {church.pinned_post}
              </div>
            ) : (
              <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: T.inkMuted, lineHeight: 1.6 }}>
                Add a welcome note for visitors and members.
              </div>
            )}
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

        {/* QR poster button */}
        <button onClick={() => setShowQr(true)} style={{
          width: '100%', background: T.parchment, border: `1px dashed ${T.goldLight}`, borderRadius: 14,
          padding: '16px', cursor: 'pointer', textAlign: 'center',
          color: T.goldDark, fontSize: 14, fontWeight: 600,
        }}>
          ⌘ Get a QR code for your bulletin / pulpit
        </button>
      </div>

      {/* QR modal */}
      {showQr && (
        <div
          onClick={() => setShowQr(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(44,24,16,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.cream, borderRadius: 18, maxWidth: 400, width: '100%',
              padding: '28px 24px', textAlign: 'center', border: `1px solid ${T.line}`,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 8 }}>
              Scan to join
            </div>
            <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: '-0.018em', lineHeight: 1.12, marginBottom: 16 }}>
              {church.name}
            </div>
            <div style={{
              background: T.white, borderRadius: 14, padding: 16, display: 'inline-block',
              border: `1px solid ${T.line}`, marginBottom: 16,
            }}>
              <img src={qrUrl(shareUrl)} alt="QR code" width={260} height={260} style={{ display: 'block' }} />
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55, marginBottom: 18, padding: '0 8px' }}>
              Print this for the bulletin, project it on Sunday, or send the link below.
            </div>
            <div style={{
              background: T.parchment, borderRadius: 10, padding: '10px 12px',
              fontSize: 12, color: T.inkSoft, fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 16,
            }}>
              {shareUrl}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyLink} style={{
                flex: 1, background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '11px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
              <button onClick={() => setShowQr(false)} style={{
                background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
                padding: '11px 18px', fontSize: 14, color: T.inkMuted, cursor: 'pointer',
              }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
