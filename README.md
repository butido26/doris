# Doris 的個人工作流網站

Next.js 網站，由 GitHub 保存程式碼、Vercel 部署、Supabase 管理登入與通知／社群草稿資料，Make 執行自動化流程。

## 目前功能

- 登入保護與個人工作台。
- 通知中心讀取 Supabase `notifications`；Make 通知以伺服器端密鑰寫入，網站登入者只能讀取自己的通知。
- Threads 社群工作頁：文字輸入、瀏覽器語音轉文字、手動編輯文案、圖片網址、預定時間欄位，以及個人草稿列表。
- OpenAI API 文案生成預留為伺服器端功能；AI 金鑰未設定時仍可使用手動編輯。
- 草稿不會自行送出、核准或發布。排程時間目前只是草稿資料，Make 核准／發布流程仍需串接。

## 必要設定

1. Supabase SQL Editor 執行 `supabase/migrations/202610220001_create_social_drafts.sql`，建立有個人資料隔離（RLS）的社群草稿表。
2. 若啟用 AI，在 Vercel Production 設定伺服器端 `OPENAI_API_KEY` 與 `OPENAI_MODEL`，不可使用 `NEXT_PUBLIC_` 前綴，也不可提交金鑰到 GitHub。OpenAI API 使用量可能另行計費。
3. 另行設定 Make Webhook 與核准／排程情境後，才能將網站草稿送往 Notion 核准並由 Make 依排程發布。

## 環境變數

複製 `.env.example` 作為本機欄位參考。真實設定只放在本機忽略檔或 Vercel 環境變數。Service role key、Make 密鑰與 AI API key 僅存於伺服器端環境變數。
