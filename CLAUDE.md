# kinwove — Claude Code handover

This file is the entry point for a new Claude Code session picking up work on
this project. Read it first, top to bottom.

---

## ⚠️ LOCKED — DO NOT CHANGE WITHOUT EXPLICIT INSTRUCTION

**KinwoveStar path:** `M12 1 L13.4 9.6 L22 11 L13.4 12.4 L12 23 L10.6 12.4 L2 11 L10.6 9.6 Z`
**KinwoveStar viewBox:** `0 0 24 24`
**KinwoveWordmark star container:** `width: '0.28em'`, `height: '0.28em'`, `top: '-0.72em'`

This star was approved and confirmed correct on 2026-05-26. Do not touch these values for any reason unless Daniel explicitly says "change the star." Do not infer from screenshots, do not "improve" it, do not adjust proportions.

**Star icon rule (locked 2026-05-26):** Never use the `✦` Unicode character as a visible UI icon. All star icons in JSX must use `<KinwoveStar size={N} />` from `src/components/brand/KinwoveStar.jsx`. The `✦` character is only acceptable inside plain strings (email HTML, prompts, non-rendered text). Do not revert this without explicit instruction.

---

## ⚠️ FIXED BUGS — DO NOT REVERT

These bugs were fixed on 2026-05-26 after painful debugging. Read before touching any of these areas.

### 1. Supabase `.catch()` is not a function
**Never** chain `.catch(() => {})` on a Supabase query builder. Use `.then(null, () => {})` or `await` with try/catch instead. The Supabase query builder is thenable but has no `.catch()` method — it will crash the app with a blank screen.

### 2. Profile table has NO `first_name` / `last_name` columns
The profiles table only has `display_name` (text). Profile.jsx splits `display_name` into `first_name`/`last_name` **in the UI only** for the form, then joins them back on save. Never query for `first_name` or `last_name` from Supabase — the columns don't exist and the query will 400.

The save logic: `display_name = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ')`

### 3. Profile Save button — correct disabled check
The profile edit form state has `first_name` and `last_name` keys, NOT `display_name`. The Save button must check:
```js
disabled={saving || !form.first_name.trim()}
```
Never check `!form.display_name` — it's undefined in the edit form state.

### 4. Pastor prompt `isFirstTime` check
The pastor onboarding prompt logic in App.jsx must check `!profile?.is_pastor`, NOT `!pastorChurchId`. Checking `!pastorChurchId` incorrectly blocks the prompt for users who have a church but whose church roles haven't loaded yet:
```js
const isFirstTime = profileEditOrigin === 'idle' && !pendingPastorApply && !profile?.is_pastor;
```

### 5. Invite code rotation — always use the server endpoint
`rotateCode()` in `PeoplePanel` (ChurchAdmin.jsx) uses `POST /api/church/rotate-invite-code` (service role, bypasses RLS). Never revert this to a direct Supabase `.update()` call — RLS will block it. The token must use `session?.access_token` first (prop), with `getSession()` as fallback:
```js
const token = session?.access_token ?? (await supabase.auth.getSession())?.data?.session?.access_token;
```

### 6. Invite code lookup — always use the server endpoint
`GET /api/church/by-invite-code?code=X` (service role). Never do a direct Supabase query for invite codes — RLS blocks it for non-members of non-public/pending churches.

### 7. Sermon composer — NOT a fixed overlay
The SermonComposer is rendered as the **Sermons tab** inside ChurchModeShell (`tab === 'sermons'` in ChurchAdmin.jsx), with `embedded={true}`. It is NOT a `position:fixed; inset:0; zIndex:300` overlay — that pattern was removed because it covered the sidebar (zIndex:100). Do not reintroduce the overlay. The tab is defined in ChurchModeShell.jsx TABS array (🎙 Sermons).

