import pg from "npm:pg@8.13.3";

const { Client } = pg;
type PgClient = InstanceType<typeof Client>;

const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for the PostgreSQL concurrency test",
  );
}
const databaseHost = new URL(databaseUrl).hostname;
if (!new Set(["localhost", "127.0.0.1", "::1"]).has(databaseHost)) {
  throw new Error(
    "The PostgreSQL concurrency test only runs against a loopback database",
  );
}

const users = {
  host: "00000000-0000-4000-8000-000000000201",
  guest: "00000000-0000-4000-8000-000000000202",
  quota: "00000000-0000-4000-8000-000000000203",
  cancelTarget: "00000000-0000-4000-8000-000000000204",
  cancelMatcher: "00000000-0000-4000-8000-000000000205",
};

async function connect(applicationName: string) {
  const client = new Client({
    connectionString: databaseUrl,
    application_name: applicationName,
  });
  await client.connect();
  return client;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

async function applyMigrations(admin: PgClient) {
  await admin.query(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid()
      returns uuid
      language sql
      stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);

  const filenames: string[] = [];
  for await (
    const entry of Deno.readDir(new URL("../migrations/", import.meta.url))
  ) {
    if (entry.isFile && entry.name.endsWith(".sql")) filenames.push(entry.name);
  }
  filenames.sort();
  assert(filenames.length > 0, "at least one SQL migration must exist");

  for (const filename of filenames) {
    const path = new URL(`../migrations/${filename}`, import.meta.url);
    await admin.query(await Deno.readTextFile(path));
  }
}

async function setAuthenticatedUser(client: PgClient, userId: string) {
  await client.query("begin");
  await client.query("set local role authenticated");
  await client.query(
    "select set_config('request.jwt.claim.sub', $1, true)",
    [userId],
  );
}

async function waitForLock(
  admin: PgClient,
  applicationName: string,
  expectedWaitEvent: string,
  isRequestFinished: () => boolean,
) {
  let waitingForLock = false;
  const deadline = Date.now() + 10000;
  while (
    !waitingForLock && !isRequestFinished() && Date.now() < deadline
  ) {
    const activity = await admin.query<{
      wait_event_type: string | null;
      wait_event: string | null;
    }>(
      `
      select wait_event_type, wait_event
      from pg_stat_activity
      where application_name = $1
        and state = 'active'
    `,
      [applicationName],
    );
    waitingForLock = activity.rows.some((row: {
      wait_event_type: string | null;
      wait_event: string | null;
    }) =>
      row.wait_event_type === "Lock" && row.wait_event === expectedWaitEvent
    );
    if (!waitingForLock && !isRequestFinished()) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  assert(
    waitingForLock,
    `${applicationName} must wait on the ${expectedWaitEvent} lock`,
  );
}

Deno.test("matchmaking, moderation claims, cancellation, block, and quota races preserve ordering", async () => {
  const admin = await connect("block-race-admin");
  let blocker: PgClient | null = null;
  let matcher: PgClient | null = null;
  let quotaCreator: PgClient | null = null;
  let quotaWaiter: PgClient | null = null;
  let ticketQuotaHolder: PgClient | null = null;
  let ticketQuotaWaiter: PgClient | null = null;
  let canceler: PgClient | null = null;
  let cancelMatchmaker: PgClient | null = null;
  let blockerTransactionOpen = false;
  let matcherTransactionOpen = false;
  let quotaCreatorTransactionOpen = false;
  let quotaWaiterTransactionOpen = false;
  let ticketQuotaHolderTransactionOpen = false;
  let ticketQuotaWaiterTransactionOpen = false;
  let cancelerTransactionOpen = false;
  let cancelMatchmakerTransactionOpen = false;
  let requestPromise: ReturnType<PgClient["query"]> | null = null;
  let quotaRequestPromise: ReturnType<PgClient["query"]> | null = null;
  let ticketQuotaRequestPromise: ReturnType<PgClient["query"]> | null = null;
  let matchingRaceCancelPromise: ReturnType<PgClient["query"]> | null = null;

  try {
    await applyMigrations(admin);
    await admin.query(
      "insert into auth.users (id) values ($1), ($2), ($3), ($4), ($5)",
      [
        users.host,
        users.guest,
        users.quota,
        users.cancelTarget,
        users.cancelMatcher,
      ],
    );

    for (let room = 0; room < 5; room += 1) {
      await admin.query(
        `
        insert into public.game_rooms (topic_key, status, created_by)
        values ('daily', 'completed', $1)
      `,
        [users.quota],
      );
    }

    quotaCreator = await connect("invite-quota-holder");
    quotaWaiter = await connect("invite-quota-waiter");
    await setAuthenticatedUser(quotaCreator, users.quota);
    quotaCreatorTransactionOpen = true;
    const createdRoom = await quotaCreator.query<{
      response: { status: string; room_id: string };
    }>("select public.create_invite_room($1, $2) as response", [
      "daily",
      "Quota",
    ]);
    assertEquals(
      createdRoom.rows[0].response.status,
      "waiting",
      "the sixth room within the quota is allowed",
    );
    const closedRoom = await quotaCreator.query<{
      response: { status: string };
    }>("select public.leave_room($1::uuid) as response", [
      createdRoom.rows[0].response.room_id,
    ]);
    assertEquals(
      closedRoom.rows[0].response.status,
      "abandoned",
      "the created room is closed before testing the next request",
    );

    await setAuthenticatedUser(quotaWaiter, users.quota);
    quotaWaiterTransactionOpen = true;
    let quotaRequestFinished = false;
    quotaRequestPromise = quotaWaiter.query(
      "select public.create_invite_room($1, $2) as response",
      ["daily", "Quota"],
    ).finally(() => {
      quotaRequestFinished = true;
    });
    let quotaError: unknown = null;
    const quotaRequestSettled = quotaRequestPromise.catch((error: unknown) => {
      quotaError = error;
    });
    await waitForLock(
      admin,
      "invite-quota-waiter",
      "advisory",
      () => quotaRequestFinished,
    );

    await quotaCreator.query("commit");
    quotaCreatorTransactionOpen = false;
    await quotaRequestSettled;
    await quotaWaiter.query("rollback");
    quotaWaiterTransactionOpen = false;
    assert(
      quotaError instanceof Error &&
        quotaError.message.includes("Invite room rate limit reached"),
      "a concurrent invite request must not exceed the account room limit",
    );
    const quotaRoomCount = await admin.query<{ count: string }>(
      "select count(*)::text as count from public.game_rooms where created_by = $1",
      [users.quota],
    );
    assertEquals(
      quotaRoomCount.rows[0].count,
      "6",
      "the concurrent request does not create a seventh room",
    );

    for (let ticket = 0; ticket < 11; ticket += 1) {
      await admin.query(
        `
        insert into public.matchmaking_queue (
          user_id, topic_choice, nickname, status
        ) values ($1, 'travel', 'Quota', 'cancelled')
      `,
        [users.quota],
      );
    }

    ticketQuotaHolder = await connect("matchmaking-quota-holder");
    ticketQuotaWaiter = await connect("matchmaking-quota-waiter");
    await setAuthenticatedUser(ticketQuotaHolder, users.quota);
    ticketQuotaHolderTransactionOpen = true;
    const createdTicket = await ticketQuotaHolder.query<{
      response: { status: string; ticket_id: string };
    }>("select public.queue_for_match($1, $2) as response", [
      "travel",
      "Quota",
    ]);
    assertEquals(
      createdTicket.rows[0].response.status,
      "waiting",
      "the twelfth matchmaking ticket within the quota is allowed",
    );
    const cancelledTicket = await ticketQuotaHolder.query<{
      response: { status: string };
    }>("select public.cancel_matchmaking($1::uuid) as response", [
      createdTicket.rows[0].response.ticket_id,
    ]);
    assertEquals(
      cancelledTicket.rows[0].response.status,
      "cancelled",
      "the ticket is cancelled before the next request",
    );

    await setAuthenticatedUser(ticketQuotaWaiter, users.quota);
    ticketQuotaWaiterTransactionOpen = true;
    let ticketQuotaRequestFinished = false;
    ticketQuotaRequestPromise = ticketQuotaWaiter.query(
      "select public.queue_for_match($1, $2) as response",
      ["travel", "Quota"],
    ).finally(() => {
      ticketQuotaRequestFinished = true;
    });
    let ticketQuotaError: unknown = null;
    const ticketQuotaRequestSettled = ticketQuotaRequestPromise.catch((
      error: unknown,
    ) => {
      ticketQuotaError = error;
    });
    await waitForLock(
      admin,
      "matchmaking-quota-waiter",
      "advisory",
      () => ticketQuotaRequestFinished,
    );

    await ticketQuotaHolder.query("commit");
    ticketQuotaHolderTransactionOpen = false;
    await ticketQuotaRequestSettled;
    await ticketQuotaWaiter.query("rollback");
    ticketQuotaWaiterTransactionOpen = false;
    assert(
      ticketQuotaError instanceof Error &&
        ticketQuotaError.message.includes("Matchmaking rate limit reached"),
      "a concurrent queue request must not exceed the account ticket limit",
    );
    const quotaTicketCount = await admin.query<{ count: string }>(
      `
      select count(*)::text as count
      from public.matchmaking_queue
      where user_id = $1
        and created_at > clock_timestamp() - interval '10 minutes'
    `,
      [users.quota],
    );
    assertEquals(
      quotaTicketCount.rows[0].count,
      "12",
      "the concurrent request does not create a thirteenth ticket",
    );

    await quotaCreator.end();
    await quotaWaiter.end();
    quotaCreator = null;
    quotaWaiter = null;
    await ticketQuotaHolder.end();
    await ticketQuotaWaiter.end();
    ticketQuotaHolder = null;
    ticketQuotaWaiter = null;

    const cancellationWonTicket = await admin.query<{ id: string }>(
      `
      insert into public.matchmaking_queue (user_id, topic_choice, nickname)
      values ($1, 'travel', 'Cancel first')
      returning id
    `,
      [users.cancelTarget],
    );
    canceler = await connect("cancel-race-canceler");
    cancelMatchmaker = await connect("cancel-race-matcher");
    await setAuthenticatedUser(canceler, users.cancelTarget);
    cancelerTransactionOpen = true;
    const cancellation = await canceler.query<{
      response: { status: string };
    }>("select public.cancel_matchmaking($1::uuid) as response", [
      cancellationWonTicket.rows[0].id,
    ]);
    assertEquals(
      cancellation.rows[0].response.status,
      "cancelled",
      "the waiting player can cancel before a match starts",
    );

    await setAuthenticatedUser(cancelMatchmaker, users.cancelMatcher);
    cancelMatchmakerTransactionOpen = true;
    const unpaired = await cancelMatchmaker.query<{
      response: { status: string; ticket_id: string };
    }>("select public.queue_for_match($1, $2) as response", [
      "travel",
      "Cancel racer",
    ]);
    assertEquals(
      unpaired.rows[0].response.status,
      "waiting",
      "matchmaking skips a ticket locked by a cancellation",
    );
    const cancelledMatcherTicket = await cancelMatchmaker.query<{
      response: { status: string };
    }>("select public.cancel_matchmaking($1::uuid) as response", [
      unpaired.rows[0].response.ticket_id,
    ]);
    assertEquals(
      cancelledMatcherTicket.rows[0].response.status,
      "cancelled",
      "the unmatched requester can leave the queue",
    );
    await canceler.query("commit");
    cancelerTransactionOpen = false;
    await cancelMatchmaker.query("commit");
    cancelMatchmakerTransactionOpen = false;

    const matchingWonTicket = await admin.query<{ id: string }>(
      `
      insert into public.matchmaking_queue (user_id, topic_choice, nickname)
      values ($1, 'travel', 'Match first')
      returning id
    `,
      [users.cancelTarget],
    );
    await setAuthenticatedUser(cancelMatchmaker, users.cancelMatcher);
    cancelMatchmakerTransactionOpen = true;
    const matched = await cancelMatchmaker.query<{
      response: { status: string };
    }>("select public.queue_for_match($1, $2) as response", [
      "travel",
      "Match racer",
    ]);
    assertEquals(
      matched.rows[0].response.status,
      "matched",
      "the matcher claims the candidate ticket first",
    );

    await setAuthenticatedUser(canceler, users.cancelTarget);
    cancelerTransactionOpen = true;
    let matchingRaceCancelFinished = false;
    matchingRaceCancelPromise = canceler.query(
      "select public.cancel_matchmaking($1::uuid) as response",
      [matchingWonTicket.rows[0].id],
    ).finally(() => {
      matchingRaceCancelFinished = true;
    });
    let matchingRaceCancelError: unknown = null;
    const matchingRaceCancelSettled = matchingRaceCancelPromise.catch((
      error: unknown,
    ) => {
      matchingRaceCancelError = error;
    });
    await waitForLock(
      admin,
      "cancel-race-canceler",
      "transactionid",
      () => matchingRaceCancelFinished,
    );
    await cancelMatchmaker.query("commit");
    cancelMatchmakerTransactionOpen = false;
    await matchingRaceCancelSettled;
    assertEquals(
      matchingRaceCancelError,
      null,
      "cancellation completes after the match row is released",
    );
    const cancellationAfterMatch = await matchingRaceCancelPromise;
    assertEquals(
      cancellationAfterMatch.rows[0].response.status,
      "matched",
      "a cancellation waiting behind a match reports the matched state",
    );
    await canceler.query("commit");
    cancelerTransactionOpen = false;
    await cancelMatchmaker.end();
    await canceler.end();
    cancelMatchmaker = null;
    canceler = null;

    const roomResult = await admin.query<{ id: string }>(
      `
      insert into public.game_rooms (topic_key, status, created_by)
      values ('travel', 'completed', $1)
      returning id
    `,
      [users.host],
    );
    const roomId = roomResult.rows[0].id;
    await admin.query(
      `
      insert into public.room_members (room_id, user_id, nickname)
      values ($1, $2, 'Host'), ($1, $3, 'Guest')
    `,
      [roomId, users.host, users.guest],
    );
    await admin.query(
      `
      insert into public.matchmaking_queue (user_id, topic_choice, nickname)
      values ($1, 'travel', 'Host')
    `,
      [users.host],
    );

    blocker = await connect("block-race-blocker");
    matcher = await connect("block-race-matcher");

    await setAuthenticatedUser(blocker, users.guest);
    blockerTransactionOpen = true;
    const blockResult = await blocker.query<{ response: { status: string } }>(
      "select public.block_room_opponent($1::uuid) as response",
      [roomId],
    );
    assertEquals(blockResult.rows[0].response.status, "blocked", "block RPC");

    await setAuthenticatedUser(matcher, users.guest);
    matcherTransactionOpen = true;
    let matchmakingFinished = false;
    requestPromise = matcher.query(
      "select public.queue_for_match($1, $2) as response",
      ["travel", "Guest"],
    ).finally(() => {
      matchmakingFinished = true;
    });

    await waitForLock(
      admin,
      "block-race-matcher",
      "advisory",
      () => matchmakingFinished,
    );

    await blocker.query("commit");
    blockerTransactionOpen = false;
    const matchmakingResult = await requestPromise;
    await matcher.query("commit");
    matcherTransactionOpen = false;
    assertEquals(
      matchmakingResult.rows[0].response.status,
      "waiting",
      "a blocked player is not matched after the block commits",
    );

    await blocker.end();
    await matcher.end();
    blocker = null;
    matcher = null;
    blocker = await connect("block-race-invite-blocker");
    matcher = await connect("block-race-invite-matcher");
    await admin.query("delete from public.player_blocks");

    const inviteRoomResult = await admin.query<{ id: string }>(
      `
      insert into public.game_rooms (topic_key, status, created_by, invite_code)
      values ('travel', 'waiting', $1, 'ABCDEF123456')
      returning id
    `,
      [users.host],
    );
    const inviteRoomId = inviteRoomResult.rows[0].id;
    await admin.query(
      `insert into public.room_members (room_id, user_id, nickname)
       values ($1, $2, 'Host')`,
      [inviteRoomId, users.host],
    );

    await setAuthenticatedUser(blocker, users.guest);
    blockerTransactionOpen = true;
    const inviteBlockResult = await blocker.query<{
      response: { status: string };
    }>("select public.block_room_opponent($1::uuid) as response", [roomId]);
    assertEquals(
      inviteBlockResult.rows[0].response.status,
      "blocked",
      "invite block RPC",
    );

    await setAuthenticatedUser(matcher, users.guest);
    matcherTransactionOpen = true;
    let inviteJoinFinished = false;
    requestPromise = matcher.query(
      "select public.join_invite_room($1, $2) as response",
      ["ABCDEF123456", "Guest"],
    ).finally(() => {
      inviteJoinFinished = true;
    });

    await waitForLock(
      admin,
      "block-race-invite-matcher",
      "advisory",
      () => inviteJoinFinished,
    );
    await blocker.query("commit");
    blockerTransactionOpen = false;

    let inviteJoinError: unknown = null;
    try {
      await requestPromise;
    } catch (error) {
      inviteJoinError = error;
    }
    await matcher.query("rollback");
    matcherTransactionOpen = false;
    assert(
      inviteJoinError instanceof Error &&
        inviteJoinError.message.includes("Room unavailable"),
      "an invite join must be rejected after the block commits",
    );

    const moderationReport = await admin.query<{ id: string }>(
      "insert into public.player_safety_reports (room_id, reporter_user_id, reported_user_id, category, details) values (gen_random_uuid(), $1, $2, 'other', 'Concurrent claim') returning id",
      [users.quota, users.cancelTarget],
    );
    await admin.query(
      "insert into private.moderation_reviewers (reviewer_user_id) values ($1), ($2)",
      [users.host, users.guest],
    );

    const firstReviewer = await connect("moderation-claim-first");
    const secondReviewer = await connect("moderation-claim-second");
    let firstReviewTransactionOpen = false;
    let secondReviewTransactionOpen = false;
    let secondClaimPromise: ReturnType<PgClient["query"]> | null = null;
    try {
      await setAuthenticatedUser(firstReviewer, users.host);
      firstReviewTransactionOpen = true;
      const firstClaim = await firstReviewer.query<{ response: boolean }>(
        "select public.claim_moderation_report($1::uuid) as response",
        [moderationReport.rows[0].id],
      );
      assertEquals(
        firstClaim.rows[0].response,
        true,
        "first reviewer claims the case",
      );

      await setAuthenticatedUser(secondReviewer, users.guest);
      secondReviewTransactionOpen = true;
      let secondClaimFinished = false;
      secondClaimPromise = secondReviewer.query(
        "select public.claim_moderation_report($1::uuid) as response",
        [moderationReport.rows[0].id],
      ).finally(() => {
        secondClaimFinished = true;
      });
      const secondClaimSettled = secondClaimPromise.catch(() => undefined);
      await waitForLock(
        admin,
        "moderation-claim-second",
        "transactionid",
        () => secondClaimFinished,
      );

      await firstReviewer.query("commit");
      firstReviewTransactionOpen = false;
      await secondClaimSettled;
      const secondClaim = await secondClaimPromise;
      await secondReviewer.query("commit");
      secondReviewTransactionOpen = false;
      assertEquals(
        secondClaim.rows[0].response,
        false,
        "a concurrent reviewer cannot take an active assignment",
      );
      const assignedReport = await admin.query<{
        status: string;
        assigned_reviewer_id: string;
      }>(
        "select status, assigned_reviewer_id from public.player_safety_reports where id = $1",
        [moderationReport.rows[0].id],
      );
      assertEquals(
        assignedReport.rows[0].status,
        "reviewing",
        "case is claimed once",
      );
      assertEquals(
        assignedReport.rows[0].assigned_reviewer_id,
        users.host,
        "the first reviewer remains assigned after the competing claim",
      );
    } finally {
      if (firstReviewTransactionOpen) {
        await firstReviewer.query("rollback").catch(() => undefined);
      }
      if (secondClaimPromise) {
        await secondClaimPromise.catch(() => undefined);
      }
      if (secondReviewTransactionOpen) {
        await secondReviewer.query("rollback").catch(() => undefined);
      }
      await Promise.all([firstReviewer.end(), secondReviewer.end()]);
    }
  } finally {
    if (quotaCreatorTransactionOpen && quotaCreator) {
      await quotaCreator.query("rollback").catch(() => undefined);
    }
    if (quotaWaiterTransactionOpen && quotaWaiter) {
      await quotaWaiter.query("rollback").catch(() => undefined);
    }
    if (ticketQuotaHolderTransactionOpen && ticketQuotaHolder) {
      await ticketQuotaHolder.query("rollback").catch(() => undefined);
    }
    if (ticketQuotaWaiterTransactionOpen && ticketQuotaWaiter) {
      await ticketQuotaWaiter.query("rollback").catch(() => undefined);
    }
    if (cancelerTransactionOpen && canceler) {
      await canceler.query("rollback").catch(() => undefined);
    }
    if (cancelMatchmakerTransactionOpen && cancelMatchmaker) {
      await cancelMatchmaker.query("rollback").catch(() => undefined);
    }
    if (blockerTransactionOpen && blocker) {
      await blocker.query("rollback").catch(() => undefined);
    }
    if (quotaRequestPromise) {
      await quotaRequestPromise.catch(() => undefined);
    }
    if (ticketQuotaRequestPromise) {
      await ticketQuotaRequestPromise.catch(() => undefined);
    }
    if (matchingRaceCancelPromise) {
      await matchingRaceCancelPromise.catch(() => undefined);
    }
    if (requestPromise) {
      await requestPromise.catch(() => undefined);
    }
    if (matcherTransactionOpen && matcher) {
      await matcher.query("rollback").catch(() => undefined);
    }
    await Promise.all([
      quotaCreator?.end(),
      quotaWaiter?.end(),
      ticketQuotaHolder?.end(),
      ticketQuotaWaiter?.end(),
      canceler?.end(),
      cancelMatchmaker?.end(),
      blocker?.end(),
      matcher?.end(),
      admin.end(),
    ]);
  }
});
