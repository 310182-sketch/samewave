(() => {
  "use strict";

  const questionBank = {
    旅行: [
      { prompt: "旅行時，你更喜歡哪一種安排？", choices: ["先規劃好行程", "留點空白隨興走"], demoAnswer: 1 },
      { prompt: "到了陌生城市，你最想先做什麼？", choices: ["找在地小吃", "四處散步看看"], demoAnswer: 0 },
      { prompt: "你比較想把旅行記憶留在哪裡？", choices: ["拍很多照片", "好好感受當下"], demoAnswer: 1 },
      { prompt: "旅途中多出半天空檔，你會？", choices: ["探索沒去過的地方", "找間咖啡店休息"], demoAnswer: 0 },
      { prompt: "你偏好的旅行夥伴是？", choices: ["一起安排、互相提醒", "走到哪裡算哪裡"], demoAnswer: 1 }
    ],
    音樂: [
      { prompt: "聽一首新歌時，你通常先注意？", choices: ["歌詞寫了什麼", "旋律聽起來如何"], demoAnswer: 1 },
      { prompt: "你最常在什麼時候聽音樂？", choices: ["通勤或移動時", "專心休息的時候"], demoAnswer: 0 },
      { prompt: "遇到喜歡的歌，你比較會？", choices: ["立刻分享給朋友", "先收藏起來自己聽"], demoAnswer: 1 },
      { prompt: "如果去聽現場演出，你會？", choices: ["跟著唱、享受熱鬧", "安靜感受每一首歌"], demoAnswer: 0 },
      { prompt: "你的歌單通常比較像？", choices: ["熟悉的歌反覆播放", "常常加入新發現"], demoAnswer: 1 }
    ],
    日常: [
      { prompt: "放假早上，你比較想？", choices: ["早點起床開始一天", "睡到自然醒再說"], demoAnswer: 1 },
      { prompt: "做事時，你偏好哪一種節奏？", choices: ["先排好順序再開始", "想到什麼就先做什麼"], demoAnswer: 0 },
      { prompt: "一天結束後，哪種方式最能放鬆？", choices: ["自己安靜待一會兒", "找人聊聊今天的事"], demoAnswer: 0 },
      { prompt: "你比較常用哪種方式記住事情？", choices: ["寫在行事曆或清單上", "相信自己會記得"], demoAnswer: 1 },
      { prompt: "突然有一小時空檔，你會？", choices: ["完成一件待辦事項", "讓自己放空一下"], demoAnswer: 1 }
    ],
    飲食: [
      { prompt: "點餐時，你通常會選？", choices: ["最熟悉、吃不膩的", "試試沒吃過的新口味"], demoAnswer: 1 },
      { prompt: "你喜歡哪一種早餐？", choices: ["慢慢吃一頓完整早餐", "簡單方便就可以"], demoAnswer: 0 },
      { prompt: "和朋友聚餐時，你比較在意？", choices: ["大家能一起分享食物", "每個人都吃到喜歡的"], demoAnswer: 0 },
      { prompt: "甜點擺在面前，你會？", choices: ["先拍照再開始吃", "趁熱趁新鮮馬上吃"], demoAnswer: 1 },
      { prompt: "喝飲料時，你偏好？", choices: ["固定點最愛的那款", "偶爾換個新口味"], demoAnswer: 1 }
    ]
  };

  const state = {
    topicChoice: "隨機",
    topic: "旅行",
    nickname: "小星",
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
    gameRefreshBusy: false,
    gameRefreshQueued: false,
    gameRefreshSyncId: null,
    gameQuestions: null,
    gameQuestionNo: 0,
    gameChoice: null,
    gameBusy: false,
    gameResultLoading: false,
    gameResultSyncId: null,
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

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const views = $$("[data-view]");
  const modal = $("[data-modal]");
  const privacyModal = $("[data-privacy-modal]");
  const reportModal = $("[data-report-modal]");
  const toast = $("[data-toast]");

  function showView(name, moveFocus = false) {
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
    state.nickname = ($("#nickname").value.trim() || "小星").slice(0, 12);
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
        p_nickname: state.nickname
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
    const alphabet = "0123456789ABCDEF";
    let code = "";
    for (let index = 0; index < 12; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
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
    const channel = state.gameChannel;
    state.gameChannel = null;
    if (channel && authState.client) {
      authState.client.removeChannel(channel).catch(() => {});
    }
  }

  function getPlayerNickname() {
    return ($("#nickname").value.trim() || "小星").slice(0, 12);
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
    if (Object.prototype.hasOwnProperty.call(status, "invite_code")) room.inviteCode = status.invite_code;
    if (Object.prototype.hasOwnProperty.call(status, "expires_at")) room.expiresAt = status.expires_at;
    if (Object.prototype.hasOwnProperty.call(status, "opponent_nickname")) room.opponentNickname = status.opponent_nickname;

    const code = room.inviteCode;
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

  function scheduleLiveGameRefresh(roomId, syncId, userId, delay = 3500) {
    window.clearTimeout(state.gamePollTimer);
    state.gamePollTimer = window.setTimeout(() => {
      refreshLiveGame(roomId, syncId, userId);
    }, delay);
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
    if (!Number.isInteger(questionNo) || questionNo < 1 || questionNo > 5) return;
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
      $("[data-next-label]").textContent = questionNo === 5 ? "看這局結果" : "下一題";
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
      const questions = Array.from({ length: 5 }, (_, index) =>
        state.gameQuestions[index] || { prompt: "", choices: ["", ""] }
      );
      const answers = Array(5).fill(null);
      data.common_choices.forEach((item) => {
        const index = Number(item.question_no) - 1;
        if (index < 0 || index > 4 || typeof item.choice !== "string") return;
        questions[index] = { prompt: item.prompt || questions[index].prompt, choices: [item.choice, item.choice] };
        answers[index] = { player: 0, opponent: 0 };
      });
      state.gameQuestions = questions;
      state.answers = answers;
      state.topic = topicLabels[data.topic_key] || state.topic;
      state.matchMode = "live_completed";
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
    state.questionIndex = 0;
    state.gameQuestionNo = 0;
    state.gameQuestions = Array(5).fill(null);
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
          refreshLiveGame(room.roomId, syncId, userId);
        } else if (["CHANNEL_ERROR", "TIMED_OUT"].includes(status)) {
          showRemoteGameStatus("即時更新暫時不可用，仍會定時重新同步房間狀態。");
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
        p_nickname: state.nickname
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
    if (!/^[0-9A-F]{12}$/.test(code)) {
      announce("請輸入 12 位數字或 A–F 組成的代碼。");
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
    $("[data-question-number]").textContent = String(questionNumber);
    $("[data-game-topic]").textContent = state.topic;
    $("[data-player-name]").textContent = state.nickname;
    $("[data-player-avatar]").textContent = state.nickname.slice(0, 1);
    $("[data-progress]").style.width = String((questionNumber / questionBank[state.topic].length) * 100) + "%";
    const progress = $(".game-progress");
    progress.setAttribute("aria-valuemax", String(questionBank[state.topic].length));
    progress.setAttribute("aria-valuenow", String(questionNumber));
    progress.setAttribute("aria-valuetext", "第 " + questionNumber + " 題，共 " + questionBank[state.topic].length + " 題");

    const knownAnswers = state.answers.filter(Boolean);
    const answered = knownAnswers.length;
    const matches = knownAnswers.filter((answer) => answer.player === answer.opponent).length;
    $("[data-answered-count]").textContent = String(answered);
    $("[data-match-count]").textContent = String(matches);
    $("[data-match-label]").textContent = state.matchMode === "live" ? "本機已揭曉相同" : "目前相同";
  }

  function currentGameQuestions() {
    return state.gameQuestions || questionBank[state.topic];
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
    $("[data-next-label]").textContent = state.questionIndex === questionBank[state.topic].length - 1 ? "看這局結果" : "下一題";
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

  const authProviderLabels = {
    google: "Google",
    facebook: "Facebook",
    x: "X",
    instagram: "Instagram",
    threads: "Threads"
  };
  const topicLabels = { travel: "旅行", music: "音樂", daily: "日常", food: "飲食" };
  const topicChoiceKeys = { 旅行: "travel", 音樂: "music", 日常: "daily", 飲食: "food", 隨機: "random" };

  function configuredAuthProvider(name) {
    const providers = authState.config && authState.config.providers;
    if (!providers) return null;
    if (name === "x") return providers.x === true ? "twitter" : null;
    if (name === "instagram" || name === "threads") {
      const identifier = typeof providers[name] === "string" ? providers[name].trim() : "";
      return /^custom:[a-z0-9](?:[a-z0-9:-]{0,42})$/.test(identifier) ? identifier : null;
    }
    return providers[name] === true ? name : null;
  }

  function isAnonymousUser(user) {
    return Boolean(user && (user.is_anonymous === true || user.app_metadata?.provider === "anonymous"));
  }

  function refreshAuthPanel() {
    const panel = $(".auth-panel");
    const message = $("[data-auth-status]");
    const anonymousButton = $("[data-auth-anonymous]");
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
        ? "已匿名登入。可建立或加入真人邀請房，完成對局後查詢最近 90 天紀錄；連結社群身分可保留帳號。"
        : "已登入。可建立或加入真人邀請房，完成對局後查詢最近 90 天紀錄。";
    } else if (authState.client) {
      status = "登入服務已就緒。登入後可建立或加入真人邀請房，完成對局後查詢歷史紀錄。";
    }
    if (authState.client && authState.notice) status = authState.notice;

    const entryMessage = !authState.client
      ? "尚未設定真人服務時，只能玩本機示範；房間與紀錄不會跨裝置或保存。"
      : user
        ? "可建立或加入跨裝置真人邀請房；示範對局不會保存紀錄。"
        : "登入後可建立或加入跨裝置真人邀請房；示範對局不會保存紀錄。";
    $("[data-entry-disclaimer]").textContent = entryMessage;
    $("[data-room-disclaimer]").textContent = authState.client
      ? "登入後可輸入邀請代碼加入真人房間；未設定服務時則只顯示本機預覽。"
      : "尚未設定真人服務時，加入代碼只會展示本機預覽。";

    message.textContent = status;
    panel.setAttribute("aria-busy", String(authState.busy));
    anonymousButton.disabled = !authState.client || authState.busy || Boolean(user);
    anonymousButton.textContent = user
      ? (isAnonymousUser(user) ? "已匿名登入" : "已有帳號登入")
      : "匿名登入";
    signOutButton.classList.toggle("hidden", !user);
    signOutButton.disabled = authState.busy;
    deleteAccountButton.classList.toggle("hidden", !user);
    deleteAccountButton.disabled = authState.busy || !accountDeletionEnabled;
    deleteAccountNote.classList.toggle("hidden", !user);
    deleteAccountNote.textContent = accountDeletionEnabled
      ? "刪除會移除帳號、個人歷史及封鎖清單；已送出的檢舉會去除帳號連結，說明最多保留 180 天。"
      : "自助刪除尚未部署到 Supabase；完成 Edge Function 設定後才會啟用。";

    $$("[data-auth-provider]").forEach((button) => {
      const name = button.dataset.authProvider;
      const provider = configuredAuthProvider(name);
      const identities = user?.identities || [];
      const linked = identities.some((identity) => identity.provider === provider || identity.provider === name);
      button.disabled = !authState.client || !provider || authState.busy || linked;
      button.textContent = linked
        ? `${authProviderLabels[name]} 已連結`
        : user
          ? `連結 ${authProviderLabels[name]}`
          : `使用 ${authProviderLabels[name]} 登入`;
    });
  }

  function getAuthRedirectUrl() {
    const isLocalHttp = window.location.protocol === "http:" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (window.location.protocol !== "https:" && !isLocalHttp) {
      throw new Error("Auth redirects require HTTPS or localhost.");
    }
    return `${window.location.origin}${window.location.pathname}`;
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
      if (authState.session?.user?.id) await restoreMyActiveRoom();
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
      authState.notice = "匿名登入完成。可建立或加入真人邀請房；連結社群身分可保留帳號及歷史紀錄。";
    } catch (error) {
      console.warn("Anonymous sign-in failed", error);
      authState.notice = "匿名登入沒有完成。請確認 Supabase 已啟用 Anonymous Auth 後再試。";
    } finally {
      authState.busy = false;
      refreshAuthPanel();
    }
  }

  async function signInOrLinkProvider(name) {
    const provider = configuredAuthProvider(name);
    if (!authState.client || !provider || authState.busy) return;
    authState.busy = true;
    authState.notice = `正在連接 ${authProviderLabels[name]}…`;
    refreshAuthPanel();
    try {
      const options = { provider, options: { redirectTo: getAuthRedirectUrl() } };
      const result = authState.session
        ? await authState.client.auth.linkIdentity(options)
        : await authState.client.auth.signInWithOAuth(options);
      if (result.error) throw result.error;
      authState.notice = authState.session
        ? `正在連結 ${authProviderLabels[name]}；完成後會返回此頁。`
        : `正在前往 ${authProviderLabels[name]} 登入；完成後會返回此頁。`;
    } catch (error) {
      console.warn("Social sign-in or identity linking failed", error);
      authState.notice = "登入沒有完成。請確認該 provider 已在 Supabase 啟用，且回呼網址設定正確。";
    } finally {
      authState.busy = false;
      refreshAuthPanel();
    }
  }

  async function signOut() {
    if (!authState.client || authState.busy) return;
    if (isAnonymousUser(authState.session?.user) && !window.confirm("這是尚未連結社群身分的匿名帳號。登出後可能無法找回，仍要登出嗎？")) return;
    authState.busy = true;
    authState.notice = "正在登出…";
    refreshAuthPanel();
    try {
      const { error } = await authState.client.auth.signOut();
      if (error) throw error;
      authState.session = null;
      authState.notice = "已登出。重新登入後可查詢這個帳號的真人對局紀錄。";
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
      authState.notice = "帳號刪除沒有完成。請確認 Supabase 已部署刪除帳號函式並設定允許的網站來源。";
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
  $$("[data-auth-provider]").forEach((button) => {
    button.addEventListener("click", () => signInOrLinkProvider(button.dataset.authProvider));
  });
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

  $("[data-start-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    startMatching("demo");
  });

  $("[data-demo-start]").addEventListener("click", () => startMatching("demo"));
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
      joinDemoRoom();
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
    if (state.questionIndex + 1 < questionBank[state.topic].length) {
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

  $("[data-play-again]").addEventListener("click", () => startMatching("demo"));
  $("[data-share-result]").addEventListener("click", shareResult);
  $("[data-download-result]").addEventListener("click", downloadShareCard);

  $$("[data-show-help]").forEach((button) => {
    button.addEventListener("click", () => modal.showModal());
  });
  $$("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => modal.close());
  });

  showView("home");
  initializeSupabaseAuth();
})();
