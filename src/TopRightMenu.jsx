import { useEffect, useState } from 'react';
import {
  MoreVertical, LayoutGrid, Clock, UserPlus, Phone, Inbox,
  Building2, Star, ShieldCheck, Flag, UserCog,
  LogOut, Trash2, Megaphone, HelpCircle, Users, Search,
} from 'lucide-react';
import { T } from './theme.js';

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

  const items = [
    onOpenBoard        && { icon: LayoutGrid,   label: 'Your board',          onClick: onOpenBoard },
    onOpenHistory      && { icon: Clock,         label: 'Chat history',        onClick: onOpenHistory },
    onFindPeople       && { icon: Users,         label: 'Find people',         onClick: onFindPeople },
    onFindChurches     && { icon: Search,        label: 'Find a church',       onClick: onFindChurches },
    onInviteFriends    && { icon: UserPlus,      label: 'Invite friends',      onClick: onInviteFriends },
    profile?.church_id && onOpenTalkToSomeone && { icon: Phone,      label: 'Ask someone',         onClick: onOpenTalkToSomeone },
    hasCareTeamRole    && onOpenCareInbox     && { icon: Inbox,      label: 'Conversations',       onClick: onOpenCareInbox },
    hasPastoredChurch  && onOpenPastorDashboard && { icon: Building2, label: 'Manage your church',  onClick: onOpenPastorDashboard },
    onApplyAsPastor && !profile?.is_pastor && { icon: Star, label: 'Apply as a pastor', onClick: onApplyAsPastor },
    onOpenPastorAdminQueue     && { icon: ShieldCheck,  label: 'Pastor applications', onClick: onOpenPastorAdminQueue },
    onOpenChurchDisputesQueue  && { icon: Flag,         label: 'Listing disputes',    onClick: onOpenChurchDisputesQueue },
    onOpenSponsorAdmin         && { icon: Megaphone,    label: 'Sponsor admin',       onClick: onOpenSponsorAdmin },
    onOpenHelp         && { icon: HelpCircle,    label: 'Help & guide',        onClick: onOpenHelp },
    onEditProfile      && { icon: UserCog,       label: 'Edit profile',        onClick: onEditProfile },
    onSignOut          && { icon: LogOut,        label: 'Sign out',            onClick: onSignOut,       danger: true },
    onDeleteAccount    && { icon: Trash2,        label: 'Delete account',      onClick: onDeleteAccount, danger: true },
  ].filter(Boolean);

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
            top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
            right: dotsRight,
            background: T.white, borderRadius: 14, border: `1px solid ${T.line}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
            minWidth: 220, maxWidth: 'calc(100vw - 24px)', zIndex: 300,
          }}>
            {items.map((item, i, arr) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => { setOpen(false); item.onClick(); }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    padding: '14px 18px', fontSize: 14,
                    color: item.danger ? T.error : T.ink, cursor: 'pointer',
                    borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                  <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0, opacity: item.danger ? 1 : 0.6 }} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
