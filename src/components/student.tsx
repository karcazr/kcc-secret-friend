import Link from "next/link";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Send,
  CalendarDays,
  Mail,
  Heart,
  ArrowUpRight,
} from "lucide-react";
import type { AppData, Event } from "@/lib/types";
import { ActionForm } from "./action-form";
import {
  DateLabel,
  Empty,
  Envelope,
  Field,
  PageHeading,
  Pager,
  Status,
} from "./ui";

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
        {event?.status === "open"
          ? "A new connection starts here."
          : "You’re between rounds."}
      </h2>
      <p>
        {event?.status === "open"
          ? "Join this month’s round to be someone’s quiet supporter."
          : "Your organizer will share the next round soon."}
      </p>
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
        <p className="eyebrow">
          <LockKeyhole size={13} /> JUST BETWEEN US
        </p>
        <h2>Your Secret Friend</h2>
        {data.friend ? (
          <>
            <div className="friend-name">
              <span className="avatar">
                {data.friend.display_name.slice(0, 1)}
              </span>
              <strong>{data.friend.display_name}</strong>
            </div>
            <p>
              You’re {data.friend.display_name.split(" ")[0]}’s Secret Friend
              this month.
              <br />A small gesture can make their whole day.
            </p>
            {data.friend.withdrawn || data.participation?.withdrawn ? (
              <p className="notice">
                This relationship is paused. Contact your organizer for support.
              </p>
            ) : (
              <Link className="button" href={href("send")}>
                <Send size={16} />
                Send a little encouragement
                <ArrowUpRight size={16} />
              </Link>
            )}
          </>
        ) : (
          <>
            <p>
              {data.participation
                ? "You’re on the list. Your connection will appear when the round starts."
                : "Join a round to meet your Secret Friend."}
            </p>
            <Link className="button" href={href("join")}>
              View registration
              <ArrowRight size={16} />
            </Link>
          </>
        )}
      </div>
      <Envelope />
      <div className="hero-foot">
        <LockKeyhole size={13} />
        Your identity stays secret until the organizer reveals the round.
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
              <p>{m.description}</p>
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
        <Empty title="Room for something thoughtful">
          <p>Your organizer will add missions here.</p>
        </Empty>
      )}
    </div>
  );

  if (section === "dashboard")
    return (
      <>
        <PageHeading
          eyebrow={event?.title ?? "WELCOME TO THE CLUB"}
          title={`A little kindness, ${data.profile.display_name.split(" ")[0]}.`}
          description="One person to cheer on. A whole month to make it count."
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
                    <h2>This month’s missions</h2>
                    <Link href={href("missions")}>
                      View all
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                  <p className="section-subtitle">
                    No grand gestures needed. Start small.
                  </p>
                  {missionList(true)}
                </section>
                <section className="section">
                  <div className="section-head">
                    <h2>A note for you</h2>
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
                    <Empty title="Good things find their way here">
                      <p>Your anonymous notes will appear in your inbox.</p>
                    </Empty>
                  )}
                </section>
              </div>
              <aside>
                <section className="reveal-teaser">
                  <div className="section-head">
                    <span className="eyebrow">THE BIG REVEAL</span>
                    <CalendarDays size={19} />
                  </div>
                  <h2>
                    {["completed", "archived"].includes(event.status)
                      ? "The secret is out."
                      : "Every secret has its day."}
                  </h2>
                  <p>Find out who’s been in your corner.</p>
                  <strong className="reveal-date">
                    <DateLabel value={event.reveal_at} />
                  </strong>
                  <p className="countdown">
                    {event.status === "active"
                      ? `${Math.max(0, Math.ceil((new Date(event.reveal_at).getTime() - Date.now()) / 86400000))} days to the planned reveal`
                      : "The organizer controls when identities are revealed."}
                  </p>
                  <Link href={href("reveal")}>
                    Visit the reveal
                    <ArrowRight size={16} />
                  </Link>
                </section>
                <section className="section">
                  <p className="eyebrow">CLUB NOTICEBOARD</p>
                  {data.announcements?.length ? (
                    data.announcements.slice(0, 3).map((a) => (
                      <article className="announcement" key={a.id}>
                        <h3>{a.title}</h3>
                        <p>{a.body}</p>
                        <DateLabel value={a.created_at} />
                      </article>
                    ))
                  ) : (
                    <p className="muted">
                      You’re all caught up. Announcements will appear here.
                    </p>
                  )}
                </section>
                <p className="gentle-note">
                  <Heart size={17} />
                  Thoughtfulness doesn’t have a price tag.
                </p>
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
        <PageHeading
          eyebrow="YOUR CONNECTION"
          title="Someone to look out for."
          description="Keep it simple. Keep it kind. Keep it a secret."
        />
        {friend}
        <section className="section">
          <h2>What makes a good Secret Friend?</h2>
          <div className="three-up">
            <div>
              <span className="eyebrow">01 / NOTICE</span>
              <h3>The little things matter.</h3>
              <p>A kind word before a busy week can go a long way.</p>
            </div>
            <div>
              <span className="eyebrow">02 / ENCOURAGE</span>
              <h3>Make it personal, stay anonymous.</h3>
              <p>Leave your name and identifying details out of your notes.</p>
            </div>
            <div>
              <span className="eyebrow">03 / RESPECT</span>
              <h3>Kindness without pressure.</h3>
              <p>No gifts, money, or personal information required.</p>
            </div>
          </div>
        </section>
      </>
    );
  if (section === "join")
    return (
      <>
        <PageHeading
          eyebrow={event?.title ?? "MONTHLY REGISTRATION"}
          title="Count me in."
          description="Each round is a fresh chance to brighten someone’s month."
        />
        {event && <Status value={event.status} />}
        <div className="narrow section">
          {data.participation ? (
            <>
              <h2>You’re registered.</h2>
              <p>
                {data.participation.withdrawn
                  ? "Your participation is paused."
                  : "Your organizer will let you know when the round starts."}
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
                <p>
                  To withdraw after registration closes, contact your club
                  organizer. They can pause participation without breaking the
                  round.
                </p>
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
          eyebrow="A SMALL GESTURE"
          title="Put a little good into words."
          description={
            data.friend
              ? `An anonymous note for ${data.friend.display_name}.`
              : "Your friend will appear when the round begins."
          }
        />
        <div className="compose-layout">
          <div className="paper">
            <div className="paper-heading">
              <Mail size={20} />
              <span>FROM YOUR SECRET FRIEND</span>
              <LockKeyhole size={16} />
            </div>
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
                    placeholder="Something you appreciate. A little encouragement. A reason to smile."
                  />
                </label>
                <p className="field-hint">
                  Up to 2,000 characters. Your name is never attached.
                </p>
              </ActionForm>
            ) : (
              <Empty
                title={
                  demo
                    ? "You’re viewing a sample round"
                    : "Messaging is not available right now"
                }
              >
                <p>
                  {demo
                    ? "Sign in to send a note in your real round."
                    : "Messages open during active rounds. Paused relationships cannot exchange notes."}
                </p>
                {demo && (
                  <Link className="button" href="/">
                    Sign in to send
                  </Link>
                )}
              </Empty>
            )}
          </div>
          <aside className="writing-tips">
            <p className="eyebrow">A NOTE WORTH RECEIVING</p>
            <h2>Kind. Simple. You.</h2>
            <p>“You brought such good energy to our last meeting.”</p>
            <p>“Good luck this week. You’ve got this.”</p>
            <hr />
            <p>
              Keep personal details private. Never share contact information or
              pressure someone to reply.
            </p>
          </aside>
        </div>
      </>
    );
  if (section === "inbox")
    return (
      <>
        <PageHeading
          eyebrow={event?.title ?? "YOUR INBOX"}
          title="Someone’s in your corner."
          description="Little notes, from your Secret Friend to you."
        />
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
                    <span>Reported to an organizer</span>
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
                            Only this reported message will be shared with
                            organizers.
                          </p>
                        </ActionForm>
                      </details>
                    )
                  )}
                </div>
              </article>
            ))
          ) : (
            <Empty title="Your first note is on its way">
              <p>Messages from your Secret Friend will appear here.</p>
            </Empty>
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
          title="Small acts. Real impact."
          description="A few ideas to get you started. No competition, no spending."
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
          title={
            data.sender ? "So, it was you." : "A good secret is worth the wait."
          }
          description={
            event
              ? `Planned reveal: ${new Date(event.reveal_at).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}. Your organizer will open the reveal.`
              : "Your next round is on its way."
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
              <p>The person quietly cheering you on this month.</p>
              {data.guess && (
                <p>
                  {data.sender.correct
                    ? "You guessed it!"
                    : "A lovely surprise."}{" "}
                  Your guess was {data.guess}.
                </p>
              )}
              <Link href={href("inbox")} className="button secondary">
                Revisit your notes
                <ArrowRight size={16} />
              </Link>
            </section>
          ) : (
            <>
              <section className="reveal-teaser">
                <LockKeyhole size={25} />
                <h2>Any guesses?</h2>
                <p>
                  You get one guess before the planned reveal time. We’ll keep
                  your answer safe until the reveal.
                </p>
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
                        Search this round’s participants
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
                  <p>
                    {demo
                      ? "Sign in to make your guess in a real round."
                      : "Guessing is currently closed."}
                  </p>
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
        <PageHeading
          eyebrow="PAST CONNECTIONS"
          title="A little kindness stays with you."
          description="Return to your notes, missions, and reveals from earlier rounds."
        />
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
          <Empty title="Your story starts here">
            <p>Rounds you join will be saved here.</p>
          </Empty>
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
      <PageHeading
        eyebrow="YOUR ACCOUNT"
        title="Make yourself at home."
        description="Only the essentials. Your email is never shown to other students."
      />
      <div className="narrow">
        {data.profile.status !== "approved" && (
          <div className="notice">
            {data.profile.status === "pending"
              ? "Your email is confirmed. An organizer still needs to approve your club membership."
              : "Your membership is inactive. Contact your organizer for help."}
          </div>
        )}
        {demo ? (
          <div className="paper">
            <h2>{data.profile.display_name}</h2>
            <p>This is a fictional preview account.</p>
            <Link className="button" href="/">
              Sign in to manage your account
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
              Opt out of joining future rounds
            </label>
            <p className="field-hint">
              This does not withdraw you from a round you already joined.
              Joining each new round is always your choice.
            </p>
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
          <h2>Your privacy matters.</h2>
          <p>
            Your notes are visible to their recipient. Organizers can read only
            messages that have been reported. Assignments stay secret until the
            reveal.
          </p>
          <p>
            For account help, withdrawal, or a request to remove your data,
            contact your club organizer.
          </p>
        </section>
      </div>
    </>
  );
}
