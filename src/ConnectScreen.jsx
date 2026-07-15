import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import { PERSON_TYPES } from './constants.js';

const TYPE_COLORS = {
  curious:      { bg: '#F0EBE0', border: '#C4A882', text: '#6B4E2A' },
  seeking:      { bg: '#EBE8F0', border: '#9988BB', text: '#4A3870' },
  skeptic:      { bg: '#E8ECF2', border: '#8899BB', text: '#2E4060' },
  'heard-things':{ bg: '#F0EDE5', border: '#B8A060', text: '#5A4010' },
  'new-faith':  { bg: '#E8F0EA', border: '#78A882', text: '#2E5838' },
  deeper:       { bg: '#EEE8E0', border: '#AA8855', text: '#5A3A10' },
  'inter-faith':{ bg: '#EAF0EE', border: '#70A898', text: '#1E5048' },
  kids:         { bg: '#F0EEE5', border: '#C0B070', text: '#5A4810' },
};

function ConnectCard({ person, session, onStartDM }) {
  const pt = PERSON_TYPES.find((p) => p.id === person.person_type);
  const tc = TYPE_COLORS[person.person_type] ?? TYPE_COLORS.curious;
  const isMe = person.id === session?.user?.id;

  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 16,
      padding: '18px 20px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar name={person.display_name} avatarConfig={person.avatar_config} photoUrl={person.avatar_url} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
            {person.display_name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pt && (
              <span style={{
                background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text,
                borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 600,
              }}>
                {pt.emoji} {pt.label}
              </span>
            )}
            {person.mentor_open && (
              <span style={{
                background: 'rgba(184,115,58,0.1)', border: `1px solid rgba(184,115,58,0.3)`,
                color: T.goldDark, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 600,
              }}>
                Open to mentor
              </span>
            )}
            {person.connect_open && (
              <span style={{
                background: 'rgba(58,107,138,0.08)', border: `1px solid rgba(58,107,138,0.25)`,
                color: '#2E4060', borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 600,
              }}>
                Open to connect
              </span>
            )}
          </div>
        </div>
      </div>

      {person.bio && (
        <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.65, marginBottom: 14 }}>
          {person.bio}
        </div>
      )}

      {!isMe && (
        <button
          onClick={() => onStartDM(person.id)}
          style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Start a conversation
        </button>
      )}
    </div>
  );
}

const FILTERS = [
  { id: 'all',     label: 'All'      },
  { id: 'mentor',  label: 'Mentors'  },
  { id: 'partner', label: 'Partners' },
];

export default function ConnectScreen({ session, profile, onClose, onStartDM }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_config, avatar_url, person_type, bio, mentor_open, connect_open')
      .or('mentor_open.eq.true,connect_open.eq.true')
      .limit(60);
    setPeople(data ?? []);
    setLoading(false);
  }

  const visible = people.filter((p) => {
    if (filter === 'mentor')  return p.mentor_open;
    if (filter === 'partner') return p.connect_open;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.white, borderBottom: `1px solid ${T.line}`,
      }}>
        <div style={{ height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 20, cursor: 'pointer', padding: 0 }}>
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>
              Connect
            </div>
            <div style={{ fontSize: 11, color: T.inkMuted }}>Mentors, partners & honest conversations</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', borderTop: `1px solid ${T.line}` }}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                flex: 1, padding: '10px 4px', background: 'transparent', border: 'none',
                borderBottom: active ? `2px solid ${T.gold}` : '2px solid transparent',
                fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: T.serif,
                color: active ? T.goldDark : T.inkMuted, cursor: 'pointer',
              }}>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px 100px' }}>
        {/* What is this? */}
        <div style={{
          background: T.parchment, borderRadius: 14, padding: '16px 18px', marginBottom: 22,
          borderLeft: `3px solid ${T.gold}`,
        }}>
          <div style={{ fontFamily: T.serif, fontSize: 14, color: T.inkSoft, lineHeight: 1.7 }}>
            Real people, different stages of the journey. Find someone further along to learn from, or reach out to someone with honest questions. AI is available inside the conversation if you need it.
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: T.inkMuted, fontSize: 14 }}>
            Loading…
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🤝</div>
            <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
              No one here yet — be the first.
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 320, margin: '0 auto 20px' }}>
              Every community starts with one person willing to show up. Open yourself to a conversation and you'll appear right here.
            </div>
            {session && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    await supabase.from('profiles').update({ connect_open: true }).eq('id', session.user.id).then(null, () => {});
                    load();
                  }}
                  style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '11px 22px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                >
                  🤝 I'm open to connect
                </button>
                <button
                  onClick={async () => {
                    await supabase.from('profiles').update({ mentor_open: true }).eq('id', session.user.id).then(null, () => {});
                    load();
                  }}
                  style={{ background: 'none', color: T.goldDark, border: `1.5px solid ${T.gold}`, borderRadius: 999, padding: '11px 22px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                >
                  🌱 I can walk with someone
                </button>
              </div>
            )}
          </div>
        )}

        {visible.map((p) => (
          <ConnectCard key={p.id} person={p} session={session} onStartDM={onStartDM} />
        ))}
      </div>
    </div>
  );
}
