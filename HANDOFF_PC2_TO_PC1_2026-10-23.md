# Doris 電腦 2 → 電腦 1 交接筆記

更新日期：2026-10-23（台北時間）

## 目前進度

### Make 社群發文

- 使用 Make US2：`https://us2.make.com`，組織 ID `3233287`。
- 已儲存情境 `Instagram：Notion 核准後發佈`，情境 ID `6748523`。
- 流程已有 Notion 監看／取得資料、Instagram for Business 照片貼文，並在 Instagram 後新增 Facebook Pages 照片貼文模組。
- Facebook 模組選用粉專「豹特艾豆」，使用已存在的 Make 連線「Doris Instagram adoilov (Doris Hsieh)」。粉專清單成功載入。
- Facebook 照片網址映射：`get(4.Properties Value; "圖片網址.url")`。
- Facebook 貼文文案映射：`get(4.Properties Value; "文案內容.1.plain_text")`。
- 情境顯示每 15 分鐘排程，但目前為 **Inactive（停用）**。模組和整個情境已儲存；沒有執行情境、測試發布或真的發文。Meta 是否接受 Notion 目前的圖片網址尚未驗證。
- Instagram 與 Facebook 目前在同一條流程上依序執行：Instagram 成功後才接著 Facebook。
- 使用者要求 **LINE 先暫緩**。目前先整理 Instagram／Facebook；不要自行加 LINE、執行情境、開啟排程或發布。任何可能真的發文的測試，都先取得使用者明確同意。

### Doris 網站專案與本機環境

- 本次環境實際找到的專案路徑：`C:\Users\SKU5\Documents\doris`。舊交接檔提到 `repo-sync`，該路徑在本次環境中找不到，請電腦 1 以實際資料夾為準。
- Git 分支：`codex/workflow-handoff-sync`，追蹤 `origin/codex/workflow-handoff-sync`。
- 本次檢查的工作目錄狀態：
  - 已修改：`tsconfig.json`
  - 尚未追蹤：`AGENTS.md`、`next-env.d.ts`、`package-lock.json`
- 以上檔案仍只在這台電腦的工作目錄，尚未確認已提交或推到 GitHub。切換電腦前須先決定如何保存／同步；不可用 reset、clean 或覆蓋方式清掉它們。
- 為讓電腦 1 讀到交接內容，這份筆記會單獨新增到同一個 GitHub 分支；不會順便提交上述本機程式檔。筆記提交後，電腦 2 的本機分支會比遠端少這一個文件提交，先保存本機修改，再同步遠端更新。
- `AGENTS.md` 是 Next.js 開發工具產生的規則檔，提醒此專案使用 Next.js 16；改程式前先讀它，並依它指示查看本機 `node_modules/next/dist/docs/` 的相應文件。`next-env.d.ts` 也是 Next.js 產生的型別檔。
- 本機檢查結果：Node `v24.15.0`、npm `11.12.1`、`node_modules` 存在、`package-lock.json` 存在、`.env.example` 與 `.env.local` 存在。只確認 `.env.local` 存在，沒有把內容放入筆記；不可貼出、提交或複製其中的密鑰。
- 本次沒有重跑 build，也沒有在此交接作業中修改網站程式或部署網站。舊交接檔記載配色變更尚未部署；公開網站目前的部署版本仍請在 Vercel 核對，不要單靠舊筆記判定。
- Supabase 專案 ID：`omgnunmigmjhkjhprvcs`。確認環境變數時只核對變數名稱與環境範圍，不要揭露 key 值。`SUPABASE_SERVICE_ROLE_KEY`、`MAKE_NOTIFICATION_SECRET` 等只能留在安全的伺服器環境設定，不能進 Git 或交接文字。

## 電腦 1 接手時先做

1. 在 VS Code 開啟 `C:\Users\SKU5\Documents\doris`，先查看目前分支與工作目錄狀態。不要覆蓋、清理或重設 `tsconfig.json`、`AGENTS.md`、`next-env.d.ts`、`package-lock.json`。
2. 確認電腦 1 的專案是否也在 `codex/workflow-handoff-sync`，並比較本機與 GitHub 上的提交／差異。電腦 2 的上述未提交檔案不會因為切換 GitHub 分支自動出現在電腦 1；先決定由電腦 2 提交推送到此分支，或用其他安全方式傳遞，之後再接續。不要合併 `main`。
3. 先讀專案 `AGENTS.md`、`README.md`、`HANDOFF.md`。注意舊 `HANDOFF.md` 的平台順序是較早的計畫；以本筆記的最新狀態為準：LINE 暫緩，Make 內 IG／FB 模組已設但仍未驗證、情境停用。
4. 若要啟動本機網站，先確認 `.env.local` 只含必要且正確的本機值，並理解它可能連到共用 Supabase 專案；不要用真實資料做寫入測試。不要把 `.env.local` 傳到 GitHub。
5. 在 Vercel 核對目前 Production deployment 的提交與配色版本；本次沒有部署。先不要部署或改正式環境設定，除非使用者在電腦 1 明確要求。
6. Make 只檢視情境 `6748523` 的設定即可。保持停用，不按 Run／Run once，也不開啟排程；圖片網址及真實發文結果仍待使用者同意後測試。

## 可直接貼給電腦 1 的接手指令

```text
請接續 Doris 專案的電腦 2 工作，先讀取 DORIS_PC2_TO_PC1_HANDOFF_2026-10-23.md、專案 AGENTS.md、README.md 和 HANDOFF.md。

先檢查 C:\Users\SKU5\Documents\doris 的 Git 分支和工作目錄，保留所有現有修改。電腦 2 的狀態是分支 codex/workflow-handoff-sync，另有 tsconfig.json 修改，以及未追蹤的 AGENTS.md、next-env.d.ts、package-lock.json；先確認這些是否已同步，絕不可 reset、clean、覆蓋或合併 main。先回報差異，再處理安全同步。

Make US2 情境 6748523「Instagram：Notion 核准後發佈」已儲存；Notion → Instagram 照片貼文 → Facebook Pages 照片貼文，Facebook 粉專為「豹特艾豆」，圖片與文案映射已設定。情境目前 Inactive，沒有測試或發布。LINE 先暫緩。請保持情境停用，不按 Run／Run once、不發布、不啟用排程。

接著先安全核對 GitHub 分支、Vercel 部署版本、Supabase 設定是否完整；只檢查密鑰變數名稱，不揭露 key 值，也不要部署或修改正式環境。回報哪些電腦 2 的未提交檔案需要同步，再依我的後續指示繼續。
```

