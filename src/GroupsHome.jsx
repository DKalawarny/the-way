import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import GroupSetup from './GroupSetup.jsx';

const CIRCLE_COLORS = [
  '#B8733A', '#6B4A35', '#7A4A6B', '#4A6B5B',
  '#5B6E8A', '#8B6E35', '#6B2438', '#4A5830',
];

function circleColor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CIRCLE_COLORS[h % CIRCLE_COLORS.length];
}

function AvatarStack({ groupId }) {
  const [members, setMembers] = useState([]);
  const [total, setTotal]     = useState(0);

  useEffect(() => {
    supabase
      .from('group_members')
      .select('profiles:member_id(id, display_name, avatar_config, avatar_url)', { count: 'exact' })
      .eq('group_id', groupId)
      .limit(4)
      .then(({ data, count }) => {
        setMembers(data?.map((m) => m.profiles).filter(Boolean) ?? []);
        setTotal(count ?? 0);
      });
  }, [groupId]);

  if (members.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {members.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -7, zIndex: members.length - i }}>
          <Avatar
            name={m.display_name}
            avatarConfig={m.avatar_config}
            photoUrl={m.avatar_url}
            size={24}
            style={{ border: `2px solid ${T.white}` }}
          />
        </div>
      ))}
      {total > 4 && (
        <span style={{ marginLeft: 6, fontSize: 11, color: T.inkMuted }}>+{total - 4}</span>
      )}
    </div>
  );
}

function CircleCard({ entry, onClick }) {
  const { group, role } = entry;
  const color = circleColor(group.id);

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: T.white,
        border: `1px solid rgba(26,17,8,0.09)`,
        borderRadius: 18, padding: 0, cursor: 'pointer',
        overflow: 'hidden', display: 'flex', alignItems: 'stretch',
        boxShadow: '0 1px 6px rgba(44,24,16,0.07)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        marginBottom: 12,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,24,16,0.13)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 6px rgba(44,24,16,0.07)';
      }}
    >
      {/* Color stripe — the circle's identity */}
      <div style={{
        width: 6, flexShrink: 0,
        background: `linear-gradient(to bottom, ${color}, ${color}cc)`,
      }} />

      {/* Card body */}
      <div style={{
        flex: 1, padding: '15px 16px 13px',
        background: `linear-gradient(135deg, rgba(255,255,255,0) 0%, ${color}08 100%)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: T.ink,
              letterSpacing: '-0.015em', lineHeight: 1.25, marginBottom: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {group.name}
            </div>
            <AvatarStack groupId={group.id} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {role === 'pastor' && (
              <span style={{
                fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
                color: color, fontWeight: 700, opacity: 0.85,
              }}>You started this</span>
            )}
            <span style={{ fontSize: 18, color: T.inkMuted, opacity: 0.35, lineHeight: 1 }}>›</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function GroupsHome({ userGroups, session, profile, onOpenGroup, onJoined, onClose, initialGroupCode, onConsumeGroupCode }) {
  const [showSetup, setShowSetup] = useState(!!initialGroupCode);
  const [setupTab, setSetupTab]   = useState(initialGroupCode ? 'join' : 'create');

  useEffect(() => {
    if (initialGroupCode) { setSetupTab('join'); setShowSetup(true); }
  }, [initialGroupCode]);

  function openSetup(tab) { setSetupTab(tab); setShowSetup(true); }

  if (showSetup) {
    return (
      <GroupSetup
        session={session}
        initialCode={initialGroupCode ?? ''}
        initialTab={setupTab}
        onJoined={(g) => { onJoined(g); setShowSetup(false); onConsumeGroupCode?.(); }}
        onClose={() => { setShowSetup(false); onConsumeGroupCode?.(); }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.parchment, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#1e1208',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 14,
        }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.5)', fontSize: 13, cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 600, color: '#f4e9d4', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Your Circles
            </div>
            {userGroups.length > 0 && (
              <div style={{ fontSize: 11, color: 'rgba(253,248,240,0.38)', marginTop: 2 }}>
                {userGroups.length} {userGroups.length === 1 ? 'circle' : 'circles'}
              </div>
            )}
          </div>
          <button
            onClick={() => openSetup('create')}
            style={{
              background: T.gold, color: T.cream, border: 'none',
              borderRadius: 999, padding: '7px 16px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            + New
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '20px 16px 80px', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {userGroups.length === 0 ? (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: 38, marginBottom: 20, opacity: 0.55 }}>◯</div>
            <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12 }}>
              Your circles<br />live here.
            </div>
            <p style={{ fontFamily: T.serif, fontSize: 15, color: T.inkSoft, lineHeight: 1.75, maxWidth: 300, margin: '0 0 36px' }}>
              A private space for the people you study with, pray for, or just keep up with — wherever life takes you.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => openSetup('create')}
                style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '12px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(184,115,58,0.3)' }}
              >
                Start a circle
              </button>
              <button
                onClick={() => openSetup('join')}
                style={{ background: 'transparent', color: T.inkSoft, border: `1px solid ${T.line}`, borderRadius: 999, padding: '12px 26px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Join with code
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* "Join another" row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => openSetup('create')}
                style={{ flex: 1, background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '10px 0', fontSize: 13, fontWeight: 600, color: T.inkSoft, cursor: 'pointer' }}
              >
                + Start another
              </button>
              <button
                onClick={() => openSetup('join')}
                style={{ flex: 1, background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '10px 0', fontSize: 13, fontWeight: 600, color: T.inkSoft, cursor: 'pointer' }}
              >
                Join with code
              </button>
            </div>

            {/* Section label */}
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: T.gold, marginBottom: 14, opacity: 0.8 }}>
              Your circles
            </div>

            {/* Circle cards */}
            {userGroups.map((entry) => (
              <CircleCard
                key={entry.group.id}
                entry={entry}
                onClick={() => onOpenGroup(entry)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
