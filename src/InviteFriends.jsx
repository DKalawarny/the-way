import { useEffect, useMemo, useState } from 'react';
import { T } from './theme.js';

const DEFAULT_MESSAGE = 'Thought of you — kinwove is a place for the big questions: life, meaning, faith, doubt. Honest conversation, no pressure, no agenda. Wherever you\u2019re at.';

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function InviteFriends({ onClose, profile }) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasContactsApi, setHasContactsApi] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Build a tagged URL per channel so Plausible can show you exactly
  // which share method is driving sign-ups. Referral param ties the
  // sign-up back to the specific user who shared.
  const ref = profile?.id ? `&ref=${profile.id.slice(0, 8)}` : '';
  const taggedUrl = (source, medium = 'invite') =>
    `${origin}?utm_source=${source}&utm_medium=${medium}&utm_campaign=referral${ref}`;

  const url      = taggedUrl('invite', 'share'); // fallback / copy-link
  const fullText = `${message}\n\n${url}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasContactsApi('contacts' in navigator && 'ContactsManager' in window);
    setHasNativeShare(!!navigator.share);
  }, []);

  function openSMS(prefilledNumbers) {
    const recipients = prefilledNumbers ? prefilledNumbers.join(',') : '';
    const text = `${message}\n\n${taggedUrl('sms')}`;
    const body = encodeURIComponent(text);
    const sep = /iPhone|iPad/i.test(navigator.userAgent) ? '&' : '?';
    window.location.href = recipients
      ? `sms:${recipients}${sep}body=${body}`
      : `sms:${sep}body=${body}`;
  }

  async function pickContacts() {
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      const numbers = contacts
        .flatMap((c) => c.tel || [])
        .map((n) => n.replace(/[^\d+]/g, ''))
        .filter(Boolean);
      if (numbers.length) openSMS(numbers);
    } catch {
      // user cancelled or unsupported
    }
  }

  function openWhatsApp() {
    const text = `${message}\n\n${taggedUrl('whatsapp', 'social')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  function openMessenger() {
    navigator.clipboard?.writeText(fullText).catch(() => {});
    window.open('https://www.messenger.com/', '_blank');
  }

  function openFacebook() {
    const u = encodeURIComponent(taggedUrl('facebook', 'social'));
    const q = encodeURIComponent(message);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${q}`, '_blank', 'width=600,height=600');
  }

  function openLinkedIn() {
    const u = encodeURIComponent(taggedUrl('linkedin', 'social'));
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, '_blank', 'width=600,height=600');
  }

  function openX() {
    const t = encodeURIComponent(`${message}\n\n${taggedUrl('twitter', 'social')}`);
    window.open(`https://x.com/intent/tweet?text=${t}`, '_blank', 'width=600,height=600');
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: 'kinwove — AI Bible & Faith Community', text: message, url: taggedUrl('native', 'share') });
    } catch (e) {
      if (e.name !== 'AbortError') openEmail();
    }
  }

  function openEmail() {
    const subject = encodeURIComponent("Something I've been using — thought of you");
    const text = `${message}\n\n${taggedUrl('email')}`;
    const body = encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const validBulkEmails = useMemo(() => {
    return bulkText
      .split(/[,\n;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter(isValidEmail);
  }, [bulkText]);

  function sendBulkEmail() {
    if (!validBulkEmails.length) return;
    const subject = encodeURIComponent("Something I've been using — thought of you");
    const text = `${message}\n\n${taggedUrl('email-bulk')}`;
    const body = encodeURIComponent(text);
    const bcc = validBulkEmails.join(',');
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
  }

  const qrSrc = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=300&margin=2&dark=2C1810&light=FDF8F0`;

  const channels = [
    hasContactsApi && {
      id: 'contacts',
      icon: '👥',
      label: 'Pick from contacts',
      sub: 'Select friends, send via Messages',
      bg: '#34C759',
      onClick: pickContacts,
    },
    {
      id: 'sms',
      icon: '💌',
      label: 'Text Message',
      sub: 'Pick recipients in your Messages app',
      bg: '#34C759',
      onClick: () => openSMS(),
    },
    {
      id: 'whatsapp',
      icon: '🟢',
      label: 'WhatsApp',
      sub: 'Pick a contact in WhatsApp',
      bg: '#25D366',
      onClick: openWhatsApp,
    },
    {
      id: 'messenger',
      icon: '💬',
      label: 'Messenger',
      sub: 'Text is copied — paste it in Messenger',
      bg: '#0099FF',
      onClick: openMessenger,
    },
    {
      id: 'facebook',
      icon: '📘',
      label: 'Post to Facebook',
      sub: 'Share to your timeline or a group',
      bg: '#1877F2',
      onClick: openFacebook,
    },
    {
      id: 'x',
      icon: '𝕏',
      label: 'Post to X',
      sub: 'Share to your followers',
      bg: '#000000',
      onClick: openX,
    },
    {
      id: 'linkedin',
      icon: '🔷',
      label: 'Share on LinkedIn',
      sub: 'Great for pastors and faith leaders',
      bg: '#0A66C2',
      onClick: openLinkedIn,
    },
    {
      id: 'email',
      icon: '✉️',
      label: 'Email one person',
      sub: 'Opens your email app',
      bg: T.gold,
      onClick: openEmail,
    },
    {
      id: 'bulk',
      icon: '📨',
      label: 'Email a group',
      sub: 'Paste a list — sent BCC so addresses are private',
      bg: T.goldDark,
      onClick: () => setBulkOpen(true),
    },
    {
      id: 'qr',
      icon: '◫',
      label: 'QR code',
      sub: 'For sharing in person',
      bg: T.ink,
      onClick: () => setQrOpen(true),
    },
    hasNativeShare && {
      id: 'more',
      icon: '📱',
      label: 'More apps…',
      sub: 'AirDrop, system share',
      bg: T.gold,
      onClick: nativeShare,
    },
  ].filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />

      <header style={{
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: T.white, borderBottom: `1px solid ${T.line}`,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: T.inkSoft,
          fontSize: 14, cursor: 'pointer', padding: 0,
        }}>
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>
            Invite friends
          </div>
          <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 1 }}>
            Send to one — or to many at once
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 16px 80px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* Editable message */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase',
              color: T.inkMuted, marginBottom: 8,
            }}>
              Your message
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: T.white, border: `1px solid ${T.line}`,
                borderRadius: 14, padding: '14px 16px',
                fontSize: 14, color: T.ink, fontFamily: T.serif,
                lineHeight: 1.6, outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 6, fontSize: 11, color: T.inkMuted,
            }}>
              <span>The link to kinwove is added automatically</span>
              <button
                onClick={() => setMessage(DEFAULT_MESSAGE)}
                disabled={message === DEFAULT_MESSAGE}
                style={{
                  background: 'none', border: 'none', color: T.gold,
                  cursor: message === DEFAULT_MESSAGE ? 'default' : 'pointer',
                  fontSize: 11, opacity: message === DEFAULT_MESSAGE ? 0.4 : 1,
                  padding: 0,
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Channels */}
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase',
            color: T.inkMuted, marginBottom: 10,
          }}>
            Send via
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={c.onClick}
                style={{
                  width: '100%', textAlign: 'left',
                  background: T.white, border: `1px solid ${T.line}`,
                  borderRadius: 14, padding: '12px 14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                  fontFamily: 'inherit',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  transition: 'border-color 0.15s, transform 0.08s, background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.gold)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
                onTouchStart={(e) => (e.currentTarget.style.background = T.parchment)}
                onTouchEnd={(e) => (e.currentTarget.style.background = T.white)}
                onTouchCancel={(e) => (e.currentTarget.style.background = T.white)}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: c.bg, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  {c.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, lineHeight: 1.35 }}>
                    {c.sub}
                  </div>
                </div>
                <div style={{ color: T.inkMuted, fontSize: 18, paddingRight: 4 }}>›</div>
              </button>
            ))}

            <button
              onClick={copyLink}
              style={{
                width: '100%', textAlign: 'left',
                background: copied ? T.parchment : T.white,
                border: `1px solid ${copied ? T.goldLight : T.line}`,
                borderRadius: 14, padding: '12px 14px',
                cursor: copied ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
              disabled={copied}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: T.parchment, border: `1px solid ${T.line}`,
                color: T.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {copied ? '✅' : '🔗'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: copied ? T.goldDark : T.ink }}>
                  {copied ? 'Copied!' : 'Copy link & message'}
                </div>
                <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                  Paste anywhere — DMs, notes, group chats
                </div>
              </div>
            </button>
          </div>

          {/* Quiet note about FB */}
          <div style={{
            marginTop: 20, padding: '12px 14px',
            background: T.parchment, border: `1px dashed ${T.goldLight}`,
            borderRadius: 12, fontSize: 11, color: T.inkSoft, lineHeight: 1.6,
          }}>
            <strong style={{ color: T.ink }}>Why no auto-import of contacts?</strong> Facebook stopped letting apps read friend lists in 2018, and Gmail requires an annual security audit. The options above are how modern apps actually invite friends — pick recipients in their own app, paste a list, or share a link/QR.
          </div>
        </div>
      </div>

      {/* Bulk email modal */}
      {bulkOpen && (
        <div onClick={() => setBulkOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(20,12,8,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: T.white, borderRadius: 18,
            width: '100%', maxWidth: 480, padding: '20px 22px 22px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 6 }}>
              Email a group
            </div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14, lineHeight: 1.5 }}>
              Paste a list of email addresses. Separated by commas, spaces, or new lines. Sent BCC so addresses stay private.
            </div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'alex@example.com\njamie@example.com\nsam@example.com'}
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: T.parchment, border: `1px solid ${T.line}`,
                borderRadius: 12, padding: '12px 14px',
                fontSize: 13, color: T.ink, fontFamily: 'ui-monospace, monospace',
                lineHeight: 1.6, outline: 'none', marginBottom: 10,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
            />
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              {validBulkEmails.length === 0
                ? 'No valid emails yet'
                : `Ready to send to ${validBulkEmails.length} ${validBulkEmails.length === 1 ? 'address' : 'addresses'}`}
              {validBulkEmails.length > 50 && (
                <span style={{ color: T.error, display: 'block', marginTop: 4 }}>
                  Tip: many email apps cap BCC at ~50. Send in batches if needed.
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setBulkOpen(false)} style={{
                background: 'none', border: 'none', color: T.inkMuted,
                fontSize: 14, cursor: 'pointer', padding: '10px 14px',
              }}>
                Cancel
              </button>
              <button
                onClick={sendBulkEmail}
                disabled={!validBulkEmails.length}
                style={{
                  background: T.gold, color: T.cream, border: 'none',
                  borderRadius: 999, padding: '10px 22px',
                  fontSize: 13, fontWeight: 600,
                  cursor: validBulkEmails.length ? 'pointer' : 'default',
                  opacity: validBulkEmails.length ? 1 : 0.5,
                }}
              >
                Open email app
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR modal */}
      {qrOpen && (
        <div onClick={() => setQrOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(20,12,8,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: T.white, borderRadius: 20,
            width: '100%', maxWidth: 360, padding: '24px 24px 22px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 4 }}>
              Scan to open kinwove
            </div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 18 }}>
              Hand this to someone in person
            </div>
            <div style={{
              background: T.parchment, borderRadius: 14, padding: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <img
                src={qrSrc}
                alt="QR code linking to kinwove"
                style={{ width: 240, height: 240, display: 'block' }}
              />
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 16, wordBreak: 'break-all' }}>
              {url}
            </div>
            <button
              onClick={() => setQrOpen(false)}
              style={{
                background: T.ink, color: T.cream, border: 'none',
                borderRadius: 999, padding: '10px 28px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
