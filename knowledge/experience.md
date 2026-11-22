# 專案經驗

## 靜態前端可以呈現流程，不能提供真人同步

- **經驗：** GitHub Pages 只託管靜態檔案，不會提供配對佇列、多人共享狀態、即時訊息或伺服器答案判定。
- **適用範圍：** 需要多位訪客即時互動的網頁遊戲或協作產品。
- **本專案做法：** 原型使用本機範例資料模擬對方作答，並在畫面和說明中標示示範模式。驗證玩法時可用；不能用來宣稱真人配對已完成。

## 放在瀏覽器的示範資料是公開的

- **經驗：** HTML、JavaScript 和送到瀏覽器的資料都能被訪客檢視。前端範例答案只能供展示，不能用來保護正式答案或裁定競賽結果。
- **適用範圍：** 有隱藏答案、私人房間、計分或共享遊戲狀態的網頁應用程式。
- **本專案做法：** 目前答案只用於示範揭曉。真人配對版本應由服務端保存房間狀態，並在雙方答完後授權揭曉。

## 專案型 GitHub Pages 使用相對資源路徑

- **經驗：** 專案網站通常部署在 repository 子路徑；HTML 引用樣式、腳本和圖示時使用相對路徑，可避免部署後資源回到網域根目錄而找不到。
- **適用範圍：** 發布至 owner.github.io/repository/ 的靜態網站。
- **本專案做法：** 網站集中在 site/，使用同層相對路徑；Pages workflow 上傳 site/ artifact 再發布。

## GitHub Pages 部署權限與設定

- **經驗：** Pages Actions 需要 pages: write 與 id-token: write 權限，repository 的 Pages source 也必須設為 GitHub Actions。
- **適用範圍：** 使用 GitHub Actions 發布 GitHub Pages 網站。
- **本專案做法：** workflow 已由功能分支觸發；`github-pages` environment 曾拒絕未列入允許清單的分支，加入精確分支政策後部署成功。`verify` job 執行 Deno 型別／lint／格式、PGlite migration 測試、Edge Function request 測試和前端語法檢查；另外以隔離的 PostgreSQL 16 service 執行封鎖、配對、邀請加入、限量和取消的多連線競態測試。`deploy` 必須等待所有驗證 job，並獨立取得 `pages: write` 與 `id-token: write`。部署失敗時先看實際失敗步驟與 annotation；run 48 曾回報找不到 `github-pages` artifact，run 53 的 verify、block_race 與 deploy 全部成功。run #64 的 `verify`、`block_race`、`deploy` 亦全成功，公開頁載入 `app.js?v=20`、`styles.css?v=16`，首頁及主要資源回 HTTP 200。重跑失敗 job 會再次產生 Pages artifact，因此名稱需包含 `github.run_id` 和 `github.run_attempt`，且 upload 與 deploy 必須使用相同名稱，避免同一 run 中出現重名 artifact。run #27 annotation 顯示上傳後立即查詢會找不到尚未登記的 artifact；加入 10 秒緩衝後，run #28 的 `verify`、`block_race` 和 `deploy` 全部成功。runner 棄用警告和真正的部署錯誤要分開處理，也不能只憑 workflow 已觸發或排入佇列就宣稱網站已發布。

## 靜態前端不可放伺服器祕密

- **經驗：** 公開網站的前端檔案和建置產物都可被下載，不能包含 Personal Access Token、service role key 或其他伺服器祕密。
- **適用範圍：** GitHub Pages 等靜態主機連接第三方服務。
- **本專案做法：** 目前不需要服務金鑰。未來接後端時，只能在前端放可公開的用戶端設定，並由伺服器權限規則保護房間與玩家資料。

## 示範配對要清楚標示，不暗示真人在線

- **經驗：** 以固定範例對象補足單人互動流程時，如果沒有持續揭露示範限制，使用者容易以為正在和真人配對。
- **適用範圍：** 服務尚未接上真人、支付或外部資料時的互動原型。
- **本專案做法：** 配對等待頁、遊戲室和說明視窗都揭露對方及答案由本機資料模擬，並說明資料不會保存。這能驗證畫面流程，不能驗證配對成功率或雙人同步。

## 互動狀態改變時要維持鍵盤與讀屏脈絡

- **經驗：** 單頁流程切換後，鍵盤焦點若留在已隱藏的控制項，下一步操作會不明確；揭曉結果若沒有即時宣告，讀屏使用者也難以察覺狀態已改變。
- **適用範圍：** 單頁應用、逐步表單、問答遊戲和其他動態內容。
- **本專案做法：** 畫面切換時把焦點移到新步驟標題；答題揭曉後把焦點移到下一題按鈕；提供鍵盤焦點樣式、aria-live 宣告和減少動態效果支援。仍需透過實際裝置和輔助科技檢查。

## GitHub 網頁登入不等於 Git push 授權

- **經驗：** 在瀏覽器登入 GitHub 不會自動為本機 Git 設定 push 權限；使用 Git Credential Manager 的官方登入流程可避免把 Personal Access Token 傳入聊天或原始碼。
- **適用範圍：** 使用 Git for Windows 推送 commit、建立 repository 或查詢 Actions 時。
- **本專案做法：** 使用已授權的 Git Credential Manager。開始改動前先檢查目前分支與 remote；遠端產品方向不同時，先用獨立分支保留原有 main。

## 非互動 Git shell 遇到 helper-selector 時改用已安裝的 Credential Manager

- **經驗：** Windows PortableGit 的 helper-selector 在沒有可互動終端時可能停在選擇憑證 helper 的階段，push 沒有輸出但 Git 程序仍在執行。逐一終止自己啟動的停滯程序後，可用單次命令清空既有 helper 清單並指定已安裝的 Git Credential Manager；這仍使用既有安全憑證儲存，不需把 token 放在命令列。
- **適用範圍：** Windows PortableGit、非互動執行環境，且全域 credential.helper 設為 helper-selector 的 Git 操作。
- **本專案做法：** 使用 git -c credential.helper= -c credential.helper='<Git Credential Manager executable path>' push <remote> <branch>，把路徑換成本機安裝位置；若沒有有效登入憑證，仍須由使用者完成官方登入流程。

## 本機預覽也可能載入舊版樣式

- **經驗：** 反覆在同一個 localhost 網址預覽時，嵌入式瀏覽器可能沿用先前快取的同名 CSS。畫面部分樣式正常、不代表新樣式已載入。
- **適用範圍：** 靜態網站原型的本機反覆預覽與視覺除錯。
- **本專案做法：** 先比對伺服器實際回傳的 CSS，再用重新載入或更新樣式連結的版本參數排除快取；必要時從瀏覽器讀取 computed style 驗證字級和狀態。

## 手機視窗模擬能檢查版面與鍵盤流程，不能代替實機讀屏

- **經驗：** 用瀏覽器設定不同 viewport 寬度，可以快速找出水平溢出、過小文字、觸控目標尺寸和動態畫面焦點問題；鍵盤自動操作也能確認每個步驟的焦點去向。這些結果不代表已驗證手機瀏覽器、系統文字放大或螢幕閱讀器行為。
- **適用範圍：** 有響應式版面、單頁流程、互動表單或逐步遊戲的網站。
- **本專案做法：** 以 Chrome 模擬 320、360、390、768、1024、1440px，檢查首頁沒有水平溢出，並在三種手機寬度用鍵盤走完五題。檢查後把主題按鈕調至 12px／手機至少 44px 高，為程式導覽焦點增加明確外框，並替答案按鈕與題目進度補上狀態語意。尚未實機檢查，也未用 VoiceOver 或 TalkBack 驗證。

## 即時事件只傳房間狀態，答案要經過權限檢查

- **經驗：** 如果把答題結果寫進玩家可訂閱的即時資料列，另一位玩家可能在自己作答前讀到答案。事件只需通知房間進度變了；敏感答案應由伺服器函式檢查玩家身分和同房作答數，再決定是否回傳。
- **適用範圍：** 多人遊戲、協作表單和需要同步狀態但不能過早揭露資料的即時應用。
- **本專案做法：** Supabase migration 只發布不含答案的房間狀態；答案表不授予用戶端直接讀取權限，RPC 設計為兩人都答完才回傳雙方選擇。十份 migration 已部署；線上查核確認答案表用戶端無直讀權，房間表已加入 Realtime publication。雙裝置作答與玩家角色的端對端權限仍待驗證。

## Web Share API 分享圖片需要先準備好檔案

- **經驗：** 行動瀏覽器的 Web Share API 可能要求使用者點擊時仍保有啟用狀態。先產生 PNG 檔案，再在點擊處理器中同步檢查 navigator.canShare({ files }) 並呼叫 navigator.share()，比點擊後才開始繪圖更可靠。使用者取消分享應保持安靜；功能不可用或發生錯誤時再提供下載備援。
- **適用範圍：** 透過手機系統分享選單傳送圖片、檔案或其他內容到社群 App 的網站。
- **本專案做法：** 結果頁顯示時以 Canvas 預先產生 1080×1920 PNG；使用者按分享時交給系統面板，另有明確的下載按鈕。若使用者取消，網站不下載、不代替發布。Instagram 是否出現在分享面板仍須以安裝了 Instagram 的實機驗證。

