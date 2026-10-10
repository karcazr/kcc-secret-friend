export type Event = {
  id: string;
  title: string;
  status: "open" | "closed" | "active" | "completed" | "archived";
  reveal_at: string;
  revealed_at?: string;
};
export type Mission = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};
export type Note = {
  id: string;
  body: string;
  created_at: string;
  reported: boolean;
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};
export type Person = {
  withdrawn: boolean;
  id: string;
  display_name: string;
  status: string;
  joined: boolean;
  future_opt_out: boolean;
  created_at: string;
};
export type Report = {
  id: string;
  body: string;
  reason: string;
  status: string;
  created_at: string;
};
export type AppData = {
  profile: {
    id: string;
    display_name: string;
    future_opt_out: boolean;
    status: string;
  };
  is_admin: boolean;
  event?: Event | null;
  participation?: { withdrawn: boolean } | null;
  friend?: { display_name: string; withdrawn: boolean } | null;
  missions?: Mission[];
  messages?: Note[];
  announcements?: Announcement[];
  guess?: string | null;
  sender?: { display_name: string; correct: boolean | null } | null;
  candidates?: { id: string; display_name: string }[];
  items?: (Person | Event | Report)[];
  total?: number;
  stats?: {
    members: number;
    pending: number;
    participants: number;
    assignments: number;
    withdrawn: number;
    reports: number;
  };
};
export type ActionState = {
  ok?: boolean;
  message?: string;
  invitation?: string;
};