Entry points that open sermons must navigate to `church-admin` with `tab='sermons'`:
- `openSermonInComposer(id)` → `setTab('sermons')` (inside ChurchAdmin)
- `onNewSermon` callback from ChurchPage → `setPastorAdminInitialTab('sermons'); setStage('church-admin')`
- `stage === 'sermon-composer'` redirect in App.jsx → same as above

### 8. SermonAiNudge — only show when running low
`SermonAiNudge` in `PlanGate.jsx` must only render when remaining uses are low (≤10 for trial, ≤1 for free). Do not show the count when the user has plenty of uses. Do not add a persistent counter anywhere in the UI.

### 9. ChurchModeShell tabs (current, locked)
```
Overview | People | Ask | Bible | 🎙 Sermons | Settings
```
Sermons was added 2026-05-26. Do not remove it. `fullBleed` is only for the Bible tab.

### 10. Admin email branding
The DB trigger `notify_admin_pastor_application` in Supabase sends emails via Resend. It must use kinwove branding — subject line `kinwove — New pastor application: ...`, no ✦ in subject. If you see "The Way" anywhere in emails, the trigger needs to be re-run with the updated SQL (see scripts/).

### 11. Sermon discussion display names
`SermonDiscussion.jsx` only fetches `id, display_name` from profiles (no first_name/last_name columns). Fallback is `'Someone'`. The display_name is populated on profile creation from the wizard.

### 12. `stage === 'sermon-composer'` is effectively dead
This App.jsx stage now immediately redirects to `church-admin` with `pastorAdminInitialTab = 'sermons'`. Don't add new rendering logic to it.

### 13. Church post attribution — "by [person]" sub-line (ADDED 2026-05-26)
When `showAsChurch` is true (church-scoped post shown under the church name), the timestamp sub-line in `PostCard.jsx` shows `"1h · by [authorProfile.display_name]"`. This is the intended Facebook-groups-style attribution. Do not remove it.
```jsx
{showAsChurch && !item.is_anonymous && authorProfile?.display_name && (
  <> · by {authorProfile.display_name}</>
)}
```
`authorProfile` is passed from `authorMap` in `Feed.jsx` — non-anonymous author IDs are always hydrated. The Community.jsx inline PostCard does NOT use this (it only shows personal/public posts, no church scope).

### 14. FB-style comment modal (PostCard.jsx — ADDED 2026-05-26)
Comments open as a fixed overlay modal (zIndex: 400) with backdrop click to close. Do NOT revert to inline expansion. Sermon items (`item.source === 'sermon_item'`) render `<SermonDiscussion>` inside the modal; regular posts render `<Comments>`. The modal header shows `"{displayName}'s post"`.

### 15. Notification deep-link to comments (ADDED 2026-05-26)
`App.jsx` has `openCommentPostId` state. When a notification with `target_type='post'` or `type='post_comment'` is tapped, it sets `openCommentPostId = n.target_id` and navigates to feed. This is threaded through to `Community.jsx` and `Feed.jsx` as the `openCommentPostId` prop, then to each `PostCard` as `defaultCommentsOpen={openCommentPostId === item.id}`. Do not break this chain.

### 16. Reaction + comment counts (PostCard.jsx — ADDED 2026-05-26)
Reaction buttons show label AND count side by side. Comment button shows count next to the 💬 label. Do not hide counts or remove the label — both must show.
```jsx
<span>{kind.label}{count > 0 ? <span style={{ marginLeft: 3, opacity: 0.75 }}>{count}</span> : null}</span>
```

---

## 1. Who you're working with

**Daniel Kalawarny** (dkalawarny@hotmail.com).
- Recent convert to Christianity. The product is informed by his own journey
  from skeptic → seeker → believer.
- First-time founder. Not a developer — understands product well but needs
  **concrete, copy-pasteable next steps**. Hand him the exact command or SQL.
- Communicates in short, casual messages. Mirror that energy. Skip preamble.
- Move fast, ship rough, polish on round 2.
- **Don't ask permission for obvious cleanups** in a file you're already editing.
- **Do ask before:** schema changes, destructive git ops, spending money.
- "commit" → stage relevant files + commit. "push" → git push.

