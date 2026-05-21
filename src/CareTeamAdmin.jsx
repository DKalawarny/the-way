import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';

const SPECIALTIES = [
  { id: 'marriage',   label: 'Marriage' },
  { id: 'grief',      label: 'Grief' },
  { id: 'doubt',      label: 'Doubt & questions' },
  { id: 'youth',      label: 'Youth' },
  { id: 'prayer',     label: 'Prayer' },
  { id: 'recovery',   label: 'Recovery' },
  { id: 'parenting',  label: 'Parenting' },
  { id: 'anxiety',    label: 'Anxiety' },
  { id: 'finances',   label: 'Finances' },
];

const ROLE_PRESETS = [
  'Lead pastor',
  'Associate pastor',
  'Youth pastor',
  'Elder',
  'Deacon',
  "Women's ministry lead",
  "Men's ministry lead",
  'Prayer team lead',
  'Lay counselor',
  'Small group leader',
  'Other',
];

function MemberRow({ member, onEdit, onToggleActive, onRemove }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: member.is_active ? 1 : 0.6,
    }}>
      <Avatar name={member.profile?.display_name} avatarConfig={member.profile?.avatar_config} photoUrl={member.profile?.avatar_url} size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: T.ink }}>{member.profile?.display_name ?? '—'}</div>
        <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 4 }}>{member.role_label}</div>
        {member.specialty_tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {member.specialty_tags.map((t) => (
              <span key={t} style={{
                fontSize: 10, color: T.goldDark, background: 'rgba(184,115,58,0.10)',
                borderRadius: 999, padding: '2px 8px',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onEdit(member)} style={{
          background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
          padding: '6px 12px', fontSize: 12, color: T.inkSoft, cursor: 'pointer',
        }}>Edit</button>
        <button onClick={() => onToggleActive(member)} style={{
          background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
          padding: '6px 12px', fontSize: 12, color: T.inkSoft, cursor: 'pointer',
        }}>{member.is_active ? 'Pause' : 'Resume'}</button>
        <button onClick={() => onRemove(member)} style={{
          background: 'transparent', border: 'none',
          padding: '6px 6px', fontSize: 16, color: T.inkMuted, cursor: 'pointer',
        }} title="Remove">×</button>
      </div>
    </div>
  );
}

function MemberForm({ initial, onSave, onCancel, saving }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pickedUser, setPickedUser] = useState(initial?.profile ?? null);
  const [roleLabel, setRoleLabel] = useState(initial?.role_label ?? '');
  const [tags, setTags] = useState(new Set(initial?.specialty_tags ?? []));
  const [bio, setBio] = useState(initial?.bio ?? '');

  async function runSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_config, avatar_url, city, country')
      .ilike('display_name', `%${searchQuery.trim()}%`)
      .limit(8);
    setSearchResults(data ?? []);
    setSearching(false);
  }

  function toggleTag(t) {
    const s = new Set(tags);
    if (s.has(t)) s.delete(t); else s.add(t);
    setTags(s);
  }

  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 12 }}>
        {initial ? 'Edit care team member' : 'Add care team member'}
      </div>

      {!initial && (
        <>
          <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            Find by name
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
              placeholder="Search by display name…"
              style={{
                flex: 1, border: `1px solid ${T.line}`, borderRadius: 10, padding: '9px 12px',
                fontSize: 14, fontFamily: 'inherit', background: T.cream, outline: 'none',
              }}
            />
            <button onClick={runSearch} disabled={searching} style={{
              background: T.parchment, border: `1px solid ${T.line}`, borderRadius: 10,
              padding: '9px 14px', fontSize: 13, color: T.goldDark, cursor: 'pointer', fontWeight: 600,
            }}>{searching ? '…' : 'Search'}</button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ marginBottom: 12, maxHeight: 200, overflowY: 'auto', border: `1px solid ${T.line}`, borderRadius: 10 }}>
              {searchResults.map((p) => (
                <button key={p.id} onClick={() => setPickedUser(p)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '8px 12px', background: pickedUser?.id === p.id ? 'rgba(184,115,58,0.08)' : 'transparent',
                  border: 'none', borderBottom: `1px solid ${T.line}`, cursor: 'pointer',
                }}>
                  <Avatar name={p.display_name} avatarConfig={p.avatar_config} photoUrl={p.avatar_url} size={28} />
                  <div style={{ fontSize: 13, color: T.ink }}>{p.display_name}</div>
                </button>
              ))}
            </div>
          )}
          {pickedUser && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
              padding: '8px 12px', background: T.parchment, borderRadius: 10,
            }}>
              <Avatar name={pickedUser.display_name} avatarConfig={pickedUser.avatar_config} photoUrl={pickedUser.avatar_url} size={28} />
              <div style={{ fontSize: 13, color: T.ink, flex: 1 }}>{pickedUser.display_name}</div>
              <button onClick={() => setPickedUser(null)} style={{
                background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer',
              }}>Change</button>
            </div>
          )}
        </>
      )}

      <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 4 }}>
        Role
      </label>
      <select
        value={roleLabel}
        onChange={(e) => setRoleLabel(e.target.value)}
        style={{
          width: '100%', border: `1px solid ${T.line}`, borderRadius: 10, padding: '9px 12px',
          fontSize: 14, fontFamily: 'inherit', background: T.cream, outline: 'none', marginBottom: 14,
          boxSizing: 'border-box', cursor: 'pointer',
        }}
      >
        <option value="">Select…</option>
        {ROLE_PRESETS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 6 }}>
        Specialties (optional — helps members find the right person)
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {SPECIALTIES.map((s) => (
          <button key={s.id} onClick={() => toggleTag(s.id)} style={{
            background: tags.has(s.id) ? T.gold : 'transparent',
            color: tags.has(s.id) ? T.cream : T.inkSoft,
            border: `1px solid ${tags.has(s.id) ? T.gold : T.line}`,
            borderRadius: 999, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
          }}>{s.label}</button>
        ))}
      </div>

      <label style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500, display: 'block', marginBottom: 4 }}>
        Bio (shown to members when they pick someone — optional)
      </label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value.slice(0, 240))}
        rows={2}
        placeholder="A line or two — helps members feel safe choosing you."
        style={{
          width: '100%', border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
          fontSize: 13, fontFamily: T.serif, background: T.cream, outline: 'none', resize: 'vertical',
          boxSizing: 'border-box', marginBottom: 16, lineHeight: 1.55,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onCancel} style={{
          background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
          padding: '8px 16px', fontSize: 13, color: T.inkMuted, cursor: 'pointer',
        }}>Cancel</button>
        <button
          disabled={saving || (!initial && !pickedUser) || !roleLabel}
          onClick={() => onSave({
            user: pickedUser ?? initial?.profile,
            role_label: roleLabel,
            specialty_tags: Array.from(tags),
            bio: bio.trim() || null,
          })}
          style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: (saving || (!initial && !pickedUser) || !roleLabel) ? 0.5 : 1,
          }}
        >{saving ? 'Saving…' : initial ? 'Save' : 'Add to care team'}</button>
      </div>
    </div>
  );
}

