import Link from "next/link";
import { Brand } from "@/components/shell";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
export default function Register() {
  return (
    <div className="auth-page">
      <Brand />
      <div className="paper">
        <p className="eyebrow">YOU’RE INVITED</p>
        <h1>
          A small club.
          <br />A lot of kindness.
        </h1>
        <p>
          Use the invitation your organizer shared with you. The email must
          match your invitation.
        </p>
        <ActionForm action="register" auth label="Create my account">
          <Field name="display_name" label="Display name" maxLength={60} />
          <Field
            name="email"
            label="Email address"
            type="email"
            maxLength={254}
          />
          <Field
            name="invitation_code"
            label="Invitation code"
            maxLength={128}
          />
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <p className="field-hint">
            Use at least 12 characters. Choose a password you don’t use
            elsewhere.
          </p>
        </ActionForm>
        <p>
          Your email stays private. You’ll confirm it before your organizer
          approves your membership.
        </p>
        <Link className="text-link" href="/">
          Already a member? Sign in
        </Link>
      </div>
    </div>
  );
}
