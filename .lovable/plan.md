
# NutriFit – MVP Plan

This is a very large spec. To ship something solid rather than a shallow shell of everything, I'll build the MVP in one pass with the frontend + core data model, and defer payments/admin/AI to follow-up turns. You said not to gate tabs behind subscription yet — noted.

## In this build

**Design system**
- Brand palette from your logo: green `#2E9E3E`, orange `#F26A21`, near-black text, off-white bg.
- Poppins (headings) + Inter (body) via Google Fonts in `__root.tsx`.
- Tokens in `src/styles.css` (oklch). Import your uploaded logo via lovable-assets.
- Slogan "Your Health is Your Best Partner" in header/footer.

**Auth (Lovable Cloud)**
- Enable Cloud. Email/password signup + login. `profiles` table auto-created via trigger (name, avatar, bio, height, weight, goal weight, activity level).
- No social login yet (needs your Google/Facebook OAuth setup — ask later).
- No email verification block in preview (autoconfirm).

**Routes**
- `/` marketing landing (hero, features, pricing R49/mo, CTA).
- `/auth` login/signup.
- `/app` authenticated shell w/ bottom+side nav: Home, Workouts, Nutrition, Recipes, Community, Coach, Profile.
- `/app` (Home): greeting, today's activity cards, weight progress, streak, quick actions, quote, tip of the day.
- `/app/workouts`: browse + filter (category/difficulty/equipment), detail page with video player, exercise list, start/complete.
- `/app/nutrition`: daily log w/ macros progress, manual food + water logging.
- `/app/recipes`: browse, detail, "Add to nutrition log", favorites.
- `/app/community`: list of communities w/ location/date/time + "Join WhatsApp" external link button.
- `/app/coach`: chat UI backed by Lovable AI (`google/gemini-3.6-flash`) w/ disclaimer; 5/day cap for free users tracked in DB (but not enforced against paid since payments deferred).
- `/app/profile`: view/edit profile, weight history graph, achievements placeholder.

**Data model (migration w/ RLS + grants)**
- `profiles`, `workouts`, `exercises`, `workout_sessions`, `foods`, `food_logs`, `water_logs`, `weight_logs`, `recipes`, `recipe_favorites`, `communities`, `community_members`, `coach_messages`, `daily_quotes`, `tips`.
- Seeded with a handful of sample workouts, recipes, communities, quotes, tips via SQL INSERTs.

**AI Coach**
- Server function calling Lovable AI Gateway (`google/gemini-3.6-flash`), streaming, system prompt with mandatory disclaimer, conversation history from `coach_messages`.

**SEO**
- Per-route `head()` (unique titles/descriptions), `sitemap.xml`, `robots.txt`, `llms.txt`.

## Deferred (I'll do these when you ask)

- **Payments (Yoco/PayFast → Capitec)**: Requires your merchant account credentials. Lovable's built-in payments (Paddle/Stripe) don't route to a SA Capitec entrepreneur account directly; PayFast/Yoco are the right call but need API keys + a live callback URL. Ping me after this build with "set up PayFast" and I'll wire it in (subscription table, webhook route, gating middleware).
- **Subscription gating** on Community/Workout/Recipe tabs — you explicitly said hold off.
- **Social login (Google/Facebook)** — needs OAuth client IDs.
- **Admin dashboard** — separate build.
- **Gamification badges beyond schema stubs.**
- **Push/in-app notifications.**

## Technical notes

- TanStack Start (existing template), Tailwind v4, shadcn.
- All colors via CSS tokens — no hardcoded hex in components.
- Cloud (Supabase) for DB/auth; RLS + GRANTs on every table; `has_role` pattern reserved for later admin.
- AI Coach uses `createServerFn` (not edge fn).
- Video player: `<video>` tag w/ sample URLs seeded (you can swap in real HD sources later via admin/DB).

Sound good? Reply "go" and I'll build it, or tell me what to trim/expand.
