# 決策紀錄

最後整理：2026-11-22

## 本分支的產品方向

- **狀態：** 本分支採用；與遠端 `main` 的產品方向不同。
- **現況：** 遠端 `main` 是陌生人自由提問的猜謎遊戲；目前工作區依二選一共同點遊戲方向製作原型。
- **決定：** 依照 `knowledge/plan.md` 製作二選一共同點遊戲，不把自由聊天或猜謎流程帶入本分支。
- **適用範圍：** 目前原型及後續路線；若使用者改回猜謎產品，需先調整計畫和原型方向。

## 二選一原型

- **狀態：** 已實作互動原型。
- **決定：** 每局配對兩位玩家，主題從旅行、音樂、日常、飲食、影視娛樂、興趣嗜好、運動、寵物、閱讀學習、藝術文化十類中擇一，也可隨機選擇；每類先提供五道二選一題目，一局五題，雙方都答完才揭曉。結果頁顯示相同答案題數和共同選擇。
- **示範模式：** 原型由本機範例資料提供示範對象及答案，畫面需清楚標示模擬資料；尚未實作真人配對、跨裝置同步或保存遊戲紀錄。
- **適用範圍：** 瀏覽器互動原型，不代表正式版題數、配對期限、紀錄保存或登入規格已全部定案。

## 房間與配對

- **狀態：** MVP 預設已採用；邀請房建立／加入／離房、六碼數字代碼、服務端猜測限流、Realtime 答題／揭曉、雙方確認、結果讀取及隨機配對 RPC 已接上前端或 Supabase。十二份 migration 已部署，PR #1 已合併；最新公開版 app.js?v=19 包含六碼輸入。真實雙裝置遊戲、登入後 RPC/RLS 和資料同步仍待實測。
- **決定：** 玩家可建立雙人邀請房間，分享六位數字代碼讓另一位玩家加入；六碼代碼應有服務端猜測限流。過渡期接受尚未過期的舊 12 碼代碼；新房間使用六碼。房間 10 分鐘沒有第二位玩家加入就失效；房主在遊戲開始前離開時關閉房間。
- **決定：** 玩家每次只能參加一個進行中的房間。隨機配對等候上限為 30 秒；逾時可以重新排隊。房間開始後閒置 10 分鐘就失效。
- **重新載入：** Auth session 恢復後先找回本人進行中的房間，再查本人仍有效的等待票券；若等待已逾時，顯示重新配對入口，不自動建立另一張票券。若房間剛在查詢競速期間配對成功，則接入既有房間。
- **決定：** 玩家指定不同主題時不互相配對；任一方選隨機即可配對並沿用另一方主題；雙方都選隨機時由系統抽一個主題。
- **適用範圍：** 二人 MVP；房間密碼、多玩家房間及自訂逾時不納入首版。

## 同一玩家續玩

