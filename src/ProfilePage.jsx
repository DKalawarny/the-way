import { useState, useEffect } from 'react';
import { T } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import { trialStatus } from './trial.js';
import { supabase } from './supabase.js';
import AvatarPicker, { avatarUrl } from './AvatarPicker.jsx';
import ShareSheet from './ShareSheet.jsx';

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

export function Avatar({ name, avatarConfig, size = 48, style = {} }) {
  const url = avatarConfig
    ? avatarUrl(avatarConfig)
    : avatarUrl({ style: 'lorelei', seed: name || 'friend', bgColor: 'fdf8f0' });
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        border: `2px solid ${T.line}`,
        background: T.parchment,
        flexShrink: 0,
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
          .select('id, display_name, avatar_config')
          .in('id', ids);
        setFollowing(profiles ?? []);
      });

    supabase.from('posts').select('*, reactions(kind), post_comments(id)')
      .eq('author_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPosts(data ?? []));
  }, [session]);

  async function saveAvatar(config) {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_config: config })
      .eq('id', session.user.id);
    if (!error) {
      setPickingAvatar(false);
      onProfileUpdate?.({ ...profile, avatar_config: config });
    }
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
            <div style={{
              height: 110,
              background: `linear-gradient(135deg, #f5ede0 0%, rgba(196,129,58,0.25) 60%, rgba(139,90,43,0.15) 100%)`,
              position: 'relative',
            }} />

            {/* Avatar overlapping banner */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -50, paddingBottom: 20 }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Avatar
                  name={profile?.display_name}
                  avatarConfig={profile?.avatar_config}
                  size={96}
                  style={{ border: `4px solid ${T.white}`, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                />
                <button
                  onClick={() => setPickingAvatar(true)}
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 28,
                    height: 28,
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

              <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4 }}>
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
                    <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>{s.value}</div>
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
              background: 'rgba(196,129,58,0.08)',
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
                    <Avatar name={f.display_name} avatarConfig={f.avatar_config} size={48} />
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
              <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 8 }}>Nothing shared yet.</div>
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
          body={`Find me on The Way${profile?.display_name ? ` — I'm ${profile.display_name}` : ''}.`}
          intro="Real questions about faith, doubt, and the Bible — for believers, doubters, and everyone in between."
          title="Share your profile"
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}
