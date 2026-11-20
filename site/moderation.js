(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const config = window.SAMEWAVE_SUPABASE_CONFIG || {};
  const providerLabels = { google: "Google", facebook: "Facebook", x: "X", instagram: "Instagram", threads: "Threads" };
  const categories = {
    harassment: "騷擾或不當聯絡",
    hate: "仇恨或歧視內容",
    sexual_content: "色情或性騷擾內容",
    spam: "垃圾訊息或詐騙",
    other: "其他"
  };
  const statuses = {
    pending: "待處理",
    reviewing: "審查中",
    actioned: "已採取處置",
    dismissed: "不需處理"
  };
  const pageSize = 50;

  const state = {
    client: null,
    session: null,
    reviewer: false,
    busy: false,
    queueRows: [],
    hasMore: false,
    activeReportId: null,
    activeReport: null,
    pendingResolution: null,
    authRequestId: 0,
    queueRequestId: 0,
    detailRequestId: 0
  };

  const elements = {
    authStatus: $("[data-auth-status]"),
    providerActions: $$("[data-auth-provider]"),
    signOut: $("[data-auth-signout]"),
    reviewApp: $("[data-review-app]"),
    statusFilter: $("[data-status-filter]"),
    queueStatus: $("[data-queue-status]"),
    reportList: $("[data-report-list]"),
    loadMore: $("[data-load-more]"),
    refreshQueue: $("[data-refresh-queue]"),
    caseEmpty: $("[data-case-empty]"),
    caseContent: $("[data-case-content]"),
    caseFields: [
      $("[data-case-id]"),
      $("[data-case-category]"),
      $("[data-case-status]"),
      $("[data-case-created]"),
      $("[data-case-room]"),
      $("[data-case-reporter]"),
      $("[data-case-reported]"),
      $("[data-case-assignee]"),
      $("[data-case-details]")
    ],
    caseTitle: $("#case-title"),
    caseActionStatus: $("[data-case-action-status]"),
    claimCase: $("[data-claim-case]"),
    resolveButtons: $$("[data-resolve]"),
    confirmDialog: $("[data-confirm-dialog]"),
    confirmTitle: $("[data-confirm-title]"),
    confirmCopy: $("[data-confirm-copy]"),
    confirmButton: $("[data-confirm-resolution]"),
    cancelButton: $("[data-cancel-resolution]")
  };

  function configuredProvider(name) {
    const providers = config.providers || {};
    if (name === "x") return providers.x === true ? "twitter" : null;
    if (name === "instagram" || name === "threads") {
      const identifier = typeof providers[name] === "string" ? providers[name].trim() : "";
      return /^custom:[a-z0-9][a-z0-9:-]{0,42}$/.test(identifier) ? identifier : null;
    }
    return providers[name] === true ? name : null;
  }

  function isAnonymous(user) {
    return Boolean(user && (user.is_anonymous === true || user.app_metadata?.provider === "anonymous"));
  }

  function setStatus(message) {
    elements.authStatus.textContent = message;
  }

  function setSensitiveViewVisible(visible) {
    elements.reviewApp.classList.toggle("hidden", !visible);
    if (!visible) clearCase();
  }

  function clearQueue(message = "") {
    state.queueRows = [];
    state.hasMore = false;
    elements.reportList.replaceChildren();
    elements.loadMore.hidden = true;
    elements.queueStatus.textContent = message;
  }

  function clearCase() {
    state.activeReportId = null;
    state.activeReport = null;
    state.detailRequestId += 1;
    state.pendingResolution = null;
    if (elements.confirmDialog.open) elements.confirmDialog.close();
    for (const field of elements.caseFields) field.textContent = "";
    elements.caseEmpty.textContent = "請從左側清單選擇一筆案件。";
    elements.caseEmpty.classList.remove("hidden");
    elements.caseContent.classList.add("hidden");
    elements.caseActionStatus.textContent = "";
  }

  function resetForAccountChange() {
    state.reviewer = false;
    state.authRequestId += 1;
    state.queueRequestId += 1;
    state.busy = false;
    clearQueue();
    setSensitiveViewVisible(false);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "時間無法辨識";
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  function formatStatus(value) {
    return statuses[value] || "未知狀態";
  }

  function renderQueue() {
    elements.reportList.replaceChildren();
    if (!state.queueRows.length) {
      const item = document.createElement("li");
      item.className = "queue-empty";
      item.textContent = "目前沒有符合條件的案件。";
      elements.reportList.append(item);
    } else {
      for (const report of state.queueRows) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "report-row";
        button.dataset.reportId = report.report_id;
        button.setAttribute("aria-current", String(report.report_id === state.activeReportId));
        const title = document.createElement("span");
        title.className = "report-row-title";
        title.textContent = categories[report.category] || "未分類案件";
        const meta = document.createElement("span");
        meta.className = "report-row-meta";
        meta.textContent = formatStatus(report.status) + " · " + formatDate(report.created_at);
        button.append(title, meta);
        item.append(button);
        elements.reportList.append(item);
      }
    }
    elements.loadMore.hidden = !state.hasMore;
  }

  function reportCursor(rows) {
    if (!rows.length) return { createdAt: null, id: null };
    const last = rows[rows.length - 1];
    return { createdAt: last.created_at, id: last.report_id };
  }

  async function loadQueue(options = {}) {
    const append = options.append === true;
    const keepCase = options.keepCase === true;
    if (!state.client || !state.reviewer || state.busy) return;
    const userId = state.session?.user?.id;
    const requestId = ++state.queueRequestId;
    const cursor = append ? reportCursor(state.queueRows) : { createdAt: null, id: null };
    elements.refreshQueue.disabled = true;
    elements.loadMore.disabled = true;
    elements.queueStatus.textContent = append ? "正在載入更多案件…" : "正在載入案件…";

    const { data, error } = await state.client.rpc("list_moderation_reports", {
      p_status: elements.statusFilter.value,
      p_page_size: pageSize + 1,
      p_after_created_at: cursor.createdAt,
      p_after_id: cursor.id
    });

    if (requestId !== state.queueRequestId || state.session?.user?.id !== userId) return;
    elements.refreshQueue.disabled = false;
    elements.loadMore.disabled = false;
    if (error) {
      resetForAccountChange();
      setStatus("無法確認審查權限或讀取佇列。請確認這是已加入審查員名單的帳號，並檢查 Supabase 設定。");
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    const page = rows.slice(0, pageSize);
    state.hasMore = rows.length > pageSize;
    state.queueRows = append ? state.queueRows.concat(page) : page;
    renderQueue();
    elements.queueStatus.textContent = state.queueRows.length
      ? "顯示 " + state.queueRows.length + " 件" + (state.hasMore ? "；還有更多案件" : "")
      : "目前沒有符合條件的案件。";

    if (keepCase && state.activeReportId) {
      await loadCase(state.activeReportId, { focus: false });
    } else if (!keepCase) {
      clearCase();
    }
  }

  async function loadCase(reportId, options = {}) {
    if (!state.client || !state.reviewer || !reportId) return;
    const requestId = ++state.detailRequestId;
    const userId = state.session?.user?.id;
    state.activeReportId = reportId;
    state.activeReport = null;
    state.pendingResolution = null;
    if (elements.confirmDialog.open) elements.confirmDialog.close();
    for (const field of elements.caseFields) field.textContent = "";
    renderQueue();
    elements.caseEmpty.textContent = "正在安全載入案件內容…";
    elements.caseEmpty.classList.remove("hidden");
    elements.caseContent.classList.add("hidden");
    elements.caseActionStatus.textContent = "";

    const { data, error } = await state.client.rpc("get_moderation_report", {
      p_report_id: reportId
    });
    if (requestId !== state.detailRequestId || state.session?.user?.id !== userId) return;
    if (error) {
      state.activeReportId = null;
      elements.caseEmpty.textContent = "無法讀取案件。案件可能已不可用，或目前帳號沒有查看權限。";
      renderQueue();
      return;
    }
    const report = Array.isArray(data) ? data[0] : data;
    if (!report) {
      state.activeReportId = null;
      elements.caseEmpty.textContent = "找不到這筆案件。請重新整理佇列。";
      renderQueue();
      return;
    }

    state.activeReport = report;
    $("[data-case-id]").textContent = report.report_id || "—";
    $("[data-case-category]").textContent = categories[report.category] || "未分類案件";
    $("[data-case-status]").textContent = formatStatus(report.status);
    $("[data-case-created]").textContent = formatDate(report.created_at);
    $("[data-case-room]").textContent = report.room_id || "—";
    $("[data-case-reporter]").textContent = report.reporter_user_id || "帳號已刪除或已匿名化";
    $("[data-case-reported]").textContent = report.reported_user_id || "帳號已刪除或已匿名化";
    $("[data-case-assignee]").textContent = report.assigned_reviewer_id || "尚未指派";
    $("[data-case-details]").textContent = report.details || "未提供補充說明。";

    const isOwner = report.assigned_reviewer_id === userId && report.status === "reviewing";
    elements.claimCase.hidden = !["pending", "reviewing"].includes(report.status) || isOwner;
    elements.claimCase.disabled = state.busy;
    for (const button of elements.resolveButtons) {
      button.hidden = !isOwner;
      button.disabled = state.busy;
    }
    elements.caseEmpty.classList.add("hidden");
    elements.caseContent.classList.remove("hidden");
    if (options.focus !== false) elements.caseTitle.focus({ preventScroll: true });
  }

  async function claimActiveCase() {
    if (!state.activeReportId || !state.reviewer || state.busy) return;
    const reportId = state.activeReportId;
    const userId = state.session?.user?.id;
    state.busy = true;
    elements.claimCase.disabled = true;
    elements.caseActionStatus.textContent = "正在領取案件…";
    const { data, error } = await state.client.rpc("claim_moderation_report", {
      p_report_id: reportId
    });
    state.busy = false;
    if (state.session?.user?.id !== userId || state.activeReportId !== reportId) return;
    if (error || data !== true) {
      elements.caseActionStatus.textContent = "案件目前無法領取，可能已由其他審查員接手。已重新整理案件狀態。";
      await loadQueue({ keepCase: true });
      return;
    }
    elements.caseActionStatus.textContent = "已領取。請檢視案件資料並依核准的處理流程作出結論。";
    await loadQueue({ keepCase: true });
  }

  function openResolutionConfirmation(resolution) {
    if (!state.activeReport || !state.reviewer || state.busy) return;
    state.pendingResolution = resolution;
    const actioned = resolution === "actioned";
    elements.confirmTitle.textContent = actioned ? "記錄已採取處置？" : "記錄不需處理？";
    elements.confirmCopy.textContent = actioned
      ? "這只會記錄案件結論，不會自動封鎖或處分玩家。請確認你已依核准流程完成必要處理。"
      : "這會將案件記錄為不需處理。請確認已檢視案件內容並完成必要紀錄。";
    elements.confirmButton.textContent = actioned ? "確認記錄處置" : "確認不需處理";
    elements.confirmDialog.showModal();
  }

  async function resolveActiveCase() {
    const reportId = state.activeReportId;
    const resolution = state.pendingResolution;
    const userId = state.session?.user?.id;
    if (!reportId || !resolution || !state.reviewer || state.busy) return;
    state.busy = true;
    elements.confirmButton.disabled = true;
    elements.cancelButton.disabled = true;
    elements.caseActionStatus.textContent = "正在記錄案件結論…";
    const { data, error } = await state.client.rpc("resolve_moderation_report", {
      p_report_id: reportId,
      p_resolution: resolution
    });
    state.busy = false;
    elements.confirmButton.disabled = false;
    elements.cancelButton.disabled = false;
    state.pendingResolution = null;
    elements.confirmDialog.close();
    if (state.session?.user?.id !== userId || state.activeReportId !== reportId) return;
    if (error || data !== true) {
      elements.caseActionStatus.textContent = "案件結論沒有保存。請確認此案件仍由你負責，再重新整理後重試。";
      await loadQueue({ keepCase: true });
      return;
    }
    elements.caseActionStatus.textContent = resolution === "actioned"
      ? "已記錄案件處置。玩家不會收到自動訊息，後續請依核准流程處理。"
      : "已記錄不需處理。案件完成時間已保存。";
    await loadQueue({ keepCase: true });
  }

  function refreshAuthControls() {
    for (const button of elements.providerActions) {
      const name = button.dataset.authProvider;
      const provider = configuredProvider(name);
      button.hidden = !provider;
      button.disabled = !state.client || !provider || state.busy;
    }
    elements.signOut.hidden = !state.session;
    elements.signOut.disabled = state.busy;
  }

  async function handleSession(session) {
    const nextUserId = session?.user?.id || null;
    const previousUserId = state.session?.user?.id || null;
    state.session = session || null;
    refreshAuthControls();
    if (nextUserId !== previousUserId) resetForAccountChange();
    const requestId = ++state.authRequestId;

    if (!session?.user) {
      resetForAccountChange();
      setStatus(state.client
        ? "請使用已設定的審查員社群帳號登入。匿名帳號不具審查權限。"
        : "尚未設定 Supabase 服務；審查員登入暫不可用。檢舉資料不會載入此頁。");
      return;
    }
    if (isAnonymous(session.user)) {
      resetForAccountChange();
      setStatus("目前登入的是匿名帳號。請改用核准的審查員社群帳號登入；案件內容仍保持鎖定。");
      return;
    }
    setStatus("正在確認審查員權限…");
    let permissionError = null;
    try {
      const { error } = await state.client.rpc("list_moderation_reports", {
        p_status: "pending",
        p_page_size: 1,
        p_after_created_at: null,
        p_after_id: null
      });
      permissionError = error;
    } catch {
      permissionError = true;
    }
    if (requestId !== state.authRequestId || state.session?.user?.id !== nextUserId) return;
    if (permissionError) {
      resetForAccountChange();
      setStatus("此帳號沒有可用的案件審查權限。請使用已加入審查員名單的帳號，或請管理者檢查設定。");
      return;
    }
    state.reviewer = true;
    setStatus("審查員身分已確認。案件內容只會在你開啟單筆案件時載入，所有存取會留有稽核紀錄。");
    setSensitiveViewVisible(true);
    await loadQueue();
  }

  async function signIn(providerName) {
    const provider = configuredProvider(providerName);
    if (!state.client || !provider || state.busy) return;
    state.busy = true;
    refreshAuthControls();
    setStatus("正在前往 " + providerLabels[providerName] + " 登入…");
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await state.client.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
    state.busy = false;
    refreshAuthControls();
    if (error) {
      console.warn("Reviewer sign-in failed", error);
      setStatus("登入沒有完成。請確認 provider 已在 Supabase 啟用，並已將本頁網址加入 callback allow list。");
    }
  }

  async function signOut() {
    if (!state.client || state.busy) return;
    resetForAccountChange();
    state.busy = true;
    refreshAuthControls();
    setStatus("正在登出審查帳號…");
    const { error } = await state.client.auth.signOut();
    state.busy = false;
    refreshAuthControls();
    if (error) {
      console.warn("Reviewer sign-out failed", error);
      setStatus("登出沒有完成。請確認連線後重試。");
      return;
    }
    setStatus("已登出。案件資料已從此頁面清除。");
  }

  function init() {
    const hasPublicConfig = Boolean(config.url && config.anonKey);
    const hasSdk = typeof window.supabase?.createClient === "function";
    for (const button of elements.providerActions) {
      button.addEventListener("click", () => signIn(button.dataset.authProvider));
    }
    elements.signOut.addEventListener("click", signOut);
    elements.refreshQueue.addEventListener("click", () => loadQueue({ keepCase: Boolean(state.activeReportId) }));
    elements.statusFilter.addEventListener("change", () => loadQueue());
    elements.loadMore.addEventListener("click", () => loadQueue({ append: true, keepCase: true }));
    elements.reportList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-report-id]");
      if (button) loadCase(button.dataset.reportId);
    });
    elements.claimCase.addEventListener("click", claimActiveCase);
    for (const button of elements.resolveButtons) {
      button.addEventListener("click", () => openResolutionConfirmation(button.dataset.resolve));
    }
    elements.confirmButton.addEventListener("click", resolveActiveCase);
    elements.cancelButton.addEventListener("click", () => {
      state.pendingResolution = null;
      elements.confirmDialog.close();
    });
    elements.confirmDialog.addEventListener("cancel", () => {
      state.pendingResolution = null;
    });

    if (!hasPublicConfig) {
      refreshAuthControls();
      setStatus("尚未設定 Supabase 服務；審查員登入暫不可用。檢舉資料不會載入此頁。");
      return;
    }
    if (!hasSdk) {
      refreshAuthControls();
      setStatus("登入元件無法載入。請確認網路連線後重新整理；案件內容仍保持鎖定。");
      return;
    }

    state.client = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    refreshAuthControls();
    state.client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => handleSession(session));
    });
    state.client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setStatus("無法恢復登入狀態。請重新整理或重新登入；案件內容仍保持鎖定。");
        return;
      }
      handleSession(data.session);
    });
  }

  init();
})();
