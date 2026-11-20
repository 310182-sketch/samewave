import { PGlite } from "npm:@electric-sql/pglite@0.3.14";

const users = {
  host: "00000000-0000-4000-8000-000000000101",
  guest: "00000000-0000-4000-8000-000000000102",
  outsider: "00000000-0000-4000-8000-000000000103",
  blocked: "00000000-0000-4000-8000-000000000104",
};

type JsonObject = Record<string, unknown>;

async function getMigrationFiles() {
  const filenames: string[] = [];
  for await (
    const entry of Deno.readDir(
      new URL("../migrations/", import.meta.url),
    )
  ) {
    if (entry.isFile && entry.name.endsWith(".sql")) {
      filenames.push(entry.name);
    }
  }
  filenames.sort();
  assert(filenames.length > 0, "at least one SQL migration must exist");
  return filenames;
}

async function createDatabase() {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(`
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

  for (const filename of await getMigrationFiles()) {
    const path = new URL(`../migrations/${filename}`, import.meta.url);
    await db.exec(await Deno.readTextFile(path));
  }

  return db;
}

async function withUser<T>(
  db: PGlite,
  userId: string,
  callback: () => Promise<T>,
): Promise<T> {
  await db.exec("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [userId],
  );
  await db.exec("set role authenticated");
  try {
    return await callback();
  } finally {
    await db.exec("reset role");
  }
}

async function rpc(
  db: PGlite,
  userId: string,
  sql: string,
  params: unknown[] = [],
): Promise<JsonObject> {
  return await withUser(db, userId, async () => {
    const result = await db.query<{ response: JsonObject }>(sql, params);
    return result.rows[0].response;
  });
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertRejects(
  action: () => Promise<unknown>,
  messagePart: string,
) {
  try {
    await action();
  } catch (error) {
    if (String(error).includes(messagePart)) return;
    throw new Error(
      `Expected error containing "${messagePart}", got: ${error}`,
    );
  }
  throw new Error(`Expected error containing "${messagePart}"`);
}

async function insertUsers(db: PGlite, ids = Object.values(users)) {
  for (const id of ids) {
    await db.query("insert into auth.users (id) values ($1)", [id]);
  }
}

async function createPlayingRoom(db: PGlite) {
  const created = await rpc(
    db,
    users.host,
    "select public.create_invite_room($1, $2) as response",
    ["travel", "Host"],
  );
  assertEquals(created.status, "waiting", "invite room status");
  const joined = await rpc(
    db,
    users.guest,
    "select public.join_invite_room($1, $2) as response",
    [created.invite_code, "Guest"],
  );
  assertEquals(joined.status, "joined", "join room status");
  assertEquals(joined.room_id, created.room_id, "joined room id");
  return {
    roomId: String(created.room_id),
    inviteCode: String(created.invite_code),
  };
}

async function insertHistoryMatch(
  db: PGlite,
  userId: string,
  opponentId: string,
  nickname: string,
  ageDays: number,
  commonAnswers: number,
) {
  const result = await db.query<{ id: string }>(
    `
    insert into public.player_match_history (
      room_id, user_id, opponent_user_id, opponent_nickname,
      topic_key, completed_at, question_count, common_answer_count
    ) values (
      gen_random_uuid(), $1, $2, $3, 'travel',
      clock_timestamp() - ($4::integer * interval '1 day'), 5, $5
    ) returning id
  `,
    [userId, opponentId, nickname, ageDays, commonAnswers],
  );
  return result.rows[0].id;
}

Deno.test("Supabase migrations apply in order and protect private tables", async () => {
  const db = await createDatabase();
  try {
    const result = await db.query<{
      rooms: string | null;
      history: string | null;
      reports: string | null;
      room_rls: boolean;
      history_rls: boolean;
      report_rls: boolean;
      answer_read: boolean;
      report_read: boolean;
      service_report_read: boolean;
      service_report_update: boolean;
      service_report_delete: boolean;
      reviewer_table_read: boolean;
      report_events_read: boolean;
      moderation_list_rpc: string | null;
      moderation_list_authenticated_execute: boolean;
      moderation_list_anonymous_execute: boolean;
      history_read: boolean;
      history_rpc: string | null;
      active_room_rpc: string | null;
      active_room_authenticated_execute: boolean;
      active_room_anonymous_execute: boolean;
      matchmaking_recovery_rpc: string | null;
      matchmaking_recovery_authenticated_execute: boolean;
      matchmaking_recovery_index: string | null;
      security_definer_count: number;
      security_definer_without_fixed_search_path: number;
      anonymous_security_definer_execute_count: number;
      delete_trigger: string | null;
    }>(`
      select
        to_regclass('public.game_rooms')::text as rooms,
        to_regclass('public.player_match_history')::text as history,
        to_regclass('public.player_safety_reports')::text as reports,
        (select relrowsecurity from pg_class where oid = 'public.game_rooms'::regclass) as room_rls,
        (select relrowsecurity from pg_class where oid = 'public.player_match_history'::regclass) as history_rls,
        (select relrowsecurity from pg_class where oid = 'public.player_safety_reports'::regclass) as report_rls,
        has_table_privilege('authenticated', 'public.game_answers', 'select') as answer_read,
        has_table_privilege('authenticated', 'public.player_safety_reports', 'select') as report_read,
        has_table_privilege('service_role', 'public.player_safety_reports', 'select') as service_report_read,
        has_table_privilege('service_role', 'public.player_safety_reports', 'update') as service_report_update,
        has_table_privilege('service_role', 'public.player_safety_reports', 'delete') as service_report_delete,
        has_table_privilege('authenticated', 'private.moderation_reviewers', 'select') as reviewer_table_read,
        has_table_privilege('authenticated', 'private.player_safety_report_events', 'select') as report_events_read,
        to_regprocedure('public.list_moderation_reports(text,integer,timestamp with time zone,uuid)')::text as moderation_list_rpc,
        has_function_privilege('authenticated', 'public.list_moderation_reports(text,integer,timestamp with time zone,uuid)', 'execute') as moderation_list_authenticated_execute,
        has_function_privilege('anon', 'public.list_moderation_reports(text,integer,timestamp with time zone,uuid)', 'execute') as moderation_list_anonymous_execute,
        has_table_privilege('authenticated', 'public.player_match_history', 'select') as history_read,
        to_regprocedure('public.get_my_match_history(integer,timestamp with time zone,uuid)')::text as history_rpc,
        to_regprocedure('public.get_my_active_room()')::text as active_room_rpc,
        has_function_privilege('authenticated', 'public.get_my_active_room()', 'execute') as active_room_authenticated_execute,
        has_function_privilege('anon', 'public.get_my_active_room()', 'execute') as active_room_anonymous_execute,
        to_regprocedure('public.get_my_matchmaking_ticket()')::text as matchmaking_recovery_rpc,
        has_function_privilege('authenticated', 'public.get_my_matchmaking_ticket()', 'execute') as matchmaking_recovery_authenticated_execute,
        to_regclass('public.matchmaking_queue_by_user_active_recent')::text as matchmaking_recovery_index,
        (
          select count(*)::integer
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname in ('public', 'private')
            and p.prosecdef
        ) as security_definer_count,
        (
          select count(*)::integer
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname in ('public', 'private')
            and p.prosecdef
            and not ('search_path=""' = any(coalesce(p.proconfig, array[]::text[])))
        ) as security_definer_without_fixed_search_path,
        (
          select count(*)::integer
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname in ('public', 'private')
            and p.prosecdef
            and has_function_privilege('anon', p.oid, 'execute')
        ) as anonymous_security_definer_execute_count,
        (select tgname from pg_trigger where tgname = 'auth_users_close_rooms_before_delete') as delete_trigger
    `);
    const row = result.rows[0];
    assertEquals(row.rooms, "game_rooms", "game room table");
    assertEquals(row.history, "player_match_history", "history table");
    assertEquals(row.reports, "player_safety_reports", "safety report table");
    assertEquals(row.room_rls, true, "room row level security");
    assertEquals(row.history_rls, true, "history row level security");
    assertEquals(row.report_rls, true, "report row level security");
    assertEquals(row.answer_read, false, "direct answer table access");
    assertEquals(row.report_read, false, "direct report table access");
    assertEquals(
      row.service_report_read,
      false,
      "service role must use audited moderation RPCs",
    );
    assertEquals(
      row.service_report_update,
      false,
      "service role cannot bypass moderation audit",
    );
    assertEquals(
      row.reviewer_table_read,
      false,
      "reviewer allowlist is private",
    );
    assertEquals(
      row.report_events_read,
      false,
      "review audit events are private",
    );
    assert(row.moderation_list_rpc, "moderation queue RPC is installed");
    assertEquals(
      row.moderation_list_authenticated_execute,
      true,
      "authenticated role can call reviewer-gated queue RPC",
    );
    assertEquals(
      row.moderation_list_anonymous_execute,
      false,
      "anonymous role cannot call moderation queue RPC",
    );
    assertEquals(row.history_read, false, "direct history table access");
    assert(row.history_rpc, "history RPC is installed");
    assert(row.active_room_rpc, "active room recovery RPC is installed");
    assertEquals(
      row.active_room_authenticated_execute,
      true,
      "authenticated player can recover their active room",
    );
    assertEquals(
      row.active_room_anonymous_execute,
      false,
      "anonymous role cannot recover an active room",
    );
    assert(
      row.matchmaking_recovery_rpc,
      "matchmaking ticket recovery RPC is installed",
    );
    assertEquals(
      row.matchmaking_recovery_authenticated_execute,
      true,
      "authenticated player can recover their matchmaking ticket",
    );
    assertEquals(
      row.matchmaking_recovery_index,
      "matchmaking_queue_by_user_active_recent",
      "active matchmaking tickets can be looked up by owner",
    );
    assert(
      row.security_definer_count > 0,
      "security-definer functions are installed",
    );
    assertEquals(
      row.security_definer_without_fixed_search_path,
      0,
      "all application security-definer functions pin an empty search path",
    );
    assertEquals(
      row.anonymous_security_definer_execute_count,
      0,
      "anonymous role cannot execute application security-definer functions",
    );
    assertEquals(
      row.delete_trigger,
      "auth_users_close_rooms_before_delete",
      "account deletion cleanup trigger",
    );
  } finally {
    await db.close();
  }
});

Deno.test("active room recovery only returns the caller's waiting or playing room", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    const created = await rpc(
      db,
      users.host,
      "select public.create_invite_room($1, $2) as response",
      ["travel", "Host"],
    );
    const { room_id: roomId, invite_code: inviteCode } = created;

    const guestWithoutRoom = await rpc(
      db,
      users.guest,
      "select public.get_my_active_room() as response",
    );
    assertEquals(
      guestWithoutRoom.status,
      "none",
      "another player cannot discover the host room",
    );

    const hostWaitingRoom = await rpc(
      db,
      users.host,
      "select public.get_my_active_room() as response",
    );
    assertEquals(
      hostWaitingRoom.room_id,
      roomId,
      "host's waiting room is restored",
    );
    assertEquals(
      hostWaitingRoom.status,
      "waiting",
      "waiting state is restored",
    );
    assertEquals(
      hostWaitingRoom.invite_code,
      inviteCode,
      "host can recover their invite code",
    );
    assertEquals(
      hostWaitingRoom.created_by,
      true,
      "host is identified as creator",
    );
    assertEquals(
      hostWaitingRoom.nickname,
      "Host",
      "own room nickname is returned",
    );
    assertEquals(
      hostWaitingRoom.opponent_nickname,
      null,
      "no opponent is exposed before joining",
    );

    await rpc(
      db,
      users.guest,
      "select public.join_invite_room($1, $2) as response",
      [inviteCode, "Guest"],
    );
    const hostPlayingRoom = await rpc(
      db,
      users.host,
      "select public.get_my_active_room() as response",
    );
    const guestPlayingRoom = await rpc(
      db,
      users.guest,
      "select public.get_my_active_room() as response",
    );
    assertEquals(
      hostPlayingRoom.status,
      "playing",
      "host recovers a playing room",
    );
    assertEquals(
      guestPlayingRoom.room_id,
      roomId,
      "guest recovers only their joined room",
    );
    assertEquals(
      guestPlayingRoom.status,
      "playing",
      "guest playing state is restored",
    );
    assertEquals(
      guestPlayingRoom.invite_code,
      null,
      "invite code is hidden after joining",
    );
    assertEquals(
      guestPlayingRoom.opponent_nickname,
      "Host",
      "joined player sees their opponent nickname",
    );
    assertEquals(
      hostPlayingRoom.opponent_nickname,
      "Guest",
      "host sees their joined opponent nickname",
    );

    const outsiderWithoutRoom = await rpc(
      db,
      users.outsider,
      "select public.get_my_active_room() as response",
    );
    assertEquals(
      outsiderWithoutRoom.status,
      "none",
      "non-member cannot discover the room by ID",
    );
    await assertRejects(
      () => rpc(db, "", "select public.get_my_active_room() as response"),
      "Authentication required",
    );
  } finally {
    await db.close();
  }
});

Deno.test("matchmaking ticket recovery is private and returns waiting or matched state", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    const guestWithoutTicket = await rpc(
      db,
      users.guest,
      "select public.get_my_matchmaking_ticket() as response",
    );
    assertEquals(
      guestWithoutTicket.status,
      "none",
      "players without a ticket receive an empty status",
    );

    const hostWaiting = await rpc(
      db,
      users.host,
      "select public.queue_for_match($1, $2) as response",
      ["music", "Host"],
    );
    assertEquals(
      hostWaiting.status,
      "waiting",
      "host enters the waiting queue",
    );
    const guestStillHasNoTicket = await rpc(
      db,
      users.guest,
      "select public.get_my_matchmaking_ticket() as response",
    );
    assertEquals(
      guestStillHasNoTicket.status,
      "none",
      "other players cannot discover the host ticket",
    );

    const recoveredWaiting = await rpc(
      db,
      users.host,
      "select public.get_my_matchmaking_ticket() as response",
    );
    assertEquals(
      recoveredWaiting.status,
      "waiting",
      "waiting ticket status is restored",
    );
    assertEquals(
      recoveredWaiting.ticket_id,
      hostWaiting.ticket_id,
      "the original ticket is restored",
    );
    assertEquals(
      recoveredWaiting.topic_choice,
      "music",
      "ticket topic is restored",
    );
    assertEquals(
      recoveredWaiting.nickname,
      "Host",
      "ticket nickname is restored",
    );

    await db.query(
      "update public.matchmaking_queue set expires_at = clock_timestamp() - interval '1 second' where id = $1",
      [hostWaiting.ticket_id],
    );
    const expired = await rpc(
      db,
      users.host,
      "select public.get_my_matchmaking_ticket() as response",
    );
    assertEquals(
      expired.status,
      "timed_out",
      "an expired ticket is not resumed as waiting",
    );
    const expiredRow = await db.query<{ status: string }>(
      "select status from public.matchmaking_queue where id = $1",
      [hostWaiting.ticket_id],
    );
    assertEquals(
      expiredRow.rows[0].status,
      "timed_out",
      "expired ticket is closed in the database",
    );

    const hostNewTicket = await rpc(
      db,
      users.host,
      "select public.queue_for_match($1, $2) as response",
      ["travel", "Host"],
    );
    assertEquals(
      hostNewTicket.status,
      "waiting",
      "host can start a new queue after timeout",
    );
    const guestMatched = await rpc(
      db,
      users.guest,
      "select public.queue_for_match($1, $2) as response",
      ["travel", "Guest"],
    );
    assertEquals(
      guestMatched.status,
      "matched",
      "guest matches the existing ticket",
    );

    const hostMatchedRecovery = await rpc(
      db,
      users.host,
      "select public.get_my_matchmaking_ticket() as response",
    );
    const guestMatchedRecovery = await rpc(
      db,
      users.guest,
      "select public.get_my_matchmaking_ticket() as response",
    );
    assertEquals(
      hostMatchedRecovery.status,
      "matched",
      "host can recover a recently matched ticket",
    );
    assertEquals(
      guestMatchedRecovery.status,
      "matched",
      "guest can recover their matched ticket",
    );
    assertEquals(
      hostMatchedRecovery.room_id,
      guestMatched.room_id,
      "host is routed to the matched room",
    );
    assertEquals(
      guestMatchedRecovery.room_id,
      guestMatched.room_id,
      "guest is routed to the matched room",
    );
    assertEquals(
      hostMatchedRecovery.opponent_nickname,
      "Guest",
      "host sees only the matched opponent nickname",
    );
    assertEquals(
      guestMatchedRecovery.opponent_nickname,
      "Host",
      "guest sees only the matched opponent nickname",
    );

    await assertRejects(
      () =>
        rpc(db, "", "select public.get_my_matchmaking_ticket() as response"),
      "Authentication required",
    );
  } finally {
    await db.close();
  }
});

Deno.test("two players reveal answers together and receive private history", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    const { roomId } = await createPlayingRoom(db);

    for (let question = 1; question <= 5; question += 1) {
      const hostChoice = question % 2;
      const guestChoice = question === 3 ? 1 - hostChoice : hostChoice;
      const firstAnswer = await rpc(
        db,
        users.host,
        "select public.submit_answer($1::uuid, $2::smallint) as response",
        [roomId, hostChoice],
      );
      assertEquals(
        firstAnswer.reveal,
        false,
        "answer is hidden until both reply",
      );
      assertEquals(
        firstAnswer.your_choice,
        null,
        "private answer stays hidden",
      );
      assertEquals(
        firstAnswer.partner_choice,
        null,
        "partner answer stays hidden",
      );

      await assertRejects(
        () =>
          withUser(db, users.host, async () => {
            await db.query("select choice from public.game_answers");
          }),
        "permission denied",
      );

      const secondAnswer = await rpc(
        db,
        users.guest,
        "select public.submit_answer($1::uuid, $2::smallint) as response",
        [roomId, guestChoice],
      );
      assertEquals(
        secondAnswer.reveal,
        true,
        "answer reveals after both reply",
      );
      assertEquals(
        secondAnswer.your_choice,
        guestChoice,
        "guest sees own answer",
      );
      assertEquals(
        secondAnswer.partner_choice,
        hostChoice,
        "guest sees partner answer",
      );

      const hostReady = await rpc(
        db,
        users.host,
        "select public.continue_room($1::uuid) as response",
        [roomId],
      );
      assertEquals(
        hostReady.status,
        "waiting_for_partner",
        "first player waits",
      );
      const guestReady = await rpc(
        db,
        users.guest,
        "select public.continue_room($1::uuid) as response",
        [roomId],
      );
      assertEquals(
        guestReady.status,
        question === 5 ? "completed" : "advanced",
        "both players advance together",
      );
    }

    const results = await rpc(
      db,
      users.host,
      "select public.get_room_results($1::uuid) as response",
      [roomId],
    );
    assertEquals(results.match_count, 4, "shared answer count");
    assertEquals(
      (results.common_choices as unknown[]).length,
      4,
      "shared answers in results",
    );

    const history = await rpc(
      db,
      users.host,
      "select public.get_my_match_history() as response",
    );
    const items = history.items as JsonObject[];
    assertEquals(items.length, 1, "host history count");
    assertEquals(items[0].common_answer_count, 4, "saved history score");
    assertEquals(items[0].opponent_nickname, "Guest", "saved opponent name");

    const guestHistory = await rpc(
      db,
      users.guest,
      "select public.get_my_match_history() as response",
    );
    assertEquals(
      (guestHistory.items as JsonObject[]).length,
      1,
      "guest only receives own history",
    );

    await assertRejects(
      () =>
        rpc(
          db,
          users.outsider,
          "select public.get_room_state($1::uuid) as response",
          [roomId],
        ),
      "Room not found",
    );
  } finally {
    await db.close();
  }
});

Deno.test("reports are private, deduplicated, and unavailable outside the room", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    const { roomId } = await createPlayingRoom(db);

    const first = await rpc(
      db,
      users.host,
      "select public.submit_player_report($1::uuid, $2, $3) as response",
      [roomId, "other", "Repeated unwanted contact"],
    );
    const duplicate = await rpc(
      db,
      users.host,
      "select public.submit_player_report($1::uuid, $2, $3) as response",
      [roomId, "other", "Second report"],
    );
    assertEquals(first.status, "submitted", "first report status");
    assertEquals(
      duplicate.status,
      "already_submitted",
      "duplicate report status",
    );

    await assertRejects(
      () =>
        rpc(
          db,
          users.outsider,
          "select public.submit_player_report($1::uuid, $2, $3) as response",
          [roomId, "other", "Not a room member"],
        ),
      "Room not found",
    );
    await assertRejects(
      () =>
        withUser(db, users.host, async () => {
          await db.query("select * from public.player_safety_reports");
        }),
      "permission denied",
    );

    const blocked = await rpc(
      db,
      users.host,
      "select public.block_room_opponent($1::uuid) as response",
      [roomId],
    );
    assertEquals(blocked.status, "blocked", "block status");
    const blockedPlayers = await rpc(
      db,
      users.host,
      "select public.get_my_blocked_players() as response",
    );
    const players = blockedPlayers.players as JsonObject[];
    assertEquals(players.length, 1, "block list count");
    assertEquals(players[0].user_id, users.guest, "block list identity");

    await rpc(
      db,
      users.host,
      "select public.leave_room($1::uuid) as response",
      [roomId],
    );
    const guestRoom = await rpc(
      db,
      users.guest,
      "select public.create_invite_room($1, $2) as response",
      ["music", "Guest"],
    );
    await assertRejects(
      () =>
        rpc(
          db,
          users.host,
          "select public.join_invite_room($1, $2) as response",
          [guestRoom.invite_code, "Host"],
        ),
      "Room unavailable",
    );
    const roomMembers = await db.query<{ member_count: number }>(
      "select count(*)::integer as member_count from public.room_members where room_id = $1",
      [guestRoom.room_id],
    );
    assertEquals(
      roomMembers.rows[0].member_count,
      1,
      "blocked player not added",
    );
  } finally {
    await db.close();
  }
});

Deno.test("block writes share matchmaking and invite-join serialization", async () => {
  const db = await createDatabase();
  try {
    const result = await db.query<{ function_name: string; source: string }>(`
      select p.proname as function_name, p.prosrc as source
      from pg_proc p
      where p.oid in (
        'public.block_room_opponent(uuid)'::regprocedure,
        'public.queue_for_match(text,text)'::regprocedure,
        'public.join_invite_room(text,text)'::regprocedure
      )
    `);
    assertEquals(result.rows.length, 3, "all three RPCs are installed");
    for (const fn of result.rows) {
      assert(
        fn.source.includes("pg_catalog.pg_advisory_xact_lock(82420711)"),
        `${fn.function_name} uses the shared transaction lock`,
      );
    }
  } finally {
    await db.close();
  }
});

Deno.test("random matchmaking respects topics, block lists, and cancellation", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    await db.query(
      "insert into public.player_blocks (blocker_user_id, blocked_user_id, blocked_nickname) values ($1, $2, $3)",
      [users.guest, users.blocked, "Blocked"],
    );

    const hostTicket = await rpc(
      db,
      users.host,
      "select public.queue_for_match($1, $2) as response",
      ["travel", "Host"],
    );
    const guestTicket = await rpc(
      db,
      users.guest,
      "select public.queue_for_match($1, $2) as response",
      ["music", "Guest"],
    );
    assertEquals(hostTicket.status, "waiting", "first player waits");
    assertEquals(
      guestTicket.status,
      "waiting",
      "different selected topics do not match",
    );

    const randomMatch = await rpc(
      db,
      users.outsider,
      "select public.queue_for_match($1, $2) as response",
      ["random", "Random"],
    );
    assertEquals(randomMatch.status, "matched", "random player is matched");
    assertEquals(randomMatch.topic_key, "travel", "selected topic is retained");
    assertEquals(
      randomMatch.opponent_nickname,
      "Host",
      "oldest compatible player is selected",
    );

    const hostStatus = await rpc(
      db,
      users.host,
      "select public.get_match_status($1::uuid) as response",
      [hostTicket.ticket_id],
    );
    assertEquals(hostStatus.status, "matched", "host ticket is matched");
    assertEquals(hostStatus.room_id, randomMatch.room_id, "shared room id");

    const blockedQueue = await rpc(
      db,
      users.blocked,
      "select public.queue_for_match($1, $2) as response",
      ["music", "Blocked"],
    );
    assertEquals(
      blockedQueue.status,
      "waiting",
      "mutually blocked players do not match",
    );
    const guestStatus = await rpc(
      db,
      users.guest,
      "select public.get_match_status($1::uuid) as response",
      [guestTicket.ticket_id],
    );
    assertEquals(
      guestStatus.status,
      "waiting",
      "blocked candidate keeps waiting",
    );

    const cancelled = await rpc(
      db,
      users.blocked,
      "select public.cancel_matchmaking($1::uuid) as response",
      [blockedQueue.ticket_id],
    );
    assertEquals(cancelled.status, "cancelled", "waiting ticket is cancelled");
  } finally {
    await db.close();
  }
});

Deno.test("expanded topic catalog supports questions, invite rooms, and live matching", async () => {
  const db = await createDatabase();
  const topicKeys = [
    "entertainment",
    "hobbies",
    "sports",
    "pets",
    "reading",
    "culture",
  ];
  const topicUsers = topicKeys.flatMap((_, index) => {
    const first = String(201 + index * 2).padStart(12, "0");
    const second = String(202 + index * 2).padStart(12, "0");
    return [
      `00000000-0000-4000-8000-${first}`,
      `00000000-0000-4000-8000-${second}`,
    ];
  });

  try {
    await insertUsers(db, [...Object.values(users), ...topicUsers]);
    const catalog = await db.query<{
      topic_key: string;
      question_count: number;
    }>(`
      select topic_key, count(*)::integer as question_count
      from public.question_bank
      group by topic_key
      order by topic_key
    `);
    assertEquals(
      catalog.rows.length,
      10,
      "all ten topic categories are seeded",
    );
    for (const topic of catalog.rows) {
      assertEquals(
        topic.question_count,
        5,
        `${topic.topic_key} has five questions`,
      );
    }

    for (const topicKey of topicKeys) {
      const invitation = await rpc(
        db,
        users.host,
        "select public.create_invite_room($1, $2) as response",
        [topicKey, "Host"],
      );
      assertEquals(
        invitation.status,
        "waiting",
        `${topicKey} invite room is created`,
      );
      assertEquals(
        invitation.topic_key,
        topicKey,
        `${topicKey} invite keeps its topic`,
      );
      await rpc(
        db,
        users.host,
        "select public.leave_room($1::uuid) as response",
        [invitation.room_id],
      );

      const index = topicKeys.indexOf(topicKey) * 2;
      const firstUser = topicUsers[index];
      const secondUser = topicUsers[index + 1];
      const waiting = await rpc(
        db,
        firstUser,
        "select public.queue_for_match($1, $2) as response",
        [topicKey, "First"],
      );
      const matched = await rpc(
        db,
        secondUser,
        "select public.queue_for_match($1, $2) as response",
        [topicKey, "Second"],
      );
      assertEquals(
        waiting.status,
        "waiting",
        `${topicKey} player enters the queue`,
      );
      assertEquals(
        matched.status,
        "matched",
        `${topicKey} players match`,
      );
      assertEquals(
        matched.topic_key,
        topicKey,
        `${topicKey} room keeps its topic`,
      );
    }

    await assertRejects(
      () =>
        rpc(
          db,
          users.blocked,
          "select public.queue_for_match($1, $2) as response",
          ["unsupported", "Player"],
        ),
      "Unsupported topic choice",
    );
  } finally {
    await db.close();
  }
});

Deno.test("blank nicknames use 小芯 across the UI, invite rooms, and matching", async () => {
  const html = await Deno.readTextFile(
    new URL("../../site/index.html", import.meta.url),
  );
  const app = await Deno.readTextFile(
    new URL("../../site/app.js", import.meta.url),
  );
  assert(
    html.includes('placeholder="留空會使用「小芯」"'),
    "nickname placeholder shows the default",
  );
  assert(
    html.includes("data-player-name>小芯<"),
    "game screen starts with the default nickname",
  );
  assert(app.includes('nickname: "小芯"'), "client state uses the default");
  assertEquals(
    (app.match(/\|\| "小芯"/g) ?? []).length,
    2,
    "both client nickname readers use the default",
  );

  const db = await createDatabase();
  try {
    await insertUsers(db);
    const invitation = await rpc(
      db,
      users.host,
      "select public.create_invite_room($1, $2) as response",
      ["travel", "  "],
    );
    const host = await db.query<{ nickname: string }>(
      `select nickname from public.room_members
       where room_id = $1::uuid and user_id = $2::uuid`,
      [invitation.room_id, users.host],
    );
    assertEquals(
      host.rows[0]?.nickname,
      "小芯",
      "blank invite creator nickname uses the default",
    );

    const joined = await rpc(
      db,
      users.guest,
      "select public.join_invite_room($1, $2) as response",
      [invitation.invite_code, ""],
    );
    assertEquals(joined.status, "joined", "blank nickname player joins room");
    const guest = await db.query<{ nickname: string }>(
      `select nickname from public.room_members
       where room_id = $1::uuid and user_id = $2::uuid`,
      [invitation.room_id, users.guest],
    );
    assertEquals(
      guest.rows[0]?.nickname,
      "小芯",
      "blank invite joiner nickname uses the default",
    );

    const queued = await rpc(
      db,
      users.blocked,
      "select public.queue_for_match($1, $2) as response",
      ["travel", "  "],
    );
    assertEquals(queued.status, "waiting", "blank nickname enters queue");
    const ticket = await db.query<{ nickname: string }>(
      `select nickname from public.matchmaking_queue
       where user_id = $1::uuid and status = 'waiting'
       order by created_at desc limit 1`,
      [users.blocked],
    );
    assertEquals(
      ticket.rows[0]?.nickname,
      "小芯",
      "blank matchmaking nickname uses the default",
    );
  } finally {
    await db.close();
  }
});

Deno.test("history cursor and commonality ranking enforce their time and match limits", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    await insertHistoryMatch(db, users.host, users.guest, "Guest oldest", 3, 5);
    await insertHistoryMatch(db, users.host, users.guest, "Guest middle", 2, 0);

    const beforeThreshold = await rpc(
      db,
      users.host,
      "select public.get_my_commonality_ranking() as response",
    );
    assertEquals(
      (beforeThreshold.players as unknown[]).length,
      0,
      "two matches do not meet the ranking threshold",
    );

    await insertHistoryMatch(db, users.host, users.guest, "Guest newest", 1, 4);
    await insertHistoryMatch(
      db,
      users.host,
      users.outsider,
      "Other recent 1",
      4,
      5,
    );
    await insertHistoryMatch(
      db,
      users.host,
      users.outsider,
      "Other recent 2",
      5,
      5,
    );
    await insertHistoryMatch(db, users.host, users.guest, "Expired", 100, 5);

    const ranking = await rpc(
      db,
      users.host,
      "select public.get_my_commonality_ranking() as response",
    );
    const rankedPlayers = ranking.players as JsonObject[];
    assertEquals(
      rankedPlayers.length,
      1,
      "only the three-match opponent ranks",
    );
    assertEquals(
      rankedPlayers[0].opponent_nickname,
      "Guest newest",
      "ranking uses the latest opponent nickname",
    );
    assertEquals(rankedPlayers[0].match_count, 3, "ranking match count");
    assertEquals(
      rankedPlayers[0].common_answer_count,
      9,
      "ranking shared answers",
    );
    assertEquals(rankedPlayers[0].question_count, 15, "ranking answer total");
    assertEquals(
      Number(rankedPlayers[0].commonality_ratio),
      0.6,
      "ranking commonality ratio",
    );

    const firstPage = await rpc(
      db,
      users.host,
      "select public.get_my_match_history($1::integer, $2::timestamptz, $3::uuid) as response",
      [2, null, null],
    );
    const firstItems = firstPage.items as JsonObject[];
    assertEquals(firstItems.length, 2, "first history page size");
    assertEquals(
      firstItems[0].opponent_nickname,
      "Guest newest",
      "history is newest first",
    );

    const secondPage = await rpc(
      db,
      users.host,
      "select public.get_my_match_history($1::integer, $2::timestamptz, $3::uuid) as response",
      [2, firstItems[1].completed_at, firstItems[1].id],
    );
    const secondItems = secondPage.items as JsonObject[];
    assertEquals(secondItems.length, 2, "second history page size");
    assert(
      !firstItems.some((item) => item.id === secondItems[0].id),
      "history cursor does not repeat the boundary row",
    );

    const allRecent = await rpc(
      db,
      users.host,
      "select public.get_my_match_history($1::integer, $2::timestamptz, $3::uuid) as response",
      [50, null, null],
    );
    const recentItems = allRecent.items as JsonObject[];
    assertEquals(
      recentItems.length,
      5,
      "history excludes records older than 90 days",
    );
    assert(
      recentItems.every((item) => item.opponent_nickname !== "Expired"),
      "expired history is not returned",
    );
  } finally {
    await db.close();
  }
});

Deno.test("history RPCs only expose and delete the authenticated player's records", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    const hostHistoryId = await insertHistoryMatch(
      db,
      users.host,
      users.guest,
      "Guest",
      1,
      4,
    );
    const guestHistoryId = await insertHistoryMatch(
      db,
      users.guest,
      users.host,
      "Host",
      1,
      4,
    );

    const hostHistory = await rpc(
      db,
      users.host,
      "select public.get_my_match_history() as response",
    );
    const hostItems = hostHistory.items as JsonObject[];
    assertEquals(hostItems.length, 1, "host receives only one personal record");
    assertEquals(
      hostItems[0].id,
      hostHistoryId,
      "host receives own history row",
    );

    const unauthorizedDelete = await withUser(
      db,
      users.host,
      async () => {
        const result = await db.query<{ response: boolean }>(
          "select public.delete_my_match_history($1::uuid) as response",
          [guestHistoryId],
        );
        return result.rows[0].response;
      },
    );
    assertEquals(
      unauthorizedDelete,
      false,
      "host cannot delete the guest's history row",
    );

    const stillPresent = await rpc(
      db,
      users.guest,
      "select public.get_my_match_history() as response",
    );
    const guestItems = stillPresent.items as JsonObject[];
    assertEquals(
      guestItems.length,
      1,
      "guest's history remains after rejected delete",
    );
    assertEquals(guestItems[0].id, guestHistoryId, "guest retains own row");

    const ownDelete = await withUser(db, users.host, async () => {
      const result = await db.query<{ response: boolean }>(
        "select public.delete_my_match_history($1::uuid) as response",
        [hostHistoryId],
      );
      return result.rows[0].response;
    });
    assertEquals(ownDelete, true, "host can delete own history row");

    const repeatedDelete = await withUser(db, users.host, async () => {
      const result = await db.query<{ response: boolean }>(
        "select public.delete_my_match_history($1::uuid) as response",
        [hostHistoryId],
      );
      return result.rows[0].response;
    });
    assertEquals(
      repeatedDelete,
      false,
      "deleting the same row twice is harmless",
    );

    await assertRejects(
      () =>
        withUser(db, "", async () => {
          await db.query("select public.get_my_match_history() as response");
        }),
      "Authentication required",
    );
  } finally {
    await db.close();
  }
});

Deno.test("retention jobs purge expired data and keep unexpired records", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    const oldHistoryId = await insertHistoryMatch(
      db,
      users.host,
      users.guest,
      "Old history",
      91,
      3,
    );
    const recentHistoryId = await insertHistoryMatch(
      db,
      users.host,
      users.guest,
      "Recent history",
      2,
      4,
    );
    const rawRoom = await db.query<{ id: string }>(
      `
      insert into public.game_rooms (
        topic_key, status, created_by, closed_at, delete_after
      ) values (
        'travel', 'completed', $1, clock_timestamp(),
        clock_timestamp() - interval '25 hours'
      ) returning id
    `,
      [users.host],
    );
    const rawQueue = await db.query<{ id: string }>(
      `
      insert into public.matchmaking_queue (
        user_id, topic_choice, nickname, status, room_id, delete_after
      ) values (
        $1, 'travel', 'Guest', 'cancelled', $2,
        clock_timestamp() - interval '25 hours'
      ) returning id
    `,
      [users.guest, rawRoom.rows[0].id],
    );
    const timedOutQueue = await db.query<{ id: string }>(
      `
      insert into public.matchmaking_queue (
        user_id, topic_choice, nickname, status, expires_at, delete_after
      ) values (
        $1, 'daily', 'Blocked', 'waiting',
        clock_timestamp() - interval '31 seconds',
        clock_timestamp() - interval '25 hours'
      ) returning id
    `,
      [users.blocked],
    );
    await db.query(`
      insert into public.player_safety_reports (
        room_id, category, details, created_at
      ) values
        (gen_random_uuid(), 'other', 'Expired report', clock_timestamp() - interval '181 days'),
        (gen_random_uuid(), 'other', 'Recent report', clock_timestamp() - interval '1 day')
    `);

    await db.query("select private.purge_expired_game_data()");
    const timedOut = await db.query<{ status: string; delete_after: Date }>(
      "select status, delete_after from public.matchmaking_queue where id = $1",
      [timedOutQueue.rows[0].id],
    );
    assertEquals(timedOut.rows[0].status, "timed_out", "expired ticket status");
    const queueCount = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.matchmaking_queue where id = $1",
      [rawQueue.rows[0].id],
    );
    assertEquals(queueCount.rows[0].count, 0, "raw queue data is purged");
    const roomCount = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.game_rooms where id = $1",
      [rawRoom.rows[0].id],
    );
    assertEquals(roomCount.rows[0].count, 0, "raw room data is purged");
    const oldHistoryCount = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.player_match_history where id = $1",
      [oldHistoryId],
    );
    const recentHistoryCount = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.player_match_history where id = $1",
      [recentHistoryId],
    );
    assertEquals(oldHistoryCount.rows[0].count, 0, "90-day history is purged");
    assertEquals(
      recentHistoryCount.rows[0].count,
      1,
      "recent history is retained",
    );

    await db.query("select private.purge_expired_moderation_reports()");
    const reports = await db.query<{ details: string }>(
      "select details from public.player_safety_reports order by details",
    );
    assertEquals(reports.rows.length, 1, "expired moderation report is purged");
    assertEquals(
      reports.rows[0].details,
      "Recent report",
      "recent report is retained",
    );
  } finally {
    await db.close();
  }
});

Deno.test("matchmaking and invite room rate limits enforce their thresholds", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    for (let ticket = 0; ticket < 12; ticket += 1) {
      await db.query(
        `
        insert into public.matchmaking_queue (
          user_id, topic_choice, nickname, status
        ) values ($1, 'travel', 'Host', 'cancelled')
      `,
        [users.host],
      );
    }
    await assertRejects(
      () =>
        db.query(
          `
        insert into public.matchmaking_queue (
          user_id, topic_choice, nickname, status
        ) values ($1, 'travel', 'Host', 'cancelled')
      `,
          [users.host],
        ),
      "Matchmaking rate limit reached",
    );

    for (let room = 0; room < 6; room += 1) {
      await db.query(
        "insert into public.game_rooms (topic_key, status, created_by) values ('daily', 'waiting', $1)",
        [users.guest],
      );
    }
    await assertRejects(
      () =>
        db.query(
          "insert into public.game_rooms (topic_key, status, created_by) values ('daily', 'waiting', $1)",
          [users.guest],
        ),
      "Invite room rate limit reached",
    );
  } finally {
    await db.close();
  }
});

Deno.test("account deletion closes rooms and clears private history identities", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    const { roomId, inviteCode } = await createPlayingRoom(db);
    const hostHistoryId = await insertHistoryMatch(
      db,
      users.host,
      users.guest,
      "Guest snapshot",
      1,
      4,
    );
    const guestHistoryId = await insertHistoryMatch(
      db,
      users.guest,
      users.host,
      "Host snapshot",
      1,
      4,
    );
    await rpc(
      db,
      users.host,
      "select public.submit_player_report($1::uuid, $2, $3) as response",
      [roomId, "other", "Keep the report but remove account links"],
    );
    await rpc(
      db,
      users.guest,
      "select public.submit_player_report($1::uuid, $2, $3) as response",
      [roomId, "other", "Deleted account was the reported player"],
    );

    await db.query("delete from auth.users where id = $1", [users.host]);

    const room = await db.query<{ status: string; invite_code: string | null }>(
      "select status, invite_code from public.game_rooms where id = $1",
      [roomId],
    );
    assertEquals(room.rows[0].status, "abandoned", "room closed on deletion");
    assertEquals(room.rows[0].invite_code, null, "invite code cleared");
    assert(
      /^[0-9A-F]{12}$/.test(inviteCode),
      "the test began with a valid invite code",
    );

    const deletedPlayerHistory = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.player_match_history where id = $1",
      [hostHistoryId],
    );
    assertEquals(
      deletedPlayerHistory.rows[0].count,
      0,
      "deleted player's own history is removed",
    );
    const retainedOpponentHistory = await db.query<{
      opponent_user_id: string | null;
      opponent_nickname: string;
    }>(
      "select opponent_user_id, opponent_nickname from public.player_match_history where id = $1",
      [guestHistoryId],
    );
    assertEquals(
      retainedOpponentHistory.rows[0].opponent_user_id,
      null,
      "remaining player's history no longer links the deleted account",
    );
    assertEquals(
      retainedOpponentHistory.rows[0].opponent_nickname,
      "已刪除玩家",
      "remaining player's history uses the deletion label",
    );

    const report = await db.query<{
      reporter_user_id: string | null;
      reported_user_id: string | null;
      details: string;
    }>(
      "select reporter_user_id, reported_user_id, details from public.player_safety_reports where room_id = $1 order by details",
      [roomId],
    );
    assertEquals(report.rows.length, 2, "reports retained until their expiry");
    for (const row of report.rows) {
      assertEquals(row.reporter_user_id, null, "reporter identity removed");
      assertEquals(row.reported_user_id, null, "reported identity removed");
    }
    assertEquals(
      report.rows[0].details,
      "Deleted account was the reported player",
      "report details retained when account was reported",
    );
    assertEquals(
      report.rows[1].details,
      "Keep the report but remove account links",
      "report details retained when account was reporter",
    );
  } finally {
    await db.close();
  }
});

Deno.test("moderation workflow restricts access, records review events, and purges audit data", async () => {
  const db = await createDatabase();
  try {
    await insertUsers(db);
    const { roomId } = await createPlayingRoom(db);
    const submitted = await rpc(
      db,
      users.host,
      "select public.submit_player_report($1::uuid, $2, $3) as response",
      [roomId, "harassment", "Repeated unwanted contact"],
    );
    assertEquals(submitted.status, "submitted", "player report accepted");

    const reportResult = await db.query<{ id: string }>(
      "select id from public.player_safety_reports where room_id = $1",
      [roomId],
    );
    const reportId = reportResult.rows[0].id;
    await db.query(
      "insert into private.moderation_reviewers (reviewer_user_id) values ($1), ($2), ($3)",
      [users.outsider, users.blocked, users.host],
    );

    await assertRejects(
      () =>
        rpc(
          db,
          users.guest,
          "select * from public.list_moderation_reports('pending', 50, null, null)",
        ),
      "Moderator access required",
    );

    const listForInvolvedReviewer = await withUser(
      db,
      users.host,
      async () =>
        await db.query<{ report_id: string }>(
          "select report_id from public.list_moderation_reports('pending', 50, null, null)",
        ),
    );
    assertEquals(
      listForInvolvedReviewer.rows.length,
      0,
      "reviewers involved in a report cannot see it in the queue",
    );
    await assertRejects(
      () =>
        rpc(
          db,
          users.host,
          "select * from public.get_moderation_report($1::uuid)",
          [reportId],
        ),
      "Report unavailable",
    );

    const listForReviewer = await withUser(
      db,
      users.outsider,
      async () =>
        await db.query<{
          report_id: string;
          category: string;
          status: string;
          details?: string;
          reporter_user_id?: string;
          reported_user_id?: string;
          room_id?: string;
        }>(
          "select * from public.list_moderation_reports('pending', 50, null, null)",
        ),
    );
    assertEquals(
      listForReviewer.rows.length,
      1,
      "reviewer sees pending report",
    );
    assertEquals(
      listForReviewer.rows[0].report_id,
      reportId,
      "queue report id",
    );
    assertEquals(
      listForReviewer.rows[0].category,
      "harassment",
      "queue category",
    );
    assertEquals(listForReviewer.rows[0].status, "pending", "queue status");
    assertEquals(
      Object.keys(listForReviewer.rows[0]).some((key) =>
        ["details", "reporter_user_id", "reported_user_id", "room_id"].includes(
          key,
        )
      ),
      false,
      "queue list omits narrative and player identifiers until the reviewer opens the case",
    );

    await assertRejects(
      () =>
        withUser(db, users.outsider, async () => {
          await db.query(
            "select * from public.list_moderation_reports('pending', 50, null, $1::uuid)",
            [reportId],
          );
        }),
      "Both pagination cursor values are required",
    );

    const reportDetails = await withUser(
      db,
      users.outsider,
      async () =>
        await db.query<{
          report_id: string;
          details: string;
          status: string;
        }>(
          "select * from public.get_moderation_report($1::uuid)",
          [reportId],
        ),
    );
    assertEquals(
      reportDetails.rows[0].details,
      "Repeated unwanted contact",
      "case detail is available to an authorized reviewer",
    );
    assertEquals(
      reportDetails.rows[0].status,
      "pending",
      "case remains pending until claimed",
    );

    const claim = async (userId: string) =>
      await withUser(db, userId, async () => {
        const result = await db.query<{ response: boolean }>(
          "select public.claim_moderation_report($1::uuid) as response",
          [reportId],
        );
        return result.rows[0].response;
      });
    assertEquals(
      await claim(users.outsider),
      true,
      "first reviewer claims the report",
    );
    assertEquals(
      await claim(users.blocked),
      false,
      "another reviewer cannot claim an active assignment",
    );

    await assertRejects(
      () =>
        rpc(
          db,
          users.blocked,
          "select public.resolve_moderation_report($1::uuid, $2) as response",
          [reportId, "dismissed"],
        ),
      "Report must be claimed by this reviewer",
    );

    const resolved = await withUser(db, users.outsider, async () => {
      const result = await db.query<{ response: boolean }>(
        "select public.resolve_moderation_report($1::uuid, $2) as response",
        [reportId, "actioned"],
      );
      return result.rows[0].response;
    });
    assertEquals(resolved, true, "assigned reviewer resolves the report");

    const savedState = await db.query<{
      status: string;
      assigned_reviewer_id: string;
      reviewed_by: string;
      reviewed_at: Date | null;
    }>(
      "select status, assigned_reviewer_id, reviewed_by, reviewed_at from public.player_safety_reports where id = $1",
      [reportId],
    );
    assertEquals(
      savedState.rows[0].status,
      "actioned",
      "resolution status is saved",
    );
    assertEquals(
      savedState.rows[0].assigned_reviewer_id,
      users.outsider,
      "assigned reviewer is recorded",
    );
    assertEquals(
      savedState.rows[0].reviewed_by,
      users.outsider,
      "resolving reviewer is recorded",
    );
    assert(savedState.rows[0].reviewed_at, "resolution timestamp is recorded");

    await assertRejects(
      () =>
        withUser(db, users.outsider, async () => {
          await db.query("select * from private.player_safety_report_events");
        }),
      "permission denied",
    );
    await assertRejects(
      async () => {
        await db.exec("reset role; set role service_role");
        try {
          await db.query("select * from public.player_safety_reports");
        } finally {
          await db.exec("reset role");
        }
      },
      "permission denied",
    );

    const audit = await db.query<{
      report_id: string | null;
      event_type: string;
      actor_user_id: string;
      previous_status: string | null;
      new_status: string | null;
      filter_status: string | null;
    }>(
      "select report_id, event_type, actor_user_id, previous_status, new_status, filter_status from private.player_safety_report_events where report_id = $1 or event_type = 'queue_listed' order by id",
      [reportId],
    );
    assertEquals(
      audit.rows.length,
      5,
      "queue, detail, claim, and resolution accesses are recorded",
    );
    assertEquals(
      audit.rows[0].event_type,
      "queue_listed",
      "queue access is recorded",
    );
    assertEquals(
      audit.rows[0].actor_user_id,
      users.host,
      "queue access actor is recorded",
    );
    assertEquals(
      audit.rows[1].event_type,
      "queue_listed",
      "second queue access is recorded",
    );
    assertEquals(
      audit.rows[2].event_type,
      "report_viewed",
      "case detail access is recorded",
    );
    assertEquals(audit.rows[3].event_type, "claimed", "claim is recorded");
    assertEquals(
      audit.rows[3].previous_status,
      "pending",
      "claim audit has old status",
    );
    assertEquals(
      audit.rows[3].new_status,
      "reviewing",
      "claim audit has new status",
    );
    assertEquals(
      audit.rows[4].event_type,
      "resolved",
      "resolution is recorded",
    );
    assertEquals(
      audit.rows[4].actor_user_id,
      users.outsider,
      "reviewer identity is recorded",
    );
    assertEquals(
      audit.rows[4].new_status,
      "actioned",
      "resolution audit records outcome",
    );

    await db.query(
      "update public.player_safety_reports set created_at = clock_timestamp() - interval '181 days' where id = $1",
      [reportId],
    );
    await db.query(
      "update private.player_safety_report_events set created_at = clock_timestamp() - interval '181 days' where report_id is null",
    );
    await db.query("select private.purge_expired_moderation_reports()");
    const retainedReport = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.player_safety_reports where id = $1",
      [reportId],
    );
    const retainedAudit = await db.query<{ count: number }>(
      "select count(*)::integer as count from private.player_safety_report_events where report_id = $1",
      [reportId],
    );
    assertEquals(retainedReport.rows[0].count, 0, "expired report is purged");
    assertEquals(
      retainedAudit.rows[0].count,
      0,
      "audit entries expire with the report",
    );
  } finally {
    await db.close();
  }
});
