import type { AppData } from "./types";
export function demoData(): AppData {
  const now = new Date();
  const reveal = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 20),
  );
  const data: AppData = {
    profile: {
      id: "demo",
      display_name: "Jamie",
      status: "approved",
      future_opt_out: false,
    },
    is_admin: false,
    event: {
      id: "demo-event",
      title: `${now.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} Secret Friend`,
      status: "active",
      reveal_at: reveal.toISOString(),
    },
    participation: { withdrawn: false },
    friend: { display_name: "Alex Morgan", withdrawn: false },
    missions: [
      {
        id: "m1",
        title: "Send encouragement",
        description: "A few thoughtful words can turn a day around.",
        completed: true,
      },
      {
        id: "m2",
        title: "Give a compliment",
        description: "Share a compliment that comes from the heart.",
        completed: false,
      },
      {
        id: "m3",
        title: "Share a cultural fact",
        description: "A tradition, a new discovery, or a favorite fact.",
        completed: false,
      },
    ],
    messages: [
      {
        id: "note1",
        body: "Just a reminder that you bring something good to this club. Hope this week treats you well!",
        created_at: now.toISOString(),
        reported: false,
      },
    ],
    announcements: [
      {
        id: "notice1",
        title: "This month",
        body: "No gifts needed. A kind note is enough.",
        created_at: now.toISOString(),
      },
    ],
    guess: null,
  };
  return data;
}
