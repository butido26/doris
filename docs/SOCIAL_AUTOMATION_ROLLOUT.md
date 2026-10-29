# 社群工作流上線規劃

## 希望達到的操作

Threads 是第一個完成的發布平台。工作台保存草稿後，Supabase 是唯一的工作狀態來源；Make 將草稿同步到 Notion 供查閱與核准。使用者可以在工作台或 Notion 核准同一筆草稿。核准後才交給 Make 發布，發布結果回寫 Supabase，並同步更新 Notion。網站保存或 AI 產文都不會自行發布。

## 狀態流程

`draft` → `awaiting_approval` → `approved` → `publishing` → `published` 或 `failed`。

- `draft`：只在工作台保存；若 Make 送審入口尚未啟用，仍可保存。
- `awaiting_approval`：Make 已確認收到送審資料，Notion 應有以 `draft_id` 去重的待核准列。
- `approved`：由工作台或 Notion 核准。核准動作會立即送出發布工作；未來排程時間目前不允許提前核准。
- `publishing`：Make 先呼叫 `claim` 原子領取，只有領取成功才可呼叫平台發布模組。
- `published` / `failed`：Make 回呼發布結果；成功後將平台貼文網址寫回 Supabase，並更新相同 `draft_id` 的 Notion 列。

## Make 情境設計

### 送審／Notion 紀錄

1. Custom Webhook 接收 `draft_id`、平台、文案、圖片網址及排程欄位。
2. 以 `draft_id` 搜尋 Notion；已存在就更新同一列，否則建立一列，避免重試時重複建列。
3. Notion 列需保留 `draft_id`、平台、文案、圖片網址、審核狀態、發布狀態、發布時間及貼文網址。
4. Make 確認收件後才回覆網站。Make 收件結果不代表貼文已發布。

### 核准後發布（第一階段只接 Threads）

1. Custom Webhook 接收 `approved_to_publish` 與 `draft_id`。
2. 呼叫網站 `POST /api/social-drafts/claim`，帶 `x-doris-automation-key`；未領取到 `publishing` 草稿就停止。
3. 依平台路由。Threads 文字／圖片發布需使用 Meta Threads API 的建立容器與發布步驟；圖片網址必須可由 Meta 公開讀取。
4. 成功後呼叫 `POST /api/social-drafts/publish-result` 回寫貼文 ID 和網址；失敗則回寫短錯誤原因。
5. 依 `draft_id` 更新 Notion 的發布狀態與網址。Notion 更新失敗時保留錯誤紀錄並重試同步，不能重發貼文。
6. Instagram route 維持停用，直到其授權和媒體發布流程獨立完成驗收。

## 安全與重複發布控制

- `MAKE_SOCIAL_PUBLISH_ENABLED` 保持 `false`，直到情境的 claim、Threads 發布、成功／失敗回呼與 Notion 更新都確認完成。
- Make 發布情境先用虛構 `draft_id` 測 webhook/資料欄位；此測試不得呼叫 Threads 發布端點。
- 真實測試只使用使用者審閱並明確核准的一筆測試文案；不得以 webhook 收到、容器建立或排程到期推定已發布。
- `MAKE_SOCIAL_PUBLISH_API_KEY`、`MAKE_SOCIAL_CALLBACK_SECRET`、Supabase service key、Threads token 僅存 Vercel／Make 的伺服器端密鑰欄位，不放前端、Notion、GitHub 或聊天。
- Make 重試需依 `draft_id` 與平台發布 ID 查重。遇到發布 API 逾時，先查平台狀態再重試，避免重複公開貼文。

## 排程與後續平台

目前 `scheduled_for` 只是草稿欄位，還沒有自動排程佇列；未來時間的草稿會被核准 API 擋下，避免提早發布。Threads 即時核准發布驗收完成後，再加 Vercel Cron／Make 排程佇列。Instagram、LINE、Facebook 分別驗證授權、媒體限制與回寫後再啟用。

## 尚待外部設定／驗收

- Make `Doris Social Publish Router`（情境 6806075）目前為 Inactive；現有成功紀錄不足以證明曾真正發布，需確認每個模組的用途與路由，再保持停用狀態補齊流程。
- Make 送審 webhook 與 Vercel 的 `MAKE_THREADS_APPROVAL_WEBHOOK_URL`、`MAKE_THREADS_APPROVAL_API_KEY`、`MAKE_THREADS_SUBMISSIONS_ENABLED` 必須對應同一個正式情境。
- 發布 webhook 與 `MAKE_SOCIAL_PUBLISH_*` / `MAKE_SOCIAL_CALLBACK_SECRET` 需對應發布情境；啟用前先確認 Supabase migration 已套用。
- 正式版必須含有工作台核准介面與 API，並且是從最新 `main` 整合，不可部署落後的功能分支覆蓋現行網站。
