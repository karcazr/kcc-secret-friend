# KCC Secret Friend

An invitation-only monthly Manitto application for a Korean Culture Club. Next.js, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth, and Lucide. Student and organizer interfaces share a responsive design. All application copy is in English.

## Deployment status

The repository includes two deployment targets:

- **GitHub Pages:** static React frontend built from the same components, with Supabase Auth, database RPCs, and a Supabase Edge Function for secure assignment generation. Routes use hashes so refreshing a page works on Pages.
- **Vercel:** full Next.js application with server rendering, cookie authentication, and server actions.

**No Supabase project or credentials are included.** Until configured, the site shows the welcome/setup screen and an explicitly labeled fictional preview. Real registration, messages, and rounds require the setup below. The preview never writes to the database.

## Local development

Requirements: Node.js 22+, pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

For the Pages version:

```sh
# Put VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in web/.env.local.
pnpm dev:pages
```

The Vite root is `web/`; Next.js reads the root `.env.local`. Deployment builds take these values from environment variables. Only publishable keys belong in the browser. No service-role key is used by this application.

## Supabase setup

1. Create a dedicated Supabase project. Run `supabase/migrations/202610090001_initial.sql` in the SQL editor, or link the CLI project and run `supabase db push`.
2. Keep the exposed API schemas limited to Supabase defaults. **Do not expose `private` or add its tables to Realtime publications.** All tables use RLS with no direct client policies or grants. Only explicit, identity-checking RPCs are callable by authenticated users.
3. Enable email/password authentication, require email confirmation, and set minimum password length to 12. Keep anonymous sign-ins and unused providers disabled. Configure production SMTP and Auth rate limits before inviting students. The database signup trigger enforces single-use, email-bound invitations even if a client bypasses the frontend.
4. Set the Auth Site URL and allowed redirect URL to the actual deployment URL. For Pages use `https://karcazr.github.io/kcc-secret-friend/`. For Next.js also allow `https://YOUR-DOMAIN/auth/confirm`. The email confirmation template should use Supabase’s default `{{ .ConfirmationURL }}`. PKCE confirmation should be completed in the same browser where registration began.
5. Set the appropriate public project URL/key environment variables from `.env.example`. For Next.js, set `APP_URL` to the canonical origin without a trailing slash.

### Bootstrap the first organizer

There is intentionally no public “become admin” flow. As database owner, create a one-use invitation using your own email and a freshly generated random code of at least 24 random bytes (48 hexadecimal characters). Do not commit real invitations or emails.

```sql
insert into private.invitations(token_hash, email, expires_at)
values (
  encode(sha256(convert_to('REPLACE_WITH_RANDOM_CODE', 'UTF8')), 'hex'),
  'YOUR_ORGANIZER_EMAIL',
  now() + interval '1 day'
);
```

Register through the app using that email and code, confirm your email, and promote that verified account in the SQL editor:

```sql
update private.club_memberships
set status = 'approved'
where user_id = (select id from auth.users where email = 'YOUR_ORGANIZER_EMAIL');

insert into private.administrators(user_id)
select id from auth.users where email = 'YOUR_ORGANIZER_EMAIL';
```

The organizer can now create invitations in **Participants**. Invitations expire after seven days and require manual delivery; the application does not send invitation emails. New users remain pending until an organizer approves them. Organizer privileges are stored separately from editable profiles and metadata.

## GitHub Pages deployment

The `.github/workflows/pages.yml` workflow tests, typechecks, builds, and deploys on pushes to `main`.

1. In repository **Settings → Pages**, choose **GitHub Actions**.
2. Set repository **Actions variables** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. These are public configuration values; never substitute a service-role key.
3. Deploy the assignment Edge Function using the Supabase CLI:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set APP_ORIGIN=https://karcazr.github.io
supabase functions deploy generate-assignments
```

The function uses the caller’s JWT, verifies the user with Auth, checks administrator privileges through the database, and never returns assignment mappings. CORS is restricted to `APP_ORIGIN`. The function bundles the same assignment algorithm used by Next.js; it does not have a separate implementation. Keep JWT verification enabled in `supabase/config.toml`.

4. Rerun the workflow after setting variables. The published URL is `https://karcazr.github.io/kcc-secret-friend/`.

GitHub Pages cannot run Next.js server actions. The small `web/` adapter reuses the product components and connects directly to the authorized RPCs. Every rule is enforced by PostgreSQL, independent of browser checks. The static bundle contains no administrative credential or assignment generator.

