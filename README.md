# 同頻｜二選一共同點遊戲

透過同一主題的二選一問答，讓兩位玩家發現共同點。雙方各自回答每一題，完成後才揭曉答案。

## 原型目前包含

- 選擇旅行、音樂、日常或飲食主題，也可以隨機選題。
- 使用一次性的暱稱進入示範配對，不需要註冊。
- 具備 Supabase Auth client、邀請房、隨機配對、真人雙人答題、歷史查詢和共同點統計的前端接線；有 Supabase 專案設定時走真人 RPC，沒有設定時保留明確標示的本機示範。
- 真人對局提供檢舉及封鎖入口，歷史頁可管理封鎖清單；隱私說明列出資料用途和保存期限。此原型尚無人工審查人員，檢舉不代表即時有人處理。
- 完成五題二選一，逐題揭曉雙方答案並查看共同選擇。
- 匯出 1080×1920 結果分享卡；可呼叫系統分享面板或下載 PNG。Instagram 交接仍需用實機確認。
- 可在手機與桌面瀏覽器操作。

目前工作區沒有 Supabase 專案 URL／公開 key，因此登入與真人服務入口停用，使用者只能玩本機示範。`supabase/migrations/` 有九份資料庫 migration；13 項 Deno/PGlite 回歸測試及 PostgreSQL 16 多連線競態測試已在 GitHub Actions run 1 的 `verify` 與 `block_race` jobs 通過，涵蓋審查權限和領案競速。該 run 的 deploy job 因新 repo 尚未啟用 Pages 而失敗，workflow 已加入 Pages 自動啟用設定，等待重跑。這些檢查不代表 Supabase 線上設定、Realtime、RLS、Edge Function 或跨裝置流程已驗證。

## Supabase Auth 設定

`site/supabase-config.js` 是公開用戶端設定範本。建立 Supabase 專案後，填入 project URL 和 anon／publishable key，並在 Dashboard 啟用 Anonymous Auth 及已完成設定的 provider：

- `google`、`facebook`、`x` 設為 `true` 後，分別使用 Supabase 內建 provider；程式將 X 對應至 Supabase 的 `twitter` provider ID。
- `instagram`、`threads` 填入 Supabase custom provider 的完整識別碼，例如 `custom:instagram`、`custom:threads`。只有在 Meta app 資格、審核與 Supabase custom OAuth 設定完成後才啟用。
- 在 Supabase Auth URL Configuration 加入本機 HTTP 預覽網址和正式 GitHub Pages 網址，provider callback 則使用 Supabase Dashboard 顯示的 callback URL。OAuth 不支援直接從 `file://` 開啟。

設定完成後的 `providers` 形式如下；只將已在 Supabase Auth 設定完成的 provider 打開：

```js
providers: {
  google: true,
  facebook: true,
  x: true,
  instagram: "custom:instagram",
  threads: "custom:threads"
}
```

瀏覽器以 Supabase JS v2.119.2 初始化匿名登入、OAuth、session 恢復及匿名帳號的 identity linking；CDN 檔案使用 SRI 固定完整性。未設定 URL／key 或 SDK 無法載入時，登入入口維持停用，示範流程仍可使用。配對、歷史及統計 RPC 已接入前端，但因尚無 Supabase 專案設定，真人登入和線上資料尚未驗證。anon／publishable key 是公開用戶端設定；service role key 和各 provider client secret 僅能留在 Supabase 後端設定。

匿名帳號連結前，需在 Supabase Auth 設定中啟用 **Manual Linking**。OAuth redirect allow list 必須包含實際網站子路徑；本機應透過 HTTP localhost 預覽，而不是直接開啟 HTML 檔。

### 自助刪除帳號

刪除帳號由 `supabase/functions/delete-account/` 的 Edge Function 執行：函式先驗證目前登入者，再以 Supabase 後端的 service role 刪除該使用者。資料庫會先關閉該玩家的進行中房間；玩家自己的歷史和封鎖關係會移除，其他玩家的歷史會匿名化，既有檢舉則解除帳號連結並保留至 180 天期限。靜態前端不會取得 service role key。

建立 Supabase 專案後部署函式，並將 `ALLOWED_ORIGINS` 設為逗號分隔的精確網站 origin（例如 `https://<owner>.github.io` 和本機 HTTP origin；不要附網站子路徑）。只有確認 Edge Function、secret 和 CORS origin 設定完成後，才在 `site/supabase-config.js` 設定 `accountDeletionEnabled: true`；範本預設為 `false`，避免顯示無法使用的按鈕。正式 origin 尚未確定前不要打開此開關。

```sh
supabase functions deploy delete-account
supabase secrets set ALLOWED_ORIGINS="https://<owner>.github.io,http://localhost:8000"
```

## 真人配對後端草稿

