# WS studio Social Desk backend handoff

Updated: 2026-09-05

This file records the backend that is already deployed for Social Desk so future UI work does not need to rediscover or rebuild it.

## Deployed backend

Supabase project: `udjpqsmihauksbceaxww`

Edge Function:

`https://udjpqsmihauksbceaxww.supabase.co/functions/v1/ws-social-publisher`

Function name: `ws-social-publisher`

The function uses custom authentication because it accepts both an authenticated owner request and a private Cron request. Do not expose the Cron key in browser code.

## Database

### `public.ws_social_posts`

Stores one Social Desk draft / scheduled post. Important fields include:

- `id`
- `owner_id`
- `title`
- `media_path` or `media_url`
- `alt_text`
- `scheduled_at` (`timestamptz`; send UTC ISO strings from the UI after converting JST input)
- `status`: `draft`, `queued`, `processing`, `partial`, `published`, `failed`, `cancelled`
- `attempt_count`
- `last_error`
- `published_at`

### `public.ws_social_post_targets`

One row per SNS target. Supported `channel` values:

- `instagram`
- `threads`
- `pinterest`
- `bluesky`

Important fields:

- `post_id`
- `channel`
- `caption`
- `options`
- `status`
- `remote_post_id`
- `remote_url`
- `last_error`

Pinterest uses `options.board_id`. Optional Pinterest values include `options.title` and `options.link`.

### `public.ws_social_connections`

Publishing connection status, separate from the Insights follower-sync status. The UI should use this table/function response for Social Desk posting readiness.

### Storage

Private bucket: `social-desk-media`

Authenticated uploads must use a path beginning with the owner's Supabase user ID:

`<user-id>/<generated-file-name>`

The publisher creates a temporary signed URL server-side when posting. Do not make this bucket public.

## API actions

Send JSON by POST with the logged-in Supabase user's `Authorization: Bearer <JWT>` header.

### Read connection state

```json
{"action":"connections"}
```

### Read posts/history

```json
{"action":"list"}
```

### Create a draft or scheduled post

```json
{
  "action":"create",
  "title":"管理用タイトル",
  "media_path":"<user-id>/<file>",
  "alt_text":"画像説明",
  "scheduled_at":"2026-09-06T22:00:00.000Z",
  "status":"queued",
  "targets":[
    {"channel":"instagram","caption":"..."},
    {"channel":"threads","caption":"..."},
    {"channel":"bluesky","caption":"..."},
    {"channel":"pinterest","caption":"...","options":{"board_id":"..."}}
  ]
}
```

For draft-only storage, send `status: "draft"`. If a queued post omits `scheduled_at`, the backend treats it as immediate.

### Update

Same payload as create, with:

```json
{"action":"update","id":"<post-uuid>","...":"..."}
```

Published or actively processing posts cannot be edited.

### Publish immediately / retry

```json
{"action":"publish_now","id":"<post-uuid>"}
```

```json
{"action":"retry","id":"<post-uuid>"}
```

### Cancel

```json
{"action":"cancel","id":"<post-uuid>"}
```

### Connect SNS credentials

Instagram / Threads / Pinterest:

```json
{"action":"connect","channel":"instagram","token":"<access-token>"}
```

Replace channel as needed. Tokens are stored server-side in Supabase Vault and are never returned to the browser.

Bluesky:

```json
{
  "action":"connect",
  "channel":"bluesky",
  "identifier":"teiteiteite1.bsky.social",
  "app_password":"<Bluesky app password>"
}
```

### Disconnect

```json
{"action":"disconnect","channel":"instagram"}
```

## Automatic execution

Supabase Cron job: `ws-social-publisher-every-minute`

Schedule: every minute.

It invokes the Edge Function using a secret header stored in Supabase Vault. The browser must never receive this secret.

The publisher atomically claims due posts and prevents overlapping workers from processing the same post. Interrupted processing older than 15 minutes can be recovered. Transient provider failures back off and retry up to the job attempt limit; permanent auth/permission/content errors stop automatic retries and are shown in `last_error`.

## Provider behavior implemented

- Instagram: image container -> publish via Instagram Graph API.
- Threads: image container -> publish via Threads API.
- Pinterest: creates an image Pin. A board ID is required.
- Bluesky: creates a session with an app password, uploads the image blob, then creates an `app.bsky.feed.post` record. Bluesky image upload is limited to 1 MB, so the existing client-side image compression should be preserved.

## Security

- Social Desk tables have RLS enabled.
- Post rows are restricted to their owner.
- Storage objects are restricted to the owner's user-ID folder.
- Provider credentials and the Cron key are in Vault and cannot be selected by browser roles.
- The Edge Function checks the owner against `ws_insights_owners`.
- Anonymous calls are rejected.

## Verified on 2026-09-05

- The database migrations applied successfully.
- `ws-social-publisher` is ACTIVE.
- The one-minute Cron job is ACTIVE.
- A Cron-authenticated empty-queue execution returned HTTP 200 with `{ "ok": true, "results": [] }`.
- A request without owner authentication returned HTTP 401.
- A subsequent automatic Cron invocation also returned HTTP 200.

## Remaining UI work in the ChatGPT Site

The current `ws-social-desk.wsstudio.chatgpt.site` interface is not stored in this GitHub repository and cannot be edited from the normal GitHub connector. The next Site/Work pass should only wire the existing UI to this backend, not rebuild the backend.

Required UI wiring:

1. Upload the selected/compressed image to `social-desk-media/<user-id>/...`.
2. Replace local-only draft/schedule saving with the `create` / `update` actions above.
3. Load `connections` for the four posting-status badges.
4. Load `list` for scheduled posts, drafts, errors and published history.
5. Connect existing buttons to `publish_now`, `retry`, and `cancel`.
6. Wire the connection screen to `connect` / `disconnect`.
7. Pinterest board selection must supply `options.board_id`.
8. Keep JST in the UI, but send an ISO timestamp representing the exact instant to the backend.
9. Do not expose any service-role key, Vault secret or Cron key in the browser.
10. After wiring, perform one harmless end-to-end test per connected SNS and confirm `remote_post_id` / `remote_url` and history status.
