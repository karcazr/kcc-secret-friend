"use client";
import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { useActions } from "./action-provider";
import type { ActionState } from "@/lib/types";
export function ActionForm({
  action,
  children,
  label,
  fields = {},
  confirm,
  secondary = false,
  auth = false,
}: {
  action: string;
  children?: ReactNode;
  label: string;
  fields?: Record<string, string>;
  confirm?: string;
  secondary?: boolean;
  auth?: boolean;
}) {
  const { mutate, authenticate } = useActions();
  const confirmationId = useId();
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    (auth ? authenticate : mutate).bind(null, action),
    {},
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <form
      ref={formRef}
      action={submit}
      className="action-form"
      onSubmit={(e) => {
        if (confirm && !confirmed) {
          e.preventDefault();
          dialog.current?.showModal();
        } else setConfirmed(false);
      }}
    >
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {children}
      <button
        className={secondary ? "button secondary" : "button"}
        disabled={pending}
      >
        {pending ? "Saving…" : label}
      </button>
      {state.message && (
        <div
          role={state.ok ? "status" : "alert"}
          className={`notice ${state.ok ? "success" : "error"}`}
        >
          {state.message}
        </div>
      )}
      {state.invitation && (
        <label>
          Invitation code
          <input
            readOnly
            value={state.invitation}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
      {confirm && (
        <dialog ref={dialog} aria-labelledby={confirmationId}>
          <h2 id={confirmationId}>Please confirm</h2>
          <p>{confirm}</p>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setConfirmed(true);
                dialog.current?.close();
                setTimeout(() => formRef.current?.requestSubmit(), 0);
              }}
            >
              Confirm
            </button>
          </div>
        </dialog>
      )}
    </form>
  );
}