## GitHub Pages 工作流程不代表分支已獲准部署

- **經驗：** GitHub Actions 可以因 push 正常觸發，仍在部署步驟開始前被環境保護規則拒絕。此時先讀取 Actions check-run annotations，確認分支是否列在部署環境的允許清單，再判斷是否要修改 workflow。
- **適用範圍：** 透過 GitHub Pages environment 或其他有分支保護規則的 GitHub Actions 部署。
- **本專案做法：** 初始部署因分支不在 `github-pages` environment 的允許清單而失敗。確認現有規則包含 `main` 且使用自訂分支清單後，只新增 `codex/commonality-quiz-prototype`，保留 `main` 和其他 environment 保護，再重跑 workflow；run 28 attempt 2 成功，並以公開網址 HTTP 200 和頁面標題確認部署內容。後續將 Deno／PGlite、Edge Function 和前端檢查放在不具 Pages 寫入權限的 `verify` job，`deploy` 只在其成功後取得部署權限；run 39 在 GitHub runner 上通過兩個 jobs。不要只根據 workflow 已觸發或排入佇列就將網站標成已發布。

## 手機上的選項要留足點按空間，選取狀態不需雙重描邊

- **經驗：** 多個選項擠在同一列時，窄螢幕會讓文字和點按區域變小；以粗重的內外雙描邊表示選取，也容易使選項在視覺上過度突出。分欄排列、明確的最低高度，以及柔和底色和單一邊框能同時保留辨識度與閱讀空間。
- **適用範圍：** 手機表單、主題選擇、篩選器及多選一控制。
- **本專案做法：** 桌面使用三欄、手機改兩欄並讓隨機選項佔滿一列；按鈕至少 48px 高，選取使用淡綠底色和較淡邊框。改版後以 Chrome headless 檢查首頁、遊戲及結果頁在 320、360、390、768、1024、1440px 的版面，並以鍵盤完成六種寬度的五題流程；均未出現水平溢出或焦點操作阻礙。

## 短期對局資料與長期個人歷史要分開保存

- **經驗：** 若長期歷史直接參照會定期清除的即時房間資料，房間刪除時歷史也會消失；若只保留對局摘要，則可在清除原始答案後繼續提供玩家自己的紀錄和統計。
- **適用範圍：** 需要保存有限期限的對局摘要、活動紀錄或統計，同時定期刪除詳細事件資料的多人服務。
- **本專案做法：** 完局時各為兩位玩家寫入一筆獨立摘要，不以房間外鍵綁住摘要；90 天後清除摘要，刪除帳號時刪除本人歷史並匿名化其他玩家摘要中的顯示名稱。Migration 草稿尚未在 Supabase 套用，需實際驗證 trigger、RLS、清理排程及刪除行為。

## 已套用的資料庫 migration 用新檔案向前擴充

- **經驗：** 已部署的 migration 是環境變更紀錄；直接改寫舊檔不會同步修正已套用資料庫，反而會造成新舊環境的 migration 歷史不一致。
- **適用範圍：** 使用版本化 SQL migration 管理 PostgreSQL、Supabase 或其他資料庫結構的專案。
- **本專案做法：** 保留初版即時配對 migration，另建 forward-only 檔案加入邀請房間、歷史摘要及後續功能。第十二份六碼邀請 migration 曾由 SQL Editor 手動套用；在包含該檔的分支用官方 CLI repair 登記後，十二個 local／remote 版本一致。部署後先確認 migration SQL 已套用並驗證遠端功能，再只修復 ledger 記錄；不要重跑 SQL 或直接修改 history table。

## 沒有 Supabase 專案時可用 PGlite 預檢 SQL migration

- **經驗：** PGlite 可在瀏覽器執行 PostgreSQL，讓 migration 在建立雲端專案前先做套用和 RPC 回歸測試。把最小 `auth.users`、`auth.uid()`、角色及登入 claim stub 寫進版本控制，可讓後續 migration 修改重複檢查 PostgreSQL／PLpgSQL 語法、權限邊界及核心資料流程，不必依賴一次性的手動 smoke test。
- **適用範圍：** 使用 PostgreSQL、RPC、觸發器和 RLS 的 Supabase 專案，且本機沒有 Docker、PostgreSQL 或 Supabase CLI 時。
- **本專案做法：** `supabase/tests/migrations.test.ts` 以固定版本的 PGlite 自動讀取 `supabase/migrations/` 內所有 SQL 檔案，再按檔名順序套用；新增 migration 不必再更新測試中的重複清單。測試可用 `deno test --allow-read --allow-net supabase/tests/migrations.test.ts` 重複執行。現有 14 項測試涵蓋 migration／權限、房間與配對票券恢復、security-definer 權限、雙人揭曉與歷史、配對與封鎖、主題目錄擴充、歷史範圍與排名、保留期限、限量、檢舉及帳號刪除收尾；Actions run #7 的 verify 與 PostgreSQL 16 `block_race` 通過。測試需以不同 JWT subject 呼叫 security-definer RPC，驗證讀取與刪除都只作用於該玩家資料，並確認未登入呼叫被拒絕；刪除帳號測試也應同時核對 cascade、匿名化和保留期限，避免只看 Auth row 是否消失。所有應用 security-definer 函式都固定空 `search_path`，回歸測試直接檢查 `pg_proc.proconfig`，並確認匿名角色沒有任何應用 security-definer 函式的執行權。PGlite 的共用鎖檢查只能驗證不變條件；PostgreSQL 16 多連線整合測試另已驗證封鎖與配對／邀請加入、兩種帳號限量競態。這些本機檢查仍不等同 Supabase Auth 或跨裝置遊戲驗收。

## 多連線交易競態要用真實 PostgreSQL 驗證

- **經驗：** 單一連線或 PGlite 的結構檢查能證明多個 RPC 使用相同 advisory lock，卻不能證明一筆交易持鎖時，另一筆交易真的等待並在提交後讀到新狀態。要驗證競態順序，需使用獨立連線同步製造兩筆重疊交易，並從第三條管理連線觀察 PostgreSQL 的 wait event。
- **適用範圍：** 使用 transaction advisory lock 協調配對、封鎖、唯一性或其他跨請求競爭條件的 PostgreSQL 服務。
- **本專案做法：** `supabase/tests/block_match_concurrency.test.ts` 以不同 client 交錯呼叫 `queue_for_match`、`join_invite_room`、`create_invite_room` 和 `cancel_matchmaking`，第三條管理連線透過 `pg_stat_activity` 確認 advisory／票券列鎖等待。封鎖提交後，配對 RPC 回傳 `waiting`，邀請加入因 `Room unavailable` 被拒絕；第七間邀請房和第十三張配對票券會被限量 trigger 拒絕。取消先鎖票券時配對會略過，配對先鎖時取消等待並回傳 `matched`。run 53 的 PostgreSQL 16 job 通過。測試只允許 loopback 主機，應在一次性空白資料庫執行；它不等同 Supabase Auth、Realtime、RLS 或跨裝置驗證。

## 計數式限量要與寫入交易序列化

- **經驗：** 以 `count(*)` 判斷是否超過帳號限額時，兩筆並行寫入可能同時讀到低於上限的舊數字，最後都插入成功。限量檢查必須和相應 RPC 的寫入共用序列化交易鎖，並用真實多連線測試確認持鎖、提交後重新計數及拒絕超額的順序。
- **適用範圍：** 以資料列計數實作每帳號每時段配額的 PostgreSQL API，例如配對票券、建立房間、邀請或其他限次操作。
- **本專案做法：** `create_invite_room` 和 `queue_for_match` 在新增資料前都取得 transaction advisory lock `82420711`，限量 trigger 再分別檢查一小時內最多 6 個房間及 10 分鐘內最多 12 張配對票券。PGlite 驗證上限值；run 50 的 PostgreSQL 16 多連線測試也驗證臨界值並行請求會等待交易鎖，再由 trigger 拒絕第七間房和第十三張配對票券。此鎖只保護使用這些 RPC 的一般應用流程，正式環境仍需確認權限沒有其他可繞過入口。

## SECURITY DEFINER 函式要固定空 search_path

- **經驗：** PostgreSQL `SECURITY DEFINER` 函式以函式擁有者權限執行；若使用呼叫者可影響的 schema 搜尋路徑，可能解析到惡意同名物件。將 `search_path` 設為空並完整限定資料表、schema 函式名稱，可避免依賴可變的 schema 搜尋順序。
- **適用範圍：** 使用 `SECURITY DEFINER` 的 PostgreSQL 函式、Supabase RPC、資料庫 trigger 或排程函式。
- **本專案做法：** Migration 中的應用 `SECURITY DEFINER` 函式以 `SET search_path = ''` 執行，並以 `auth.uid()` 和 schema-qualified table/function references 存取物件。PGlite 測試讀取 `pg_proc.proconfig`，確認 `public`、`private` schema 下每個 security-definer 函式都固定此設定。此檢查不取代對函式本身授權、資料列權限和 trigger 行為的測試。

