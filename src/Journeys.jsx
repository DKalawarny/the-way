import { useState } from 'react';
import { T } from './theme.js';
import { JOURNEYS } from './journeys.js';

function StepDot({ state }) {
  const colors = {
    done:   { bg: 'rgba(196,129,58,0.15)', border: T.gold,                    color: T.gold,                  },
    active: { bg: T.gold,                  border: T.gold,                    color: T.cream,                 },
    locked: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.2)', },
  };
  const s = colors[state];
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: s.bg, border: `1.5px solid ${s.border}`,
      fontSize: state === 'done' ? 15 : 13, color: s.color, fontWeight: 600,
    }}>
      {state === 'done' ? '✓' : null}
    </div>
  );
}

function JourneyDetail({ journey, currentStep, onStartStep, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: T.ink, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <header style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid rgba(196,129,58,0.15)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.45)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.gold, textTransform: 'uppercase', opacity: 0.7, marginBottom: 2 }}>
            Guided path · {currentStep}/{journey.steps.length} explored
          </div>
          <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.cream, letterSpacing: '-0.015em' }}>{journey.title}</div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 80px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ fontFamily: T.serif, fontSize: 15, color: 'rgba(253,248,240,0.45)', lineHeight: 1.7, marginBottom: 36 }}>
            {journey.description}
          </p>

          {/* Progress bar */}
          {currentStep > 0 && (
            <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 999, marginBottom: 32, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(currentStep / journey.steps.length) * 100}%`, background: T.gold, opacity: 0.7, transition: 'width 0.4s ease' }} />
            </div>
          )}

          {journey.steps.map((step, i) => {
            const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'locked';
            return (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'flex-start' }}>
                <StepDot state={state} />
                <div style={{
                  flex: 1,
                  background: state === 'active' ? 'rgba(196,129,58,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${state === 'active' ? 'rgba(196,129,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 14, padding: '18px 20px',
                  opacity: state === 'locked' ? 0.38 : 1,
                  transition: 'opacity 0.2s',
                }}>
                  <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.cream, letterSpacing: '-0.012em', lineHeight: 1.2, marginBottom: 5 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.4)', lineHeight: 1.5, marginBottom: state === 'active' ? 18 : 0 }}>
                    {step.subtitle}
                  </div>
                  {state === 'active' && (
                    <button
                      onClick={() => onStartStep(journey, i, step.prompt)}
                      style={{
                        background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                        padding: '11px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(196,129,58,0.3)',
                      }}
                    >
                      Begin this conversation →
                    </button>
                  )}
                  {state === 'done' && (
                    <div style={{ fontSize: 11, color: T.gold, opacity: 0.65, marginTop: 4, letterSpacing: 1 }}>Explored</div>
                  )}
                </div>
              </div>
            );
          })}

          {currentStep >= journey.steps.length && (
            <div style={{ textAlign: 'center', padding: '32px 20px', background: 'rgba(196,129,58,0.08)', border: '1px solid rgba(196,129,58,0.25)', borderRadius: 18, marginTop: 8 }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>✦</div>
              <div style={{ fontFamily: T.display, fontSize: 24, color: T.cream, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.015em', lineHeight: 1.15 }}>Path complete.</div>
              <div style={{ fontSize: 14, color: 'rgba(253,248,240,0.45)', lineHeight: 1.65 }}>
                You've walked the whole way. Keep exploring — or start another path.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Journeys({ onClose, onStartStep, progress }) {
  const [selected, setSelected] = useState(null);

  const journey = selected ? JOURNEYS.find((j) => j.id === selected) : null;
  if (journey) {
    return (
      <JourneyDetail
        journey={journey}
        currentStep={progress[journey.id] ?? 0}
        onStartStep={onStartStep}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.ink, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <header style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid rgba(196,129,58,0.15)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.45)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.cream, flex: 1, letterSpacing: '-0.015em' }}>Guided Paths</div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 80px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ fontFamily: T.serif, fontSize: 15, color: 'rgba(253,248,240,0.42)', lineHeight: 1.75, marginBottom: 36 }}>
            Five conversations, in order. Each one building on the last. Pick the path that matches where you are.
          </p>

          {JOURNEYS.map((j) => {
            const stepsDone = progress[j.id] ?? 0;
            const pct = Math.round((stepsDone / j.steps.length) * 100);
            const inProgress = stepsDone > 0 && stepsDone < j.steps.length;
            const complete = stepsDone >= j.steps.length;

            return (
              <button
                key={j.id}
                onClick={() => setSelected(j.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${inProgress ? 'rgba(196,129,58,0.35)' : 'rgba(196,129,58,0.18)'}`,
                  borderRadius: 18, padding: '22px 22px', marginBottom: 14, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,129,58,0.09)'; e.currentTarget.style.borderColor = T.gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = inProgress ? 'rgba(196,129,58,0.35)' : 'rgba(196,129,58,0.18)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 24, marginBottom: 10 }}>{j.emoji}</div>
                    <div style={{ fontFamily: T.display, fontSize: 21, fontWeight: 600, color: T.cream, letterSpacing: '-0.015em', lineHeight: 1.2, marginBottom: 6 }}>{j.title}</div>
                    <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.42)', lineHeight: 1.55 }}>{j.description}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    {complete && <div style={{ fontSize: 12, color: T.gold, letterSpacing: 1 }}>✦ Done</div>}
                    {inProgress && <div style={{ fontSize: 12, color: T.gold, opacity: 0.8 }}>{stepsDone}/{j.steps.length}</div>}
                  </div>
                </div>

                {stepsDone > 0 && (
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: T.gold, opacity: 0.65 }} />
                  </div>
                )}

                <div style={{ fontSize: 11, color: 'rgba(253,248,240,0.25)', letterSpacing: 0.3 }}>
                  {j.steps.length} conversations · {j.steps.map((s) => s.title).join(' · ')}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
