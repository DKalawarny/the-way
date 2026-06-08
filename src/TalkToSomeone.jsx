import { useEffect, useState } from 'react';
import { Lock, ArrowLeft, Check } from 'lucide-react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import CareConversation from './CareConversation.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const SAFETY_PATTERNS = [
  /\b(suicide|kill myself|end my life|don'?t want to (be alive|live)|wanna die|want to die|self[\s-]?harm|cutting myself|hurt myself)\b/i,
  /\b(being (abused|hit|beaten)|he hits|she hits|hits me|raped|sexual(ly)? assault|molest)\b/i,
  /\b(starving myself|throwing up after|purging)\b/i,
  /\b(hurt (someone|them|him|her|people)|kill (someone|them|him|her|people)|harm (someone|them|him|her|people)|going to (shoot|stab|attack))\b/i,
];
function detectSafety(text) {
  return !!text && SAFETY_PATTERNS.some((p) => p.test(text));
}

const SPECIALTY_LABEL = {
  marriage:  'Marriage',
  grief:     'Grief',
  doubt:     'Doubt & questions',
  youth:     'Youth',
  prayer:    'Prayer',
  recovery:  'Recovery',
  parenting: 'Parenting',
  anxiety:   'Anxiety',
  finances:  'Finances',
};

const TOPICS = [
  { id: 'marriage',   label: 'Marriage' },
  { id: 'grief',      label: 'Grief or loss' },
  { id: 'doubt',      label: 'Doubt or questions' },
  { id: 'anxiety',    label: 'Anxiety' },
  { id: 'prayer',     label: 'Prayer' },
  { id: 'parenting',  label: 'Parenting' },
  { id: 'recovery',   label: 'Recovery / addiction' },
  { id: 'finances',   label: 'Finances' },
  { id: 'other',      label: 'Something else' },
];

function PrivacyHeader() {
  return (
    <div style={{
      background: 'rgba(184,115,58,0.06)', border: `1px solid ${T.goldLight}`,
      borderRadius: 12, padding: '12px 14px', marginBottom: 18,
      fontSize: 12.5, color: T.inkSoft, lineHeight: 1.55, display: 'flex', gap: 10,
    }}>
      <div style={{ color: T.goldDark, lineHeight: 1 }}><Lock size={14} strokeWidth={2} /></div>
      <div>
        <strong style={{ color: T.ink }}>Private.</strong> Whoever you talk to — only the two of you see it. Your pastor cannot read these conversations. You choose who, and whether to share your name.
      </div>
    </div>
  );
}

function PersonRow({ person, picked, onPick }) {
  const tags = person.specialty_tags ?? [];
  return (
    <button onClick={() => onPick(person)} style={{
      display: 'block', width: '100%', textAlign: 'left',
      background: picked ? 'rgba(184,115,58,0.08)' : T.white,
      border: `1px solid ${picked ? T.gold : T.line}`,
      borderRadius: 14, padding: '12px 14px', cursor: 'pointer', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={person.profile?.display_name} avatarConfig={person.profile?.avatar_config} photoUrl={person.profile?.avatar_url} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, color: T.ink }}>{person.profile?.display_name ?? '—'}</div>
          <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: tags.length ? 4 : 0 }}>{person.role_label}</div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {tags.map((t) => (
                <span key={t} style={{
                  fontSize: 10.5, color: T.goldDark, background: 'rgba(184,115,58,0.10)',
                  borderRadius: 999, padding: '2px 8px',
                }}>{SPECIALTY_LABEL[t] ?? t}</span>
              ))}
            </div>
          )}
        </div>
        {picked && <div style={{ color: T.gold }}><Check size={18} strokeWidth={2.5} /></div>}
      </div>
    </button>
  );
}