## 尚未連線的流程要讓示範狀態一眼可見

- **經驗：** 可操作的假代碼或等待畫面容易被當成真實服務；若明確說明無法跨裝置、未向伺服器驗證且不會保存紀錄，仍能展示介面而不誤導玩家。
- **適用範圍：** API、登入或即時服務尚未接通，但需要先檢視前端流程的產品原型。
- **本專案做法：** 邀請房、隨機配對、答題及歷史頁已具備 RPC 流程，但未配置 Supabase URL／key 時，登入與真人操作會停用或顯示明確的本機預覽；歷史頁不展示虛構紀錄。待 Supabase 專案設定完成後，再以真人成功、錯誤、權限拒絕和逾時回應驗證接線。

## 社群 API 可用不等於所有帳號都能拿來登入

- **經驗：** 社群平台的內容 API、OAuth 授權與通用登入服務是不同能力；需核對帳號資格、可取得的穩定識別碼、email、token 期限、app review 和 Auth 服務的 custom provider 要求。
- **適用範圍：** 把 Facebook、Google、X、Instagram、Threads 等第三方身分接入自有帳號系統的網頁或 App。
- **本專案做法：** 先使用 Supabase 內建的 Facebook、Google、X provider；Instagram Login 目前限專業帳號，Threads 要用 custom OAuth 並完成 app review。Instagram／Threads 不保證有 email，因此匿名帳號連結需測試手動 identity linking。每次實作前重新查閱官方文件，因 provider 條件和審核政策可能變動。

## 靜態網站可預先接好 Auth，但必須明確區分未設定狀態

- **經驗：** GitHub Pages 可以載入 Supabase browser client 並支援 PKCE OAuth；若把 project URL／anon key 和 provider 開關放在獨立 client 設定檔，前端整合可先完成，之後再由專案管理者提供公開設定。未設定或 SDK 載入失敗時停用登入按鈕，可避免原型顯示看似成功的登入；provider secrets 仍必須只存後端。
- **適用範圍：** 靜態託管網站需要匿名帳號、OAuth、PKCE callback 或逐步遷移到雲端後端的產品原型。
- **本專案做法：** `site/supabase-config.js` 僅包含公開 URL／anon key 與 provider 設定；匿名登入、OAuth、PKCE session 恢復和 identity linking 使用具 SRI 的 Supabase JS v2.119.2。只有已配置的 provider 才可點擊，缺少服務設定時保留本機示範。mock client 可先檢查前端狀態和 provider ID，但不能取代 Supabase Manual Linking、實際 provider callback 及 GitHub Pages redirect URL 的驗證。

## Session 恢復不會自動恢復伺服器上的遊戲房間

- **經驗：** Auth SDK 保存並還原登入 session，只能證明玩家身分仍有效；房間、票券等伺服器狀態仍需以該身分重新查詢。不要把瀏覽器曾保存的 session 誤當成房間已恢復。
- **適用範圍：** 有登入 session 和伺服器端即時狀態的單頁應用，例如多人房間、工作佇列或未完成的交易流程。
- **本專案做法：** Auth session 初始化後呼叫 `get_my_active_room`，RPC 從 `auth.uid()` 推導玩家並只回傳本人未結束房間；前端在帳號切換或導航後丟棄過期回應。PGlite 驗證本人／非成員權限，headless Chrome mock 確認重新載入會接回房間並載入目前題目。跨裝置行為仍需在 Supabase 環境驗證。

## 重新載入時要接回等待票券並處理配對競速

- **經驗：** 隨機配對票券保存在伺服器；頁面重載會丟失 JavaScript 記憶體中的 ticket ID。只恢復登入 session 或只查進行中房間，會讓玩家漏掉仍在等待的配對，或漏掉查詢間剛完成的配對。重新載入時要用登入者身分查詢現有票券，沿用原始期限；配對狀態要由服務端回傳，不能在恢復失敗時偷偷建立新票券。
- **適用範圍：** 有期限、可取消且可能在頁面離開期間完成的工作佇列、上傳、預約或多人配對流程。
- **本專案做法：** 先透過 `get_my_active_room` 查房間，再透過 `get_my_matchmaking_ticket` 找本人等待票券或剛配對的有效房間；等待狀態以原 ticket ID 重新輪詢，超時狀態提供明確重試。後端從 `auth.uid()` 推導票券擁有者並序列化狀態列，PGlite 驗證私有權限與逾時，headless Chrome mock 驗證重載後恢復等待並在配對後進房。真人 Supabase 網路競態仍待線上環境驗證。

## 私人資料請求要綁定登入帳號和請求代次

- **經驗：** 單頁應用的查詢或刪除請求可能在登出、換帳號或新查詢之後才返回。每次請求應記錄登入者 ID 和遞增的請求代次；登入者改變時先作廢舊代次並清空私人資料，只有身分和代次仍相符的回應才能更新畫面或重設載入狀態。登入狀態回呼中只更新本地狀態，需重新查詢時排到回呼完成後執行。
- **適用範圍：** 有登出／切換帳號能力的單頁應用，以及歷史、個人資料、帳務或其他依使用者隔離的非同步查詢和變更。
- **本專案做法：** 歷史頁在 Auth 使用者變更時清空清單和排名、使進行中的讀寫失效；刪除後只有原帳號的最新請求才能重新載入和顯示完成訊息。Chrome mock 以延遲讀取及延遲刪除確認舊回應不會蓋掉新帳號畫面。這種 mock 驗證前端競態，不代替後端 RLS 或真人 Auth 測試。

## 動態資料頁要用惡意文字和慢回應做 mock 驗證

- **經驗：** 只用正常範例資料會漏掉 HTML 注入與非同步競態。Mock RPC 可回傳看似 HTML 的玩家名稱和題目文字，並控制請求完成順序，以確認資料只以文字節點顯示、舊回應不會跨畫面或帳號寫入狀態。
- **適用範圍：** 把使用者內容、資料庫欄位或第三方 API 資料插入動態 UI 的前端功能，尤其包含個人資料或可分頁清單者。
- **本專案做法：** Chrome mock 覆蓋歷史載入、空狀態、錯誤重試、游標分頁、刪除後刷新和帳號切換；對名稱、題目和共同答案注入 `<img>`／`<svg>` 樣式字串，確認頁面沒有建立對應 DOM 節點或觸發事件。需要粗體、換行等固定結構的狀態標題，也以 DOM API 建立節點，文字使用 `textContent`，避免為固定文案保留 `innerHTML` 插值入口。Live Supabase 權限與資料內容仍須另驗。

## RPC 前端串接要保留示範與真人狀態的清楚界線

- **經驗：** 靜態原型即使已寫好 RPC 呼叫，沒有專案設定或玩家 session 時也不能假裝服務成功。把 provider client 設定檢查、RPC 回傳狀態分支、登入要求和本機示範分開處理，能逐段交付 UI 而不混淆真實與預覽資料。
- **適用範圍：** GitHub Pages 等靜態前端逐步接入 Supabase 或其他需要登入及伺服器狀態的服務。
- **本專案做法：** 邀請房在 Auth 與公開 client 設定可用時呼叫 `create_invite_room`、`join_invite_room`、`get_invite_room_status` 和 `leave_room`；建立／加入／錯誤／逾期由 RPC 結果決定。無 Supabase 設定時仍顯示明確示範預覽。Chrome mock 覆蓋建立、代碼正規化、房主等待、對方加入、逾期及離開；後續答題與結果透過權限檢查 RPC 同步，Realtime 只作房間變更通知並保留輪詢備援。真人 Supabase 與跨裝置流程尚待驗證。

## Realtime 事件用來觸發重新查詢，答案揭曉仍由 RPC 授權

- **經驗：** Realtime 適合通知客戶端房間可能有新狀態，但不要直接訂閱包含玩家答案的資料。事件到達或輪詢計時時，都重新呼叫會檢查玩家身分的狀態 RPC；畫面只在 RPC 明確回傳雙方答案可揭曉時顯示選擇。操作按鈕也需等待 RPC 結果，避免本機畫面先於伺服器狀態前進。
- **適用範圍：** 有答案保密要求的多人遊戲、協作表單及其他即時互動。
- **本專案做法：** `game_rooms` 更新事件只觸發 `get_room_state`，前端另以定時輪詢作備援；送答、確認前進和讀取結果分別呼叫 `submit_answer`、`continue_room`、`get_room_results`。Chrome mock 已驗證對方未作答時不揭曉、雙方確認後才前進、最後只顯示 RPC 回傳的共同選擇。Supabase Realtime 授權、離線和跨裝置仍待真人環境測試。

