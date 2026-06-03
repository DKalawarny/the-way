/**
 * GuestPostView — shown to non-members who tap a ?post= deep link.
 * Displays the post content read-only with a "Join kinwove" CTA.
 */
import { T } from './theme.js';
import { KinwoveWordmark } from './components/brand/KinwoveWordmark.jsx';
import { Avatar } from './ProfilePage.jsx';
import LinkPreview, { stripFirstUrl } from './LinkPreview.jsx';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function GuestPostView({ post, onSignUp, onSignIn, onBack }) {
  if (!post) return null;

  const author = post.profiles ?? {};
  const bodyData = post.body_data ?? {};
  const rawText = post.body ?? '';
  const isRepost = !!bodyData.repost_of;

  return (
    <div style={{
      minHeight: '100vh',
      background: T.cream,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 16px 48px',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        padding: '20px 0 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              position: 'absolute', left: 0,
              background: 'none', border: 'none',
              color: T.inkMuted, fontSize: 13, cursor: 'pointer',
              padding: '8px 4px',
            }}
          >
            ← Back
          </button>
        )}
        <KinwoveWordmark size={18} textColor={T.ink} starColor={T.honey} />
      </div>

      {/* Post card */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        background: T.parchment,
        border: `1px solid rgba(26,17,8,0.10)`,
        borderRadius: 14,
        padding: '16px 18px 14px',
        marginTop: 20,
      }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Avatar size={36} profile={author} />
          <div>
            <div style={{ fontFamily: T.sans, fontWeight: 600, fontSize: 14, color: T.ink }}>
              {author.display_name ?? 'kinwove member'}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 12, color: T.inkMuted, marginTop: 1 }}>
              {timeAgo(post.created_at)}
            </div>
          </div>
        </div>

        {/* Post body */}
        {isRepost ? (
          <div>
            {rawText ? (
              <div style={{
                fontFamily: T.display, fontSize: 16, lineHeight: 1.55, color: T.ink,
                fontVariationSettings: '"opsz" 18', marginBottom: 12,
              }}>
                {rawText}
              </div>
            ) : null}
            <div style={{
              border: `1px solid ${T.line}`, borderRadius: 10,
              padding: '12px 14px', background: T.cream,
            }}>
              {/* Repost author */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                fontFamily: T.sans, fontSize: 13, color: T.inkSoft, fontWeight: 600,
              }}>
                <Avatar size={24} profile={{ display_name: bodyData.repost_author_name }} />
                <span>{bodyData.repost_author_name ?? 'Someone'}</span>
              </div>
              {bodyData.repost_body && (
                <div style={{
                  fontFamily: T.display, fontSize: 15, lineHeight: 1.5, color: T.ink,
                  fontVariationSettings: '"opsz" 18', marginBottom: 8,
                }}>
                  {bodyData.repost_body}
                </div>
              )}
              {bodyData.repost_body && <LinkPreview text={bodyData.repost_body} />}
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              fontFamily: T.display, fontSize: 17, lineHeight: 1.55, color: T.ink,
              fontVariationSettings: '"opsz" 18', marginBottom: rawText ? 10 : 0,
            }}>
              {stripFirstUrl(rawText)}
            </div>
            <LinkPreview text={rawText} />
          </div>
        )}

        {/* Faded reactions teaser */}
        <div style={{
          borderTop: `1px solid ${T.line}`,
          marginTop: 14, paddingTop: 12,
          display: 'flex', gap: 8,
          opacity: 0.35, pointerEvents: 'none', userSelect: 'none',
        }}>
          {['❤️ Love', '🙏 Amen', '💡 Insightful'].map((r) => (
            <div key={r} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(26,17,8,0.06)', borderRadius: 999,
              padding: '6px 14px', fontSize: 13, fontFamily: T.sans, color: T.inkSoft,
            }}>
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        width: '100%', maxWidth: 600,
        marginTop: 28,
        background: T.parchment,
        border: `1px solid rgba(26,17,8,0.10)`,
        borderRadius: 14,
        padding: '24px 22px',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: T.serif, fontSize: 20, fontWeight: 600,
          color: T.ink, marginBottom: 8,
          letterSpacing: '-0.01em',
        }}>
          Join the conversation
        </div>
        <div style={{
          fontFamily: T.sans, fontSize: 14, color: T.inkSoft,
          lineHeight: 1.6, marginBottom: 22, maxWidth: 340, margin: '0 auto 22px',
        }}>
          React, comment, and share what moves you — kinwove is a free community for faith, questions, and real life.
        </div>

        <button
          onClick={onSignUp}
          style={{
            width: '100%', maxWidth: 320,
            background: T.ink, color: T.cream,
            border: 'none', borderRadius: 999,
            padding: '14px 28px', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', display: 'block', margin: '0 auto',
          }}
        >
          Create free account
        </button>

        <button
          onClick={onSignIn}
          style={{
            background: 'none', border: 'none',
            color: T.inkMuted, fontSize: 13, cursor: 'pointer',
            marginTop: 14, padding: '4px 8px',
          }}
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}
