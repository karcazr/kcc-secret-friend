import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  Shuffle,
  Flag,
  CalendarDays,
} from "lucide-react";
import { ActionForm } from "./action-form";
import { DateLabel, Empty, Field, PageHeading, Pager, Status } from "./ui";
import type { AppData, Person, Event, Report } from "@/lib/types";

export function AdminView({
  section,
  data,
  args,
}: {
  section: string;
  data: AppData;
  args: Record<string, string>;
}) {
  const e = data.event,
    fields = { event: e?.id ?? "" };
  const page = Number(args.page) || 1;
  const title: Record<string, string> = {
    overview: "A thoughtful round starts here.",
    participants: "The people behind the kindness.",
    events: "Make room for a new connection.",
    assignments: "One circle. Everyone included.",
    missions: "Give kindness a starting point.",
    reports: "Keep this a safe place.",
    announcements: "A word from the organizers.",
  };
  const base = `/admin/${section}`;
  return (
    <>
      <PageHeading
        eyebrow="ORGANIZER WORKSPACE"
        title={title[section]}
        description={
          e ? `Current round: ${e.title}` : "Create a round to get started."
        }
      >
        {e && <Status value={e.status} />}
      </PageHeading>
      {section === "overview" && (
        <>
          <div className="stats-grid">
            {[
              [Users, "Approved members", data.stats?.members ?? 0],
              [
                CalendarDays,
                "Registered this round",
                data.stats?.participants ?? 0,
              ],
              [Shuffle, "Assignments", data.stats?.assignments ?? 0],
              [Flag, "Open reports", data.stats?.reports ?? 0],
            ].map(([Icon, label, value]) => {
              const I = Icon as typeof Users;
              return (
                <div className="stat" key={String(label)}>
                  <I size={19} />
                  <strong>{String(value)}</strong>
                  <span>{String(label)}</span>
                </div>
              );
            })}
          </div>
          <div className="dashboard-grid">
            <section className="section">
              <h2>Keep the round moving.</h2>
              {[
                [
                  "participants",
                  `${data.stats?.pending ?? 0} members waiting for approval`,
                ],
                ["events", "Registration, dates & reveal"],
                ["assignments", "Generate this round’s connections"],
                ["reports", "Review reported notes"],
              ].map(([path, label]) => (
                <Link
                  className="history-row"
                  href={`/admin/${path}`}
                  key={path}
                >
                  <span>{label}</span>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </section>
            <aside className="reveal-teaser">
              <ShieldCheck size={22} />
              <h2>Trust is part of the experience.</h2>
              <p>
                Assignments are private. Only reported message content appears
                in your workspace.
              </p>
              <p>
                After a round starts, use safe withdrawal to pause a student’s
                relationships without reshuffling everyone.
              </p>
            </aside>
          </div>
        </>
      )}
      {section === "participants" && (
        <>
          <form className="filters" method="get">
            <label>
              Search by name
              <input
                name="q"
                placeholder="Name starts with…"
                defaultValue={args.q}
                maxLength={100}
              />
            </label>
            <label>
              Membership
              <select name="status" defaultValue={args.status ?? ""}>
                <option value="">All members</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="removed">Removed</option>
              </select>
            </label>
            <label>
              Sort
              <select name="sort" defaultValue={args.sort ?? "name"}>
                <option value="name">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="newest">Newest first</option>
              </select>
            </label>
            <button className="button secondary">Apply</button>
          </form>
          <p className="subtle">
            {data.total ?? 0} matching participants · 20 per page
          </p>
          <div className="participants-list">
            {data.items?.length ? (
              data.items.map((item) => {
                const p = item as Person;
                return (
                  <article className="participant" key={p.id}>
                    <span className="avatar tiny">
                      {p.display_name.slice(0, 1)}
                    </span>
                    <div className="participant-info">
                      <h3>{p.display_name}</h3>
                      <p>
                        {p.status} ·{" "}
                        {p.joined ? "Registered this round" : "Not registered"}
                        {p.future_opt_out
                          ? " · Opted out of future rounds"
                          : ""}
                      </p>
                    </div>
                    <div className="participant-actions">
                      {p.id !== data.profile.id && (
                        <>
                          {p.status !== "approved" && (
                            <ActionForm
                              action="admin-member"
                              fields={{ user_id: p.id, status: "approved" }}
                              label="Approve"
                              secondary
                            />
                          )}
                          {p.status !== "removed" && (
                            <ActionForm
                              action="admin-member"
                              fields={{ user_id: p.id, status: "removed" }}
                              label="Remove"
                              secondary
                              confirm={`Remove ${p.display_name} from the club? Active-round relationships will be paused and kept intact. Future access will be revoked.`}
                            />
                          )}{" "}
                          {p.joined && e?.status === "active" && (
                            <ActionForm
                              action="admin-withdraw"
                              fields={{ ...fields, user_id: p.id }}
                              label="Withdraw safely"
                              secondary
                              confirm={`Pause ${p.display_name} for this round? Notes to and from them will stop. Existing assignments remain unchanged, and this cannot be undone in the app.`}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <Empty title="No matching participants">
                <p>Try a different name or membership filter.</p>
              </Empty>
            )}
          </div>
          <Pager
            page={page}
            hasMore={page * 20 < (data.total ?? 0)}
            base={base}
            query={args}
          />
          <section className="section narrow">
            <h2>Invite someone to the club.</h2>
            <p>
              Create a one-use code tied to their email. Share it with them
              privately; this app does not send invitations.
            </p>
            <ActionForm action="admin-invite" label="Create invitation">
              <Field
                name="email"
                label="Student’s email"
                type="email"
                maxLength={254}
              />
            </ActionForm>
          </section>
        </>
      )}
      {section === "events" && (
        <div className="admin-columns">
          <section>
            {data.items?.slice(0, 20).map((item) => {
              const ev = item as Event;
              const f = { event: ev.id };
              return (
                <article className="event-panel" key={ev.id}>
                  <div className="section-head">
                    <h2>{ev.title}</h2>
                    <Status value={ev.status} />
                  </div>
                  <p>
                    Planned reveal: <DateLabel value={ev.reveal_at} time />
                  </p>
                  <div className="button-row">
                    {ev.status === "open" && (
                      <ActionForm
                        action="admin-event"
                        fields={{ ...f, status: "closed" }}
                        label="Close registration"
                        confirm="Close registration? Students will no longer be able to join or leave on their own."
                      />
                    )}
                    {ev.status === "closed" && (
                      <ActionForm
                        action="admin-event"
                        fields={{ ...f, status: "open" }}
                        label="Reopen registration"
                        secondary
                      />
                    )}
                    {ev.status === "active" && (
                      <ActionForm
                        action="admin-event"
                        fields={{ ...f, status: "completed" }}
                        label="Reveal this round"
                        confirm="Reveal every Secret Friend now? This permanently exposes identities to their recipients and ends messaging and guessing for this round."
                      />
                    )}
                    {ev.status === "completed" && (
                      <ActionForm
                        action="admin-event"
                        fields={{ ...f, status: "archived" }}
                        label="Archive round"
                        secondary
                        confirm="Archive this completed round? Students can still revisit their notes and reveal."
                      />
                    )}
                    <Link
                      className="text-link"
                      href={`/admin/missions?event=${ev.id}`}
                    >
                      Manage missions
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                  {["open", "closed", "active"].includes(ev.status) && (
                    <details>
                      <summary>Change reveal date</summary>
                      <ActionForm
                        action="admin-date"
                        fields={f}
                        label="Save date"
                        secondary
                      >
                        <Field
                          label="Reveal date & time (UTC)"
                          name="reveal_at"
                          type="datetime-local"
                          defaultValue={ev.reveal_at.slice(0, 16)}
                        />
                        <input type="hidden" name="timezone" value="UTC" />
                      </ActionForm>
                    </details>
                  )}
                </article>
              );
            })}
            {!data.items?.length && (
              <Empty title="A fresh start">
                <p>Create your first monthly round.</p>
              </Empty>
            )}
            <Pager
              page={page}
              hasMore={(data.items?.length ?? 0) > 20}
              base={base}
            />
          </section>
          <aside className="paper">
            <h2>Start a new round</h2>
            <p>Finish the current round before opening the next one.</p>
            <ActionForm action="admin-create-event" label="Open registration">
              <Field
                name="title"
                label="Round title"
                maxLength={100}
                placeholder="October Secret Friend"
              />
              <Field
                name="reveal_at"
                label="Reveal date & time (UTC)"
                type="datetime-local"
              />
            </ActionForm>
          </aside>
        </div>
      )}
      {section === "assignments" && (
        <div className="narrow">
          <div className="paper">
            <Shuffle size={25} />
            <h2>
              {e?.status === "active"
                ? "Everyone has a connection."
                : "Ready to connect the circle?"}
            </h2>
            <p>
              {data.stats?.participants ?? 0} confirmed participants ·{" "}
              {data.stats?.assignments ?? 0} assignments saved ·{" "}
              {data.stats?.withdrawn ?? 0} withdrawn
            </p>
            <p>
              Generation makes one complete circle, with no self-assignments.
              Previous-round pairs are avoided whenever possible. Two
              participants must pair with each other.
            </p>
            {e?.status === "closed" ? (
              <ActionForm
                action="generate"
                fields={fields}
                label="Generate & start round"
                confirm="Generate secret assignments and start the round? The participant list will be locked and assignments cannot be regenerated."
              />
            ) : (
              <p className="notice">
                {e?.status === "open"
                  ? "Close registration before generating assignments."
                  : e?.status === "active"
                    ? "Assignments are saved. Generating again is disabled."
                    : "Choose an unfinished round to generate assignments."}
              </p>
            )}
          </div>
          <section className="section">
            <h2>When someone needs to withdraw</h2>
            <p>
              Use “Withdraw safely” on the Participants page. Their place in the
              cycle stays intact, and notes to and from them pause. Do not
              regenerate an active round or promise a replacement pairing.
            </p>
            <Link className="text-link" href="/admin/participants">
              Manage participants
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      )}
      {section === "missions" && (
        <div className="admin-columns">
          <section>
            {data.missions?.slice(0, 20).map((m) => (
              <article className="event-panel" key={m.id}>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
                {e && ["open", "closed", "active"].includes(e.status) && (
                  <details>
                    <summary>Edit mission</summary>
                    <ActionForm
                      action="admin-mission"
                      fields={{ ...fields, id: m.id }}
                      label="Save mission"
                    >
                      <Field
                        name="title"
                        label="Mission title"
                        defaultValue={m.title}
                        maxLength={120}
                      />
                      <label>
                        Description
                        <textarea
                          name="description"
                          maxLength={1000}
                          defaultValue={m.description}
                        />
                      </label>
                    </ActionForm>
                  </details>
                )}
              </article>
            ))}
            {!data.missions?.length && (
              <Empty title="Start with something small">
                <p>Add the first mission for this round.</p>
              </Empty>
            )}
            <Pager
              page={page}
              hasMore={(data.missions?.length ?? 0) > 20}
              base={base}
              query={args}
            />
          </section>
          {e && ["open", "closed", "active"].includes(e.status) && (
            <aside className="paper">
              <h2>Add a mission</h2>
              <ActionForm
                action="admin-mission"
                fields={fields}
                label="Create mission"
              >
                <Field name="title" label="Mission title" maxLength={120} />
                <label>
                  Description
                  <textarea name="description" maxLength={1000} rows={4} />
                </label>
              </ActionForm>
            </aside>
          )}
        </div>
      )}
      {section === "reports" && (
        <>
          <form className="filters">
            <label>
              Status
              <select name="status" defaultValue={args.status ?? "open"}>
                <option value="open">Open reports</option>
                <option value="resolved">Resolved reports</option>
              </select>
            </label>
            <button className="button secondary">Apply</button>
          </form>
          <div className="narrow">
            {data.items?.slice(0, 20).map((item) => {
              const r = item as Report;
              return (
                <article className="paper inbox-note" key={r.id}>
                  <p className="eyebrow">
                    REPORTED NOTE · <DateLabel value={r.created_at} />
                  </p>
                  <blockquote className="message-body">{r.body}</blockquote>
                  <h3>Reason for report</h3>
                  <p>{r.reason}</p>
                  {r.status === "open" ? (
                    <ActionForm
                      action="admin-resolve"
                      fields={{ id: r.id }}
                      label="Mark reviewed"
                      secondary
                      confirm="Mark this report as reviewed? Confirm that any necessary follow-up has been handled under your club’s safeguarding process."
                    />
                  ) : (
                    <span className="status">Reviewed</span>
                  )}
                </article>
              );
            })}
            {!data.items?.length && (
              <Empty title="No reports in this view">
                <p>Only reported notes are available to organizers.</p>
              </Empty>
            )}
            <Pager
              page={page}
              hasMore={(data.items?.length ?? 0) > 20}
              base={base}
              query={args}
            />
          </div>
        </>
      )}
      {section === "announcements" && (
        <div className="admin-columns">
          <section>
            {data.announcements?.slice(0, 20).map((a) => (
              <article className="event-panel" key={a.id}>
                <h3>{a.title}</h3>
                <p className="message-body">{a.body}</p>
                <DateLabel value={a.created_at} />
              </article>
            ))}
            {!data.announcements?.length && (
              <Empty title="Nothing on the noticeboard yet">
                <p>Publish a note for the current round.</p>
              </Empty>
            )}
            <Pager
              page={page}
              hasMore={(data.announcements?.length ?? 0) > 20}
              base={base}
              query={args}
            />
          </section>
          {e && (
            <aside className="paper">
              <h2>Publish an announcement</h2>
              <ActionForm
                action="admin-announcement"
                fields={fields}
                label="Publish to this round"
              >
                <Field name="title" label="Title" maxLength={120} />
                <label>
                  Announcement
                  <textarea name="body" required maxLength={4000} rows={6} />
                </label>
              </ActionForm>
            </aside>
          )}
        </div>
      )}
    </>
  );
}
