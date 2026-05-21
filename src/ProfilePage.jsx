import { useState, useEffect, useRef } from 'react';
import { T } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { trialStatus } from './trial.js';
import { supabase, uploadProfileImage, directProfileUpdate } from './supabase.js';
import AvatarPicker, { avatarUrl } from './AvatarPicker.jsx';
import ShareSheet from './ShareSheet.jsx';

const BANNER_PRESETS = [
  { key: 'parchment', label: 'Parchment', bg: `linear-gradient(135deg, #f5ede0 0%, rgba(184,115,58,0.35) 60%, rgba(139,90,43,0.2) 100%)` },
  { key: 'forest',    label: 'Forest',    bg: 'linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 55%, #3d6b3d 100%)' },
  { key: 'night',     label: 'Night',     bg: 'linear-gradient(135deg, #0d1b2e 0%, #1a3050 55%, #2a4570 100%)' },
  { key: 'clay',      label: 'Clay',      bg: 'linear-gradient(135deg, #8b4513 0%, #a0522d 55%, #cd853f 100%)' },
  { key: 'plum',      label: 'Plum',      bg: 'linear-gradient(135deg, #2d0a2d 0%, #4a1542 55%, #6b2564 100%)' },
  { key: 'sea',       label: 'Sea',       bg: 'linear-gradient(135deg, #0a2d2d 0%, #0f4a4a 55%, #1a6b6b 100%)' },
  { key: 'slate',     label: 'Slate',     bg: 'linear-gradient(135deg, #1c1c2e 0%, #2e2e4a 55%, #3d3d6b 100%)' },
  { key: 'rose',      label: 'Rose',      bg: 'linear-gradient(135deg, #2e0a0a 0%, #501515 55%, #7a2525 100%)' },
];

function bannerBackground(profile, posOverride) {
  if (profile?.banner_url) {
    const pos = posOverride ?? profile?.banner_position ?? 50;
    return `url(${profile.banner_url}) center ${pos}% / cover no-repeat`;
  }
  const preset = BANNER_PRESETS.find((p) => p.key === profile?.banner_preset);
  return preset?.bg ?? BANNER_PRESETS[0].bg;
}

const TRADITION_COLORS = {
  'Catholic': '#8B1A1A',
  'Eastern Orthodox': '#1A3A8B',
  'Ethiopian Orthodox': '#1A6B2A',
  'Anglican / Episcopal': '#4B1A6B',
  'Baptist': '#6B3A1A',
  'Presbyterian / Reformed': '#1A4B6B',
  'Methodist': '#6B1A4B',
  'Lutheran': '#4B3A1A',
  'Pentecostal / Charismatic': '#6B4B1A',
  'Non-denominational Evangelical': '#1A5B3A',
  'Adventist': '#3A1A6B',
  'Mennonite / Anabaptist': '#4B4B1A',
  'Other': T.inkSoft,
  'Still Discovering': T.goldDark,
};

export { BANNER_PRESETS, bannerBackground };

export function Avatar({ name, avatarConfig, photoUrl, size = 48, style = {} }) {
  const url = photoUrl
    ? photoUrl
    : avatarConfig
      ? avatarUrl(avatarConfig)
      : avatarUrl({ style: 'lorelei', seed: name || 'friend', bgColor: 'fdf8f0' });
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      style={{
        display: 'block',
        borderRadius: '50%',
        border: `2px solid ${T.line}`,
        background: T.parchment,
        flexShrink: 0,
        objectFit: 'cover',
        ...style,
      }}
    />
  );
}

function Tag({ label, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      background: `${color}18`,
      color,
      border: `1px solid ${color}40`,
    }}>
      {label}
    </span>
  );
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const REACTIONS = [
  { kind: 'resonates', emoji: '🕊️' },
  { kind: 'amen', emoji: '🙏' },
  { kind: 'thinking', emoji: '💭' },
];