export default function CareTeamAdmin({ session, churchId, onBack, embedded = false }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // member | { _new: true } | null
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!churchId) return;
    setLoading(true);
    supabase
      .from('care_team_members')
      .select('*, profile:profiles!user_id(id, display_name, avatar_config, avatar_url)')
      .eq('church_id', churchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMembers(data ?? []);
        setLoading(false);
      });
  }, [churchId]);

  async function handleSave({ user, role_label, specialty_tags, bio }) {
    setSaving(true);
    if (editing && !editing._new) {
      const { data } = await supabase
        .from('care_team_members')
        .update({ role_label, specialty_tags, bio })
        .eq('id', editing.id)
        .select('*, profile:profiles!user_id(id, display_name, avatar_config, avatar_url)')
        .single();
      if (data) setMembers((m) => m.map((x) => x.id === data.id ? data : x));
    } else {
      const { data } = await supabase
        .from('care_team_members')
        .insert({
          church_id: churchId, user_id: user.id,
          role_label, specialty_tags, bio, is_active: true,
        })
        .select('*, profile:profiles!user_id(id, display_name, avatar_config, avatar_url)')
        .single();
      if (data) setMembers((m) => [...m, data]);
    }
    setSaving(false);
    setEditing(null);
  }

  async function handleToggleActive(member) {
    const { data } = await supabase
      .from('care_team_members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id)
      .select('*, profile:profiles!user_id(id, display_name, avatar_config, avatar_url)')
      .single();
    if (data) setMembers((m) => m.map((x) => x.id === data.id ? data : x));
  }

  async function handleRemove(member) {
    if (!confirm(`Remove ${member.profile?.display_name ?? 'this person'} from the care team?`)) return;
    await supabase.from('care_team_members').delete().eq('id', member.id);
    setMembers((m) => m.filter((x) => x.id !== member.id));
  }

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', background: T.cream, padding: embedded ? 0 : '32px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {!embedded && (
          <>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
            }}>← Pastor dashboard</button>

            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
              Care Team
            </div>
            <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 8px' }}>
              Who's available to talk
            </h1>
            <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 20px' }}>
              People your members can choose to talk to — elders, ministry leads, prayer team, lay counselors. You won't see what's said. Each conversation is private to the two participants.
            </p>
          </>
        )}

        {loading ? (
          <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 40 }}>Loading…</div>
        ) : (
          <>
            {editing && (
              <MemberForm
                initial={editing._new ? null : editing}
                saving={saving}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
              />
            )}

            {!editing && (
              <button onClick={() => setEditing({ _new: true })} style={{
                width: '100%', background: T.parchment, border: `1px dashed ${T.goldLight}`,
                borderRadius: 14, padding: '14px', cursor: 'pointer', textAlign: 'center',
                color: T.goldDark, fontSize: 14, fontWeight: 600, marginBottom: 16,
              }}>+ Add care team member</button>
            )}

            {members.length === 0 && !editing && (
              <div style={{
                background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
                padding: '28px 20px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic',
              }}>
                No care team members yet. Start with 3–5 trusted people from your church.
              </div>
            )}

            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onEdit={setEditing}
                onToggleActive={handleToggleActive}
                onRemove={handleRemove}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