## 2. What kinwove is

Grace-first AI Bible study + Christian community app. **Was called "The Way"
until 2026-05-13** when we rebranded to **kinwove**.

- For believers, skeptics, and everyone in between.
- Three core pillars: **AI companion** (Claude-powered Bible/faith Q&A),
  **community** (feed, prayer wall, groups, sermons), **church directory**
  (pastor onboarding + congregation features).
- Aesthetic: **parchment + gold + serif**. Warm, editorial. Not a SaaS dashboard.
- Domain: **kinwove.com** (live). All on **Render** — server.js + built frontend
  both deploy from `main`. Push to main = deploy.

## 3. Stack

- **Frontend:** React 18 + Vite, no framework. Inline styles + `src/theme.js`
  tokens. No Tailwind.
- **Backend:** Express `server.js` — Anthropic proxy, Resend emails, pastor
  onboarding endpoints, rate limiting. All under `/api/*`.
- **DB / auth:** Supabase. Schema in `supabase-schema.sql` + dated migrations
  in `scripts/`. Apply migrations manually in the Supabase SQL editor.
- **AI:** Anthropic SDK, Claude Opus 4.7 (`claude-opus-4-7`). System prompts
  in `src/prompts.js`.
- **Brand:** `KinwoveWordmark` component (`src/components/brand/KinwoveWordmark.jsx`)
  — the proper logo (wordmark + SVG star above the "i"). `KinwoveStar` is the
  raw SVG star. Use these everywhere; never use the `✦` Unicode character as a
  logo substitute.

## 4. Codebase map — the files that matter

```
/server.js                    — Express API. Start here for any backend work.
/src/theme.js                 — ★ Design tokens. Start here for any visual work.
/src/prompts.js               — ★ AI system prompts. Tone/voice lives here.
/src/App.jsx                  — Root. Nav, routing (stage machine), session.
/src/Auth.jsx                 — Sign in / sign up / verify-email flow.
/src/Chat.jsx                 — Main AI conversation surface.
/src/Community.jsx            — Community feed. Has its OWN inline PostCard
                                component (~line 123–700). SEPARATE from
                                src/PostCard.jsx. Always edit Community.jsx's
                                PostCard for feed card changes.
/src/Feed.jsx                 — Feed data layer (query + hydration).
/src/PostCard.jsx             — PostCard used by ChurchPage feed (not Community).
/src/ChurchPage.jsx           — Public + pastor-own church page.
/src/ChurchAdmin.jsx          — Pastor dashboard (wrapped by ChurchModeShell).
                                PeoplePanel is defined inline here (~line 1156).
/src/ChurchModeShell.jsx      — Dark header shell with Leader/Visitor toggle
                                and Overview/People/Ask/Bible/Sermons/Settings tabs.
                                Accepts fullBleed={true} for Bible tab only.
/src/PastorApply.jsx          — Pastor application form (multi-step).
/src/BibleReader.jsx          — Scripture reader with AI sidebar.
                                Accepts topOffset={n} prop — when embedded in
                                ChurchAdmin, pass topOffset={145}.
/src/ChurchAiChat.jsx         — Pastoral AI chat tab inside ChurchAdmin.
/src/SermonComposer.jsx       — Sermon AI tool. Rendered embedded (tab) inside
                                ChurchAdmin — NOT as a standalone stage.
/src/SermonDiscussion.jsx     — Discussion threads on sermon daily questions.
/src/MessagesInbox.jsx        — DMs incl. "kinwove" system account.
/src/PlanGate.jsx             — Plan gates + SermonAiNudge (low-use warning only).
/src/components/brand/        — KinwoveWordmark.jsx + KinwoveStar.jsx
/supabase-schema.sql          — Full schema (source of truth).
/scripts/2026-*.sql           — Dated migrations. Newest date = latest.
```

## 5. Pastor onboarding — how it works (critical — read this)

The entire pastor application flow runs **server-side via service role key**.
Never add client-side Supabase calls to this flow — RLS will block them.

