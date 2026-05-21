import { useState } from 'react';
import { T } from './theme.js';
import { INTAKE_QUESTIONS } from './constants.js';

export default function SeekingIntake({ personType, onComplete, onBack }) {
  const questions = INTAKE_QUESTIONS[personType] ?? [];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  if (questions.length === 0) {
    onComplete(null);
    return null;
  }

  const q = questions[step];
  const isLast = step === questions.length - 1;

  function pick(option) {
    const next = { ...answers, [q.id]: option };
    setAnswers(next);
    if (isLast) {
      const context = Object.entries(next)
        .map(([id, val]) => {
          const question = questions.find((qq) => qq.id === id);
          return question ? `${question.q}\n→ ${val}` : null;
        })
        .filter(Boolean)
        .join('\n\n');
      onComplete(context);
    } else {
      setStep(step + 1);
    }
  }

  const progress = ((step + 1) / questions.length) * 100;

  return (
    <div style={{ minHeight: '100vh', background: T.ink, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={step === 0 ? onBack : () => setStep(step - 1)}
          style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.4)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(253,248,240,0.3)', textTransform: 'uppercase' }}>
          {step + 1} of {questions.length}
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', margin: '0 28px' }}>
        <div style={{ height: '100%', background: T.gold, width: `${progress}%`, transition: 'width 0.4s ease', opacity: 0.7 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 28px 40px', maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: T.gold, textTransform: 'uppercase', marginBottom: 24, opacity: 0.7 }}>
          A few quick questions
        </div>
        <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(24px, 4vw, 36px)', color: T.cream, fontWeight: 600, lineHeight: 1.15, marginBottom: 40, letterSpacing: '-0.02em' }}>
          {q.q}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map((option) => (
            <button
              key={option}
              onClick={() => pick(option)}
              style={{
                textAlign: 'left', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(184,115,58,0.2)', borderRadius: 14,
                padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s ease',
                color: T.cream, fontFamily: T.serif, fontSize: 15, lineHeight: 1.5,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,115,58,0.1)'; e.currentTarget.style.borderColor = T.gold; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(184,115,58,0.2)'; }}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          onClick={() => pick('Prefer not to say')}
          style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.28)', fontSize: 13, cursor: 'pointer', marginTop: 24, padding: 0, textAlign: 'left' }}
        >
          Skip this question →
        </button>
      </div>
    </div>
  );
}