## 隨機配對要以服務端票券狀態處理逾時與取消競態

- **經驗：** 配對畫面不能只依靠前端倒數判定逾時；加入佇列後應保存服務端 ticket ID，輪詢權限檢查後的狀態，並在逾時或離開時取消票券。取消與配對成功同時發生時，應以伺服器最後狀態為準，避免成功配對後仍留在等待頁。
- **適用範圍：** 隨機配對、工作佇列及其他有期限且可取消的非同步請求。
- **本專案做法：** 前端使用 `queue_for_match` 取得票券，透過 `get_match_status` 輪詢並用 `cancel_matchmaking` 取消；服務端回報配對成功時轉入真人房間，逾時頁面可重新排隊。run 53 的 PostgreSQL 16 多連線測試驗證取消先鎖時配對略過該票券，配對先鎖時取消會等待並回報 `matched`。這驗證資料庫交易順序，不取代 Supabase Auth、Realtime 或跨裝置環境測試。

## 檢舉與封鎖要由伺服器確認房間身分和配對規則

- **經驗：** 檢舉和封鎖不能只在前端隱藏玩家或接受用戶端指定的被檢舉者 ID。後端應從登入者和同房成員關係推導對象；封鎖必須同時排除隨機配對並阻擋邀請房加入；檢舉表不應授予一般玩家直接讀取權。檢舉與處分也要分開，避免惡意檢舉自動造成封號。
- **適用範圍：** 有匿名帳號或隨機配對的雙人遊戲、社群配對、媒合平台及其他讓使用者彼此互動的產品。
- **本專案做法：** `block_room_opponent` 和 `submit_player_report` 只接受房間 ID，再由伺服器驗證登入者是房間成員並找出對方；封鎖清單只由本人專屬 RPC 操作，雙向封鎖會跳過隨機配對並阻擋邀請房加入。封鎖寫入、配對和邀請加入使用相同的 transaction advisory lock，將封鎖新增和新配對／加入的檢查排成明確先後；PostgreSQL 16 多連線測試在 run 45 驗證封鎖交易確實阻塞配對與邀請加入，run 50／53 再驗證開房、配對票券限量及取消／配對競態。Supabase 環境的 Auth、RLS、pg_cron 和實際審查營運仍須另驗。檢舉一房一筆、說明最多 500 字、案件最多保留 180 天；一般登入者不能直接讀取檢舉表，刪除帳號會解除案件與帳號 ID 的連結。PGlite 已預檢主要權限與規則。
- **操作限制：** 服務端可用帳號限量降低重複開房／排隊，但匿名帳號可重新建立，不能取代 IP／裝置層級風控。若尚無值班審查人員和聯絡方式，介面要明說檢舉不會即時有人處理，且不能把它當成緊急支援管道。

## 靜態前端的帳號刪除要經過驗證過的後端函式

- **經驗：** 靜態前端不能安全持有 Supabase service role key，也不能直接刪除 `auth.users`。刪除函式應驗證呼叫者的 JWT，從已驗證 session 取得帳號 ID，不接受瀏覽器指定任意目標 ID；再由後端 service role 執行管理刪除。可用精確 origin allow list 限制瀏覽器來源，並讓前端在函式部署和來源設定完成前保持停用。
- **適用範圍：** GitHub Pages 等靜態網站需要提供 Supabase 使用者自助刪除帳號的產品。
- **本專案做法：** `delete-account` Edge Function 用使用者 session 呼叫 Auth `getUser()`，再以後端 service role 刪除剛驗證的 `user.id`；前端只呼叫 Edge Function，公開設定只存 `accountDeletionEnabled`。帳號刪除前的資料庫 trigger 先結束進行中房間並取消等待票券，避免單純 cascade 刪除成員後留下仍顯示 playing 的房間。PGlite 可檢查資料庫 trigger、外鍵和匿名化，但 Supabase Auth Admin 權限、Edge secret、JWT 驗證和 CORS origin 必須在真實專案驗證。

## 響應式窄版需同時檢查捲軸與控制項名稱

- **經驗：** 窄螢幕常隱藏按鈕的文字，只留下箭頭或圖示；如果按鈕沒有 `aria-label` 或其他等效名稱，讀屏看到的可能只剩符號。桌面瀏覽器模擬手機寬度時，傳統垂直捲軸也會縮小頁面可用寬度；`min-width` 若等於模擬視窗寬度，可能額外觸發水平捲動。檢查響應式畫面時，應核對控制項名稱及根節點實際 `clientWidth`／`scrollWidth`。
- **適用範圍：** 導覽按鈕、圖示按鈕、行動版工具列，以及任何會依斷點改變可見標籤或容器最小寬度的網頁介面。
- **本專案做法：** 320px 歷史頁預覽中，「回首頁」文字被隱藏後，瀏覽器無障礙樹只提供「←」作為按鈕名稱；`body` 的 320px 最小寬度又比含垂直捲軸的 305px 可用寬度大。已為邀請房與歷史頁返回按鈕補上 `aria-label="回到首頁"`，並移除 `body` 硬性最小寬度；修正後以 320／360px 預覽重驗。真實 iOS／Android 與讀屏驗證仍待執行。

## Edge Function 遠端依賴要固定版本

- **經驗：** 使用 Deno URL import 的 Edge Function 若只固定套件主版本，重複部署時可能載入不同的 minor／patch 實作。以精確套件版本固定行為，並和瀏覽器端共用相同版本，可減少 API 差異與除錯變因；版本存在及 URL 可回應只能確認套件可取得，仍需 Deno 編譯和目標平台驗證。
- **適用範圍：** Deno Edge Functions、透過 esm.sh 載入 npm 套件的服務，以及使用 CDN 的靜態前端。
- **本專案做法：** `delete-account` 使用 `https://esm.sh/@supabase/supabase-js@2.119.2`，與瀏覽器載入的 Supabase JS 版本一致。確認 npm registry 版本存在且 esm.sh 回應 HTTP 200；將官方 Windows Deno 發布檔下載到暫存資料夾並核對 SHA-256 後，以 Deno 2.9.8 執行 `deno check`、`deno lint` 及 `deno fmt --check` 成功（初次格式檢查後套用 `deno fmt`）。PGlite 帳號刪除檢查亦通過；後續已部署 Edge Function、設定最小來源 allowlist，且在真實 Supabase 驗證允許／拒絕來源的 OPTIONS 預檢。Supabase Auth Admin 的真實 JWT 刪除和資料庫收尾仍待登入 session 驗收。

## 將 Edge Function 請求處理器與伺服器啟動分開

- **經驗：** 將 HTTP request handler 匯出，並只在 `import.meta.main` 時啟動 `Deno.serve`，可以直接對 handler 執行本機測試，而不需要啟動監聽服務或使用真實第三方憑證。測試環境變數應在動態匯入 handler 前設定，避免模組快取讀到錯誤設定。
- **適用範圍：** Supabase Edge Functions、Deno serverless handlers，以及需要驗證 CORS、HTTP method 和未登入錯誤分支的無伺服器 API。
- **本專案做法：** `delete-account/index.ts` 匯出 `handleRequest`，測試匯入時不啟動 Edge Function server；Deno 測試在 loopback 啟動 mock Auth API，使用暫存假設定覆蓋允許／拒絕的 preflight、origin 拒絕、非 POST、缺少／無效 Bearer token，以及成功時只刪除 token 對應的 ID 並使用後端管理 key。7 個子測試全通過。這不驗證 Supabase gateway JWT、正式 Auth Admin 權限、CORS 部署、Edge secrets 或資料庫 trigger，仍需在 Supabase 環境驗證。

## 配對狀態查詢進行中也要保留取消操作

- **經驗：** 配對狀態輪詢尚未返回時若直接忽略取消，玩家在短暫網路延遲期間會按了取消卻留在佇列。應先記錄取消意圖、讓畫面顯示正在取消，待目前 RPC 完成後再送出取消；若狀態先確認已配對，則以伺服器狀態進入房間。取消回應可能只有 `matched` 而沒有 `room_id`，此時要再查詢狀態取得完整房間資料。
- **適用範圍：** 有輪詢狀態且可被使用者取消的配對、工作佇列或長時間網路操作。
- **本專案做法：** `finishMatchmakingRequest` 在狀態 RPC 結束時釋放忙碌狀態並送出待處理的取消；配對確認先發生時會停止取消並進房。`scripts/matchmaking-cancel-race.mjs` 用 headless Chrome 和可控的 mock RPC，驗證輪詢等待期間按取消、輪詢回報仍等待、取消回報已配對但無房間 ID、再查到房間並顯示真人遊戲頁。第一次 CI 執行（run 56）因測試結束後仍有遊戲輪詢而逾時；測試結束時改為模擬登出，清除房間輪詢，run 57 的 verify、`block_race` 和 deploy 全部通過。這驗證瀏覽器端的請求順序與畫面路由，不取代 PostgreSQL 鎖競態、Supabase Auth 或跨裝置實測。

