---
name: Synapse
description: A calm, rounded communication aid in Synapse navy, light blue and white, where chat bubbles carry the conversation and form, never hue alone, carries state.
colors:
  navy: "#101e34"
  navy-raised: "#1b2c47"
  blue: "#77a0c4"
  blue-deep: "#2d5f8b"
  blue-deeper: "#1f4a70"
  blue-soft: "#e6eef6"
  ground: "#ffffff"
  ground-2: "#eef3f8"
  surface: "#ffffff"
  ink: "#101e34"
  ink-soft: "#4a6380"
  line: "#d5e0eb"
  on-navy-soft: "#b9c9db"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.9rem, 11vw, 5.25rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  sheet-text:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Noto Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Noto Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
  screen-title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 6.5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  handoff-line:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 7vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.05
  section-label:
    fontFamily: "Noto Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  pill: "9999px"
  bubble-sm: "1.75rem"
  bubble: "1.9rem"
  sheet: "2rem"
  sheet-lg: "2.25rem"
  tail: "0.5rem"
  device: "3rem"
  device-screen: "2.4rem"
  inset: "1.25rem"
  field: "1.5rem"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "64px"
  section-lg: "96px"
components:
  button-primary:
    backgroundColor: "{colors.blue-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "8px 10px 8px 32px"
  button-primary-hover:
    backgroundColor: "{colors.blue-deeper}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.blue-deeper}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 20px"
  button-quiet-hover:
    backgroundColor: "{colors.blue-soft}"
  choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  choice-selected:
    backgroundColor: "{colors.blue-deep}"
    textColor: "#ffffff"
  segmented-track:
    backgroundColor: "{colors.ground-2}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-thumb:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  pill-asked:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  pill-pending:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  pill-remembered:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  pill-confirmed:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue-deeper}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  bubble-tint:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "24px"
  sheet-quiet:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet-lg}"
    padding: "32px"
  bubble-clinician:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.bubble}"
    padding: "16px 20px"
  header:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
  button-primary-on-navy:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "8px 10px 8px 32px"
  button-primary-on-navy-hover:
    backgroundColor: "#ffffff"
  header-start:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 20px"
  header-start-hover:
    backgroundColor: "{colors.navy-raised}"
    textColor: "#ffffff"
  header-link:
    textColor: "{colors.on-navy-soft}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  holder-chip-clinician:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  holder-chip-clinician-on-navy:
    backgroundColor: "{colors.navy-raised}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  holder-chip-patient:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue-deeper}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  phone-frame:
    backgroundColor: "{colors.navy-raised}"
    rounded: "{rounded.device}"
    padding: "10px"
    width: "20.5rem"
  phone-screen:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.device-screen}"
    height: "38rem"
  mode-tabs-track:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "6px"
  mode-tab:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    height: "48px"
  mode-tab-selected:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
  summary-field:
    backgroundColor: "{colors.navy-raised}"
    textColor: "#ffffff"
    rounded: "{rounded.inset}"
    padding: "16px"
  session-bar:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    height: "64px"
  session-clear:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 16px"
  session-clear-hover:
    backgroundColor: "{colors.navy-raised}"
    textColor: "#ffffff"
  session-clear-now:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 16px"
  session-clear-now-hover:
    backgroundColor: "#ffffff"
  action-bar:
    backgroundColor: "{colors.ground}"
    padding: "16px"
  button-primary-session:
    backgroundColor: "{colors.blue-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 28px"
  button-primary-session-hover:
    backgroundColor: "{colors.blue-deeper}"
  button-primary-session-disabled:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink-soft}"
  button-quiet-session:
    backgroundColor: "transparent"
    textColor: "{colors.blue-deeper}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 20px"
  button-quiet-session-hover:
    backgroundColor: "{colors.blue-soft}"
  button-read-aloud:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue-deeper}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 20px"
  button-read-aloud-hover:
    backgroundColor: "{colors.ground-2}"
  button-mic:
    backgroundColor: "{colors.blue-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    size: "128px"
  button-mic-listening:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
  button-ritual:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 32px"
  button-ritual-hover:
    backgroundColor: "#ffffff"
  choice-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 20px"
  choice-pill-selected:
    backgroundColor: "{colors.blue-deep}"
    textColor: "#ffffff"
  picture-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bubble-sm}"
    padding: "16px"
    height: "128px"
  picture-tile-selected:
    backgroundColor: "{colors.blue-deep}"
    textColor: "#ffffff"
  scale-circle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "56px"
  scale-circle-selected:
    backgroundColor: "{colors.blue-deep}"
    textColor: "#ffffff"
  progress-segment:
    backgroundColor: "{colors.blue-deep}"
    rounded: "{rounded.pill}"
    height: "6px"
  progress-segment-ahead:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.pill}"
    height: "6px"
  speech-bubble-patient:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bubble}"
    padding: "16px 20px"
  speech-bubble-readback:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bubble}"
    padding: "16px 20px"
  handoff-screen:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
  handoff-disc:
    backgroundColor: "{colors.navy-raised}"
    textColor: "{colors.blue}"
    rounded: "{rounded.pill}"
    size: "96px"
  summary-sheet:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.sheet}"
    padding: "24px"
  red-flag-block:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.navy}"
    rounded: "{rounded.inset}"
    padding: "16px"
  red-flag-chip:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
  check-block:
    backgroundColor: "{colors.navy-raised}"
    textColor: "#ffffff"
    rounded: "{rounded.inset}"
    padding: "16px"
  source-card:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bubble-sm}"
    padding: "20px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "20px"
  notice:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.field}"
    padding: "20px"
  idle-warning:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.bubble-sm}"
    padding: "20px"
  toast:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
---

# Design System: Synapse

## Overview

**Creative North Star: "The Steady Signal"**

