# 同頻｜二選一共同點遊戲

🎮 [立即遊玩](https://310182-sketch.github.io/samewave/)

透過同一主題的二選一問答，讓兩位玩家發現共同點。雙方各自回答每一題，完成後才揭曉答案。

## 原型目前包含

- 從旅行、音樂、日常、飲食、影視娛樂、興趣嗜好、運動、寵物、閱讀學習、藝術文化、K-pop、F1、價值觀、感情觀及政治十五類主題選題，也可以隨機選題。
- 每個主題有 15 道題目；玩家可選每局 5、10 或 15 題，預設 5 題。邀請房和續玩沿用所選題數，隨機配對只媒合相同題數。
- 使用一次性的暱稱進入示範配對，不需要註冊。
- 具備 Supabase Auth client、邀請房、隨機配對、真人雙人答題、歷史查詢和共同點統計的前端接線；有 Supabase 專案設定時走真人 RPC，沒有設定時保留明確標示的本機示範。
- 真人對局提供檢舉及封鎖入口，歷史頁可管理封鎖清單；隱私說明列出資料用途和保存期限。此原型尚無人工審查人員，檢舉不代表即時有人處理。
- 另有獨立的檢舉案件審查工作區，只有 Supabase reviewer allowlist 帳號可透過 RPC 查看與處理案件；Supabase 尚未設定時頁面會鎖定，不會顯示案件資料。
- 完成所選題數的二選一問答，逐題揭曉雙方答案並查看共同選擇。
- 匯出 1080×1920 結果分享卡；可呼叫系統分享面板或下載 PNG。Instagram 交接仍需用實機確認。
- 可在手機與桌面瀏覽器操作。

網站已接上 Samewave Supabase 專案。玩家使用匿名登入，session 會保存在目前瀏覽器；清除網站資料或換裝置後可能無法找回匿名帳號。Google 登入從玩家頁面移除；獨立案件審查頁仍供核准審查員使用。政治主題的答案可能反映敏感偏好，依一般期限保存。Realtime 跨裝置通知和帳號刪除仍待驗收。15 份 Supabase migration 已部署並由 CLI 對帳，遠端唯讀查詢確認 15 個主題各有 15 題，並保留舊版五題 RPC。5／10／15 題選擇已部署；GitHub Actions run #64 的 verify、block_race 和 deploy 均成功，公開頁載入 `app.js?v=20`、`styles.css?v=16`。本機 PGlite 20 項與 headless Chrome 題數流程已通過；真人邀請房、配對及跨裝置流程仍待驗收。

## Supabase Auth 設定

site/supabase-config.js 配置 Samewave 專案公開 Project URL 與 publishable key。玩家頁面只提供 Supabase Anonymous Auth；session 由瀏覽器持久保存，但匿名身分依賴目前瀏覽器資料，清除網站資料或換裝置後可能無法找回。Google OAuth 入口和匿名帳號 linking 已從玩家頁面移除；獨立案件審查工作區仍使用 Google 驗證核准的審查員。Supabase Google provider 保持設定，以維持審查員登入；不會為此停用或刪除既有 Google 帳號。

瀏覽器使用 Supabase JS v2.119.2 處理匿名登入、PKCE 相容設定及 session 恢復；CDN 檔案以 SRI 固定完整性。沒有 URL／key 或 SDK 無法載入時，保留不會保存資料的本機示範。publishable key 是公開 client 設定；service role key 和 Google client secret 僅能留在 Supabase 後端。
### 自助刪除帳號

刪除帳號由 `supabase/functions/delete-account/` 的 Edge Function 執行：函式先驗證目前登入者，再以 Supabase 後端的 service role 刪除該使用者。資料庫會先關閉該玩家的進行中房間；玩家自己的歷史和封鎖關係會移除，其他玩家的歷史會匿名化，既有檢舉則解除帳號連結並保留至 180 天期限。靜態前端不會取得 service role key。

函式已部署並啟用 JWT 驗證；`ALLOWED_ORIGINS` 目前只允許 `https://310182-sketch.github.io`。正式網站的 CORS 預檢回應 200，未允許的 origin 回應 403。尚未用真實登入 session 驗證 JWT 和刪除後資料收尾，因此公開設定的 `accountDeletionEnabled` 維持 `false`，刪除入口保持關閉；完成驗收前不要打開此開關。

## 真人配對後端

Public `main` contains fifteen PostgreSQL migration files. PR #1 added six-digit numeric invite codes, server-side guess throttling and legacy-code transition support; the migration was applied in Supabase, passed seven remote checks, and its CLI ledger entry was reconciled without rerunning SQL. PR #1 was rebase-merged on 2026-11-22. Actions run #64 passed `verify`, `block_race` and `deploy`; the public site loads `app.js?v=20` and `styles.css?v=16`. Per-account throttling is not a substitute for broader anti-abuse controls if account farming becomes a concern. Anonymous no-session `HEAD` probes with the public publishable key returned HTTP 401 for `game_answers`, `player_match_history` and `player_safety_reports`; no rows were read, and this does not verify authenticated users’ row ownership. The backend also provides RPCs for fifteen topic sets, matchmaking, paired answers, private history, moderation, rate limits and data cleanup. PGlite and PostgreSQL 16 results do not replace live Auth, RLS, Realtime or cross-device checks. Never put the service role key in the static site.

### 本機 migration 回歸測試

使用 Deno 與 PGlite 在本機建立暫存 PostgreSQL，依序套用所有 migration，檢查核心資料流程和資料權限：

```sh
deno test --allow-read --allow-net supabase/tests/migrations.test.ts
```

20 項測試會自動依檔名排序並套用 `supabase/migrations/` 中所有 SQL migration，涵蓋十五類題庫、5／10／15 題在邀請房／配對／結果／歷史／續玩間的一致性，以及不同題數不互相配對；另驗證未知主題與非法題數拒絕。其他案例涵蓋雙人作答揭曉與歷史摘要、封鎖／取消競態、交易鎖、歷史與排名、資料清理、限量、檢舉、帳號刪除和審查流程。這些測試使用最小 Auth／角色 stub，不取代 Supabase 專案中的 Auth、Realtime、pg_cron、RLS 或跨裝置驗證。

另有 `supabase/tests/block_match_concurrency.test.ts`，以 PostgreSQL 16 多連線實際交錯執行封鎖、隨機配對、邀請加入、限量和取消。第三條管理連線會確認 advisory lock 與票券列鎖等待狀態。封鎖提交後配對不會成功，邀請加入會被拒絕；第六間房及第十二張票券可建立，第七次開房與第十三次配對請求會被拒絕。取消先鎖定票券時配對會略過；配對先鎖定時取消等待後回報 `matched`。此測試會建立角色、schema 和資料，只允許 loopback 主機；請只用一次性的空白 PostgreSQL 16 資料庫，絕不可指向 Supabase 或其他正式資料庫。GitHub Actions 會在獨立 PostgreSQL service 執行此測試，並要求它通過後才部署 Pages：

```sh
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/commonality"
deno test --allow-env --allow-net --allow-read supabase/tests/block_match_concurrency.test.ts
```

## 本機預覽

執行 `node scripts/preview-site.mjs` 後開啟 `http://127.0.0.1:4173/`。預覽服務只綁定本機回環位址，從 `site/` 提供靜態檔案，不需安裝套件或建置工具；也可直接開啟 `site/index.html`。

## GitHub Pages 部署

公開 repository `310182-sketch/samewave` 的 Pages 發布來源已設為 GitHub Actions。[run #64](https://github.com/310182-sketch/samewave/actions/runs/44980519034) 的 `verify`、`block_race` 和 `deploy` 全部成功；公開首頁及 `app.js?v=20`、`styles.css?v=16`、`privacy.html` 回 HTTP 200。網站 [https://310182-sketch.github.io/samewave/](https://310182-sketch.github.io/samewave/) 已更新。Search Console 曾顯示無法讀取 sitemap，雖然 sitemap 對 Googlebot 回 HTTP 200。網站已載入 Samewave Supabase 公開設定；匿名登入和真人遊戲仍待真實 session 及跨裝置驗收。

`riddle-match` 是另一個專案；該 repository 的舊部署網址和 Actions 紀錄不代表本專案的發布狀態。

本機重跑前端取消競態測試需安裝 Chrome，執行 `node scripts/matchmaking-cancel-race.mjs`；若 Chrome 不在預設路徑，可設定 `CHROME_BIN` 指向瀏覽器執行檔。

## 文件

- knowledge/plan.md：產品願景、現況與路線圖。
- knowledge/experience.md：適用範圍明確的實作經驗。
- knowledge/decision.md：目前原型採用的預設和待確認事項。

## 下一步

- 使用兩個已授權的 Supabase 測試 session 驗證匿名登入／登出、重新載入後 session 恢復，以及新主題在正式後端的邀請房和配對流程。
- 使用兩部隔離裝置端到端驗證邀請房、隨機配對、完整對局、歷史查詢、RLS 與 Realtime 權限。
- 經明確核准後，以一次性測試帳號驗證帳號刪除 Edge Function 的 JWT／origin 拒絕與資料收尾；驗收通過後再決定是否開啟前端刪除入口。
- 在 Supabase 真人環境檢查封鎖、檢舉、限量與清理排程；建立並實際驗證審查員和玩家聯絡流程。
- 在 iOS／Android 實機與 VoiceOver／TalkBack 檢查無障礙操作、分享交接和文字放大，收集玩家回饋。
- 建立人工檢舉審查、玩家聯絡及緊急升級流程；完成前不得宣稱檢舉有人即時處理。
- 依公開服務地區覆核隱私告知與資料保存政策，並做行動裝置及讀屏檢查。
