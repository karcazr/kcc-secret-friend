import Link from "next/link";
import { Brand } from "@/components/shell";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
export default function Register() {
  return (
    <div className="auth-page">
      <Brand />
      <div className="paper">
        <h1>Register</h1>
        <p>Use the email linked to your invitation.</p>
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
          <p className="field-hint">At least 12 characters.</p>
        </ActionForm>
        <p>Email confirmation and organizer approval required.</p>
        <Link className="text-link" href="/">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