Synapse is a conversation made visible. The brand comes from the team logo: a navy field, a mark shaped as a flowing "S" of two interlocking swooshes, and the wordmark SYN in white with APSE in light blue. The page is clean clinic white with navy for weight and trust, and light blue as the signal colour that ties it back to the logo. Content arrives as chat bubbles, each with one small tail corner. Everything is large, rounded and unhurried, because the people it serves are often anxious, tired, or reading in a second language. Tap targets are generous (44 to 56px), text is never small for anything the user must act on, and feedback is physical: things press in and spring back.

State is carried by form, never by hue alone. A solid outlined pill means asked, a dashed pill means pending, a filled pill with a check means remembered, and a filled blue control with a check means selected or answered. Colour reinforces these forms but is never the only signal.

Navy here is calm, not cold: it is paired with large radii, soft shadows and generous space, never with ruled, zero-radius clinical boxes.

**Key Characteristics:**
- White ground with navy ink; navy for the header, the logo field and the clinician's voice.
- Light blue (the logo blue) as the brand accent on navy; a deeper blue of the same hue for actions on white.
- Large varied radii: full pills for controls, 2rem to 2.25rem sheets, bubbles with one small corner.
- Soft layered shadows tinted navy, and one translucent glass material over blurred light-blue fields.
- Spring motion on press, toggle and entrance; every travel has a reduced-motion opt-out.
- Multilingual by construction: scripts switch faces by `lang`, right-to-left follows `dir`.
- A phone frame carries the product: real screens shown inside one device that passes between clinician and patient.
- Navy bands (hero, clinician sheets, footer) alternate with Clinic White and Cool Mist sections; secondary text on navy is On-Navy Mist.

## Brand

Source: Akash's `Color Theme and Logo.pdf` (repo root, copy in `Akash NAT HACKS 2026 File/`). The theme is three colours: light blue, white and navy blue. Hex values below were sampled from the logo image in that PDF.

