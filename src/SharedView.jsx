import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { PERSON_TYPES } from './constants.js';
import GuestQuestion from './GuestQuestion.jsx';
import ShareSheet from './ShareSheet.jsx';

export default function SharedView({ shareId, onBegin }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('shared_conversations')
      .select('*')
      .eq('id', shareId)
      .single()
      .then(({ data: row, error: err }) => {
        if (err || !row) setError(true);
        else setData(row);
      });
  }, [shareId]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 12 }}>This link has expired.</div>
          <div style={{ fontSize: 14, color: 'rgba(253,248,240,0.4)', marginBottom: 28 }}>Shared conversations aren't stored forever.</div>
          <button onClick={onBegin} style={{ background: T.gold, color: T.cream, border: 'none', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Start your own →
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${T.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const person = PERSON_TYPES.find((p) => p.id === data.person_type);
  const messages = data.messages ?? [];

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      {/* Gold accent */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      {/* Header */}
      <header style={{ padding: '16px 24px', background: T.white, borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 500, color: T.ink, letterSpacing: '-0.025em' }}>kinwove</div>
          {person && (
            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{person.emoji} {person.label}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShareOpen(true)}
            title="Share this conversation"
            style={{
              background: 'transparent',
              color: T.inkSoft,
              border: `1px solid ${T.line}`,
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ↗ Share
          </button>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, border: `1px solid ${T.line}`, borderRadius: 999, padding: '4px 10px' }}>
            Shared conversation
          </div>
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 40px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {data.title && (
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 15, color: T.inkMuted, marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${T.line}` }}>
              "{data.title}"
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: m.role === 'user' ? '80%' : '100%',
                background: m.role === 'user' ? T.gold : 'transparent',
                color: m.role === 'user' ? T.cream : T.ink,
                padding: m.role === 'user' ? '12px 18px' : '4px 0',
                borderRadius: m.role === 'user' ? 18 : 0,
                fontFamily: m.role === 'user' ? T.sans : T.serif,
                fontSize: m.role === 'user' ? 15 : 17,
                lineHeight: m.role === 'user' ? 1.5 : 1.75,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: T.ink, padding: '48px 24px 56px' }}>
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(184,115,58,0.4), transparent)`, marginBottom: 40 }} />
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 8 }}>
            Ask your own question.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(253,248,240,0.45)', lineHeight: 1.7, marginBottom: 32 }}>
            No account needed. kinwove is for anyone honest enough to ask.
          </div>
          <GuestQuestion onSignUp={onBegin} />
        </div>
      </div>

      {shareOpen && (
        <ShareSheet
          body={data.title || 'A conversation about faith, doubt, and the Bible.'}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title="Share this conversation"
          intro="Read this thread on kinwove"
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
