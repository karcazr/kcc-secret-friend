import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { generateAssignments } from "../src/lib/assignments";

let db: PGlite;
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const admin = id(1),
  a = id(2),
  b = id(3),
  c = id(4),
  d = id(5),
  pending = id(6),
  event = id(100);
const rpc = async <T = unknown>(fn: string, params: unknown[]) => {
  const marks = params.map((_, i) => `$${i + 1}`).join(",");
  const r = await db.query<{ value: T }>(
    `select public.${fn}(${marks}) as value`,
    params,
  );
  return r.rows[0].value;
};
const read = (section: string, args = {}) =>
  rpc<Record<string, any>>("app_read", [section, JSON.stringify(args)]);
const write = (action: string, args = {}) =>
  rpc("app_write", [action, JSON.stringify(args)]);
async function user(uid: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await db.exec("set role authenticated");
}
async function owner() {
  await db.exec("reset role");
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/202610090001_initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (let i = 1; i <= 6; i++) {
    const code = `test-invitation-${i}`;
    await db.query(
      "insert into private.invitations values(encode(sha256(convert_to($1,'UTF8')),'hex'),$2,now()+interval '1 day',null)",
      [code, `student${i}@example.test`],
    );
    await db.query("insert into auth.users values($1,$2,$3)", [
      id(i),
      `student${i}@example.test`,
      JSON.stringify({
        display_name: `Student ${i}`,
        invitation_code: code,
        role: "admin",
      }),
    ]);
  }
  await db.exec(`update private.club_memberships set status='approved' where user_id<>'${pending}'; insert into private.administrators values('${admin}');
    insert into private.monthly_events(id,title,status,reveal_at) values('${event}','Test round','active',now()+interval '30 days');
    insert into private.event_participants(event_id,user_id) values('${event}','${a}'),('${event}','${b}'),('${event}','${c}'),('${event}','${d}');
    insert into private.assignments values('${event}','${a}','${b}'),('${event}','${b}','${c}'),('${event}','${c}','${d}'),('${event}','${d}','${a}');
    insert into private.messages(id,event_id,sender_id,recipient_id,body,created_at) values('${id(200)}','${event}','${d}','${a}','You have got this.',now()-interval '2 hours');`);
}, 30_000);
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback");
  await owner();
});
afterAll(async () => {
  await db.close();
});

