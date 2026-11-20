# 同頻｜二選一共同點遊戲

🎮 [立即遊玩](https://310182-sketch.github.io/samewave/)

透過同一主題的二選一問答，讓兩位玩家發現共同點。雙方各自回答每一題，完成後才揭曉答案。

## 原型目前包含

- 從旅行、音樂、日常、飲食、影視娛樂、興趣嗜好、運動、寵物、閱讀學習及藝術文化十類主題選題，也可以隨機選題。
- 使用一次性的暱稱進入示範配對，不需要註冊。
- 具備 Supabase Auth client、邀請房、隨機配對、真人雙人答題、歷史查詢和共同點統計的前端接線；有 Supabase 專案設定時走真人 RPC，沒有設定時保留明確標示的本機示範。
- 真人對局提供檢舉及封鎖入口，歷史頁可管理封鎖清單；隱私說明列出資料用途和保存期限。此原型尚無人工審查人員，檢舉不代表即時有人處理。
- 另有獨立的檢舉案件審查工作區，只有 Supabase reviewer allowlist 帳號可透過 RPC 查看與處理案件；Supabase 尚未設定時頁面會鎖定，不會顯示案件資料。
- 完成五題二選一，逐題揭曉雙方答案並查看共同選擇。
- 匯出 1080×1920 結果分享卡；可呼叫系統分享面板或下載 PNG。Instagram 交接仍需用實機確認。
- 可在手機與桌面瀏覽器操作。

網站已接上 Samewave Supabase 專案，Anonymous Auth 與 Manual Linking 已啟用；匿名登入按鈕已開放，但真實登入 session 和跨裝置流程尚未驗收。Google、Facebook、X、Instagram、Threads 社群登入仍未設定。十份資料庫 migration 已透過 Supabase SQL Editor 套用，官方 CLI migration ledger 已修復，並確認十個本機版本皆與遠端已套用版本一致；主要資料表、RPC、RLS、Realtime publication 和兩個清理排程也已核對。`delete-account` Edge Function 已部署並限制正式網站 origin，但尚未用真實登入者驗收，前端刪除入口維持關閉。GitHub Actions [run #29](https://github.com/310182-sketch/samewave/actions/runs/44785419073) 的驗證、PostgreSQL 16 `block_race` 與 Pages 部署均成功；run #28 也確認 Pages artifact 重試修正。CI 通過不代表 Auth、Realtime、RLS 或跨裝置流程已完成端對端驗收。

## Supabase Auth 設定

`site/supabase-config.js` 已配置 Samewave 專案的公開 Project URL 與 publishable key。Supabase Dashboard 已啟用 Anonymous Auth 和 Manual Linking；社群 providers 目前維持關閉，待各平台 credentials、callback 與審核完成後才啟用：

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

瀏覽器以 Supabase JS v2.119.2 初始化匿名登入、OAuth、session 恢復及匿名帳號的 identity linking；CDN 檔案使用 SRI 固定完整性。正式網站已載入專案設定，匿名登入服務已開啟；真實登入 session、重新載入後的恢復及 linking 尚未驗收。未設定 URL／key 或 SDK 無法載入時，登入入口會停用，示範流程仍可使用。配對、歷史及統計 RPC 已接入前端，但真人遊戲尚未在 Supabase 完成端對端驗證。anon／publishable key 是公開用戶端設定；service role key 和各 provider client secret 僅能留在 Supabase 後端設定。

匿名帳號連結前，需在 Supabase Auth 設定中啟用 **Manual Linking**。OAuth redirect allow list 必須包含實際網站子路徑；本機應透過 HTTP localhost 預覽，而不是直接開啟 HTML 檔。

### 自助刪除帳號

刪除帳號由 `supabase/functions/delete-account/` 的 Edge Function 執行：函式先驗證目前登入者，再以 Supabase 後端的 service role 刪除該使用者。資料庫會先關閉該玩家的進行中房間；玩家自己的歷史和封鎖關係會移除，其他玩家的歷史會匿名化，既有檢舉則解除帳號連結並保留至 180 天期限。靜態前端不會取得 service role key。

函式已部署並啟用 JWT 驗證；`ALLOWED_ORIGINS` 目前只允許 `https://310182-sketch.github.io`。正式網站的 CORS 預檢回應 200，未允許的 origin 回應 403。尚未用真實登入 session 驗證 JWT 和刪除後資料收尾，因此公開設定的 `accountDeletionEnabled` 維持 `false`，刪除入口保持關閉；完成驗收前不要打開此開關。

## 真人配對後端

`supabase/migrations/` 收錄十份 PostgreSQL schema 與 RPC，涵蓋十類題庫、隨機配對、12 位邀請代碼、雙人作答同步、各玩家保存 90 天的對局摘要、共同點排名、封鎖／檢舉、服務端限量、審查工作流程及帳號刪除清理；房間、配對票券和原始作答最多保留 24 小時，檢舉保存 180 天。十份 migration 已在 Samewave Supabase 專案透過 SQL Editor 套用，並以官方 CLI 登記為已套用；`migration list` 已確認十個本機版本與遠端版本一致。唯讀查核確認主要 schema、RLS、Realtime publication 和兩個 `pg_cron` 清理排程皆 active。PGlite 和 PostgreSQL 16 測試通過 CI，但不取代真實 Auth、完整 RLS、Realtime 和跨裝置驗收。不要將 service role key 放進靜態網站。

### 本機 migration 回歸測試

使用 Deno 與 PGlite 在本機建立暫存 PostgreSQL，依序套用所有 migration，檢查核心資料流程和資料權限：

```sh
deno test --allow-read --allow-net supabase/tests/migrations.test.ts
```

14 項測試會自動依檔名排序並套用 `supabase/migrations/` 中所有 SQL migration，新增驗證十類題庫、六個新增類別的邀請房與隨機配對，以及未知主題拒絕；其他案例涵蓋雙人作答揭曉與歷史摘要、配對和封鎖／取消、交易鎖、歷史與排名、資料清理、限量、檢舉、帳號刪除和審查流程。這些測試使用最小 Auth／角色 stub，不取代 Supabase 專案中的 Auth、Realtime、pg_cron、RLS 或跨裝置驗證。

另有 `supabase/tests/block_match_concurrency.test.ts`，以 PostgreSQL 16 多連線實際交錯執行封鎖、隨機配對、邀請加入、限量和取消。第三條管理連線會確認 advisory lock 與票券列鎖等待狀態。封鎖提交後配對不會成功，邀請加入會被拒絕；第六間房及第十二張票券可建立，第七次開房與第十三次配對請求會被拒絕。取消先鎖定票券時配對會略過；配對先鎖定時取消等待後回報 `matched`。此測試會建立角色、schema 和資料，只允許 loopback 主機；請只用一次性的空白 PostgreSQL 16 資料庫，絕不可指向 Supabase 或其他正式資料庫。GitHub Actions 會在獨立 PostgreSQL service 執行此測試，並要求它通過後才部署 Pages：

```sh
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/commonality"
deno test --allow-env --allow-net --allow-read supabase/tests/block_match_concurrency.test.ts
```

## 本機預覽

直接用瀏覽器開啟 site/index.html 即可預覽，不需要安裝套件或建置工具。

## GitHub Pages 部署

公開 repository `310182-sketch/samewave` 的 Pages 發布來源已設為 GitHub Actions。[run #29](https://github.com/310182-sketch/samewave/actions/runs/44785419073) 的 `verify`、`block_race` 和 `deploy` 全部成功；run #28 驗證了 Pages artifact 重試修正。網站 [https://310182-sketch.github.io/samewave/](https://310182-sketch.github.io/samewave/) 已上線，`robots.txt` 與 `sitemap.xml` 可公開讀取。Search Console 仍顯示無法讀取 sitemap，雖然 sitemap 對 Googlebot 回 HTTP 200。網站已載入 Samewave Supabase 公開設定；匿名登入和真人遊戲仍待真實 session 及跨裝置驗收。

`riddle-match` 是另一個專案；該 repository 的舊部署網址和 Actions 紀錄不代表本專案的發布狀態。

本機重跑前端取消競態測試需安裝 Chrome，執行 `node scripts/matchmaking-cancel-race.mjs`；若 Chrome 不在預設路徑，可設定 `CHROME_BIN` 指向瀏覽器執行檔。

## 文件

- knowledge/plan.md：產品願景、現況與路線圖。
- knowledge/experience.md：適用範圍明確的實作經驗。
- knowledge/decision.md：目前原型採用的預設和待確認事項。

## 下一步

- 先透過官方 Supabase CLI 將 SQL Editor 已套用的十份 migration 安全登記為 applied，再以 `supabase migration list` 核對；完成前不要執行 `supabase db push`。
- 使用專用測試 session 驗證匿名登入、登出、重新載入後的 session 恢復和匿名帳號 linking；再以兩部裝置驗證邀請房、隨機配對、完整答題、歷史查詢及統計的 Auth／RLS／Realtime 權限。
- 建立並設定 Facebook、Google、X provider app，驗證登入、callback、session 恢復和匿名帳號 linking；依 Meta 資格與 app review 結果評估 Instagram、Threads custom OAuth。
- 經明確核准後，以一次性測試帳號驗證帳號刪除 Edge Function 的 JWT／origin 拒絕與資料收尾；驗收通過後再決定是否開啟前端刪除入口。
- 在 Supabase 真人環境檢查封鎖、檢舉、限量與清理排程；建立並實際驗證審查員和玩家聯絡流程。
- 在 iOS／Android 實機與 VoiceOver／TalkBack 檢查無障礙操作、分享交接和文字放大，收集玩家回饋。
- 建立人工檢舉審查、玩家聯絡及緊急升級流程；完成前不得宣稱檢舉有人即時處理。
- 依公開服務地區覆核隱私告知與資料保存政策，並做行動裝置及讀屏檢查。
