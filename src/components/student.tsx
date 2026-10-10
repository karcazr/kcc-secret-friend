import Link from "next/link";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Send,
  CalendarDays,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import type { AppData, Event } from "@/lib/types";
import { ActionForm } from "./action-form";
import { DateLabel, Empty, Field, PageHeading, Pager, Status } from "./ui";

export function StudentView({
  section,
  data,
  args = {},
  demo = false,
}: {
  section: string;
  data: AppData;
  args?: Record<string, string>;
  demo?: boolean;
}) {
  const event = data.event,
    fields = { event: event?.id ?? "" };
  const href = (section: string) =>
    demo
      ? `/demo?section=${section}`
      : `/app/${section}${args.event ? `?event=${args.event}` : ""}`;
  const page = Number(args.page) || 1;
  const canAct =
    !demo &&
    event?.status === "active" &&
    data.participation &&
    !data.participation.withdrawn;
  const missions = data.missions ?? [];
  const notePreview = (data.messages ?? []).slice(0, 2);
  const join = (
    <section className="join-box">
      <h2>
        {event?.status === "open" ? "Registration open" : "No active round"}
      </h2>
      {event?.status === "open" && !data.participation && !demo && (
        <ActionForm action="join" fields={fields} label="Join this round" />
      )}
      {event?.status === "closed" && !data.participation && (
        <p>Registration has closed. Join the next round when it opens.</p>
      )}
    </section>
  );
  const friend = (
    <section className="friend-hero">
      <div className="hero-copy">
        <h2>Your Secret Friend</h2>
        {data.friend ? (
          <>
            <div className="friend-name">
              <span className="avatar">
                {data.friend.display_name.slice(0, 1)}
              </span>
              <strong>{data.friend.display_name}</strong>
            </div>
            {data.friend.withdrawn || data.participation?.withdrawn ? (
              <p className="notice">Paused. Contact your organizer.</p>
            ) : (
              <Link className="button" href={href("send")}>
                <Send size={16} />
                Send message
                <ArrowUpRight size={16} />
              </Link>
            )}
          </>
        ) : (
          <>
            <p>
              {data.participation
                ? "Registered. Awaiting assignments."
                : "Join this round to get your match."}
            </p>
            <Link className="button" href={href("join")}>
              View registration
              <ArrowRight size={16} />
            </Link>
          </>
        )}
      </div>
      <div className="hero-foot">
        <LockKeyhole size={13} />
        Anonymous until reveal.
      </div>
    </section>
  );
  const missionList = (compact = false) => (
    <div className="mission-list">
      {missions.length ? (
        missions.slice(0, compact ? 3 : 20).map((m, i) => (
          <div className="mission-row" key={m.id}>
            <span className={`mission-check ${m.completed ? "done" : ""}`}>
              {m.completed ? (
                <Check size={16} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <div>
              <h3>{m.title}</h3>
              {!compact && m.description && (
                <details>
                  <summary>Details</summary>
                  <p>{m.description}</p>
                </details>
              )}
            </div>
            {canAct && !compact && (
              <ActionForm
                action="complete-mission"
                fields={{
                  ...fields,
                  id: m.id,
                  completed: String(!m.completed),
                }}
                label={m.completed ? "Undo" : "Mark done"}
                secondary
              />
            )}
            {compact && m.completed && <span className="subtle">Done</span>}
          </div>
        ))
      ) : (
        <Empty title="No missions yet" />
      )}
    </div>
  );

  if (section === "dashboard")
    return (
      <>
        <PageHeading
          eyebrow={event?.title ?? "WELCOME TO THE CLUB"}
          title={`Hi, ${data.profile.display_name.split(" ")[0]}.`}
        >
          {event && <Status value={event.status} />}
        </PageHeading>
        {event ? (
          <>
            {friend}
            <div className="dashboard-grid">
              <div>
                <section className="section">
                  <div className="section-head">
                    <h2>Missions</h2>
                    <Link href={href("missions")}>
                      View all
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                  {missionList(true)}
                </section>
                <section className="section">
                  <div className="section-head">
                    <h2>Inbox</h2>
                    <Link href={href("inbox")}>
                      Open inbox
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                  {notePreview.length ? (
                    notePreview.map((m) => (
                      <article className="note-preview" key={m.id}>
                        <div className="note-meta">
                          <Mail size={16} />
                          <span>From your Secret Friend</span>
                          <DateLabel value={m.created_at} />
                        </div>
                        <p>“{m.body}”</p>
                      </article>
                    ))
                  ) : (
                    <Empty title="No messages yet" />
                  )}
                </section>
              </div>
              <aside>
                <section className="reveal-teaser">
                  <div className="section-head">
                    <span className="eyebrow">REVEAL</span>
                    <CalendarDays size={19} />
                  </div>
                  <strong className="reveal-date">
                    <DateLabel value={event.reveal_at} />
                  </strong>
                  <p className="countdown">
                    {event.status === "active"
                      ? `${Math.max(0, Math.ceil((new Date(event.reveal_at).getTime() - Date.now()) / 86400000))} days left`
                      : "Opened by your organizer."}
                  </p>
                  <Link href={href("reveal")}>
                    View reveal
                    <ArrowRight size={16} />
                  </Link>
                </section>
                <section className="section">
                  <p className="eyebrow">ANNOUNCEMENTS</p>
                  {data.announcements?.length ? (
                    data.announcements.slice(0, 3).map((a) => (
                      <article className="announcement" key={a.id}>
                        <h3>{a.title}</h3>
                        <p>{a.body}</p>
                        <DateLabel value={a.created_at} />
                      </article>
                    ))
                  ) : (
                    <p className="muted">No announcements.</p>
                  )}
                </section>
              </aside>
            </div>
          </>
        ) : (
          join
        )}
      </>
    );
  if (section === "friend")
    return (
      <>
        <PageHeading eyebrow={event?.title ?? ""} title="My Secret Friend" />
        {friend}
      </>
    );
  if (section === "join")
    return (
      <>
        <PageHeading
          eyebrow={event?.title ?? "MONTHLY REGISTRATION"}
          title="Join round"
        />
        {event && <Status value={event.status} />}
        <div className="narrow section">
          {data.participation ? (
            <>
              <h2>You’re registered.</h2>
              <p>
                {data.participation.withdrawn
                  ? "Your participation is paused."
                  : "Awaiting the round start."}
              </p>
              {event?.status === "open" && !demo ? (
                <ActionForm
                  action="leave"
                  fields={fields}
                  label="Leave this round"
                  secondary
                  confirm="Leave this round? You can rejoin while registration is open."
                />
              ) : (
                <p>To withdraw, contact your organizer.</p>
              )}
            </>
          ) : (
            join
          )}
        </div>
      </>
    );
  if (section === "send")
    return (
      <>
        <PageHeading
          eyebrow={event?.title ?? ""}
          title="New message"
          description={
            data.friend
              ? `To ${data.friend.display_name}`
              : "Awaiting assignments."
          }
        />
        <div className="narrow">
          <div className="paper">
            {canAct && !data.friend?.withdrawn ? (
              <ActionForm
                action="send"
                fields={fields}
                label="Send anonymously"
              >
                <label>
                  Your message
                  <textarea
                    name="body"
                    required
                    minLength={1}
                    maxLength={2000}
                    rows={8}
                    placeholder="Write your message…"
                  />
                </label>
                <p className="field-hint">Anonymous · 2,000 characters max</p>
              </ActionForm>
            ) : (
              <Empty title={demo ? "Sample round" : "Messaging unavailable"}>
                <p>
                  {demo
                    ? "Sign in to send messages."
                    : "Messaging opens when your round is active."}
                </p>
                {demo && (
                  <Link className="button" href="/">
                    Sign in to send
                  </Link>
                )}
              </Empty>
            )}
          </div>
        </div>
      </>
    );
  if (section === "inbox")
    return (
      <>
        <PageHeading eyebrow={event?.title ?? "YOUR INBOX"} title="Inbox" />
        <div className="narrow">
          {data.messages?.length ? (
            data.messages.slice(0, 20).map((m) => (
              <article className="paper inbox-note" key={m.id}>
                <div className="note-meta">
                  <Mail size={18} />
                  <strong>From your Secret Friend</strong>
                </div>
                <p className="message-body">{m.body}</p>
                <div className="note-meta">
                  <DateLabel value={m.created_at} time />
                  {m.reported ? (
                    <span>Reported</span>
                  ) : (
                    !demo && (
                      <details>
                        <summary>Report this note</summary>
                        <ActionForm
                          action="report"
                          fields={{ id: m.id }}
                          label="Send report"
                        >
                          <label>
                            What’s wrong?
                            <textarea
                              name="reason"
                              required
                              maxLength={1000}
                              rows={3}
                            />
                          </label>
                          <p className="field-hint">
                            This note will be shared with organizers.
                          </p>
                        </ActionForm>
                      </details>
                    )
                  )}
                </div>
              </article>
            ))
          ) : (
            <Empty title="No messages yet" />
          )}
          <Pager
            page={page}
            hasMore={(data.messages?.length ?? 0) > 20}
            base="/app/inbox"
            query={args}
          />
        </div>
      </>
    );
  if (section === "missions")
    return (
      <>
        <PageHeading
          eyebrow={event?.title ?? "MONTHLY MISSIONS"}
          title="Missions"
        />
        <div className="narrow">
          {missionList()}
          <Pager
            page={page}
            hasMore={missions.length > 20}
            base="/app/missions"
            query={args}
          />
        </div>
      </>
    );
  if (section === "reveal")
    return (
      <>
        <PageHeading
          eyebrow="THE BIG REVEAL"
          title="Reveal"
          description={
            event
              ? `Planned reveal: ${new Date(event.reveal_at).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}.`
              : "No round yet."
          }
        />
        <div className="narrow">
          {data.sender ? (
            <section className="reveal-result">
              <p className="eyebrow">YOUR SECRET FRIEND WAS</p>
              <span className="avatar">
                {data.sender.display_name.slice(0, 1)}
              </span>
              <h2>{data.sender.display_name}</h2>
              {data.guess && (
                <p>
                  {data.sender.correct
                    ? "You guessed it!"
                    : "A lovely surprise."}{" "}
                  Your guess was {data.guess}.
                </p>
              )}
              <Link href={href("inbox")} className="button secondary">
                Open inbox
                <ArrowRight size={16} />
              </Link>
            </section>
          ) : (
            <>
              <section className="reveal-teaser">
                <LockKeyhole size={25} />
                <h2>Your guess</h2>
                <p>One guess. Results at reveal.</p>
                {data.guess ? (
                  <div className="notice success">
                    Your guess: {data.guess}. Locked in.
                  </div>
                ) : canAct &&
                  event &&
                  Date.now() < new Date(event.reveal_at).getTime() ? (
                  <>
                    <form method="get" className="search-form">
                      <input type="hidden" name="event" value={event.id} />
                      <label>
                        Search participants
                        <input
                          name="q"
                          maxLength={100}
                          defaultValue={args.q}
                          placeholder="Start typing a name"
                          required
                        />
                      </label>
                      <button className="button secondary">Search</button>
                    </form>
                    {data.candidates?.slice(0, 20).map((p) => (
                      <div className="candidate" key={p.id}>
                        <span>{p.display_name}</span>
                        <ActionForm
                          action="guess"
                          fields={{ ...fields, user_id: p.id }}
                          label="Choose"
                          secondary
                          confirm={`Lock in ${p.display_name} as your only guess for this round?`}
                        />
                      </div>
                    ))}
                    {args.q && !data.candidates?.length && (
                      <p>No matching participants.</p>
                    )}
                    <Pager
                      page={page}
                      hasMore={(data.candidates?.length ?? 0) > 20}
                      base="/app/reveal"
                      query={args}
                    />
                  </>
                ) : (
                  <p>{demo ? "Sign in to guess." : "Guessing closed."}</p>
                )}
              </section>
            </>
          )}
        </div>
      </>
    );
  if (section === "history")
    return (
      <>
        <PageHeading eyebrow="" title="Past rounds" />
        {data.items?.length ? (
          data.items.slice(0, 20).map((item) => {
            const e = item as Event;
            return (
              <Link
                className="history-row"
                key={e.id}
                href={`/app/dashboard?event=${e.id}`}
              >
                <span>
                  <h3>{e.title}</h3>
                  <DateLabel value={e.reveal_at} />
                </span>
                <Status value={e.status} />
                <ArrowRight size={18} />
              </Link>
            );
          })
        ) : (
          <Empty title="No past rounds" />
        )}
        <Pager
          page={page}
          hasMore={(data.items?.length ?? 0) > 20}
          base="/app/history"
        />
      </>
    );
  return (
    <>
      <PageHeading eyebrow="" title="Settings" />
      <div className="narrow">
        {data.profile.status !== "approved" && (
          <div className="notice">
            {data.profile.status === "pending"
              ? "Awaiting organizer approval."
              : "Membership inactive. Contact your organizer."}
          </div>
        )}
        {demo ? (
          <div className="paper">
            <h2>{data.profile.display_name}</h2>
            <Link className="button" href="/">
              Sign in
            </Link>
          </div>
        ) : (
          <ActionForm action="profile" label="Save preferences">
            <Field
              label="Display name"
              name="display_name"
              maxLength={60}
              defaultValue={data.profile.display_name}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="future_opt_out"
                defaultChecked={data.profile.future_opt_out}
              />
              Opt out of future rounds
            </label>
            <p className="field-hint">Your current round is unchanged.</p>
          </ActionForm>
        )}
        <section className="section">
          <div className="button-row">
            <Link className="text-link" href={href("history")}>
              Past rounds
              <ArrowRight size={16} />
            </Link>
            {data.is_admin && (
              <Link className="text-link" href="/admin/overview">
                Organizer workspace
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
          <details>
            <summary>Privacy & help</summary>
            <p>
              Only recipients can read their notes. Organizers can review
              reported notes. Contact your organizer for account help or data
              removal.
            </p>
          </details>
        </section>
      </div>
    </>
  );
}
