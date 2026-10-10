import Link from "next/link";
import { ArrowRight, LockKeyhole, Heart, Users } from "lucide-react";
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
          <p className="eyebrow">ONE CONNECTION. A MONTH OF KINDNESS.</p>
          <h1>
            Be someone’s
            <br />
            quiet <em>cheerleader.</em>
          </h1>
          <p className="welcome-lede">
            A thoughtful note. A little encouragement. A friend who’s in your
            corner, even if you don’t know it yet.
          </p>
          <Envelope />
          <div className="welcome-principles">
            <span>
              <LockKeyhole size={16} />A shared secret
            </span>
            <span>
              <Heart size={16} />
              Small gestures
            </span>
            <span>
              <Users size={16} />A closer club
            </span>
          </div>
        </section>
        <section className="signin-panel">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>
            Your next connection
            <br />
            starts here.
          </h2>
          <p>Sign in to your KCC Secret Friend account.</p>
          {!ready && (
            <div className="notice">
              Setup is in progress. Connect Supabase to enable accounts and real
              rounds. You can explore the sample round below.
            </div>
          )}
          {confirmation === "failed" && (
            <div className="notice error">
              That confirmation link expired or could not be verified. Try
              signing in or contact your organizer.
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
            New to the club?{" "}
            <Link href="/register">
              Join with an invitation
              <ArrowRight size={14} />
            </Link>
          </p>
          <div className="signin-footer">
            <Link href="/demo">
              Take a look around
              <ArrowRight size={15} />
            </Link>
            <span>A fictional sample round. No account needed.</span>
          </div>
        </section>
      </main>
      <footer className="welcome-footer">
        <p>
          Inspired by Manitto (마니또), the Korean tradition of being someone’s
          secret supporter.
        </p>
        <span>Kindness doesn’t have a price tag.</span>
      </footer>
    </div>
  );
}
