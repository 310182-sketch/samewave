# 二選一共同點遊戲計畫

最後整理：2026-11-20

## 願景

做一個讓玩家透過二選一問答發現共同點的網站。玩家可以匿名快速開始，也可以使用 Instagram、Facebook、Google、X 或 Threads 登入；再選擇建立房間邀請朋友，或加入隨機配對。雙方回答相同題目後揭曉答案、查看共同點，並能回顧過往對局、找出最有默契的玩家。遊戲結束後，玩家可把結果製成直式分享卡，經本人確認後分享到 Instagram 限時動態。

產品核心是主題配對與問答遊戲，不是聊天網站。前端需清楚、易讀、適合手機使用；後端負責登入、配對、房間同步、結果及歷史紀錄的權限與保存。

## 目前狀態

- **階段：** 互動原型及第一輪瀏覽器版可用性檢查已完成；八份 Supabase migration 草稿、自助刪除帳號 Edge Function 和可重複執行的 PGlite migration 回歸測試已建立。前端已接上邀請房的真人答題、雙方完成才揭曉、雙方確認才前進、完局結果，以及隨機配對佇列、取消、30 秒逾時、重新排隊和重新載入後恢復本人進行中的房間或配對票券；Chrome mock 流程已驗證。headless Chrome 回歸測試也涵蓋配對取消競態、房間恢復及配對票券恢復。另已加入玩家檢舉／封鎖、封鎖清單、隱私告知和受設定控制的刪除帳號入口；資料庫安全及刪除流程通過 PGlite 預檢。原型亦保留首頁、主題選擇、示範配對、五題作答和分享結果。
- **已驗證：** Chrome headless 在 320、360、390、768、1024、1440px 檢查首頁、遊戲及結果頁，皆無水平溢出；以鍵盤在六種寬度完成五題流程。已改善選項字級、觸控尺寸、焦點提示及作答狀態語意。
- **仍待線上驗證：** 工作區沒有 Supabase URL／公開 key，無法使用真實登入、房間或配對服務。邀請房答題與隨機配對前端已接上 RPC，並以 Chrome mock 驗證成功揭曉、雙方確認、結果讀取、配對成功、逾時重試及取消；尚未在 Supabase Realtime 或兩部裝置驗證。歷史頁查詢、分頁、默契排名及逐筆刪除 RPC 也已用 Chrome mock 驗證，但不能查詢真實對局。結果頁已能產生 1080×1920 PNG，支援系統分享面板及下載備援；尚未在 iOS／Android 實機確認 Instagram 交接。
- **後端：** 本機 PGlite 預檢會自動依檔名排序並套用 `supabase/migrations/` 中所有 SQL migration；12 項可重複執行的回歸測試涵蓋 migration 權限、本人進行中房間／配對票券恢復權限、雙人揭曉與歷史、隨機配對相容／封鎖／取消、封鎖與配對／邀請加入共用交易鎖、歷史游標分頁與共同點排名門檻、本人歷史讀取與刪除權限、security-definer 函式固定空 `search_path` 且不能由匿名角色執行、24／90／180 天資料清理、配對／開房限量、檢舉，以及刪除帳號時關閉房間、移除本人歷史並匿名化對手歷史和檢舉帳號連結。run 53 的 PostgreSQL 16 多連線測試驗證封鎖、邀請加入、兩種配額，以及取消先鎖時配對略過、配對先鎖時取消回報 `matched`；這些檢查不等同 Supabase Auth、Realtime 或 RLS 驗證。自助刪除 Edge Function 已通過 Deno 型別、lint、格式檢查及 7 個本機 request 子測試。函式尚未部署，且尚未建立 Supabase 專案，線上 Auth、Realtime、清理排程和 Supabase 環境 RLS 仍未驗證。
- **資料政策：** 真人房間、配對票券及原始答案最多保留 24 小時；個人歷史摘要保存 90 天且可逐筆刪除；檢舉資料保存 180 天；封鎖關係保留至解除或刪除帳號。這些是目前採用的 MVP 預設，尚未部署或在 Supabase 驗證。
- **登入與社群：** 已加入可選的 Supabase Auth 前端入口，包含匿名登入、Google／Facebook／X OAuth、Instagram／Threads custom provider 設定、PKCE session 恢復及匿名帳號 identity linking。Chrome mock client 已驗證登入狀態和 provider 呼叫；尚無 Supabase URL／anon key，登入按鈕目前停用，live login／callback／帳號 linking 仍未設定或驗證。平台限制見 [knowledge/decision.md](decision.md)。
- **前端設計：** 已完成第一輪整體字級、留白、按鈕及主題選項版面整理；房間、真人答題、隨機配對等待及歷史頁已接上 RPC，無設定時仍保留清楚標示的操作預覽。Chrome mock 驗證流程分支；六種寬度與鍵盤流程的前一輪檢查已通過。真人服務環境的實際網路狀態仍待驗證。
- **發布：** GitHub Pages 與 Actions workflow 已備妥，但 `samewave` 獨立 repository 尚待建立並發布；成功後的預定網址為 [https://310182-sketch.github.io/samewave/](https://310182-sketch.github.io/samewave/)。先前 `riddle-match` 的 Pages 部署屬於另一個專案，不能視為本專案已發布。真人登入和後端尚未設定，仍維持停用狀態。
- **安全營運：** 前端及後端草稿已提供同房檢舉、封鎖與解除封鎖、服務端配對／開房限量及隱私告知。案件受限於服務端管理權限，限期 180 天清除。已在決策紀錄整理案件分流、人工覆核、升級及回覆時限的建議草案；目前仍沒有指定審查人員、玩家聯絡方式、值班安排或審查工具，草案不是現行服務承諾，正式公開前不得宣稱有人即時處理。
- **工作區：** 原型位於 `site/`，可直接開啟 `site/index.html` 操作，不需安裝套件或建置。
- **產品方向：** 本專案以獨立的 `samewave` repository 發布二選一共同點遊戲，不沿用另一專案的 repository 歷史，詳見 [knowledge/decision.md](decision.md)。

## 已確認方向

### 遊戲、房間與配對

- 每局由兩位玩家回答同一主題的選擇題；原型使用五題，每題兩個選項。
- 玩家可建立房間並分享加入方式，也可進入隨機配對佇列。預設房間碼為 12 位英數代碼，等待加入 10 分鐘，單一帳號同時只能參加一個進行中的房間。
- 雙方完成當題作答後才揭曉答案；完成後呈現共同答案及結果。
- 一場遊戲使用一個主題；玩家可指定主題或選擇隨機主題。
- 不把自由聊天作為主要玩法。

### 登入

- 提供匿名登入及 Instagram、Facebook、Google、X、Threads 社群登入。
- 匿名玩家後續連結社群身分時，需保留同一遊戲帳號與可延續的歷史紀錄。
- 各 provider 的官方 OAuth/OIDC 支援、callback、審核及 Supabase 設定列為實作前驗證項目；client secret 不放在 GitHub Pages 前端。

### 歷史紀錄與共同點統計

- 登入玩家可查詢自己最近 90 天已完成的對局，並查看共同選擇與對局結果。
- 歷史紀錄只有本人可見；玩家可以刪除單筆紀錄，刪除帳號時清除本人紀錄。
- 最有共同點的玩家按最近 90 天的共同答案比例排序；至少完成 3 局才納入排名，並顯示對局數及共同答案總數。

### 結果分享

- 結果頁提供 9:16 直式分享卡，呈現主題、共同選擇和品牌識別，不包含登入資料或聯絡資訊。
- 玩家主動按下分享，由手機系統分享面板選擇 Instagram 並自行確認發布；不自動代替玩家發文。
- 瀏覽器不支援分享檔案或沒有 Instagram 分享目標時，提供 PNG 下載。

## 路線圖

### 1. 需求與產品規格

- [x] 確立二選一問答尋找共同點，不做聊天網站。
- [x] 確立兩人一局、單一主題、每題兩個選項；互動原型使用五題。
- [x] 確立玩家可指定主題或使用隨機主題。
- [x] 確立匿名登入與社群登入並存，產品目標 provider 為 Instagram、Facebook、Google、X、Threads。
- [x] 查明 Supabase 內建與 custom provider 支援方式，並記錄 Instagram 專業帳號限制、Threads app review 和 custom provider 名額。
- [x] 確立玩家可建立房間邀請他人，也可使用隨機配對。
- [x] 將已完成遊戲的歷史查詢及最有共同點玩家統計納入產品範圍。
- [x] 定義建立房間使用 12 位代碼；房間等待 10 分鐘後失效，每個帳號同時只能參加一個有效房間。
- [x] 確認房間由建立者分享代碼加入；建立者離開未開始的房間時即關閉房間。
- [x] 定義隨機配對等待上限為 30 秒；逾時可重新排隊，房間閒置 10 分鐘後失效。
- [x] 定義重新載入後依序恢復本人進行中的房間或配對票券；延續原配對期限，逾時只顯示重試入口、不自動建立新票券。
- [x] 定義房間與原始答案於結束後 24 小時清除，個人歷史摘要保存 90 天且可逐筆刪除。
- [x] 定義共同點排名只看最近 90 天，至少 3 局才上榜，依共同答案比例排序並顯示樣本數。
- [x] 定義同房檢舉類別、每房每人一筆、500 字說明上限、180 天保存及人工審查前不自動處分。
- [x] 定義單向封鎖及解除方式；任一方向封鎖時略過隨機配對並拒絕邀請房加入。
- [x] 定義 MVP 帳號層級限量：10 分鐘最多 12 張配對票券、1 小時最多 6 個邀請房。
- [x] 定義隱私告知涵蓋資料用途、暫存及歷史期限、封鎖／檢舉資料和目前無人工即時審查的限制。
- [x] 定義刪除帳號會移除登入身分、本人歷史和封鎖資料；匿名化其他人的歷史，並解除檢舉與帳號 ID 的連結後按原期限清除。
- [ ] 建立 Facebook、Google、X provider app 並驗證 OAuth 2.0 callback、測試帳號與公開環境設定。
- [ ] 評估 Instagram 專業帳號登入與 Threads custom OAuth；完成 Meta app review，驗證 Supabase callback、個人檔案識別及匿名帳號 linking。
- [x] 草擬檢舉案件處理流程與優先級、人工覆核及建議初次檢視時限；明確標為待核准方案，尚未形成服務承諾。
- [ ] 指定案件負責人與審查人員，確認值班時段、玩家聯絡管道及案件回覆方式。
- [ ] 核准各類案件的初次檢視時限、升級條件、處理結果及申訴方式；確認緊急安全事件的對外指引與責任窗口。
- [ ] 依正式服務地區覆核隱私告知、檢舉資料期限及帳號刪除流程。

### 2. 互動原型與前端體驗

- [x] 建立首頁、暱稱輸入、主題選擇、示範配對、逐題作答、答案揭曉及結果頁。
- [x] 加入指定主題與隨機主題；原型提供旅行、音樂、日常、飲食四類。
- [x] 加入手機版版面、鍵盤焦點樣式和減少動態效果支援。
- [x] 畫面切換時將焦點移到新步驟標題，作答揭曉後將焦點移到下一步按鈕。
- [x] 以 Chrome 模擬 320、360、390、768、1024、1440px 寬度檢查首頁，並於手機寬度用鍵盤完成五題流程。
- [x] 依回饋放大主題與答案選項字級，改善觸控高度、焦點外框、答案選取語意及題目進度標記。
- [x] 統一前端字體階層、留白、卡片及按鈕尺寸；放大輔助文字，將主題改為格狀選擇並降低選取框突兀感。
- [x] 用 Chrome 重驗 320、360、390、768、1024、1440px 首頁、遊戲及結果頁，確認沒有水平溢出；以鍵盤在六種寬度完成五題流程。
- [x] 加入登入與玩家身分介面；未設定 Supabase 時清楚停用登入入口，且不影響本機示範流程。
- [ ] 完成後端後，再以不同裝置驗證房間邀請、隨機配對及 90 天歷史查詢權限。
- [x] 加入建立邀請房、複製示範代碼及輸入房間代碼的前端預覽；畫面清楚說明尚未建立跨裝置房間。
- [x] 在已登入且已設定 Supabase 時接上 `create_invite_room`、`join_invite_room` RPC；保留無設定時的明確示範模式，顯示服務回傳的代碼與加入狀態。
- [x] 房主以 `get_invite_room_status` 輪詢對方加入及失效狀態；使用者離房時呼叫 `leave_room`，Chrome mock 驗證建立、加入、配對、離房與逾期流程。
- [x] 加入隨機配對等待、取消及逾時狀態；接上 `queue_for_match`、`get_match_status`、`cancel_matchmaking`，處理 30 秒逾時、重新排隊及配對後進入真人房間；headless Chrome 回歸測試確認狀態查詢尚未完成時點取消會保留操作，若取消回報已配對但缺少房間 ID，後續狀態查詢仍會將玩家帶入房間。
- [x] 設計歷史紀錄與共同點統計頁的空狀態，說明 90 天範圍、三局門檻和本人可見規則。
- [x] 將歷史頁接上本人最近 90 天的對局清單、共同選擇、50 筆游標分頁、默契排名及逐筆刪除 RPC。
- [x] 以 Chrome mock RPC 驗證載入、空清單、錯誤重試、分頁、刪除後刷新、登出清除資料、切換帳號時丟棄舊請求，以及動態文字不會被解讀為 HTML；狀態標題改用 DOM 節點與 `textContent`，不保留 `innerHTML` 插值入口。
- [x] 加入真人對局中的檢舉及封鎖入口、歷史頁封鎖清單和解除封鎖操作；示範對局不顯示真人安全操作。
- [x] 加入隱私與安全告知，明列資料用途和保存期限、檢舉審查限制及避免在自由文字中填寫敏感資料的提醒。
- [x] 加入需明確確認的自助刪除入口；Edge Function 尚未部署時停用按鈕並說明原因，刪除前告知歷史、封鎖和檢舉資料的處理方式。
- [x] 以桌面及 320／360px 瀏覽器預覽檢查隱私說明與歷史空狀態；修正窄螢幕水平溢出並為返回按鈕補上讀屏名稱。
- [x] 建立 1080×1920 結果分享卡、系統分享面板流程與 PNG 下載備援；使用者取消分享時不自動下載或發布。
- [ ] 在 iOS Safari、Android Chrome 實機檢查方向及文字放大版面，並以 VoiceOver 或 TalkBack 驗證。
- [ ] 收集玩家回饋並調整題庫、視覺設計及操作流程。

### 3. 完整後端與真人遊戲服務

- [x] 建立第一版 Supabase SQL migration 初稿，含題庫、配對佇列、房間、答案、RLS、Realtime 安全房間狀態、RPC 及清除函式。
- [x] 擴充 migration 草稿，加入 12 位邀請代碼、建立／加入房間 RPC、單一有效房間檢查及隨機配對互斥。
- [x] 加入完成對局時的雙方私人歷史摘要、90 天查詢與保留、逐筆刪除、共同點排名及帳號刪除匿名化草稿。
- [x] 加入可設定的 Supabase JS Auth client：支援匿名登入、Facebook／Google／X、以 custom provider ID 設定 Instagram／Threads、session 恢復與已登入匿名帳號的 identity linking；未設定時保留示範模式。
- [x] 在本機 PGlite 套用八份 migration，驗證邀請對局五題流程、雙方答完才揭曉／推進、歷史與默契排名、隨機配對，以及非成員房間 RLS 和答案表無直接讀取權。
- [x] 建立安全功能 migration：封鎖清單隔離、封鎖後跳過隨機配對／拒絕邀請加入、同房檢舉 RPC、私有檢舉表、帳號限量 trigger 和 180 天案件清除排程。
- [x] 在本機 PGlite 驗證檢舉需為同房玩家且每房只能提交一次、登入玩家不能直讀檢舉表、封鎖清單限本人查詢、封鎖雙向配對排除、邀請房拒絕封鎖玩家、配對與開房限量及 180 天清除。
- [x] 以 forward-only migration 讓 `block_room_opponent` 與隨機配對／邀請房加入共用 transaction advisory lock；PGlite 確認三個 RPC 使用同一把鎖，避免封鎖寫入與新配對檢查各自無序完成。真實 Supabase 並行交易仍待線上驗證。
- [x] 加入 JWT 驗證的 `delete-account` Edge Function，固定 Supabase JS `2.119.2` 版本並通過 Deno 型別、lint 與格式檢查；由後端 service role 刪除呼叫者本人，以精確 origin allow list 限制瀏覽器呼叫，service role key 不出現在前端。
- [x] 以 Deno 和本機 mock Auth API 測試刪除函式 CORS、origin、HTTP method、缺少／無效 Bearer token，以及忽略用戶端指定 ID、只以已驗證 token 對應的使用者 ID 呼叫管理刪除；測試不連接正式 Supabase 或刪除真實帳號。
- [x] 加入 Auth 使用者刪除前關閉進行中房間、清除房間代碼、取消等待票券和調整對局保留時間的 trigger；PGlite 驗證房間關閉、本人歷史 cascade 清除、對手歷史匿名化、封鎖關係清除，以及檢舉資料保留並解除雙方帳號連結。
- [x] 建立 12 項可重複執行的 Deno／PGlite migration 回歸測試；自動讀取並依檔名排序套用所有 SQL migration，檢查資料表權限、本人進行中房間／配對票券恢復權限、security-definer 函式固定空 `search_path` 且匿名角色不能執行、雙人揭曉和歷史、隨機配對主題相容／封鎖排除／取消、封鎖和配對／邀請加入共用鎖、歷史游標分頁和三局排名門檻、本人歷史讀取／刪除權限、24／90／180 天資料清理、配對與開房限量、檢舉及封鎖、刪除帳號後本人歷史清除與對手歷史匿名化。
- [x] 加入 `get_my_active_room` authenticated RPC，讓登入玩家以自己的 `auth.uid()` 恢復等待或進行中的房間；逾期房間先套用清理，邀請代碼只回傳給建立者，匿名及非成員無法探索他人房間。PGlite 驗證權限、等待／遊戲中狀態及回傳資料。
- [x] 加入 `get_my_matchmaking_ticket` authenticated RPC；只依 `auth.uid()` 查詢本人尚有效的等待票券，逾時時更新票券狀態，並在房間查詢與配對完成競速時回傳本人剛配對的有效房間。PGlite 驗證本人／他人隔離、等待／逾時／已配對狀態及匿名拒絕。
- [x] 在一次性 PostgreSQL 16 資料庫加入多連線整合測試，重現封鎖交易和隨機配對、邀請加入的交錯，確認兩種請求都等待共用 advisory lock，並在封鎖提交後分別不配對和拒絕加入；run 45 的 GitHub Actions `block_race` job 通過。測試僅允許連接 loopback 主機。
- [x] 在 PostgreSQL 16 多連線整合測試驗證同一帳號接近邀請房上限時並行呼叫 `create_invite_room`，確認交易鎖會序列化計數並拒絕第七間房；run 48 的 `block_race` job 通過。
- [x] 在 PostgreSQL 16 多連線整合測試驗證同一帳號接近配對票券上限時並行呼叫 `queue_for_match`，確認不會因交易競態建立超過每 10 分鐘 12 張的票券；run 50 的 `block_race` job 通過。
- [x] 在 PostgreSQL 16 多連線整合測試驗證取消與配對競爭同一張等待票券：取消先取得列鎖時配對略過該票券；配對先取得列鎖時，取消等待後回報 `matched`；run 53 的 `block_race` job 通過。
- [x] 以新增 migration 修正帳號刪除時檢舉只解除已刪除一方關聯的缺口；只要案件任一涉事玩家刪除帳號，就保留 180 天案件內容並同時清除兩方 ID。
- [x] 將 Deno／PGlite migration 與 Edge Function 回歸測試接入 Pages workflow，驗證完成後才部署，並將 `pages: write`／`id-token: write` 權限限制在部署 job；run 41 已在 GitHub runner 完成驗證及部署。
- [x] 將 PostgreSQL 16 多連線競態測試加入獨立 CI job，並要求它和既有 verify job 都成功後才部署；run 53、54、55、57 的 verify、`block_race` 與 deploy 均通過。
- [x] 將配對取消前端競態加入 headless Chrome mock 回歸測試，並放入 Pages workflow 的部署前驗證；確認取消在狀態查詢進行中不會被忽略，且已配對時能透過後續狀態查詢恢復房間；run 57 的 verify、`block_race` 與 deploy 全部通過。
- [x] 將重新載入恢復進行中房間加入 headless Chrome mock 並接入 Pages workflow；本機 migration 與瀏覽器檢查通過；run 59 的 verify、block_race 及 deploy 全部成功。
- [x] 將重新載入恢復隨機配對票券、延續原等待期限及配對成功後進房加入 headless Chrome mock 和 Pages workflow；本機檢查通過；run 61 的 verify、block_race 及 deploy 全部成功。
- [ ] 建立 Supabase 專案與開發／正式環境，啟用 Anonymous Auth，套用並實際驗證 migration。
- [ ] 啟用 Supabase Manual Linking；設定本機與 GitHub Pages redirect allow list 及 Google／Facebook／X callback。
- [ ] 完成 RLS、Realtime、RPC 權限和資料驗證；確保玩家只能查看有權存取的房間、答案與紀錄。
- [ ] 接上匿名登入、匿名帳號手動 linking 及 Facebook／Google／X 登入，處理 session 恢復、callback 與錯誤狀態。
- [ ] 依 Meta 的帳號資格及 app review 狀態加入 Instagram、Threads custom OAuth，確認 provider 身分能連結到原匿名玩家。
- [ ] 使用實際 Supabase 專案設定驗證登入／登出、OAuth callback、頁面重載後的 session 恢復及匿名帳號 linking。
- [x] 將邀請房建立、代碼加入、房主狀態查詢及離房接上 authenticated RPC；目前只在 Chrome mock 驗證，尚無線上 Supabase 設定。
- [x] 加入遊戲房間後以 `get_room_state` 還原題目，訂閱 `game_rooms` Realtime 更新並保留輪詢備援；Realtime 事件只觸發重新查詢，不傳送答案。
- [x] 以 `submit_answer` 送出答案，只在伺服器確認雙方都回答後顯示答案；以 `continue_room` 等待雙方確認並推進題目，結束後讀取 `get_room_results`。Chrome mock 驗證五題作答、答案揭曉、確認等待和完局結果。
- [x] Auth session 恢復後依序呼叫 `get_my_active_room` 與 `get_my_matchmaking_ticket`；重新載入時回到本人等待中的邀請房／隨機配對，或接回剛配對的真人對局，並在使用者切換帳號或離開首頁後丟棄過期回應。headless Chrome mock 驗證等待、後續配對及載入當前題目。
- [x] 將隨機配對接上 `queue_for_match`、`get_match_status` 與 `cancel_matchmaking`，處理 30 秒逾時及重新排隊；Chrome mock 驗證配對成功、逾時重試和取消。
- [x] 加入遠端遊戲與配對前端錯誤處理：重複送出防護、房間逾時、離線後重試、中途離開、使用 `get_my_active_room` 與 `get_my_matchmaking_ticket` RPC 在重新載入後恢復房間或配對、取消佇列及完局歷史寫入 migration。若取消在配對狀態 RPC 執行期間發生，前端先保留取消意圖並於 RPC 結束後送出；取消回報已配對但未回傳房間 ID 時繼續查詢狀態。headless Chrome mock 已驗證此流程；真人服務的 RLS、網路中斷和跨裝置行為仍待 Supabase 環境驗證。
- [x] 建立已完成對局的持久紀錄與受權限保護的歷史查詢 RPC 草稿，按定案的保存政策清除或匿名化資料。
- [x] 建立玩家共同點彙總 RPC 草稿，依共同答案比例排序並回傳對局數、共同答案數和比例。
- [ ] 使用 Supabase 真實使用者資料驗證歷史分頁游標、90 天保留、逐筆刪除、排名門檻及只允許本人查詢的權限。
- [ ] 安全保存 provider secret；靜態前端僅使用公開 project URL 與 anon key，不暴露 service role key。
- [ ] 在兩部不同裝置上驗證建立房間、代碼加入、隨機配對、完整遊戲、歷史查詢和統計。
- [ ] 使用正式 Supabase Auth／RLS 驗證封鎖及解除封鎖、邀請房封鎖競態、檢舉權限、限量競態與 180 天清理排程。
- [ ] 建立僅授權審查人員可用的案件佇列與審查紀錄，包含狀態、處理結果、存取稽核及到期清除；不得開放一般玩家讀取檢舉表。
- [ ] 依核准的案件分流流程完成檢舉提交、人工審查、玩家回覆、升級及期限清除的端對端驗證。
- [ ] 部署帳號刪除 Edge Function，設定 `ALLOWED_ORIGINS` 和 Supabase 後端 service role secret，真人驗證後才將 `accountDeletionEnabled` 設為 `true`。
- [ ] 在正式 Supabase 驗證匿名及社群帳號刪除、JWT／origin 拒絕、Auth 資料清理、歷史匿名化及正在進行的對局收尾。
- [ ] 在 Supabase 真人環境檢查檢舉表單、對局安全操作和封鎖清單；再以 iOS／Android 與 VoiceOver／TalkBack 驗證。

### 4. 分享與發布

- [x] 實作結果分享卡及使用者主動觸發的系統分享面板；使用者需自行選擇 Instagram 並確認發布。
- [ ] 在 iOS／Android 實機確認分享檔案可交給 Instagram 限時動態，並檢查取消分享與 PNG 下載備援。
- [ ] 建立獨立的 `samewave` GitHub repository，將遊戲原型與文件發布至 `main`，啟用 GitHub Pages Actions 並確認部署成功及公開網址內容。
- [ ] 為線上版本設定 Supabase URL／anon key 與 OAuth callback；確認公開金鑰及資料權限設定正確。
- [ ] 真人房間、配對、登入、紀錄及統計完成驗證後，再部署正式版本並確認跨裝置行為。
- [ ] 根據玩家回饋改善題目品質、配對體驗、前端版面及歷史統計可讀性。
