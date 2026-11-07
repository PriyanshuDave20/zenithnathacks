/** Decorative ring: pair with visible status text; motion preferences are respected. */
export function SpinnerIcon({ inverse = false }: { inverse?: boolean }) {
  return <span aria-hidden="true" className={`inline-block size-5 shrink-0 animate-spin rounded-full border-[3px] motion-reduce:animate-none ${inverse ? "border-white/40 border-t-white" : "border-line border-t-blue-deep"}`} />;
}

export function LoadingStatus({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-3 text-lg font-semibold text-ink-soft">
      <SpinnerIcon />
      {label}
    </span>
  );
}