## 檢舉功能要把流程草案和實際服務承諾分開

- **經驗：** 有檢舉按鈕和私有資料表不代表已建立審查服務。文件應分開描述已完成的資料收件／權限／保存機制、尚未實作的審查工具，以及需要營運方指定的人力、聯絡方式、時限和升級責任。任何回覆時間都應標示為待核准建議，直到有人力覆蓋並完成公告；收件成功也不等於案件已受理或即時處理。
- **適用範圍：** 尚無常設信任與安全團隊的 MVP、社群產品或任何新建的檢舉／申訴管道。
- **本專案做法：** 檢舉 RPC 僅接受同房玩家的一筆案件，含五種原因及最多 500 字說明；一般玩家不能直接查閱檢舉表，案件保留最長 180 天。路線圖把建議分流流程視為已草擬，但將實際人員、聯絡窗口、時限核准、受限審查佇列、稽核記錄和端對端營運驗證維持未完成。前端必須繼續說明目前沒有即時人工審查。

## 從錯置的 Git 遠端拆出新專案時重建乾淨歷史

- **經驗：** 工作目錄可能已經包含正確的新產品程式碼，但 `.git` 歷史和遠端仍屬於另一個專案。直接把功能分支推到新 repo 會帶入不相干的 commit ancestry，也容易再次推錯遠端。先核對預期檔案、未提交與未追蹤變更、忽略檔案和憑證；再複製工作樹但排除 `.git`，在新目錄初始化新的 `main` 和第一個提交。設定 remote 後先核對完整 owner/repo URL，再推送。
- **適用範圍：** 把誤放在既有 checkout 的產品原型拆成獨立 GitHub 專案、從實驗分支抽取乾淨交付物，或需要避免公開另一專案歷史時。
- **本專案做法：** 將 27 個同頻程式與文件檔案複製至獨立目錄，排除原 `.git`，確認 `site/supabase-config.js` 沒有真實設定，再以乾淨 `main` 推送到 `310182-sketch/samewave`。run #1、#2 因 Pages 尚未設定而在 `Configure Pages` 失敗；即使加上 `enablement: true` 也無法授予 integration token 建立 site 的權限。管理者在 Settings > Pages 選擇 GitHub Actions 後，run #5 的 verify、block_race、deploy 全部通過，公開首頁、robots.txt 和 sitemap.xml 均回傳 HTTP 200。

## 新 repo 的 Pages site 需由管理者先啟用

- **經驗：** 新建 repository 尚未設定 Pages 時，`actions/configure-pages` 可嘗試建立 Pages site，但預設 GitHub Actions integration token 可能沒有呼叫 Create Pages site API 的權限，並回報 `Resource not accessible by integration`。`enablement: true` 本身不會提升 token 權限；需先由有權限的管理者在 repository Settings > Pages 選擇 GitHub Actions，之後再讓 workflow 部署並檢查公開網址。
- **適用範圍：** GitHub Pages 尚未在 repository 設定頁啟用，且部署 workflow 使用預設 `GITHUB_TOKEN`／GitHub Actions integration 的新 repo。
- **本專案做法：** `samewave` 的 run #1、#2 中 verify 與 block_race 通過，但 deploy 因 Pages site 尚未啟用而失敗。確認 `enablement: true` 沒有管理權限後，改由 repo 管理者在 Settings > Pages 選擇 GitHub Actions；run #5 隨後完成部署，公開首頁和 sitemap 均可讀取。

## 審查佇列要把清單和敏感案件內容分開授權

- **經驗：** 審查清單只需提供 ID、類別、狀態與時間，敘述及雙方 ID 應等審查員主動開啟單一案件後才回傳。審查員需用明確 allowlist 驗證；涉案雙方不得查閱或處理該案件；領案要原子化以避免兩位審查員同時取得同一案件；清單瀏覽、開啟、領取與結案都應記錄 actor 和事件。
- **適用範圍：** 檢舉、申訴、濫用調查或其他只允許特定人員閱讀敏感案件內容的系統。
- **本專案做法：** `20261120000800_moderation_review_workflow.sql` 新增私有審查人員名單、無直接表格權限的審查 RPC、案件分頁、涉案者排除、列鎖領案、指定審查員結案，以及 private audit events 和 180 天清除。PGlite 與 PostgreSQL 16 多連線測試在 GitHub Actions run 1 的 verify、block_race jobs 通過；正式 Supabase RLS、審查人員 UI、人員配置及端對端營運流程仍未驗證。

## 多種登入方式需保留各自圖標與可更新標籤

- **經驗：** 登入入口若同時支援匿名及多個 OAuth provider，應以各 provider 可辨識的圖標幫助掃視；圖標需標記為裝飾，按鈕的文字名稱仍要完整描述動作。登入、連結、已連結等狀態會動態改變按鈕文案時，將文案放在獨立文字節點更新，避免直接設定按鈕 `textContent` 把 SVG 圖標刪掉。若訪客示範仍是主要上手路徑，登入卡片放在遊戲操作之後，並以狀態說明解釋服務未設定時為何停用。
- **適用範圍：** 同時提供訪客／匿名模式和多種社群登入的網站或 app；尤其適用於 provider 按鈕需在登入、帳號連結和已連結狀態間切換的介面。
- **本專案做法：** 首頁將登入卡片留在主題與配對表單下方，卡片仍以獨立底色和狀態提示辨識；匿名、Google、Facebook、X、Instagram、Threads 各自使用不同圖標。按鈕標籤使用獨立 span，`refreshAuthPanel` 只更新標籤節點；Supabase 未設定時保留停用狀態並說明本機示範不會保存資料。

## 新增配對主題需保持前後端目錄一致

- **經驗：** 題目主題不只出現在前端按鈕，也會影響每局題目查找、歷史顯示、邀請房建立、配對相容性、資料表檢查限制和「隨機主題」可抽取的範圍。新增類別應使用穩定的資料庫 key，並同步維護前端顯示名稱、題庫、RPC 驗證和資料表 constraint；用 forward-only migration 更新已存在的資料庫。回歸測試應逐一驗證新 key 可建立邀請房及相同主題配對，也應確認未知 key 會被拒絕。
- **適用範圍：** 以使用者選擇的分類決定題目或媒合相容性的問答遊戲、推薦系統和其他前後端共用 taxonomy 的產品。
- **本專案做法：** 在 `20261120000900_expand_topic_catalog.sql` 擴充 `question_bank`、`game_rooms` 和 `matchmaking_queue` 的允許值，新增影視娛樂、興趣嗜好、運動、寵物、閱讀學習及藝術文化六類題目，並更新邀請房與配對 RPC 驗證。前端 `topicChoiceKeys`、`topicLabels` 和題目字典共用對應 key；14 項 Deno/PGlite 測試新增每個新類別的邀請房／隨機配對及未知類別拒絕案例，Actions run #7 通過。

## 審查工作區只在 RPC 驗證後顯示案件

