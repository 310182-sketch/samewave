(() => {
  "use strict";

  const questionBank = {
    旅行: [
      { prompt: "抵達目的地比預計晚一小時，你會？", choices: ["先刪掉一個景點，保住晚餐安排", "改去車站附近走走，整體行程往後挪"], demoAnswer: 1 },
      { prompt: "在陌生城市轉乘時，你會？", choices: ["先看地圖和月台資訊再移動", "問站務人員確認最順的路線"], demoAnswer: 0 },
      { prompt: "訂住宿時，你會先比對？", choices: ["到車站或景點的交通時間", "房間評價、隔音和床的舒適度"], demoAnswer: 1 },
      { prompt: "想吃的店門口排了很長隊，你會？", choices: ["照排，把這餐當成行程重點", "找附近不用等太久的替代店"], demoAnswer: 0 },
      { prompt: "旅行中午開始下雨，你會？", choices: ["把戶外景點換成附近室內行程", "買雨具，照原計畫繼續逛"], demoAnswer: 1 },
      { prompt: "搭車要坐四小時，你會先準備？", choices: ["下載歌單或影片，路上離線看", "帶本書或待辦，利用移動時間"], demoAnswer: 0 },
      { prompt: "早上集合前還有空檔，你會？", choices: ["照原定時間出門，多留些緩衝", "在住宿附近吃早餐再開始"], demoAnswer: 1 },
      { prompt: "進展館時朋友想拍照，你會？", choices: ["先把合照拍好，再慢慢逛", "邊走邊拍喜歡的作品和細節"], demoAnswer: 1 },
      { prompt: "買旅行紀念品時，你比較會挑？", choices: ["當地常用的小物，回家還用得到", "能代表這趟旅程的限定物"], demoAnswer: 0 },
      { prompt: "火車或班機延誤兩小時，你會？", choices: ["先查替代交通和改票規則", "找地方休息吃東西，等最新通知"], demoAnswer: 0 },
      { prompt: "一天安排三個景點，你會？", choices: ["先排順路的路線，減少折返", "先選最想去的，其他看時間"], demoAnswer: 1 },
      { prompt: "行李箱快滿了，你會？", choices: ["留一點空間給回程想買的東西", "精簡攜帶，到當地再補必需品"], demoAnswer: 0 },
      { prompt: "到當地的第一餐，你會？", choices: ["找在地家常店或市場小吃", "找評價穩定、離住宿近的餐廳"], demoAnswer: 1 },
      { prompt: "旅程最後一天，你會？", choices: ["提早回住宿整理行李、確認交通", "把握剩下時間再逛一個地方"], demoAnswer: 0 },
      { prompt: "旅行照片要整理，你會？", choices: ["按日期和地點分類，方便日後找", "挑幾張傳給同行的人一起回味"], demoAnswer: 1 },
    ],
    音樂: [
      { prompt: "通勤時平台推薦一首新歌，你會？", choices: ["先聽完整首，喜歡再收藏", "記下歌名，晚點戴耳機仔細聽"], demoAnswer: 1 },
      { prompt: "一張新專輯剛上架，你會先？", choices: ["從第一首一路聽完", "先點開主打或朋友提過的歌"], demoAnswer: 0 },
      { prompt: "最喜歡的歌出現在現場歌單，你會？", choices: ["跟著一起唱，享受全場氣氛", "留意現場編曲和演出細節"], demoAnswer: 1 },
      { prompt: "買演唱會票時，你更在意？", choices: ["先挑離舞台近的位置", "找視野和價格都合適的座位"], demoAnswer: 0 },
      { prompt: "歌詞有一句聽不清楚，你會？", choices: ["找歌詞對著再聽一次", "先不查，繼續感受旋律和演唱"], demoAnswer: 1 },
      { prompt: "朋友傳一首歌給你，你會？", choices: ["馬上點開聽完再回覆", "先存起來，晚點找時間聽"], demoAnswer: 0 },
      { prompt: "工作時放音樂，你偏好？", choices: ["播熟悉的歌單，不用一直選歌", "開隨機播放，聽聽新發現"], demoAnswer: 1 },
      { prompt: "演唱會前一週，你會先？", choices: ["重聽歌單，熟悉每首歌", "查交通和入場資訊，安排當天行程"], demoAnswer: 1 },
      { prompt: "一首歌聽第二遍時，你會注意？", choices: ["副歌旋律有沒有記住", "歌詞或編曲裡的小細節"], demoAnswer: 0 },
      { prompt: "老歌重新播放時，你會？", choices: ["想起以前聽它的情境", "注意以前沒聽見的樂器或歌詞"], demoAnswer: 1 },
      { prompt: "想認識一位新歌手，你會？", choices: ["先看一段現場演出", "先聽專輯或代表歌曲"], demoAnswer: 0 },
      { prompt: "歌單裡某首歌最近聽膩了，你會？", choices: ["先跳過，過段時間再回來聽", "換掉它，找首新歌放進去"], demoAnswer: 0 },
      { prompt: "挑耳機時，你比較重視？", choices: ["音質和降噪表現", "戴久舒適、攜帶方便"], demoAnswer: 1 },
      { prompt: "音樂祭同時有兩個想看的舞台，你會？", choices: ["為最想看的演出提早卡位", "兩邊都聽一些，走動感受現場"], demoAnswer: 0 },
      { prompt: "聽完一首很有感的歌，你會？", choices: ["傳給可能也會喜歡的人", "先加進自己的收藏清單"], demoAnswer: 1 },
    ],
    日常: [
      { prompt: "平日鬧鐘響了，你通常會？", choices: ["起來先整理出門用品", "再躺五分鐘，醒透再準備"], demoAnswer: 1 },
      { prompt: "出門前發現少帶一件東西，你會？", choices: ["回房找齊再出門", "先出門，看看路上能不能補"], demoAnswer: 0 },
      { prompt: "午休只剩半小時，你會？", choices: ["先吃飯，再留幾分鐘休息", "買方便帶走的餐點，找地方坐一下"], demoAnswer: 0 },
      { prompt: "今天有三件待辦都要做，你會？", choices: ["先處理最接近期限的一件", "先完成最快的小項目"], demoAnswer: 1 },
      { prompt: "群組訊息一直跳出來，你會？", choices: ["有空就回，減少未讀訊息", "忙完一段再集中處理"], demoAnswer: 1 },
      { prompt: "下班回家看到包裹和待洗衣服，你會先？", choices: ["拆包裹並把東西收好", "先把衣服分類開洗"], demoAnswer: 1 },
      { prompt: "冰箱裡有快到期的食材，你會？", choices: ["先想一道料理把它用掉", "下次採買時少買一點"], demoAnswer: 0 },
      { prompt: "今天突然多出一小時，你會？", choices: ["把擱著的小事處理掉", "留給休息或散步"], demoAnswer: 0 },
      { prompt: "週末朋友問你要不要出門，你會？", choices: ["先確認時間和地點再答覆", "先說有空，當天再看狀態"], demoAnswer: 1 },
      { prompt: "想養成喝水或伸展的習慣，你會？", choices: ["設定固定提醒", "把水杯或瑜伽墊放在看得到的地方"], demoAnswer: 0 },
      { prompt: "下雨讓通勤路線變慢，你會？", choices: ["提早出門，改搭別的交通方式", "走熟悉的路線，多留等候時間"], demoAnswer: 1 },
      { prompt: "家裡的日用品快用完，你會？", choices: ["放進購物清單，下次一起買", "用完再去附近補貨"], demoAnswer: 0 },
      { prompt: "睡前想放鬆一下，你會？", choices: ["看一段短片或讀幾頁書", "整理明天要用的東西後休息"], demoAnswer: 1 },
      { prompt: "手機相簿累積了很多照片，你會？", choices: ["定期刪除重複照片並分類", "要找照片時再用搜尋"], demoAnswer: 1 },
      { prompt: "開始一個新習慣時，你會？", choices: ["固定放進行程表", "先從兩三分鐘的小步驟開始"], demoAnswer: 0 },
    ],
    飲食: [
      { prompt: "到餐廳發現菜單有招牌菜和新品，你會？", choices: ["點招牌菜，吃店家最熟悉的味道", "試試期間限定的新口味"], demoAnswer: 1 },
      { prompt: "和朋友多人聚餐點菜，你偏好？", choices: ["點幾道菜一起分享", "各自點最想吃的一份"], demoAnswer: 0 },
      { prompt: "午餐店外排了不少人，你會？", choices: ["留下來排隊吃原本想吃的", "改找附近不用等太久的店"], demoAnswer: 0 },
      { prompt: "飲料店問甜度和冰量，你通常？", choices: ["照平常固定的選法", "看今天的天氣或口味調整"], demoAnswer: 1 },
      { prompt: "餐點份量比預期大，你會？", choices: ["和同桌分著吃，多試幾種", "先吃自己點的，剩下再打包"], demoAnswer: 1 },
      { prompt: "去市場或超市買菜，你會？", choices: ["照這幾天的菜單買需要的", "看看當季食材再決定煮什麼"], demoAnswer: 0 },
      { prompt: "自己煮一道沒做過的料理，你會？", choices: ["找食譜照步驟準備", "用手邊食材邊煮邊調整"], demoAnswer: 1 },
      { prompt: "晚餐有剩菜，你會？", choices: ["改成另一道料理當下一餐", "分裝保存，之後加熱吃"], demoAnswer: 0 },
      { prompt: "點一碗辣的料理，你會？", choices: ["先選微辣，保留食材原味", "選平常能接受的辣度"], demoAnswer: 1 },
      { prompt: "早上快來不及出門，你會？", choices: ["坐下吃簡單早餐再出門", "帶著早餐在路上吃"], demoAnswer: 0 },
      { prompt: "點甜點時，你比較想？", choices: ["搭一杯咖啡或茶慢慢吃", "和朋友分食幾種口味"], demoAnswer: 1 },
      { prompt: "逛夜市時，你通常會？", choices: ["先找清單上最想吃的攤位", "邊走邊看，遇到想吃的就買"], demoAnswer: 0 },
      { prompt: "吃火鍋時，你會先下？", choices: ["需要煮比較久的食材", "容易熟的青菜和火鍋料"], demoAnswer: 1 },
      { prompt: "挑一間新餐廳時，你先看？", choices: ["菜色和餐點評價", "座位、燈光和用餐環境"], demoAnswer: 1 },
      { prompt: "吃到喜歡的店，你會怎麼記？", choices: ["把店名和地址存到地圖", "記下最想再點的那道菜"], demoAnswer: 0 },
    ],
    影視娛樂: [
      { prompt: "新影集剛上架第一集，你會？", choices: ["先看一集，確認合不合口味", "等多更新幾集再開始追"], demoAnswer: 0 },
      { prompt: "朋友推薦一部作品但不想劇透，你會？", choices: ["問他最喜歡的地方是什麼", "先看預告和簡介再決定"], demoAnswer: 1 },
      { prompt: "看電影前，你通常會？", choices: ["避開影評，保留第一次觀看的感覺", "先看評分和短評挑片"], demoAnswer: 0 },
      { prompt: "喜歡的影集每週更新，你會？", choices: ["播出當天就看，避免被劇透", "週末再一次看累積的集數"], demoAnswer: 1 },
      { prompt: "在家看電影時，你偏好？", choices: ["關燈用大螢幕專心看", "邊吃點心邊放鬆看"], demoAnswer: 0 },
      { prompt: "作品裡出現陌生背景或名詞，你會？", choices: ["暫停一下查清楚再繼續", "先看完，之後再找資料"], demoAnswer: 1 },
      { prompt: "選字幕時，你通常會？", choices: ["用繁體字幕，跟上對白內容", "用原文字幕，聽演員說話語氣"], demoAnswer: 0 },
      { prompt: "追完一部作品後，你會？", choices: ["找幕後訪談或劇情解析", "直接開始片單裡的下一部"], demoAnswer: 1 },
      { prompt: "影集結尾留下伏筆，你會？", choices: ["找討論區看看大家怎麼推測", "先自己想一陣子再查消息"], demoAnswer: 0 },
      { prompt: "和朋友約看電影，選片時你會？", choices: ["先挑大家都想看的類型", "輪流挑片，這次聽朋友推薦"], demoAnswer: 1 },
      { prompt: "影音平台一直推薦短影片，你會？", choices: ["看完一支再接著刷", "挑一部作品坐下來完整看"], demoAnswer: 0 },
      { prompt: "看喜劇時，哪種橋段比較容易讓你笑？", choices: ["節奏很快的對白", "角色之間的互動和情境"], demoAnswer: 1 },
      { prompt: "電影開始跑片尾字幕時，你會？", choices: ["留在座位看完，等可能的彩蛋", "片尾一開始就整理東西離場"], demoAnswer: 0 },
      { prompt: "想重看一部舊作品，你會選？", choices: ["熟悉的最愛，再看一次經典段落", "片單裡一直沒空看的新作品"], demoAnswer: 1 },
      { prompt: "劇情出現重大轉折時，你會？", choices: ["立刻猜接下來可能怎麼發展", "先跟著角色的反應看下去"], demoAnswer: 0 },
    ],
    興趣嗜好: [
      { prompt: "想學一個新興趣，你會先？", choices: ["找線上教學跟著試做", "報名體驗課，請熟悉的人帶入門"], demoAnswer: 1 },
      { prompt: "做手作卡在某個步驟時，你會？", choices: ["換個方法試到做出來", "先查教學或問有經驗的人"], demoAnswer: 0 },
      { prompt: "想買第一件興趣器材，你會？", choices: ["先挑入門款，熟悉後再升級", "先借用或買二手，確認會常用"], demoAnswer: 1 },
      { prompt: "週末突然有兩小時空檔，你會？", choices: ["回去做已經熟悉的嗜好", "試一個一直想做的新活動"], demoAnswer: 0 },
      { prompt: "完成一件自己做的作品，你會？", choices: ["拍照分享給朋友看看", "先留在身邊，自己慢慢欣賞"], demoAnswer: 1 },
      { prompt: "想持續練一項技能，你會？", choices: ["每天練一小段，保持手感", "週末安排一段完整時間練習"], demoAnswer: 0 },
      { prompt: "剛加入興趣社團或群組，你會？", choices: ["先觀察大家分享的內容", "直接參加下一次聚會認識同好"], demoAnswer: 1 },
      { prompt: "收藏物品快沒有空間，你會？", choices: ["挑最喜歡的留下來展示", "整理收納方式，繼續收藏"], demoAnswer: 0 },
      { prompt: "開始一個新的興趣計畫，你會？", choices: ["先訂一個完成日期和步驟", "先做最想嘗試的部分再調整"], demoAnswer: 1 },
      { prompt: "做喜歡的活動做到一半累了，你會？", choices: ["休息一下，改天接著完成", "趁還有興致把這一段做完"], demoAnswer: 0 },
      { prompt: "想記錄自己的進步，你會？", choices: ["定期拍照或留下作品", "寫下練習心得和遇到的問題"], demoAnswer: 1 },
      { prompt: "朋友想一起培養嗜好，你會？", choices: ["選大家都沒試過的活動", "分享自己熟悉的玩法帶他入門"], demoAnswer: 1 },
      { prompt: "逛到興趣用品店時，你會？", choices: ["照清單找需要的東西", "慢慢逛，看看有沒有新靈感"], demoAnswer: 0 },
      { prompt: "一個嗜好開始變得很熟練，你會？", choices: ["挑戰更進階的技巧", "繼續做最享受的部分"], demoAnswer: 0 },
      { prompt: "有一個下午可以自由安排，你會？", choices: ["專心做一件喜歡的事", "把幾個小興趣輪流玩一下"], demoAnswer: 1 },
    ],
    運動: [
      { prompt: "下班後有四十分鐘，你會選？", choices: ["到附近快走或慢跑", "在家做一段短訓練"], demoAnswer: 0 },
      { prompt: "開始一個訓練計畫，你會？", choices: ["固定每週幾天安排運動", "看當天精神調整內容和時間"], demoAnswer: 1 },
      { prompt: "週末約球臨時少了幾個人，你會？", choices: ["改做個人技巧練習", "找少人數也能玩的方式"], demoAnswer: 0 },
      { prompt: "看一場球賽或比賽時，你會？", choices: ["留意比分和戰術變化", "跟著現場氣氛和精彩回合"], demoAnswer: 1 },
      { prompt: "挑一雙運動鞋時，你會先看？", choices: ["支撐和腳型是否合適", "重量和穿起來的腳感"], demoAnswer: 1 },
      { prompt: "學一個新的運動動作，你會？", choices: ["先看示範，確認動作再練", "找朋友一起練，互相提醒"], demoAnswer: 0 },
      { prompt: "戶外運動遇到太熱或下雨，你會？", choices: ["改到室內場地完成訓練", "把運動改到天氣合適的日子"], demoAnswer: 1 },
      { prompt: "運動 App 記錄了速度和距離，你會？", choices: ["看數字調整下一次的目標", "把紀錄當參考，主要看身體感覺"], demoAnswer: 0 },
      { prompt: "支持的隊伍比數落後時，你會？", choices: ["看教練是否調整戰術", "留意選手能不能把握下一次機會"], demoAnswer: 1 },
      { prompt: "和朋友一起運動，你比較喜歡？", choices: ["挑戰同一個目標互相鼓勵", "各做各的，休息時再聊天"], demoAnswer: 0 },
      { prompt: "安排一週運動時間，你偏好？", choices: ["早上完成，晚上留給休息", "傍晚活動身體，結束後再放鬆"], demoAnswer: 0 },
      { prompt: "訓練後隔天肌肉很疲累，你會？", choices: ["安排休息或輕鬆伸展", "改練別的部位或做低強度活動"], demoAnswer: 1 },
      { prompt: "第一次去新的運動場館，你會？", choices: ["先熟悉器材和場地規則", "跟著課程或朋友一起開始"], demoAnswer: 0 },
      { prompt: "正式運動前，你通常會？", choices: ["先做一套固定暖身", "從低強度開始，慢慢進入狀態"], demoAnswer: 1 },
      { prompt: "運動結束後，你最想先做？", choices: ["記下今天完成的訓練", "補充水分、沖澡休息"], demoAnswer: 1 },
    ],
    寵物: [
      { prompt: "第一次到朋友家遇到他的狗，你會？", choices: ["先問飼主能不能打招呼", "站遠一點，等狗狗自己靠近"], demoAnswer: 1 },
      { prompt: "每天遛狗要選路線，你會？", choices: ["走熟悉、車少的路", "換一條有新氣味和景色的路"], demoAnswer: 0 },
      { prompt: "安排寵物吃飯時間，你會？", choices: ["固定時間餵，方便觀察食量", "配合家裡作息，但維持份量規律"], demoAnswer: 1 },
      { prompt: "寵物在家看起來有點無聊，你會？", choices: ["拿互動玩具陪牠玩一會兒", "藏幾個零食讓牠自己探索"], demoAnswer: 1 },
      { prompt: "在公園遇到不熟的貓狗，你會？", choices: ["先詢問飼主再靠近", "保持距離，不打擾牠休息"], demoAnswer: 0 },
      { prompt: "出門旅行不能帶寵物，你會先安排？", choices: ["請熟悉的人到家照顧", "找合適的寵物旅館"], demoAnswer: 1 },
      { prompt: "要幫寵物梳毛或洗澡，你會？", choices: ["固定排進每週照護時間", "看毛況和活動狀態再安排"], demoAnswer: 0 },
      { prompt: "寵物正在窗邊專心看外面，你會？", choices: ["拍下牠的表情留作紀念", "坐在旁邊陪牠看一會兒"], demoAnswer: 0 },
      { prompt: "教寵物一個新指令，你會？", choices: ["每次練短一點，做對就獎勵", "融入散步或玩耍時自然練習"], demoAnswer: 1 },
      { prompt: "想確認寵物照護資訊時，你會？", choices: ["直接詢問獸醫或專業人員", "先查可信的照護資料，再核對來源"], demoAnswer: 1 },
      { prompt: "要挑家裡的寵物用品，你會先看？", choices: ["材質和尺寸是否安全合適", "是否容易清洗和收納"], demoAnswer: 0 },
      { prompt: "下雨天不能照常外出活動，你會？", choices: ["在家安排嗅聞或找物遊戲", "雨勢小時穿雨具短暫散步"], demoAnswer: 1 },
      { prompt: "寵物最近學會一個小動作，你會？", choices: ["每天花幾分鐘練習鞏固", "等牠自然表現時再給鼓勵"], demoAnswer: 0 },
      { prompt: "想記錄寵物的生活，你會？", choices: ["拍照整理成相簿", "記下飲食、活動和回診日期"], demoAnswer: 1 },
      { prompt: "想支持附近的動物收容單位，你會？", choices: ["找時間去當志工", "詢問需要的物資後捐用品"], demoAnswer: 0 },
    ],
    閱讀學習: [
      { prompt: "走進書店想挑一本書，你會先看？", choices: ["最近感興趣的故事或主題", "朋友推薦或榜上常見的書"], demoAnswer: 0 },
      { prompt: "開始學一個新技能，你會？", choices: ["先讀入門文章，了解基本概念", "先看示範，跟著做一次"], demoAnswer: 1 },
      { prompt: "讀到覺得實用的一段內容，你會？", choices: ["畫線或記下重點方便回看", "先繼續讀完，之後再整理"], demoAnswer: 0 },
      { prompt: "平日閱讀時間不固定，你會？", choices: ["每天安排十分鐘讀一點", "有完整空檔時再讀久一點"], demoAnswer: 1 },
      { prompt: "遇到很大的學習主題，你會？", choices: ["先看全貌和不同面向", "先挑最有興趣的一部分深入"], demoAnswer: 1 },
      { prompt: "拿到一本剛買的新書，你習慣？", choices: ["從第一章依序讀下去", "先翻目錄找最想看的章節"], demoAnswer: 0 },
      { prompt: "讀到一句很喜歡的話，你會？", choices: ["記下來或分享給朋友", "停下來想一想，再接著讀"], demoAnswer: 1 },
      { prompt: "學一個複雜概念時，你偏好？", choices: ["短文章和重點整理", "完整課程或較長的說明"], demoAnswer: 0 },
      { prompt: "閱讀時你比較容易專心的地方是？", choices: ["安靜、少有人打擾的角落", "有一點背景聲的咖啡店"], demoAnswer: 1 },
      { prompt: "選下一個學習主題，你會？", choices: ["延續最近正在研究的方向", "換個領域探索新內容"], demoAnswer: 1 },
      { prompt: "讀到不熟悉的詞，你通常？", choices: ["先查清楚意思再往下讀", "先看前後文推測再決定"], demoAnswer: 0 },
      { prompt: "讀完一本書或一門課，你會？", choices: ["找人聊聊最有印象的部分", "自己整理成筆記或心得"], demoAnswer: 1 },
      { prompt: "通勤時想讀書，你會選？", choices: ["帶紙本書，翻頁做記號", "用電子書或手機接著上次進度"], demoAnswer: 0 },
      { prompt: "要學一個新概念時，你會先？", choices: ["建立整體架構和關係", "看一個具體例子再理解規則"], demoAnswer: 1 },
      { prompt: "準備一場考試或報告，你會？", choices: ["提早分幾天安排進度", "先整理重點，再集中準備"], demoAnswer: 0 },
    ],
    藝術文化: [
      { prompt: "走進一間大型展館，你會先？", choices: ["看展覽地圖和主題介紹", "直接走向第一件吸引你的作品"], demoAnswer: 1 },
      { prompt: "欣賞一件看不太懂的作品，你會？", choices: ["讀旁邊的說明了解創作背景", "先看作品本身，說說自己的感受"], demoAnswer: 0 },
      { prompt: "買劇場或表演的票時，你會？", choices: ["挑能看清表情的近距離座位", "挑能看完整舞台和燈光的座位"], demoAnswer: 0 },
      { prompt: "逛一個有歷史的街區，你會？", choices: ["參加導覽，了解街道故事", "慢慢走，看店面和生活細節"], demoAnswer: 1 },
      { prompt: "週末有一場藝術工作坊，你會？", choices: ["報名試做，親手完成作品", "先看展覽或示範，再找時間學"], demoAnswer: 1 },
      { prompt: "遇到地方節慶或市集，你會？", choices: ["先看傳統活動和表演時段", "從攤位逛起，邊走邊認識內容"], demoAnswer: 0 },
      { prompt: "看一棟老建築時，你先注意？", choices: ["立面、屋頂和建材的細節", "它和周圍街道及生活的關係"], demoAnswer: 1 },
      { prompt: "想了解一項傳統習俗，你會？", choices: ["先查它的歷史由來", "問當地人現在怎麼實際參與"], demoAnswer: 0 },
      { prompt: "展覽有語音導覽時，你會？", choices: ["戴耳機按順序聽作品介紹", "自己走逛，挑有興趣的再聽"], demoAnswer: 1 },
      { prompt: "參加手作課程，你比較期待？", choices: ["學到一個能帶回家的技巧", "和其他參加者交流創作想法"], demoAnswer: 0 },
      { prompt: "在城市公共空間看到藝術作品，你會？", choices: ["停下來看細節和作者介紹", "想想它和這個地方的連結"], demoAnswer: 1 },
      { prompt: "一場表演中場休息時，你會？", choices: ["看看節目單和創作團隊資訊", "走出去伸展、和同行的人聊感受"], demoAnswer: 0 },
      { prompt: "週末展覽人很多，你會？", choices: ["先去較不擁擠的展區", "等待一會兒，近看最想看的作品"], demoAnswer: 1 },
      { prompt: "文化活動結束後，你會？", choices: ["買張明信片或小冊子留念", "記下最有印象的場景和想法"], demoAnswer: 1 },
      { prompt: "想認識一個城市的文化，你會先？", choices: ["走訪市場、老街和日常店家", "找一場展覽、音樂或戲劇演出"], demoAnswer: 0 },
    ],
    'K-pop': [
      { prompt: "回歸行程表一公布，你通常會？", choices: ["把預告和打歌日期存進行事曆", "追蹤官方社群，等通知再看"], demoAnswer: 0 },
      { prompt: "概念照釋出後，你最喜歡？", choices: ["和同好猜造型裡的概念線索", "挑一張喜歡的照片收藏"], demoAnswer: 1 },
      { prompt: "MV teaser 出來時，你會？", choices: ["逐格回放找彩蛋", "重播歌曲片段先記旋律"], demoAnswer: 0 },
      { prompt: "迷你專輯上線後，你想先？", choices: ["從頭到尾聽完整張專輯", "先看主打歌 MV 再補其他歌"], demoAnswer: 1 },
      { prompt: "回歸週的打歌舞台，你比較想？", choices: ["守直播看完整舞台", "等舞台影片和精華再慢慢看"], demoAnswer: 0 },
      { prompt: "看完打歌舞台，你會接著找？", choices: ["本命直拍和個人鏡頭", "全員舞台，重看隊形和編舞"], demoAnswer: 1 },
      { prompt: "拆專輯時，你最期待看到？", choices: ["寫真冊和整體概念設計", "小卡和其他隨機特典"], demoAnswer: 0 },
      { prompt: "抽到重複的小卡，你比較想？", choices: ["和同好交換，找想收藏的成員", "收進卡冊，當作這次回歸的紀念"], demoAnswer: 1 },
      { prompt: "官方周邊開始預購時，你會先？", choices: ["挑最想要的品項並抓好預算", "比較不同版本和特典再決定"], demoAnswer: 0 },
      { prompt: "準備搶台灣場演唱會門票，你會先？", choices: ["確認場次、票價區域和預算", "約好同行朋友並分配搶票準備"], demoAnswer: 1 },
      { prompt: "演唱會前一天，你會先準備？", choices: ["測試應援棒、連線和電池", "複習歌單和應援法"], demoAnswer: 0 },
      { prompt: "演唱會現場最期待哪一刻？", choices: ["應援棒跟著全場燈光一起亮起", "跟著應援法和全場一起大合唱"], demoAnswer: 1 },
      { prompt: "如果有機會參加粉絲見面會，你最期待？", choices: ["聽成員分享近況、近距離互動", "看特別舞台和現場遊戲環節"], demoAnswer: 0 },
      { prompt: "收到官方直播通知時，你通常會？", choices: ["準時打開直播一起留言", "等字幕或回放，有空再完整看"], demoAnswer: 1 },
      { prompt: "朋友剛想認識一個團體，你會先推薦？", choices: ["入坑歌單，從主打和收錄曲開始", "直拍、團綜或幕後影片看個人魅力"], demoAnswer: 0 }
    ],
    F1: [
      { prompt: "F1 賽事週末行程很滿，你最想完整看？", choices: ["排位賽，看看發車順序怎麼排", "正賽，追整場攻防和策略變化"], demoAnswer: 1 },
      { prompt: "一場比賽中有精彩超車，你會？", choices: ["回看車載畫面，注意車手怎麼切線", "看即時名次和後續戰局怎麼改變"], demoAnswer: 0 },
      { prompt: "週末賽事遇上時差，你會？", choices: ["設鬧鐘看現場直播", "隔天看精華和完整重播"], demoAnswer: 1 },
      { prompt: "車隊準備進站時，你最關注？", choices: ["輪胎選擇和進站時機", "車手出站後能否守住位置"], demoAnswer: 0 },
      { prompt: "現場看 F1 你會先挑？", choices: ["能看到起跑或進站的看台", "視野較廣、能看多個彎道的座位"], demoAnswer: 1 },
      { prompt: "排位賽最後一輪開始，你會？", choices: ["盯著車手的單圈時間變化", "看誰能擠進前排發車位置"], demoAnswer: 0 },
      { prompt: "比賽遇到雨勢變大，你會注意？", choices: ["車手如何控制賽車和抓地力", "車隊何時決定更換輪胎"], demoAnswer: 1 },
      { prompt: "車隊無線電傳來一段有趣對話，你會？", choices: ["回放聽前後文，了解當時情況", "接著看賽道上位置有沒有改變"], demoAnswer: 0 },
      { prompt: "賽季積分接近收官時，你會？", choices: ["追車手排名每站怎麼變化", "看車隊積分和兩位車手的配合"], demoAnswer: 1 },
      { prompt: "重看一場經典賽事，你會選？", choices: ["多次領先互換的激烈攻防", "策略和進站改變結果的比賽"], demoAnswer: 0 },
      { prompt: "朋友剛開始看 F1，你會先解釋？", choices: ["排位賽如何決定正賽發車順序", "進站和輪胎選擇怎麼影響比賽"], demoAnswer: 1 },
      { prompt: "比賽出現安全車，你會？", choices: ["看車手怎麼重新排隊和準備重啟", "看各隊趁機進站的策略差異"], demoAnswer: 0 },
      { prompt: "一站比賽結束後，你先找？", choices: ["車手訪問和頒獎畫面", "圈速、進站時間和賽後分析"], demoAnswer: 1 },
      { prompt: "挑一個車隊周邊，你會選？", choices: ["印有車手名字的帽子或衣服", "有賽道或賽車設計的紀念品"], demoAnswer: 0 },
      { prompt: "下個賽事週末到來前，你會？", choices: ["看車隊和車手近況消息", "查賽道特性和過往比賽紀錄"], demoAnswer: 1 },
    ],
    價值觀: [
      { prompt: "團隊簡報有人多做了一段，你會？", choices: ["確認分工時每個人的付出都有提到", "完成後把成果當作團隊共同完成"], demoAnswer: 0 },
      { prompt: "朋友臨時找你幫忙，但你已有安排，你會？", choices: ["說明自己能幫忙的時間和範圍", "先看看能不能調整原本的安排"], demoAnswer: 1 },
      { prompt: "約好的戶外行程遇到大雨，你會？", choices: ["照約定碰面，再一起找室內替代方案", "先聯絡大家，改到天氣合適的日子"], demoAnswer: 0 },
      { prompt: "多人聚餐結帳時，你傾向？", choices: ["每人平均分攤，簡單結束", "按各自點的餐點分帳"], demoAnswer: 0 },
      { prompt: "想把朋友照片放到社群，你會？", choices: ["先私訊確認能不能分享", "等對方公開照片後再轉發原貼文"], demoAnswer: 1 },
      { prompt: "工作期限快到了，成果還能再修細節，你會？", choices: ["先交能使用的版本，之後再完善", "多留時間把細節檢查好再交"], demoAnswer: 0 },
      { prompt: "公共空間只有一個時段可預約，你會？", choices: ["照登記先後順序安排", "先了解各組實際使用需求"], demoAnswer: 1 },
      { prompt: "收到一筆額外收入，你會先？", choices: ["留作緊急預備金或未來支出", "拿一部分安排一直想做的體驗"], demoAnswer: 0 },
      { prompt: "朋友想跟你聊一件私事，你會先？", choices: ["聽對方說完，確認他希望保密的範圍", "問對方現在想被傾聽還是一起找辦法"], demoAnswer: 1 },
      { prompt: "和別人意見不同時，你會先？", choices: ["聽完對方的考量再說自己的理由", "先清楚說明自己最在意的部分"], demoAnswer: 1 },
      { prompt: "計畫臨時有變，你會？", choices: ["先守住原本約定的核心安排", "重新分配時間，讓大家都能配合"], demoAnswer: 0 },
      { prompt: "發現自己做錯一件小事，你會？", choices: ["先告訴受影響的人並提出補救", "先把能修正的部分處理好再說明"], demoAnswer: 1 },
      { prompt: "想支持一個在意的社區活動，你會？", choices: ["報名投入時間協助", "捐款或提供活動需要的物品"], demoAnswer: 0 },
      { prompt: "做選擇時，眼前方便和長期影響不同，你會？", choices: ["先處理眼前最需要的事", "先替長期目標保留資源"], demoAnswer: 1 },
      { prompt: "團隊決定工作方式時，你偏好？", choices: ["每個人依同一套規則執行", "保留依個別情況調整的方法"], demoAnswer: 0 },
    ],
    感情觀: [
      { prompt: "週末想和對方見面，你會？", choices: ["先一起確認時間和地點", "各自準備一個小驚喜再碰面"], demoAnswer: 1 },
      { prompt: "對方訊息隔了一陣子才回，你會？", choices: ["等對方方便時再接著聊", "傳一句關心，確認對方最近還好嗎"], demoAnswer: 0 },
      { prompt: "兩人對一件事看法不同，你會？", choices: ["先各自冷靜，再約時間談", "趁當下說清楚在意的地方"], demoAnswer: 1 },
      { prompt: "對方遇到煩心事時，你會先？", choices: ["聽他說完，確認要不要建議", "問清楚需要什麼，再一起想辦法"], demoAnswer: 0 },
      { prompt: "相處時想留一些個人時間，你會？", choices: ["直接說明自己想獨處的時段", "先把共同安排和個人時間排開"], demoAnswer: 1 },
      { prompt: "一起規劃一趟旅行，你會？", choices: ["共同討論預算、景點和步調", "各自準備方案，再挑想去的部分"], demoAnswer: 0 },
      { prompt: "發現自己的話讓對方不舒服，你會？", choices: ["先確認對方的感受，再問他需要什麼", "說明原本的意思，再一起釐清"], demoAnswer: 1 },
      { prompt: "想分享兩人的合照到社群，你會？", choices: ["發之前先確認對方願不願意", "挑不會辨認出對方的生活照片"], demoAnswer: 0 },
      { prompt: "彼此喜歡的活動不太一樣，你會？", choices: ["輪流參加對方在意的活動", "各自保留興趣，再分享近況"], demoAnswer: 1 },
      { prompt: "兩人要安排重要支出，你會？", choices: ["先談可接受的預算範圍", "先列各自最重視的項目"], demoAnswer: 0 },
      { prompt: "對方做了一件貼心的事，你會？", choices: ["當下說出謝謝和自己的感受", "找機會用行動回應這份心意"], demoAnswer: 1 },
      { prompt: "兩人住得比較遠，你偏好怎麼聯絡？", choices: ["每天傳些日常訊息保持連結", "約固定時間好好通話"], demoAnswer: 0 },
      { prompt: "第一次和對方的朋友聚會，你會？", choices: ["先觀察相處方式，慢慢加入聊天", "主動找共同話題認識大家"], demoAnswer: 1 },
      { prompt: "一起生活時家事怎麼分，你會？", choices: ["按固定分工輪流完成", "看各自時間和擅長的事彈性安排"], demoAnswer: 0 },
      { prompt: "重要紀念日快到了，你偏好？", choices: ["簡單安排一段專心相處的時間", "準備一個特別活動留下回憶"], demoAnswer: 1 },
    ],
    政治: [
      { prompt: "路口近期常發生擦撞，改善時你會先支持？", choices: ["放慢車速並縮短行人穿越距離", "改善路燈和號誌，增加視線辨識"], demoAnswer: 1 },
      { prompt: "公車預算有限，你會優先？", choices: ["增加熱門路線的班次", "讓較少服務的區域也有路線可搭"], demoAnswer: 0 },
      { prompt: "社區公園要整修，你會先提議？", choices: ["增加遮蔭和休息座位", "更新運動器材和活動空間"], demoAnswer: 0 },
      { prompt: "市府要辦居民說明會，你覺得哪種時間較方便？", choices: ["平日晚上，方便下班後參加", "週末白天，能安排較長討論"], demoAnswer: 1 },
      { prompt: "新的回收政策要推行，你會先重視？", choices: ["分類步驟簡單，大家容易做到", "分類標準清楚，回收品質較穩定"], demoAnswer: 0 },
      { prompt: "道路空間重新規劃時，你會優先？", choices: ["讓人行道更寬、步行更順", "保留接送和短暫停車空間"], demoAnswer: 0 },
      { prompt: "公共設施要改善無障礙，你會先？", choices: ["盤點常用路線上的坡道和電梯", "更新指標、導盲和語音資訊"], demoAnswer: 1 },
      { prompt: "防災預算要分配，你會先投入？", choices: ["改善排水、邊坡等預防工程", "增加避難資訊和應變資源"], demoAnswer: 0 },
      { prompt: "學校周邊通學安全要加強，你會先？", choices: ["設置更清楚的行人穿越設施", "降低車速並管理上下學時段車流"], demoAnswer: 1 },
      { prompt: "市府要公開工程資料，你比較希望？", choices: ["進度和預算整理成容易查的摘要", "原始資料開放下載，方便居民自行分析"], demoAnswer: 0 },
      { prompt: "圖書館或活動中心延長開放，你偏好？", choices: ["平日晚上多開幾小時", "週末增加服務時段"], demoAnswer: 1 },
      { prompt: "大眾運輸需要改善，你會先支持？", choices: ["讓票價更容易負擔", "把資源用來增加班次和服務範圍"], demoAnswer: 0 },
      { prompt: "老街區要更新時，你會先考慮？", choices: ["保留有代表性的建築和街道特色", "增加住宅和日常服務的使用空間"], demoAnswer: 1 },
      { prompt: "年度公共工程預算有限，你會優先？", choices: ["先修復已經故障的設施", "先做能降低未來維修成本的工程"], demoAnswer: 0 },
      { prompt: "評估一項公共服務是否改善，你會？", choices: ["看使用者回饋和實際遇到的問題", "比較服務量、等待時間等統計數據"], demoAnswer: 1 },
    ]
  };

  const state = {
    topicChoice: "隨機",
    topic: "旅行",
    questionCount: 5,
    nickname: "企鵝",
    matchMode: "demo",
    questionIndex: 0,
    answers: [],
    matchTimer: null,
    matchmakingOperationId: 0,
    matchmaking: null,
    matchmakingPollTimer: null,
    matchmakingDeadlineTimer: null,
    matchmakingBusy: false,
    shareFile: null,
    shareCardVersion: 0,
    challenge: null,
    challengeLink: null,
    challengeLinkOpen: false,
    historyItems: [],
    historyCursor: null,
    historyHasMore: false,
    historyBusy: false,
    historyRequestId: 0,
    liveRoom: null,
    roomOperationId: 0,
    roomPollId: 0,
    roomStatusTimer: null,
    roomBusy: false,
    gameSyncId: 0,
    gamePollTimer: null,
    gameChannel: null,
    gameRealtimeAvailable: false,
    gameRefreshBusy: false,
    gameRefreshQueued: false,
    gameRefreshSyncId: null,
    gameQuestions: null,
    gameQuestionNo: 0,
    gameChoice: null,
    gameBusy: false,
    gameResultLoading: false,
    gameResultSyncId: null,
    completedRoomId: null,
    completedRoomUserId: null,
    rematchWatchId: 0,
    rematchWatchRoomId: null,
    rematchWatchUserId: null,
    rematchChannel: null,
    rematchRealtimeAvailable: false,
    rematchPollTimer: null,
    rematchBusy: false,
    rematchStatusBusy: false,
    moderationRoomId: null,
    moderationUserId: null,
    moderationBusy: false,
    moderationRequestId: 0,
    reportSubmitted: false,
    opponentBlocked: false,
    blockedPlayers: [],
    blockedPlayersBusy: false,
    blockedPlayersRequestId: 0
  };

  const authState = {
    config: null,
    client: null,
    session: null,
    busy: false,
    notice: "",
    initError: false,
    subscription: null
  };

  const REALTIME_FALLBACK_POLL_MS = 10000;
  const DISCONNECTED_POLL_MS = 3500;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const views = $$("[data-view]");
  const modal = $("[data-modal]");
  const privacyModal = $("[data-privacy-modal]");
  const reportModal = $("[data-report-modal]");
  const toast = $("[data-toast]");

  function showView(name, moveFocus = false) {
    if (name !== "results") stopSamePlayerRematchWatch();
    let activeView = null;
    views.forEach((view) => {
      const visible = view.dataset.view === name;
      view.classList.toggle("hidden", !visible);
      view.setAttribute("aria-hidden", String(!visible));
      if (visible) activeView = view;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    const focusTarget = activeView && activeView.querySelector("[data-focus-target]");
    if (moveFocus && focusTarget) {
      window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
    }
  }

  function chooseTopic() {
    const topics = Object.keys(questionBank);
    if (state.topicChoice === "隨機") {
      state.topic = topics[Math.floor(Math.random() * topics.length)];
    } else {
      state.topic = state.topicChoice;
    }
    return state.topic;
  }

  function startMatching(mode = "demo") {
    state.roomOperationId += 1;
    if (mode === "random" && authState.client && !authState.session?.user?.id) {
      announce("請先登入，再加入真人隨機配對。可先使用本機示範。");
      return;
    }
    window.clearTimeout(state.matchTimer);
    stopMatchmakingWatch();
    state.matchmaking = null;
    state.shareCardVersion += 1;
    state.shareFile = null;
    stopLiveGameSync();
    state.moderationRequestId += 1;
    if (reportModal.open) reportModal.close();
    state.liveRoom = null;
    state.completedRoomId = null;
    state.completedRoomUserId = null;
    state.moderationRoomId = null;
    state.moderationUserId = null;
    state.moderationBusy = false;
    state.reportSubmitted = false;
    state.opponentBlocked = false;
    state.gameQuestions = null;
    state.gameChoice = null;
    state.matchMode = mode;
    state.questionIndex = 0;
    state.answers = [];
    state.nickname = ($("#nickname").value.trim() || "企鵝").slice(0, 12);
    chooseTopic();
    $("[data-match-topic]").textContent = state.topic;
    const demoMode = mode === "demo";
    const liveQueue = mode === "random" && Boolean(authState.client && authState.session?.user?.id);
    $("[data-opponent-name]").textContent = "小島";
    $("[data-opponent-avatar]").textContent = "島";
    $("[data-opponent-mode]").textContent = "示範玩家";
    $("[data-demo-disclaimer]").classList.toggle("hidden", liveQueue);
    const matchTitle = $("[data-match-title]");
    const matchTitleHighlight = document.createElement("span");
    const matchTitleLead = demoMode ? "一個好問題，" : "等待一位玩家，";
    matchTitleHighlight.textContent = demoMode
      ? "從一位新朋友開始。"
      : "一起探索共同點。";
    matchTitle.replaceChildren(
      document.createTextNode(matchTitleLead),
      document.createElement("br"),
      matchTitleHighlight,
    );
    $("[data-match-eyebrow]").textContent = liveQueue ? "真人隨機配對" : "配對流程預覽";
    $("[data-match-caption]").textContent = liveQueue
      ? "正在安全佇列中尋找主題相近的玩家…"
      : demoMode
        ? "正在準備本機範例對局…"
        : "真人配對服務尚未連線，現在不會進入真實佇列。";
    $("[data-match-note]").textContent = demoMode
      ? "這場示範會使用本機範例玩家與答案。"
      : liveQueue
        ? "配對成功後會直接進入真人對局；雙方可在 30 秒內取消或等待配對。"
        : "此為配對等待畫面預覽；登入並接上服務後才會進入真實佇列。";
    $("[data-match-timeout-note]").textContent = liveQueue
      ? "等候上限 30 秒；逾時後可重新加入配對。"
      : "真人配對等候上限為 30 秒，登入並接上服務後啟用。";
    $("[data-match-progress]").classList.toggle("is-preview", !liveQueue && !demoMode);
    $("[data-use-demo]").classList.toggle("hidden", demoMode);
    $("[data-retry-match]").classList.add("hidden");
    refreshSafetyActions();
    $("[data-cancel]").disabled = liveQueue;
    $("[data-cancel]").textContent = liveQueue ? "正在連接配對佇列…" : "返回首頁";
    showView("matching", true);
    if (demoMode) state.matchTimer = window.setTimeout(startDemoGame, 900);
    if (liveQueue) queueRandomMatch();
  }

  function startDemoGame() {
    window.clearTimeout(state.matchTimer);
    renderQuestion();
    showView("game", true);
  }

  function shuffledChallengeQuestions(topic, count) {
    const questions = questionBank[topic].map(({ prompt, choices }) => ({
      prompt,
      choices: [...choices]
    }));
    for (let index = questions.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [questions[index], questions[swapIndex]] = [questions[swapIndex], questions[index]];
    }
    return questions.slice(0, count);
  }

  function encodeChallengePayload(challenge) {
    const payload = {
      v: 1,
      t: challenge.topic,
      n: challenge.nickname,
      q: challenge.questions.map((question, index) => [
        question.prompt,
        question.choices[0],
        question.choices[1],
        challenge.answers[index]
      ])
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (token.length > 14000) throw new Error("Challenge link is too large.");
    return token;
  }

  function decodeChallengePayload(token) {
    if (typeof token !== "string" || !token || token.length > 14000) {
      throw new Error("Invalid challenge link.");
    }
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const allowedCounts = [5, 10, 15];
    if (payload?.v !== 1 || typeof payload.t !== "string" ||
        !Object.prototype.hasOwnProperty.call(questionBank, payload.t) ||
        typeof payload.n !== "string" || payload.n.length > 12 ||
        !Array.isArray(payload.q) || !allowedCounts.includes(payload.q.length)) {
      throw new Error("Invalid challenge data.");
    }
    const questions = [];
    const answers = [];
    for (const entry of payload.q) {
      if (!Array.isArray(entry) || entry.length !== 4 ||
          !entry.slice(0, 3).every((value) => typeof value === "string" && value.trim() && value.length <= 240) ||
          ![0, 1].includes(entry[3])) {
        throw new Error("Invalid challenge question.");
      }
      questions.push({ prompt: entry[0], choices: [entry[1], entry[2]] });
      answers.push(entry[3]);
    }
    return {
      topic: payload.t,
      nickname: payload.n || "企鵝",
      questions,
      answers
    };
  }

  function createChallengeLink(challenge) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "guess=" + encodeChallengePayload(challenge);
    return url.href;
  }

  function renderChallengeQuestion() {
    const challenge = state.challenge;
    if (!challenge || !["author", "guess"].includes(challenge.mode)) return;
    const isAuthor = challenge.mode === "author";
    const index = challenge.questionIndex;
    const question = challenge.questions[index];
    const selectedAnswer = isAuthor ? challenge.answers[index] : challenge.guesses[index];
    const count = challenge.questions.length;
    $("[data-challenge-eyebrow]").textContent = isAuthor ? "幫朋友出題" : `${challenge.topic}猜題挑戰`;
    $("[data-challenge-title]").textContent = isAuthor
      ? "先選出你自己會選的答案"
      : `${challenge.nickname} 想讓你猜猜`;
    $("[data-challenge-subtitle]").textContent = isAuthor
      ? `${challenge.topic}・${count} 題。朋友會看到同一批題目，等他猜完才揭曉你的選擇。`
      : `猜猜「${challenge.nickname}」在 ${challenge.topic} 主題裡會怎麼選。`;
    $("[data-challenge-progress]").textContent = `第 ${index + 1} 題，共 ${count} 題`;
    $("[data-challenge-progress-bar]").style.width = String(((index + 1) / count) * 100) + "%";
    $("[data-challenge-question]").textContent = question.prompt;
    $$("[data-challenge-choice]").forEach((button, choiceIndex) => {
      const selected = selectedAnswer === choiceIndex;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      $("[data-challenge-choice-copy]", button).textContent = question.choices[choiceIndex];
    });
    $("[data-challenge-next]").disabled = ![0, 1].includes(selectedAnswer);
    $("[data-challenge-next-label]").textContent = index === count - 1
      ? isAuthor ? "完成並建立連結" : "看猜題結果"
      : "下一題";
    $("[data-challenge-answer-status]").textContent = [0, 1].includes(selectedAnswer)
      ? isAuthor
        ? "已記錄；你可以再改選，朋友完成猜題前不會看到答案。"
        : "已記錄你的猜測；完成所有題目後才會揭曉答案。"
      : isAuthor ? "請選一個你會選的答案。" : `請猜猜${challenge.nickname}會選哪一個。`;
    $("[data-challenge-disclosure]").classList.toggle("hidden", !isAuthor);
  }

  function startGuessChallenge() {
    const topic = chooseTopic();
    const nickname = ($("#nickname").value.trim() || "企鵝").slice(0, 12);
    state.challenge = {
      mode: "author",
      topic,
      nickname,
      questions: shuffledChallengeQuestions(topic, state.questionCount),
      answers: [],
      guesses: [],
      questionIndex: 0
    };
    state.challengeLink = null;
    $("[data-challenge-next]").disabled = true;
    renderChallengeQuestion();
    showView("challenge", true);
  }

  function selectChallengeAnswer(selection) {
    const challenge = state.challenge;
    if (!challenge || !["author", "guess"].includes(challenge.mode) || ![0, 1].includes(selection)) return;
    const selections = challenge.mode === "author" ? challenge.answers : challenge.guesses;
    selections[challenge.questionIndex] = selection;
    const buttons = $$("[data-challenge-choice]");
    buttons.forEach((button, index) => {
      const selected = selection === index;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    $("[data-challenge-next]").disabled = false;
    $("[data-challenge-answer-status]").textContent = challenge.mode === "author"
      ? "已記錄；你可以再改選，朋友完成猜題前不會看到答案。"
      : "已記錄你的猜測；完成所有題目後才會揭曉答案。";
  }

  function showChallengeReady() {
    try {
      state.challengeLink = createChallengeLink(state.challenge);
      $("[data-challenge-ready-summary]").textContent = `${state.challenge.nickname} 已完成「${state.challenge.topic}」${state.challenge.questions.length} 題。把連結傳給朋友，看看他能猜中幾題。`;
      $("[data-challenge-link]").value = state.challengeLink;
      $("[data-challenge-share-status]").textContent = "";
      showView("challenge-ready", true);
    } catch (error) {
      console.warn("Could not create guess challenge link", error);
      $("[data-challenge-invalid-copy]").textContent = "挑戰連結太長，請改選較少題數後再試一次。";
      showView("challenge-invalid", true);
    }
  }

  function showChallengeResults() {
    const challenge = state.challenge;
    const correctCount = challenge.answers.filter((answer, index) => answer === challenge.guesses[index]).length;
    $("[data-challenge-result-score]").textContent = String(correctCount);
    $("[data-challenge-result-count]").textContent = String(challenge.questions.length);
    $("[data-challenge-result-topic]").textContent = challenge.topic;
    $("[data-challenge-result-copy]").textContent = correctCount === challenge.questions.length
      ? `全部猜中！你很了解${challenge.nickname}。`
      : correctCount === 0
        ? `每題都是認識${challenge.nickname}的新線索。`
        : `你猜中了 ${correctCount} 題，再多玩幾次會更懂${challenge.nickname}。`;
    const list = $("[data-challenge-result-list]");
    list.replaceChildren();
    challenge.questions.forEach((question, index) => {
      const item = document.createElement("li");
      item.className = "challenge-result-item";
      const prompt = document.createElement("p");
      prompt.className = "challenge-result-question";
      prompt.textContent = `${index + 1}. ${question.prompt}`;
      const answers = document.createElement("div");
      answers.className = "challenge-result-answers";
      const guess = document.createElement("div");
      guess.className = "challenge-result-answer";
      const guessLabel = document.createElement("b");
      guessLabel.textContent = "你的猜測";
      const guessChoice = document.createElement("span");
      guessChoice.textContent = question.choices[challenge.guesses[index]];
      guess.append(guessLabel, guessChoice);
      const answer = document.createElement("div");
      answer.className = "challenge-result-answer";
      const answerLabel = document.createElement("b");
      answerLabel.textContent = `${challenge.nickname} 的選擇`;
      const answerChoice = document.createElement("span");
      answerChoice.textContent = question.choices[challenge.answers[index]];
      answer.append(answerLabel, answerChoice);
      const outcome = document.createElement("span");
      const matched = challenge.guesses[index] === challenge.answers[index];
      outcome.className = "challenge-result-outcome " + (matched ? "is-correct" : "is-wrong");
      outcome.textContent = matched ? "✦ 猜中了" : "再認識一點";
      answers.append(guess, answer);
      item.append(prompt, answers, outcome);
      list.append(item);
    });
    showView("challenge-results", true);
  }

  function advanceGuessChallenge() {
    const challenge = state.challenge;
    if (!challenge || !["author", "guess"].includes(challenge.mode)) return;
    const selections = challenge.mode === "author" ? challenge.answers : challenge.guesses;
    if (![0, 1].includes(selections[challenge.questionIndex])) return;
    if (challenge.questionIndex + 1 < challenge.questions.length) {
      challenge.questionIndex += 1;
      renderChallengeQuestion();
      $("[data-challenge-question]").focus({ preventScroll: true });
      return;
    }
    if (challenge.mode === "author") {
      showChallengeReady();
    } else {
      showChallengeResults();
    }
  }

  async function copyChallengeLink() {
    if (!state.challengeLink) return;
    try {
      await navigator.clipboard.writeText(state.challengeLink);
      $("[data-challenge-share-status]").textContent = "猜題連結已複製，可以傳給朋友了。";
    } catch {
      const input = $("[data-challenge-link]");
      input.focus();
      input.select();
      $("[data-challenge-share-status]").textContent = "無法自動複製，已選取連結；請手動複製。";
    }
  }

  async function shareChallengeLink() {
    if (!state.challengeLink) return;
    if (!navigator.share) {
      await copyChallengeLink();
      return;
    }
    try {
      await navigator.share({
        title: "同頻猜題挑戰",
        text: `猜猜${state.challenge.nickname}的選擇！`,
        url: state.challengeLink
      });
      $("[data-challenge-share-status]").textContent = "已開啟分享面板。";
    } catch (error) {
      if (error?.name !== "AbortError") {
        $("[data-challenge-share-status]").textContent = "分享沒有完成，可以改用複製連結。";
      }
    }
  }

  function leaveGuessChallenge() {
    if (state.challengeLinkOpen) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    state.challenge = null;
    state.challengeLink = null;
    state.challengeLinkOpen = false;
    showView("home", true);
  }

  function retryGuessChallenge() {
    if (!state.challenge || state.challenge.mode !== "guess") return;
    state.challenge.guesses = [];
    state.challenge.questionIndex = 0;
    renderChallengeQuestion();
    showView("challenge", true);
  }

  function initializeChallengeFromLocation() {
    const parameters = new URLSearchParams(window.location.hash.slice(1));
    if (!parameters.has("guess")) return;
    state.challengeLinkOpen = true;
    try {
      const payload = decodeChallengePayload(parameters.get("guess"));
      state.challenge = {
        mode: "guess",
        ...payload,
        guesses: [],
        questionIndex: 0
      };
      renderChallengeQuestion();
      showView("challenge", true);
    } catch (error) {
      console.warn("Could not open guess challenge", error);
      $("[data-challenge-invalid-copy]").textContent = "請確認連結完整，或向出題者索取新的挑戰連結。";
      showView("challenge-invalid", true);
    }
  }

  function stopMatchmakingWatch() {
    window.clearTimeout(state.matchmakingPollTimer);
    window.clearTimeout(state.matchmakingDeadlineTimer);
    state.matchmakingPollTimer = null;
    state.matchmakingDeadlineTimer = null;
    state.matchmakingOperationId += 1;
    state.matchmakingBusy = false;
  }

  function matchingIsCurrent(attempt) {
    return Boolean(
      state.matchmaking === attempt &&
      state.matchmakingOperationId === attempt.operationId &&
      authState.session?.user?.id === attempt.userId
    );
  }

  function showMatchmakingRetry(message, title = "沒有找到配對") {
    stopMatchmakingWatch();
    state.matchmaking = null;
    $("[data-match-title]").textContent = title;
    $("[data-match-caption]").textContent = message;
    $("[data-match-note]").textContent = "可以重新加入佇列，或返回首頁選擇其他玩法。";
    $("[data-match-eyebrow]").textContent = "配對狀態";
    $("[data-match-progress]").classList.add("is-preview");
    $("[data-use-demo]").classList.add("hidden");
    $("[data-retry-match]").classList.remove("hidden");
    $("[data-cancel]").disabled = false;
    $("[data-cancel]").textContent = "返回首頁";
  }

  function routeToMatchedRoom(data, userId) {
    const status = data?.status;
    if (!["matched", "active_room"].includes(status) || !data.room_id) return false;
    stopMatchmakingWatch();
    state.matchmaking = null;
    state.matchmakingBusy = false;
    if (status === "matched") {
      const room = {
        roomId: data.room_id,
        inviteCode: null,
        topicKey: data.topic_key,
        questionCount: Number(data.question_count) || state.questionCount,
        status: "playing",
        expiresAt: data.expires_at,
        opponentNickname: data.opponent_nickname,
        createdBy: false,
        userId
      };
      enterLiveRoomGame(room);
    } else {
      const inviteCode = data.invite_code || null;
      showLiveInviteRoom({
        roomId: data.room_id,
        inviteCode,
        topicKey: data.topic_key,
        questionCount: Number(data.question_count) || state.questionCount,
        status: inviteCode ? "waiting" : "active_room",
        expiresAt: data.expires_at,
        opponentNickname: data.opponent_nickname || null,
        createdBy: Boolean(inviteCode),
        userId
      });
    }
    return true;
  }

  function startMatchStatusPoll(attempt, delay = 1700) {
    window.clearTimeout(state.matchmakingPollTimer);
    state.matchmakingPollTimer = window.setTimeout(() => pollMatchStatus(attempt), delay);
  }

  function startMatchDeadline(attempt) {
    window.clearTimeout(state.matchmakingDeadlineTimer);
    const remaining = Math.max(0, attempt.expiresAt - Date.now());
    state.matchmakingDeadlineTimer = window.setTimeout(() => pollMatchStatus(attempt), remaining);
  }

  async function handleMatchStatus(attempt, data) {
    if (!matchingIsCurrent(attempt)) return;
    if ([5, 10, 15].includes(Number(data?.question_count))) {
      state.questionCount = Number(data.question_count);
    }
    if (routeToMatchedRoom(data, attempt.userId)) return;
    if (data?.status === "waiting") {
      if (!data.ticket_id) throw new Error("Waiting match response did not include a ticket id");
      attempt.ticketId = data.ticket_id;
      if (data.expires_at) {
        const expiry = Date.parse(data.expires_at);
        if (Number.isFinite(expiry)) attempt.expiresAt = expiry;
      }
      if (attempt.expiresAt <= Date.now()) {
        $("[data-match-caption]").textContent = "正在確認 30 秒配對期限…";
      } else {
        const seconds = Math.max(1, Math.ceil((attempt.expiresAt - Date.now()) / 1000));
        $("[data-match-caption]").textContent = `正在等待玩家加入佇列，約還有 ${seconds} 秒…`;
      }
      $("[data-cancel]").disabled = attempt.cancelRequested === true;
      $("[data-cancel]").textContent = attempt.cancelRequested === true ? "正在取消…" : "取消配對";
      startMatchStatusPoll(attempt);
      startMatchDeadline(attempt);
      return;
    }
    if (data?.status === "timed_out") {
      showMatchmakingRetry("已等候 30 秒，這次沒有找到合適的玩家。", "配對逾時");
      return;
    }
    if (data?.status === "cancelled") {
      stopMatchmakingWatch();
      state.matchmaking = null;
      showView("home", true);
      announce("已取消隨機配對。");
      return;
    }
    throw new Error("Unexpected matchmaking response");
  }

  function finishMatchmakingRequest(attempt) {
    if (!matchingIsCurrent(attempt)) return;
    state.matchmakingBusy = false;
    if (attempt.cancelRequested) cancelMatchmaking();
  }

  async function pollMatchStatus(attempt) {
    if (!matchingIsCurrent(attempt) || !attempt.ticketId) return;
    if (state.matchmakingBusy) {
      startMatchStatusPoll(attempt, 500);
      return;
    }
    state.matchmakingBusy = true;
    try {
      const { data, error } = await authState.client.rpc("get_match_status", {
        p_ticket_id: attempt.ticketId
      });
      if (!matchingIsCurrent(attempt)) return;
      if (error) throw error;
      await handleMatchStatus(attempt, data || {});
    } catch (error) {
      if (matchingIsCurrent(attempt)) {
        console.warn("Could not refresh matchmaking status", error);
        $("[data-match-caption]").textContent = "暫時無法更新配對狀態，正在重試…";
        startMatchStatusPoll(attempt, 3000);
      }
    } finally {
      finishMatchmakingRequest(attempt);
    }
  }

  async function queueRandomMatch() {
    if (!authState.client || !authState.session?.user?.id) return;
    const userId = authState.session.user.id;
    const attempt = {
      operationId: ++state.matchmakingOperationId,
      userId,
      ticketId: null,
      cancelRequested: false,
      expiresAt: Date.now() + 30000
    };
    state.matchmaking = attempt;
    state.matchmakingBusy = true;
    try {
      const { data, error } = await authState.client.rpc("queue_for_match", {
        p_topic_choice: topicChoiceKeys[state.topicChoice] || "random",
        p_nickname: state.nickname,
        p_question_count: state.questionCount
      });
      if (!matchingIsCurrent(attempt)) return;
      if (error) throw error;
      await handleMatchStatus(attempt, data || {});
    } catch (error) {
      if (matchingIsCurrent(attempt)) {
        console.warn("Could not start matchmaking", error);
        showMatchmakingRetry("無法連線到配對服務，請確認登入及 Supabase 設定後重試。", "配對服務暫時無法使用");
      }
    } finally {
      finishMatchmakingRequest(attempt);
    }
  }

  async function cancelMatchmaking() {
    const attempt = state.matchmaking;
    if (!attempt) {
      window.clearTimeout(state.matchTimer);
      showView("home", true);
      return;
    }
    if (!attempt.ticketId) return;
    if (state.matchmakingBusy) {
      attempt.cancelRequested = true;
      $("[data-cancel]").disabled = true;
      $("[data-cancel]").textContent = "正在取消…";
      return;
    }
    attempt.cancelRequested = false;
    state.matchmakingBusy = true;
    $("[data-cancel]").disabled = true;
    $("[data-cancel]").textContent = "正在取消…";
    try {
      const { data, error } = await authState.client.rpc("cancel_matchmaking", {
        p_ticket_id: attempt.ticketId
      });
      if (!matchingIsCurrent(attempt)) return;
      if (error) throw error;
      if (data?.status === "matched") {
        if (!routeToMatchedRoom(data, attempt.userId)) {
          $("[data-match-caption]").textContent = "已配對，正在連接房間…";
          startMatchStatusPoll(attempt, 0);
        }
        return;
      }
      stopMatchmakingWatch();
      state.matchmaking = null;
      showView("home", true);
      announce(data?.status === "cancelled" ? "已取消隨機配對。" : "配對等待已結束。");
    } catch (error) {
      if (matchingIsCurrent(attempt)) {
        console.warn("Could not cancel matchmaking", error);
        $("[data-match-caption]").textContent = "取消沒有完成，請稍後重試或等待 30 秒逾時。";
        $("[data-cancel]").disabled = false;
        $("[data-cancel]").textContent = "重試取消";
      }
    } finally {
      if (matchingIsCurrent(attempt)) state.matchmakingBusy = false;
    }
  }

  function createDemoInviteCode() {
    return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  }

  function stopRoomStatusWatch() {
    window.clearTimeout(state.roomStatusTimer);
    state.roomStatusTimer = null;
    state.roomPollId += 1;
  }

  function stopLiveGameSync() {
    window.clearTimeout(state.gamePollTimer);
    state.gamePollTimer = null;
    state.gameSyncId += 1;
    state.gameRefreshBusy = false;
    state.gameRefreshQueued = false;
    state.gameRefreshSyncId = null;
    state.gameBusy = false;
    state.gameResultLoading = false;
    state.gameResultSyncId = null;
    state.gameRealtimeAvailable = false;
    const channel = state.gameChannel;
    state.gameChannel = null;
    if (channel && authState.client) {
      authState.client.removeChannel(channel).catch(() => {});
    }
  }

  function stopSamePlayerRematchWatch() {
    window.clearTimeout(state.rematchPollTimer);
    state.rematchPollTimer = null;
    state.rematchWatchId += 1;
    state.rematchWatchRoomId = null;
    state.rematchWatchUserId = null;
    state.rematchRealtimeAvailable = false;
    state.rematchBusy = false;
    state.rematchStatusBusy = false;
    const channel = state.rematchChannel;
    state.rematchChannel = null;
    if (channel && authState.client) {
      authState.client.removeChannel(channel).catch(() => {});
    }
  }

  function getPlayerNickname() {
    return ($("#nickname").value.trim() || "企鵝").slice(0, 12);
  }

  function formatRoomExpiry(expiresAt) {
    const expiry = new Date(expiresAt);
    return Number.isNaN(expiry.getTime())
      ? ""
      : `（約 ${expiry.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} 失效）`;
  }

  function updateLiveRoomScreen(status) {
    const room = state.liveRoom;
    if (!room) return;
    room.status = status.status || room.status;
    if ([5, 10, 15].includes(Number(status.question_count))) room.questionCount = Number(status.question_count);
    if (Object.prototype.hasOwnProperty.call(status, "invite_code")) room.inviteCode = status.invite_code;
    if (Object.prototype.hasOwnProperty.call(status, "expires_at")) room.expiresAt = status.expires_at;
    if (Object.prototype.hasOwnProperty.call(status, "opponent_nickname")) room.opponentNickname = status.opponent_nickname;

    const code = room.inviteCode;
    $(`[data-room-question-count]`).textContent = `${room.questionCount || state.questionCount} 題`;
    const waitingForInvite = room.status === "waiting" && room.createdBy;
    const closed = ["expired", "abandoned", "completed"].includes(room.status);
    $("[data-room-code]").textContent = code || (room.status === "joined" ? "已加入" : "—");
    $("[data-copy-room-code]").classList.toggle("hidden", !code || !waitingForInvite);
    $("[data-room-demo]").classList.add("hidden");
    $("[data-room-leave]").classList.remove("hidden");
    $("[data-room-leave]").textContent = closed ? "回到首頁" : "離開真人房間";
    $("[data-room-home]").classList.add("hidden");

    if (waitingForInvite) {
      $("[data-room-status]").textContent = `等待朋友加入你的房間。${formatRoomExpiry(room.expiresAt)}`;
      $("[data-room-note]").textContent = "這是已建立的真人房間；朋友加入後會在此顯示狀態。";
    } else if (room.status === "joined") {
      $("[data-room-status]").textContent = `已加入 ${room.opponentNickname || "朋友"} 的房間。`;
      $("[data-room-note]").textContent = "房間已連線，正在載入第一題。";
    } else if (room.status === "playing") {
      $("[data-room-status]").textContent = "朋友已加入，真人房間已配對。";
      $("[data-room-note]").textContent = "真人對局已開始；離開此頁會關閉房間。";
    } else if (room.status === "expired") {
      $("[data-room-status]").textContent = "房間已逾期並關閉。";
      $("[data-room-note]").textContent = "邀請房等待 10 分鐘後會失效，請返回首頁重新建立。";
      $("[data-room-leave]").textContent = "回到首頁";
    } else if (room.status === "abandoned") {
      $("[data-room-status]").textContent = "房間已關閉。";
      $("[data-room-note]").textContent = "房主或玩家已離開此房間。";
    } else if (room.status === "completed") {
      $("[data-room-status]").textContent = "這局已結束。";
      $("[data-room-note]").textContent = "回到首頁即可開始新的配對。";
    } else {
      $("[data-room-status]").textContent = "帳號已有進行中的真人房間。";
      $("[data-room-note]").textContent = "房間資料已確認；答題同步畫面仍待串接完成。";
    }
  }

  function showRoomPreview(code, joined = false) {
    stopRoomStatusWatch();
    state.liveRoom = null;
    $("[data-room-title]").textContent = joined ? "房間代碼已輸入" : "邀請房間已建立";
    $("[data-room-status]").textContent = joined
      ? "真人房間驗證尚未連線，這裡不會確認代碼是否有效。"
      : "把代碼分享給朋友，對方加入後就能開始。";
    $("[data-room-code]").textContent = code;
    $("[data-room-note]").textContent = joined
      ? "這是加入流程預覽；目前未連線伺服器，也未加入任何房間。"
      : "這是本機示範代碼，其他裝置目前無法使用。";
    $("[data-copy-room-code]").classList.toggle("hidden", joined);
    $("[data-copy-room-code]").textContent = "複製代碼";
    $("[data-room-demo]").classList.remove("hidden");
    $("[data-room-leave]").classList.add("hidden");
    $("[data-room-home]").classList.remove("hidden");
    showView("invite-room", true);
  }

  function scheduleRoomStatusCheck(roomId, pollId, userId, delay = 2500) {
    state.roomStatusTimer = window.setTimeout(async () => {
      if (pollId !== state.roomPollId || authState.session?.user?.id !== userId) return;
      try {
        const { data, error } = await authState.client.rpc("get_invite_room_status", {
          p_room_id: roomId
        });
        if (pollId !== state.roomPollId || authState.session?.user?.id !== userId) return;
        if (error) throw error;
        updateLiveRoomScreen(data || {});
        if (data?.status === "playing" && state.liveRoom?.roomId === roomId) {
          stopRoomStatusWatch();
          enterLiveRoomGame(state.liveRoom);
          return;
        }
        if (data?.status === "waiting") {
          scheduleRoomStatusCheck(roomId, pollId, userId);
        }
      } catch (error) {
        if (pollId !== state.roomPollId || authState.session?.user?.id !== userId) return;
        console.warn("Could not refresh invite room status", error);
        $("[data-room-status]").textContent = "暫時無法更新房間狀態，正在重試…";
        scheduleRoomStatusCheck(roomId, pollId, userId, 4000);
      }
    }, delay);
  }

  function showLiveInviteRoom(room) {
    stopRoomStatusWatch();
    if ([5, 10, 15].includes(Number(room.questionCount))) state.questionCount = Number(room.questionCount);
    state.liveRoom = room;
    if (["joined", "playing", "active_room"].includes(room.status) && !room.inviteCode) {
      enterLiveRoomGame(room);
      return;
    }
    $("[data-room-title]").textContent = room.status === "active_room"
      ? "進行中的房間"
      : room.createdBy
        ? "邀請房間已建立"
        : "已加入邀請房間";
    $("[data-copy-room-code]").textContent = "複製邀請代碼";
    updateLiveRoomScreen(room);
    showView("invite-room", true);
    if (room.status === "waiting" && room.createdBy && room.inviteCode) {
      const pollId = ++state.roomPollId;
      scheduleRoomStatusCheck(room.roomId, pollId, room.userId, 1500);
    }
  }

  async function restoreMyActiveRoom() {
    const userId = authState.session?.user?.id;
    if (!authState.client || !userId) return;

    const operationId = ++state.roomOperationId;
    try {
      const { data, error } = await authState.client.rpc("get_my_active_room");
      const activeView = document.querySelector("[data-view]:not(.hidden)");
      if (operationId !== state.roomOperationId ||
          authState.session?.user?.id !== userId ||
          activeView?.dataset.view !== "home") return;
      if (error) throw error;
      if (!data || data.status === "none") {
        await restoreMyMatchmakingTicket(userId, operationId);
        return;
      }
      if (!data.room_id || !["waiting", "playing"].includes(data.status)) {
        throw new Error("Unexpected active room response");
      }

      showLiveInviteRoom({
        roomId: data.room_id,
        inviteCode: data.invite_code || null,
        topicKey: data.topic_key,
        questionCount: Number(data.question_count) || 5,
        status: data.status,
        expiresAt: data.expires_at,
        opponentNickname: data.opponent_nickname,
        createdBy: data.created_by === true,
        userId
      });
      announce("已恢復你尚未結束的真人房間。");
    } catch (error) {
      if (operationId !== state.roomOperationId || authState.session?.user?.id !== userId) return;
      console.warn("Could not restore active room", error);
      announce("目前無法恢復進行中的房間，請確認連線後重新載入。");
    }
  }

  async function restoreMyMatchmakingTicket(userId, roomOperationId) {
    let attempt = null;
    try {
      const { data, error } = await authState.client.rpc("get_my_matchmaking_ticket");
      const activeView = document.querySelector("[data-view]:not(.hidden)");
      if (roomOperationId !== state.roomOperationId ||
          authState.session?.user?.id !== userId ||
          activeView?.dataset.view !== "home") return;
      if (error) throw error;
      if (!data || data.status === "none") return;
      if (!["waiting", "matched", "timed_out"].includes(data.status)) {
        throw new Error("Unexpected matchmaking recovery response");
      }
      if (data.status !== "timed_out" && !data.ticket_id) {
        throw new Error("Recovered matchmaking response did not include a ticket id");
      }

      const topicChoice = Object.entries(topicChoiceKeys)
        .find(([, key]) => key === data.topic_choice)?.[0] || "隨機";
      state.matchMode = "live";
      state.topicChoice = topicChoice;
      state.questionCount = [5, 10, 15].includes(Number(data.question_count))
        ? Number(data.question_count)
        : 5;
      state.topic = topicLabels[data.topic_key] || (topicChoice === "隨機" ? "旅行" : topicChoice);
      state.nickname = data.nickname || getPlayerNickname();
      state.answers = [];
      state.gameQuestions = null;
      state.gameChoice = null;

      const expiry = Date.parse(data.expires_at);
      attempt = {
        operationId: ++state.matchmakingOperationId,
        userId,
        ticketId: data.ticket_id || null,
        cancelRequested: false,
        expiresAt: Number.isFinite(expiry) ? expiry : Date.now() + 30000
      };
      state.matchmaking = attempt;
      state.matchmakingBusy = false;

      const matchTitle = $("[data-match-title]");
      const matchTitleHighlight = document.createElement("span");
      matchTitleHighlight.textContent = "一起探索共同點。";
      matchTitle.replaceChildren(
        document.createTextNode("等待一位玩家，"),
        document.createElement("br"),
        matchTitleHighlight,
      );
      $("[data-match-topic]").textContent = topicChoice === "隨機" ? "隨機主題" : topicChoice;
      $("[data-opponent-name]").textContent = "等待配對";
      $("[data-opponent-avatar]").textContent = "…";
      $("[data-opponent-mode]").textContent = "真人玩家";
      $("[data-demo-disclaimer]").classList.add("hidden");
      $("[data-match-eyebrow]").textContent = "真人隨機配對";
      $("[data-match-caption]").textContent = "正在恢復先前的配對狀態…";
      $("[data-match-note]").textContent = "已找回這個帳號的配對票券；你可以繼續等待或取消配對。";
      $("[data-match-timeout-note]").textContent = "等候上限 30 秒；逾時後可重新加入配對。";
      $("[data-match-progress]").classList.remove("is-preview");
      $("[data-use-demo]").classList.add("hidden");
      $("[data-retry-match]").classList.add("hidden");
      $("[data-cancel]").disabled = false;
      $("[data-cancel]").textContent = "取消配對";
      refreshSafetyActions();
      showView("matching", true);

      if (data.status === "waiting") {
        await pollMatchStatus(attempt);
      } else {
        await handleMatchStatus(attempt, data);
      }
    } catch (error) {
      if (roomOperationId !== state.roomOperationId || authState.session?.user?.id !== userId) return;
      console.warn("Could not restore matchmaking ticket", error);
      if (attempt && matchingIsCurrent(attempt)) {
        showMatchmakingRetry("暫時無法恢復先前的配對狀態，請稍後重試。", "配對狀態暫時無法使用");
      } else {
        announce("目前無法恢復先前的配對狀態，請確認連線後重新載入。");
      }
    }
  }

  function remoteGameIsCurrent(roomId, syncId, userId) {
    return Boolean(
      state.liveRoom?.roomId === roomId &&
      state.gameSyncId === syncId &&
      authState.session?.user?.id === userId
    );
  }

  function scheduleLiveGameRefresh(roomId, syncId, userId, delay) {
    window.clearTimeout(state.gamePollTimer);
    const pollDelay = Number.isFinite(delay)
      ? delay
      : state.gameRealtimeAvailable
        ? REALTIME_FALLBACK_POLL_MS
        : DISCONNECTED_POLL_MS;
    state.gamePollTimer = window.setTimeout(() => {
      refreshLiveGame(roomId, syncId, userId);
    }, pollDelay);
  }

  function showRemoteGameStatus(message) {
    const status = $("[data-remote-status]");
    status.textContent = message;
    status.classList.toggle("hidden", !message);
  }

  function showRoomEnded(status) {
    if (!state.liveRoom) return;
    state.liveRoom.status = status;
    stopLiveGameSync();
    updateLiveRoomScreen({ status });
    showView("invite-room", true);
  }

  function renderLiveGameState(roomState) {
    const questionNo = Number(roomState.current_question);
    const questionCount = Number(roomState.question_count);
    if ([5, 10, 15].includes(questionCount) && questionCount !== state.questionCount) {
      state.questionCount = questionCount;
      state.gameQuestions = Array.from({ length: questionCount }, (_, index) => state.gameQuestions?.[index] || null);
    }
    if ([5, 10, 15].includes(questionCount) && state.liveRoom) state.liveRoom.questionCount = questionCount;
    if (!Number.isInteger(questionNo) || questionNo < 1 || questionNo > state.questionCount) return;
    const index = questionNo - 1;
    state.topic = topicLabels[roomState.topic_key] || state.topic;
    state.nickname = roomState.you?.nickname || state.nickname;
    state.liveRoom.opponentNickname = roomState.partner?.nickname || state.liveRoom.opponentNickname || "朋友";
    state.gameQuestions[index] = {
      prompt: roomState.question?.prompt || "題目載入中…",
      choices: [roomState.question?.choice_a || "選項 A", roomState.question?.choice_b || "選項 B"]
    };
    if (state.gameQuestionNo !== questionNo) {
      state.gameQuestionNo = questionNo;
      state.questionIndex = index;
      state.gameChoice = null;
      renderQuestion();
    }

    $("[data-opponent-name]").textContent = state.liveRoom.opponentNickname;
    $("[data-opponent-avatar]").textContent = state.liveRoom.opponentNickname.slice(0, 1);
    $("[data-opponent-mode]").textContent = "真人玩家";
    $("[data-demo-disclaimer]").classList.add("hidden");
    $("[data-peer-answer-label]").textContent = `${state.liveRoom.opponentNickname}・真人`;
    $("[data-player-answer-label]").textContent = `${state.nickname}・你`;
    $("[data-match-label]").textContent = "本機已揭曉相同";

    const revealed = roomState.reveal === true && [0, 1].includes(Number(roomState.your_choice)) &&
      [0, 1].includes(Number(roomState.partner_choice));
    if (revealed) {
      const ownChoice = Number(roomState.your_choice);
      const partnerChoice = Number(roomState.partner_choice);
      state.gameChoice = ownChoice;
      state.answers[index] = { player: ownChoice, opponent: partnerChoice };
      const question = currentGameQuestions()[index];
      $$(".answer-option").forEach((button, optionIndex) => {
        button.disabled = true;
        button.classList.toggle("is-selected", optionIndex === ownChoice);
        button.setAttribute("aria-pressed", String(optionIndex === ownChoice));
      });
      const matched = ownChoice === partnerChoice;
      $("[data-reveal-heading]").textContent = matched
        ? "你們找到一個共同點了"
        : "選擇不一樣，也多認識一點彼此";
      $("[data-reveal-copy]").textContent = matched
        ? `你們都選了「${question.choices[ownChoice]}」。`
        : "每個人的偏好都不同，這也是認識新觀點的開始。";
      $("[data-player-answer]").textContent = question.choices[ownChoice];
      $("[data-peer-answer]").textContent = question.choices[partnerChoice];
      $("[data-next-label]").textContent = questionNo === state.questionCount ? "看這局結果" : "下一題";
      $("[data-next]").disabled = roomState.your_ready === true || state.gameBusy;
      $("[data-reveal]").classList.remove("hidden");
      showRemoteGameStatus(roomState.your_ready === true
        ? "你已準備好，等朋友也按下「下一題」即可繼續。"
        : "雙方都已作答，答案已揭曉。看完後一起前往下一題。");
    } else {
      $("[data-reveal]").classList.add("hidden");
      $("[data-next]").disabled = true;
      $$(".answer-option").forEach((button, optionIndex) => {
        const selected = state.gameChoice === optionIndex;
        button.disabled = roomState.you?.answered === true || state.gameBusy;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      if (roomState.you?.answered === true) {
        showRemoteGameStatus("你的答案已送出，等待朋友完成作答…");
      } else if (roomState.partner?.answered === true) {
        showRemoteGameStatus("朋友已完成作答，選擇你的答案就會一起揭曉。");
      } else {
        showRemoteGameStatus(state.gameBusy ? "正在送出答案…" : "選好答案後，等朋友也完成作答即可揭曉。");
      }
    }
    updateProgress();
  }

  async function loadLiveRoomResults(roomId, syncId, userId) {
    if (!remoteGameIsCurrent(roomId, syncId, userId) ||
        (state.gameResultLoading && state.gameResultSyncId === syncId)) return false;
    state.gameResultLoading = true;
    state.gameResultSyncId = syncId;
    try {
      const { data, error } = await authState.client.rpc("get_room_results", { p_room_id: roomId });
      if (!remoteGameIsCurrent(roomId, syncId, userId)) return false;
      if (error) throw error;
      if (!data || !Array.isArray(data.common_choices)) throw new Error("Unexpected room results response");
      const questionCount = [5, 10, 15].includes(Number(data.question_count))
        ? Number(data.question_count)
        : state.questionCount;
      state.questionCount = questionCount;
      const questions = Array.from({ length: questionCount }, (_, index) =>
        state.gameQuestions[index] || { prompt: "", choices: ["", ""] }
      );
      const answers = Array(questionCount).fill(null);
      data.common_choices.forEach((item) => {
        const index = Number(item.question_no) - 1;
        if (index < 0 || index >= questionCount || typeof item.choice !== "string") return;
        questions[index] = { prompt: item.prompt || questions[index].prompt, choices: [item.choice, item.choice] };
        answers[index] = { player: 0, opponent: 0 };
      });
      state.gameQuestions = questions;
      state.answers = answers;
      state.topic = topicLabels[data.topic_key] || state.topic;
      state.matchMode = "live_completed";
      state.completedRoomId = roomId;
      state.completedRoomUserId = userId;
      state.moderationRoomId = roomId;
      state.moderationUserId = userId;
      stopLiveGameSync();
      state.liveRoom = null;
      renderResults();
      return true;
    } catch (error) {
      if (remoteGameIsCurrent(roomId, syncId, userId)) {
        console.warn("Could not load live room results", error);
        showRemoteGameStatus("對局已結束，但結果暫時無法載入；正在重試…");
      }
      return false;
    } finally {
      if (state.gameResultSyncId === syncId) {
        state.gameResultLoading = false;
        state.gameResultSyncId = null;
      }
    }
  }

  async function refreshLiveGame(roomId, syncId, userId) {
    if (!remoteGameIsCurrent(roomId, syncId, userId)) return;
    if (state.gameRefreshBusy) {
      if (state.gameRefreshSyncId === syncId) state.gameRefreshQueued = true;
      return;
    }
    state.gameRefreshBusy = true;
    state.gameRefreshSyncId = syncId;
    try {
      const { data, error } = await authState.client.rpc("get_room_state", { p_room_id: roomId });
      if (!remoteGameIsCurrent(roomId, syncId, userId)) return;
      if (error) throw error;
      if (data?.status === "completed") {
        const loaded = await loadLiveRoomResults(roomId, syncId, userId);
        if (loaded) return;
      } else if (["expired", "abandoned"].includes(data?.status)) {
        showRoomEnded(data.status);
        return;
      } else if (data?.status === "waiting") {
        if (state.liveRoom.createdBy && !state.liveRoom.inviteCode) {
          try {
            const { data: invitation, error: invitationError } = await authState.client.rpc(
              "get_invite_room_status",
              { p_room_id: roomId }
            );
            if (remoteGameIsCurrent(roomId, syncId, userId) && !invitationError && invitation?.invite_code) {
              state.liveRoom.inviteCode = invitation.invite_code;
              state.liveRoom.expiresAt = invitation.expires_at;
            }
          } catch {}
        }
        stopLiveGameSync();
        state.liveRoom.status = "waiting";
        updateLiveRoomScreen(data);
        showView("invite-room", true);
        if (state.liveRoom.createdBy && state.liveRoom.inviteCode) {
          const pollId = ++state.roomPollId;
          scheduleRoomStatusCheck(roomId, pollId, userId);
        }
        return;
      } else if (data?.status === "playing") {
        state.liveRoom.status = "playing";
        renderLiveGameState(data);
      } else {
        throw new Error("Unexpected room state response");
      }
    } catch (error) {
      if (remoteGameIsCurrent(roomId, syncId, userId)) {
        console.warn("Could not refresh live room state", error);
        showRemoteGameStatus("連線暫時中斷，正在重新同步房間狀態…");
      }
    } finally {
      if (state.gameRefreshSyncId === syncId) {
        state.gameRefreshBusy = false;
        state.gameRefreshSyncId = null;
        if (remoteGameIsCurrent(roomId, syncId, userId)) {
          if (state.gameRefreshQueued) {
            state.gameRefreshQueued = false;
            scheduleLiveGameRefresh(roomId, syncId, userId, 0);
          } else {
            scheduleLiveGameRefresh(roomId, syncId, userId);
          }
        }
      }
    }
  }

  function enterLiveRoomGame(room) {
    if (!authState.client || !authState.session?.user?.id || room.userId !== authState.session.user.id) return;
    if (state.liveRoom?.roomId === room.roomId && state.matchMode === "live" && state.gameChannel) {
      refreshLiveGame(room.roomId, state.gameSyncId, room.userId);
      return;
    }
    stopRoomStatusWatch();
    stopLiveGameSync();
    state.liveRoom = room;
    state.moderationRoomId = room.roomId;
    state.moderationUserId = room.userId;
    state.moderationBusy = false;
    state.opponentBlocked = false;
    state.matchMode = "live";
    state.topic = topicLabels[room.topicKey] || state.topic;
    state.questionCount = [5, 10, 15].includes(Number(room.questionCount))
      ? Number(room.questionCount)
      : state.questionCount;
    state.questionIndex = 0;
    state.gameQuestionNo = 0;
    state.gameQuestions = Array(state.questionCount).fill(null);
    state.answers = [];
    state.gameChoice = null;
    state.gameBusy = false;
    state.nickname = getPlayerNickname();
    refreshSafetyActions();
    const syncId = state.gameSyncId;
    const userId = room.userId;
    showView("game", true);
    showRemoteGameStatus("正在連接真人房間…");
    $$(".answer-option").forEach((button) => { button.disabled = true; });
    const channel = authState.client
      .channel(`game-room-${room.roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "game_rooms",
        filter: `id=eq.${room.roomId}`
      }, () => refreshLiveGame(room.roomId, syncId, userId))
      .subscribe((status) => {
        if (!remoteGameIsCurrent(room.roomId, syncId, userId)) return;
        if (status === "SUBSCRIBED") {
          state.gameRealtimeAvailable = true;
          refreshLiveGame(room.roomId, syncId, userId);
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          state.gameRealtimeAvailable = false;
          showRemoteGameStatus("即時更新暫時不可用，仍會定時重新同步房間狀態。");
          scheduleLiveGameRefresh(room.roomId, syncId, userId, 0);
        }
      });
    state.gameChannel = channel;
    refreshLiveGame(room.roomId, syncId, userId);
  }

  async function submitLiveAnswer(choice) {
    const room = state.liveRoom;
    if (!room || state.gameBusy || state.gameChoice !== null || !authState.client) return;
    const syncId = state.gameSyncId;
    const userId = room.userId;
    if (!remoteGameIsCurrent(room.roomId, syncId, userId)) return;
    state.gameChoice = choice;
    state.gameBusy = true;
    $$(".answer-option").forEach((button, index) => {
      button.disabled = true;
      button.classList.toggle("is-selected", index === choice);
      button.setAttribute("aria-pressed", String(index === choice));
    });
    showRemoteGameStatus("正在送出答案…");
    try {
      const { error } = await authState.client.rpc("submit_answer", {
        p_room_id: room.roomId,
        p_choice: choice
      });
      if (!remoteGameIsCurrent(room.roomId, syncId, userId)) return;
      if (error) throw error;
    } catch (error) {
      if (!remoteGameIsCurrent(room.roomId, syncId, userId)) return;
      console.warn("Could not submit live answer", error);
      state.gameChoice = null;
      showRemoteGameStatus("答案沒有送出，正在確認房間狀態…");
    } finally {
      if (remoteGameIsCurrent(room.roomId, syncId, userId)) {
        state.gameBusy = false;
        await refreshLiveGame(room.roomId, syncId, userId);
      }
    }
  }

  async function continueLiveRoom() {
    const room = state.liveRoom;
    if (!room || state.gameBusy || !authState.client) return;
    const syncId = state.gameSyncId;
    const userId = room.userId;
    if (!remoteGameIsCurrent(room.roomId, syncId, userId)) return;
    state.gameBusy = true;
    $("[data-next]").disabled = true;
    showRemoteGameStatus("正在通知房間繼續…");
    let shouldRefresh = false;
    try {
      const { data, error } = await authState.client.rpc("continue_room", { p_room_id: room.roomId });
      if (!remoteGameIsCurrent(room.roomId, syncId, userId)) return;
      if (error) throw error;
      if (["completed", "advanced", "waiting_for_partner"].includes(data?.status)) {
        shouldRefresh = true;
      } else if (data?.status === "expired" || data?.status === "abandoned") {
        showRoomEnded(data.status);
      } else {
        throw new Error("Unexpected continue room response");
      }
    } catch (error) {
      if (remoteGameIsCurrent(room.roomId, syncId, userId)) {
        console.warn("Could not continue live room", error);
        showRemoteGameStatus("目前無法進入下一題，請稍後重試。");
        $("[data-next]").disabled = false;
      }
    } finally {
      if (remoteGameIsCurrent(room.roomId, syncId, userId)) {
        state.gameBusy = false;
        if (shouldRefresh) await refreshLiveGame(room.roomId, syncId, userId);
      }
    }
  }

  async function openInviteRoom() {
    if (state.roomBusy) return;
    state.nickname = getPlayerNickname();
    chooseTopic();
    if (!authState.client) {
      showRoomPreview(createDemoInviteCode());
      return;
    }
    if (!authState.session?.user?.id) {
      announce("請先登入，再建立真人邀請房。");
      return;
    }

    const button = $("[data-create-room]");
    const operationId = ++state.roomOperationId;
    const userId = authState.session.user.id;
    state.roomBusy = true;
    button.disabled = true;
    try {
      const { data, error } = await authState.client.rpc("create_invite_room", {
        p_topic_choice: topicChoiceKeys[state.topicChoice] || "random",
        p_nickname: state.nickname,
        p_question_count: state.questionCount
      });
      if (operationId !== state.roomOperationId || authState.session?.user?.id !== userId) return;
      if (error) throw error;
      if (!data?.room_id || !["waiting", "active_room"].includes(data.status)) {
        throw new Error("Unexpected invite room response");
      }
      const waiting = data.status === "waiting" || Boolean(data.invite_code);
      showLiveInviteRoom({
        roomId: data.room_id,
        inviteCode: data.invite_code || null,
        topicKey: data.topic_key,
        questionCount: Number(data.question_count) || state.questionCount,
        status: waiting ? "waiting" : data.status,
        expiresAt: data.expires_at,
        opponentNickname: null,
        createdBy: true,
        userId
      });
    } catch (error) {
      if (operationId !== state.roomOperationId || authState.session?.user?.id !== userId) return;
      console.warn("Could not create invite room", error);
      announce("邀請房沒有建立成功，請確認登入狀態及資料庫設定後重試。");
    } finally {
      if (operationId === state.roomOperationId) {
        state.roomBusy = false;
        button.disabled = false;
      }
    }
  }

  async function joinInviteRoom() {
    if (state.roomBusy) return;
    const input = $("#invite-code");
    const code = input.value.trim().toUpperCase();
    if (!/^\d{6}$/.test(code) && !/^[0-9A-F]{12}$/.test(code)) {
      announce("請輸入 6 位數字房間代碼。尚未逾期的舊邀請碼仍可使用。");
      input.focus();
      return;
    }
    state.nickname = getPlayerNickname();
    if (!authState.client) {
      showRoomPreview(code, true);
      return;
    }
    if (!authState.session?.user?.id) {
      announce("請先登入，再加入真人邀請房。");
      return;
    }

    const button = $("[data-join-room]");
    const operationId = ++state.roomOperationId;
    const userId = authState.session.user.id;
    state.roomBusy = true;
    button.disabled = true;
    try {
      const { data, error } = await authState.client.rpc("join_invite_room", {
        p_invite_code: code,
        p_nickname: state.nickname
      });
      if (operationId !== state.roomOperationId || authState.session?.user?.id !== userId) return;
      if (error) throw error;
      if (data?.status === "not_found") {
        announce("找不到這個邀請代碼，請確認後重試。");
        input.focus();
        return;
      }
      if (data?.status === "expired") {
        announce("這個邀請房已逾期，請向朋友索取新代碼。");
        input.focus();
        return;
      }
      if (data?.status === "unavailable") {
        announce("這個邀請房已經有人加入或已關閉。");
        input.focus();
        return;
      }
      if (data?.status === "rate_limited") {
        const retryAfter = Math.max(1, Number(data.retry_after_seconds) || 600);
        announce(`輸入次數過多，請在 ${retryAfter} 秒後再試。`);
        input.focus();
        return;
      }
      if (!["joined", "active_room"].includes(data?.status) || !data.room_id) {
        throw new Error("Unexpected join room response");
      }
      showLiveInviteRoom({
        roomId: data.room_id,
        inviteCode: null,
        topicKey: data.topic_key,
        status: data.status,
        expiresAt: data.expires_at,
        opponentNickname: data.opponent_nickname,
        createdBy: data.status === "active_room",
        userId
      });
    } catch (error) {
      if (operationId !== state.roomOperationId || authState.session?.user?.id !== userId) return;
      console.warn("Could not join invite room", error);
      announce("加入邀請房沒有完成，請確認登入狀態及代碼後重試。");
    } finally {
      if (operationId === state.roomOperationId) {
        state.roomBusy = false;
        button.disabled = false;
      }
    }
  }

  async function leaveInviteRoom() {
    const room = state.liveRoom;
    if (!room) {
      showView("home", true);
      return;
    }
    if (state.roomBusy || !authState.client || !authState.session?.user?.id) return;
    const button = $("[data-room-leave]");
    const operationId = ++state.roomOperationId;
    state.roomBusy = true;
    button.disabled = true;
    stopRoomStatusWatch();
    stopLiveGameSync();
    try {
      const { error } = await authState.client.rpc("leave_room", { p_room_id: room.roomId });
      if (operationId !== state.roomOperationId || authState.session?.user?.id !== room.userId) return;
      if (error) throw error;
      state.liveRoom = null;
      showView("home", true);
      announce("已離開真人房間。");
    } catch (error) {
      if (operationId !== state.roomOperationId || authState.session?.user?.id !== room.userId) return;
      console.warn("Could not leave invite room", error);
      $("[data-room-status]").textContent = "離開房間沒有完成，請稍後重試。";
      if (room.createdBy && room.status === "waiting") {
        const pollId = ++state.roomPollId;
        scheduleRoomStatusCheck(room.roomId, pollId, room.userId);
      } else if (room.status === "playing") {
        enterLiveRoomGame(room);
      }
    } finally {
      if (operationId === state.roomOperationId) {
        state.roomBusy = false;
        button.disabled = false;
      }
    }
  }

  async function copyDemoInviteCode() {
    const code = $("[data-room-code]").textContent;
    try {
      await navigator.clipboard.writeText(code);
      announce(state.liveRoom ? "邀請代碼已複製。" : "示範代碼已複製。");
    } catch {
      announce("複製功能無法使用，請手動記下代碼。");
    }
  }

  function updateProgress() {
    const questionNumber = state.questionIndex + 1;
    const questionCount = currentGameQuestions().length;
    $("[data-question-number]").textContent = String(questionNumber);
    $("[data-question-count-label]").textContent = String(questionCount);
    $("[data-game-topic]").textContent = state.topic;
    $("[data-player-name]").textContent = state.nickname;
    $("[data-player-avatar]").textContent = state.nickname.slice(0, 1);
    $("[data-progress]").style.width = String((questionNumber / questionCount) * 100) + "%";
    const progress = $(".game-progress");
    progress.setAttribute("aria-valuemax", String(questionCount));
    progress.setAttribute("aria-valuenow", String(questionNumber));
    progress.setAttribute("aria-valuetext", "第 " + questionNumber + " 題，共 " + questionCount + " 題");

    const knownAnswers = state.answers.filter(Boolean);
    const answered = knownAnswers.length;
    const matches = knownAnswers.filter((answer) => answer.player === answer.opponent).length;
    $("[data-answered-count]").textContent = String(answered);
    $("[data-match-count]").textContent = String(matches);
    $("[data-match-label]").textContent = state.matchMode === "live" ? "本機已揭曉相同" : "目前相同";
  }

  function currentGameQuestions() {
    return state.gameQuestions || questionBank[state.topic].slice(0, state.questionCount);
  }

  function renderQuestion() {
    const question = currentGameQuestions()[state.questionIndex];
    $("[data-question]").textContent = question.prompt;
    $("[data-next]").disabled = false;
    $$(".answer-option").forEach((button, index) => {
      button.disabled = false;
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
      $(".option-copy", button).textContent = question.choices[index];
    });
    $("[data-reveal]").classList.add("hidden");
    $("[data-remote-status]").classList.add("hidden");
    updateProgress();
  }

  function revealAnswer(selectedIndex) {
    const question = currentGameQuestions()[state.questionIndex];
    const answer = { player: selectedIndex, opponent: question.demoAnswer };
    state.answers[state.questionIndex] = answer;
    const matched = answer.player === answer.opponent;

    $$(".answer-option").forEach((button, index) => {
      button.disabled = true;
      button.classList.toggle("is-selected", index === selectedIndex);
      button.setAttribute("aria-pressed", String(index === selectedIndex));
    });

    $("[data-reveal-heading]").textContent = matched ? "你們找到一個共同點了" : "選擇不一樣，也多認識一點彼此";
    $("[data-reveal-copy]").textContent = matched
      ? "你們都選了「" + question.choices[selectedIndex] + "」。"
      : "每個人的偏好都不同，這也是認識新觀點的開始。";
    $("[data-player-answer]").textContent = question.choices[selectedIndex];
    $("[data-peer-answer]").textContent = question.choices[question.demoAnswer];
    $("[data-peer-answer-label]").textContent = `${$("[data-opponent-name]").textContent}・示範`;
    $("[data-reveal]").classList.remove("hidden");
    $("[data-next-label]").textContent = state.questionIndex === currentGameQuestions().length - 1 ? "看這局結果" : "下一題";
    updateProgress();
    $("[data-next]").focus({ preventScroll: true });
  }

  function renderResults() {
    const questions = currentGameQuestions();
    const matchedIndexes = state.answers.reduce((indexes, answer, index) => {
      if (answer && answer.player === answer.opponent) indexes.push(index);
      return indexes;
    }, []);
    $("[data-result-score]").textContent = String(matchedIndexes.length);
    $("[data-result-question-count]").textContent = String(questions.length);
    $("[data-result-topic]").textContent = state.topic;
    $("[data-result-disclaimer]").textContent = state.matchMode === "live_completed"
      ? "真人對局結果由伺服器確認；個人紀錄可在歷史頁查詢。"
      : "本次配對與答案為原型示範，不會保存遊戲紀錄。";
    $("[data-result-copy]").textContent = matchedIndexes.length
      ? "這些相同的選擇，是認識彼此的一個小線索。"
      : "答案不一樣也很好，這是認識新觀點的開始。";

    const list = $("[data-result-list]");
    list.replaceChildren();
    matchedIndexes.forEach((index) => {
      const question = questions[index];
      const item = document.createElement("li");
      const prompt = document.createElement("span");
      const choice = document.createElement("b");
      prompt.textContent = question.prompt;
      choice.textContent = question.choices[state.answers[index].player];
      item.append(prompt, choice);
      list.append(item);
    });
    $("[data-empty-result]").classList.toggle("hidden", matchedIndexes.length > 0);
    list.classList.toggle("hidden", matchedIndexes.length === 0);
    showView("results", true);
    refreshSafetyActions();
    prepareShareCard(questions, matchedIndexes);
    renderSamePlayerRematchPanel();
  }

  function currentResultRematchUserId() {
    return state.completedRoomUserId &&
      authState.session?.user?.id === state.completedRoomUserId
      ? state.completedRoomUserId
      : null;
  }

  function renderSamePlayerRematchPanel(data = null) {
    const panel = $(`[data-rematch-panel]`);
    const button = $(`[data-request-rematch]`);
    const status = $(`[data-rematch-status]`);
    const shouldShow = state.matchMode === "live_completed" && Boolean(state.completedRoomId);
    panel.classList.toggle("hidden", !shouldShow);
    if (!shouldShow) {
      stopSamePlayerRematchWatch();
      return;
    }

    if (!currentResultRematchUserId() || !authState.client) {
      button.disabled = true;
      status.textContent = "請使用完成這場對局的帳號登入，才能邀請對方再玩。";
      stopSamePlayerRematchWatch();
      return;
    }

    button.classList.remove("hidden");
    button.disabled = state.rematchBusy;
    button.textContent = state.rematchBusy ? "正在送出邀請…" : "邀請對方再玩一局";
    status.textContent = "如果雙方都同意，會使用相同主題開啟一場新對局。邀請 10 分鐘後失效。";

    if (data?.status === "pending") {
      if (data.requested_by_you) {
        status.textContent = "已送出邀請，正在等對方同意；對方接受後會自動進入新對局。";
        button.textContent = "等待對方同意";
        button.disabled = true;
      } else {
        status.textContent = "對方邀請你再玩一局。按下同意後，會立即開始相同主題的新對局。";
        button.textContent = "同意並開始新一局";
        button.disabled = state.rematchBusy;
      }
    } else if (data?.status === "expired") {
      status.textContent = "上一個邀請已逾期；你可以重新邀請對方。";
      button.textContent = "重新邀請再玩一局";
      button.disabled = state.rematchBusy;
    } else if (data?.status === "blocked") {
      status.textContent = "目前無法和這位玩家再開新局。";
      button.classList.add("hidden");
    } else if (data?.status === "busy") {
      status.textContent = "你或對方目前正在另一場遊戲；結束後可以再試。";
      button.textContent = "再試一次";
      button.disabled = state.rematchBusy;
    } else if (["matched", "finished"].includes(data?.status)) {
      status.textContent = data.status === "finished"
        ? "這場續玩對局已結束。"
        : "對方已同意，正在進入新對局…";
      button.disabled = true;
    } else if (["ended", "none"].includes(data?.status)) {
      status.textContent = data.status === "ended"
        ? "上一場續玩已結束；可以重新邀請對方。"
        : "如果雙方都同意，會使用相同主題開啟一場新對局。邀請 10 分鐘後失效。";
      button.textContent = data.status === "ended" ? "重新邀請再玩一局" : "邀請對方再玩一局";
      button.disabled = state.rematchBusy;
    } else if (data?.status === "error") {
      status.textContent = "暫時無法確認邀請狀態，正在重新連線…";
      button.disabled = true;
    }
    startSamePlayerRematchWatch();
  }

  function samePlayerRematchIsCurrent(watchId, roomId, userId) {
    return state.rematchWatchId === watchId &&
      state.rematchWatchRoomId === roomId &&
      state.rematchWatchUserId === userId &&
      state.completedRoomId === roomId &&
      authState.session?.user?.id === userId &&
      !$('[data-view="results"]').classList.contains("hidden");
  }

  function scheduleSamePlayerRematchRefresh(watchId, roomId, userId, delay) {
    window.clearTimeout(state.rematchPollTimer);
    if (!samePlayerRematchIsCurrent(watchId, roomId, userId)) return;
    const pollDelay = Number.isFinite(delay)
      ? delay
      : state.rematchRealtimeAvailable
        ? REALTIME_FALLBACK_POLL_MS
        : DISCONNECTED_POLL_MS;
    state.rematchPollTimer = window.setTimeout(() => {
      refreshSamePlayerRematchStatus(watchId, roomId, userId);
    }, pollDelay);
  }

  function handleSamePlayerRematchStatus(data, watchId, roomId, userId) {
    if (!samePlayerRematchIsCurrent(watchId, roomId, userId)) return;
    if (data?.status === "matched" && data.room_id) {
      state.rematchBusy = false;
      stopSamePlayerRematchWatch();
      enterLiveRoomGame({
        roomId: data.room_id,
        topicKey: data.topic_key,
        status: "playing",
        expiresAt: data.expires_at,
        opponentNickname: "朋友",
        createdBy: false,
        userId
      });
      return;
    }
    renderSamePlayerRematchPanel(data);
    scheduleSamePlayerRematchRefresh(watchId, roomId, userId);
  }

  async function refreshSamePlayerRematchStatus(watchId, roomId, userId) {
    if (!samePlayerRematchIsCurrent(watchId, roomId, userId)) return;
    if (state.rematchStatusBusy || state.rematchBusy) {
      scheduleSamePlayerRematchRefresh(watchId, roomId, userId);
      return;
    }
    state.rematchStatusBusy = true;
    try {
      const { data, error } = await authState.client.rpc("get_same_player_rematch_status", {
        p_source_room_id: roomId
      });
      if (!samePlayerRematchIsCurrent(watchId, roomId, userId)) return;
      if (error) throw error;
      handleSamePlayerRematchStatus(data, watchId, roomId, userId);
    } catch (error) {
      if (samePlayerRematchIsCurrent(watchId, roomId, userId)) {
        console.warn("Could not load same-player rematch status", error);
        renderSamePlayerRematchPanel({ status: "error" });
        scheduleSamePlayerRematchRefresh(watchId, roomId, userId, 5000);
      }
    } finally {
      if (state.rematchWatchId === watchId) state.rematchStatusBusy = false;
    }
  }

  function startSamePlayerRematchWatch() {
    const roomId = state.completedRoomId;
    const userId = currentResultRematchUserId();
    if (!roomId || !userId || !authState.client) return;
    if (state.rematchWatchRoomId === roomId && state.rematchWatchUserId === userId) return;
    stopSamePlayerRematchWatch();
    const watchId = state.rematchWatchId;
    state.rematchWatchRoomId = roomId;
    state.rematchWatchUserId = userId;
    const channel = authState.client
      .channel(`same-player-rematch-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "game_rooms",
        filter: `id=eq.${roomId}`
      }, () => refreshSamePlayerRematchStatus(watchId, roomId, userId))
      .subscribe((status) => {
        if (!samePlayerRematchIsCurrent(watchId, roomId, userId)) return;
        if (status === "SUBSCRIBED") {
          state.rematchRealtimeAvailable = true;
          refreshSamePlayerRematchStatus(watchId, roomId, userId);
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          state.rematchRealtimeAvailable = false;
          scheduleSamePlayerRematchRefresh(watchId, roomId, userId, 0);
        }
      });
    state.rematchChannel = channel;
    refreshSamePlayerRematchStatus(watchId, roomId, userId);
  }

  async function requestSamePlayerRematch() {
    const roomId = state.completedRoomId;
    const userId = currentResultRematchUserId();
    if (!roomId || !userId || !authState.client || state.rematchBusy) return;
    state.rematchBusy = true;
    renderSamePlayerRematchPanel();
    const button = $(`[data-request-rematch]`);
    button.disabled = true;
    button.textContent = "正在送出邀請…";
    const watchId = state.rematchWatchId;
    try {
      const { data, error } = await authState.client.rpc("request_same_player_rematch", {
        p_source_room_id: roomId
      });
      if (state.completedRoomId !== roomId || authState.session?.user?.id !== userId) return;
      if (error) throw error;
      state.rematchBusy = false;
      if (data?.status === "matched" && data.room_id) {
        handleSamePlayerRematchStatus(data, watchId, roomId, userId);
      } else {
        renderSamePlayerRematchPanel(data);
        scheduleSamePlayerRematchRefresh(watchId, roomId, userId, 1000);
      }
    } catch (error) {
      if (state.completedRoomId === roomId && authState.session?.user?.id === userId) {
        console.warn("Could not request same-player rematch", error);
        state.rematchBusy = false;
        renderSamePlayerRematchPanel({ status: "error" });
        scheduleSamePlayerRematchRefresh(watchId, roomId, userId, 1000);
      }
    }
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function createShareCard(questions, matchedIndexes) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) return Promise.reject(new Error("無法建立分享圖片"));

    context.fillStyle = "#f7f4ee";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#edf1e8";
    context.beginPath();
    context.arc(940, 330, 250, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f1e8d8";
    context.beginPath();
    context.arc(80, 1580, 240, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#536d4d";
    roundedRect(context, 88, 86, 74, 74, 22);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "700 38px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("同", 125, 124);
    context.textAlign = "left";
    context.fillStyle = "#252820";
    context.font = "700 42px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillText("同頻", 184, 126);
    context.fillStyle = "#777d70";
    context.font = "500 22px 'DM Sans', sans-serif";
    context.textAlign = "right";
    context.fillText(state.matchMode === "live_completed" ? "真人對局" : "示範對局", 992, 126);

    context.textAlign = "center";
    roundedRect(context, 421, 360, 238, 66, 33);
    context.fillStyle = "#ffffffcc";
    context.fill();
    context.fillStyle = "#536d4d";
    context.font = "600 28px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillText(state.topic + " 主題", 540, 393);

    context.fillStyle = "#777d70";
    context.font = "500 28px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillText("這一局，你們找到", 540, 535);
    context.fillStyle = "#252820";
    context.font = "700 76px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillText(String(matchedIndexes.length) + " 個共同點", 540, 650);
    context.fillStyle = "#536d4d";
    context.font = "700 42px 'DM Sans', sans-serif";
    context.fillText(String(matchedIndexes.length) + " / " + String(questions.length), 540, 750);
    context.fillStyle = "#777d70";
    context.font = "500 22px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillText("相同選擇題數", 540, 795);

    if (matchedIndexes.length) {
      context.textAlign = "left";
      context.fillStyle = "#777d70";
      context.font = "600 22px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      context.fillText("你們都這樣選", 94, 900);
      matchedIndexes.forEach((index, position) => {
        const y = 946 + position * 138;
        const question = questions[index];
        roundedRect(context, 88, y, 904, 116, 22);
        context.fillStyle = "#fffefa";
        context.fill();
        context.fillStyle = "#b4834c";
        context.font = "600 19px 'DM Sans', sans-serif";
        context.fillText("0" + String(position + 1), 120, y + 36);
        context.fillStyle = "#777d70";
        context.font = "500 18px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
        context.fillText(question.prompt, 174, y + 36, 770);
        context.fillStyle = "#3b5439";
        context.font = "700 27px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
        context.fillText(question.choices[state.answers[index].player], 174, y + 80, 770);
      });
    } else {
      roundedRect(context, 88, 950, 904, 190, 24);
      context.fillStyle = "#fffefa";
      context.fill();
      context.fillStyle = "#3b5439";
      context.font = "600 32px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      context.textAlign = "center";
      context.fillText("答案不同，也多認識了一點彼此。", 540, 1045, 820);
      context.fillStyle = "#777d70";
      context.font = "500 22px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      context.fillText("每個選擇，都是一個新的話題。", 540, 1100, 820);
    }

    context.textAlign = "center";
    context.fillStyle = "#777d70";
    context.font = "500 24px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    context.fillText("一個選擇，發現一點相同", 540, 1798);
    context.fillStyle = "#b4834c";
    context.font = "600 21px 'DM Sans', sans-serif";
    context.fillText("tongpin", 540, 1842);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("無法輸出分享圖片"));
          return;
        }
        resolve(new File([blob], "tongpin-result.png", { type: "image/png" }));
      }, "image/png");
    });
  }

  function prepareShareCard(questions, matchedIndexes) {
    const version = ++state.shareCardVersion;
    const shareButton = $("[data-share-result]");
    const downloadButton = $("[data-download-result]");
    state.shareFile = null;
    shareButton.disabled = true;
    downloadButton.disabled = true;

    createShareCard(questions, matchedIndexes).then((file) => {
      if (version !== state.shareCardVersion) return;
      state.shareFile = file;
      shareButton.disabled = false;
      downloadButton.disabled = false;
    }).catch(() => {
      if (version !== state.shareCardVersion) return;
      announce("分享圖片暫時無法產生，請重新查看結果。");
    });
  }

  function downloadShareCard() {
    if (!state.shareFile) return;
    const url = URL.createObjectURL(state.shareFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = state.shareFile.name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function shareResult() {
    const file = state.shareFile;
    if (!file) return;
    const files = [file];
    let canShareFiles = false;
    try {
      canShareFiles = Boolean(navigator.share && navigator.canShare && navigator.canShare({ files }));
    } catch {}
    if (!canShareFiles || !navigator.share) {
      downloadShareCard();
      announce("此瀏覽器無法直接分享圖片，已下載 PNG。");
      return;
    }

    const handleShareError = (error) => {
      if (error && error.name === "AbortError") return;
      downloadShareCard();
      announce("分享沒有完成，已下載 PNG 作為備份。");
    };
    try {
      navigator.share({ files, title: "同頻｜二選一共同點" }).catch(handleShareError);
    } catch (error) {
      handleShareError(error);
    }
  }

  function announce(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => toast.classList.remove("visible"), 2400);
  }

  const topicLabels = {
    travel: "旅行",
    music: "音樂",
    daily: "日常",
    food: "飲食",
    entertainment: "影視娛樂",
    hobbies: "興趣嗜好",
    sports: "運動",
    pets: "寵物",
    reading: "閱讀學習",
    culture: "藝術文化",
    kpop: "K-pop",
    f1: "F1",
    values: "價值觀",
    relationships: "感情觀",
    politics: "政治"
  };
  const topicChoiceKeys = {
    旅行: "travel",
    音樂: "music",
    日常: "daily",
    飲食: "food",
    影視娛樂: "entertainment",
    興趣嗜好: "hobbies",
    運動: "sports",
    寵物: "pets",
    閱讀學習: "reading",
    藝術文化: "culture",
    "K-pop": "kpop",
    F1: "f1",
    價值觀: "values",
    感情觀: "relationships",
    政治: "politics",
    隨機: "random"
  };

  function isAnonymousUser(user) {
    return Boolean(user && (user.is_anonymous === true || user.app_metadata?.provider === "anonymous"));
  }

  function refreshAuthPanel() {
    const panel = $(".auth-panel");
    const message = $("[data-auth-status]");
    const anonymousButton = $("[data-auth-anonymous]");
    const anonymousLabel = $("[data-auth-anonymous-label]");
    const signOutButton = $("[data-auth-signout]");
    const deleteAccountButton = $("[data-auth-delete-account]");
    const deleteAccountNote = $("[data-auth-delete-note]");
    const user = authState.session?.user || null;
    const accountDeletionEnabled = authState.config?.accountDeletionEnabled === true;
    const hasPublicConfig = Boolean(authState.config?.url && authState.config?.anonKey);
    const hasSdk = typeof window.supabase?.createClient === "function";

    let status = "Supabase 尚未設定。可先玩本機示範；示範配對和答案不會保存。";
    if (hasPublicConfig && !hasSdk) {
      status = "登入元件目前無法載入。請確認網路連線後重新整理；本機示範仍可使用。";
    } else if (hasPublicConfig && authState.initError) {
      status = "登入服務設定無法使用。請確認 Supabase 專案網址和公開用戶端金鑰。";
    } else if (authState.client && user) {
      status = isAnonymousUser(user)
        ? "已匿名登入。此瀏覽器會記住玩家身分；清除網站資料或更換裝置後，匿名帳號可能無法找回。"
        : "已登入。此瀏覽器會記住玩家身分；清除網站資料或更換裝置後，可能無法使用這個帳號。";
    } else if (authState.client) {
      status = "登入服務已就緒。匿名登入後可建立或加入真人邀請房、隨機配對並查詢歷史紀錄。";
    }
    if (authState.client && authState.notice) status = authState.notice;

    const entryMessage = !authState.client
      ? "尚未設定真人服務時，只能玩本機示範；房間與紀錄不會跨裝置或保存。"
      : user
        ? "可建立或加入真人邀請房、隨機配對並查詢對局歷史。瀏覽器會保留玩家身分；清除網站資料或換裝置可能無法找回匿名帳號。"
        : "匿名登入後可建立或加入真人邀請房、隨機配對並查詢對局歷史。瀏覽器會保留玩家身分；清除網站資料或換裝置可能無法找回帳號。";
    $("[data-entry-disclaimer]").textContent = entryMessage;
    $("[data-room-disclaimer]").textContent = authState.client
      ? "登入後可輸入房主分享的邀請代碼加入真人房間。"
      : "尚未設定真人服務時，加入代碼只會展示本機預覽。";

    message.textContent = status;
    panel.setAttribute("aria-busy", String(authState.busy));
    anonymousButton.disabled = !authState.client || authState.busy || Boolean(user);
    anonymousLabel.textContent = user
      ? (isAnonymousUser(user) ? "已匿名登入" : "已有帳號登入")
      : "匿名登入";
    signOutButton.classList.toggle("hidden", !user);
    signOutButton.disabled = authState.busy;
    deleteAccountButton.classList.toggle("hidden", !user);
    deleteAccountButton.disabled = authState.busy || !accountDeletionEnabled;
    deleteAccountNote.classList.toggle("hidden", !user);
    deleteAccountNote.textContent = accountDeletionEnabled
      ? "刪除會移除帳號、個人歷史及封鎖清單；已送出的檢舉會去除帳號連結，說明最多保留 180 天。"
      : "自助刪除目前尚未開放；完成真實登入、刪除權限與資料收尾驗收後再啟用。";

  }

  async function initializeSupabaseAuth() {
    authState.config = window.SAMEWAVE_SUPABASE_CONFIG || {};
    if (!authState.config.url || !authState.config.anonKey || typeof window.supabase?.createClient !== "function") {
      refreshAuthPanel();
      return;
    }

    try {
      const projectUrl = new URL(authState.config.url);
      const isLocalHttp = projectUrl.protocol === "http:" &&
        (projectUrl.hostname === "localhost" || projectUrl.hostname === "127.0.0.1");
      if (projectUrl.protocol !== "https:" && !isLocalHttp) {
        throw new Error("Supabase project URL must use HTTPS.");
      }
      authState.client = window.supabase.createClient(authState.config.url, authState.config.anonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          persistSession: true
        }
      });
      const { data: listener } = authState.client.auth.onAuthStateChange((_event, session) => {
        const previousUserId = authState.session?.user?.id || null;
        const nextUserId = session?.user?.id || null;
        authState.session = session;
        authState.notice = "";
        if (previousUserId !== nextUserId) {
          state.roomOperationId += 1;
          stopSamePlayerRematchWatch();
          state.rematchBusy = false;
          state.moderationRequestId += 1;
          state.moderationRoomId = null;
          state.moderationUserId = null;
          state.moderationBusy = false;
          state.reportSubmitted = false;
          state.opponentBlocked = false;
          if (reportModal.open) reportModal.close();
          refreshSafetyActions();
          clearBlockedPlayers();
          if (state.matchmaking && state.matchmaking.userId !== nextUserId) {
            stopMatchmakingWatch();
            state.matchmaking = null;
            if (!$('[data-view="matching"]').classList.contains("hidden")) {
              showView("home", true);
            }
            announce("登入帳號已變更；本機配對等待已停止，未完成的配對票券會在 30 秒內逾時。");
          }
          if (state.liveRoom) {
            stopRoomStatusWatch();
            stopLiveGameSync();
            state.roomOperationId += 1;
            state.roomBusy = false;
            $("[data-create-room]").disabled = false;
            $("[data-join-room]").disabled = false;
            $("[data-room-leave]").disabled = false;
            state.liveRoom = null;
            if (!$('[data-view="invite-room"]').classList.contains("hidden") ||
                !$('[data-view="game"]').classList.contains("hidden")) {
              showView("home", true);
            }
            announce("登入帳號已變更；原房間會在閒置期限後自動關閉。");
          }
          clearHistoryContent();
          if (!$('[data-view="results"]').classList.contains("hidden") && state.completedRoomId) {
            renderSamePlayerRematchPanel();
          }
          if (historyViewIsVisible()) {
            const status = $("[data-history-status]");
            if (nextUserId) {
              status.textContent = "帳號已更新，正在載入對局紀錄…";
              window.setTimeout(() => {
                if (authState.session?.user?.id === nextUserId && historyViewIsVisible()) {
                  loadMyMatchHistory();
                  loadMyBlockedPlayers();
                }
              }, 0);
            } else {
              status.textContent = "請先登入，才能查詢本人最近 90 天的對局紀錄。";
            }
          }
        }
        refreshAuthPanel();
      });
      authState.subscription = listener.subscription;
      const { data, error } = await authState.client.auth.getSession();
      if (error) throw error;
      authState.session = data.session;
      if (authState.session?.user?.id && !state.challengeLinkOpen) await restoreMyActiveRoom();
    } catch (error) {
      console.warn("Supabase Auth initialization failed", error);
      authState.client = null;
      authState.session = null;
      authState.initError = true;
    }
    refreshAuthPanel();
  }

  async function signInAnonymously() {
    if (!authState.client || authState.busy || authState.session) return;
    authState.busy = true;
    authState.notice = "正在建立匿名玩家身分…";
    refreshAuthPanel();
    try {
      const { data, error } = await authState.client.auth.signInAnonymously();
      if (error) throw error;
      authState.session = data.session;
      authState.notice = "匿名登入完成。瀏覽器會記住這台裝置的玩家身分；清除網站資料或更換裝置後，匿名帳號可能無法找回。";
    } catch (error) {
      console.warn("Anonymous sign-in failed", error);
      authState.notice = "匿名登入沒有完成。請確認 Supabase 已啟用 Anonymous Auth 後再試。";
    } finally {
      authState.busy = false;
      refreshAuthPanel();
    }
  }

  async function signOut() {
    if (!authState.client || authState.busy) return;
    if (isAnonymousUser(authState.session?.user) && !window.confirm("這個匿名玩家帳號只由目前瀏覽器記住；登出後可能無法再次使用同一身分或查看舊紀錄。仍要登出嗎？")) return;
    authState.busy = true;
    authState.notice = "正在登出…";
    refreshAuthPanel();
    try {
      const { error } = await authState.client.auth.signOut();
      if (error) throw error;
      authState.session = null;
      authState.notice = "已登出。匿名玩家帳號可能無法找回；重新建立的帳號不會看到舊紀錄。";
    } catch (error) {
      console.warn("Sign-out failed", error);
      authState.notice = "登出沒有完成，請稍後重試。";
    } finally {
      authState.busy = false;
      refreshAuthPanel();
    }
  }

  async function deleteAccount() {
    if (!authState.client || !authState.session?.user?.id || authState.busy ||
        authState.config?.accountDeletionEnabled !== true) return;
    const confirmed = window.confirm(
      "永久刪除這個帳號？這會清除你的歷史紀錄和封鎖清單。既有檢舉會移除帳號連結，但說明最多保留 180 天。此操作無法復原。"
    );
    if (!confirmed) return;

    const userId = authState.session.user.id;
    authState.busy = true;
    authState.notice = "正在刪除帳號和個人資料…";
    refreshAuthPanel();
    try {
      const { data, error } = await authState.client.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      if (data?.status !== "deleted") throw new Error("Unexpected account deletion response");
      try {
        await authState.client.auth.signOut({ scope: "local" });
      } catch (error) {
        console.warn("Could not clear the deleted account's local session", error);
      }
      if (authState.session?.user?.id === userId) authState.session = null;
      authState.notice = "帳號已刪除；你的歷史和封鎖清單已清除，檢舉說明會依期限刪除。";
    } catch (error) {
      console.warn("Account deletion failed", error);
      authState.notice = "無法確認帳號刪除結果。請重新整理或重新登入，確認帳號狀態後再決定是否重試。";
    } finally {
      authState.busy = false;
      refreshAuthPanel();
    }
  }

  function showHistoryEmptyState(type, show) {
    $(`[data-history-empty="${type}"]`).classList.toggle("hidden", !show);
  }

  function renderHistoryItems(items) {
    const container = $("[data-history-items]");
    container.replaceChildren();
    const hasItems = items.length > 0;
    showHistoryEmptyState("list", !hasItems);
    container.classList.toggle("hidden", !hasItems);

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "history-entry";
      const heading = document.createElement("div");
      heading.className = "history-entry-heading";
      const topic = document.createElement("b");
      topic.textContent = topicLabels[item.topic_key] || "共同點對局";
      const completedAt = document.createElement("time");
      const date = new Date(item.completed_at);
      completedAt.dateTime = item.completed_at;
      completedAt.textContent = Number.isNaN(date.getTime()) ? "日期不明" : date.toLocaleDateString("zh-TW");
      heading.append(topic, completedAt);

      const summary = document.createElement("p");
      summary.className = "history-entry-summary";
      summary.textContent = `與 ${item.opponent_nickname || "已刪除玩家"} 相同 ${item.common_answer_count}/${item.question_count} 題`;
      card.append(heading, summary);

      const choices = Array.isArray(item.common_choices) ? item.common_choices : [];
      if (choices.length) {
        const list = document.createElement("ul");
        list.className = "history-choice-list";
        choices.forEach((choice) => {
          const row = document.createElement("li");
          const question = document.createElement("span");
          const answer = document.createElement("b");
          question.textContent = choice.prompt || `第 ${choice.question_no} 題`;
          answer.textContent = choice.choice || "共同選擇";
          row.append(question, answer);
          list.append(row);
        });
        card.append(list);
      }

      const remove = document.createElement("button");
      remove.className = "history-delete";
      remove.type = "button";
      remove.dataset.historyDelete = item.id;
      remove.textContent = "刪除這筆紀錄";
      remove.setAttribute("aria-label", `刪除與 ${item.opponent_nickname || "已刪除玩家"} 的對局紀錄`);
      card.append(remove);
      container.append(card);
    });
  }

  function renderHistoryRanking(players) {
    const container = $("[data-history-ranking]");
    container.replaceChildren();
    const hasPlayers = players.length > 0;
    showHistoryEmptyState("ranking", !hasPlayers);
    container.classList.toggle("hidden", !hasPlayers);

    players.forEach((player) => {
      const card = document.createElement("article");
      card.className = "ranking-entry";
      const heading = document.createElement("div");
      heading.className = "ranking-entry-heading";
      const opponent = document.createElement("b");
      opponent.textContent = player.opponent_nickname || "已刪除玩家";
      const ratio = document.createElement("span");
      ratio.textContent = `${Math.round(Number(player.commonality_ratio) * 100)}%`;
      heading.append(opponent, ratio);
      const summary = document.createElement("p");
      summary.className = "ranking-entry-summary";
      summary.textContent = `${player.match_count} 局中有 ${player.common_answer_count}/${player.question_count} 題相同`;
      card.append(heading, summary);
      container.append(card);
    });
  }

  function hasCurrentModerationRoom() {
    return Boolean(
      authState.client &&
      state.moderationRoomId &&
      state.moderationUserId &&
      authState.session?.user?.id === state.moderationUserId
    );
  }

  function refreshSafetyActions() {
    const canModerate = hasCurrentModerationRoom();
    const showInGame = canModerate && state.matchMode === "live";
    const showInResults = canModerate && state.matchMode === "live_completed";
    $("[data-live-safety-actions]").classList.toggle("hidden", !showInGame);
    $("[data-result-safety-actions]").classList.toggle("hidden", !showInResults);
    $$('[data-block-opponent]').forEach((button) => {
      button.disabled = !canModerate || state.moderationBusy || state.opponentBlocked;
      button.textContent = state.opponentBlocked ? "已封鎖" : "封鎖玩家";
    });
    $$('[data-open-report]').forEach((button) => {
      button.disabled = !canModerate || state.moderationBusy;
    });
    $("[data-report-submit]").disabled = !canModerate || state.moderationBusy || state.reportSubmitted;
  }

  function openPlayerReport() {
    if (!hasCurrentModerationRoom()) {
      announce("請先登入並使用已連線的真人對局功能。");
      return;
    }
    const form = $("[data-report-form]");
    form.reset();
    state.reportSubmitted = false;
    $("[data-report-status]").textContent = "";
    $("[data-report-submit]").textContent = "送出檢舉";
    refreshSafetyActions();
    reportModal.showModal();
    $("#report-category").focus({ preventScroll: true });
  }

  async function submitPlayerReport(event) {
    event.preventDefault();
    if (!hasCurrentModerationRoom() || state.moderationBusy || state.reportSubmitted) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = state.moderationUserId;
    const roomId = state.moderationRoomId;
    const requestId = ++state.moderationRequestId;
    state.moderationBusy = true;
    $("[data-report-status]").textContent = "正在安全地送出檢舉…";
    $("[data-report-submit]").textContent = "正在送出…";
    refreshSafetyActions();
    try {
      const { data, error } = await authState.client.rpc("submit_player_report", {
        p_room_id: roomId,
        p_category: formData.get("category"),
        p_details: String(formData.get("details") || "").trim()
      });
      if (requestId !== state.moderationRequestId || authState.session?.user?.id !== userId) return;
      if (error) throw error;
      state.reportSubmitted = true;
      $("[data-report-submit]").textContent = "已收到";
      $("[data-report-status]").textContent = data?.status === "already_submitted"
        ? "這局已收到你的檢舉。此原型沒有即時人工審查；需要立即處理時，請離開對局並封鎖玩家。"
        : "檢舉已保存，最多保留 180 天。此原型沒有即時人工審查；需要立即處理時，請離開對局並封鎖玩家。";
    } catch (error) {
      if (requestId !== state.moderationRequestId || authState.session?.user?.id !== userId) return;
      console.warn("Could not submit player report", error);
      $("[data-report-status]").textContent = "檢舉沒有送出，請確認連線後重試。";
      $("[data-report-submit]").textContent = "重試送出";
    } finally {
      if (requestId === state.moderationRequestId) {
        state.moderationBusy = false;
        refreshSafetyActions();
      }
    }
  }

  async function blockRoomOpponent() {
    if (!hasCurrentModerationRoom() || state.moderationBusy || state.opponentBlocked) return;
    const confirmed = window.confirm(
      "封鎖後，你們不會再次隨機配對，也不能互相加入新的邀請房。封鎖可在歷史頁解除。要封鎖這位玩家嗎？"
    );
    if (!confirmed) return;
    const userId = state.moderationUserId;
    const roomId = state.moderationRoomId;
    const requestId = ++state.moderationRequestId;
    state.moderationBusy = true;
    refreshSafetyActions();
    try {
      const { error } = await authState.client.rpc("block_room_opponent", { p_room_id: roomId });
      if (requestId !== state.moderationRequestId || authState.session?.user?.id !== userId) return;
      if (error) throw error;
      state.opponentBlocked = true;
      announce("已封鎖對方；你可以在歷史頁解除封鎖。");
      if (historyViewIsVisible()) loadMyBlockedPlayers();
    } catch (error) {
      if (requestId !== state.moderationRequestId || authState.session?.user?.id !== userId) return;
      console.warn("Could not block player", error);
      announce("封鎖沒有完成，請確認連線後重試。");
    } finally {
      if (requestId === state.moderationRequestId) {
        state.moderationBusy = false;
        refreshSafetyActions();
      }
    }
  }

  function clearBlockedPlayers() {
    state.blockedPlayersRequestId += 1;
    state.blockedPlayersBusy = false;
    state.blockedPlayers = [];
    $("[data-blocked-players]").replaceChildren();
    $("[data-blocked-players]").classList.add("hidden");
    $("[data-blocked-empty]").classList.add("hidden");
    $("[data-blocked-retry]").classList.add("hidden");
    $("[data-block-status]").textContent = "登入後可管理封鎖清單。";
  }

  function renderBlockedPlayers(players) {
    const list = $("[data-blocked-players]");
    list.replaceChildren();
    const hasPlayers = players.length > 0;
    $("[data-blocked-empty]").classList.toggle("hidden", hasPlayers);
    list.classList.toggle("hidden", !hasPlayers);
    players.forEach((player) => {
      const row = document.createElement("div");
      row.className = "blocked-player-row";
      const label = document.createElement("div");
      const nickname = document.createElement("b");
      nickname.textContent = player.nickname || "玩家";
      const date = document.createElement("small");
      const blockedAt = new Date(player.blocked_at);
      date.textContent = Number.isNaN(blockedAt.getTime())
        ? "已封鎖"
        : `封鎖於 ${blockedAt.toLocaleDateString("zh-TW")}`;
      label.append(nickname, date);
      const unblock = document.createElement("button");
      unblock.type = "button";
      unblock.dataset.unblockPlayer = player.user_id;
      unblock.textContent = "解除封鎖";
      unblock.setAttribute("aria-label", `解除封鎖 ${player.nickname || "玩家"}`);
      unblock.disabled = state.blockedPlayersBusy;
      row.append(label, unblock);
      list.append(row);
    });
  }

  async function loadMyBlockedPlayers() {
    const status = $("[data-block-status]");
    const userId = authState.session?.user?.id;
    if (!authState.client || !userId) {
      clearBlockedPlayers();
      status.textContent = "登入後可管理封鎖清單。";
      return;
    }
    if (state.blockedPlayersBusy) return;
    const requestId = ++state.blockedPlayersRequestId;
    state.blockedPlayersBusy = true;
    renderBlockedPlayers(state.blockedPlayers);
    if (!state.blockedPlayers.length) $("[data-blocked-empty]").classList.add("hidden");
    $("[data-blocked-retry]").classList.add("hidden");
    status.textContent = "正在載入封鎖清單…";
    try {
      const { data, error } = await authState.client.rpc("get_my_blocked_players");
      if (requestId !== state.blockedPlayersRequestId || authState.session?.user?.id !== userId) return;
      if (error) throw error;
      state.blockedPlayers = Array.isArray(data?.players) ? data.players : [];
      renderBlockedPlayers(state.blockedPlayers);
      status.textContent = state.blockedPlayers.length
        ? "封鎖清單只有你能查看。"
        : "沒有已封鎖的玩家。";
    } catch (error) {
      if (requestId !== state.blockedPlayersRequestId || authState.session?.user?.id !== userId) return;
      console.warn("Could not load blocked players", error);
      status.textContent = "封鎖清單暫時無法載入。";
      $("[data-blocked-retry]").classList.remove("hidden");
    } finally {
      if (requestId === state.blockedPlayersRequestId) {
        state.blockedPlayersBusy = false;
        renderBlockedPlayers(state.blockedPlayers);
      }
    }
  }

  async function unblockPlayer(button) {
    const userId = authState.session?.user?.id;
    const blockedUserId = button.dataset.unblockPlayer;
    if (!authState.client || !userId || !blockedUserId || state.blockedPlayersBusy) return;
    const player = state.blockedPlayers.find((item) => item.user_id === blockedUserId);
    if (!window.confirm(`解除對 ${player?.nickname || "這位玩家"} 的封鎖？`)) return;
    const requestId = ++state.blockedPlayersRequestId;
    state.blockedPlayersBusy = true;
    renderBlockedPlayers(state.blockedPlayers);
    $("[data-block-status]").textContent = "正在解除封鎖…";
    try {
      const { error } = await authState.client.rpc("unblock_player", {
        p_blocked_user_id: blockedUserId
      });
      if (requestId !== state.blockedPlayersRequestId || authState.session?.user?.id !== userId) return;
      if (error) throw error;
      state.blockedPlayers = state.blockedPlayers.filter((item) => item.user_id !== blockedUserId);
      renderBlockedPlayers(state.blockedPlayers);
      $("[data-block-status]").textContent = state.blockedPlayers.length
        ? "已解除封鎖。之後可能再次配對。"
        : "已解除封鎖；目前沒有已封鎖的玩家。";
    } catch (error) {
      if (requestId !== state.blockedPlayersRequestId || authState.session?.user?.id !== userId) return;
      console.warn("Could not unblock player", error);
      $("[data-block-status]").textContent = "解除封鎖沒有完成，請稍後重試。";
      button.disabled = false;
    } finally {
      if (requestId === state.blockedPlayersRequestId) {
        state.blockedPlayersBusy = false;
        renderBlockedPlayers(state.blockedPlayers);
      }
    }
  }

  function clearHistoryContent() {
    state.historyRequestId += 1;
    state.historyBusy = false;
    state.historyItems = [];
    state.historyCursor = null;
    state.historyHasMore = false;
    $("[data-history-items]").replaceChildren();
    $("[data-history-ranking]").replaceChildren();
    $("[data-history-items]").classList.add("hidden");
    $("[data-history-ranking]").classList.add("hidden");
    $("[data-history-more]").classList.add("hidden");
    $("[data-history-more]").disabled = false;
    $("[data-history-retry]").classList.add("hidden");
    showHistoryEmptyState("list", false);
    showHistoryEmptyState("ranking", false);
  }

  function historyViewIsVisible() {
    return !$(".history-view").classList.contains("hidden");
  }

  async function loadMyMatchHistory(append = false) {
    const status = $("[data-history-status]");
    const moreButton = $("[data-history-more]");
    const retryButton = $("[data-history-retry]");
    if (state.historyBusy) return { ok: false, requestId: state.historyRequestId };
    if (!authState.client) {
      clearHistoryContent();
      status.textContent = "登入服務尚未設定；本機示範不會保存或查詢真實紀錄。";
      showHistoryEmptyState("list", true);
      showHistoryEmptyState("ranking", true);
      return { ok: false, requestId: state.historyRequestId };
    }
    if (!authState.session) {
      clearHistoryContent();
      status.textContent = "請先登入，才能查詢本人最近 90 天的對局紀錄。";
      return { ok: false, requestId: state.historyRequestId };
    }

    state.historyBusy = true;
    const requestId = ++state.historyRequestId;
    const userId = authState.session.user.id;
    moreButton.disabled = true;
    retryButton.classList.add("hidden");
    status.textContent = append ? "正在載入更早的對局紀錄…" : "正在載入你的對局紀錄…";
    try {
      const cursor = append ? state.historyCursor : null;
      const historyPromise = authState.client.rpc("get_my_match_history", {
        p_limit: 50,
        p_before_at: cursor?.completed_at || null,
        p_before_id: cursor?.id || null
      });
      const rankingPromise = append
        ? Promise.resolve({ data: null, error: null })
        : authState.client.rpc("get_my_commonality_ranking");
      const [historyResponse, rankingResponse] = await Promise.all([historyPromise, rankingPromise]);
      if (requestId !== state.historyRequestId || authState.session?.user?.id !== userId) {
        return { ok: false, requestId };
      }
      if (historyResponse.error) throw historyResponse.error;
      if (rankingResponse.error) throw rankingResponse.error;
      const history = historyResponse.data || {};
      const pageItems = Array.isArray(history.items) ? history.items : [];
      state.historyItems = append ? state.historyItems.concat(pageItems) : pageItems;
      if (pageItems.length) state.historyCursor = pageItems[pageItems.length - 1];
      state.historyHasMore = pageItems.length === 50;
      renderHistoryItems(state.historyItems);
      if (!append) {
        const ranking = rankingResponse.data || {};
        renderHistoryRanking(Array.isArray(ranking.players) ? ranking.players : []);
      }
      moreButton.classList.toggle("hidden", !state.historyHasMore);
      status.textContent = "僅顯示本人最近 90 天的紀錄；你可以逐筆刪除。";
      return { ok: true, requestId };
    } catch (error) {
      if (requestId !== state.historyRequestId || authState.session?.user?.id !== userId) {
        return { ok: false, requestId };
      }
      console.warn("Could not load player history", error);
      if (!append) clearHistoryContent();
      status.textContent = "紀錄暫時無法載入，請確認登入狀態及 Supabase 歷史 RPC 設定後重試。";
      retryButton.classList.remove("hidden");
      return { ok: false, requestId: state.historyRequestId };
    } finally {
      if (requestId === state.historyRequestId) {
        state.historyBusy = false;
        moreButton.disabled = false;
      }
    }
  }

  async function deleteMyMatchHistory(button) {
    if (!authState.client || !authState.session || button.disabled || state.historyBusy) return;
    const client = authState.client;
    const userId = authState.session.user.id;
    const requestId = ++state.historyRequestId;
    const moreButton = $("[data-history-more]");
    $$("[data-history-delete]").forEach((deleteButton) => { deleteButton.disabled = true; });
    moreButton.disabled = true;
    state.historyBusy = true;
    const status = $("[data-history-status]");
    status.textContent = "正在刪除這筆紀錄…";
    let deleted = false;
    try {
      const { data, error } = await client.rpc("delete_my_match_history", {
        p_history_id: button.dataset.historyDelete
      });
      if (error) throw error;
      deleted = data === true;
    } catch (error) {
      if (requestId !== state.historyRequestId || authState.session?.user?.id !== userId) return;
      console.warn("Could not delete player history", error);
      status.textContent = "刪除沒有完成，請稍後重試。";
      return;
    } finally {
      if (requestId === state.historyRequestId) {
        state.historyBusy = false;
        $$("[data-history-delete]").forEach((deleteButton) => { deleteButton.disabled = false; });
        moreButton.disabled = false;
      }
    }
    if (requestId !== state.historyRequestId || authState.session?.user?.id !== userId) return;
    const refresh = await loadMyMatchHistory();
    if (!refresh.ok || refresh.requestId !== state.historyRequestId || authState.session?.user?.id !== userId) return;
    status.textContent = deleted ? "紀錄已刪除。" : "這筆紀錄已不存在或不屬於你的帳號。";
  }

  $("[data-auth-anonymous]").addEventListener("click", signInAnonymously);
  $("[data-auth-signout]").addEventListener("click", signOut);
  $("[data-auth-delete-account]").addEventListener("click", deleteAccount);
  $("[data-history-items]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-delete]");
    if (button) deleteMyMatchHistory(button);
  });
  $("[data-history-more]").addEventListener("click", () => loadMyMatchHistory(true));
  $("[data-history-retry]").addEventListener("click", () => loadMyMatchHistory());
  $("[data-blocked-retry]").addEventListener("click", loadMyBlockedPlayers);
  $("[data-blocked-players]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-unblock-player]");
    if (button) unblockPlayer(button);
  });
  $("[data-report-form]").addEventListener("submit", submitPlayerReport);
  $$('[data-open-report]').forEach((button) => button.addEventListener("click", openPlayerReport));
  $$('[data-block-opponent]').forEach((button) => button.addEventListener("click", blockRoomOpponent));
  $$('[data-show-privacy]').forEach((button) => button.addEventListener("click", () => privacyModal.showModal()));
  $$('[data-close-privacy]').forEach((button) => button.addEventListener("click", () => privacyModal.close()));
  $$('[data-close-report]').forEach((button) => button.addEventListener("click", () => reportModal.close()));

  $$("[data-topic-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      state.topicChoice = button.dataset.topicChoice;
      $$("[data-topic-choice]").forEach((choice) => {
        const selected = choice === button;
        choice.classList.toggle("is-selected", selected);
        choice.setAttribute("aria-pressed", String(selected));
      });
    });
  });

  $$("[data-question-count]").forEach((button) => {
    button.addEventListener("click", () => {
      state.questionCount = Number(button.dataset.questionCount);
      $$("[data-question-count]").forEach((choice) => {
        const selected = choice === button;
        choice.classList.toggle("is-selected", selected);
        choice.setAttribute("aria-pressed", String(selected));
      });
    });
  });

  $("[data-start-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    startMatching("demo");
  });

  $("[data-demo-start]").addEventListener("click", () => startMatching("demo"));
  $("[data-start-guess-challenge]").addEventListener("click", startGuessChallenge);
  $$("[data-challenge-home]").forEach((button) => {
    button.addEventListener("click", leaveGuessChallenge);
  });
  $$("[data-challenge-choice]").forEach((button) => {
    button.addEventListener("click", () => selectChallengeAnswer(Number(button.dataset.challengeChoice)));
  });
  $("[data-challenge-next]").addEventListener("click", advanceGuessChallenge);
  $("[data-copy-challenge]").addEventListener("click", copyChallengeLink);
  $("[data-share-challenge]").addEventListener("click", shareChallengeLink);
  $("[data-challenge-retry]").addEventListener("click", retryGuessChallenge);
  $("[data-random-match]").addEventListener("click", () => startMatching("random"));
  $("[data-create-room]").addEventListener("click", openInviteRoom);
  $("[data-toggle-join]").addEventListener("click", (event) => {
    const panel = $("[data-join-panel]");
    const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
    event.currentTarget.setAttribute("aria-expanded", String(!expanded));
    panel.classList.toggle("hidden", expanded);
    if (!expanded) $("#invite-code").focus();
  });
  $("[data-join-room]").addEventListener("click", joinInviteRoom);
  $("#invite-code").addEventListener("input", (event) => {
    event.currentTarget.value = event.currentTarget.value.replace(/[^0-9a-f]/gi, "").toUpperCase().slice(0, 12);
  });
  $("#invite-code").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      joinInviteRoom();
    }
  });
  $("[data-copy-room-code]").addEventListener("click", copyDemoInviteCode);
  $("[data-room-demo]").addEventListener("click", () => startMatching("demo"));
  $("[data-room-leave]").addEventListener("click", leaveInviteRoom);
  $("[data-use-demo]").addEventListener("click", startDemoGame);
  $("[data-open-history]").addEventListener("click", () => {
    showView("history", true);
    loadMyMatchHistory();
    loadMyBlockedPlayers();
  });

  $$(".answer-option").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.answers[state.questionIndex]) return;
      if (state.matchMode === "live") {
        submitLiveAnswer(Number(button.dataset.option));
        return;
      }
      revealAnswer(Number(button.dataset.option));
    });
  });

  $("[data-next]").addEventListener("click", () => {
    if (state.matchMode === "live") {
      continueLiveRoom();
      return;
    }
    if (state.questionIndex + 1 < currentGameQuestions().length) {
      state.questionIndex += 1;
      renderQuestion();
      $(".game-question").focus({ preventScroll: true });
    } else {
      renderResults();
    }
  });

  $("[data-cancel]").addEventListener("click", () => {
    if (state.matchmaking) {
      cancelMatchmaking();
      return;
    }
    window.clearTimeout(state.matchTimer);
    showView("home", true);
    announce("已取消配對");
  });

  $("[data-retry-match]").addEventListener("click", () => startMatching("random"));

  $$("[data-home]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.tagName === "A") event.preventDefault();
      if (state.liveRoom) {
        leaveInviteRoom();
        return;
      }
      window.clearTimeout(state.matchTimer);
      showView("home", true);
    });
  });

  $(`[data-play-again]`).addEventListener("click", () => startMatching("demo"));
  $(`[data-request-rematch]`).addEventListener("click", requestSamePlayerRematch);
  $("[data-share-result]").addEventListener("click", shareResult);
  $("[data-download-result]").addEventListener("click", downloadShareCard);

  $$("[data-show-help]").forEach((button) => {
    button.addEventListener("click", () => modal.showModal());
  });
  $$("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => modal.close());
  });

  showView("home");
  initializeChallengeFromLocation();
  initializeSupabaseAuth();
})();
