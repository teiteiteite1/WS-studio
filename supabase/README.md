# WS studio Insights

The owner dashboard at /analytics uses the existing Brief / AI30 Supabase account. Website activity and dated SNS measurements are persisted in Supabase, not browser-only snapshots.

## Shipped source
- /api/stats forwards the owner's JWT to the SECURITY INVOKER dashboard RPC. RLS restricts readings and edits to the registered owner.
- /api/track validates and sanitizes first-party activity. Anonymous clients have INSERT only on ws_activity; duplicate event IDs are acknowledged without needing SELECT permission.
- Public pages and management pages have separate scopes. HUB, Social Desk and Now Generating use public/ws-telemetry.js with their own site values and storage.
- Link events capture source, medium, campaign and content. Query strings, fragments and user-entered contact text are not stored. Music starts are recorded from audio playback.
- Per-SNS daily history distinguishes missing values from measured zero. Manual and API records coexist. Import validates real dates, nonnegative integers and duplicate rows; CSV exports escape formula prefixes.
- BASE visits, orders and revenue are separate daily records. An outbound click is never treated as an order.

## Current backend
The schema, owner authorization, encrypted Vault helpers, ws-insights-sync Edge Function and daily 06:10 JST cron are installed. A real Bluesky follower snapshot and successful sync are stored. Instagram / Threads / Pinterest need owner connection and follower-reading permissions. X / note / Suno use manual or CSV records.

The Edge Function uses verify_jwt=false because cron authenticates with a private Vault secret. It still authenticates every request: an owner JWT verified through Supabase Auth, or a constant-time checked cron secret. Provider tokens never enter source or logs.

sql/insights.sql is a reconciled, repeatable schema source for the existing WS studio database. sql/dashboard.sql is the dashboard RPC. sql/schedule.sql installs the named schedule without replacing its secret. migrations/20260905063018_ws_insights_social_desk_scope.sql records the applied scope addition. Existing visit and event tables are retained.

## Coordinated release
1. Release this branch to the official Vercel site. Confirm /analytics requires login and /ws-telemetry.js is available.
2. Apply sql/finalize_privacy.sql immediately with that release. It removes access to legacy public stats RPCs. This file is intentionally pending while the old frontend is live.
3. Publish the saved HUB, Social Desk and Now Generating changes at their existing URLs and audiences. They load the official telemetry asset; release the official site first.
4. In Insights → 接続・計測, select Social Deskから接続. The popup validates origin, nonce and opener before forwarding existing owner credentials; follower permissions are checked before encrypted persistence.
5. Historical values on the owner's original browser can be migrated from 記録. Unknown initial zeroes and metrics without a known period remain in the original browser record.

## Validation
npm run build
node --test tests/insights.test.mjs

Build, CSV/data validation, collector idempotency, private stats forwarding and database owner access were checked. The additional Sites builds succeeded. No browser QA was requested.

## Measurement boundaries
Identifiers are scoped to a browser and site. Cross-device and cross-site people are not deduplicated. All-site totals can therefore count the same person more than once. Existing legacy records lack sessions. New sessions expire after 30 minutes of inactivity. Referrer suppression may classify traffic as direct. Queued network retries are dated when the database receives them. Pre-instrumentation visits, blocked scripts and SNS-native views cannot be recovered. BASE needs its own tag installation for automatic on-shop pageviews; manual BASE records remain available.