### Flow
1. `PastorApply.jsx` form submit → **`POST /api/church/apply`** (server upserts
   to `pastor_applications`, bypasses RLS)
2. Domain-match trigger may auto-approve instantly.
3. Otherwise: user goes to email verification step.
4. **`POST /api/church/submit-unverified`** — creates church row, church_roles
   row (is_owner=true), sets `profile.church_id` AND **`profile.is_pastor = true`**.
5. **`POST /api/church/verify-code`** — same as above, for email-verified path.
6. Self-reported path: "Continue without verifying" button → user manually confirms
   pastor status. Shows success screen with "Go to my dashboard →" button (no auto-dismiss).

### Existing pastors pre-2026-05-23 may need this SQL
```sql
update public.profiles set is_pastor = true
where church_id is not null and (is_pastor is null or is_pastor = false);
```

### `pastorChurchId` — three-layer fallback in `loadChurchRoles` (App.jsx)
1. `church_roles` table (RLS: requires `profile.church_id = church_roles.church_id`)
2. `churches.pastor_id` direct query ("Pastor reads their own church" policy)
3. **`GET /api/me/pastor-church`** — service role, always works regardless of RLS

### `isOwnChurch` (App.jsx church stage)
```js
const isOwnChurch = (pastorChurchId != null && pastorChurchId === viewingChurchId)
  || (profile?.is_pastor && profile?.church_id === viewingChurchId);
```
Second clause handles when `pastorChurchId` is still null on first load.

### `church-admin` stage render guard
```js
stage === 'church-admin' && session && (pastorChurchId || (profile?.is_pastor && profile?.church_id))
```
Uses `pastorChurchId || profile.church_id` as the churchId prop to ChurchAdmin.

### `onGoChurch` nav handler
Sends pastors (`pastorChurchId` set OR `profile.is_pastor=true`) directly to
`church-admin`. Members with `profile.church_id` go to the church page.

### ChurchModeShell (chromeless church page)
When `isOwnChurch=true`, ChurchPage is wrapped in ChurchModeShell showing
the "VIEWING AS LEADER · VISITOR" toggle + tabs.
- "Leader" toggle → `setStage('church-admin')`
- "Visitor" toggle → church public page (current view)
- Community action buttons (Talk to someone / Pray together / Pick a walk)
  are **only** in the `!chromeless` member view — NOT in the pastor's chromeless view.
- Revoke role buttons are hidden on the pastor's own account row.

### Account deletion (`DELETE /api/account`)
Server-side: clears `churches.pastor_id` and removes `church_roles` rows BEFORE
deleting the auth user, to avoid FK cascade ordering failures for church owners.

## 6. Community feed — important gotchas

### Community.jsx has its OWN PostCard
`Community.jsx` contains an inline PostCard component (~line 123–700).
`src/PostCard.jsx` is used by **ChurchPage only**. They are separate.
Always edit the right one.

### Feed scope: personal profile = `scope='me'` only
`Feed.jsx` `me` source query uses `.eq('scope', 'me')`. Church-scoped posts
never appear in the personal profile Posts tab even if the same user authored them.

### Sermon announcement guard (PostCard.jsx)
`isSermonAnnouncement = item.source === 'post' && !!item.body?.is_sermon_announcement`
Blocks delete/edit/hide menus even when `isOwn=true` (pastor is the author).

### Latest Sermon card (ChurchPage.jsx)
Only renders when `latestSermon` exists: `{isPastor && latestSermon && (...)}`.
No empty state shown.

## 7. Design tokens (theme.js)

```
T.gold      #B8733A    T.goldLight  #CC8D52    T.goldDark   #8E5528
T.cream     #F5EDD8    T.parchment  #FAF3E2    T.white      #FFFFFF
T.ink       #1A1108    T.inkSoft    #5A4733    T.inkMuted   #9C7B5E
T.line      rgba(26,17,8,0.12)
T.serif     'Fraunces, Georgia, serif'   (display headings)
T.display   'Newsreader, Georgia, serif' (editorial body text)
T.sans      system sans
T.honey     #D4A24A  (warm amber for stars/accents in dark headers)
```

