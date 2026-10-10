import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Gift,
  Home,
  Inbox,
  ListChecks,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Megaphone,
  Flag,
  Shuffle,
} from "lucide-react";
import { SignOutButton, SkipLink } from "./action-provider";
import type { AppData } from "@/lib/types";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="KCC Secret Friend home">
      <span className="brand-mark">
        <Gift size={21} strokeWidth={1.6} />
      </span>
      <span>
        KCC<span className="brand-sub">SECRET FRIEND</span>
      </span>
    </Link>
  );
}
const studentNav = [
  ["dashboard", "Overview", Home],
  ["friend", "My Secret Friend", Gift],
  ["inbox", "Inbox", Inbox],
  ["missions", "Missions", ListChecks],
  ["reveal", "The reveal", Sparkles],
  ["history", "Past rounds", CalendarDays],
  ["profile", "Settings", Settings],
] as const;
const adminNav = [
  ["overview", "Overview", Home],
  ["participants", "Participants", Users],
  ["events", "Monthly events", CalendarDays],
  ["assignments", "Assignments", Shuffle],
  ["missions", "Missions", ListChecks],
  ["reports", "Reports", Flag],
  ["announcements", "Announcements", Megaphone],
] as const;
export function Shell({
  data,
  section,
  admin = false,
  demo = false,
  children,
}: {
  data: AppData;
  section: string;
  admin?: boolean;
  demo?: boolean;
  children: React.ReactNode;
}) {
  const nav = admin ? adminNav : studentNav;
  const href = (id: string) =>
    demo ? `/demo?section=${id}` : `/${admin ? "admin" : "app"}/${id}`;
  return (
    <div className="app-shell">
      <SkipLink />
      <aside className="sidebar">
        <Brand />
        <div className="club-label">Korean Culture Club</div>
        <nav
          aria-label={admin ? "Administration" : "Main navigation"}
          className="side-nav"
        >
          {nav.map(([id, label, Icon]) => (
            <Link
              key={id}
              href={href(id)}
              aria-current={section === id ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {section === id && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {data.is_admin && (
            <Link
              className="workspace-link"
              href={admin ? "/app/dashboard" : "/admin/overview"}
            >
              <ShieldCheck size={16} />
              {admin ? "Student view" : "Organizer workspace"}
              <ArrowUpRight size={15} />
            </Link>
          )}
          <div className="account">
            <span className="avatar tiny">
              {data.profile.display_name.slice(0, 1)}
            </span>
            <div>
              <strong>{data.profile.display_name}</strong>
              <span>
                {demo
                  ? "Preview account"
                  : admin
                    ? "Club organizer"
                    : "Club member"}
              </span>
            </div>
            {!demo && <SignOutButton />}
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span>{admin ? "ORGANIZER WORKSPACE" : "SECRET FRIEND"}</span>
          <Link
            href={demo ? "/demo?section=profile" : "/app/profile"}
            className="top-profile"
          >
            <span>{data.profile.display_name}</span>
            <span className="avatar tiny">
              {data.profile.display_name.slice(0, 1)}
            </span>
          </Link>
        </header>
        {admin && (
          <nav className="mobile-admin-links" aria-label="All organizer pages">
            {adminNav.map(([id, label]) => (
              <Link
                key={id}
                href={href(id)}
                aria-current={section === id ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
        {demo && (
          <div className="demo-banner">
            Demo · Sample data
            <Link href="/">
              Sign in <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <span>KCC Secret Friend</span>
        </footer>
      </div>
      <nav aria-label="Mobile navigation" className="bottom-nav">
        {(admin
          ? adminNav.slice(0, 5)
          : [
              studentNav[0],
              studentNav[2],
              studentNav[3],
              studentNav[4],
              studentNav[6],
            ]
        ).map(([id, label, Icon]) => (
          <Link
            key={id}
            href={href(id)}
            aria-current={section === id ? "page" : undefined}
          >
            <Icon size={20} />
            <span>
              {label === "Overview"
                ? "Home"
                : label === "The reveal"
                  ? "Reveal"
                  : label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
