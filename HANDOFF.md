# Doris 工作流網站｜專案交接摘要

最後更新：2026-10-23（台北時間）

## 專案位置與用途

- 本機專案資料夾：`repo-sync`
- GitHub 儲存庫：`butido26/doris`（目前分支：`main`）
- 網站網址：<https://doris-two.vercel.app>
- 網站使用 Next.js、Vercel 與 Supabase。目標是建立個人工作台，逐步整合社群發文、通知與其他工作流程。
- 目前最新已提交版本：`f3f8d35`（Add social draft assistant workspace）

## 已完成／已有的功能

- 建立並部署 Doris 工作流網站的基本介面。
- 加入 Supabase 登入保護與網站工作台頁面。
- 建立社群草稿工作區，可輸入文案、圖片網址與希望發布時間，並保存草稿。
- 已有 Threads 草稿及 Make／Notion 工作流的設定與測試經驗；Make 情境曾顯示執行錯誤，發文和回寫流程仍需確認，不應視為完全驗收完成。
- 使用者已決定社群平台處理順序：先 Instagram，再 LINE，最後 Facebook。
- 目前已在本機把網站配色調為明亮暖白、霧灰與森林綠，少量使用木質暖色；**這次配色尚未部署到公開網站**。

## 目前尚未提交的本機變更

檢查時位於 `main` 分支，工作目錄有以下未提交檔案。它們尚未同步到 GitHub，也不會自動出現在另一台電腦：

- 修改：`app/api/assistant/draft/route.ts`
- 修改：`app/api/social-drafts/route.ts`
- 修改：`app/globals.css`（含配色調整）
- 修改：`app/social/page.tsx`
- 修改：`app/social/social-workspace.tsx`
- 新增：`app/api/social-drafts/make-schema-test/`
- 新增：`app/api/social-drafts/submit/`
- 新增：`supabase/migrations/202610220002_expand_social_draft_platforms.sql`
- 未追蹤：`.npm-cache/`（本機套件快取，不應當作網站功能提交）

目前這些變更的功能與部署狀態尚未逐項驗證。不要直接把整個工作目錄推送或部署；先檢查差異、確認哪些是預期功能，再排除快取與機密資料。

## 下一步建議

1. 先整理目前尚未提交的變更，確認社群草稿、平台選擇及 Make 提交流程各自的用途與完成度。
2. 確認資料庫遷移與 API 權限設定符合預期，再檢查必要的環境變數名稱是否存在；不要把密鑰寫進程式碼、交接檔或 GitHub。
3. 驗證現有程式可正常建置，再做安全的預覽部署；確認網站外觀與社群草稿流程後，才更新正式網站。
4. 按照使用者指定順序完成 Instagram，接著 LINE，最後 Facebook；每個平台都先確認授權、測試流程及審核／發佈規則。
5. 回頭確認 Threads 的 Make 情境錯誤、通知與發佈回寫；未完成前不要把自動發文或回覆通知標示為可用。

## 換電腦接續方式

- 使用同一個 ChatGPT 帳號可以接續查看聊天紀錄，但不會自動同步這台電腦的專案檔案、未提交變更、登入狀態或本機環境。
- 目前這份交接檔也在本機專案資料夾。要讓另一台電腦取得它與上述未提交工作，需先整理變更並安全提交、推送到 GitHub；這份交接摘要本身尚未上傳。
- 到新電腦安裝 Git 與 Codex／ChatGPT 桌面版後，登入 GitHub，取得 `butido26/doris` 儲存庫，再開啟本檔及專案內的 `README.md` 接手。
- 若新電腦上已經有另一份專案，先不要覆蓋；確認 GitHub 與兩台電腦的變更狀態後再同步，避免遺失未提交內容。
- `.env`、Supabase service-role key、OpenAI API key、Make／社群存取權杖等機密，應在新電腦或託管服務的安全設定中重新設定；**不要放進 GitHub 或本交接檔**。

## 重要限制

這份文件是目前進度的交接備忘錄，不代表未提交功能已完成、測試通過或已部署。請以 Git 狀態、程式差異、Vercel 部署與 Supabase／Make 的實際設定為準。
