# Make Webhook 分工與電腦同步指南

更新日期：2026-11-03

本文是 Doris 專案中 Make Webhook 的用途說明，以及電腦 1、電腦 2 的安全協作順序。它只記錄程式預期的介面與操作建議；不代表 Make 情境已完整設定、啟用或通過發布驗收。

## 先分清楚：送審和發布是兩個不同的 Webhook

| 流程 | 由誰觸發 | 網站環境變數 | Make 的工作 | 是否會發布 |
| --- | --- | --- | --- | --- |
| **送審／建立 Notion 紀錄** | 工作台保存並送審草稿 | `MAKE_THREADS_APPROVAL_WEBHOOK_URL`、`MAKE_THREADS_APPROVAL_API_KEY`；由 `MAKE_THREADS_SUBMISSIONS_ENABLED` 控制 | 收到草稿資料，依 `draft_id` 建立或更新 Notion 待審核資料，再回報收件結果 | **不會**。收到送審只代表資料已交給 Make／Notion |
| **核准後發布** | 使用者在工作台或 Notion 核准草稿 | `MAKE_SOCIAL_PUBLISH_WEBHOOK_URL`、`MAKE_SOCIAL_PUBLISH_API_KEY`；由 `MAKE_SOCIAL_PUBLISH_ENABLED` 控制 | 收到核准事件後先向網站 claim 草稿；只有 claim 成功才執行對應平台發布模組，然後回寫結果 | **會**。這是唯一負責執行社群發布的入口 |
| **定時派送**（獨立流程） | 排程器找到已核准且到期的草稿 | `MAKE_SOCIAL_SCHEDULER_ENABLED` 控制網站派送 | 只派送到期草稿；之後仍走發布 Webhook | 可能會，必須確認排程、claim 和發布流程已驗收 |

送審與發布的網址、API key 各自設定，不能互相填用。程式中的 `notion-intake`、`notion-approve`、`claim`、`publish-result` 是網站 API 路徑，不是 Make Webhook URL。

## 發布流程的安全順序

1. 工作台保存草稿並送審；送審 Webhook 只同步資料，不發文。
2. 使用者檢查文案、圖片與平台，明確核准。
3. 核准事件送到發布 Webhook。
4. Make 呼叫網站 `POST /api/social-drafts/claim`。沒有成功領取草稿就停止，不能呼叫社群發布模組。
5. Threads 或其他已完成設定的平台回報成功／失敗至 `POST /api/social-drafts/publish-result`。
6. 成功才記錄發布狀態、時間與貼文網址，並同步更新相同 `draft_id` 的 Notion 紀錄。Make 收到請求、容器建立或排程到期都不等於發布成功。

`MAKE_SOCIAL_CALLBACK_SECRET` 用於網站與 Make 間的回呼驗證；它不是送審或發布 Webhook 的 API key。各項密鑰、Webhook URL、Threads token 只放在 Vercel／Make 的密鑰欄位或各電腦自己的忽略檔中，不要寫入 GitHub、Notion 內容或聊天。

## 電腦 1 與電腦 2 的工作方式

目前以**電腦 1 為主要工作副本**。先在電腦 1 完成功能與文件修改，確認變更，再推送到 GitHub 分支供電腦 2 同步。

1. **電腦 1 先做**：開始前查看分支及工作目錄；保留未提交修改。完成一小批變更後檢視差異並提交／推送到同一個工作分支。
2. **電腦 2 再同步**：先確認工作目錄乾淨且沒有待保留的本機修改，再取得同一分支並只做 fast-forward 更新。若有本機修改或分支分歧，先停下檢查，不覆蓋、不重設、不強制推送。
3. **不要同時編輯同一份內容**：切換主要操作電腦前，先把當前電腦的修改推送，再讓另一台同步；完成後再反向交接。
4. **各電腦機密分開保存**：`.env.local`、登入狀態及本機快取不會隨 GitHub 同步。各台電腦各自設定所需的本機環境變數；不要複製或提交密鑰。Vercel／Make 的伺服器密鑰是託管設定，不是從某台電腦同步過去。
5. **暫不清理遠端分支**：先完成電腦 1 的初步設定與驗收，再確認電腦 2 已取得最新提交、工作目錄乾淨且沒有獨有修改。確認前不刪分支或舊情境。
6. **部署另行確認**：文件或程式推送不等於部署。先在預覽環境檢查；正式部署及真實社群發文須依各自的驗收流程處理。

## 建議整理順序

- 先把送審、發布、通知、排程各 Make 情境逐一對照用途及環境變數，標記「正式使用」「測試」「待確認」。
- 在電腦 1 驗證送審只建／更新 Notion 待審列。
- 再驗證核准後發布流程的 claim、平台回應與結果回寫。
- 確認排程與通知情境各自用途和狀態。
- 電腦 1 的初步功能整理完成後，再同步電腦 2。
- 最後才考慮刪除重複或測試情境；刪除前需確認沒有排程、連線或回呼仍依賴它。

## 相關文件

- [社群核准與發布交接](SOCIAL_APPROVAL_MAKE_SETUP.md)
- [社群工作流上線規劃](SOCIAL_AUTOMATION_ROLLOUT.md)