Post cards: `background: T.parchment`, `border: 1px solid rgba(26,17,8,0.1)`,
`borderRadius: 14`. Body text: Newsreader 17px / lineHeight 1.55 /
`fontVariationSettings: '"opsz" 18'` (critical — without opsz it looks wrong).

## 8. Pending SQL migrations (run in Supabase SQL editor)

```sql
-- 1. Sermon discussion image uploads (posts fail without this column)
alter table public.sermon_discussions
  add column if not exists image_urls text[] default '{}';

-- 2. Rename system DM account display name
update public.profiles
  set display_name = 'kinwove'
  where email = 'system-theway@theway.internal';
```

**Don't rename** `system-theway@theway.internal` auth row — it's not a real
email, it's the trigger anchor for system DMs. Only the display_name changes.

## 9. Open punch list

### Domain + email (when kinwove.app acquired)
- [ ] Point DNS for kinwove.app to Render.
- [ ] Replace `theway.app` → `kinwove.app` in `index.html` (canonical, og:url,
      JSON-LD), `server.js` share links, `public/llms.txt`, `public/sw.js`,
      Plausible `data-domain`.
- [ ] Set `RESEND_FROM` env var on Render (`kinwove <hello@kinwove.app>`).
- [ ] Claim `@kinwove` or `@kinwoveapp` on Twitter, update `twitter:site`.
- [ ] `localStorage` keys (`theway:notes`, etc.) intentionally NOT renamed
      — would wipe existing users' local state.

### Supabase (must be done)
- [ ] Run the two pending SQL migrations above (sermon_discussions + kinwove DM display name).

### Remaining rough edges from 2026-05-24 audit
- Feed.jsx: load error shows empty feed instead of an error state (silent failure)
- ChurchPage.jsx: load error logged to console but no UI error state shown
- Some console.error() calls in Community/PostCard don't surface as toasts
  (post delete/edit/hide/report failures)
- BibleReader AI sidebar has no loading indicator when fetching explanations
- `PastorDashboard.jsx` SETUP_KEY still uses old `the-way:church-setup:${churchId}`
  localStorage key (intentionally not renamed to avoid breaking existing pastor setup state)

## 10. ChurchAdmin tabs

- **Overview** — PastorDashboard (sermon, stats, featured walk picker, care team)
- **People** — PeoplePanel (members, roles, invite code / "Invite your congregation")
- **Ask** — ChurchAiChat (pastoral theology AI, uses `text=` prop on MsgText — NOT `content=`)
- **Bible** — BibleReader (fullBleed mode, topOffset=145 for ChurchModeShell header)
- **Sermons** — SermonComposer embedded (added 2026-05-26, replaces fixed overlay)
- **Settings** — SettingsPanel (church profile, open join toggle, danger zone)
  - Featured Walk was **removed** from Settings (2026-05-24) — it lives in Overview only.

## 11. Tone + voice

- **Grace-first.** Never preachy. Never condescending to skeptics.
- **Honest about uncertainty.** When scripture is divided, say so.
- **No fake enthusiasm.** "Hey friend!" energy is wrong. Calm and adult.
- **Share copy:** must work for believer→believer AND believer→skeptic.

Read `src/prompts.js` for the full canonical AI tone.

## 12. Quick start for the next session

```bash
cd /Users/danielkalawarny/Desktop/kinwove
git log --oneline -5        # see recent commits
npm run dev                 # server: localhost:8787, web: localhost:5173
```

Latest commit as of 2026-05-26: `b5fbb9e` — church post attribution (show poster name under church name on feed cards).
Branch: `main`. Everything is committed and pushed.

Daniel also has a side project — **deconstructors.ca** (demolition company,
SEO/AI overhaul on 10web). Completely separate codebase — don't confuse the two.
