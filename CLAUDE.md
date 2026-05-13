# kinwove — Claude Code handover

This file is the entry point for a new Claude Code session picking up work on
this project. Read it first. It captures who the user is, what we've built,
where the rebrand left things, and what the next-step punch list looks like.

---

## 1. Who you're working with

**Daniel Kalawarny** (dkalawarny@hotmail.com).
- Recent convert to Christianity. The product is informed by his own journey
  from skeptic → seeker → believer.
- First-time founder. He's not a developer by background — he understands
  product well, but he needs **concrete, copy-pasteable next steps**, not
  abstract architectural advice. When in doubt, hand him the exact command
  or SQL to run.
- Communicates in short, casual messages ("yah lets get this ready to launch",
  "ok", "crisp it all up"). Mirror that energy. Skip preamble, get to the point.

## 2. What kinwove is

Grace-first AI Bible study + Christian community app. **Was called "The Way"
until 2026-05-13** when we rebranded to **kinwove**.

- For believers, skeptics, and everyone in between.
- Three core pillars: **AI companion** (Claude-powered Bible/faith Q&A),
  **community** (feed, prayer wall, groups, sermons), **church directory**
  (pastor onboarding + congregation features).
- Aesthetic: **parchment + gold + serif**. Warm, editorial, slow-internet
  feel. Not a SaaS dashboard. Think well-printed devotional, not Slack.
