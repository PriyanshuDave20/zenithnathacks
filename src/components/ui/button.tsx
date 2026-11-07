import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "outline";
  width?: "responsive" | "full";
  icon?: ReactNode;
  trailing?: ReactNode;
};

const variants = {
  primary: "min-h-14 gap-2.5 bg-blue-deep px-7 text-lg text-white shadow-lift enabled:hover:bg-blue-deeper disabled:bg-line disabled:text-ink-soft disabled:shadow-none",
  quiet: "min-h-12 gap-2 px-5 text-base text-blue-deeper ring-1 ring-line enabled:hover:bg-blue-soft enabled:hover:ring-blue-soft disabled:opacity-50",
  outline: "min-h-14 gap-3 bg-surface px-7 text-lg text-ink ring-1 ring-line enabled:hover:ring-ink-soft disabled:opacity-50",
};

/** Native button semantics; responsive actions fill phones and size to content on larger screens. */
export function Button({ variant = "primary", width = "responsive", icon, trailing, children, className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`press inline-flex w-full items-center justify-center rounded-full py-2 font-semibold disabled:cursor-not-allowed ${width === "responsive" ? "sm:w-auto" : ""} ${variants[variant]} ${className}`}
    >
      {icon ? <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span> : null}
      <span className="min-w-0">{children}</span>
      {trailing ? <span aria-hidden="true" className="inline-flex shrink-0">{trailing}</span> : null}
    </button>
  );
}