`supabase/migrations/` 收錄九份 Supabase PostgreSQL schema 與 RPC 草稿，包含隨機配對、12 位邀請代碼、雙人作答同步、玩家各自保存 90 天的對局摘要、共同點排名、封鎖／檢舉、服務端限量、審查工作流程及帳號刪除清理；房間、配對票券和原始作答最多保留 24 小時，檢舉保存 180 天。PGlite 測試會自動依序套用所有 migration；這份獨立 repo 尚未驗證，且不代表已部署至 Supabase，也不驗證 Supabase Auth、Realtime、pg_cron 或線上 RLS。正式連接前須建立 Supabase 專案、啟用匿名登入、依序套用並驗證 migration、確認 RLS／Realtime／RPC 權限與清理排程，再設定公開用戶端 URL 與 anon key。不要將 service role key 放進靜態網站。

### 本機 migration 回歸測試

使用 Deno 與 PGlite 在本機建立暫存 PostgreSQL，依序套用所有 migration，檢查核心資料流程和資料權限：

```sh
deno test --allow-read --allow-net supabase/tests/migrations.test.ts
```

13 項測試會自動依檔名排序並套用 `supabase/migrations/` 中所有 SQL migration，涵蓋雙人作答揭曉與歷史摘要、主題相容的隨機配對和封鎖／取消、封鎖與配對／邀請加入共用交易鎖、歷史游標分頁與 90 天範圍、至少三局的共同點排名、本人歷史讀取與刪除權限、24／90／180 天清理、配對及開房限量、檢舉去重與封鎖、security-definer 函式的固定空 `search_path` 與匿名角色執行權限、刪除帳號資料收尾，以及審查權限、案件領取／結案、稽核紀錄與到期清除。這些測試使用最小 Auth／角色 stub，不取代 Supabase 專案中的 Auth、Realtime、pg_cron、RLS 或跨裝置驗證。

另有 `supabase/tests/block_match_concurrency.test.ts`，以 PostgreSQL 16 多連線實際交錯執行封鎖、隨機配對、邀請加入、限量和取消。第三條管理連線會確認 advisory lock 與票券列鎖等待狀態。封鎖提交後配對不會成功，邀請加入會被拒絕；第六間房及第十二張票券可建立，第七次開房與第十三次配對請求會被拒絕。取消先鎖定票券時配對會略過；配對先鎖定時取消等待後回報 `matched`。此測試會建立角色、schema 和資料，只允許 loopback 主機；請只用一次性的空白 PostgreSQL 16 資料庫，絕不可指向 Supabase 或其他正式資料庫。GitHub Actions 會在獨立 PostgreSQL service 執行此測試，並要求它通過後才部署 Pages：

```sh
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/commonality"
deno test --allow-env --allow-net --allow-read supabase/tests/block_match_concurrency.test.ts
```

## 本機預覽

直接用瀏覽器開啟 site/index.html 即可預覽，不需要安裝套件或建置工具。

## GitHub Pages 部署

公開 repository `310182-sketch/samewave` 已建立，`main` 已推送。首次 Actions run 的 `verify` 和 `block_race` 已通過，但 deploy 因 Pages 尚未啟用而失敗；workflow 現在會用 `actions/configure-pages` 自動啟用 Pages，等待下一次 CI 驗證。成功後會將 `site/` 發布至 [https://310182-sketch.github.io/samewave/](https://310182-sketch.github.io/samewave/)；Supabase URL／公開 key 尚未設定，因此真人登入及後端服務仍未啟用。

`riddle-match` 是另一個專案；該 repository 的舊部署網址和 Actions 紀錄不代表本專案的發布狀態。

本機重跑前端取消競態測試需安裝 Chrome，執行 `node scripts/matchmaking-cancel-race.mjs`；若 Chrome 不在預設路徑，可設定 `CHROME_BIN` 指向瀏覽器執行檔。

## 文件

- knowledge/plan.md：產品願景、現況與路線圖。
- knowledge/experience.md：適用範圍明確的實作經驗。
- knowledge/decision.md：目前原型採用的預設和待確認事項。

## 下一步

- 建立 Supabase 專案並填入 `site/supabase-config.js`，啟用 Anonymous Auth 和 Manual Linking，依序套用九份 migration，並在專案內驗證 RLS、Realtime、RPC 權限和資料清除排程。
- 建立並設定 Facebook、Google、X provider app，驗證登入、callback、session 恢復和匿名帳號 linking；依 Meta 資格與 app review 結果評估 Instagram、Threads custom OAuth。
- 部署帳號刪除 Edge Function，設定並驗證允許的 origin 和後端 service role secret，再驗證刪除帳號資料收尾。
- 使用兩部裝置走完邀請房、隨機配對、答題、結果、歷史查詢和默契統計，並檢查封鎖、檢舉與帳號刪除權限。
- 在 iOS／Android 實機與 VoiceOver／TalkBack 檢查無障礙操作、分享交接和文字放大，收集玩家回饋。
- 建立人工檢舉審查、玩家聯絡及緊急升級流程；完成前不得宣稱檢舉有人即時處理。
- 依公開服務地區覆核隱私告知與資料保存政策，並做行動裝置及讀屏檢查。
