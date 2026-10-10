"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <h1>Something didn’t come through.</h1>
      <p>Your changes may not have been saved. Try loading the page again.</p>
      <div className="button-row">
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link className="button secondary" href="/">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
