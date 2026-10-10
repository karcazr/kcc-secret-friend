import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/shell";
import { ActionForm } from "@/components/action-form";
import { Envelope, Field } from "@/components/ui";

export function WelcomeView({
  ready,
  confirmation,
}: {
  ready: boolean;
  confirmation?: string;
}) {
  return (
    <div className="welcome">
      <header className="welcome-header">
        <Brand />
        <span>KOREAN CULTURE CLUB</span>
      </header>
      <main className="welcome-main">
        <section className="welcome-story">
          <h1>
            Secret
            <br />
            <em>Friend.</em>
          </h1>
          <p className="welcome-lede">Your monthly Manitto.</p>
          <Envelope />
        </section>
        <section className="signin-panel">
          <h2>Sign in</h2>
          {!ready && (
            <div className="notice">
              Accounts aren’t available yet. Explore the demo below.
            </div>
          )}
          {confirmation === "failed" && (
            <div className="notice error">
              Confirmation link expired. Contact your organizer.
            </div>
          )}
          <ActionForm action="signin" auth label="Sign in">
            <Field
              name="email"
              label="Email address"
              type="email"
              maxLength={254}
            />
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete="current-password"
              />
            </label>
          </ActionForm>
          <p className="signup-link">
            <Link href="/register">
              Have an invitation? Register
              <ArrowRight size={14} />
            </Link>
          </p>
          <div className="signin-footer">
            <Link href="/demo">
              View demo
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="welcome-footer">
        <span>Korean Culture Club</span>
      </footer>
    </div>
  );
}
