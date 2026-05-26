import { useEffect, useState } from 'react';
import {
  MoreVertical, LayoutGrid, Clock, UserPlus, Phone, Inbox,
  Building2, Star, ShieldCheck, Flag, UserCog,
  LogOut, Trash2, Megaphone, HelpCircle, Users, Search,
} from 'lucide-react';
import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

export default function TopRightMenu({
  profile,
  hasCareTeamRole,
  hasPastoredChurch,
  rightOffset = 0,
  isDesktop = false,
  onFindPeople,
  onOpenBoard,
  onOpenHistory,
  onInviteFriends,
  onOpenTalkToSomeone,
  onOpenCareInbox,
  onOpenPastorDashboard,
  onFindChurches,
  onApplyAsPastor,
  onOpenPastorAdminQueue,
  onOpenChurchDisputesQueue,
  onOpenSponsorAdmin,
  onOpenHelp,
  onEditProfile,
  onSignOut,
  onDeleteAccount,
}) {
  // On desktop the ⋮ menu moves into the sidebar — nothing to render here
  if (isDesktop) return null;

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  const sections = [
    {
      label: 'Navigate',
      items: [
        onOpenBoard        && { icon: LayoutGrid,  label: 'Your board',         onClick: onOpenBoard },
        onOpenHistory      && { icon: Clock,        label: 'Chat history',       onClick: onOpenHistory },
        onFindPeople       && { icon: Users,        label: 'Find people',        onClick: onFindPeople },
        onFindChurches     && { icon: Search,       label: 'Find a church',      onClick: onFindChurches },
        onInviteFriends    && { icon: UserPlus,     label: 'Invite friends',     onClick: onInviteFriends },
        profile?.church_id && onOpenTalkToSomeone && { icon: Phone,    label: 'Ask someone',        onClick: onOpenTalkToSomeone },
      ].filter(Boolean),
    },
    {
      label: 'Church',
      items: [
        hasCareTeamRole   && onOpenCareInbox      && { icon: Inbox,      label: 'Conversations',      onClick: onOpenCareInbox },
        hasPastoredChurch && onOpenPastorDashboard && { icon: Building2,  label: 'Manage your church', onClick: onOpenPastorDashboard },
        onApplyAsPastor && !profile?.is_pastor     && { icon: Star,       label: 'Apply as a pastor',  onClick: onApplyAsPastor },
        onOpenPastorAdminQueue    && { icon: ShieldCheck, label: 'Pastor applications', onClick: onOpenPastorAdminQueue },
        onOpenChurchDisputesQueue && { icon: Flag,        label: 'Listing disputes',    onClick: onOpenChurchDisputesQueue },
        onOpenSponsorAdmin        && { icon: Megaphone,   label: 'Sponsor admin',       onClick: onOpenSponsorAdmin },
      ].filter(Boolean),
    },
    {
      label: 'Account',
      items: [
        onOpenHelp    && { icon: HelpCircle, label: 'Help & guide',  onClick: onOpenHelp },
        onEditProfile && { icon: UserCog,    label: 'Edit profile',  onClick: onEditProfile },
        onSignOut     && { icon: LogOut,     label: 'Sign out',      onClick: onSignOut,       danger: true },
        onDeleteAccount && { icon: Trash2,   label: 'Delete account', onClick: onDeleteAccount, danger: true },
      ].filter(Boolean),
    },
  ].filter((s) => s.items.length > 0);

  const fabBase = {
    position: 'fixed',
    top: 'calc(env(safe-area-inset-top, 0px) + 10px)', // overridden per-button on desktop
    width: 44, height: 44, borderRadius: '50%',
    background: T.white, border: `1px solid ${T.line}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 160,
    boxShadow: '0 2px 8px rgba(44,24,16,0.10)',
    color: T.inkSoft, padding: 0,
  };

  // Slot 0 from right edge (rightmost on mobile — ⋮ only)
  const dotsRight = rightOffset + 12;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        title="Menu"
        style={{ ...fabBase, right: dotsRight, top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      >
        <MoreVertical size={18} strokeWidth={2} />
      </button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 60px)',
            right: dotsRight,
            background: T.white, borderRadius: 16, border: `1px solid ${T.line}`,
            boxShadow: '0 12px 40px rgba(0,0,0,0.16)', overflow: 'hidden',
            minWidth: 240, maxWidth: 'calc(100vw - 24px)', zIndex: 300,
          }}>
            {/* Dropdown header */}
            <div style={{
              padding: '12px 18px 10px',
              borderBottom: `1px solid ${T.line}`,
              display: 'flex', alignItems: 'center', gap: 7,
              background: T.parchment,
            }}>
              <KinwoveStar size={14} style={{ color: T.gold, filter: 'drop-shadow(0 0 6px rgba(184,115,58,0.5))', flexShrink: 0 }} />
              <span style={{ fontFamily: T.display, fontSize: 16, fontWeight: 500, color: T.ink, letterSpacing: '-0.02em' }}>kinwove</span>
            </div>
            {/* Sections */}
            {sections.map((section, si) => (
              <div key={section.label}>
                {si > 0 && <div style={{ height: 1, background: T.line, marginTop: 4 }} />}
                <div style={{ padding: '8px 18px 2px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700 }}>
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => { setOpen(false); item.onClick(); }}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none',
                        padding: '11px 18px', fontSize: 14,
                        color: item.danger ? T.error : T.ink, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                      <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0, opacity: item.danger ? 1 : 0.55 }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
            <div style={{ height: 6 }} />
          </div>
        </div>
      )}
    </>
  );
}
