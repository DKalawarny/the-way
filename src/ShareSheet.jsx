import { useEffect, useRef, useState } from 'react';
import { T } from './theme.js';

export default function ShareSheet({
  body,
  url,
  title,
  intro = '— shared on kinwove',
  previewBody,
  customActions = [],
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  const [messengerNote, setMessengerNote] = useState(false);
  const [actionDoneId, setActionDoneId] = useState(null);
  const [isTablet, setIsTablet] = useState(false);
  const [hasHover, setHasHover] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const dragRef = useRef(null);
  const sheetRef = useRef(null);
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const tabletMq = window.matchMedia('(min-width: 768px)');
    const hoverMq = window.matchMedia('(hover: hover)');
    const updateTablet = () => setIsTablet(tabletMq.matches);
    const updateHover = () => setHasHover(hoverMq.matches);
    updateTablet();
    updateHover();
    tabletMq.addEventListener('change', updateTablet);
    hoverMq.addEventListener('change', updateHover);
    return () => {
      tabletMq.removeEventListener('change', updateTablet);
      hoverMq.removeEventListener('change', updateHover);
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) { if (e.key === 'Escape') dismiss(); }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    if (dismissing) return;
    setDismissing(true);
    setMounted(false);
    setTimeout(onClose, 220);
  }

  const shareUrl = url ?? window.location.origin;
  const shareText = body ? `${body}\n\n${intro}` : intro;
  const fullText = `${shareText}\n${shareUrl}`;
  // SMS-specific text: omit the kinwove URL so iMessage shows the content's
  // own link preview (e.g. YouTube card) instead of the kinwove OG card.
  // If there's no body URL to show, fall back to the kinwove URL.
  const smsText = body ? shareText : fullText;
  const preview = previewBody ?? body ?? '';

  function handleFacebook() {
    const u = encodeURIComponent(shareUrl);
    const q = encodeURIComponent(shareText);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${q}`, '_blank', 'width=600,height=600');
    dismiss();
  }

  async function handleMessenger() {
    if (isMobile) {
      // Try Messenger app deep link — works on iOS & Android if Messenger is installed.
      // Copy text first so they can paste context if needed.
      try { await navigator.clipboard.writeText(fullText); } catch {}
      // iOS: fb-messenger://share/?link=URL
      // Android: intent scheme (falls through to browser if not installed)
      const deepLink = /android/i.test(navigator.userAgent)
        ? `intent://share/#Intent;scheme=fb-messenger;package=com.facebook.orca;S.android.intent.extra.TEXT=${encodeURIComponent(fullText)};end`
        : `fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`;
      window.location.href = deepLink;
      // If the app isn't installed the page stays — fall back gracefully after delay
      setTimeout(() => {
        setMessengerNote(true);
        setTimeout(dismiss, 900);
      }, 1200);
    } else {
      // Desktop: copy then open Messenger.com
      try { await navigator.clipboard.writeText(fullText); } catch {}
      setMessengerNote(true);
      setTimeout(() => {
        window.open('https://www.messenger.com/', '_blank');
        dismiss();
      }, 900);
    }
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
    dismiss();
  }

  async function handleSMS() {
    // Copy to clipboard first — reliable fallback if sms: body gets stripped.
    // Then open Messages with smsText (no kinwove URL appended) so iMessage
    // shows the content's own link preview (YouTube etc.) not the kinwove card.
    try { await navigator.clipboard.writeText(smsText); } catch {}
    const a = document.createElement('a');
    a.href = `sms:?&body=${encodeURIComponent(smsText)}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 200);
    dismiss();
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: title ?? 'kinwove', text: shareText, url: shareUrl });
      dismiss();
    } catch (e) {
      if (e.name !== 'AbortError') {
        window.open(`mailto:?subject=${encodeURIComponent(title ?? 'From kinwove')}&body=${encodeURIComponent(fullText)}`);
      }
    }
  }

  function handleEmail() {
    const subject = encodeURIComponent(title ?? "Thought you'd find this");
    const bodyParam = encodeURIComponent(fullText);
    window.open(`mailto:?subject=${subject}&body=${bodyParam}`);
    dismiss();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(dismiss, 900);
    } catch {}
  }

  async function runCustomAction(action) {
    await action.onClick();
    setActionDoneId(action.id ?? action.label);
    setTimeout(dismiss, 900);
  }

  function handleDragStart(e) {
    if (isTablet) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    dragRef.current = { startY: touch.clientY, startTime: Date.now(), lastY: touch.clientY };
  }

  function handleDragMove(e) {
    if (!dragRef.current || isTablet) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    const dy = touch.clientY - dragRef.current.startY;
    dragRef.current.lastY = touch.clientY;
    if (dy > 0) setDragY(dy);
  }

  function handleDragEnd() {
    if (!dragRef.current || isTablet) return;
    const dy = dragRef.current.lastY - dragRef.current.startY;
    const dt = Date.now() - dragRef.current.startTime;
    const velocity = dy / Math.max(dt, 1);
    dragRef.current = null;
    if (dy > 120 || velocity > 0.6) {
      dismiss();
    } else {
      setDragY(0);
    }
  }

  const externalApps = [
    { id: 'facebook', icon: '📘', label: 'Facebook', bg: '#1877F2', onClick: handleFacebook },
    { id: 'messenger', icon: '💬', label: messengerNote ? (isMobile ? 'Opening…' : 'Copied') : 'Messenger', bg: '#0099FF', onClick: handleMessenger, done: messengerNote },
    { id: 'whatsapp', icon: '🟢', label: 'WhatsApp', bg: '#25D366', onClick: handleWhatsApp },
    isMobile && { id: 'sms', icon: '💌', label: 'Text', bg: '#34C759', onClick: handleSMS },
    canNativeShare && { id: 'more', icon: '📱', label: 'More', bg: T.gold, onClick: handleNativeShare },
    !canNativeShare && { id: 'email', icon: '✉️', label: 'Email', bg: T.gold, onClick: handleEmail },
  ].filter(Boolean);

  const dragOffset = dismissing ? '100%' : (mounted ? `${dragY}px` : '100%');
  const sheetTransform = isTablet
    ? (mounted ? 'scale(1)' : 'scale(0.96)')
    : `translateY(${dragOffset})`;
  const isDragging = dragY > 0;
  const sheetTransition = isDragging
    ? 'none'
    : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
  const backdropOpacity = mounted
    ? Math.max(0, 1 - (dragY / 400))
    : 0;

  return (
    <>
      <style>{`
        .share-app-strip::-webkit-scrollbar { display: none; }
        .share-app-strip { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      <div
        onClick={dismiss}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Share'}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: `rgba(20,12,8,${0.55 * backdropOpacity})`,
          transition: 'background 0.18s ease',
          display: 'flex',
          alignItems: isTablet ? 'center' : 'flex-end',
          justifyContent: 'center',
          padding: isTablet ? 24 : 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          ref={sheetRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: T.white,
            borderRadius: isTablet ? 20 : '22px 22px 0 0',
            width: '100%',
            maxWidth: isTablet ? 480 : 520,
            paddingTop: 6,
            paddingLeft: 0,
            paddingRight: 0,
            paddingBottom: isTablet ? 18 : `calc(20px + env(safe-area-inset-bottom))`,
            boxShadow: isTablet
              ? '0 24px 60px rgba(0,0,0,0.25)'
              : '0 -8px 40px rgba(0,0,0,0.18)',
            maxHeight: isTablet ? '85vh' : '88dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transform: sheetTransform,
            transition: sheetTransition,
            willChange: 'transform',
          }}
        >
          {/* Drag handle (touch target for drag-to-dismiss) */}
          {!isTablet && (
            <div
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              onTouchCancel={handleDragEnd}
              style={{
                padding: '10px 0 6px',
                display: 'flex',
                justifyContent: 'center',
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <div style={{ width: 40, height: 5, borderRadius: 3, background: T.line }} />
            </div>
          )}

          {/* Title + preview */}
          <div style={{ padding: '4px 22px 0' }}>
            {title && (
              <div style={{
                fontFamily: T.display,
                fontSize: 18,
                fontWeight: 600,
                color: T.ink,
                textAlign: 'center',
                letterSpacing: '-0.015em',
                marginBottom: preview ? 8 : 14,
              }}>
                {title}
              </div>
            )}
            {preview && (
              <div style={{
                fontSize: 12,
                color: T.inkSoft,
                fontStyle: 'italic',
                textAlign: 'center',
                lineHeight: 1.5,
                marginBottom: 14,
              }}>
                "{preview.slice(0, 90)}{preview.length > 90 ? '…' : ''}"
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: '0 16px',
          }}>
            {/* In-app destinations (Repost / Group) */}
            {customActions.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {customActions.map((a) => {
                  const done = actionDoneId === (a.id ?? a.label);
                  return (
                    <button
                      key={a.id ?? a.label}
                      onClick={() => runCustomAction(a)}
                      disabled={done}
                      style={{
                        width: '100%',
                        minHeight: 56,
                        textAlign: 'left',
                        background: done ? T.parchment : T.white,
                        border: `1px solid ${done ? T.goldLight : T.line}`,
                        borderRadius: 14,
                        padding: '12px 16px',
                        marginBottom: 8,
                        cursor: done ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        fontFamily: 'inherit',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        userSelect: 'none',
                        transition: 'background 0.15s, border-color 0.15s, transform 0.08s',
                      }}
                      onMouseEnter={hasHover ? (e) => { if (!done) e.currentTarget.style.borderColor = T.gold; } : undefined}
                      onMouseLeave={hasHover ? (e) => { if (!done) e.currentTarget.style.borderColor = T.line; } : undefined}
                      onTouchStart={(e) => { if (!done) e.currentTarget.style.background = T.parchment; }}
                      onTouchEnd={(e) => { if (!done) e.currentTarget.style.background = T.white; }}
                      onTouchCancel={(e) => { if (!done) e.currentTarget.style.background = T.white; }}
                    >
                      <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>{a.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: done ? T.goldDark : T.ink, lineHeight: 1.3 }}>
                          {done ? `${a.doneLabel ?? 'Done'} ✓` : a.label}
                        </div>
                        {a.sub && <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.35, marginTop: 2 }}>{a.sub}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section label */}
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: T.inkMuted,
              padding: '6px 6px 10px',
            }}>
              Send to
            </div>

            {/* Horizontal app icon strip — like iOS/FB native share */}
            <div
              className="share-app-strip"
              style={{
                display: 'flex',
                gap: 14,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                padding: '2px 4px 14px',
                scrollSnapType: 'x proximity',
              }}
            >
              {externalApps.map((app) => (
                <button
                  key={app.id}
                  onClick={app.onClick}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    width: 64,
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                    scrollSnapAlign: 'start',
                  }}
                  onTouchStart={(e) => { e.currentTarget.firstChild.style.transform = 'scale(0.92)'; }}
                  onTouchEnd={(e) => { e.currentTarget.firstChild.style.transform = 'scale(1)'; }}
                  onTouchCancel={(e) => { e.currentTarget.firstChild.style.transform = 'scale(1)'; }}
                >
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: app.done ? T.parchment : app.bg,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    transition: 'transform 0.12s ease',
                    border: app.done ? `2px solid ${T.gold}` : 'none',
                  }}>
                    {app.icon}
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: T.ink,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}>
                    {app.label}
                  </div>
                </button>
              ))}
            </div>

            {/* Copy link — utility action */}
            <button
              onClick={handleCopy}
              disabled={copied}
              style={{
                width: '100%',
                minHeight: 52,
                background: copied ? T.parchment : T.white,
                border: `1px solid ${copied ? T.goldLight : T.line}`,
                borderRadius: 14,
                padding: '12px 16px',
                marginTop: 4,
                marginBottom: 8,
                cursor: copied ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={hasHover ? (e) => { if (!copied) e.currentTarget.style.borderColor = T.gold; } : undefined}
              onMouseLeave={hasHover ? (e) => { if (!copied) e.currentTarget.style.borderColor = T.line; } : undefined}
            >
              <div style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>
                {copied ? '✅' : '🔗'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: copied ? T.goldDark : T.ink }}>
                  {copied ? 'Copied!' : 'Copy message'}
                </div>
              </div>
            </button>
          </div>

          {/* Cancel — sticky bottom area */}
          <button
            onClick={dismiss}
            style={{
              margin: '6px 16px 0',
              minHeight: 50,
              background: T.parchment,
              border: 'none',
              borderRadius: 14,
              color: T.ink,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
