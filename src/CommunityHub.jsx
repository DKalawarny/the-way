import { useState } from 'react';
import { T } from './theme.js';
import Community from './Community.jsx';
import Prayer from './Prayer.jsx';
import GroupSpace from './GroupSpace.jsx';
import GroupSetup from './GroupSetup.jsx';

const TABS = ['Feed', 'Groups', 'Prayer'];

export default function CommunityHub({ session, profile, userGroup, onUserGroupChange, onClose, onOpenChat, initialTab }) {
  const [tab, setTab] = useState(initialTab ?? 'Feed');

  return (
    <div style={{ minHeight: '100vh', background: T.ink, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <header style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(196,129,58,0.15)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.45)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.cream, letterSpacing: '-0.015em', flex: 1 }}>
          Community
        </div>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(196,129,58,0.12)', padding: '0 20px' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 16px 10px',
              fontSize: 13, fontWeight: 500, letterSpacing: 0.3,
              color: tab === t ? T.gold : 'rgba(253,248,240,0.4)',
              borderBottom: tab === t ? `2px solid ${T.gold}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'Feed' && (
          <Community
            session={session}
            profile={profile}
            onClose={onClose}
            onOpenChat={onOpenChat}
            hideHeader
          />
        )}

        {tab === 'Groups' && (
          userGroup
            ? <GroupSpace
                group={userGroup.group}
                role={userGroup.role}
                session={session}
                profile={profile}
                onClose={onClose}
                onLeave={async () => onUserGroupChange?.(null)}
                hideHeader
              />
            : <GroupSetup
                session={session}
                onJoined={(g) => onUserGroupChange?.(g)}
                onClose={onClose}
              />
        )}

        {tab === 'Prayer' && (
          <Prayer
            session={session}
            profile={profile}
            onClose={onClose}
            userGroup={userGroup}
            hideHeader
          />
        )}
      </div>
    </div>
  );
}
