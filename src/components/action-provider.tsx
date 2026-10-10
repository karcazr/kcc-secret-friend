"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { ActionState } from "@/lib/types";
import { LogOut } from "lucide-react";
export type Actions = {
  mutate: (
    action: string,
    state: ActionState,
    form: FormData,
  ) => Promise<ActionState>;
  authenticate: (
    action: string,
    state: ActionState,
    form: FormData,
  ) => Promise<ActionState>;
  signOut: () => Promise<void>;
};
const Context = createContext<Actions | null>(null);
export function ActionProvider({
  actions,
  children,
}: {
  actions: Actions;
  children: ReactNode;
}) {
  return <Context.Provider value={actions}>{children}</Context.Provider>;
}
export function useActions() {
  const actions = useContext(Context);
  if (!actions) throw new Error("Action provider is missing.");
  return actions;
}
export function SignOutButton() {
  const { signOut } = useActions();
  return (
    <button
      className="icon-button"
      aria-label="Sign out"
      onClick={() => void signOut()}
    >
      <LogOut size={17} />
    </button>
  );
}
export function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#main"
      onClick={(event) => {
        event.preventDefault();
        document.getElementById("main")?.focus();
        document.getElementById("main")?.scrollIntoView();
      }}
    >
      Skip to content
    </a>
  );
}
