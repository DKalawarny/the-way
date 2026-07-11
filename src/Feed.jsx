import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import PostCard from './PostCard.jsx';
import SponsoredCard from './SponsoredCard.jsx';

const PAGE_SIZE = 20;

function parseSource(source) {
  // Forms: "me:<uid>", "church:<cid>", "group:<gid>"
  if (!source) return { scope: null, scopeId: null, authorId: null };
  const [scope, id] = String(source).split(':');
  if (scope === 'me')     return { scope: 'me',     scopeId: null, authorId: id ?? null };
  if (scope === 'church') return { scope: 'church', scopeId: id,   authorId: null };
  if (scope === 'group')  return { scope: 'group',  scopeId: id,   authorId: null };
  return { scope: null, scopeId: null, authorId: null };
}

export default function Feed({ source, sessionUserId, refreshKey = 0, emptyMessage, onOpenSermon, userPlan, blockedUserIds = [], isPastor = false, openCommentPostId, onViewProfile, onPickWalk }) {
  const { scope, scopeId, authorId } = parseSource(source);

  const [items, setItems]         = useState([]);
  const [sponsors, setSponsors]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [authorMap, setAuthorMap] = useState({});      // { uid: { display_name, avatar_config } }
  const [churchMap, setChurchMap] = useState({});      // { cid: { name, ... } }
  const [rolesByUser, setRolesByUser] = useState({});  // { uid: [role rows] } per visible church scope
  const [commentCounts, setCommentCounts] = useState({}); // { post_id: n }
  const [savedPostIds, setSavedPostIds] = useState(new Set());
  // Self-loaded blocked list — callers never passed the blockedUserIds prop,
  // so blocking silently did nothing in every Feed. Prop still wins if given.
  const [ownBlockedIds, setOwnBlockedIds] = useState([]);

  useEffect(() => {
    if (!sessionUserId) { setOwnBlockedIds([]); return; }
    supabase.from('blocked_users').select('blocked_id').eq('blocker_id', sessionUserId)
      .then(({ data }) => setOwnBlockedIds((data ?? []).map((r) => r.blocked_id)));
  }, [sessionUserId, refreshKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    let q = supabase
      .from('feed_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (scope === 'me' && authorId) {
      // Profile feed: only posts the user scoped to themselves (scope='me').
      // Church posts stay in the church feed, not the personal profile.
      q = q
        .eq('author_id', authorId)
        .eq('scope', 'me');
    } else if (scope === 'church' && scopeId) {
      q = q.eq('scope', 'church').eq('scope_id', scopeId);
    } else if (scope === 'group' && scopeId) {
      q = q.eq('scope', 'group').eq('scope_id', scopeId);
    }

    const { data, error } = await q;
    if (error) { setLoadError(true); setItems([]); setLoading(false); return; }
    const rows = data ?? [];
    setItems(rows);

    supabase.from('sponsored_posts').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setSponsors(data ?? []));

    // Hydrate author profiles + church names
    const authorIds = [...new Set(rows.filter((r) => !r.is_anonymous).map((r) => r.author_id).filter(Boolean))];
    const churchIds = [...new Set(rows.filter((r) => r.scope === 'church').map((r) => r.scope_id).filter(Boolean))];

    if (authorIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_config, avatar_url')
        .in('id', authorIds);
      const map = {};
      (profs ?? []).forEach((p) => { map[p.id] = p; });
      setAuthorMap(map);
    } else {
      setAuthorMap({});
    }

    if (churchIds.length) {
      const { data: churches } = await supabase
        .from('churches')
        .select('id, name, city, region')
        .in('id', churchIds);
      const map = {};
      (churches ?? []).forEach((c) => { map[c.id] = c; });
      setChurchMap(map);
    } else {
      setChurchMap({});
    }

    // Role badges — load every role row in the church scopes we're showing,
    // for the author ids we have. RLS restricts this to churches the viewer
    // belongs to; outside that, the query simply returns no rows.
    if (churchIds.length && authorIds.length) {
      const { data: roleRows } = await supabase
        .from('church_roles')
        .select('id, user_id, church_id, role_key, role_label')
        .in('church_id', churchIds)
        .in('user_id', authorIds);
      const map = {};
      (roleRows ?? []).forEach((r) => {
        (map[r.user_id] ||= []).push(r);
      });
      setRolesByUser(map);
    } else {
      setRolesByUser({});
    }

    // Comment counts (only for native posts).
    //
    // We read the denormalized `comment_count` column on posts rather than
    // count(*)-ing post_comments, because under the privacy gate
    // (scripts/2026-05-01-private-comments.sql) non-church-members can see
    // the post body but cannot read the comment rows themselves — a count
    // query would silently return 0 and the badge would lie. The posts row
    // is readable, and a trigger keeps the column in sync, so this gives
    // the same number to members and non-members alike.
    const postIds = rows.filter((r) => r.source === 'post').map((r) => r.id);
    if (postIds.length) {
      const { data: postRows } = await supabase
        .from('posts')
        .select('id, comment_count')
        .in('id', postIds);
      const counts = {};
      (postRows ?? []).forEach((p) => { counts[p.id] = p.comment_count ?? 0; });
      setCommentCounts(counts);
    } else {
      setCommentCounts({});
    }

    setLoading(false);
  }, [scope, scopeId, authorId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    if (!sessionUserId) return;
    supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', sessionUserId)
      .then(({ data }) => {
        setSavedPostIds(new Set((data ?? []).map((r) => r.post_id)));
      });
  }, [sessionUserId]);

  if (loading) {
    return (
      <div style={{ color: T.inkMuted, fontFamily: T.serif, textAlign: 'center', padding: 40 }}>
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{
        background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
        padding: '32px 20px', textAlign: 'center',
        color: T.inkMuted, fontFamily: T.serif, lineHeight: 1.65,
      }}>
        <div style={{ marginBottom: 10 }}>Couldn't load posts right now.</div>
        <button
          onClick={load}
          style={{ background: 'none', border: 'none', color: T.goldDark, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{
        background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
        padding: '32px 20px', textAlign: 'center',
        color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.65,
      }}>
        {emptyMessage ?? 'Nothing here yet.'}
      </div>
    );
  }

  const showAds = (userPlan === 'free' || !userPlan) && sponsors.length > 0;

  const effectiveBlocked = blockedUserIds.length ? blockedUserIds : ownBlockedIds;
  const visibleItems = effectiveBlocked.length
    ? items.filter((item) => !effectiveBlocked.includes(item.author_id))
    : items;

  if (visibleItems.length === 0) {
    return (
      <div style={{
        background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
        padding: '32px 20px', textAlign: 'center',
        color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', lineHeight: 1.65,
      }}>
        {emptyMessage ?? 'Nothing here yet.'}
      </div>
    );
  }

  return (
    <>
      {visibleItems.map((item, index) => {
        const card = (
            <PostCard
              key={`${item.source}:${item.id}`}
              item={item}
              authorProfile={authorMap[item.author_id]}
              authorRoles={rolesByUser[item.author_id]}
              churchInfo={churchMap[item.scope_id]}
              sessionUserId={sessionUserId}
              authorMap={authorMap}
              rolesByUser={rolesByUser}
              commentCount={commentCounts[item.id] ?? 0}
              onOpenSermon={onOpenSermon}
              onViewProfile={onViewProfile}
              onPickWalk={onPickWalk}
              isPastor={isPastor}
              defaultCommentsOpen={openCommentPostId === item.id}
              isSaved={savedPostIds.has(item.id)}
              onSaveToggle={async (postId, wasSaved) => {
                if (wasSaved) {
                  await supabase.from('saved_posts').delete().eq('user_id', sessionUserId).eq('post_id', postId);
                  setSavedPostIds((prev) => { const s = new Set(prev); s.delete(postId); return s; });
                } else {
                  await supabase.from('saved_posts').insert({ user_id: sessionUserId, post_id: postId });
                  setSavedPostIds((prev) => new Set([...prev, postId]));
                }
              }}
            />
          );

        // Inject a sponsored card after every 10th item (index 9, 19, 29…)
        if (showAds && (index + 1) % 10 === 0) {
          const sponsor = sponsors[Math.floor(index / 10) % sponsors.length];
          return (
            <div key={`${item.source}:${item.id}:wrapper`}>
              {card}
              <SponsoredCard key={`sponsored-${index}`} {...sponsor} />
            </div>
          );
        }

        return card;
      })}
    </>
  );
}
