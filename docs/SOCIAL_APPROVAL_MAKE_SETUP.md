# Social approval and publishing handoff

This contract lets the workbench and a Notion-triggered Make scenario approve the same Supabase draft. It does not publish until `MAKE_SOCIAL_PUBLISH_ENABLED=true` and the Make publishing scenario is fully configured.

## State flow

`draft` or `awaiting_approval` → `approved` → `publishing` → `published` or `failed`.

The conditional status updates are the duplicate-post guard. Make must call `claim` before using any social-platform publishing module. A claim that does not return a draft is a stop condition; do not publish.

## Workbench approval

The user clicks **核准並發佈** on a Threads or Instagram draft. The website changes its state to `approved` and calls the configured Make publish webhook with:

```json
{"event":"approved_to_publish","draft_id":"<uuid>","approved_via":"workbench"}
```

## Notion as a command and approval surface

1. When a user creates or edits an eligible Notion row, Make calls `POST /api/social-drafts/notion-intake` with `x-doris-automation-key: <MAKE_SOCIAL_CALLBACK_SECRET>` and the following JSON fields: `notion_page_id`, `platform` (`Threads` or `Instagram`), `content`, optional `image_url`, optional `scheduled_for`, and optional `approval_status` (`draft` or `awaiting_approval`). The response contains `draft_id`; write this ID back to a Notion property so later approval can identify the same draft.
2. When the Notion approval property changes to approved, Make calls `POST /api/social-drafts/notion-approve` with the same header and `{ "draft_id": "<uuid>" }` (or `{ "notion_page_id": "<page id>" }`). This uses the same conditional approval and publishing path as the workbench.
3. If the record is updated after it is already approved, publishing, or published, stop and do not overwrite it through `notion-intake`.

## Make publishing scenario

The custom webhook receives the `approved_to_publish` event. It must then call `POST /api/social-drafts/claim` with the callback header and `{ "draft_id": "<uuid>" }`. Publish only the returned draft. Route by `platform`; do not connect unrelated platforms in series. For Instagram, require the image URL. After the platform module completes, call `POST /api/social-drafts/publish-result` with the callback header and one of:

```json
{"draft_id":"<uuid>","result":"published","platform_post_id":"<platform id>","published_url":"https://..."}
```

```json
{"draft_id":"<uuid>","result":"failed","error":"<short error>"}
```

After the result callback succeeds, search Notion by the `draft_id` property and update its publishing status and public URL; create a record if none exists. Never infer success from a queued request—only set `published` after the platform module confirms success.

## Server environment variables

- `MAKE_SOCIAL_PUBLISH_ENABLED` — keep `false` until the Make modules and result callbacks are tested without publishing.
- `MAKE_SOCIAL_PUBLISH_WEBHOOK_URL` and `MAKE_SOCIAL_PUBLISH_API_KEY` — Vercel to Make.
- `MAKE_SOCIAL_CALLBACK_SECRET` — shared only between Vercel and Make for authenticated intake, approval, claim, and result callbacks.
- `SUPABASE_SERVICE_ROLE_KEY` and `NOTIFICATION_OWNER_ID` — server-only values already used by this project.

Never put these values in a browser field, Git, a Notion cell, or chat. Do not execute real publish actions during setup.

## Scheduling

Future `scheduled_for` values are intentionally blocked from approval until a Make scheduling queue is configured. This prevents a scheduled draft from being published early.