- **狀態：** 前端邀請區和 Supabase migration 已完成，migration 已部署並同步 CLI ledger。18 項 PGlite migration 測試、headless Chrome mock 續玩及兩個正式測試 session 的真實 RPC 流程通過；兩位玩家各有兩筆分開的歷史。Actions [run 44854423906](https://github.com/310182-sketch/samewave/actions/runs/44854423906) 的 PostgreSQL 多連線競態和 Pages deploy 成功，公開頁載入 `app.js?v=16`；Realtime 跨裝置通知仍未驗證。
- **決定：** 真人對局結果頁可邀請上一局的同一位玩家再玩；只有雙方同意後才建立新局。新局沿用主題及兩個玩家身分，但使用全新的房間、答案與對局歷史；上一局的歷史不修改。
- **限制：** 邀請 10 分鐘後逾期，可重新邀請。任一方向封鎖對方，或任何一方仍在其他有效房間時，拒絕新局。這個入口不加入公開隨機配對佇列；示範模式沿用本機「再玩一局」。
- **同步：** 以私人 RPC 作為狀態和同意的權威來源；來源房間的 Realtime UPDATE 只用來通知另一端重新讀取狀態，並保留輪詢備援。切換帳號或離開結果頁時，停止舊訂閱與輪詢。
- **待完成：** 以隔離裝置驗證 Realtime 通知、房間切換和新舊歷史隔離。

## 真人配對與後端

- **狀態：** Supabase 為目前真人 MVP 的實作預設；十二份 migration 已部署，CLI ledger 確認 local／remote 版本相符。18 項 PGlite 回歸與 Actions [run 44854423906](https://github.com/310182-sketch/samewave/actions/runs/44854423906) 的 PostgreSQL 多連線競態測試通過。使用兩個已授權的測試 session 驗證真實邀請、五題對局、同意續玩及分開保存歷史；匿名角色以公開 publishable key 對 game_answers、player_match_history、player_safety_reports 執行無 session 的 HEAD 探測均回 HTTP 401，沒有讀取資料列。這只驗證未登入存取遭拒；Realtime 跨裝置通知、登入玩家間的資料隔離及完整瀏覽器流程仍待實測。
- **決定：** 以 Supabase Anonymous Auth 驗證玩家、PostgreSQL RPC 執行建立房間／加入房間／原子配對與答案提交，Realtime 傳遞房間狀態。
- **安全規則：** 答案留在資料庫；只有同一房間兩位玩家都完成作答後才回傳雙方答案。以 RLS 限制玩家資料存取，不開放用戶端直讀答案表；service role key 不放在前端。
- **同步規則：** 揭曉後兩位玩家都按「下一題」才推進；先按的人等待對方。正式閒置時間、離線及重新連線行為仍需實測及定案。
- **資料保存：** 房間、配對票券、暱稱及原始答案於結束／逾期後最多保留 24 小時；每位玩家的歷史摘要保存 90 天且可提前刪除；檢舉資料保存 180 天；封鎖清單保留至解除或刪除帳號。
- **未完成條件：** 完成匿名登入 smoke check，並以兩部裝置驗證登入後的房間、配對、Realtime、歷史及資料權限；真實 JWT／帳號刪除驗收仍待完成。Google OAuth 最新 client secret 的真人登入與新分頁 session 恢復已通過測試名單驗收，Google app 仍在外部測試模式。PGlite 預檢不能取代 Supabase Auth、Realtime、pg_cron 和跨裝置的實際服務驗收。

## 匿名與 Google 登入

- 狀態：Supabase Anonymous Auth、Manual Linking 與 Google provider 已啟用；線上 Auth settings 唯讀查核確認 anonymous_users=true、google=true、facebook=false、twitter=false，Instagram／Threads 未設定。以授權測試名單帳號透過公開網站完成 Google OAuth，確認新 client secret 可建立 session，且同來源新分頁能恢復登入狀態。
- 決定：保留匿名玩家入口，Google 是唯一社群登入方式。Facebook、X、Instagram、Threads 登入不在產品範圍；Instagram 結果分享維持獨立功能。Google OAuth 仍在外部測試模式，只有測試名單使用者可登入。
- **待核准的雲端變更：** Google OAuth app 仍是 Testing，只有測試名單可登入。建議在核對 Google Cloud 發布要求後改為 Production，讓一般 Google 帳號登入；這會擴大可登入對象。已於 2026-11-22 詢問使用者是否授權發布，在得到明確回覆前不變更該設定。
- 帳號連結：匿名玩家可連結 Google，完成後必須保留原 player ID 和歷史紀錄；真人 linking 驗收仍待完成。
- 安全界線：provider secret 僅存於 Supabase Auth；GitHub Pages 只使用公開 Project URL／publishable key。不要把 OAuth secret 傳入聊天或 repository。
- 下一步：驗證匿名玩家連結 Google 後是否保留原 player ID 與歷史；Google app 仍在外部測試模式，需完成 Google 的正式發布要求後才能向一般帳號開放。

## 自助刪除帳號

- **狀態：** 前端確認流程、Supabase Edge Function 和 Auth 刪除前收尾 migration 已完成。`delete-account` 已部署，使用 Supabase 管理的服務端 key，並以精確 `ALLOWED_ORIGINS` 限制來源；GitHub Pages 的 OPTIONS 預檢回應正確。尚未用真實登入 session 執行 JWT／帳號刪除驗收，因此公開設定仍為 `accountDeletionEnabled: false`，介面停用。
- **決定：** 只允許目前已驗證的登入者刪除自己的 Auth 帳號。前端呼叫 `delete-account` Edge Function；函式驗證 JWT，從 token 取得使用者 ID，再以僅存於 Supabase 後端的 service role 呼叫 Auth Admin 刪除。使用精確 origin allow list，未設定時拒絕瀏覽器呼叫。
- **資料處理：** 刪除前把此帳號參與的 waiting／playing 房間標為 abandoned，移除邀請碼並取消等待票券；Auth 刪除後 cascade 清除本人歷史和封鎖。其他玩家仍保存的歷史會匿名化對手暱稱；既有檢舉清空 reporter／reported 帳號連結，但檢舉說明依 180 天保存期限保留。
- **上線界線：** 只有 Edge Function 已部署、`ALLOWED_ORIGINS` 和後端 service role 設定完成、並驗證帳號清理後，才能在公開 `site/supabase-config.js` 將 `accountDeletionEnabled` 設為 `true`。不得把 service role key 放入靜態網站。
- **適用範圍：** 二人 MVP 的匿名或已連結社群登入帳號；不刪除對手為維持歷史匿名化所需的摘要，也不立即刪除按政策限期保存的檢舉說明。

## 其他社群 provider 評估（歷史背景）

- 狀態：以下內容是縮小登入範圍前的技術背景，不是待開發項目；產品只保留 Google 社群登入。
- **Facebook／Google：** Supabase Auth 內建 provider，可直接採用官方設定流程。
- **X：** Supabase 現行建議使用內建的 X／Twitter OAuth 2.0 provider；官方文件指出舊 Twitter OAuth 1.0a provider 將在未來版本淘汰。
- **Instagram：** 不在 Supabase 內建清單。Meta 的 Instagram Login 可用 OAuth 2.0 接入 Supabase custom OAuth provider，但官方產品目前面向 Instagram 專業帳號（商家與創作者），不能當作所有個人帳號通用登入。推薦只把它提供給符合 Meta 條件的專業帳號，並保留匿名登入作為一般玩家入口。
- **Threads：** 不在 Supabase 內建清單。Meta Threads API 提供 OAuth 2.0 使用者授權及 `threads_basic` 個人檔案權限，可評估以 Supabase custom OAuth provider 接入；向沒有應用程式角色的一般使用者開放前需完成 Meta app review。
- **Supabase 限額：** Free plan 可新增最多 3 個 custom provider；Instagram 與 Threads 共用其中 2 個名額。
- **帳號連結：** Instagram／Threads 不保證提供可供帳號自動合併的 email。匿名帳號升級時應使用已登入狀態下的手動 identity linking；Supabase 將此功能標示為 beta，custom provider 連結尚須實測。不能只依賴相同 email 自動連結。
- **推薦實作順序：** 先完成 Google、Facebook、X 內建 provider，再驗證 Threads custom OAuth；Instagram custom OAuth 僅依專業帳號限制提供。所有流程均須使用 Supabase callback，client secret 保留在 Supabase Auth 設定。
- **官方依據：** [Supabase social sign-in](https://supabase.com/docs/guides/auth/social-login)、[Supabase custom OAuth/OIDC providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)、[Supabase identity linking](https://supabase.com/docs/guides/auth/identity-linking)、[Meta Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)、[Meta Threads API](https://developers.facebook.com/docs/threads/get-started/)、[Supabase X OAuth 2.0](https://supabase.com/docs/guides/auth/social-login/auth-twitter)。

## Supabase Auth 前端接線

- 狀態：靜態前端支援匿名登入、Google OAuth、PKCE session 恢復和匿名帳號 identity linking。匿名與 Google provider 已啟用；公開網站使用最新 client secret 成功完成測試名單帳號登入與新分頁 session 恢復。
- 產品範圍：Google 是唯一社群登入 provider；Facebook、X、Instagram、Threads 登入按鈕與 custom-provider 呼叫已移除。匿名入口仍保留。結果卡分享到 Instagram 是另一項功能。
- 設定方式：site/supabase-config.js 只存公開 Project URL、publishable key 和非秘密前端設定。Google 可用狀態從 Supabase Auth settings 的 external.google 唯讀取得；client secret 和 service role key 僅留在後端。
- 登入行為：匿名玩家可直接開始；已登入匿名玩家連結 Google 時應保留原 player ID 和歷史紀錄。Manual Linking 已開啟，真人 linking 驗收仍待完成。
- 驗收限制：Google app 仍在外部測試模式；無法確認 provider 狀態時停用 Google 按鈕，同時保留匿名入口和本機示範。登入成功不代表配對、Realtime 或歷史流程已完整驗收。
## 歷史紀錄與共同點統計

- **狀態：** 產品規格已採用；歷史資料表、完局摘要 trigger 與查詢 RPC 已部署至 Samewave Supabase。歷史頁前端已接上 RPC 契約並以 mock 驗證清單、分頁、排名、刪除和帳號切換；真實使用者資料、跨帳號隔離及歷史權限仍待驗證。
- **決定：** 每位玩家只能查詢自己的已完成對局摘要，包含主題、完成時間、對手暱稱、共同題數和共同答案。紀錄保存 90 天，可由玩家逐筆刪除；刪除帳號時移除該帳號的歷史。
- **決定：** 默契排名以最近 90 天的共同答案比例計算；至少和同一玩家完成 3 局才列入排名，同分依對局數較多者優先。顯示共同答案總數和對局數；頁面只對本人可見，不建立公開排行榜。
- **資料政策：** 即時遊戲房間、暱稱和原始答案於結束後 24 小時清除；每位玩家各自的 90 天歷史摘要獨立保留。帳號刪除時匿名化其他玩家歷史中對該帳號的顯示名稱。
- **原因：** 分開保留短期即時資料和限期歷史摘要，可同時支援歷史查詢、配對統計與資料最小化。

## 檢舉、封鎖與個資告知

- **狀態：** MVP 政策、前端入口與安全 migration 已完成草稿；安全 RPC、私有資料存取、雙向配對排除和服務端限量已通過 PGlite 預檢。第五份 migration 補上刪除任一涉事帳號時解除檢舉雙方 ID 連結，第六份 migration 將封鎖寫入與配對／邀請加入檢查序列化；第七份 migration 加入依登入者身分恢復本人進行中房間的 RPC；run 45 驗證封鎖與配對／加入競態，run 50 驗證兩種帳號限量，run 53 驗證配對與取消對同一張票券的列鎖順序。Supabase Auth／RLS 環境驗證和人工審查營運流程仍待完成。
- **個資最小化：** 只處理 Supabase 帳號識別碼、登入 provider 傳回的帳號識別資料、玩家暱稱、主題、配對／房間狀態、作答及玩家要求保存的歷史摘要；不要求玩家交換聯絡方式。暱稱限 12 字。原始房間、配對票券及答案最多保留 24 小時，個人歷史保存 90 天；示範模式的資料只留在瀏覽器，不送出或保存。
- **封鎖：** 玩家可在真人對局中或完局後封鎖對方；封鎖為單向，可從自己的封鎖清單解除。若任一方封鎖另一方，隨機配對會略過該配對；邀請房也不得讓兩方進入同一房間。封鎖清單只對封鎖者可讀，刪除帳號時清除封鎖關係。
- **檢舉：** 玩家可在真人房間檢舉同房玩家，選擇騷擾／仇恨／色情／垃圾內容／其他，附最多 500 字說明。每個玩家每個房間只能建立一筆檢舉；不保存原始答案或額外聊天內容。檢舉資料只對服務端審查人員可讀，保留 180 天後清除；刪除帳號時移除檢舉人和被檢舉人的帳號連結，但保留限期內的檢舉內容。檢舉不自動封禁或處分，避免單筆惡意檢舉直接影響帳號。
- **濫用限制：** 同一帳號 10 分鐘最多建立 12 張隨機配對票券、1 小時最多建立 6 個邀請房；每房間每個玩家最多提交一筆檢舉。這些限制在服務端執行。匿名帳號可被重新建立，不能當成 IP 或裝置層級的完整防濫用措施。
- **告知與營運界線：** 真人服務上線前，需在遊戲內告知上述資料用途、保存期限和刪除入口；檢舉功能須明確說明目前是否有人定期審查。正式公開前仍須指定營運審查人員、聯絡方式、處理時限及緊急升級流程；尚未建立這些營運條件前，不宣稱有即時人工審查。

### 檢舉案件營運流程草案（待核准）

- **狀態：** 流程建議已整理，尚未獲營運負責人核准或實際配置；目前沒有人工案件佇列、支援聯絡窗口、值班人員或服務時限。不得把下列建議描述成已提供的服務。
- **收件與確認：** 只透過同房檢舉 RPC 收件；伺服器確認提交者是房間成員、原因屬於五種支援類別，說明不超過 500 字，並維持每房每人一筆。畫面回覆「已收到」只代表資料保存成功，不代表已有人受理。
- **分流與審查：** 由指定審查者依案件內容分成優先安全審查與一般審查。包含具體立即人身威脅或重大安全疑慮者優先升級；其餘案件依騷擾／威脅、仇恨／歧視、色情／不當內容、垃圾／惡意行為或其他分類檢視。分類只用於排序，不自動封鎖或處分帳號。
- **資料存取：** 僅限經授權的服務端審查角色查看房間、類別和玩家填寫的說明；不得把案件資料轉貼到公開或一般客服管道。只記錄審查所需的案件狀態、處理人、時間與結果，審查紀錄也須有權限控制及期限。現有資料庫表沒有審查狀態、審查日誌或管理介面，須另行規劃實作。
- **處理結果：** 審查人員記錄未違規、需要後續處理或升級等結果，具體處分權限、證據標準、重複違規政策及申訴方式待營運方制定；不以單筆檢舉自動處分。
- **回覆與升級：** 指定聯絡方式後，依案件結果通知檢舉人可提供的處理狀態；明確威脅或其他重大疑慮交由指定安全負責人處理，涉及法定通報或外部機關時先由服務負責人依服務地區確認義務。檢舉管道不作緊急求助管道。
- **建議時限（待核准且待有人力支援）：** 一般案件以 3 個工作日內完成首次檢視為目標；有具體即時安全疑慮者應在有人值班時優先處理。須先定義工作日、時區、值班覆蓋及未能達標時如何告知；未核准及未配置值班前不向玩家承諾此時限，也不暗示 24 小時監看。
- **保存與清理：** 僅保留必要案件資料，依既定 180 天期限清除；上線前確認 Supabase 的排程確實啟用，並決定審查稽核記錄是否有不同且合理的保存期限。帳號刪除時沿用既有設計解除檢舉雙方帳號 ID 連結。
- **上線前仍待決：** 指定實際負責人和審查人員、值班與支援聯絡方式、時限與回覆模板、處理及申訴政策、重大安全事件升級責任人、對玩家的緊急事件指引，以及審查記錄的保存期限。
- **推薦：** MVP 使用上述期限與限制，保留玩家逐筆刪除歷史及解除封鎖；正式推出前由營運方依服務地區和法律要求覆核隱私告知與檢舉流程。
- **適用範圍：** 二人共同點遊戲 MVP；不涵蓋聊天、照片、公開個人檔案或公共排行榜。

## Instagram 限時動態分享

- **狀態：** 已在本機原型實作，尚未在 iOS／Android 實機驗證。
- **決定：** 結果頁產生 9:16 PNG 分享卡；玩家主動按下分享後呼叫裝置分享面板，由玩家選擇 Instagram 並自行確認發布。若瀏覽器不支援分享檔案或沒有 Instagram 分享目標，提供 PNG 下載。
- **實作：** 原型已用 Canvas 產生 1080×1920 PNG，提供分享面板與下載按鈕。使用者取消系統分享時不自動下載；分享失敗或瀏覽器不支援時提供 PNG 備援。
- **內容界線：** 分享卡只包含主題、共同答案和品牌；不放匿名帳號 ID、登入資料或聯絡資訊。示範模式需標示答案是模擬資料。
- **待驗證：** 在 iOS／Android 裝置上確認分享面板與 Instagram 限時動態的交接及下載備援。

## 發布

- **現況：** `riddle-match` 的 Pages 網站屬於另一個專案。公開 repository [310182-sketch/samewave](https://github.com/310182-sketch/samewave) 已建立，Pages source 已設為 GitHub Actions，網站網址為 [https://310182-sketch.github.io/samewave/](https://310182-sketch.github.io/samewave/)。公開 main 有十二份 migration，官方 CLI ledger 12/12 相符；PR #1 已於 2026-11-22 rebase merge，Pages Actions [run 44931736216](https://github.com/310182-sketch/samewave/actions/runs/44931736216) 的 verify、block_race、deploy 全部成功。公開首頁載入 app.js?v=19，六碼邀請、舊碼過渡相容及服務端猜測限流已發布。同一玩家續玩和 Google-only 登入前端已部署；匿名帳號連結、隔離裝置 Realtime 和其餘真人服務流程仍待完成。
- **決定：** 採公開 repository，因為目標包含 GitHub Pages 免費發布；建立時只納入同頻原始碼和文件，不沿用另一專案歷史。已檢查用戶端設定範本沒有真實 Supabase URL／key，測試中的 JWT 為假資料；provider secret 與 service role key 不得推送。
- **PR #3：** Google-only 登入修改已於 2026-11-22 透過 rebase merge 合併；GitHub Pages 部署 run 44927437625 成功。未來公開 repository 合併前，須核對 commit author 和 committer 兩個欄位的 email；rebase 預覽或 noreply author 單獨不足以證明 committer 也隱去個人 email。
- **下一階段：** 以兩個已授權測試 session 完成匿名登入／登出、session 恢復及匿名連結 Google 的真人驗收，再用兩部隔離裝置測試 Auth、RLS、Realtime、RPC、歷史和配對。Google OAuth 仍在外部測試模式，需完成正式發布要求才可向一般帳號開放。帳號刪除 Edge Function 已部署且限制 origin，但要經明確核准才用一次性帳號驗證實際刪除。公開靜態網站及 schema 部署仍不代表真人遊戲已完成端對端驗收。


## Samewave Supabase 專案設定

- **狀態：** 專用專案已建立並部署 schema；公開網站設定已加入 URL／publishable key。
- **決定：** Samewave 使用獨立 Supabase 專案 bbpfgavabdsdayuprhbp（Singapore），不與 riddle-match 共用資料庫。已啟用 Anonymous Auth 和 Manual Linking，Google 是唯一社群登入方式，並把 GitHub Pages 與 localhost 回跳網址加入 Auth allow list；此設定不代表真人遊戲流程已全部驗收。
- **安全界線：** site/supabase-config.js 只放公開 Project URL 和 publishable key；不得放 service role key、資料庫密碼或 OAuth client secret。Google provider 設定在 Supabase Auth；其他社群 provider 不在目前產品登入範圍。
- **下一步：** 驗證匿名登入與帳號刪除 Edge Function，最後以兩部裝置驗證 Supabase Auth、RLS、Realtime、RPC 和歷史流程。

## 正式 Supabase 真人驗收帳號

- **狀態：** Samewave Supabase 是 production 環境。使用者已明確授權建立兩個匿名測試帳號，兩個帳號已建立並用於續玩 RPC 驗收。每個帳號目前各有兩筆測試對局歷史，依既定 90 天期限清除；session token 留在本機測試環境，不寫入 repository、文件或回覆。不得將測試帳號加入公開隨機配對佇列。
- **真人驗收：** 後續使用這兩個帳號在隔離瀏覽器／裝置完成 RLS、session 恢復和 Realtime 通知驗收；保留帳號以便後續流程回歸，不需建立更多測試帳號。
- **刪除驗收：** `delete-account` 涉及不可逆資料刪除，刪除兩個測試帳號仍須另外明確授權；驗收前維持 `accountDeletionEnabled: false`。

## 手動部署後的 Supabase migration ledger

- **狀態：** 官方 Supabase CLI 3.2.0 可存取 Samewave production 專案。PR #1 的 `20261121000200_six_digit_invite_codes.sql` 已由 SQL Editor 手動套用，七項遠端功能檢查通過；接著以官方 CLI 將該版本登記為 applied，沒有重跑 SQL 或直接修改 Supabase migration history table。
- **完成記錄：** 2026-11-22 先以 `migration list --remote=bbpfgavabdsdayuprhbp` 確認主線既有的十一個版本，再從包含第十二份檔案的 PR 分支執行 `migration repair --status applied`，最後 `migration list` 確認 `20261119000100` 至 `20261121000200` 共十二個版本 local／remote 逐一一致。
- **操作命令：**

  ```sh
  supabase migration repair --status applied --remote=bbpfgavabdsdayuprhbp --yes 20261121000200
  supabase migration list --remote=bbpfgavabdsdayuprhbp
  supabase migration list --remote=bbpfgavabdsdayuprhbp
  ```

  `repair` 僅登記 migration 歷史，沒有重跑 SQL 或執行 `db push`。後續新增 schema 變更前，先檢視本機與遠端版本及 migration 影響。
- **安全界線：** 專案 access token、資料庫密碼及管理 key 不進版控、不貼入聊天；migration repair 只維護版本紀錄，不代替 schema／權限檢查。修復前先確認 SQL 已成功執行且遠端功能檢查通過，並使用含相同版本 migration 檔案的分支執行 CLI。真實登入、跨裝置權限及帳號刪除驗收仍未完成。
