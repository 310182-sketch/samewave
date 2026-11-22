# 二選一共同點遊戲計畫

最後整理：2026-11-22

## 願景

做一個讓玩家透過二選一問答發現共同點的網站。玩家以匿名身分開始，瀏覽器會記住目前裝置的玩家狀態；再選擇主題、每局 5／10／15 題，建立房間邀請朋友或加入相同題數的隨機配對。雙方回答後揭曉答案、查看共同點，並能查詢歷史紀錄、與同一位玩家續玩。遊戲結果可由玩家確認後分享。

產品核心是主題配對與問答遊戲，不是聊天網站。前端需清楚、易讀、適合手機使用；後端負責登入、配對、房間同步、結果及歷史紀錄的權限與保存。

## 目前狀態

- **階段：** 15 個主題各 15 題與每局 5／10／15 題已實作；K-pop 題目為追星情境，其餘 14 個主題已改成具體日常情境。前端快取版本 `app.js?v=22` 已部署；題庫內容 migration `20261122000400_refine_kpop_fandom_questions.sql` 和 `20261122000500_refine_everyday_topic_questions.sql` 尚未套用至 Samewave production，真人對局仍讀取原題庫。
- **已驗證：** 360px headless Chrome 的手機可讀性及 5／10／15 題流程通過；Node 語法與題庫解析確認 15 個主題各 15 題，210 筆 migration 和前端題目逐題一致。Actions run [#45021996623](https://github.com/310182-sketch/samewave/actions/runs/45021996623) 的題庫 parity、`block_race`、`deploy` 全成功；run [#45022926868](https://github.com/310182-sketch/samewave/actions/runs/45022926868) 的全主題逐題 Chrome 覆蓋也通過。真人邀請、配對、跨裝置及 RLS 流程仍待實測。
- **仍待線上驗證：** 匿名登入及 session 恢復、真人房間／配對／歷史資料、完整 RLS 權限和跨裝置流程尚未實測。邀請房答題與隨機配對前端已接上 RPC，Chrome mock 驗證成功揭曉、雙方確認、結果讀取、配對成功、逾時重試及取消；尚未在 Supabase Realtime 或兩部裝置驗證。歷史頁查詢、分頁、默契排名及逐筆刪除也僅以 mock 驗證。結果分享卡尚未在 iOS／Android 實機確認 Instagram 交接。
- **後端：** 既有 migration ledger 維持 15/15；K-pop 15 筆和其他主題 210 筆內容 migration 均已推送，但尚未套用至 production。真實使用者流程仍待測試。
- **資料政策：** 真人房間、配對票券及原始答案最多保留 24 小時；個人歷史摘要保存 90 天且可逐筆刪除；檢舉資料保存 180 天；封鎖關係保留至解除或刪除帳號。相關 migration 與清理排程已部署，但資料保留週期和逾期刪除尚未經過實際時間週期驗證。
- **登入與社群：** 玩家頁只提供 Supabase Anonymous Auth，persistSession 保存目前瀏覽器的玩家 session；清除網站資料或換裝置可能無法找回匿名帳號。玩家端 Google 登入和 linking 已移除；Google provider 保留給獨立審查頁的核准審查員，不切換 Google OAuth 玩家 Production，也不刪除既有帳號。
- **前端設計：** 已完成第一輪整體字級、留白、按鈕及主題選項版面整理；登入卡片以獨立視覺層級呈現，同時保留先玩示範的主要流程。房間、真人答題、隨機配對等待及歷史頁已接上 RPC，無設定時仍保留清楚標示的操作預覽。Chrome mock 驗證流程分支；六種寬度與鍵盤流程的前一輪檢查已通過。真人服務環境的實際網路狀態仍待驗證。
- **發布：** 前端 `app.js?v=22`、14 類新題目及題庫一致性測試已推送 Samewave `main`。Actions run [#45021996623](https://github.com/310182-sketch/samewave/actions/runs/45021996623) 的 `verify`、`block_race`、`deploy` 全成功；公開首頁載入 `app.js?v=22` 且含新版題目。兩份題庫 migration 尚未套用至 Supabase，因此真人對局仍使用資料庫中的舊題。真人新題數房間／配對及隔離裝置流程仍待驗收。
- **安全營運：** 前端已提供同房檢舉、封鎖／解除封鎖及隱私告知，並有獨立的審查員工作區；後端提供 allowlist、遮蔽細節的案件佇列、領案／結案及私有稽核事件，PGlite 和 headless Chrome 權限鎖定情境已由 CI 驗證。尚未建立審查員帳號或指定實際審查人員、玩家聯絡方式與值班安排；現有流程草案不是服務承諾，正式公開前不得宣稱有人即時處理。
- **工作區：** 原型位於 `site/`，可直接開啟 `site/index.html` 操作，不需安裝套件或建置。
- **產品方向：** 本專案以獨立的 `samewave` repository 發布二選一共同點遊戲，不沿用另一專案的 repository 歷史，詳見 [knowledge/decision.md](decision.md)。

## 已確認方向

### 遊戲、房間與配對

- 每局由兩位玩家回答同一主題、每題兩個選項；玩家可選 5、10 或 15 題，預設 5 題。
- 玩家可建立房間並分享六位數字邀請碼，也可進入隨機配對佇列。六碼代碼需有服務端猜測限流；過渡期接受尚未過期的舊 12 碼代碼。房間等待 10 分鐘，單一帳號同時只能參加一個進行中的房間。
- 雙方完成當題作答後才揭曉答案；完成後呈現共同答案及結果。
- 真人對局完成後可邀請同一位玩家再玩；對方接受後，以相同主題、新房間及新歷史紀錄開始。邀請 10 分鐘後失效；任一方已封鎖對方或正參加其他有效房間時不建立新局。示範對局仍使用本機「再玩一局」。
- 一場遊戲使用一個主題；玩家可指定主題或選擇隨機主題。
- 目前提供 15 個主題，每類 15 題。邀請房與續玩沿用題數；隨機配對只媒合相同題數。
- 不把自由聊天作為主要玩法。

### 登入

- 玩家使用匿名登入；session 保存在目前瀏覽器，清除網站資料或更換裝置後可能無法取回匿名帳號。
- 玩家頁不提供社群登入或匿名身分 linking；Google 僅供獨立案件審查頁的核准審查員使用。
- 不再把 Google OAuth Production 發布列為玩家上線條件；Supabase Google provider 保留供審查員登入，既有帳號與資料不刪除。

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
- [x] 將每局題數訂為 5／10／15 題，預設五題；隨機配對須題數相同，邀請房與同玩家續玩沿用該設定。
- [x] 確立玩家可指定主題或使用隨機主題。
- [x] 玩家使用匿名登入並由瀏覽器保存 session；移除玩家頁 Google 登入與 linking，保留審查員工作區的 Google 登入。
- [x] 查明 Supabase 內建與 custom provider 支援方式，並記錄 Instagram 專業帳號限制、Threads app review 和 custom provider 名額。
- [x] 確立玩家可建立房間邀請他人，也可使用隨機配對。
- [x] 將已完成遊戲的歷史查詢及最有共同點玩家統計納入產品範圍。
- [x] 定義新建邀請房使用六位數字代碼並由服務端限制猜測；過渡期接受尚未過期的舊 12 碼代碼。房間等待 10 分鐘後失效，每個帳號同時只能參加一個有效房間。
- [x] 確認房間由建立者分享代碼加入；建立者離開未開始的房間時即關閉房間。
- [x] 定義隨機配對等待上限為 30 秒；逾時可重新排隊，房間閒置 10 分鐘後失效。
- [x] 定義重新載入後依序恢復本人進行中的房間或配對票券；延續原配對期限，逾時只顯示重試入口、不自動建立新票券。
- [x] 定義房間與原始答案於結束後 24 小時清除，個人歷史摘要保存 90 天且可逐筆刪除。
- [x] 定義共同點排名只看最近 90 天，至少 3 局才上榜，依共同答案比例排序並顯示樣本數。
- [x] 定義同房檢舉類別、每房每人一筆、500 字說明上限、180 天保存及人工審查前不自動處分。
- [x] 定義單向封鎖及解除方式；任一方向封鎖時略過隨機配對並拒絕邀請房加入。
- [x] 定義同一玩家續玩需雙方同意；沿用來源對局主題和兩位玩家，新局使用全新房間／答案／歷史；邀請 10 分鐘到期，封鎖或任一方正在其他有效房間時拒絕建立。
- [x] 定義 MVP 帳號層級限量：10 分鐘最多 12 張配對票券、1 小時最多 6 個邀請房。
- [x] 定義隱私告知涵蓋資料用途、暫存及歷史期限、封鎖／檢舉資料和目前無人工即時審查的限制。
- [x] 定義刪除帳號會移除登入身分、本人歷史和封鎖資料；匿名化其他人的歷史，並解除檢舉與帳號 ID 的連結後按原期限清除。
- [x] 曾建立並驗收 Google OAuth 玩家登入；依使用者新決定從玩家頁移除，未刪除雲端帳號、provider 或資料。原紀錄：
- [x] 決定不提供 Facebook、X、Instagram、Threads 登入；Instagram 結果分享仍是獨立功能。
- [x] 過去曾將 Google 設為唯一玩家社群登入；現已撤下玩家入口，保留給核准審查員使用。Supabase 確認紀錄：
- [x] 草擬檢舉案件處理流程與優先級、人工覆核及建議初次檢視時限；明確標為待核准方案，尚未形成服務承諾。
- [ ] 指定案件負責人與審查人員，確認值班時段、玩家聯絡管道及案件回覆方式。
- [ ] 核准各類案件的初次檢視時限、升級條件、處理結果及申訴方式；確認緊急安全事件的對外指引與責任窗口。
- [ ] 依正式服務地區覆核隱私告知、檢舉資料期限及帳號刪除流程。

### 2. 互動原型與前端體驗

- [x] 新增 K-pop、F1、價值觀、感情觀及中立政治題庫；每類擴充至 15 題。K-pop 題目涵蓋回歸行程、打歌／直拍、小卡收藏與交換、台灣場售票、應援棒、應援法及粉絲見面會等追星情境。政治題不指定政黨或候選人，資料保存期限已加到隱私告知。正式 Supabase 套用狀態另列於後端路線。
- [x] 將 K-pop 以外 14 個主題的 15 題改成具體日常情境，讓二選項呈現可比較的做法；政治題維持不帶政黨／候選人立場。
- [x] 產生只更新上述 14 個主題、共 210 筆的 forward-only migration，並逐題核對 SQL 與前端題目及選項相同；不覆寫既有 migration，也不改寫 K-pop 題目。
- [x] 以 PGlite 套用全部 migration 後，逐題比對資料庫與前端 15 個主題共 225 筆；GitHub Actions run #45021996623 的 `verify` 通過。
- [x] 建立首頁、暱稱輸入、主題選擇、示範配對、逐題作答、答案揭曉及結果頁。
- [x] 加入指定主題與隨機主題；原型提供旅行、音樂、日常、飲食四類。
- [x] 題庫擴充至 15 類、每類 15 題；加入每局 5／10／15 題選項，預設 5 題。邀請房、隨機配對、進度、結果、分享卡、歷史與續玩沿用所選題數；random matchmaking 僅配對相同題數。
- [x] 使用 headless Chrome 跑完本機 5、10、15 題示範對局，確認題目進度、完成題數、結果摘要及主題在流程間一致；Pages workflow 在部署前執行此測試。
- [x] 更新 headless Chrome 題數流程，逐題核對 15 個 K-pop prompt，並保留 5／10／15 題及其他主題流程；本機測試通過。
- [x] 擴充 360px headless Chrome 流程，逐題操作全部 15 個主題各 15 題，檢查題目／選項非空、選項不重複、遊戲與結果頁沒有水平溢出；並保留 5／10／15 題數流程。本機及 Actions run #45022926868 通過。
- [x] 在 360px headless Chrome 題數流程檢查主題及題數選項的 computed font-size 至少 14px，並確認首頁沒有水平溢出；本機 5／10／15 題和 K-pop 逐題流程通過；Actions run [#45019607947](https://github.com/310182-sketch/samewave/actions/runs/45019607947) 的 verify、block_race、deploy 均成功。
- [x] 以 PGlite 逐列比對 15 個 K-pop prompt 和雙選項；Actions run #45018311959 的 `verify` 通過。本機未安裝 Deno，由 CI 執行 PGlite。
- [x] 加入手機版版面、鍵盤焦點樣式和減少動態效果支援。
- [x] 畫面切換時將焦點移到新步驟標題，作答揭曉後將焦點移到下一步按鈕。
- [x] 以 Chrome 模擬 320、360、390、768、1024、1440px 寬度檢查首頁，並於手機寬度用鍵盤完成五題流程。
- [x] 依回饋放大主題與答案選項字級，改善觸控高度、焦點外框、答案選取語意及題目進度標記。
- [x] 統一前端字體階層、留白、卡片及按鈕尺寸；放大輔助文字，將主題改為格狀選擇並降低選取框突兀感。
- [x] 用 Chrome 重驗 320、360、390、768、1024、1440px 首頁、遊戲及結果頁，確認沒有水平溢出；以鍵盤在六種寬度完成五題流程。
- [x] 加入登入與玩家身分介面；未設定 Supabase 時清楚停用登入入口，且不影響本機示範流程。
- [x] 將登入卡片放在遊戲設定下方並提高辨識度；玩家只使用匿名登入，並說明瀏覽器 session 與資料清除風險。
- [x] Supabase 上線後更新登入卡狀態與新手說明，清楚標出匿名登入和 Google provider 已啟用，並說明登入後可使用邀請房、隨機配對及歷史紀錄；更新 `app.js` 快取版本。
- [x] 公開 Supabase Auth settings helper 保留給審查員頁使用；玩家頁不查詢也不顯示 Google provider。
- [x] 曾收斂到 Google-only；現已移除玩家頁 Google OAuth 按鈕及呼叫，審查員頁的 Google 登入保留。
- [x] 移除玩家頁面的 Google 登入並部署；玩家使用匿名登入，Google provider 僅供核准的案件審查員登入。
- [x] 將暱稱欄提示設為「企鵝」，並將遊戲畫面預設、前端 fallback 與資料庫 RPC 的空值／空白 fallback 統一為「企鵝」；Deno/PGlite 回歸測試覆蓋建立房間、加入房間和隨機配對；Actions run #7 的 verify、block_race 和 deploy 成功。部署後更改既有 RPC 預設時應新增 forward-only migration。
- [ ] 完成後端後，再以不同裝置驗證房間邀請、隨機配對及 90 天歷史查詢權限。
- [x] 加入建立邀請房、複製示範代碼及輸入房間代碼的前端預覽；畫面清楚說明尚未建立跨裝置房間。
- [x] 在已登入且已設定 Supabase 時接上 `create_invite_room`、`join_invite_room` RPC；保留無設定時的明確示範模式，顯示服務回傳的代碼與加入狀態。
- [x] 房主以 `get_invite_room_status` 輪詢對方加入及失效狀態；使用者離房時呼叫 `leave_room`，Chrome mock 驗證建立、加入、配對、離房與逾期流程。
- [x] 加入隨機配對等待、取消及逾時狀態；接上 `queue_for_match`、`get_match_status`、`cancel_matchmaking`，處理 30 秒逾時、重新排隊及配對後進入真人房間；headless Chrome 回歸測試確認狀態查詢尚未完成時點取消會保留操作，若取消回報已配對但缺少房間 ID，後續狀態查詢仍會將玩家帶入房間。
- [x] 設計歷史紀錄與共同點統計頁的空狀態，說明 90 天範圍、三局門檻和本人可見規則。
- [x] 將歷史頁接上本人最近 90 天的對局清單、共同選擇、50 筆游標分頁、默契排名及逐筆刪除 RPC。
- [x] 以 Chrome mock RPC 驗證載入、空清單、錯誤重試、分頁、刪除後刷新、登出清除資料、切換帳號時丟棄舊請求，以及動態文字不會被解讀為 HTML；狀態標題改用 DOM 節點與 `textContent`，不保留 `innerHTML` 插值入口。
- [x] 結果頁新增與同一位真人玩家續玩的邀請區；只有雙方同意才進入新房間，並以來源房間 Realtime 更新加輪詢備援追蹤邀請狀態。headless Chrome mock 驗證建立邀請、等待及進入新局；migration 已部署，兩個正式測試 session 的續玩 RPC 和歷史保存已驗收。GitHub Pages 前端和 Realtime 跨裝置通知仍待驗證。
- [x] 加入真人對局中的檢舉及封鎖入口、歷史頁封鎖清單和解除封鎖操作；示範對局不顯示真人安全操作。
- [x] 加入隱私與安全告知，明列資料用途和保存期限、檢舉審查限制及避免在自由文字中填寫敏感資料的提醒。
- [x] 加入需明確確認的自助刪除入口及資料處理告知；Edge Function 尚未通過真實 JWT／刪除驗收，因此目前仍停用按鈕並說明原因。
- [x] 以桌面及 320／360px 瀏覽器預覽檢查隱私說明與歷史空狀態；修正窄螢幕水平溢出並為返回按鈕補上讀屏名稱。
- [x] 建立 1080×1920 結果分享卡、系統分享面板流程與 PNG 下載備援；使用者取消分享時不自動下載或發布。
- [ ] 在 iOS Safari、Android Chrome 實機檢查方向及文字放大版面，並以 VoiceOver 或 TalkBack 驗證。
- [ ] 收集玩家回饋並調整題庫、視覺設計及操作流程。

### 3. 完整後端與真人遊戲服務

- [x] 將三份 forward-only migration 套用至 Samewave production；Supabase CLI 確認 remote ledger 15/15，本機 PGlite 20 項回歸通過。遠端唯讀查詢確認 15 類各 15 題、5／10／15 題 constraints、新舊邀請／配對 RPC 及續玩 RPC 存在。
- [ ] 在 Samewave production 執行 K-pop migration `20261122000400_refine_kpop_fandom_questions.sql`（使用者先前已授權）及其餘主題 migration `20261122000500_refine_everyday_topic_questions.sql`（新 migration 待確認）；執行前檢查遠端 migration ledger，完成後唯讀比對 225 筆題目與 repository。不要只套用其中一份，以免真人題庫短暫出現版本不一致。
- [ ] 用兩個已授權測試 session 驗證 production 邀請房 10／15 題、相同題數隨機配對、跨題數不配對、續玩題數繼承與歷史；尚未驗證前不把本機 PGlite 結果描述成真人流程通過。
- [ ] 完成完整真人線上服務後端驗收：資料庫 migration、migration ledger、Anonymous Auth／Manual Linking、核心 schema、主要 RLS、Realtime publication、清理排程及帳號刪除 Edge Function 已部署或設定；仍須以真實登入、跨裝置對局和權限測試驗證。migration、mock 或 CI 通過都不單獨算完成。
- [x] 新增並部署同一玩家續玩 migration：私有邀請資料、10 分鐘逾期、雙方同意、相同玩家與主題的新房間、封鎖／有效房間檢查；18 項 PGlite migration 測試通過，CLI 確認第十一份 migration 已列入遠端 ledger。
- [x] 用兩個已授權的 Supabase production 測試 session 驗證邀請房、完整五題對局、雙方同意續玩、新房間狀態及新舊歷史分開保存；沒有刪除帳號或使用隨機配對。
- [x] 將真人遊戲與同玩家續玩改為 Realtime 通知搭配輪詢備援；健康頻道每 10 秒重新讀取權威 RPC，頻道錯誤／逾時／關閉時縮短為每 3.5 秒。headless Chrome 檢查跨房間 filter、事件觸發重新讀取、fallback 及恢復後間隔。
- [x] 發布 Realtime 續玩與六碼邀請前端；PR #1 rebase merge 後 Actions run 44931736216 的 verify、block_race、deploy 全成功，公開頁載入 `app.js?v=19`。
- [ ] 以兩部隔離裝置驗證 Realtime 續玩通知和端到端前端切換；程式碼已上線，但尚未完成隔離裝置真人推播驗收。
- [x] 建立第一版 Supabase SQL migration 初稿，含題庫、配對佇列、房間、答案、RLS、Realtime 安全房間狀態、RPC 及清除函式。
- [x] 擴充 migration 草稿，加入 12 位邀請代碼、建立／加入房間 RPC、單一有效房間檢查及隨機配對互斥。
- [x] 加入完成對局時的雙方私人歷史摘要、90 天查詢與保留、逐筆刪除、共同點排名及帳號刪除匿名化草稿。
- [x] 加入可設定的 Supabase JS Auth client：支援匿名登入、Google OAuth、session 恢復與匿名帳號 identity linking；未設定時保留示範模式。
- [x] 在 PGlite 套用原有 migration，驗證邀請對局五題流程、雙方答完才揭曉／推進、歷史與默契排名、隨機配對，以及非成員房間 RLS 和答案表無直接讀取權。
- [x] 建立安全功能 migration：封鎖清單隔離、封鎖後跳過隨機配對／拒絕邀請加入、同房檢舉 RPC、私有檢舉表、帳號限量 trigger 和 180 天案件清除排程。
- [x] 在本機 PGlite 驗證檢舉需為同房玩家且每房只能提交一次、登入玩家不能直讀檢舉表、封鎖清單限本人查詢、封鎖雙向配對排除、邀請房拒絕封鎖玩家、配對與開房限量及 180 天清除。
- [x] 以 forward-only migration 讓 `block_room_opponent` 與隨機配對／邀請房加入共用 transaction advisory lock；PGlite 確認三個 RPC 使用同一把鎖，避免封鎖寫入與新配對檢查各自無序完成。真實 Supabase 並行交易仍待線上驗證。
- [x] 加入 JWT 驗證的 `delete-account` Edge Function，固定 Supabase JS `2.119.2` 版本並通過 Deno 型別、lint 與格式檢查；由後端 service role 刪除呼叫者本人，以精確 origin allow list 限制瀏覽器呼叫，service role key 不出現在前端。
- [x] 以 Deno 和本機 mock Auth API 測試刪除函式 CORS、origin、HTTP method、缺少／無效 Bearer token，以及忽略用戶端指定 ID、只以已驗證 token 對應的使用者 ID 呼叫管理刪除；測試不連接正式 Supabase 或刪除真實帳號。
- [x] 加入 Auth 使用者刪除前關閉進行中房間、清除房間代碼、取消等待票券和調整對局保留時間的 trigger；PGlite 驗證房間關閉、本人歷史 cascade 清除、對手歷史匿名化、封鎖關係清除，以及檢舉資料保留並解除雙方帳號連結。
- [x] 將 Deno／PGlite migration 回歸測試擴至 14 項，並驗證第十份 forward-only 主題 migration；新增案例涵蓋十類題庫、六個新增類別的邀請房／隨機配對，以及未知 topic 拒絕。Actions run #5 通過。
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
- [x] 新增審查工作區權限鎖定的 headless Chrome 回歸情境，覆蓋 allowlist 拒絕／請求失敗、登出期間晚到的權限結果，以及敏感案件文字與佇列清除；納入 Pages 部署前驗證，Actions run #15 的 verify、block_race 和 deploy 全部成功。
- [x] 將重新載入恢復進行中房間加入 headless Chrome mock 並接入 Pages workflow；本機 migration 與瀏覽器檢查通過；run 59 的 verify、block_race 及 deploy 全部成功。
- [x] 將重新載入恢復隨機配對票券、延續原等待期限及配對成功後進房加入 headless Chrome mock 和 Pages workflow；本機檢查通過；run 61 的 verify、block_race 及 deploy 全部成功。
- [x] 建立獨立 Samewave Supabase 專案（Singapore），啟用 Anonymous Auth 和 Manual Linking，並設定 GitHub Pages／localhost redirect allow list。
- [x] 將十份 SQL migration 依檔名順序透過 Supabase SQL Editor 套用；後續 CLI ledger 曾缺少這些版本，已在下一項同步。
- [x] 以官方 Supabase CLI 將 `20261119000100`、`20261120000100` 至 `20261120000900` 十個已部署版本執行 `migration repair --status applied`，並確認 `migration list` 的 local／remote 版本完全相同。修復前唯讀核對 schema、題庫、RPC、觸發器、RLS、Realtime 和清理排程；沒有執行 `db push` 或重跑 SQL。詳見 [knowledge/decision.md](decision.md)。
- [x] 以官方 Supabase CLI 將已手動套用的 `20261121000200` 登記為 applied，並在含該 migration 的 PR #1 分支確認十二份 local／remote 版本一致；SQL Editor 的七項遠端檢查通過，沒有重跑 SQL。
- [x] 完成六碼代碼前端、舊碼相容與服務端限流提示；headless Chrome 覆蓋錯誤碼、前導零、舊碼、限流回覆和 Enter 送出。
- [x] 將 PR #1 更新至目前 main，Actions run 44930756543 的 `verify`／`block_race` 通過，Pages `deploy` 按 draft PR 規則略過。
- [x] 審查並合併 PR #1，發布六碼邀請碼與自適應 Realtime 輪詢；Actions run 44931736216 的 verify、block_race、deploy 全成功，公開網站載入 `app.js?v=19`。
- [x] 發布 15 類各 15 題及每局 5／10／15 題選擇；Actions run #64 的 verify、block_race、deploy 全成功，公開首頁與 app.js、styles.css、privacy.html 回 HTTP 200，網站載入 `app.js?v=20`、`styles.css?v=16`。
- [x] 啟用 `pg_cron` 並建立即時遊戲資料每 15 分鐘、檢舉資料每日 03:17 的清理排程；線上確認兩者皆 active。
- [x] 為網站設定 Supabase URL／公開 publishable key；Anonymous Auth 已啟用，Google provider 留給審查員使用。
- [x] 線上核對檢舉資料 RLS、玩家無法直讀答案表，以及房間表加入 Realtime publication；完整角色權限和真實玩家資料存取仍待端對端測試。
- [x] 以正式網站公開 publishable key、不帶使用者 session，對 `game_answers`、`player_match_history`、`player_safety_reports` 發出 `HEAD`／`limit=0` 匿名存取探測；三者均回 HTTP 401，沒有回傳資料列。此結果只驗證未登入存取拒絕，不替代登入玩家本人／他人資料隔離測試。
- [x] 前端接上匿名登入和持久 session 恢復；玩家頁 Google OAuth 與 linking 已移除。
- [x] Google 玩家登入曾在測試名單成功；依最新決策不向玩家提供此登入，也不發布 Google OAuth 玩家 app。
- [x] 曾加入 Google OAuth／linking Auth mock；玩家端相關呼叫已移除，匿名 session 真人驗收仍待完成。
- [x] 排除 Facebook／X／Instagram／Threads 登入；Instagram 結果分享保留。
- [x] 建立並發布可直接連結的隱私與資料處理說明頁草稿，列出登入、遊戲資料用途及既定保存期限；首頁連結、canonical、Open Graph 與 sitemap 已加入。頁面仍明示營運者法定名稱、適用地區及完整權利流程待正式覆核，因此不能視為法規覆核完成。
- [ ] 完成公開隱私政策的營運者／適用地區覆核；Google OAuth 品牌頁不再是玩家登入上線條件。
- [x] 玩家端不提供 Google 登入；Google provider 僅保留給核准的案件審查員。
- [x] 不再把 Google OAuth 玩家 Production 發布列為待辦。
- [ ] 使用兩個已授權的 Supabase 測試 session 驗證匿名登入／登出、重載後 session 恢復及新主題真人房／配對；
- [x] 將邀請房建立、代碼加入、房主狀態查詢及離房接上 authenticated RPC；Chrome mock 流程已驗證，Supabase 真人環境仍待驗收。
- [x] 加入遊戲房間後以 `get_room_state` 還原題目，訂閱 `game_rooms` Realtime 更新並保留輪詢備援；Realtime 事件只觸發重新查詢，不傳送答案。
- [x] 以 `submit_answer` 送出答案，只在伺服器確認雙方都回答後顯示答案；以 `continue_room` 等待雙方確認並推進題目，結束後讀取 `get_room_results`。Chrome mock 驗證五題作答、答案揭曉、確認等待和完局結果。
- [x] Auth session 恢復後依序呼叫 `get_my_active_room` 與 `get_my_matchmaking_ticket`；重新載入時回到本人等待中的邀請房／隨機配對，或接回剛配對的真人對局，並在使用者切換帳號或離開首頁後丟棄過期回應。headless Chrome mock 驗證等待、後續配對及載入當前題目。
- [x] 將隨機配對接上 `queue_for_match`、`get_match_status` 與 `cancel_matchmaking`，處理 30 秒逾時及重新排隊；Chrome mock 驗證配對成功、逾時重試和取消。
- [x] 加入遠端遊戲與配對前端錯誤處理：重複送出防護、房間逾時、離線後重試、中途離開、使用 `get_my_active_room` 與 `get_my_matchmaking_ticket` RPC 在重新載入後恢復房間或配對、取消佇列及完局歷史寫入 migration。若取消在配對狀態 RPC 執行期間發生，前端先保留取消意圖並於 RPC 結束後送出；取消回報已配對但未回傳房間 ID 時繼續查詢狀態。headless Chrome mock 已驗證此流程；真人服務的 RLS、網路中斷和跨裝置行為仍待 Supabase 環境驗證。
- [x] 建立已完成對局的持久紀錄與受權限保護的歷史查詢 RPC 草稿，按定案的保存政策清除或匿名化資料。
- [x] 建立玩家共同點彙總 RPC 草稿，依共同答案比例排序並回傳對局數、共同答案數和比例。
- [ ] 使用 Supabase 真實使用者資料驗證歷史分頁游標、90 天保留、逐筆刪除、排名門檻及只允許本人查詢的權限。
- [x] 前端只使用公開 project URL／publishable key；帳號刪除 function 使用 Supabase 管理的服務端 default secret，沒有把 service-role key 放入 repository 或網站。
- [x] Google OAuth client secret 已存入 Supabase Auth；最新輪替後以已授權測試帳號驗證登入和新分頁 session 恢復成功。
- [ ] 使用兩個已建立的 production 測試帳號在兩部不同裝置驗證建立房間、代碼加入、隨機配對、完整遊戲、歷史查詢、統計及同玩家續玩；任何測試帳號清理仍需另外明確授權。
- [ ] 使用正式 Supabase Auth／RLS 驗證封鎖及解除封鎖、邀請房封鎖競態、檢舉權限、限量競態與 180 天清理排程。
- [x] 建立僅授權審查人員可用的後端案件佇列 RPC 與審查紀錄，包含狀態、處理結果、存取稽核及到期清除；CI 驗證一般玩家不能讀取案件表或審查員清單。
- [x] 建立獨立審查工作區：以已登入 session 呼叫 allowlist RPC 驗證身分，清單只顯示必要欄位，點開才載入案件內容；支援分頁、篩選、領案及確認後結案。權限重查失敗、登出或切換帳號時會隱藏工作區、清空案件 DOM 並關閉待確認操作。尚未建立審查員帳號；線上登入與實際案件流程待驗證。
- [ ] 依核准的案件分流流程完成檢舉提交、人工審查、玩家回覆、升級及期限清除的端對端驗證。
- [x] 部署 `delete-account` Edge Function，啟用 JWT 驗證、設定精確 `ALLOWED_ORIGINS`，並使用 Supabase 管理的服務端 `SUPABASE_SERVICE_ROLE_KEY` default secret；OPTIONS 預檢確認 Samewave GitHub Pages origin 回 200 且回傳精確允許標頭，未允許的 origin 回 403 且不回傳允許標頭。
- [ ] 以真實登入者驗證 Edge Function JWT、錯誤 origin 拒絕及帳號刪除資料處理；驗收前維持 `accountDeletionEnabled: false`。
- [ ] 在正式 Supabase 驗證匿名及社群帳號刪除、JWT／origin 拒絕、Auth 資料清理、歷史匿名化及正在進行的對局收尾；執行任何真實帳號刪除前須依 [decision.md](decision.md) 取得明確授權。
- [ ] 在 Supabase 真人環境檢查檢舉表單、對局安全操作和封鎖清單；再以 iOS／Android 與 VoiceOver／TalkBack 驗證。

### 4. 分享與發布

- [x] 實作結果分享卡及使用者主動觸發的系統分享面板；使用者需自行選擇 Instagram 並確認發布。
- [ ] 在 iOS／Android 實機確認分享檔案可交給 Instagram 限時動態，並檢查取消分享與 PNG 下載備援。
- [x] 建立獨立公開 repository `310182-sketch/samewave`，不沿用另一專案的 Git 歷史。
- [x] 推送遊戲原型、文件與回歸測試至新 repo 的乾淨 `main`。
- [x] GitHub Actions run #5 的 Deno/PGlite `verify`、headless Chrome 和 PostgreSQL 16 `block_race` jobs 通過。
- [x] 加入公開首頁的搜尋標題、描述、canonical、Open Graph metadata、robots.txt 和 sitemap.xml；Google `site:310182-sketch.github.io/samewave` 搜尋已回傳網站。
- [x] 在 repository Settings > Pages 選擇 GitHub Actions 作為發布來源；Actions run #5 的部署 job 通過。
- [x] 使 Pages workflow 重跑使用唯一 artifact 名稱並等待 artifact 登記；run #28 的 `verify`、`block_race` 和 `deploy` 全部通過。
- [x] 確認公開網址、`robots.txt` 和 `sitemap.xml` 均可讀取；Sitemap 以 Googlebot User-Agent 回 HTTP 200 並列出首頁和隱私頁，兩個 URL 都回 HTTP 200；首頁 `lastmod` 已更新至 2026-11-22。Search Console 報表狀態另列為待完成。
- [x] 將網站網址填入 GitHub About 的 Website 欄位並確認公開 repo 頁顯示正確連結。
- [x] 以首頁 HTML 驗證標籤完成 Google Search Console 網站擁有權驗證；保留標籤以維持驗證狀態。
- [x] 發布 Supabase ledger 已到 15/15 的前端版本；Actions run #64 的 `verify`、`block_race`、`deploy` 全部成功，公開頁載入 `app.js?v=20`／`styles.css?v=16` 並提供 5／10／15 題選項。後續文件更新的部署 run 44980939196 亦全數通過。
- [ ] 讓 Search Console 成功讀取 `sitemap.xml`；目前已接受提交但報表顯示「無法讀取 Sitemap」，直接 HTTP 與 Googlebot User-Agent 查詢皆為 200／`application/xml`，待 Google 處理後重查。網站已出現在 `site:` 搜尋結果，但收錄完整性和搜尋排名仍由 Google 決定。
- [x] 為線上版本設定 Supabase URL／公開 publishable key；Anonymous Auth、Manual Linking 和正式網站 redirect allow list 已設定，Google OAuth callback 已設定；最新 client secret 登入和 session 恢復驗收成功。
- [x] 修正帳號刪除停用說明：Edge Function 已部署但尚未用真實登入者驗收，介面改為說明「目前尚未開放」及待驗收條件；操作錯誤訊息改成不推斷刪除一定失敗，並遞增 `app.js` 快取版本；Actions run #16 部署成功。
- [ ] 在正式網站以真實帳號完成登入、房間／配對、遊戲、歷史及統計端對端驗收，並確認跨裝置行為。
- [ ] 根據玩家回饋改善題目品質、配對體驗、前端版面及歷史統計可讀性。