### Logo
- **Mark:** a flowing "S" built from two interlocking swooshes: the white half (left body and lower tail) and the light-blue half (upper tail and right body), separated by a thin navy gap. It reads as two people, two sides of one conversation, joined. (Updated 2026-11-07 from Akash's new logo; the earlier mark was two curved halves joined by a heartbeat line.)
- **Wordmark:** "SYNAPSE" in a wide geometric sans, all caps. "SYN" is white, "APSE" is light blue (`blue` #77a0c4).
- **Field:** the logo sits on Synapse Navy (`navy` #101e34). Use it on navy only; do not place the white-and-light-blue logo on white, where it disappears.
- **Do not** recolour, outline, stretch, add effects to, or retype the wordmark. Treat it as an image, not live text.
- **Clear space:** at least the height of the "S" on every side.
- **Asset needed (partly satisfied):** the PDF only holds a 611x395 raster. The logo is now vectorised from Akash's updated trace (`Akash NAT HACKS 2026 File/Gemini_Generated_Image_hiv1dghiv1dghiv1.svg`, 1294x832) as three components in `src/components/brand/synapse-logo.tsx`: `SynapseMark` (the mark), `SynapseWordmark` (the wordmark) and `SynapseLockup` (mark stacked above wordmark, as on the brand sheet). Use these in the UI. Still ask Akash for the original as SVG (preferred) or a high-resolution transparent PNG; place it in `public/` as `logo.svg` / `logo-mark.svg`.
- **Components:** each takes two tones, `primary` (white half and "SYN", default #ffffff) and `accent` (light-blue half and "APSE", default the `blue` token). Keep the defaults; the tone props exist for the native navy field, not for recolouring. The header uses mark plus wordmark side by side (mark 36px tall, wordmark about 14px); the footer uses the stacked lockup (144px, 176px from `sm`). The mark and wordmark are decorative inside a labelled link; the lockup carries `role="img"` and the name "Synapse".

## Colors

A cool, high-contrast palette taken from the logo: white surfaces, navy ink, the logo's light blue as the signal accent, and a deeper blue of the same hue that means "act" or "confirmed" on white.

### Brand
- **Synapse Navy** (`navy` #101e34): the logo field, the header, the clinician's bubble, the caption panel. White on navy is 16.7:1.
- **Raised Navy** (`navy-raised` #1b2c47): hover and pressed surfaces on navy; cards inside a navy area.
- **Synapse Light Blue** (`blue` #77a0c4): the logo blue. Accent on navy (6.05:1 on Navy): "APSE", active nav, icons, focus on dark areas. Blurred colour fields on white. **Never text or a button fill on white** (2.76:1, fails).

### Action
- **Signal Blue** (`blue-deep` #2d5f8b): primary action fill, selected-control fill, links and focus outline on white. White on it is 6.73:1.
- **Deep Signal Blue** (`blue-deeper` #1f4a70): action hover, text on blue-soft (7.89:1), quiet-button text.
- **Blue Wash** (`blue-soft` #e6eef6): confirmed-state pills, quiet-button hover, language code chips, tint cards.

### Neutral
- **Clinic White** (`ground` #ffffff): page background.
- **Cool Mist** (`ground-2` #eef3f8): segmented track, quiet sheets (clinician summary), remembered pills.
- **Paper White** (`surface` #ffffff): segmented thumb, unselected choices, asked pills.
- **Navy Ink** (`ink` #101e34): all primary text (16.7:1 on white).
- **Slate Blue** (`ink-soft` #4a6380): secondary text, labels, dashed borders (6.2:1 on white, 5.55:1 on Cool Mist).
- **Frost Line** (`line` #d5e0eb): row dividers, unselected choice rings, footer rule, scrollbar track.

### On navy
- **On-Navy Mist** (`on-navy-soft`): secondary text on navy and Raised Navy surfaces: hero subhead, bubble captions on the clinician's voice, summary field labels, header section links, footer small print. 9.89:1 on Synapse Navy, 8.31:1 on Raised Navy.

### Named Rules
**The Light-Blue-On-Navy Rule.** The logo light blue is for navy surfaces and decorative fields. On white, anything readable or pressable uses Signal Blue or Deep Signal Blue instead.

**The Act-or-Confirmed Rule.** Signal Blue appears only on things the user can press or on states that have been confirmed or answered. Decorative surfaces use the Blue Wash or Cool Mist, never Signal Blue.

**The Form-Before-Hue Rule.** Every state is distinguishable in greyscale: outline, dash, fill plus check. A new state needs a new form, not a new colour. This matters more with a near-monochrome blue palette.

**The On-Navy Mist Rule.** On navy, primary text is white and secondary text is On-Navy Mist. Readable secondary text on navy does not use translucent white or Slate Blue.

## Typography

**Display Font:** Figtree (with ui-sans-serif, system-ui)
**Body Font:** Noto Sans (with ui-sans-serif, system-ui)
**Script Fallbacks:** Noto Sans SC for `lang="zh-Hans"`, Noto Sans Arabic for `lang="ar"`, both falling back to Noto Sans.

**Character:** Figtree is round, friendly and bold at display sizes; Noto Sans is neutral and covers the most scripts, so multilingual content stays one family of voice. Numerals are tabular everywhere. The logo wordmark is its own geometric face and is used only as the logo image; do not set interface text in an imitation of it.

### Hierarchy
- **Display** (700, clamp(2.9rem, 11vw, 5.25rem), 0.98, -0.035em): the one hero headline, balanced; its last phrase may take Synapse Light Blue on navy.
- **Headline** (700, clamp(2.25rem, 6vw, 3.5rem), 1.04, -0.03em): section titles. Balanced wrapping, capped at 14 to 18ch.
- **Title** (700, 1.5rem, tight tracking): card and bubble titles.
- **Sheet text** (600 Figtree, 1.375 to 1.875rem, snug): the sentences people actually read and answer, in patient bubbles and the caption panel.
- **Body** (400, 1.125 to 1.25rem, 1.625): paragraphs, capped at 40 to 64ch.
- **Label** (500, 0.875rem, 1.25): field labels and bubble captions in sentence case. Never uppercase, never letter-spaced.
- **Figure** (700 Figtree, 4.5rem, 1.0): large numerals.
- **Screen title** (700 Figtree, clamp(2rem, 6.5vw, 3rem), 1.05, -0.025em, balanced): the one heading of each session-app screen, in the holder's language.
- **Handoff line** (700 Figtree, clamp(2rem, 7vw, 3.25rem), 1.05, balanced, capped at 18ch): the single instruction on a handoff or hand-back screen, white on navy.
- **Section label** (600 Noto Sans, 1rem, Slate Blue, sentence case): names a group of choices or a field ("Patient's language", "Suggested replies"). It labels the group directly; it never sits above another heading.

### Named Rules
**The Language Face Rule.** Every block of patient-language text carries `lang` and `dir`; interface labels inside it opt back to `lang="en" dir="ltr"`. Do not hand-pick a font per language.

**The Sentence Case Rule.** Labels are sentence case at 14px or larger. Hierarchy comes from size, weight and ink, not caps or tracking. (The all-caps wordmark is the logo, not a label style.)

**The Role Pill Rule.** On the home page the phone's ScreenBar is the holder signal for each step; a step heading carries no pill or label above it (only its number disc). Elsewhere, a sheet or bubble group is introduced by who is speaking or holding the device, as a holder pill (14px semibold, full pill, 4px by 12px): Clinician is Synapse Navy with white (Raised Navy with white when already on navy), Patient is Blue Wash with Deep Signal Blue. Section headings stand alone; there is no eyebrow or kicker above them.

**The Holder's Language Rule.** In the session app every screen speaks the language of whoever holds the device. Patient-held screens set `lang` and `dir` on the screen frame and on each patient-language block, mirror under `rtl`, and flip directional arrows; clinician-held screens are English. Shared moments carry both: the handoff to the clinician leads with the patient's line in their language and the English instruction beneath, and the idle warning speaks the holder's language with an English line under it when a patient holds a non-English session.

## Layout

A single centered column, max 72rem (`max-w-6xl`), with 1rem side padding rising to 2rem from `sm`. Designed at about 390px first; at `lg` (1024px) panels may go two-up with 2rem column gaps.

Rhythm is generous and section-led: 4rem between sections (6rem from `lg`), 2.5rem from a title to its content, 0.75 to 1.5rem inside groups. Row lists use 0.75rem vertical padding with a Frost Line divider. Patient and clinician bubbles alternate sides like a conversation.

The page lives in an isolated, full-bleed wrapper with `overflow-x: clip`, so colour fields can bleed past the column without producing a sideways scroll. Anchor targets use a 5rem scroll margin to clear the header.

The document background (`html` and `body`) is Synapse Navy, and every section paints its own ground: the hero and footer are navy, content sections alternate Clinic White and Cool Mist. The translucent header and any overscroll edge therefore read as navy, never white. Horizontal overflow is clipped on `body`.

The home page runs a looser marketing rhythm than app screens: 6rem section padding (8rem from `lg`), 1.25rem from headline to lede, 2.5 to 3.5rem from lede to content. Two-up splits at `lg` are asymmetric (about 1.05fr / 0.95fr for the hero, 1fr / 22rem for steps beside the pinned phone). From `lg`, one 3D phone is pinned on the right for the whole page, from the hero to the end of privacy (CSS `position: sticky` in a 22rem column, vertically centred; `src/components/home/phone-rail.tsx`). Sections keep that column clear and their content scrolls on the left. The phone never moves with scroll by script and never travels sideways; only its screen changes, following the element with `data-phone-screen` at the middle of the viewport (hero, each step, modes, privacy). Below `lg`, the hero keeps its own in-flow phone (sized so the whole exchange and its pause control land in the first viewport), and the steps use ONE phone driven by a swipeable scroll-snap track of step cards (tap targets under the phone jump to a step); modes and privacy show their content without a phone.

**The Melt Rule (home page).** Colour bands never meet at a hard edge, so the pinned phone always floats over one continuous field. The hero's navy melts into the white page (`.page-melt-down`: navy, then navy mixed 35% with Light Blue, then Blue Wash, then Clinic White, over the last 11rem, 20rem from `lg`), the Mist modes band fades in and out over 12rem at each end, and the privacy section melts back into the navy closing band (`.page-melt-up`, the reverse). Quality: colours mix in OKLab (`linear-gradient(in oklab ...)`, so midpoints stay clean and blue, never grey); each melt follows a smootherstep curve sampled at 15 stops (no visible kink where it starts or ends); a fine mid-grey grain (5% fractal noise, feathered at both ends) dithers away 8-bit banding, living only inside the fade. Melts are painted as the section's own background, not an overlay; `<main>` has a Clinic White backdrop and the closing band overlaps it by 1px, so no subpixel seam can show between sections. Use the raw colour variables (`--navy`, `--blue`, `--blue-soft`, `--ground`) in these gradients; the `--color-*` theme names are inlined by Tailwind and do not exist at runtime. Section links in the header appear from `md` (768px).

The session app (`/start`) is a work surface, not a page: a full-height Clinic White column under a sticky session bar. Each stage is one centred screen frame, max 42rem (`max-w-2xl`) for patient-held screens and 64rem (`max-w-5xl`) for clinician screens that go two-up, with 1rem side padding (1.5rem from `sm`), 1.5rem top padding (2.5rem from `sm`), and the screen-in entrance on every stage change. Inside a frame: 2rem from the title block to content, 2.25rem between choice groups, 0.75rem between choices. At `lg` the start screen pairs language and the privacy note beside mode and path, and the review screen splits about 1.1fr / 0.9fr (summary sheet beside the patient's words); below `lg` everything stacks in reading order.

Every session screen ends in a sticky ActionBar at the bottom of the frame: a 1px Frost Line top rule, Clinic White at 92% over a 24px backdrop blur, 1rem padding plus the bottom safe-area inset, bleeding to the frame edges. On phones its actions stack in a full-width column with the primary on top; from `sm` they form a right-aligned row with the primary last; on patient screens under `rtl` the row mirrors so the primary sits leftmost. The session bar takes the top safe-area inset.

### Named Rules
**The Own Ground Rule.** The page behind everything is navy. A new section declares its own ground (navy, Clinic White or Cool Mist); never rely on the body showing through.

**The Thumb Bar Rule.** A session screen puts all of its actions in its one sticky ActionBar: at most one primary, quiet actions beside it. Phones stack them full width with the primary on top; from `sm` they form a right-aligned row, mirrored under `rtl`. Confirmations happen in place, in the ActionBar or the session bar, never in a modal.

## Elevation & Depth

Depth is a hybrid of translucency and soft shadow. Glass sheets float over blurred light-blue fields; quiet sheets (Cool Mist) sit on soft shadow alone; navy surfaces need no shadow.

### Shadow Vocabulary
- **Soft** (`box-shadow: 0 1px 2px rgb(16 30 52 / 0.06), 0 10px 28px -10px rgb(16 30 52 / 0.16)`): resting sheets, tint cards, the segmented thumb, selected choices, and the glass material.
- **Lift** (`box-shadow: 0 2px 4px rgb(16 30 52 / 0.06), 0 22px 44px -14px rgb(16 30 52 / 0.26)`): the primary call to action and the one sheet that changes. One step above Soft.
- **Device** (`box-shadow: 0 2px 6px rgb(5 10 20 / 0.25), 0 40px 80px -24px rgb(5 10 20 / 0.55)`): the phone frame only. Deeper and darker than Lift so the device holds its own on a navy field as well as on white.

### Glass Material
Translucent white (62% opacity), 26px backdrop blur at 170% saturation, a 1px white (75%) edge, and Soft shadow. Fallbacks: with reduced transparency the fill becomes opaque white with no blur; with increased contrast it is opaque white with a Navy Ink border.

### Bar Material
Sticky bars are chrome, not glass sheets. The session bar is Synapse Navy at 92% (the site header's treatment) and the ActionBar is Clinic White at 92%, each over a 24px backdrop blur with a 1px rule on the content side (white at 10% under the navy bar, Frost Line above the ActionBar) and no shadow. They are near-opaque and sit over the app's own content, so the Glass Over Colour Rule does not apply to them. Floating session notices (the idle warning and the toast) take Lift.

### Colour Fields
Blurred organic blobs (44px blur, irregular 63/37/54/46 border radii) in Synapse Light Blue and Blue Wash sit behind sheets at z-index -1, aria-hidden, pointer-events none, inside the isolated wrapper.

### Named Rules
**The Glass Over Colour Rule.** Glass only has meaning when there is colour behind it. Place a glass sheet only where a colour field sits behind it; otherwise use an opaque sheet.

**The Two-Step Shadow Rule.** Soft at rest, Lift for the one thing to press or the one thing that changes. No other shadow values (except Device, which belongs to the phone frame alone), and no hard offset shadows.

**The One Device Rule.** The Device shadow, the 3rem frame and the 2.4rem screen belong only to the phone that carries product screens. Nothing else borrows them.

## Shapes

Large, soft, and varied. Controls are full pills (9999px). Sheets are 2rem to 2.25rem. Bubbles are 1.9rem. Picture-answer buttons are 1.75rem, the caption panel 1.5rem. Anything bubble-like keeps one small corner (0.5rem) acting as a tail, positioned by who is speaking: bottom-left for the patient, bottom-right for read-back and clinician bubbles. Round discs (icon holders, check discs, number buttons) are full circles, echoing the round logo mark. Dividers are 1px Frost Line; there are no ruled boxes. Focus outlines are 3px Signal Blue (Light Blue on navy) with 3px offset.

Icons are inline SVG, drawn in the same rounded style, and always paired with a text label.

The phone frame is the largest radius in the system: a 3rem Raised Navy frame with 10px of bezel around a 2.4rem Clinic White screen. Inside the phone, bubbles are 1.75rem with the 0.5rem tail. Summary fields inside a navy sheet are 1.25rem insets in Raised Navy. On narrow screens a pill row that has to wrap becomes a 1.75rem rounded track and returns to a full pill from `sm`.

The session app adds one working radius, `field` (1.5rem), for text fields, notices (privacy note, error and fallback notes), suggested-reply buttons and the two-line mode choices; picture tiles, the idle warning card and the cards holding the patient's words use 1.75rem. Scale answers (1 to 5) are full circles. Progress through guided questions is a row of 6px full-pill segments. Handoff and end screens centre a 96px full-circle disc holding a 44px icon.

The guided-question pictograms are one family on the interface icons' 24px grid and 2px rounded stroke, drawn at 40px in picture tiles (56px from `sm`) in Signal Blue, white when selected, always above their text label: head, chest, stomach, back, arm, leg, clock, calendar, breath, move, eat, none, fever, nausea, dizzy.

## Components

### Buttons
- **Shape:** full pill (9999px).
- **Primary:** Signal Blue fill, white 18px semibold text, minimum height 56px, 32px left padding with a 40px translucent-white disc holding an arrow on the right, Lift shadow. Hover deepens to Deep Signal Blue.
- **Primary on navy:** Synapse Light Blue fill with Navy text (6.05:1). Same anatomy as Primary: 56px minimum, 18px semibold, 32px left padding, a 40px disc in Navy at 10% holding the arrow. Hover lifts to white. In the hero it carries Lift and is the single most prominent control; "Start a session" is this button.
- **Quiet on navy:** transparent with Synapse Light Blue text, 48px (56px from `sm`), hover fills Raised Navy and turns the text white.
- **Quiet:** transparent with Deep Signal Blue text, 44px minimum height, hover washes in Blue Wash.
- **Press:** every button uses the press feedback: scale to 0.965 in 90ms on pointer-down, then return on the overshoot spring over 420ms.

### Choice buttons and number buttons
- **Unselected:** Paper White with a 1px Frost Line ring, Navy Ink text; hover darkens the ring to Slate Blue.
- **Selected:** Signal Blue fill, white text, a check icon, Soft shadow. Selected is always check plus fill (`aria-pressed`).
- **Picture answers:** 1.75rem corners, 112px minimum height (128px in the session app, 176px from `sm`), icon above label; unselected Paper White with a 1px Frost Line ring, hover Blue Wash.

### Segmented control
- A pill track in Cool Mist with 4px padding; equal-width cells; a Paper White thumb with Soft shadow slides under the active cell on the overshoot spring (520ms). Active label is bold Navy Ink, others medium Slate Blue. Cells are 48 to 56px tall.

### State pills
- **Asked:** Paper White, 1px Navy Ink ring.
- **Pending:** transparent, dashed Slate Blue border and text.
- **Remembered:** Cool Mist fill with a leading Signal Blue check disc.
- **Confirmed or answered (clinician view):** Blue Wash fill, Deep Signal Blue text, leading check.
- All 36px minimum height, 14px horizontal padding, semibold. A legend with mini pills in the same forms explains them.

### Bubbles and sheets
- **Glass bubble:** the Glass material, 2rem corners with the bottom-left tail, 20px padding.
- **Tint card:** Blue Wash fill, Soft shadow, 2rem corners with a tail on the speaking side.
- **Quiet sheet:** Cool Mist, Soft shadow, 2.25rem corners with a tail (clinician summary).
- **Clinician bubble:** Synapse Navy fill, white text, Lift shadow; the clinician's voice is always navy.
- **Caption panel:** Synapse Navy fill, white text, 1.5rem corners, for the live-caption mode.

### Navigation
- A translucent Synapse Navy header bar (navy at 92% over a heavy backdrop blur, 1px white-at-10% bottom rule, 64px tall), sticky at the top: the logo (mark plus wordmark) at left on its native navy field, section links in On-Navy Mist from `md` (hover Raised Navy, white text), and a single quiet outline Start at right in Light Blue. No menu below `md`.
- **Header Start:** Light Blue text and arrow, a 1px Light Blue ring at 60%, 44px minimum, full pill; hover fills Raised Navy with white text. It stays quiet so the light-blue "Start a session" remains the primary on navy.

### Phone frame (product carrier)
- The product is shown inside a clinician's phone, not as feature cards. The phone is a real 3D model (`public/models/iphone.glb`, rendered with three.js; the manufacturer logo on its back is hidden) with the live HTML screen locked onto its glass by a matching perspective transform (`src/components/home/phone-rig.ts`). Screens are laid out at 304px wide and scaled onto the glass, so the phone can be any size. Width: up to 20.5rem and never taller than about 70% of the viewport on phones; each desktop slot sets its own width from the viewport height. Before the model loads, or without WebGL, a Raised Navy bezel with the Device shadow stands in.
- A status strip (44px: time, a Synapse Navy pill for the camera island, a battery outline) sits above the app content. It is presentational; the frame is a labelled `figure`.
- **ScreenBar (holder chip):** directly under the status strip, a Frost Line rule and a holder pill showing who holds the device now, Clinician (Synapse Navy, white) or Patient (Blue Wash, Deep Signal Blue), with the step name in Slate Blue at right.
- When the holder changes, the phone performs the pass (see Motion).

### Mode tabs
- A Paper White track with Soft shadow and 6px padding, full pill from `sm`. Tabs are 48px minimum, semibold; selected is Synapse Navy fill with white text, others Slate Blue with a Cool Mist hover. Arrow keys, Home and End move selection (`role="tablist"`).
- **Narrow screens:** each tab shows a short visible label whose words appear in its full accessible name (for example "Language" for "Another language"), at 14px; the full label shows from `sm`. When the row is too narrow, whole pills wrap to a second line and the track becomes a 1.75rem rounded rectangle; a label never breaks inside a pill.

### Patient and clinician sheets
- A paired demo shows the patient side as a Paper White sheet (2.25rem, bottom-left tail, Soft shadow) and the clinician side as a Synapse Navy sheet (2.25rem, bottom-right tail, no shadow), each opened by its holder pill. Clinician summary facts sit in 1.25rem Raised Navy fields with On-Navy Mist labels.

### Session bar
- The session app's only header: a 64px Synapse Navy bar in the Bar Material, sticky, centred to 64rem. At left the mark alone (36px, no wordmark) linking home, then "Session" in 18px bold Figtree (hidden below 380px), then the live holder pill.
- **Holder pill:** the Role Pill on navy (Clinician Raised Navy with white, Patient Blue Wash with Deep Signal Blue) inside a polite live region prefixed by a visually hidden "Now holding the device:". This is the only place the session app names the holder.
- **Clear (two-step):** at right, the Header Start treatment with a clear icon: Light Blue text, 1px Light Blue ring at 60%, 44px, 16px side padding, hover Raised Navy with white text. During a session the first press swaps it in place for "Cancel" (On-Navy Mist text, hover Raised Navy with white) and "Clear now" (Light Blue fill, Navy text, clear icon, hover white). Outside a session it acts at once.

### Session buttons
- **Primary (session):** Signal Blue pill, white 18px semibold, 56px minimum, 28px side padding, a 22px leading or trailing icon instead of the arrow disc, Lift shadow, hover Deep Signal Blue. Full width on phones, natural width from `sm`. **Disabled:** Frost Line fill, Slate Blue text, no shadow, not-allowed cursor, and a label that says what is missing ("Pick a language first").
- **Quiet (session):** transparent with Deep Signal Blue 16px semibold text and a 1px Frost Line ring, 48px minimum, 20px side padding, hover Blue Wash (ring included), disabled at 50% opacity, full width on phones. The confirming step of a destructive action ("End and clear") turns its text Navy Ink and its ring Slate Blue; destructive actions never turn red.
- **Ritual (on navy):** handoff and hand-back screens use the Light Blue fill with Navy text, 56px, 32px side padding, no disc, hover white. Its label names who continues ("I'm the clinician", "Show the patient").
- **Read aloud:** Blue Wash pill, Deep Signal Blue text, speaker icon, 48px, hover Cool Mist. Never rendered in Deaf or hard-of-hearing mode.
- **Microphone:** a 128px (144px from `sm`) Signal Blue disc with a 48px mic icon and Lift, hover Deep Signal Blue; while listening it turns Synapse Navy with an 8px Blue Wash ring and a stop icon (`aria-pressed`), and the visible line beneath changes to "Listening".

### Session choices
- **Choice pill:** the Choice anatomy at 56px with 20px padding and 18px semibold text: Paper White with a Frost Line ring (hover Slate Blue ring); selected Signal Blue fill, white, Soft, `aria-pressed`. A 24px leading slot holds the indicator: unselected shows a 20px circle with a 2px inset Frost Line ring (a radio indicator) or the option's icon in Signal Blue; selected shows the check. Two-line choices (a language with its English name, a mode with its hint) set the second line at 14px medium Slate Blue (white at 85% when selected), and mode choices relax to 1.5rem corners.
- **Picture tile:** 1.75rem, 16px padding, 128px minimum (176px from `sm`), 18px semibold label (20px from `sm`), pictogram above in Signal Blue; Paper White with a Frost Line ring, hover Blue Wash; selected Signal Blue fill, white pictogram, a check before the label, Soft. Two columns on phones, three from `sm`. Teach-back answers (yes, no, not sure) are three tiles, stacked on phones and a row from `sm`.
- **Scale circles:** five equal full circles in one row (square, 56px minimum), numeral in Figtree bold clamp(1.5rem, 6vw, 2.25rem) over a decorative 6px bar whose width grows with the value (Light Blue, white when selected); fill states as tiles; each carries its full label as the accessible name.
- **Phrase chips (can't-speak mode):** 56px pills with the choice states, wrapping as whole pills; the composed sentence appears in a patient bubble beneath with quiet "speak for me" and "clear" actions.
- **Suggested replies:** full-width 1.5rem buttons, 56px minimum, 16px semibold, left aligned, with the choice states.
- **Progress:** "Question n of m" in 16px semibold Slate Blue beside a row of 6px pill segments, Signal Blue through the current question, Frost Line after.

- **Body diagram (where it hurts):** a clean single-weight line drawing of a standing figure, front and back (face and hair, collarbones, chest, navel, hip lines, open hands, feet; on the back the spine, shoulder blades and buttocks), in Navy Ink on a white body, inside a Paper White 2rem sheet with a 1px Frost Line ring. The art is traced from Zach's reference drawing and lives as vector paths in `body-diagram.tsx`; do not redraw or restyle it. Front and back views: a Segmented control on phones, side by side from `md`, each sheet with Paper White side pills (Right/Left, in the patient's language). The patient taps anywhere on the body and a soft red spot (the `alert` token) lands exactly there, under the line art, with a dark centre dot so it never relies on colour; tapping a spot removes it. Spots and taps are clipped to the body. Keyboard users tab between parts (focus shows a Blue Wash band with Signal Blue edges). Touched parts are repeated below as Signal Blue removable pills with a count. The clinician sees the same drawing read-only (white panels, on navy in the summary) with every spot in place. The figure is always laid out left to right, never mirrored for RTL.

### Speech bubbles (session)
- 1.9rem corners with one 0.5rem tail, 16px by 20px padding, arrive entrance, no shadow. A 14px medium caption (Slate Blue; On-Navy Mist on navy), then the words in Figtree semibold, snug: large clamp(1.5rem, 5vw, 2rem), medium 1.25rem. Tones: patient (Blue Wash, start side, bottom-left tail), read-back (Cool Mist, end side, bottom-right tail) and clinician (Synapse Navy, white, end side, bottom-right tail). Up to 90% of the column from `sm`; the full variant stretches across the column for the read-back and translation-fallback screens. The words carry the patient's `lang` and `dir`.
- The clinician tone and the clinician summary sheet keep their tail bottom-right, per the Shapes rule (fixed 2026-11-07; previously drifted to bottom-left).

### Handoff and hand-back screens
- A full-screen Synapse Navy turn (the frame behind it turns navy as well) that replaces the previous holder's content entirely; never a modal. Centred: a 96px Raised Navy disc holding the 44px Light Blue handoff glyph (mirrored when passing to the patient), which plays the pass toward the new holder; the handoff line in white; one On-Navy Mist sentence; a line saying what is hidden ("The summary is hidden while the patient holds the device."); and one Ritual button. Passing to the clinician, the big line is in the patient's language and the English instruction sits beneath. The hand-back screen is the patient-language variant with its own done button.

### Clinician summary sheet
- A Synapse Navy sheet, 2rem with one 0.5rem tail, 24px padding (32px from `sm`), no shadow, beside the patient's words from `lg`. It opens with a 14px On-Navy Mist "Chief complaint" label and the complaint in Figtree bold clamp(1.75rem, 4.5vw, 2.25rem).
- **Red flag block:** directly under the complaint, a 1.25rem Light Blue inset with Navy text: an alert icon and "Red flag: assess first" (plural when several) in 14px bold, then each flag as a Synapse Navy pill with white 16px semibold text. The label, icon and inset carry the urgency; there is no red.
- **Summary fields:** Duration and Symptoms in 1.25rem Raised Navy insets with On-Navy Mist labels and 18px semibold white values, two-up from `sm`; missing values read "Not stated" or "None stated".
- **In English:** an On-Navy Mist label and the full translation in 18px relaxed white.
- **Check with the patient:** a Raised Navy inset headed by a Light Blue alert line, listing each low-confidence phrase (white semibold, in the patient's `lang` and `dir`) with its reason in On-Navy Mist. A 14px On-Navy Mist line reports any removed personal details.
- **Translation unavailable:** the same navy sheet without a tail, a Light Blue alert heading, a fallback sentence, and any guided answers as Raised Navy pills.
- **Patient's words card:** Cool Mist, 1.75rem, 20px padding (24px from `sm`), caption then the words in Figtree 1.25rem semibold. When the read-back matched, the confirmation sits on this single card as a Deep Signal Blue check line ("Read back to the patient and confirmed"); only when the back-translation differs does a second, outlined card (1px Frost Line) show it with "Patient confirmed".
- **Replies so far:** an outlined 1.75rem card listing each reply with an understood pill: Blue Wash with a check for yes, Cool Mist with an alert icon for no or not sure.

### Inputs / Fields
- **Text field:** Paper White, 1.5rem, 20px padding, 1px Frost Line ring, vertical resize; focus-visible swaps the outline for a 3px Signal Blue ring. Clinician text is 18px relaxed Noto Sans; patient text is Figtree semibold clamp(1.25rem, 4vw, 1.5rem). Labels sit above in 16px semibold (Slate Blue for the clinician, Deep Signal Blue on patient screens).
- **Notices:** Cool Mist, 1.5rem, 20px padding, 16 to 18px text. The privacy note leads with a Signal Blue shield icon; error notices carry `role="alert"` and a Signal Blue alert icon, and offer the way forward as a quiet button.

### Idle warning
- A Synapse Navy `alertdialog` card fixed at the bottom (1rem in, above the safe area, max 36rem): 1.75rem, 20px padding (24px from `sm`), Lift, arrive entrance. A 20px bold Figtree title, a 16px On-Navy Mist countdown, and one Light Blue "keep" button (48px, Navy text, hover white) that takes focus. Stacked on phones, a row from `sm`. Written per the Holder's Language Rule. When the countdown ends the session clears.

### Toast
- A Synapse Navy pill under the session bar (80px from the top, centred): 16px semibold white, 12px by 20px, Lift, arrive entrance, polite live region, gone after 3.5s, never interactive. Used for clear confirmations only.

### Spinner and end screen
- **Spinner:** a 20px ring, 3px Frost Line with a Signal Blue top segment, rotating, beside an 18px semibold Slate Blue label inside `role="status"`; inline in the primary while sending, centred on the read-back screen while translating.
- **End screen:** Clinic White, a 96px Blue Wash disc with a Signal Blue clear icon, the screen title "Session cleared", one sentence, and an ActionBar with an outlined "Back to home" link and the "New patient" primary.

### Motion
- **Spring** (`linear(...)`, critically damped, settles with no overshoot): entrance rise (900ms, 110ms stagger plus 80ms delay, 18px travel).
- **Spring-pop** (slight overshoot, peak about 1.055): press return, thumb slide, and pill fill-in only. Overshoot is feedback, not decoration.
- **Ease-out** (`cubic-bezier(0.16, 1, 0.3, 1)`): fast start, long settle, for arrivals and the pass.
- **Arrive** (620ms ease-out, from 10px below, 96% scale and 4px blur): a bubble or summary arriving in a demo exchange.
- **Screen-in** (560ms ease-out, from 14px below and 6px blur): a new screen inside the phone, or a new tab panel.
- **The pulse** (home page, `src/components/home/heartbeat-journey.tsx`): a softly capped, shaded 10px staff sits midway between the neighboring text and phone, centered against both. Its height is 58% of the phone's height, bounded to 290–400px; the snake coils around it with a 23–36px helix radius, a tapered body up to 13px thick, fine highlights, and a larger head with an eye and curved highlight. The snake climbs the stationary staff, compacts as it shoots into the header directly above it, and becomes a small ECG waveform over the first half-viewport of scrolling. Physical-length sampling preserves the compact body; the staff fades after the snake clears it. During the final arrival phase (0.84–1), the progress tail unfolds backward from the header arrival point toward the left edge, with a transparent-to-blue feathered start that blends the trail into the arriving signal. Further downward scroll carries the reading-position marker clockwise along the header, around the rounded top-right corner and down the inset right edge, without a detour back left; upward scroll retraces that route. Within a fixed window around that marker, the ECG waveform sweeps continuously while docked, including when scrolling stops; the snake's body route is no longer recalculated after docking. Below `xl`, where the emblem is hidden, the perimeter progress trace fades in directly. Pause demo and Play demo control the live sweep through `synapse:demo-playing`; hidden tabs suspend rendering. Reduced motion uses static endpoints and a static waveform.
- **The pinned phone** (home page, `lg` and up): when the screen changes (a new section or step), the new screen plays Screen-in and the phone swings toward whoever now holds it on a critically damped spring (about 20deg peak) and settles. At rest it faces the viewer at a slight angle and leans up to about 10deg toward a cursor or touch for a moment. No scroll-driven rotation.
- **Voice level** (1.1s ease-in-out loop, 120ms stagger): bars that scale vertically while the device listens or speaks. Decorative only.
- **Reduced motion:** entrances and fill-ins are removed; press and thumb transitions and transforms are removed; the pass becomes a 300ms crossfade from 40% opacity; on the home page the phones do not swing or lean; arrive, screen-in and voice level are removed. Content is visible by default without animation.
- **The pass on the handoff disc:** the same pass keyframes (760ms ease-out, 22deg) play on the 96px device disc of the handoff and hand-back screens under 600px perspective, toward whoever now holds the device; the reduced-motion crossfade applies.
- **Session stages:** every stage change and every guided question enters with screen-in; bubbles, the idle warning and toasts enter with arrive. Focus moves to the new screen and the page returns to the top.
- **Spinner:** continuous linear rotation (1s); under reduced motion it stops and the static ring plus its label carry the state (fixed 2026-11-07).

### Implementation and reuse

The existing colour, font, shadow and motion variables in `src/app/globals.css` are the shared foundation. Tailwind v4 also exposes named shape utilities (`rounded-inset`, `rounded-field`, `rounded-bubble-sm`, `rounded-bubble`, `rounded-sheet`, `rounded-sheet-lg`, `rounded-*-tail`) and fluid text utilities (`text-screen-title`, `text-bubble`). These preserve the values above. Use Tailwind’s spacing scale for layout; do not add parallel spacing variables.

- `src/components/ui/button.tsx`: native `Button` with `primary`, `quiet`, and `outline` variants. Actions fill phone widths and become content-sized from `sm`; use `width="full"` for forms. Defaults to `type="button"`; submit actions must pass `type="submit"`. `icon` and `trailing` are decorative, with the visible label supplying the accessible name. Disabled actions have no hover or press response. Keep marketing calls to action and navy handoff actions in their existing specialised components.
- `src/components/ui/spinner.tsx`: `SpinnerIcon` is decorative; `LoadingStatus` pairs it with visible text and a status live region. Set `inverse` only for a dark surface. Reduced motion keeps the ring static.
- `src/components/session/ui.tsx`: session-specific frames, sticky actions, buttons, choices, picture tiles, bubbles and headings. `PrimaryButton`, `QuietButton` and `Spinner` delegate to the shared primitives so existing screen imports remain stable. Choices retain fill plus check and `aria-pressed`; picture tiles keep their large touch targets.
- `src/components/auth/auth-ui.tsx`: labelled account fields, password reveal, form errors and account shell. `SubmitButton` and `GoogleButton` use the shared button. Input hints and errors describe only elements currently rendered.
- `field-control`: shared CSS utility for input/textarea surface, ink, caret, placeholder and focus ring. Compose with the appropriate radius, padding and type treatment; keep field labels explicit. Account inputs retain the 20px inset radius; session textareas retain the 24px field radius.

Example: `<Button type="submit" width="full" disabled={busy} aria-busy={busy}>Save profile</Button>`. For session actions, keep using `<PrimaryButton>` and `<QuietButton>` beside each other in `<ActionBar>`.

## Do's and Don'ts

### Do:
- **Do** use the three brand colours from the logo: navy, light blue, white.
- **Do** use Signal Blue (not the logo light blue) for text, links and buttons on white.
- **Do** keep the logo on its navy field, unaltered.
- **Do** make state legible without colour: solid outline for asked, dashed for pending, fill plus check for remembered or selected.
- **Do** give every bubble-like surface one small tail corner (0.5rem) on the speaker's side and large radii elsewhere.
- **Do** keep targets at least 44px tall (48 to 56px for primary choices) and body text at least 18px where users read or act.
- **Do** put glass sheets only over colour fields, and keep the reduced-transparency and increased-contrast fallbacks.
- **Do** mark every foreign-language block with `lang` and `dir`, and reset interface labels inside it to `en` and `ltr`.
- **Do** use On-Navy Mist for secondary text on navy and Raised Navy.
- **Do** introduce steps and sheets with a holder pill (Clinician navy, Patient Blue Wash) rather than an eyebrow.
- **Do** show the product inside the phone frame, with a ScreenBar naming who holds it.
- **Do** keep short mobile labels inside the words of their accessible name, and let pill rows wrap as whole pills.
- **Do** name who holds the device once, in the session bar's live holder pill, and write every patient-held screen in the patient's language with `lang` and `dir` on the screen.
- **Do** put every session action in the sticky ActionBar: primary on top and full width on phones, a right-aligned row from `sm`, mirrored under `rtl`.
- **Do** make every change of holder a full-screen navy handoff that hides the previous person's content.
- **Do** confirm destructive actions in place, in two steps (Clear, then Cancel or Clear now).
- **Do** show red flags as a labelled Light Blue inset on the navy summary, with an alert icon and navy flag chips.

### Don't:
- **Don't** put light blue text or light blue buttons on white; it fails contrast.
- **Don't** pair navy with ruled, zero-radius, shadowless boxes; keep it soft and rounded.
- **Don't** add colours outside the navy / light blue / white family (no teal, apricot, or warm washes from the old design).
- **Don't** recolour, retype or add effects to the logo.
- **Don't** signal state by hue alone, or add a state without a distinct form.
- **Don't** introduce shadows beyond Soft and Lift (Device is reserved for the phone frame), or hard-offset shadows.
- **Don't** let colour fields escape the isolated, clipped wrapper or sit above content.
- **Don't** add motion without a reduced-motion opt-out.
- **Don't** put an uppercase or tracked eyebrow above a heading; the holder pill does that job.
- **Don't** rely on sound alone in Deaf or hard-of-hearing mode; read-aloud controls are not rendered there.
- **Don't** use red or a new hue for red flags or destructive actions; label, icon and inset carry the urgency.
- **Don't** repeat the holder pill inside session screens or announce a turn with a modal.
