// Authored line icons: 24px grid, 2px rounded stroke, currentColor. Decorative unless labelled.
import type { SVGProps } from "react";

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

/* Pictograms for the low-literacy mode: larger, friendlier forms on the same stroke */
export const PictoChest = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3.5c-2 1.5-3.5 4-3.5 7.5 0 5 2.5 9.5 7.5 9.5s7.5-4.5 7.5-9.5c0-3.5-1.5-6-3.5-7.5" />
    <path d="M12 6v14M8.5 10c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5" />
  </Icon>
);
export const PictoBreath = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7" />
  </Icon>
);
export const PictoCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M8 3v4M16 3v4M3.5 10h17M8.5 14.5h2M13.5 14.5h2" />
  </Icon>
);
export const PictoPain = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 3L6 13h5l-1 8 8-11h-5z" />
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

/* Guided-question pictograms (same 2px rounded stroke) */
export const PictoHead = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="M8 15.5V21M16 15.5V21" />
  </Icon>
);
export const PictoStomach = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3c-1.2 3-2.2 5.5-2.2 9.5 0 5 2.6 8.5 6.2 8.5s6.2-3.5 6.2-8.5C18.2 8.5 17.2 6 16 3" />
    <circle cx="12" cy="13.5" r="2.6" />
  </Icon>
);
export const PictoBack = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v18M9 6h6M8.5 10h7M8.5 14h7M9 18h6" />
  </Icon>
);
export const PictoArm = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 15.5h6.5l4.5-6.2a2.6 2.6 0 0 1 4.3 2.9L14.6 18a3 3 0 0 1-2.5 1.3H3.5z" />
    <path d="M17 8l1.5-3" />
  </Icon>
);
export const PictoLeg = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 3h5l-.6 9.5.9 6H19a1.5 1.5 0 0 1 1.5 1.5v1H11l-.8-7.5L9.5 3z" />
  </Icon>
);
export const PictoClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);
export const PictoMove = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="13" cy="4.5" r="2" />
    <path d="M10 21l2-6 3 3v3M7 12l3-4 4 1 3 3M12 15l-2-4" />
  </Icon>
);
export const PictoEat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 21V3c-2 1-3 4-3 7h3" />
  </Icon>
);
export const PictoNone = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M6 18L18 6" />
  </Icon>
);
export const PictoFever = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z" />
    <path d="M12 11v6" />
  </Icon>
);
export const PictoNausea = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 10h.01M15.5 10h.01M8 16c1.5-1.5 2.5-1.5 4 0s2.5 1.5 4 0" />
  </Icon>
);
export const PictoDizzy = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 12a1.5 1.5 0 1 1 1.5 1.5A3.5 3.5 0 1 1 17 10a5.5 5.5 0 1 1-5.5-5.5" />
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
