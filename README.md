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

網站已接上 Samewave Supabase 專案，Anonymous Auth／Manual Linking 與 Google provider 已設定。Google app 仍在外部測試模式；2026-11-22 以已授權的測試名單帳號驗證 Google 登入及新分頁 session 恢復成功。匿名帳號 linking、Realtime 跨裝置通知和帳號刪除仍待驗收。公開 main 現有十二份 migration；六碼邀請 migration 已在 Supabase 套用，七項遠端檢查通過並由官方 CLI 對帳。PR #1 已於 2026-11-22 rebase merge；Pages Actions [run 44931736216](https://github.com/310182-sketch/samewave/actions/runs/44931736216) 的 verify、block_race、deploy 全部成功，公開網站載入 app.js?v=19，六碼邀請碼與自適應 Realtime 輪詢已發布。

## Supabase Auth 設定

site/supabase-config.js 配置 Samewave 專案公開 Project URL 與 publishable key。Google 是唯一社群登入；匿名遊客入口也保留。Facebook／X 已關閉，Instagram／Threads 不提供登入。PR #3 已移除首頁和審查工作區的其他 provider 按鈕；最新 Pages run [44931736216](https://github.com/310182-sketch/samewave/actions/runs/44931736216) 成功，公開網站載入 app.js?v=19。Google 仍在測試模式，只有測試名單帳號可登入。

Google OAuth 使用 Supabase Dashboard 顯示的 callback URL。Google app 目前為外部測試模式，只有測試名單帳號可登入。最新 client secret 已存入 Supabase，2026-11-22 已以測試名單帳號確認登入及同來源新分頁 session 恢復；client secret 僅存於 Supabase Auth，不放在網站或 repository。

瀏覽器使用 Supabase JS v2.119.2 處理匿名登入、Google OAuth、PKCE session 恢復與匿名帳號 identity linking；CDN 檔案以 SRI 固定完整性。匿名帳號 linking 和真人遊戲跨裝置流程仍待驗收。未設定 URL／key 或 SDK 無法載入時，保留不會保存資料的本機示範。publishable key 是公開 client 設定；service role key 和 Google client secret 僅能留在 Supabase 後端。

匿名帳號連結前，需在 Supabase Auth 設定中啟用 Manual Linking。OAuth redirect allow list 必須包含實際網站子路徑；本機應透過 HTTP localhost 預覽，而不是直接開啟 HTML 檔。
### 自助刪除帳號

刪除帳號由 `supabase/functions/delete-account/` 的 Edge Function 執行：函式先驗證目前登入者，再以 Supabase 後端的 service role 刪除該使用者。資料庫會先關閉該玩家的進行中房間；玩家自己的歷史和封鎖關係會移除，其他玩家的歷史會匿名化，既有檢舉則解除帳號連結並保留至 180 天期限。靜態前端不會取得 service role key。

函式已部署並啟用 JWT 驗證；`ALLOWED_ORIGINS` 目前只允許 `https://310182-sketch.github.io`。正式網站的 CORS 預檢回應 200，未允許的 origin 回應 403。尚未用真實登入 session 驗證 JWT 和刪除後資料收尾，因此公開設定的 `accountDeletionEnabled` 維持 `false`，刪除入口保持關閉；完成驗收前不要打開此開關。

## 真人配對後端

Public `main` contains twelve PostgreSQL migration files. PR #1 added six-digit numeric invite codes, server-side guess throttling and legacy-code transition support; the migration was applied in Supabase, passed seven remote checks, and its CLI ledger entry was reconciled without rerunning SQL. PR #1 was rebase-merged on 2026-11-22. Actions run 44931736216 passed `verify`, `block_race` and `deploy`; the public site now loads `app.js?v=19`. Per-account throttling is not a substitute for broader anti-abuse controls if account farming becomes a concern. Anonymous no-session `HEAD` probes with the public publishable key returned HTTP 401 for `game_answers`, `player_match_history` and `player_safety_reports`; no rows were read, and this does not verify authenticated users’ row ownership. The backend also provides RPCs for ten topic sets, matchmaking, paired answers, private history, moderation, rate limits and data cleanup. PGlite and PostgreSQL 16 results do not replace live Auth, RLS, Realtime or cross-device checks. Never put the service role key in the static site.

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

- 使用兩個已授權的 Supabase 測試 session 驗證匿名登入／登出、重新載入後 session 恢復，以及連結 Google 後 player ID／歷史保留。
- 使用兩部隔離裝置端到端驗證邀請房、隨機配對、完整對局、歷史查詢、RLS 與 Realtime 權限。
- 經使用者明確核准後，將 Google OAuth 從 Testing 發布至 Production，並用非測試名單帳號驗證一般帳號登入；目前僅測試名單能登入。
- 經明確核准後，以一次性測試帳號驗證帳號刪除 Edge Function 的 JWT／origin 拒絕與資料收尾；驗收通過後再決定是否開啟前端刪除入口。
- 在 Supabase 真人環境檢查封鎖、檢舉、限量與清理排程；建立並實際驗證審查員和玩家聯絡流程。
- 在 iOS／Android 實機與 VoiceOver／TalkBack 檢查無障礙操作、分享交接和文字放大，收集玩家回饋。
- 建立人工檢舉審查、玩家聯絡及緊急升級流程；完成前不得宣稱檢舉有人即時處理。
- 依公開服務地區覆核隱私告知與資料保存政策，並做行動裝置及讀屏檢查。
