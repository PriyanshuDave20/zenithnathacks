// Authored line icons: 24px grid, 2px rounded stroke, currentColor. Decorative unless labelled.
import type { SVGProps } from "react";

// Pictograms come from Akash's asset sheet (filled artwork, not line icons).
export * from "./asset-pictograms";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
export const ArrowDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Icon>
);
export const Check = (p: IconProps) => (
  <Icon {...p} strokeWidth={2.6}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
export const Mic = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Icon>
);
export const Speaker = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Icon>
);
export const Pause = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6v12M15 6v12" />
  </Icon>
);
export const Play = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5.5v13l10.5-6.5z" />
  </Icon>
);
export const Handoff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <path d="M19 9l2 2-2 2M21 11h-5" />
  </Icon>
);
export const Shield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" />
    <path d="M8.8 12l2.2 2.2 4.3-4.4" />
  </Icon>
);
export const Clear = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Icon>
);
export const Keyboard = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
  </Icon>
);
export const Captions = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6" />
  </Icon>
);

export const IdMasked = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6.5 16c.6-1.2 1.5-1.8 2.5-1.8s1.9.6 2.5 1.8M14 10h4M14 13h3M4 20L20 4" />
  </Icon>
);


/* Session flow: navigation and status */
export const ArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);
export const Stop = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
  </Icon>
);
export const Alert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17.2h.01" />
  </Icon>
);
export const Repeat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5" />
  </Icon>
);
export const Send = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12l16-8-6 16-2.5-6.5z" />
  </Icon>
);

export const Cross = (p: IconProps) => (
  <Icon {...p} strokeWidth={2.6}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
);
export const Question = (p: IconProps) => (
  <Icon {...p} strokeWidth={2.6}>
    <path d="M9 9a3 3 0 1 1 4.2 2.75c-.75.33-1.2 1.07-1.2 1.9V14.5" />
    <path d="M12 18.4h.01" />
  </Icon>
);
