# WS studio INSIGHT — public activity

INSIGHT at `/analytics` is the owner's dashboard for Official Site, BASE and public SNS. It is not an internal-tool usage dashboard. The existing database, owner authentication, daily snapshots, imports, deduplication and sync function are retained.

## Scope and retained data
- `ws_activity`, legacy `ws_visits` / `ws_events`, SNS tables and shop snapshots are preserved. No historical rows are deleted.
- `ws_insights_activity` is a SECURITY INVOKER view filtering to public Official / BASE paths and destinations. HUB, Social Desk, analytics, Control, Brief, AI30, Counter and Now Generating are excluded. Their referrers are excluded too.
- The existing Vercel collector now uses a public-path beforeSend filter too; management visits and owner-excluded browser events are not sent.
- Browser collector, API validation and database INSERT policy reject private activity. Legacy inserts for management paths are ignored by triggers. The retired `ws-telemetry.js` is deliberately inert.
- Now Generating's task-added script and playback event were reverted to the original source. Do not deploy its former Insights version. Its URL, design, features and publication remain unchanged.
- Social Desk's credential bridge is retained; its publishing backend and authorization are unaffected.

## Reporting
Today / 7 days / 30 days / all time use JST. The existing period/source/campaign aggregations are extended with ordered public page transitions and verified same-session Official → BASE clicks, grouped by original source. A click is not a confirmed BASE arrival or order. Legacy pageviews have no recoverable session history.
Daily SNS observations are stored per channel/date/source. Weekly and monthly charts use the last real observation in each bucket and label its real date. Missing values are null, never invented zeroes. A recorded zero remains zero. The UI distinguishes pre-acquisition, unconnected API, manual and unavailable measurements.

## Acquisition
- Bluesky: public profile follower count, daily at 06:10 JST. Successful real snapshots verified for September 5 and 6, 2026 (1 follower each).
- Instagram / Threads: provider handlers implemented, awaiting Insights connection and adequate follower-reading permissions. Existing successful Social Desk publishing credentials are separate; posting success does not prove follower access.
- Pinterest: user-account API handler implemented, awaiting approved API access and a valid token.
- X / note / Suno: manual or dated CSV snapshots in this implementation; no paid integration added.
- BASE: dated visits/orders/revenue can be entered manually. `ws-base-telemetry.js` is prepared for the existing shop only; no tag has been installed on BASE. Without a tag, direct SNS → BASE arrival metrics remain unavailable.
- Native SNS impressions, unknown past followers, blocked tracking, cross-device identity and purchase attribution cannot be reconstructed.

## Owner setup after release
1. Open INSIGHT → 接続・計測 → Social Deskから接続. Sign in to Social Desk with the existing owner account if asked. Existing Instagram / Threads tokens are transferred to the encrypted Insights store only after validation.
2. If follower permissions are missing, reauthorize the corresponding provider with follower/insights read access. Do not share tokens in chat.
3. Alternatively, INSIGHT → 接続・計測 → 認証トークンで接続する: select Instagram, Threads or Pinterest; paste that provider's valid token into アクセストークン; choose 接続して確認. Pinterest requires approved account API access. Tokens are not displayed again.
4. X / note / unavailable SNS: INSIGHT → 記録 → SNSの実数を記録. Enter SNS, 記録日 and フォロワー, or import CSV using the downloadable header template. Leave unknown values blank.
5. BASE, after the official asset is released: in the existing BASE HTML theme editor, immediately before `</body>`, add `<script defer src="https://ws-studio-wheat.vercel.app/ws-base-telemetry.js"></script>`. Verify a real public visit. Do not install a new paid app without approval.
6. Use 動線 → 投稿用の計測リンク to add SNS/campaign/post identifiers to future public links.

## Database and release state
`sql/insights.sql` is the repeatable reconciled schema, ending with the authoritative public-only correction. `sql/public-scope.sql` contains the collection guards, `sql/dashboard.sql` the reused RPC. The CLI-generated `migrations/20260905215957_insights_public_activity_scope.sql` records the correction SQL applied through the database connector. Existing cron and Vault secrets are unchanged.

The corrected source is not yet released. Keep PR #1 as the same draft until owner-session UI verification and release checks finish. At official release, apply `sql/finalize_privacy.sql` to retire the old public stats RPCs immediately; it is intentionally pending because the old live frontend still depends on them. The new owner-only aggregate is already protected. Do not describe all historic RPC access as private until this finalization has run.

HUB / Social Desk source tags were removed without changing access policy. Their saved versions must match corrected source before a later authorized release. Never deploy the old Now Generating Insights version.

## Validation
- `node --test tests/insights.test.mjs`: CSV, null vs zero, dates, retries, API auth, private paths and targets, daily/weekly/monthly follower observations.
- `npm run build`: production Next build and type checks.
- Corrected Social Desk production build passed before source push.
- Live SQL rollback tests: owner RPC, denied anonymous/nonowner reads, denied internal inserts, internal history exclusion, public transition and source funnel. All fixture rows rolled back.
- Local HTTP: anonymous `/api/stats` returns 401; internal `/api/track` returns 400; `/analytics` serves successfully.
- Browser reached the corrected page but stayed at アカウントを確認しています in the supervised Next preview. Browser interaction and real owner-login QA remain blocked/unverified; do not release or call INSIGHT complete. SQL authorization tests do not substitute for a real owner sign-in.

Identifiers are browser/site scoped, not unique people across sites. Referrer suppression can classify visits as direct. Queued events use receipt time. No sample values are shipped.
