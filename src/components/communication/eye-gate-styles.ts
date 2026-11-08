// Styles for the Eye control setup screen, rendered inside the component (see EyeGateStyles) rather than
// shipped in a stylesheet. The screen is the first thing a patient and clinician see on /icu; if its
// stylesheet were ever out of step with its markup (a browser holding an old copy while developing) it
// would show as plain unstyled text. Styles that travel with the markup cannot be out of step.
export const GATE_CSS = `
/* Eye control setup gate: full screen, one giant button for the clinician, then 3-2-1. */
.sf-icu-gate {
  position: fixed;
  inset: 0;
  z-index: 65;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
  text-align: center;
  color: #fff;
  background: rgb(16 30 52 / 0.96);
}
.sf-icu-gate-label {
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 700;
  color: #fff;
}
.sf-icu-gate-note {
  max-width: 34rem;
  font-size: 1.15rem;
  line-height: 1.5;
  color: #b9c9db;
}
.sf-icu-gate-error {
  max-width: 34rem;
  padding: 12px 16px;
  border-radius: 16px;
  font-weight: 600;
  background: #fff;
  color: #7a0a1a;
}
.sc-root .sf-icu-gate .sf-icu-gate-btn {
  display: grid;
  place-items: center;
  width: min(78vw, 56vh, 26rem);
  aspect-ratio: 1;
  border-radius: 9999px;
  font-size: clamp(2.4rem, 8vw, 4rem);
  font-weight: 800;
  background: #77a0c4;
  color: #101e34;
  box-shadow: 0 24px 60px -18px rgb(0 0 0 / 0.55);
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms;
}
.sc-root .sf-icu-gate .sf-icu-gate-btn:hover {
  background: #8fb2d1;
}
.sc-root .sf-icu-gate .sf-icu-gate-btn:active {
  transform: scale(0.97);
}
.sf-icu-gate-btn:focus-visible,
.sf-icu-gate-quiet:focus-visible {
  outline: 4px solid #fff;
  outline-offset: 4px;
}
.sf-icu-gate-count {
  font-size: clamp(9rem, 38vw, 18rem);
  line-height: 1;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  animation: sf-gate-tick 1s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes sf-gate-tick {
  from {
    opacity: 0.2;
    transform: scale(1.25);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.sc-root .sf-icu-gate .sf-icu-gate-quiet {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  min-height: 48px;
  padding: 0 20px;
  border-radius: 9999px;
  font-weight: 600;
  background: transparent;
  color: #b9c9db;
  box-shadow: inset 0 0 0 1px rgb(185 201 219 / 0.4);
}
.sc-root .sf-icu-gate .sf-icu-gate-quiet:hover {
  background: rgb(255 255 255 / 0.08);
  color: #fff;
}
@media (prefers-reduced-motion: reduce) {
  .sf-icu-gate-count {
    animation: none;
  }
  .sf-icu-gate-btn {
    transition: none;
  }
}
`;