- **經驗：** 管理介面可在前端恢復 Auth session，但不能把「已登入」等同「有審查權限」。先用 allowlist RPC 確認帳號，再顯示佇列；清單只取案件 ID、類別、狀態和時間，開啟單筆時才呼叫詳情 RPC。每次 session 更新若權限重查失敗或拋錯，必須 fail closed：隱藏工作區、清空案件 DOM 與佇列、使舊請求失效並關閉待處理操作；登出和切換帳號也要清掉實際文字節點，不能只用 CSS 隱藏，以免敏感內容留在頁面 DOM。
- **適用範圍：** 需由少數授權人員查看敏感案件內容、一般登入者不應直接查表的檢舉或申訴工作區。
- **本專案做法：** `site/moderation.html` 以非匿名 provider 登入，`moderation.js` 先呼叫 `list_moderation_reports` 驗證 reviewer，再按需呼叫清單、詳情、領案與結案 RPC；所有文字用 DOM `textContent` 顯示，結案需二次確認。`scripts/moderation-access-lock.mjs` 以 headless Chrome 驗證 allowlist 拒絕、權限請求 reject、登出期間晚到的成功回應，以及案件文字和佇列從 DOM 清除；本機檢查和 Actions [run #15](https://github.com/310182-sketch/samewave/actions/runs/44772554124) 均通過。Pages 部署後再次讀取正式審查頁與 bundle，確認回應 200 且載入 `moderation.js?v=2`。Supabase reviewer 帳號及真人案件流程仍待線上驗收，不代表已配置人工值班或玩家回覆流程。

## 修改預設暱稱時要同步前後端和所有 RPC 版本

- **經驗：** 變更空白暱稱的文案，也要同步更新遊戲畫面初始值、前端 state 和讀取 fallback、所有會建立／加入房間或建立配對票券的資料庫 RPC，以及驗證這些流程的回歸案例。靜態網站需遞增前端 script 查詢版本，避免瀏覽器繼續載入舊 bundle。尚未部署的 migration 可直接修正；資料庫一旦套用，之後應使用 forward-only migration 更新函式，不要改寫已部署 migration。
- **適用範圍：** 同時由客戶端與服務端正規化可選名稱、設定值或預設分類的應用程式，特別是已使用版本化資料庫 migration 的服務。
- **本專案做法：** 依使用者選擇將預設由「小芯」改為「企鵝」，更新 placeholder、玩家標籤、兩處前端 fallback、七處 SQL fallback 和 Deno/PGlite 測試，並將 app.js 查詢版本由 12 遞增為 13。變更完成後 Actions run #7 的 verify、block_race 與 deploy 全部成功；後續 Supabase 前端設定變更由 Actions [run #8](https://github.com/310182-sketch/samewave/actions/runs/44766507013) 驗證部署成功。公開 GitHub Pages 回應 HTTP 200，並載入 `app.js?v=13` 及 `supabase-config.js?v=3`；後續依使用者回饋將暱稱欄提示簡化為「企鵝」，預設值與已部署的 RPC fallback 不變。Supabase migration 套用後如需再改 RPC fallback，必須新增 forward-only migration。

## 手動套用 Supabase migration 後先同步遠端版本紀錄

- **經驗：** 透過 Supabase SQL Editor 手動執行 migration 會更新資料庫結構，但不會自動建立 CLI 使用的 `supabase_migrations.schema_migrations` 紀錄。之後若直接執行 `supabase db push`，CLI 可能把這些 migration 視為尚未套用並重複執行。應先以唯讀查詢核對遠端 schema、資料、函式、觸發器和排程，再用 Supabase CLI 的 `migration repair --status applied` 登記已套用版本，最後用 `migration list` 逐一確認 local／remote 版本一致；不得為了補紀錄而重跑已套用的非冪等 SQL。
- **適用範圍：** 先以 Supabase Dashboard／SQL Editor 部署、後續打算改用 Supabase CLI 或版本化 migration pipeline 的專案。
- **本專案做法：** Samewave 的十份 migration 依檔名順序已透過 SQL Editor 套用。以唯讀 Supabase CLI 查核確認 50 題分屬 10 個 topic、重要資料表與 RLS、帳號刪除 triggers、共用 advisory lock 的四個 RPC、房間／配對恢復 RPC、審查私有資料表、房間 Realtime publication，以及兩個 active `pg_cron` jobs。透過 Supabase 網頁驗證碼登入官方 CLI，未複製或輸出 access token；以 `migration repair --status applied --remote=<project-ref> --yes` 登記十個已部署版本，`migration list --remote=<project-ref>` 顯示 local／remote 完全一致。沒有執行 `db push` 或重跑 SQL。此流程適用於先手動部署、後續改用 CLI 管理的 Supabase 專案；真實登入和跨裝置驗收仍需另外完成。

## 後端上線後同步更新登入狀態與操作說明

- **經驗：** 靜態前端從「本機示範」切換為連接真實 Auth 後，登入卡、配對說明和社群登入備註都要反映目前實際設定。避免保留「尚未設定後端」等過期文案，也不要把「已設定／已啟用」誤寫成「真人端對端流程已驗證」。清楚區分 Auth 設定就緒、使用者完成登入、以及房間／配對／歷史已通過實際驗收。
- **適用範圍：** 分階段上線的 web app，特別是 Auth、OAuth provider、付款或其他外部服務由設定逐步開通的產品。
- **本專案做法：** Samewave 的 `site/supabase-config.js` 已接上公開 Project URL／publishable key，首頁顯示匿名登入已啟用並列出尚未設定的 Google／Facebook／X／Instagram／Threads；README、路線圖和帳號刪除停用提示需同步記錄真實設定與未完成的端對端驗收。以 publishable key 唯讀呼叫 `/auth/v1/settings` 得 HTTP 200 並確認匿名使用者設定，未呼叫 sign-in 或建立測試帳號；同時以 OPTIONS 驗證正式 origin 為 200、未列入的 origin 為 403。這些是設定與 CORS readiness check，不代替真實登入、JWT 或刪除驗收。更新文件時也要核對相關 Pages workflow；run #13（44770155809）、#14（44771086564）和 #16（44773283489）成功部署。2026-11-21 的 live HTTP 查核確認首頁載入 `app.js?v=15`，新版停用與錯誤說明可從公開 bundle 讀到。
- **補充：** 若破壞性功能已部署但因尚未驗收而關閉，前端應說明「目前未開放」和待完成的驗收條件，不要再寫「尚未部署」。操作失敗時也要使用「無法確認結果」等不會假設伺服器端未成功的訊息，避免因回應中斷造成使用者重複執行破壞性操作。

## 靜態網站要區分搜尋收錄與 Search Console 提交

- **經驗：** Google 的 `site:` 查詢能確認搜尋結果中是否已出現某個網址，但不能證明所有頁面都已收錄或保證排名。公開 `robots.txt` 和 sitemap 回應成功也不代表 sitemap 已提交到 Search Console；提交需要網站擁有權驗證。Search Console 顯示「已成功提交」仍不代表已讀取或解析 sitemap，應另外檢查已提交列表中的抓取狀態與找到的 URL 數。
- **適用範圍：** GitHub Pages 等靜態網站，以及沒有伺服器端搜尋分析工具的公開網站。
- **本專案做法：** 2026-11-21 以 `site:310182-sketch.github.io/samewave` 查詢，Google 結果已出現同頻網站；`robots.txt` 和 `sitemap.xml` 均回 HTTP 200。以首頁 HTML 標籤驗證 Search Console 擁有權並提交 sitemap 後，Search Console 接受提交，但詳細狀態顯示「無法讀取 Sitemap」及 0 個已探索網頁；一般及 Googlebot User-Agent 對 XML 的請求仍回 HTTP 200、`application/xml`，內容是有效的單頁 urlset。保留驗證標籤和提交紀錄，待 Google 後續處理，再依報表狀態排查；不要只憑提交成功提示就勾選 sitemap 處理完成。

## 部署破壞性 Edge Function 前先限制來源並驗證預檢

- **經驗：** 會刪除帳號或其他使用者資料的 Edge Function，應同時以 Auth JWT 確認呼叫者、由 token 取得操作對象、將服務端管理 key 留在平台 secrets，並限制精確網站 origin。部署後先用不改動資料的 CORS `OPTIONS` 預檢確認只允許正式網站與預期 method，再進行真實登入和刪除驗收；未完成破壞性路徑驗收前，產品介面保持停用。
- **適用範圍：** Supabase Edge Functions、Deno serverless API，以及需要以後端管理權限替登入者執行刪除或帳號管理操作的應用程式。
- **本專案做法：** 將 repository 中經 Deno request tests 驗證的 `delete-account` 部署到 Samewave Supabase，啟用 JWT gateway 驗證，將 `ALLOWED_ORIGINS` 設為 `https://310182-sketch.github.io`，並使用 Supabase 內建 server-side `SUPABASE_SERVICE_ROLE_KEY`；未讀取或複製該 key。正式 origin 的 OPTIONS 預檢回 HTTP 200 並回傳精確 `Access-Control-Allow-Origin`；`https://example.org` 預檢回 403 且沒有允許來源標頭。真實 JWT、Auth Admin 刪除和資料庫收尾尚未驗證，因此公開網站仍維持 `accountDeletionEnabled: false`。

## 雙方同意續玩時建立新房間並保留原始歷史

- **經驗：** 續玩邀請應指向已完成的來源對局，狀態只透過驗證玩家身分的 RPC 讀取；第一位玩家發出邀請，另一位玩家以明確操作接受。建立新房間前，在同一資料庫交易鎖內檢查封鎖關係和雙方是否已在其他有效房間，避免接受與封鎖／新配對同時發生。新局沿用兩位玩家和主題，但不複製答案，也不修改上一局的歷史。
- **同步與生命週期：** 來源房間的 Realtime 更新只負責通知另一端重新讀取 RPC 狀態，另保留輪詢以承受 Realtime 事件遺失。邀請到期後可重新發起。前端在切換帳號或離開結果頁時取消舊訂閱和輪詢，避免晚到回應把使用者帶入錯誤房間。
- **適用範圍：** 雙人遊戲、協作任務或其他須經雙方同意後重新建立工作階段的產品。
- **本專案做法：** `request_same_player_rematch` 和 `get_same_player_rematch_status` 僅授權 authenticated RPC 執行；全域 advisory transaction lock 串行化邀請接受與配對／開房，阻擋任一方被封鎖或已在別的有效房間時建立新局。PGlite 測試覆蓋互相同意、非成員拒絕、封鎖、有效房間、逾期重邀和新舊歷史隔離；Chrome mock 驗證待同意及接受後進入新房間。正式 migration 已部署，兩個測試 session 的真實 RPC 流程及 GitHub Pages 發布均通過；Actions [run 44854423906](https://github.com/310182-sketch/samewave/actions/runs/44854423906) 驗證多連線競態。首次競態測試因前置案例留下等待房間而正確回報 busy，需在測試 fixture 中先關閉該房間再測邀請同意。Realtime 跨裝置驗收仍待執行。

## 社群登入狀態以 Supabase live 設定為準

- **經驗：** 靜態網站不應把 OAuth provider 是否啟用複製成容易過期的前端常數。可用 Supabase 公開 Auth settings endpoint 讀取內建 provider 的可用狀態；只傳公開 `apikey`，限制請求逾時，錯誤時停用內建 provider 按鈕並說明無法確認。這只反映 Supabase provider 開關，不能取代平台 OAuth app、callback、client credentials 或真實登入驗收。
- **適用範圍：** OAuth provider 狀態由託管 Auth 服務控制、前端部署與 Auth 設定分開管理的靜態網站或 app。
- **本專案做法：** `site/auth-provider-status.js` 讀取 `/auth/v1/settings`，把 Supabase `twitter` 映射為 UI 的 `x`，不讀取或傳輸 client secret；5 秒逾時及錯誤會 fail closed。`site/app.js` 以狀態更新按鈕與說明，並在 Supabase SDK 缺失時顯示錯誤而非永久「確認中」。`scripts/auth-provider-status.test.mjs` 覆蓋 provider 映射、非成功回應、缺少公開設定和不完整回應，4 項通過；Pages workflow 同時檢查 helper 語法並執行測試。Supabase 線上設定目前確認 Google 開啟、Facebook／X 關閉、Instagram／Threads 未設定，匿名登入也開啟。Auth settings 只代表 provider 開關，不能取代真實 OAuth callback 驗收。

## 縮減登入 provider 時移除停用按鈕

- 經驗：動態停用不支援的登入按鈕，仍會讓使用者看見無法使用的選項。縮減登入範圍時，應同步移除首頁與管理頁的按鈕和 provider 呼叫，將 Auth settings helper、設定欄位、無障礙標籤、說明文字和測試斷言限制到支援清單。匿名入口可另外保留，不要把它與社群 provider 混為一談。
- 適用範圍：從多種 OAuth 登入收斂到少數 provider 的靜態網站或 App，尤其是遠端設定會停用按鈕但產品已不打算提供該登入方式時。
- 本專案做法：Samewave 保留匿名登入並只提供 Google OAuth；Auth settings 確認 Google 與 Anonymous Auth 開啟，Facebook／X 關閉，Instagram／Threads 未設定。Google-only 介面移除其他 provider 標記和審查工作區按鈕；PR #3 已 rebase 合併，Actions run 44927437625 的 verify／block_race／deploy 全部成功。公開首頁載入 app.js?v=18；瀏覽器確認匿名和 Google 是僅有的登入入口，並以已授權測試帳號驗證 Google 登入與新分頁 session 恢復。Google OAuth 仍在外部測試模式，匿名帳號 linking 尚待驗收。

## 合併公開 repository 前檢查 commit email

- 經驗：公開 repository 會顯示 commit 的作者與提交者資訊。GitHub rebase merge 可能保留原始作者，卻以合併者更新 committer；「作者是 noreply」或預覽畫面未列 email，都不能證明提交者欄位也隱去個人 email。
- 適用範圍：GitHub 公開 repository，尤其使用帳號 email 建立 merge commit 或 squash commit 時。
- 本專案做法：PR #3 以 rebase merge 發布。合併前分支 commits 的作者與提交者都使用 noreply，但合併後產生的 commit 更新了 committer 身分；未來公開合併應在發布前後分別檢查 commit author 與 committer 的 email，並優先使用 GitHub noreply。若已公開個人 email，不要自行改寫 main history；先詢問 repository owner，因為 GitHub 仍可能透過 PR refs 保留舊 commit。

## 手動執行 SQL 後同步 Supabase CLI migration ledger

- **經驗：** 在 Supabase SQL Editor 手動執行 migration 不會自動更新 CLI 的 migration history。先用官方 CLI `migration list` 確認現有版本，再從含該版本 SQL 檔的工作分支執行 `migration repair --status applied`，最後再次執行 `migration list`。若本機找不到對應檔案，CLI 會拒絕登記；應換到正確分支，不可重跑 SQL，也不可直接寫 migration history table。
- **適用範圍：** 因 CLI 暫不可用而先在 Supabase Dashboard 套用 migration，之後要恢復本機 schema 歷史一致性的專案。
- **本專案做法：** `20261121000200_six_digit_invite_codes.sql` 已由使用者在 SQL Editor 執行，七項遠端功能檢查通過。官方 CLI 先確認既有十一個版本一致；在只有十一份 migration 的 `main` 執行 repair 時，CLI 因本機缺少第十二份檔案而安全拒絕。切換到包含 migration 的 PR #1 工作樹後，才登記該版本並再次確認十二個 local／remote 版本一致，沒有重跑 SQL。PR #1 於 2026-11-22 rebase merge；Actions run 44931736216 的 verify、block_race、deploy 全成功，公開 app.js?v=19 已載入六碼功能。部署完成後同時檢查 Actions 三個 job、公開 HTML 版本標記和實際 JavaScript bundle；靜態部署確認不代替真人 Auth／Realtime 驗收。

## 未登入角色的資料存取預檢

- **經驗：** 靜態網站的 publishable key 是公開設定。可用它但不帶使用者 bearer session，對已知的受保護 PostgREST 資料表發 `HEAD`／`limit=0`，只觀察狀態碼或零列計數，避免把私有資料列讀回測試環境。HTTP 401／403 可證明匿名角色遭拒；若回 200 且零列，只代表該角色目前看不到列，不能證明登入後的 row-level ownership。
- **適用範圍：** Supabase 等 PostgREST 靜態前端在首次登入前的權限預檢；不取代以兩個真實使用者 session 驗證本人可讀、他人不可讀的 RLS 測試。
- **本專案做法：** 2026-11-22 從公開網站讀取 client 設定但不輸出 key，以無 session 的 HEAD／`limit=0` 探測 `game_answers`、`player_match_history` 和 `player_safety_reports`；三者皆回 HTTP 401，未讀取資料列。驗收報告只宣稱匿名角色拒絕，不把它擴大成完整 RLS 驗收。

## 六位數字邀請碼與猜測限流

- **經驗：** 人類手動輸入的短數字代碼應保留前導零、避免取模偏差，並在伺服器端原子地處理唯一性和猜測限流。有限空間的邀請碼需要明確的到期時間、舊格式過渡策略及不可由瀏覽器直接讀取的限流紀錄。
- **適用範圍：** 有期限、由真人互相分享的短邀請碼；不可將「每個帳號限次」描述成能抵擋大量新帳號或完整機器人濫用的保證。若威脅模型包含匿名帳號農場，還需評估 CAPTCHA、IP／裝置級邊界或更高熵代碼。
- **本專案做法：** `generate_room_invite_code()` 從密碼學隨機來源取 20 位元區塊，只接受小於 1,000,000 的值以避免取模偏差，再左補零成六碼；唯一索引衝突時重試。`join_invite_room` 將玩家每十分鐘的嘗試限制為五次，限流表留在 private schema 並啟用 RLS；RPC 交易鎖保護計數更新，舊 12 位十六進位代碼在過渡期仍可加入。PGlite 覆蓋前導零、錯誤碼限流、有效玩家隔離及舊碼，headless Chrome 覆蓋前端格式、Enter 提交和錯誤提示。正式 migration 先在 Supabase 手動套用並驗證，再同步 CLI ledger；PR #1 合併後 Pages run 44931736216 的 verify、block_race、deploy 全部成功。

## Realtime 狀態通知搭配自適應輪詢

- **經驗：** Realtime 事件應只代表「狀態可能更新」；前端收到事件後仍透過有權限檢查的 RPC 讀取權威狀態，不直接信任事件 payload。保留輪詢可處理事件漏失與頻道中斷；健康訂閱時可降低備援頻率，偵測到 `CHANNEL_ERROR`、`TIMED_OUT` 或 `CLOSED` 時，立即縮短輪詢間隔。重新進入房間或切換使用者時，重設訂閱可用旗標並清除舊頻道和計時器，避免錯用上一局的連線狀態。
- **適用範圍：** Supabase Realtime／WebSocket 作為低延遲提示，另有權威 API 或 RPC 可讀取狀態的房間、工作階段及協作狀態頁；不適用於只能靠輪詢保證交付的關鍵通知。
- **本專案做法：** 真人對局和同玩家續玩在 `game_rooms` 更新上訂閱 Realtime，事件觸發既有狀態 RPC。健康訂閱時每 10 秒輪詢備援，頻道錯誤／逾時／關閉時恢復每 3.5 秒；headless Chrome 檢查跨房間 filter、事件觸發重新讀取、逾時 fallback 及恢復後的輪詢頻率。這些 mock 檢查不替代兩部隔離裝置的 Supabase 推播驗收。

## 鍵盤 Enter 應觸發目前輸入流程

- **經驗：** 表單輸入欄的 Enter 鍵應呼叫與主要按鈕相同的驗證及提交函式；沿用已改名或屬於示範流程的 handler 會讓鍵盤使用者觸發錯誤操作，甚至產生未定義函式錯誤。以瀏覽器事件測試同時驗證按鈕和 Enter 路徑，並確認兩者向後端傳入相同正規化資料。
- **適用範圍：** 對話框、房間代碼、搜尋欄、表單及任何提供按鈕提交的鍵盤可操作輸入。
- **本專案做法：** 房間代碼輸入欄原先按 Enter 呼叫不存在的 `joinDemoRoom`。改為呼叫 `joinInviteRoom`，headless Chrome 檢查 Enter 會提交六碼邀請代碼、保留前導零、正規化舊碼，並呈現伺服器限流訊息。

## 部署後先區分舊分頁與目前公開版本

- **經驗：** 靜態網站部署完成後，已開啟的分頁仍保留當時載入的 HTML、JavaScript 和 DOM；直接看那個分頁可能會誤以為新版本沒有上線。驗收時應對照 Actions 部署結果、重新讀取公開 HTML／bundle，並在新分頁確認實際登入選項。若只有舊分頁顯示過時內容，重新載入該分頁後再判斷快取問題。
- **適用範圍：** GitHub Pages、CDN 或其他靜態網站在部署後變更登入入口、導覽、文案或其他可見 UI 的驗收。
- **本專案做法：** 2026-11-22 Actions run 44932784745 的 verify、block_race、deploy 全部成功。公開首頁 HTTP 200 並載入 `app.js?v=19`；先前開啟的同頻分頁仍顯示部署前的 Facebook、X、Instagram 和 Threads 按鈕，而同網址新分頁只顯示匿名與 Google 入口，且已恢復 Google 測試 session。此證據確認公開版本是 Google-only；舊分頁尚未重新載入，因此只記錄為舊頁面狀態，不推論為 CDN 快取故障。

## 以隔離 mock 驗證匿名帳號的 Google 連結分支

- **經驗：** 社群登入前端應分別驗證「沒有 session 時呼叫 OAuth sign-in」與「已匿名登入時呼叫 identity linking」；後者需把既有 session 的 user ID 傳進 linking 流程，避免連結按鈕意外改走全新登入。headless browser 可驗證 UI 狀態、provider ID、redirect URL 與呼叫分支，但模擬 session 保持 ID 不代表 Supabase 已完成 OAuth callback 或雲端帳號／歷史真的合併。
- **適用範圍：** 在正式 OAuth provider 已設定、但需要無副作用地回歸單頁應用登入與匿名帳號升級分支時使用。真人 Manual Linking、PKCE callback、session 重載與伺服器資料保留仍須另外驗收。
- **本專案做法：** 新增 `scripts/auth-login-flows.mjs`，以 loopback HTTP 和隔離 Chrome profile 載入首頁，使用不連外的 Supabase Auth mock。測試先確認未登入時只有 Google `signInWithOAuth`，再建立匿名 mock session，確認 Google 會改呼叫 `linkIdentity` 並沿用原 player ID；另外確認 redirect 指向目前子路徑。headless Chrome 與五項 Auth provider status 測試在本機通過；Actions [run 44934151866](https://github.com/310182-sketch/samewave/actions/runs/44934151866) 的 verify、block_race、deploy 全部成功，Pages workflow 會在每次部署前執行此流程。測試只建立 mock 資料，不會建立或刪除 Supabase 使用者。

## 操作 OAuth 專案前確認目前 Google 帳號與發布狀態

- **經驗：** 同一瀏覽器可能保留多個 Google 帳號；Cloud Console 顯示「沒有專案存取權」時，先核對目前登入帳號與專案預期所屬帳號／組織。不可因目前帳號看不到資源就直接建立替代專案、移轉 OAuth app 或送出 IAM 存取要求，應切回已指定的擁有者帳號後再檢查。另須分開記錄 OAuth 的 Testing／Production 發布狀態和 Google 驗證狀態：驗證中心顯示 Testing「不需要驗證」，不代表 app 已發布或一般帳號可用。發布按鈕若指向品牌設定，應逐項核對首頁、隱私政策、服務條款、支援聯絡方式和授權網域；上傳標誌可能會要求送交驗證。
- **適用範圍：** Google Cloud 專案由個人帳號建立、瀏覽器同時登入學校／公司／個人帳號，或 OAuth client、憑證要放在特定組織下的操作。
- **本專案做法：** 2026-11-22 先發現 Cloud Console 使用學校管理帳號且沒有 `samewave-auth` 讀取權；依使用者選擇改用個人帳號 `c280617@gmail.com` 後，唯讀確認專案可存取。Audience 顯示 Testing、1 位測試使用者、發布按鈕停用並要求完成 Branding；品牌名稱及支援信箱已填，首頁／隱私政策／服務條款尚空白，授權網域只有 `bbpfgavabdsdayuprhbp.supabase.co`。Verification Center 明確說 Testing 不需要驗證。沒有修改設定或發布；仍須確認 GitHub Pages 網域資格、完成品牌資料，再由使用者明確核准 Production，並以測試名單外帳號驗證登入。

## 將遊戲內資料告知整理成可連結的隱私頁

- **經驗：** OAuth 品牌設定需要可公開瀏覽的網站和隱私政策入口時，可先把已確認的遊戲內資料告知整理成獨立靜態頁，採相對資產與回首頁路徑，並更新首頁連結、canonical、Open Graph 和 sitemap。保留跟遊戲內版本一致的用途與保存期限；若營運者法定名稱、服務地區或資料權利申請流程未定，清楚標為待覆核的資料說明草稿，不能宣稱已完成法律審查，也不能以草稿冒充正式政策。
- **適用範圍：** GitHub Pages 等靜態產品需要 OAuth 可連結的資料處理說明、但完整法務資訊尚未取得時；草稿可協助準備設定，不代表 Google verification 或法律合規已完成。
- **本專案做法：** 建立 `site/privacy.html`，明列 Supabase Auth、遊戲資料和檢舉資料的用途與目前 24 小時、90 天、180 天保存期限，註明自助刪除尚未開放及人工檢舉處理未配置；以頁面提示要求正式公開前覆核營運者名稱、適用地區和權利申請流程。首頁新增獨立頁面連結並加入 sitemap。頁面仍在尚未合併的分支；部署後可被公開連結，仍須確認 GitHub Pages 網域授權和正式政策內容後，才能提交 Google 品牌設定。


## 同步前端題庫與服務端主題允許清單

- **經驗：** 新增遊戲分類時，不能只加前端選項和本機題目。已部署的資料表約束以及建立邀請房、隨機配對 RPC 常有獨立 allow list；若漏改任一層，示範能玩、真人模式卻會拒絕主題。
- **適用範圍：** 前端內嵌題庫搭配 PostgreSQL 題庫、RPC、邀請房或配對佇列的遊戲。
- **本專案做法：** 每個主題同時更新前端題庫與 label/key 映射、題目選單、題庫及房間／配對約束、邀請和配對 RPC allow list、migration 回歸目錄數量。已套用的 migration 保持不變，以 forward-only migration 擴充；含政治等敏感偏好的主題另需更新隱私告知和保存期限。

## 讓可選題數貫穿整局與保存資料

- **經驗：** 把每局題數視為房間設定，而不是只在首頁控制前端陣列長度。建立邀請房及配對票券時都要保存它；配對須以相同題數為條件，並在房間狀態、逐題進度、結果、歷史及續玩回傳／沿用。若舊用戶端仍以舊 RPC 參數呼叫，保留明確的相容 wrapper 和既有預設值。測試應覆蓋所有允許值、非法值、不同題數不可互配以及完局後歷史和續玩仍使用原題數。
- **適用範圍：** 允許玩家選擇問卷／測驗長度，且長度會影響房間、配對、結果或歷史資料的前端與資料庫應用。
- **本專案做法：** Samewave 提供 5、10、15 題選擇，預設 5 題；15 個主題各有 15 題。三份 forward-only migration 把題數接到房間、配對佇列、RPC 和歷史摘要，隨機配對只接相同題數，同玩家續玩繼承原值，舊兩參數 RPC wrapper 保持 5 題。2026-11-22 本機 20 項 PGlite migration 測試通過，headless Chrome 完整跑完 5／10／15 題並核對進度和結果；之後正式 Supabase CLI ledger 確認 15/15，唯讀查詢確認 15 類各 15 題、新舊 RPC 簽名及欄位限制。仍需以正式使用者 session 驗證邀請房、隨機配對、歷史和續玩，再將前端部署後檢查公開版本。