## Vercel deployment

Import this repository into Vercel using the Next.js preset. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `APP_URL`. Run the migration, configure Auth redirects/SMTP, and bootstrap an organizer as above. `pnpm build` is the production build. The Supabase Edge Function is not needed for the Vercel target: generation runs inside a Next.js server action.

## Monthly operation

1. Create a round and choose a reveal time (admin date inputs explicitly use UTC).
2. Approve members and invite students. Each student explicitly joins the round. There is no automatic enrollment.
3. Close registration, then generate assignments. At least two participants are required.
4. Add or edit missions and publish announcements. Review reported notes when needed.
5. When ready, reveal the round. The planned date closes guessing but **does not automatically reveal identities**. The organizer’s reveal ends messaging, locks missions, and evaluates guesses.
6. Archive the completed round and open a new one. Students can still access their own historical rounds.

**Withdrawals:** before registration closes, a student can leave. During an active round, an organizer can withdraw a participant safely: keep their assignment edges, pause notes to/from them, and exclude them from participation actions. This is intentionally irreversible within the round. Removing membership also pauses their active relationships and prevents future access. Never delete an active participant row or reshuffle a running cycle. Reapproving membership does not undo an active withdrawal. Handle any social follow-up with the student outside the application.

## Security and scale

- Private schema tables have RLS and no client grants. Functions use a fixed empty search path and verify Auth IDs and current membership. No email directory is exposed.
- Inbox JSON projects only message ID, body, timestamp, and report status; no sender, recipient, assignment, or hidden metadata. No Realtime subscription is used.
- Messaging derives the recipient in PostgreSQL. Sender-scoped transaction locks enforce 15-second spacing and 10 messages per hour, including concurrent requests.
- Organizer pages expose only reported message content. The application never offers arbitrary message browsing.
- Generation reads a versioned roster. The commit takes the same event lock as lifecycle and roster changes, checks version/state, validates unique endpoints and exactly one cycle, inserts all pairs, and changes the round state in one transaction. Concurrent or repeated commits cannot partly overwrite a round.
- Participant count has **no application maximum**. Fisher–Yates uses a cryptographically secure random source. A linked-cycle repair avoids previous pairs in O(n) time and space for n ≥ 4. Two- and three-person rounds evaluate the available cycles and minimize unavoidable repeats. There is no random retry loop. The algorithm is tested with 100,000 participants.
- Roster context is returned as a JSON aggregate, avoiding PostgREST’s default row truncation. Practical limits are the deployment’s memory, request size, execution timeout, and PostgreSQL resources. Very large events may require larger function resources or a background worker; the application does not truncate rosters to fit.
- Participant lists use server-side, indexed name-prefix search, stable sorting, status filters, and 20-row pagination. This is a page size, not a participant limit. Mission, report, history, and inbox lists are also paginated. Offset pagination and exact counts can become slower at extreme depth; cursor pagination can be added if real usage warrants it.
- Future opt-out prevents new joins but does not silently withdraw an existing participant. Changing display names never changes assignment IDs.

## Verification

```sh
pnpm test:algorithm
pnpm test:security
pnpm typecheck
pnpm test
pnpm build
pnpm build:pages
```

Database tests execute the migration in PGlite (real PostgreSQL compiled to WASM) with Supabase-style `auth.uid()` and roles. They cover invitation enforcement, RLS/grants, pending members, admin restrictions, identity-safe responses, message routing, reports, rate limits, withdrawal, guessing/reveal, transaction rollback, duplicate generation, stale rosters, and pagination. PGlite tests do not replace a staging check against a hosted Supabase project, especially Auth email delivery, deployed Edge Function behavior, real concurrent connections, and infrastructure timeouts.

Before use with students, the club must decide its own safeguarding, retention, and account-deletion procedures and test a full round with test accounts in its configured deployment. No school-specific policy has been invented or silently configured.

## Source map

- `src/components/`: reusable student, organizer, form, and layout components.
- `src/lib/`: server actions, Supabase access, assignment algorithm, types.
- `src/app/`: Next.js routes.
- `web/`: GitHub Pages routing and Supabase browser adapter.
- `supabase/migrations/`: normalized schema, grants, authorization, and transactional operations.
- `supabase/functions/generate-assignments/`: server-side generation for Pages.
- `tests/`: assignment and database-boundary tests.

Implementation references: [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), and [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
