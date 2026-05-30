import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { track } from './analytics.js';

const CATEGORY_LABEL = {
  'new-believer': 'New to faith',
  'doubt':        'Doubt',
  'grief':        'Grief',
  'marriage':     'Marriage',
  'anxiety':      'Anxiety',
  'prayer':       'Prayer',
  'parenting':    'Parenting',
  'recovery':     'Recovery',
  'seasonal':     'Seasonal',
  'other':        'Other',
};

function PrivacyNote() {
  return (
    <div style={{
      background: 'rgba(184,115,58,0.06)', border: `1px solid ${T.goldLight}`,
      borderRadius: 12, padding: '12px 14px', marginBottom: 16,
      fontSize: 12.5, color: T.inkSoft, lineHeight: 1.55, display: 'flex', gap: 10,
    }}>
      <div style={{ color: T.goldDark, fontSize: 14, lineHeight: 1 }}>🔒</div>
      <div>
        <strong style={{ color: T.ink }}>Journeys are private.</strong> You pick what to walk through. Your pastor never sees who started, paused, or finished. Pace is yours.
      </div>
    </div>
  );
}

function WalkCard({ walk, progress, onOpen }) {
  const status = progress?.completed_at
    ? 'completed'
    : progress
      ? 'in-progress'
      : 'new';
  const day = progress?.current_day ?? 0;
  const pct = progress ? Math.min(100, Math.round((day - 1) / walk.length_days * 100)) : 0;

  return (
    <button
      onClick={() => onOpen(walk)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 18px', cursor: 'pointer', marginBottom: 10,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: T.parchment, border: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: T.goldDark, flexShrink: 0,
        }}>
          {walk.cover_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.012em', lineHeight: 1.2 }}>
              {walk.title}
            </div>
            {status === 'in-progress' && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                background: T.gold, color: T.cream, borderRadius: 999, padding: '2px 8px',
              }}>In progress</span>
            )}
            {status === 'completed' && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                background: T.parchment, color: T.goldDark, borderRadius: 999, padding: '2px 8px', border: `1px solid ${T.goldLight}`,
              }}>✓ Done</span>
            )}
          </div>
          {walk.subtitle && (
            <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 }}>
              {walk.subtitle}
            </div>
          )}
          <div style={{ fontSize: 12, color: T.inkMuted, display: 'flex', gap: 10 }}>
            <span>{walk.length_days} days</span>
            <span>·</span>
            <span>{CATEGORY_LABEL[walk.category] ?? 'Walk'}</span>
            {status === 'in-progress' && (
              <>
                <span>·</span>
                <span style={{ color: T.goldDark }}>Day {day} of {walk.length_days}</span>
              </>
            )}
          </div>
          {status === 'in-progress' && (
            <div style={{ height: 4, background: T.parchment, borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: T.gold, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function WalkOverview({ walk, progress, steps, onStart, onResume, onOpenDay, onBack, onRestart, busy }) {
  const day = progress?.current_day ?? 1;
  const pct = progress ? Math.min(100, Math.round((day - 1) / walk.length_days * 100)) : 0;
  const stepsByDay = useMemo(() => {
    const m = {};
    (steps ?? []).forEach((s) => { m[s.day] = s; });
    return m;
  }, [steps]);

  return (
    <div>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: T.goldDark, fontSize: 14,
        cursor: 'pointer', padding: 0, marginBottom: 18,
      }}>← Journeys</button>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: T.parchment, border: `1px solid ${T.goldLight}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, color: T.goldDark,
        }}>
          {walk.cover_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 4 }}>
            {CATEGORY_LABEL[walk.category]} · {walk.length_days} days
          </div>
          <h2 style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 600, color: T.ink, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {walk.title}
          </h2>
          {walk.subtitle && (
            <div style={{ fontSize: 14, color: T.inkSoft, marginTop: 4, fontStyle: 'italic' }}>{walk.subtitle}</div>
          )}
        </div>
      </div>

      {walk.description && (
        <div style={{
          background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
          padding: '16px 18px', marginBottom: 16,
          fontFamily: T.serif, fontSize: 15, color: T.ink, lineHeight: 1.7,
        }}>
          {walk.description}
        </div>
      )}

      {progress && !progress.completed_at && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 6 }}>
            Day {day} of {walk.length_days} · {pct}%
          </div>
          <div style={{ height: 6, background: T.parchment, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: T.gold }} />
          </div>
        </div>
      )}

      {progress?.completed_at && (
        <div style={{
          background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 12,
          padding: '14px 16px', marginBottom: 16, fontFamily: T.serif, color: T.ink,
        }}>
          ✓ You finished this journey. You can revisit any day below.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {!progress && (
          <button
            disabled={busy}
            onClick={onStart}
            style={{
              flex: 1, background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '13px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? '…' : `Begin · Day 1`}
          </button>
        )}
        {progress && !progress.completed_at && (
          <button
            disabled={busy}
            onClick={onResume}
            style={{
              flex: 1, background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '13px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Continue · Day {day}
          </button>
        )}
        {progress && (
          <button
            disabled={busy}
            onClick={onRestart}
            style={{
              background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
              padding: '13px 18px', fontSize: 14, color: T.inkMuted, cursor: 'pointer',
            }}
          >
            Start over
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 8 }}>
        Days
      </div>
      <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
        {Array.from({ length: walk.length_days }).map((_, i) => {
          const d = i + 1;
          const step = stepsByDay[d];
          const reached = progress ? d <= (progress.current_day ?? 1) : false;
          const completedDay = progress ? d < (progress.current_day ?? 1) : false;
          const isCurrent = progress && d === (progress.current_day ?? 1) && !progress.completed_at;
          const locked = !progress;
          return (
            <button
              key={d}
              disabled={locked || !step}
              onClick={() => onOpenDay(d)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', textAlign: 'left',
                background: isCurrent ? 'rgba(184,115,58,0.08)' : 'transparent',
                border: 'none', borderTop: i === 0 ? 'none' : `1px solid ${T.line}`,
                padding: '12px 16px', cursor: (locked || !step) ? 'default' : 'pointer',
                opacity: !step ? 0.45 : 1,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: completedDay ? T.gold : isCurrent ? T.parchmentDark : T.parchment,
                color: completedDay ? T.cream : T.goldDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                border: isCurrent ? `1.5px solid ${T.gold}` : `1px solid ${T.line}`,
              }}>
                {completedDay ? '✓' : d}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: isCurrent ? 700 : 500, color: reached ? T.ink : T.inkMuted, fontSize: 14 }}>
                  Day {d}{step?.title ? ` · ${step.title}` : ''}
                </div>
                {step?.scripture_ref && (
                  <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, fontStyle: 'italic' }}>
                    {step.scripture_ref}
                  </div>
                )}
              </div>
              {!step && (
                <div style={{ fontSize: 11, color: T.inkMuted }}>—</div>
              )}
              {step && !locked && <div style={{ color: T.inkMuted, fontSize: 18 }}>›</div>}
            </button>
          );
        })}
      </div>

      {steps && steps.length === 0 && (
        <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
          Daily content for this journey will be added soon.
        </div>
      )}
    </div>
  );
}

function WalkDay({ walk, step, progress, day, onAdvance, onPrev, onNext, onBack, busy, total }) {
  if (!step) {
    return (
      <div>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 18,
        }}>← {walk.title}</button>
        <div style={{ fontFamily: T.serif, color: T.inkMuted, fontStyle: 'italic' }}>
          This day's content hasn't been written yet.
        </div>
      </div>
    );
  }
  const isCurrentDay = progress && day === progress.current_day && !progress.completed_at;
  const isLastDay = day === walk.length_days;

  return (
    <div>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
      }}>← {walk.title}</button>

      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 6 }}>
        Day {day} of {total}
      </div>
      <h2 style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 600, color: T.ink, margin: '0 0 14px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {step.title}
      </h2>

      {step.scripture_ref && (
        <div style={{
          background: 'rgba(184,115,58,0.06)', borderLeft: `4px solid ${T.gold}`,
          borderRadius: 10, padding: '14px 18px', marginBottom: 18,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 6 }}>
            {step.scripture_ref}
          </div>
          {step.scripture_body && (
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 16, color: T.ink, lineHeight: 1.75 }}>
              {step.scripture_body}
            </div>
          )}
        </div>
      )}

      <div style={{
        fontFamily: T.serif, fontSize: 16.5, color: T.ink, lineHeight: 1.85,
        whiteSpace: 'pre-wrap', marginBottom: 24,
      }}>
        {step.body}
      </div>

      {step.reflection_prompt && (
        <div style={{
          background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
          padding: '16px 18px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 6 }}>
            ✿ Sit with this
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 15, color: T.inkSoft, lineHeight: 1.7, fontStyle: 'italic' }}>
            {step.reflection_prompt}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <button
          onClick={onPrev}
          disabled={day <= 1}
          style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '11px 18px', fontSize: 14, color: day <= 1 ? T.inkMuted : T.inkSoft,
            cursor: day <= 1 ? 'not-allowed' : 'pointer', opacity: day <= 1 ? 0.5 : 1,
          }}
        >
          ← Day {Math.max(1, day - 1)}
        </button>

        {isCurrentDay && (
          <button
            disabled={busy}
            onClick={onAdvance}
            style={{
              flex: 1, background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
              padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? '…' : isLastDay ? 'Finish journey' : `Mark done · Day ${day + 1} →`}
          </button>
        )}
        {!isCurrentDay && day < total && (
          <button
            onClick={onNext}
            style={{
              flex: 1, background: T.parchment, border: `1px solid ${T.goldLight}`, borderRadius: 999,
              padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: T.goldDark,
            }}
          >
            Day {day + 1} →
          </button>
        )}
      </div>

      <div style={{ fontSize: 12, color: T.inkMuted, textAlign: 'center', lineHeight: 1.6, fontStyle: 'italic' }}>
        Walk at your own pace. There's no streak to break and no one watching.
      </div>
    </div>
  );
}

export default function Walks({ session, onClose }) {
  const [view, setView] = useState('library');     // 'library' | 'overview' | 'day'
  const scrollRef = useRef(null);
  const [walks, setWalks] = useState([]);
  const [progressMap, setProgressMap] = useState({});  // walk_id → progress row
  const [selected, setSelected] = useState(null);
  const [steps, setSteps] = useState([]);
  const [day, setDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Scroll to top whenever the user moves to a new day
  useEffect(() => {
    if (view === 'day') {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [day, view]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: w }, prog] = await Promise.all([
        supabase.from('walks').select('*').eq('is_published', true).order('sort_order'),
        session?.user?.id
          ? supabase.from('walk_progress').select('*').eq('user_id', session.user.id)
          : Promise.resolve({ data: [] }),
      ]);
      if (!active) return;
      setWalks(w ?? []);
      const map = {};
      (prog?.data ?? []).forEach((p) => { map[p.walk_id] = p; });
      setProgressMap(map);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [session?.user?.id]);

  async function loadSteps(walk) {
    const { data } = await supabase
      .from('walk_steps')
      .select('*')
      .eq('walk_id', walk.id)
      .order('day');
    setSteps(data ?? []);
  }

  function openWalk(walk) {
    setSelected(walk);
    setView('overview');
    loadSteps(walk);
  }

  async function handleStart() {
    if (!session?.user?.id || !selected) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('walk_progress')
      .insert({ user_id: session.user.id, walk_id: selected.id, current_day: 1 })
      .select()
      .single();
    setBusy(false);
    if (!error && data) {
      setProgressMap((m) => ({ ...m, [selected.id]: data }));
      setDay(1);
      setView('day');
      track('walk_started', { title: selected.title });
    }
  }

  function handleResume() {
    const p = progressMap[selected.id];
    setDay(p?.current_day ?? 1);
    setView('day');
  }

  async function handleRestart() {
    if (!session?.user?.id || !selected) return;
    setBusy(true);
    const { data } = await supabase
      .from('walk_progress')
      .update({ current_day: 1, completed_at: null, last_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('walk_id', selected.id)
      .select()
      .single();
    setBusy(false);
    if (data) {
      setProgressMap((m) => ({ ...m, [selected.id]: data }));
      setDay(1);
      setView('day');
    }
  }

  async function handleAdvance() {
    if (!session?.user?.id || !selected) return;
    const isLast = day >= selected.length_days;
    setBusy(true);
    const update = isLast
      ? { current_day: day, completed_at: new Date().toISOString(), last_at: new Date().toISOString() }
      : { current_day: day + 1, last_at: new Date().toISOString() };
    const { data } = await supabase
      .from('walk_progress')
      .update(update)
      .eq('user_id', session.user.id)
      .eq('walk_id', selected.id)
      .select()
      .single();
    setBusy(false);
    if (data) {
      setProgressMap((m) => ({ ...m, [selected.id]: data }));
      if (isLast) {
        track('walk_completed', { title: selected.title });
        // Auto-post a journey milestone when the walk is finished
        if (session?.user?.id) {
          supabase.from('posts').insert({
            author_id:   session.user.id,
            scope:       'me',
            kind:        'journey_milestone',
            visibility:  'public',
            is_anonymous: false,
            body:        `Finished "${selected.title}" — ${selected.length_days}-day walk.`,
            body_data:   { walk_id: selected.id, walk_emoji: selected.cover_emoji ?? '' },
          }).then(null, () => {}); // fire and forget
        }
        setView('overview');
      } else {
        setDay(day + 1);
      }
    }
  }

  const inProgress = walks.filter((w) => progressMap[w.id] && !progressMap[w.id].completed_at);
  const completed  = walks.filter((w) => progressMap[w.id]?.completed_at);
  const fresh      = walks.filter((w) => !progressMap[w.id]);

  return (
    <div ref={scrollRef} style={{ minHeight: '100vh', background: T.cream, padding: '32px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {view === 'library' && (
          <>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
            }}>← Back</button>

            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
              Journeys
            </div>
            <h1 style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 600, color: T.ink, margin: '0 0 8px', letterSpacing: '-0.022em', lineHeight: 1.08 }}>
              Pick a journey
            </h1>
            <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.65, margin: '0 0 22px' }}>
              Short guided walks you can take privately, at your own pace.
            </p>

            <PrivacyNote />

            {loading ? (
              <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 30 }}>Loading…</div>
            ) : (
              <>
                {inProgress.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, margin: '8px 0' }}>
                      In progress
                    </div>
                    {inProgress.map((w) => (
                      <WalkCard key={w.id} walk={w} progress={progressMap[w.id]} onOpen={openWalk} />
                    ))}
                  </>
                )}

                {fresh.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, margin: '20px 0 8px' }}>
                      Library
                    </div>
                    {fresh.map((w) => (
                      <WalkCard key={w.id} walk={w} progress={null} onOpen={openWalk} />
                    ))}
                  </>
                )}

                {completed.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, margin: '20px 0 8px' }}>
                      Completed
                    </div>
                    {completed.map((w) => (
                      <WalkCard key={w.id} walk={w} progress={progressMap[w.id]} onOpen={openWalk} />
                    ))}
                  </>
                )}

                {walks.length === 0 && (
                  <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', textAlign: 'center', padding: 40 }}>
                    No journeys published yet.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {view === 'overview' && selected && (
          <WalkOverview
            walk={selected}
            progress={progressMap[selected.id]}
            steps={steps}
            busy={busy}
            onStart={handleStart}
            onResume={handleResume}
            onRestart={handleRestart}
            onOpenDay={(d) => { setDay(d); setView('day'); }}
            onBack={() => { setView('library'); setSelected(null); setSteps([]); }}
          />
        )}

        {view === 'day' && selected && (
          <WalkDay
            walk={selected}
            step={steps.find((s) => s.day === day)}
            progress={progressMap[selected.id]}
            day={day}
            total={selected.length_days}
            busy={busy}
            onAdvance={handleAdvance}
            onPrev={() => setDay((d) => Math.max(1, d - 1))}
            onNext={() => setDay((d) => Math.min(selected.length_days, d + 1))}
            onBack={() => setView('overview')}
          />
        )}
      </div>
    </div>
  );
}