export default function TalkToSomeone({ session, profile, churchId, onBack }) {
  const [careTeam, setCareTeam] = useState([]);
  const [churchName, setChurchName] = useState(null);
  const [pastorFallback, setPastorFallback] = useState(null);
  const [isCurrentUserPastor, setIsCurrentUserPastor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [routingMode, setRoutingMode] = useState('anyone');  // 'anyone' | 'person'
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [topic, setTopic] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    if (!churchId) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('care_team_members')
        .select('*, profile:profiles!user_id(id, display_name, avatar_config, avatar_url)')
        .eq('church_id', churchId)
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('churches')
        .select('name, pastor_id')
        .eq('id', churchId)
        .maybeSingle(),
      // Also pull anyone assigned the 'care' role via church_roles so that
      // the People → Assign role flow is enough to show up here.
      supabase
        .from('church_roles')
        .select('user_id, profile:profiles!user_id(id, display_name, avatar_config, avatar_url)')
        .eq('church_id', churchId)
        .eq('role_key', 'care'),
    ]).then(async ([{ data: members }, { data: church }, { data: roleRows }]) => {
      const uid = session?.user?.id;

      // Merge care_team_members + church_roles care members, deduplicate by user_id
      const fromTable = (members ?? []).filter(m => m.user_id !== uid);
      const fromRoles = (roleRows ?? [])
        .filter(r => r.user_id !== uid && !fromTable.some(m => m.user_id === r.user_id))
        .map(r => ({ user_id: r.user_id, profile: r.profile, role_label: 'Care team', specialty_tags: [] }));
      const merged = [...fromTable, ...fromRoles];

      setCareTeam(merged);
      setChurchName(church?.name ?? null);
      setIsCurrentUserPastor(!!church?.pastor_id && church.pastor_id === uid);

      if (merged.length === 0) {
        // Try pastor_id first, then fall back to church_roles owner
        const pastorId = church?.pastor_id ?? null;
        const ownerId = !pastorId
          ? (await supabase.from('church_roles').select('user_id').eq('church_id', churchId).eq('is_owner', true).maybeSingle()).data?.user_id ?? null
          : null;
        const lookupId = pastorId ?? ownerId;
        if (lookupId && lookupId !== uid) {
          const { data: pastor } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_config, avatar_url')
            .eq('id', lookupId)
            .maybeSingle();
          if (pastor) setPastorFallback(pastor);
        } else if (!lookupId) {
          // No pastor found at all — check if current user is the owner
          const { data: selfOwner } = await supabase
            .from('church_roles')
            .select('user_id')
            .eq('church_id', churchId)
            .eq('is_owner', true)
            .eq('user_id', uid)
            .maybeSingle();
          if (selfOwner) setIsCurrentUserPastor(true);
        }
      }
      setLoading(false);
    });
  }, [churchId]);

  function pickAnyone() {
    setRoutingMode('anyone');
    setSelectedPerson(null);
  }

  function pickPerson(p) {
    setRoutingMode('person');
    setSelectedPerson(p);
  }

  async function handleStart(overridePerson) {
    if (!session?.user?.id || !churchId) return;
    setCreating(true);
    const person = overridePerson ?? selectedPerson;

    // Reuse any existing open/claimed conversation from this member in this church
    // so repeated taps don't flood the pastor's inbox with separate threads.
    const { data: existing } = await supabase
      .from('care_conversations')
      .select('id')
      .eq('church_id', churchId)
      .eq('requester_id', session.user.id)
      .in('status', ['open', 'claimed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      setCreating(false);
      setConversationId(existing.id);
      return;
    }

    const payload = {
      church_id: churchId,
      requester_id: session.user.id,
      care_member_id: person ? person.user_id : null,
      topic: topic || null,
      is_anonymous: isAnonymous,
      status: person ? 'claimed' : 'open',
    };
    const { data, error } = await supabase
      .from('care_conversations')
      .insert(payload)
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      const body = message.trim();
      const isSafety = detectSafety(body);
      await supabase.from('care_messages').insert({
        conversation_id: data.id,
        sender_id: session.user.id,
        body,
        is_safety_flag: isSafety,
      });
      await supabase.from('care_conversations')
        .update({ last_message_at: new Date().toISOString(), ...(isSafety && { safety_flagged: true }) })
        .eq('id', data.id);
      setConversationId(data.id);
    }
  }

  if (conversationId) {
    return (
      <CareConversation
        session={session}
        profile={profile}
        conversationId={conversationId}
        viewerRole="requester"
        onBack={onBack}
      />
    );
  }

  const ready = !creating && message.trim().length > 0 && (routingMode === 'anyone' || (routingMode === 'person' && selectedPerson));

  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '32px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', padding: 0, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 14,
        }}><ArrowLeft size={15} strokeWidth={2} /> Back</button>

        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
          Ask someone
        </div>
        <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 600, color: T.ink, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          What's on your mind?
        </h1>
        <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 18px' }}>
          Pick a topic and a person — or let anyone available pick it up. {churchName && <>People at <strong>{churchName}</strong> who said they're here to listen.</>}
        </p>

        <PrivacyHeader />

        {loading ? (
          <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 30 }}>Loading…</div>
        ) : careTeam.length === 0 ? (
          <div style={{
            background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
            padding: '24px 20px', textAlign: 'center',
            color: T.inkMuted, fontFamily: T.serif, lineHeight: 1.65,
          }}>
            {pastorFallback ? (
              <>
                <Avatar name={pastorFallback.display_name} avatarConfig={pastorFallback.avatar_config} photoUrl={pastorFallback.avatar_url} size={48} />
                <div style={{ marginTop: 10, fontWeight: 600, fontSize: 15, color: T.ink, fontFamily: 'inherit' }}>
                  {pastorFallback.display_name}
                </div>
                <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>Pastor</div>
                <button
                  disabled={creating}
                  onClick={() => {
                    const person = { user_id: pastorFallback.id, profile: pastorFallback, role_label: 'Pastor', specialty_tags: [] };
                    setRoutingMode('person');
                    setSelectedPerson(person);
                    handleStart(person);
                  }}
                  style={{
                    background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '10px 22px', fontSize: 13.5, fontWeight: 600,
                    cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1,
                  }}
                >{creating ? 'Opening…' : 'Talk to your pastor →'}</button>
              </>
            ) : isCurrentUserPastor ? (
              <div style={{ fontFamily: T.serif }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>☎</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: T.ink, marginBottom: 6 }}>
                  This is how members reach you
                </div>
                <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.65 }}>
                  Members who tap "Talk to someone" get connected with your care team — or you directly if no care team is set up. Add care team members in People → Roles to share the load.
                </div>
              </div>
            ) : (
              <span style={{ fontStyle: 'italic' }}>
                This church hasn't set up a care team yet.<br />
                Try reaching out to your pastor directly.
              </span>
            )}
          </div>
        ) : (
          <>
            {/* Topic chips */}
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, margin: '0 0 8px' }}>
              What's on your mind? <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: T.inkMuted }}>(optional)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
              {TOPICS.map((t) => (
                <button key={t.id} onClick={() => setTopic(topic === t.id ? '' : t.id)} style={{
                  background: topic === t.id ? T.gold : 'transparent',
                  color: topic === t.id ? T.cream : T.inkSoft,
                  border: `1px solid ${topic === t.id ? T.gold : T.line}`,
                  borderRadius: 999, padding: '6px 13px', fontSize: 12.5, cursor: 'pointer',
                }}>{t.label}</button>
              ))}
            </div>

            {/* Person picker */}
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, margin: '0 0 8px' }}>
              Reach out to
            </div>

            <button onClick={pickAnyone} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: routingMode === 'anyone' ? 'rgba(184,115,58,0.08)' : T.white,
              border: `1px solid ${routingMode === 'anyone' ? T.gold : T.line}`,
              borderRadius: 14, padding: '12px 14px', cursor: 'pointer', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: T.parchment,
                  border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.goldDark, fontSize: 18,
                }}><KinwoveStar size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: T.ink }}>Anyone available</div>
                  <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 1 }}>
                    First person from the care team picks it up.
                  </div>
                </div>
                {routingMode === 'anyone' && <div style={{ color: T.gold }}><Check size={18} strokeWidth={2.5} /></div>}
              </div>
            </button>

            {careTeam.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                picked={routingMode === 'person' && selectedPerson?.id === p.id}
                onPick={pickPerson}
              />
            ))}

            {/* Opening message */}
            <div style={{ margin: '20px 0 0' }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
                What would you like to share?
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write what's on your mind. This goes directly to the person you reach out to — no one else sees it."
                rows={5}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: `1px solid ${message.trim() ? T.gold : T.line}`, borderRadius: 12,
                  padding: '12px 14px', fontSize: 14.5, lineHeight: 1.6,
                  fontFamily: T.display, color: T.ink, background: T.white,
                  resize: 'vertical', outline: 'none', transition: 'border-color 0.15s',
                }}
              />
            </div>

            {/* Anonymous toggle */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
              padding: '14px 16px', margin: '20px 0 16px', cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                style={{ marginTop: 3, accentColor: T.gold, transform: 'scale(1.1)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 3 }}>
                  Reach out anonymously
                </div>
                <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.55 }}>
                  Your name and avatar won't be shown. You can reveal yourself any time.
                </div>
              </div>
            </label>

            <button
              onClick={handleStart}
              disabled={!ready}
              style={{
                width: '100%', background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
                padding: '14px 20px', fontSize: 15, fontWeight: 600,
                cursor: ready ? 'pointer' : 'not-allowed', opacity: ready ? 1 : 0.5,
              }}
            >
              {creating ? 'Sending…' : 'Send'}
            </button>

            <div style={{ fontSize: 12, color: T.inkMuted, textAlign: 'center', marginTop: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
              Reach out at your own pace. There's no pressure to share more than you want.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
