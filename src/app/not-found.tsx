import Link from "next/link";
export default function NotFound() {
  return (
    <div className="error-page">
      <h1>This page isn’t here.</h1>
      <p>Let’s get you back to the club.</p>
      <Link className="button" href="/">
        Back to home
      </Link>
    </div>
  );
}