- Domain currently live at **theway.app**. `kinwove.app` not yet acquired
  (see §7 — that's why all the URLs still say theway.app).

## 3. Stack

- **Frontend:** React 18 + Vite, no framework. JSX, lazy-loaded routes via
  `React.lazy + Suspense`. No Tailwind — inline styles + a `theme.js` token
  module (`T.gold`, `T.cream`, `T.ink`, etc.) and a `TYPE_TINTS` map for
  per-persona post colors.
- **Backend:** Express server (`server.js`) that proxies Anthropic + Resend.
  Auth, rate limiting, length caps, and stream cancellation are all on
  `/api/*`.
- **DB / auth / realtime / storage:** Supabase. Schema lives in
  `supabase-schema.sql` (single source of truth) plus dated migrations in
  `scripts/` (`scripts/2026-MM-DD-<topic>.sql`). Apply migrations manually
  in the Supabase SQL editor — no CLI runner is wired up.
- **AI:** Anthropic SDK, Claude Opus 4.7 (`claude-opus-4-7` — see
  `server.js`). System prompts live in `src/prompts.js`.
- **Analytics:** Plausible (privacy-first, no cookies, `data-domain="theway.app"`).
- **Hosting:** Static frontend on Vercel (`vercel.json`), server on Render
  (`render.yaml`).

## 4. Codebase map — the files that matter

```
/server.js                    — Express API. Anthropic proxy, Resend emails,
                                system DM creation, rate limiting.
/index.html                   — SEO/OG meta, JSON-LD, noscript SEO fallback.
/src/theme.js                 — ★ Design tokens. Start here for any visual work.
/src/prompts.js               — ★ AI system prompts. Tone/voice lives here.
/src/App.jsx                  — Root + Landing + nav + section colors.
/src/Auth.jsx                 — Sign in / sign up / verify-email flow.
/src/Chat.jsx                 — Main AI conversation surface.
/src/Feed.jsx, Community.jsx  — Community feed + post types.
/src/BibleReader.jsx          — Scripture reader with AI sidebar.
/src/MessagesInbox.jsx        — DMs incl. the "kinwove" system account.
/src/DMConversation.jsx       — Individual DM view.
/src/PastorDashboard.jsx,
 PastorApply.jsx,
 ChurchAdmin.jsx              — Pastor onboarding pillar (see §6).
/scripts/2026-*.sql           — Dated DB migrations. Newest = newest date.
/supabase-schema.sql          — Full schema (truth source).
/public/manifest.json,
 og-image.svg,
 llms.txt                     — PWA + crawler/AI-bot metadata.
```

## 5. What was just shipped — the kinwove rebrand (2026-05-13)

Everything below is **done and on disk** in the working tree. **Not yet
committed.** Branch is `main`, last commit `2e43cd1` ("Snapshot 3-day build
push: pastor onboarding, sermon thread, privacy gate").

### Visual

- **Gold palette shifted** from `#C4813A` (rgb 196,129,58) to **`#B8733A`**
  (rgb 184,115,58) — more amber/copper, less yellow. Proportional family:
  `T.gold #B8733A`, `T.goldLight #CC8D52`, `T.goldDark #8E5528`.
- All `rgba(196,129,58,...)` swept to `rgba(184,115,58,...)` across
  `src/`, `server.js`, `index.html`, `og-image.svg` (perl sweep).
- All literal `#C4813A` / `#9A6328` / `#D89B52` references replaced — none
  remain outside of `theme.js`. (Verify with
  `grep -r '#C4813A\|#9A6328\|#D89B52' src/`.)
- **Wordmark typography crisped:** Fraunces (not generic serif), weight
  **500** (not 600/700), letter-spacing **−0.02em** (or −0.025em on bigger
  surfaces). Bumped sizes 1–2pt. Done in nav, sticky verse bar, app
  sidebar, SharedView/StudySession headers, Chat header, Auth eyebrow,
  and og-image.svg (132px / 500 / −4 tracking).

### Strings

- **"The Way" → "kinwove"** everywhere user-facing: UI strings, page
  titles, share titles, AI prompts (`"You are kinwove..."` in `prompts.js`
  and `server.js`), system account `display_name`, Resend `from`,
  PWA manifest, og-image, llms.txt, JSON-LD, `package.json` name.

### Files added by the rebrand

- `scripts/2026-05-13-rename-system-account-to-kinwove.sql` — **must run
  in production after deploy** (see §7).

## 6. The pastor-onboarding pillar (background you may need)

Cheap path: pastors apply via `PastorApply.jsx`, the app sends Resend emails
to admin, admin approves manually via SQL in `scripts/approve-pastor-application.sql`
or by running `scripts/2026-05-01-pastor-application-notifications.sql`-style
helpers. **Manual SQL approval is deliberate** — Daniel wants a human in the
loop until volume justifies automation. Don't refactor this to be self-serve
without checking first.

Domain-matched pastors (e.g. `pastor@firstbaptist.org` matching a church row
with that domain) get auto-verified by a trigger. Everyone else lands in the
admin queue.

## 7. Open punch list — what's left for actual launch

These are **intentionally not touched** because they need real decisions or
external setup:

### Domain + email
- [ ] **Acquire `kinwove.app`** (or chosen kinwove domain).
- [ ] Point DNS to Vercel + Render.
- [ ] When live: search/replace `theway.app` → `kinwove.app` across
      `index.html` (canonical, og:url, JSON-LD `@id`), `server.js` share
      links, `public/llms.txt`, `public/.well-known/llms.txt`,
      `public/sw.js`, Plausible `data-domain` in `index.html`.
- [ ] Set up mailbox: `hello@kinwove.app`, `support@kinwove.app`. Update
      Resend `RESEND_FROM` env var and any hardcoded references.
- [ ] **Don't touch** `system-theway@theway.internal` — it's not a real
      email, it's the local-only auth row that owns system DMs. Renaming
      it breaks the trigger.
- [ ] Twitter handle `@thewayapp` in `twitter:site` (`index.html`) — claim
      `@kinwove` or `@kinwoveapp` first, then update.
- [ ] **localStorage keys** (`theway:notes`, `theway:convs`, `theway:dailyQ`,
      etc.) are intentionally NOT renamed — would wipe existing users'
      local state. Migrate only if you're OK losing those.

### Deploy-day must-runs
- [ ] Run `scripts/2026-05-13-rename-system-account-to-kinwove.sql` in
      Supabase SQL editor **after deploying the new client build**.
      `MessagesInbox.jsx` and `DMConversation.jsx` now match against
      `display_name = 'kinwove'`; the existing prod row is still `'The Way'`,
      so old DMs lose their system-account badge until this is run.
- [ ] Verify `RESEND_FROM` env var on Render is set (currently defaults
      to `kinwove <onboarding@resend.dev>` in `server.js` if unset —
      will work in a pinch but won't match your domain).

### In-progress at handover
- [ ] **Commit the rebrand work.** Working tree has 64 modified + many
      untracked files (see `git status`). Some untracked `.jsx` files
      (`AdminPage.jsx`, `HelpPage.jsx`, `MessagesInbox.jsx`, etc.) are
      **pre-rebrand feature work that was never committed** — they live
      on disk but weren't in the previous "3-day build push" snapshot.
      The rebrand touched all of them. Suggest committing as one
      `feat: rebrand "The Way" → "kinwove"` commit, **excluding**:
      - `Untitled.rtf`, `growth os api.rtf` (stray .rtf files at root)
- [ ] Production build verified clean: `npm run build` → no errors, no
      warnings (verified 2026-05-13 after fixing a duplicate `background`
      key in `HelpPage.jsx`).

## 8. Tone + voice conventions

Read `src/prompts.js` for the canonical AI tone. Short version:

- **Grace-first.** Never preachy. Never condescending to skeptics.
  Never dismissive of believers.
- **Honest about uncertainty.** When scripture is ambiguous or scholarship
  is divided, say so. Don't paper over.
- **Quote scripture by reference** (e.g. "Romans 8:28"), not by sermon.
- **No fake enthusiasm.** "Hey friend!" energy is wrong. Calm and adult.

For **invite/share copy** specifically (see `MEMORY.md` →
`feedback_invite_copy_tone.md`): default share text must work for **both**
believer→believer and believer→skeptic shares. Don't write "come worship
with me" energy as the default — it breaks for half the audience.

## 9. How Daniel likes to work

- Move fast, ship rough, polish on round 2. He'd rather see something live
  and broken than something perfect and unshipped.
- Concrete > abstract. If you say "you should add rate limiting," he wants
  the actual code or env var, not a thinkpiece.
- **Don't ask permission for obvious cleanups** while you're in a file. If
  the file has a duplicate key warning and you're editing it anyway, fix it.
- **Do ask before:** schema changes, anything destructive (force push,
  reset --hard, deleting files), spending money (new SaaS subscriptions,
  domain purchases, paid APIs).

## 10. Things to surface unprompted

If Daniel asks "what was on the list" or "what are the parked things," there
should be a `parked_followups.md` in his auto-memory at
`~/.claude/projects/-Users-danielkalawarny-Desktop-untitled-folder-2/memory/`.
Surface that without him having to ask twice.

He also has a side project — **deconstructors.ca**, a demolition company
site SEO/AI-findability overhaul on 10web. If he mentions deconstructors,
that's a different codebase entirely.

---

## 11. Quick start for the next session

```bash
cd "/Users/danielkalawarny/Desktop/untitled folder 2"
git status                    # see the uncommitted rebrand
npm run dev                   # starts server + vite concurrently
                              # server: localhost:8787, web: localhost:5173
```

To verify rebrand integrity:
```bash
grep -rn '#C4813A\|#9A6328\|#D89B52' src/   # should be empty
grep -rn 'rgba(196,\s*129,\s*58' src/        # should be empty
grep -rn 'The Way' src/                       # should be empty
```

If any of those return results, the rebrand has a hole — patch and re-verify.