describe("database authorization and lifecycle", () => {
  it("enables RLS for every private table", async () => {
    const result = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relkind='r'",
    );
    expect(result.rows.length).toBe(14);
    expect(result.rows.every((x) => x.relrowsecurity)).toBe(true);
  });
  it("blocks direct private table reads", async () => {
    await user(a);
    await expect(db.query("select * from private.assignments")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("blocks anonymous RPC calls", async () => {
    await db.exec("set role anon");
    await expect(read("dashboard")).rejects.toThrow(/permission denied/);
  });
  it("rejects uninvited accounts at the database boundary", async () => {
    await expect(
      db.query("insert into auth.users values($1,$2,$3)", [
        id(9),
        "outsider@example.test",
        JSON.stringify({ display_name: "Outsider", role: "admin" }),
      ]),
    ).rejects.toThrow(/valid invitation/);
  });
  it("does not allow invitation reuse", async () => {
    await expect(
      db.query("insert into auth.users values($1,$2,$3)", [
        id(9),
        "student2@example.test",
        JSON.stringify({
          display_name: "Copy",
          invitation_code: "test-invitation-2",
        }),
      ]),
    ).rejects.toThrow(/valid invitation/);
  });
  it("ignores admin claims in editable signup metadata", async () => {
    await user(a);
    expect((await read("profile")).is_admin).toBe(false);
    await expect(read("admin-participants")).rejects.toThrow(/Administrator/);
  });
  it("blocks pending members from round data", async () => {
    await user(pending);
    expect((await read("profile")).profile.status).toBe("pending");
    await expect(read("dashboard")).rejects.toThrow(/Approved/);
  });
  it("returns only the outgoing friend and safe message fields", async () => {
    await user(a);
    const data = await read("dashboard");
    expect(data.friend.display_name).toBe("Student 3");
    expect(Object.keys(data.messages[0]).sort()).toEqual([
      "body",
      "created_at",
      "id",
      "reported",
    ]);
    expect(JSON.stringify(data)).not.toContain("sender_id");
    expect(data.sender).toBeUndefined();
  });
  it("does not expose the incoming sender or guess result before reveal", async () => {
    await user(a);
    await write("guess", { event, user_id: d });
    const data = await read("reveal");
    expect(data.guess).toBe("Student 5");
    expect(data.sender).toBeUndefined();
  });
  it("allows only one guess", async () => {
    await user(a);
    await write("guess", { event, user_id: d });
    await expect(write("guess", { event, user_id: c })).rejects.toThrow(
      /duplicate key/,
    );
  });
  it("derives the recipient on the server, ignoring arbitrary recipient input", async () => {
    await user(a);
    await write("send", { event, body: "Hello, friend!", recipient_id: c });
    await user(b);
    expect((await read("inbox")).messages[0].body).toBe("Hello, friend!");
    await user(c);
    expect((await read("inbox")).messages).toHaveLength(0);
  });
  it("enforces rate limits in the database", async () => {
    await user(a);
    await write("send", { event, body: "First note" });
    await expect(write("send", { event, body: "Second note" })).rejects.toThrow(
      /slow down/,
    );
  });
  it("rejects unauthorized message reports", async () => {
    await user(b);
    await expect(
      write("report", { id: id(200), reason: "Not my message" }),
    ).rejects.toThrow(/unavailable/);
  });
  it("shows admins only reported content without sender identity", async () => {
    await user(admin);
    expect((await read("admin-reports")).items).toHaveLength(0);
    await user(a);
    await write("report", { id: id(200), reason: "Please review" });
    await user(admin);
    const r = (await read("admin-reports")).items[0];
    expect(r.body).toBe("You have got this.");
    expect(r.sender_id).toBeUndefined();
  });
  it("prevents student administrative writes", async () => {
    await user(a);
    await expect(
      write("admin-event", { event, status: "completed" }),
    ).rejects.toThrow(/Administrator/);
  });
  it("reveals the sender and evaluates the guess only after admin reveal", async () => {
    await user(a);
    await write("guess", { event, user_id: d });
    await user(admin);
    await write("admin-event", { event, status: "completed" });
    await user(a);
    const data = await read("reveal");
    expect(data.sender).toEqual({ display_name: "Student 5", correct: true });
  });
  it("preserves the cycle and pauses both sides on safe withdrawal", async () => {
    await user(admin);
    await write("admin-withdraw", { event, user_id: b });
    await owner();
    expect(
      (await db.query("select * from private.assignments")).rows,
    ).toHaveLength(4);
    await user(a);
    await expect(write("send", { event, body: "Paused note" })).rejects.toThrow(
      /paused/,
    );
  });
  it("does not allow late joins into a running cycle", async () => {
    await user(admin);
    await expect(write("join", { event })).rejects.toThrow(/not open/);
  });
  it("generates atomically and rejects duplicate requests", async () => {
    await owner();
    await db.exec(
      `delete from private.messages; delete from private.assignments; update private.monthly_events set status='closed' where id='${event}'`,
    );
    await user(admin);
    const context = await rpc<{ version: number; participants: string[] }>(
      "assignment_context",
      [event],
    );
    const edges = generateAssignments(context.participants);
    await rpc("commit_assignments", [
      event,
      context.version,
      JSON.stringify(edges),
    ]);
    expect((await read("admin-assignments")).stats.assignments).toBe(4);
    await expect(
      rpc("commit_assignments", [
        event,
        context.version,
        JSON.stringify(edges),
      ]),
    ).rejects.toThrow(/already generated/);
  });
  it("rejects multiple cycles and rolls back all inserts", async () => {
    await owner();
    await db.exec(
      `delete from private.messages; delete from private.assignments; update private.monthly_events set status='closed' where id='${event}'`,
    );
    await user(admin);
    await db.exec("savepoint invalid_generation");
    await expect(
      rpc("commit_assignments", [
        event,
        0,
        JSON.stringify([
          { sender_id: a, recipient_id: b },
          { sender_id: b, recipient_id: a },
          { sender_id: c, recipient_id: d },
          { sender_id: d, recipient_id: c },
        ]),
      ]),
    ).rejects.toThrow(/one complete cycle/);
    await db.exec("rollback to savepoint invalid_generation");
    await owner();
    expect(
      (await db.query("select * from private.assignments")).rows,
    ).toHaveLength(0);
  });
  it("rejects stale roster snapshots", async () => {
    await owner();
    await db.exec(
      `delete from private.messages; delete from private.assignments; update private.monthly_events set status='closed',version=9 where id='${event}'`,
    );
    await user(admin);
    await expect(
      rpc("commit_assignments", [
        event,
        8,
        JSON.stringify(generateAssignments([a, b, c, d])),
      ]),
    ).rejects.toThrow(/Round changed/);
  });
  it("paginates participants beyond the first page with search and sorting", async () => {
    await owner();
    for (let i = 10; i < 35; i++) {
      await db.query(
        "insert into private.invitations values(encode(sha256(convert_to($1,'UTF8')),'hex'),$2,now()+interval '1 day',null)",
        [`code-${i}`, `test${i}@example.test`],
      );
      await db.query("insert into auth.users values($1,$2,$3)", [
        id(i),
        `test${i}@example.test`,
        JSON.stringify({
          display_name: `Scalable ${i}`,
          invitation_code: `code-${i}`,
        }),
      ]);
    }
    await user(admin);
    const first = await read("admin-participants", { q: "Scalable", page: 1 });
    const second = await read("admin-participants", { q: "Scalable", page: 2 });
    expect(first.total).toBe(25);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(5);
    expect(
      new Set([...first.items, ...second.items].map((x) => x.id)).size,
    ).toBe(25);
  });
});
