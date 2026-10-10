import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, Leaf } from "lucide-react";
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="lede">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Leaf size={26} strokeWidth={1.3} />
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      <span />
      {(
        {
          open: "Registration open",
          closed: "Registration closed",
          active: "Round in progress",
          completed: "Revealed",
          archived: "Archived",
        } as Record<string, string>
      )[value] ?? value}
    </span>
  );
}
export function DateLabel({
  value,
  time = false,
}: {
  value: string;
  time?: boolean;
}) {
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(time
          ? {
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short" as const,
            }
          : {}),
        timeZone: "UTC",
      }).format(new Date(value))}
    </time>
  );
}
export function Envelope() {
  return (
    <div className="envelope-art" aria-hidden="true">
      <div className="letter">
        <span>just a little</span>
        <strong>kindness.</strong>
        <Leaf size={28} strokeWidth={1.2} />
      </div>
      <div className="envelope">
        <div className="seal">
          <Mail size={17} />
        </div>
      </div>
      <span className="art-caption">FROM SOMEONE IN YOUR CORNER</span>
    </div>
  );
}
export function Pager({
  page,
  hasMore,
  base,
  query = {},
}: {
  page: number;
  hasMore: boolean;
  base: string;
  query?: Record<string, string>;
}) {
  const href = (n: number) =>
    `${base}?${new URLSearchParams({ ...query, page: String(n) })}`;
  if (page === 1 && !hasMore) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      {page > 1 ? (
        <Link className="button secondary" href={href(page - 1)}>
          <ArrowLeft size={16} />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span>Page {page}</span>
      {hasMore ? (
        <Link className="button secondary" href={href(page + 1)}>
          Next
          <ArrowRight size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
export function Field({
  label,
  name,
  type = "text",
  required = true,
  maxLength,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={
          name === "email"
            ? "email"
            : name === "password"
              ? "current-password"
              : name === "display_name"
                ? "nickname"
                : "off"
        }
      />
    </label>
  );
}
