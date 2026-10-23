# Doris 的個人工作流網站

這是獨立的新網站專案，使用 Next.js，預計由 GitHub 保存程式碼、Vercel 部署網站、Supabase 管理登入與通知資料，Make 執行自動化流程。

## 目前版本

- 有首頁介面草稿：AI 助理入口、通知中心、工作流卡片。
- 通知中心已改為讀取 Supabase `notifications` 資料表；接收 Make 事件仍需完成資料庫與伺服器設定。
- Supabase 電子郵件／密碼登入程式已加入；需在 Supabase 建立 Doris 的登入帳號，並在 Vercel 設定 Supabase Project URL 與 Publishable key 才會啟用。
- Make 通知端點使用伺服器端 `SUPABASE_SERVICE_ROLE_KEY`、`MAKE_NOTIFICATION_SECRET`、`NOTIFICATION_OWNER_ID`。這些只設在 Vercel server environment，不得公開或提交。
- 不要把平台權杖或任何 `.env` 真實設定值放進 GitHub。

## 預計串接方式

1. Threads 新回覆由 Make 偵測。
2. Make 將通知資料送到網站後端並保存。
3. 網站顯示通知與「前往 Notion 核准」入口。
4. 核准仍在 Notion 完成；Make 偵測核准狀態後才執行後續動作。

## 設定檔

複製 `.env.example` 作為本機 `.env.local` 的欄位參考。真實設定值只應填入本機忽略檔或 Vercel 專案的環境變數，不要提交到版本庫。Service role key 只能放在伺服器端環境變數。

## 通知資料表

在 Supabase SQL Editor 執行 `supabase/migrations/202610210001_create_notifications.sql`。Make 以 `POST /api/notifications` 傳入通知，使用 `Authorization: Bearer <MAKE_NOTIFICATION_SECRET>`。網站登入帳號透過 RLS 只能讀取自己的通知。
