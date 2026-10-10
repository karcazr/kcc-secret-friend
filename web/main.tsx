import { createRoot } from "react-dom/client";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActionProvider } from "../src/components/action-provider";
import { Shell } from "../src/components/shell";
import { StudentView } from "../src/components/student";
import { AdminView } from "../src/components/admin";
import { WelcomeView } from "../src/components/welcome";
import Register from "../src/app/register/page";
import Loading from "../src/app/loading";
import NotFound from "../src/app/not-found";
import { demoData } from "../src/lib/demo";
import type { AppData } from "../src/lib/types";
import { browserActions, db, navigate } from "./api";
import "../src/app/globals.css";

const studentSections = [
  "dashboard",
  "friend",
  "inbox",
  "send",
  "missions",
  "reveal",
  "profile",
  "join",
  "history",
];
const adminSections = [
  "overview",
  "participants",
  "events",
  "assignments",
  "missions",
  "reports",
  "announcements",
];
function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    route: string;
    data: AppData;
  } | null>(null);
  const [error, setError] = useState("");
  const url = new URL(route, location.origin),
    path = url.pathname;
  const args = Object.fromEntries(url.searchParams);
  args.page = String(
    Math.max(1, Math.min(2147483647, parseInt(args.page || "1") || 1)),
  );
  const section = path.split("/")[2] || "dashboard",
    admin = path.startsWith("/admin/");
  const privateRoute = path.startsWith("/app/") || admin;
  const actions = useMemo(
    () => browserActions(() => setRevision((r) => r + 1)),
    [],
  );
  useEffect(() => {
    const update = () => {
      setRoute(location.hash.slice(1) || "/");
      setError("");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    if (!db) return;
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSnapshot(null);
        navigate("/");
      }
      if (
        event === "SIGNED_IN" &&
        new URLSearchParams(location.search).has("code")
      ) {
        history.replaceState(null, "", location.pathname);
        navigate("/app/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!privateRoute) return;
    if (!db) {
      navigate("/");
      return;
    }
    if (!(admin ? adminSections : studentSections).includes(section)) return;
    let live = true;
    async function load() {
      const {
        data: { user },
      } = await db!.auth.getUser();
      if (!live) return;
      if (!user) {
        navigate("/");
        return;
      }
      const profile = await db!.rpc("app_read", { p_section: "profile" });
      if (profile.error)
        throw new Error(
          "Your profile could not be loaded. Contact your organizer.",
        );
      if (profile.data.profile.status !== "approved" && section !== "profile") {
        navigate("/app/profile");
        return;
      }
      if (admin && !profile.data.is_admin) {
        navigate("/app/dashboard");
        return;
      }
      const result = await db!.rpc("app_read", {
        p_section: admin ? `admin-${section}` : section,
        p_args: args,
      });
      if (result.error)
        throw new Error(
          "This page could not be loaded. Refresh or contact your organizer.",
        );
      if (live) {
        setSnapshot({ route, data: result.data });
        setError("");
      }
    }
    load().catch((e) => {
      if (live) setError(e.message);
    });
    return () => {
      live = false;
    };
    // route includes all filters; refresh is triggered after every mutation.
  }, [route, revision, privateRoute, admin, section]);
  let content: ReactNode;
  if (path === "/") content = <WelcomeView ready={Boolean(db)} />;
  else if (path === "/register") content = <Register />;
  else if (path === "/demo") {
    const demoSection = args.section || "dashboard";
    const data = demoData();
    content = studentSections.includes(demoSection) ? (
      <Shell data={data} section={demoSection} demo>
        <StudentView data={data} section={demoSection} demo />
      </Shell>
    ) : (
      <NotFound />
    );
  } else if (
    privateRoute &&
    (admin ? adminSections : studentSections).includes(section)
  ) {
    content = error ? (
      <div className="error-page">
        <h1>Something didn’t come through.</h1>
        <p role="alert">{error}</p>
        <button
          className="button"
          onClick={() => {
            setError("");
            setRevision((r) => r + 1);
          }}
        >
          Try again
        </button>
      </div>
    ) : snapshot?.route === route ? (
      <Shell data={snapshot.data} section={section} admin={admin}>
        {admin ? (
          <AdminView data={snapshot.data} section={section} args={args} />
        ) : (
          <StudentView data={snapshot.data} section={section} args={args} />
        )}
      </Shell>
    ) : (
      <Loading />
    );
  } else content = <NotFound />;
  return (
    <ActionProvider actions={actions}>
      <div
        onSubmitCapture={(e) => {
          const form = e.target as HTMLFormElement;
          // Preserve native GET filter forms in hash routing; mutation forms use React actions.
          if (
            form.method === "get" &&
            !form.classList.contains("action-form")
          ) {
            e.preventDefault();
            navigate(
              `${path}?${new URLSearchParams(new FormData(form) as never)}`,
            );
          }
        }}
      >
        {content}
      </div>
    </ActionProvider>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="error-page">
        <h1>Let’s try that again.</h1>
        <p>The page could not load.</p>
        <button className="button" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App />
  </Boundary>,
);