export default function ProfilePage({ profile, session, onEdit, onSignOut, onClose, onProfileUpdate, onSetPersonType }) {
  const trial = trialStatus(profile);
  const person = PERSON_TYPES.find((p) => p.id === profile?.person_type);
  const traditionColor = TRADITION_COLORS[profile?.tradition] ?? T.goldDark;

  const [signingOut, setSigningOut] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState([]);
  const [stats, setStats] = useState({ posts: 0, following: 0, followers: 0 });
  const [bannerError, setBannerError] = useState(null);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [avatarLightbox, setAvatarLightbox] = useState(false);

  useEffect(() => {
    if (!session) return;

    Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', session.user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', session.user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', session.user.id),
    ]).then(([{ count: p }, { count: ing }, { count: ers }]) => {
      setStats({ posts: p ?? 0, following: ing ?? 0, followers: ers ?? 0 });
    });

    supabase.from('follows').select('following_id').eq('follower_id', session.user.id)
      .then(async ({ data }) => {
        if (!data?.length) return;
        const ids = data.map((f) => f.following_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_config, avatar_url')
          .in('id', ids);
        setFollowing(profiles ?? []);
      });

    supabase.from('posts').select('*, reactions(kind), post_comments(id)')
      .eq('author_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPosts(data ?? []));
  }, [session]);

  async function saveAvatar({ photoUrl, config }) {
    const updates = { avatar_url: photoUrl ?? null };
    if (config) updates.avatar_config = config;
    try {
      await directProfileUpdate(session.user.id, updates);
      setPickingAvatar(false);
      onProfileUpdate?.({ ...profile, ...updates });
    } catch (err) {
      console.error('saveAvatar failed:', err.message);
    }
  }

  async function savePreset(key) {
    if (!session?.user?.id) return;
    setBannerError(null);
    try {
      await directProfileUpdate(session.user.id, { banner_preset: key, banner_url: null });
      onProfileUpdate?.({ ...profile, banner_preset: key, banner_url: null });
      setBannerPickerOpen(false);
    } catch (err) { setBannerError(err.message); }
  }


  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    onSignOut();
  }

  return (
    <>
      {pickingAvatar && (
        <AvatarPicker
          current={profile?.avatar_config}
          currentPhotoUrl={profile?.avatar_url}
          userId={session?.user?.id}
          onSave={saveAvatar}
          onCancel={() => setPickingAvatar(false)}
        />
      )}

      <div style={{ minHeight: '100vh', background: T.cream, paddingBottom: 80 }}>

        {/* Back button */}
        <div style={{ padding: '16px 20px' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0 }}
          >
            ← Back
          </button>
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 40px' }}>

          {/* Profile card */}
          <div style={{
            background: T.white,
            borderRadius: 20,
            border: `1px solid ${T.line}`,
            overflow: 'hidden',
            marginBottom: 16,
          }}>
            {/* Banner */}
            <div style={{ position: 'relative' }}>
              {/* Banner image / gradient */}
              <div
                style={{
                  height: 110,
                  background: bannerBackground(profile),
                  transition: 'height 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setBannerPickerOpen((v) => !v)}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'rgba(44,24,16,0.55)', color: T.cream,
                    border: 'none', borderRadius: 999, padding: '6px 12px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  🎨 Banner colour
                </button>
                {bannerError && (
                  <div style={{
                    position: 'absolute', bottom: 8, left: 12, right: 12,
                    background: 'rgba(220,53,69,0.92)', color: '#fff',
                    borderRadius: 8, padding: '5px 10px', fontSize: 12, textAlign: 'center',
                  }}>
                    {bannerError}
                  </div>
                )}
              </div>

              {/* Colour picker panel */}
              {bannerPickerOpen && (
                <div style={{ background: T.white, borderBottom: `1px solid ${T.line}`, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 10 }}>
                    Choose a colour
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {BANNER_PRESETS.map((p) => {
                      const active = profile?.banner_preset === p.key;
                      return (
                        <button
                          key={p.key}
                          onClick={() => savePreset(p.key)}
                          title={p.label}
                          style={{
                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                            background: p.bg, border: active ? `2.5px solid ${T.goldDark}` : '2px solid transparent',
                            cursor: 'pointer', boxShadow: active ? `0 0 0 2px ${T.goldLight}` : 'none',
                            transition: 'border 0.12s',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>{/* end outer banner wrapper */}

            {/* Avatar overlapping banner */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: bannerPickerOpen ? 12 : -50, paddingBottom: 20 }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <div
                  onClick={() => (profile?.avatar_url || profile?.avatar_config) && setAvatarLightbox(true)}
                  style={{ cursor: (profile?.avatar_url || profile?.avatar_config) ? 'zoom-in' : 'default', display: 'inline-block' }}
                >
                  <Avatar
                    name={profile?.display_name}
                    avatarConfig={profile?.avatar_config}
                    photoUrl={profile?.avatar_url}
                    size={112}
                    style={{ border: `4px solid ${T.white}`, boxShadow: '0 4px 24px rgba(0,0,0,0.14)' }}
                  />
                </div>
                <button
                  onClick={() => setPickingAvatar(true)}
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: T.ink,
                    color: T.cream,
                    border: `2px solid ${T.white}`,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Edit avatar"
                >
                  ✏️
                </button>
              </div>

              {/* Avatar lightbox */}
              {avatarLightbox && (
                <div
                  onClick={() => setAvatarLightbox(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.82)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 20,
                  }}
                >
                  <Avatar
                    name={profile?.display_name}
                    avatarConfig={profile?.avatar_config}
                    photoUrl={profile?.avatar_url}
                    size={280}
                    style={{ border: `4px solid ${T.white}`, boxShadow: '0 8px 48px rgba(0,0,0,0.5)', pointerEvents: 'none' }}
                  />
                  {profile?.avatar_url && (
                    <a
                      href={profile.avatar_url}
                      download="profile-photo.jpg"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        border: '1.5px solid rgba(255,255,255,0.35)',
                        borderRadius: 999,
                        padding: '10px 24px',
                        fontSize: 14,
                        fontWeight: 600,
                        textDecoration: 'none',
                        backdropFilter: 'blur(8px)',
                        letterSpacing: '0.01em',
                      }}
                    >
                      💾 Save photo
                    </a>
                  )}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: -8 }}>
                    Tap anywhere to close
                  </div>
                </div>
              )}

              <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4 }}>
                {profile?.display_name ?? 'Friend'}
              </div>

              {(profile?.city || profile?.country) && (
                <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 10 }}>
                  📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16, padding: '0 20px' }}>
                {profile?.tradition && <Tag label={profile.tradition} color={traditionColor} />}
                {person && <Tag label={`${person.emoji} ${person.label}`} color={T.goldDark} />}
                {profile?.exploring_since && <Tag label={profile.exploring_since} color={T.inkSoft} />}
              </div>

              {/* Stats row */}
              <div style={{
                display: 'flex',
                gap: 0,
                borderTop: `1px solid ${T.line}`,
                borderBottom: `1px solid ${T.line}`,
                width: '100%',
              }}>
                {[
                  { value: stats.posts, label: 'Posts' },
                  { value: stats.following, label: 'Following' },
                  { value: stats.followers, label: 'Followers' },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '14px 8px',
                    borderRight: i < 2 ? `1px solid ${T.line}` : 'none',
                  }}>
                    <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, padding: '16px 20px 0', width: '100%' }}>
                <button
                  onClick={onEdit}
                  style={{
                    flex: 1,
                    background: T.ink,
                    color: T.cream,
                    border: 'none',
                    borderRadius: 999,
                    padding: '11px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Edit profile
                </button>
                <button
                  onClick={() => setShareOpen(true)}
                  title="Share profile"
                  style={{
                    background: 'transparent',
                    color: T.inkSoft,
                    border: `1px solid ${T.line}`,
                    borderRadius: 999,
                    padding: '11px 16px',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  ↗ Share
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  style={{
                    background: 'transparent',
                    color: T.inkMuted,
                    border: `1px solid ${T.line}`,
                    borderRadius: 999,
                    padding: '11px 16px',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>

          {/* Trial status */}
          {trial.active && (
            <div style={{
              background: 'rgba(184,115,58,0.08)',
              border: `1px solid ${T.goldLight}`,
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: T.goldDark, fontSize: 14 }}>Free trial active</div>
                <div style={{ fontSize: 13, color: T.inkMuted, marginTop: 2 }}>
                  {trial.daysLeft} day{trial.daysLeft !== 1 ? 's' : ''} remaining · then $7.99 CAD/month
                </div>
              </div>
              <div style={{ fontSize: 22 }}>✨</div>
            </div>
          )}

          {/* About cards */}
          {profile?.what_brought && (
            <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8 }}>What brought me here</div>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: T.inkSoft, lineHeight: 1.6, fontStyle: 'italic' }}>
                "{profile.what_brought}"
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {profile?.background && (
              <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8 }}>Background</div>
                <div style={{ fontSize: 14, color: T.inkSoft }}>{profile.background}</div>
              </div>
            )}
            {profile?.age_range && (
              <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 8 }}>Age range</div>
                <div style={{ fontSize: 14, color: T.inkSoft }}>{profile.age_range}</div>
              </div>
            )}
          </div>

          {profile?.looking_for?.length > 0 && (
            <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 10 }}>Looking for</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.looking_for.map((item) => (
                  <Tag key={item} label={item.replace(/-/g, ' ')} color={T.inkSoft} />
                ))}
              </div>
            </div>
          )}

          {/* Friends / Following */}
          {following.length > 0 && (
            <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 14 }}>
                Following · {following.length}
              </div>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {following.map((f) => (
                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Avatar name={f.display_name} avatarConfig={f.avatar_config} photoUrl={f.avatar_url} size={48} />
                    <div style={{ fontSize: 11, color: T.inkSoft, textAlign: 'center', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.display_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts feed */}
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 12 }}>
            Posts
          </div>

          {posts.length === 0 && (
            <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 8 }}>Nothing shared yet.</div>
              <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6 }}>
                Save a note from chat and tap "Share publicly" to post it.
              </div>
            </div>
          )}

          {posts.map((p) => {
            const counts = {};
            (p.reactions ?? []).forEach((r) => { counts[r.kind] = (counts[r.kind] ?? 0) + 1; });
            const hasReactions = REACTIONS.some((r) => counts[r.kind] > 0);
            return (
              <div key={p.id} style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.line}`, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.inkSoft, marginBottom: 8, lineHeight: 1.5 }}>
                    {p.question}
                  </div>
                  <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {p.body.slice(0, 280)}{p.body.length > 280 ? '…' : ''}
                  </div>
                </div>
                <div style={{ padding: '10px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: T.inkMuted }}>
                  {hasReactions && REACTIONS.map((r) => counts[r.kind] > 0 && (
                    <span key={r.kind}>{r.emoji} {counts[r.kind]}</span>
                  ))}
                  <span style={{ marginLeft: hasReactions ? 'auto' : 0 }}>💬 {p.post_comments?.length ?? 0}</span>
                  <span>{timeAgo(p.created_at)}</span>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {shareOpen && (
        <ShareSheet
          body={`Find me on kinwove${profile?.display_name ? ` — I'm ${profile.display_name}` : ''}.`}
          intro="Real questions about faith, doubt, and the Bible — for believers, doubters, and everyone in between."
          title="Share your profile"
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}
