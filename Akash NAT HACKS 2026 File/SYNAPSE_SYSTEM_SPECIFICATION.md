# SYNAPSE: Comprehensive UI Layout, Component Hierarchy & System Specification

**Version:** 1.0.0 (Production Release Specification)  
**Authors:** Synapse Engineering & Design Team  
**Evaluation Target:** NatHacks 2026 Clinical Systems Showcase  
**Platform Target:** Responsive Web (Mobile 375px–430px · Tablet 768px–1024px · Laptop/Desktop 1280px–1440px)

---

## 1. Executive Summary & Product Purpose

**Synapse** is an accessibility-first, adaptive communication bridge designed for clinics, emergency rooms, hospital bedsides, and telehealth encounters. It solves the critical bottleneck of delayed, expensive, or unavailable medical interpreters by enabling an immediate, bidirectional exchange between clinician and patient on a single shared device within seconds of opening the application.

### Core Value Proposition
- **Seconds, Not Minutes:** Eliminates the 15–30 minute delay of arranging live interpreter hotlines or setting up cumbersome cart-based systems.
- **Multimodal by Construction:** Accommodates foreign language speakers, Deaf/Hard-of-Hearing (HoH) individuals, low-literacy patients, and non-verbal/mute individuals using speech, text, and Augmentative and Alternative Communication (AAC) pictograms.
- **Synchronous Dual Summaries:** Generates both a Grade 4–5 plain-language patient recap (with text-to-speech audio narration) and an EHR-ready structured clinical SOAP note simultaneously.
- **Ephemeral & Private:** Zero patient identifiers collected, zero persistent server storage; all session state lives solely in transient client memory and is wiped upon session clearing or idle timeout.

---

## 2. Dashboard Screen Layout & Viewport Zoning

The main dashboard screen adheres to a disciplined 5-zone architectural contract designed to maximize ergonomic reach, visual clarity, and bidirectional handover efficiency.

```
+===================================================================================================+
| ZONE 1: TRANSLUCENT SYNAPSE NAVY HEADER (Height: 64px, Sticky Top, Backdrop Blur 24px)            |
| [Synapse Lockup: Flowing 'S' Mark + SYN(white)APSE(light blue)] · [Live Holder Pill] · [Clear Action]|
+===================================================================================================+
| ZONE 2: PERSISTENT ADAPTIVE ACCESSIBILITY TOOLBAR (Background: Raised Navy #1b2c47, Height: 48px) |
| Mode Tabs: [ Standard | Deaf/HoH Captions | Low-Literacy AAC | Can't Speak | High Contrast AAA ]   |
| Scalers:   [ Size: 100% | 125% | 150% ]  ·  [ Voice Read-Aloud: On/Off (Omitted in Deaf/HoH) ]    |
+===================================================================================================+
| RESPONSIVE WORK SURFACE (Background: Clinic White #ffffff Ground, Padded Container max-w-7xl)     |
|                                                                                                   |
|  LEFT / TOP (60% VIEWPORT ANCHOR):                      RIGHT / BOTTOM (40% VIEWPORT ANCHOR):     |
|  ZONE 3: LIVE TRANSLATION & CAPTION STREAM              ZONE 4: MULTILINGUAL INTAKE HUB           |
|  +---------------------------------------------------+  +---------------------------------------+ |
|  | [Live] Clinician (EN) ⇄ Patient (ES)  [Flip 180°] |  | Language Choice Strip: [ES][ZH][VI].. | |
|  |                                                   |  | Mode Track: [Voice] [Pictures] [Type] | |
|  | • Clinician Bubble (Synapse Navy #101e34):        |  |                                       | |
|  |   "Can you point to where it hurts?"              |  | +-----------------------------------+ | |
|  |   Translation: "¿Puede señalar dónde le duele?"   |  | |         128px BUTTON-MIC          | | |
|  |   [Rounded 1.9rem with 0.5rem bottom-right tail]  |  | |    Signal Blue (#2d5f8b) Disc     | | |
|  |                                                   |  | |    Turns Navy with 8px ring when  | | |
|  | • [Ambient Alert: Pulse-oximeter steady 98%]      |  | |    listening: "Listening..."      | | |
|  |   (Visual sound cue with pulse flash)             |  | +-----------------------------------+ | |
|  |                                                   |  |                                       | |
|  | • Patient Bubble (Blue Wash #e6eef6):             |  | 1.75rem Picture Tiles / Choice Pills  | |
|  |   "Siento una presión en el centro del pecho"     |  | (Pain 1-10, Anatomy, Symptoms, Time)  | |
|  |   Translation: "I feel crushing chest pressure"   |  |                                       | |
|  |   [Rounded 1.9rem with 0.5rem bottom-left tail]   |  | Composed Sentence & Translate Action  | |
|  |   [🔊 Read Aloud Button]                          |  |                                       | |
|  +---------------------------------------------------+  +---------------------------------------+ |
|                                                                                                   |
+===================================================================================================+
| ZONE 5: STICKY ACTIONBAR ("The Thumb Bar Rule", 1px Frost Line Top Rule, Clinic White 92%)        |
| [Privacy Guarantee Note]                                 [Review Clinical Summary / Pass Device]  |
+===================================================================================================+
```

---

## 3. Precision Placement & Ergonomic Rationale for Core Controls

### A. One-Tap Start Button (`button-mic`)
- **Dimensions & Geometry:**
  - Base Hitbox: **128px × 128px** circular disc (`144px` on desktop viewports from `sm`).
  - Shape: Full pill circle (`rounded-full`) with `Lift` elevation shadow (`0 2px 4px rgb(16 30 52 / 0.06), 0 22px 44px -14px rgb(16 30 52 / 0.26)`).
- **Color & State Transitions:**
  - *Resting State:* Signal Blue (`#2d5f8b`) fill with white microphone icon (48px) and bold uppercase Figtree text `"TAP TO SPEAK"` (white on Signal Blue contrast ratio is 6.73:1).
  - *Active Listening State:* Synapse Navy (`#101e34`) fill with an **8px Blue Wash (`#e6eef6`) outer ring**, square stop icon (`#77a0c4`), and visible status text `"LISTENING (Ns)"`.
- **Placement & Touch Ergonomics:**
  - **Mobile (375px–430px):** Placed strictly in the lower 30% **Natural Thumb Zone** of the viewport. The oversized 128px target permits one-handed activation with either left or right thumb while the clinician supports the device.
  - **Tablet (768px–1024px):** Centered within the right-hand intake card. Allows either a clinician holding the bezel with two hands or a patient lying in an exam bed to tap without reach fatigue or motor hesitation.
  - **Laptop / Telehealth (1280px–1440px):** Positioned within the persistent intake action dock and bound to the <kbd>Spacebar</kbd> keyboard shortcut for push-to-talk operation during telehealth video calls.

### B. Live Translation & Caption Box
- **Screen Presence:**
  - Anchors **60% of the horizontal desktop/tablet split** or the primary top card on mobile.
  - Sized with a scrollable dialogue viewport (minimum height 320px, max 520px) to maintain visibility of at least 3 previous exchanges.
- **Speech Bubble Geometry (The Tail Corner Rule):**
  - **Patient Voice:** Blue Wash (`#e6eef6`) fill, Navy Ink (`#101e34`) text, `1.9rem` corners with a single **`0.5rem` tail at bottom-left** (`rounded-tail-left`), left-aligned.
  - **Clinician Voice:** Synapse Navy (`#101e34`) fill, white text, `1.9rem` corners with a single **`0.5rem` tail at bottom-right** (`rounded-tail-right`), right-aligned.
  - **Read-Back / Back-Translation:** Cool Mist (`#eef3f8`) fill, Navy Ink text, `1.9rem` corners with `0.5rem` tail at bottom-right.
- **Bedside 180° Flip Affordance:**
  - Located in the translation box header.
  - Tapping **"Flip View"** rotates the conversation stream 180° via CSS transform. When provider and patient sit face-to-face across an exam table, the patient can read their native language right-side up without physically picking up or passing the tablet.
- **Deaf / Hard-of-Hearing Visual Sound Alerts:**
  - Environmental events (`[Audible pulse-oximeter tone steady 98%]`, `[Door knock]`, `[Monitor alert]`) render inline inside an amber/mist rounded callout with an active pulsing border (`sound-visual-flash`), ensuring no auditory cue is lost.
- **Audio Read-Aloud Button:**
  - Blue Wash (`#e6eef6`) pill with Deep Signal Blue (`#1f4a70`) text and speaker icon.
  - *Mandatory Rule:* Never rendered when Deaf/HoH mode is active.

### C. Persistent Accessibility Toolbar
- **Placement:** Pinned immediately below the 64px header on Raised Navy (`#1b2c47`), guaranteeing zero-click access without buried settings modals.
- **Touch Targets:** Full pills with minimum height of `40px` (expanding to `52px` under 150% font scaling).
- **Modes Supported:**
  1. **Standard:** Balanced layout for general multi-lingual clinical dialogue.
  2. **Deaf / HoH Captions:** Increases caption size to 20px–22px Figtree bold, enables speaker badges, and activates environmental sound alerts.
  3. **Low-Literacy & Pictures (AAC):** Replaces free-text priority with the visual pictogram communication board and Grade 3–4 simplified vocabulary.
  4. **Can't Speak / Mute:** Equips the patient with one-tap rapid medical phrase chips and an automated text-to-speech speaker output.
  5. **High-Contrast (Yellow on Black):** WCAG 2.1 AAA compliant with an extreme **19.5:1 contrast ratio** (`#ffea00` on `#000000` with 2px solid borders).
- **Integrated Font Scaler:**
  - Segmented track with 100%, 125%, and 150% scalers that apply rem scaling across body text and automatically expand interactive touch targets.

### D. Sticky Bottom ActionBar ("The Thumb Bar Rule")
- **Geometry:** Sticky bottom container with `1px Frost Line (#d5e0eb)` top rule, Clinic White at 92% over a 24px backdrop blur, and bottom safe-area insets.
- **Responsive Layout:**
  - *Mobile:* Actions stack in a full-width vertical column with the primary action on top.
  - *Tablet & Desktop:* Right-aligned horizontal row with primary action last.
  - *RTL Languages:* Mirrored automatically so the primary CTA sits in the natural reading direction.

---

## 4. Full Component Hierarchy & Data Architecture

```
App.tsx (Root State: activeStage, holder, selectedLanguage, dialogue[], summaries)
│
├── Header.tsx (Translucent Synapse Navy Bar: 64px)
│    ├── SynapseLockup (Interlocking 'S' Mark in White & Light Blue + SYN(white)APSE(light blue))
│    ├── HolderPill [Role Pill: Clinician Raised Navy | Patient Blue Wash (Polite Live Region)]
│    ├── StageNavLinks [Session Flow | Dual Summaries | Layout Blueprint]
│    ├── DevicePreviewSwitcher [Mobile 390px | Tablet 820px | Laptop 1280px]
│    └── TwoStepClearAction [Clear -> Cancel or Clear Now]
│
├── AccessibilityToolbar.tsx (Persistent Rail on Raised Navy #1b2c47)
│    ├── ModeTabs [Standard | Deaf/HoH | Low-Literacy AAC | Can't Speak | Yellow/Black AAA]
│    ├── FontScalePillTrack [100% | 125% | 150%]
│    └── AudioNarrationToggle [Blue Wash Pill, Deep Signal Blue text; omitted in Deaf/HoH]
│
├── Main Viewport Frame (Clinic White Ground #ffffff)
│    │
│    ├── [Stage: patient-intake]
│    │    ├── LiveTranslationBox.tsx (60% Desktop Split)
│    │    │    ├── BoxHeader (Live indicator, Provider ⇄ Patient, 180° Bedside Flip Button)
│    │    │    ├── MessageStream (Scrollable region with role-specific speech bubbles)
│    │    │    │    ├── ClinicianBubble (Synapse Navy #101e34, 1.9rem with bottom-right tail)
│    │    │    │    ├── PatientBubble (Blue Wash #e6eef6, 1.9rem with bottom-left tail)
│    │    │    │    └── AmbientSoundAlert (Inline visual pulse cue)
│    │    │    └── ClinicianQuickInputBar (Fast prompt input with English-to-Target translation)
│    │    │
│    │    └── MultilingualIntake.tsx (40% Desktop Split)
│    │         ├── LanguageChoiceStrip (One-Tap Choice Pills: ES, ZH, VI, AR, HT, TL, RU, FR, EN)
│    │         ├── TriModalTabTrack [Voice (Speak) | Pictures (AAC) | Type / Phrases]
│    │         ├── ButtonMic (128px Signal Blue Disc, turns Navy with 8px ring when listening)
│    │         ├── PictureTilesGrid (1.75rem rounded tiles with Signal Blue pictograms)
│    │         └── SuggestedPhrasePills (56px Choice Pills)
│    │
│    ├── [Stage: handoff-to-clinician]
│    │    └── HandoffScreen.tsx (Full-Screen Synapse Navy Screen Turn)
│    │         ├── HandoffDisc (96px Raised Navy disc holding 44px Light Blue glyph)
│    │         ├── HandoffHeadline ("Pass device back to the clinician" / Patient Language)
│    │         ├── PrivacyNoticeBadge ("The summary is hidden while the patient holds the device")
│    │         └── RitualButton (56px Light Blue fill with Navy text: "I'm the clinician")
│    │
│    ├── [Stage: clinician-review]
│    │    └── DualSummariesView.tsx (Synchronous Dual Summaries)
│    │         ├── PatientRecapSheet (Paper White / Cool Mist, 4th-5th Grade Plain Language)
│    │         │    ├── WhatHappenedList (Icon bullets)
│    │         │    ├── CareInstructionsList
│    │         │    ├── MedicationsCardGrid
│    │         │    ├── RedFlagsDangerCallout
│    │         │    └── AudioReadAloudPlayer (Text-to-Speech synthesis)
│    │         │
│    │         └── ClinicianSummarySheet (Synapse Navy #101e34, 2rem with bottom-right tail)
│    │              ├── ChiefComplaintHeadline (Figtree bold)
│    │              ├── RedFlagBlock (1.25rem Light Blue #77a0c4 Inset with Navy text & Navy pills)
│    │              ├── DurationAndSymptomsCards (Raised Navy #1b2c47 insets)
│    │              ├── SubjectiveHPI (Patient's direct quotes & back-translation verification)
│    │              ├── ObjectiveVitals (Tabular vitals & AAC pictogram log)
│    │              ├── AssessmentAndTriage (Acuity Level & Differential Considerations)
│    │              └── PlanAndOrders (Immediate orders, prescribed meds, 1-Click EHR Copy)
│    │
│    ├── [Stage: teach-back]
│    │    └── TeachBackFlow (Verification of Patient Comprehension)
│    │         ├── PatientInstructionBubble (In native language and script)
│    │         └── TeachBackChoiceTiles [Yes, I understand | No, please explain | I am not sure]
│    │
│    └── [Stage: inspector]
│         └── LayoutHierarchyInspector.tsx (Interactive Wireframe & Fitts' Law Specification)
│
└── Sticky ActionBar (1px Frost Line top rule, Clinic White at 92%, safe-area inset)
     ├── PrivacyDeclaration ("Designed to reduce communication friction · No patient data stored")
     └── PrimaryActionCTA ("Review Clinical Summary" / "Pass Device")
```

---

## 5. Visual Language & Design Tokens Reference

### Color Palette (Grounded in Synapse Brand Guidelines)

| Token Name | Hex Code | WCAG Contrast Ratio | Purpose & Application |
| :--- | :--- | :--- | :--- |
| `navy` | `#101e34` | 16.7:1 on White | Logo field, header background, clinician bubbles, summary sheet |
| `navy-raised` | `#1b2c47` | 12.4:1 on White | Raised cards on navy, toolbar background, pressed navy surfaces |
| `blue` | `#77a0c4` | 6.05:1 on Navy | Logo signal accent, "APSE", red flag inset, active stage pills |
| `blue-deep` | `#2d5f8b` | 6.73:1 on White | Primary buttons (`button-primary`), 128px mic, selected choice pills |
| `blue-deeper` | `#1f4a70` | 7.89:1 on Blue-Soft | Button hover states, text on `blue-soft`, quiet-button labels |
| `blue-soft` | `#e6eef6` | 13.5:1 on Navy | Patient speech bubbles, language chips, confirmed state pills |
| `ground` | `#ffffff` | 16.7:1 with Navy Ink | Clinic White primary page background |
| `ground-2` | `#eef3f8` | 14.8:1 with Navy Ink | Cool Mist segmented track, quiet sheets, read-back bubbles |
| `ink` | `#101e34` | 16.7:1 on Ground | Primary text across all white/light surfaces |
| `ink-soft` | `#4a6380` | 6.20:1 on Ground | Secondary text, field labels, dashed pending borders |
| `line` | `#d5e0eb` | 3.10:1 on Ground | Frost Line row dividers, choice button rings, top action rule |
| `on-navy-soft`| `#b9c9db` | 9.89:1 on Navy | Secondary labels and subheadings on Synapse Navy surfaces |

### The 7 Named Architectural Rules
1. **The Light-Blue-On-Navy Rule:** The logo light blue (`#77a0c4`) is strictly for navy surfaces and decorative backdrops. On white, readable and pressable elements must use Signal Blue (`#2d5f8b`) or Deep Signal Blue (`#1f4a70`).
2. **The Act-or-Confirmed Rule:** Signal Blue appears only on pressable interactive controls or states confirmed by the user. Decorative surfaces must use Blue Wash or Cool Mist.
3. **The Form-Before-Hue Rule:** Every state must be distinguishable in grayscale: solid outline for asked, dashed border for pending, filled with check for remembered/selected. Red flags use a Light Blue inset with Navy text and Navy pills; destructive actions use Navy Ink text and a Slate Blue ring. No red color is ever used.
4. **The On-Navy Mist Rule:** Primary text on navy is white; secondary text is On-Navy Mist (`#b9c9db`). Readable secondary text never uses translucent white or Slate Blue.
5. **The Language Face Rule:** Every block of patient-language text carries explicit `lang` and `dir` attributes (`lang="zh-Hans"`, `lang="ar" dir="rtl"`), and internal UI controls opt back to `lang="en" dir="ltr"`.
6. **The Thumb Bar Rule:** All primary session actions reside in the sticky bottom ActionBar. Phones stack them full-width with the primary on top; desktop viewports align them in a right-aligned row (mirrored under RTL).
7. **The Two-Step Clear Rule:** Destructive clearing happens in place within the session bar: first press reveals `"Cancel"` and `"Clear now"`. Session data is never cleared on an accidental single tap.

---

## 6. Privacy, Security & Clinical Claims Boundaries

To maintain strict regulatory compliance and patient trust, the codebase adheres to explicit product boundaries:
- **Zero Identifiable Data (PHI):** No patient names, MRNs, dates of birth, or addresses are stored to cookies, localStorage, or remote databases.
- **In-Memory Volatility:** All dialogue and generated summaries exist exclusively in browser memory and are wiped upon session end, clear button confirmation, or 5-minute idle timeout.
- **Approved Communication Claims:**
  - *Approved:* "Designed to avoid identifiable patient data", "Designed to reduce communication friction", "A translation and communication bridge".
  - *Prohibited:* "HIPAA compliant", "Certified medical interpreter", "Guarantees diagnostic accuracy", "Reduces hospital readmission rates".

---

*This specification serves as the formal engineering blueprint and design manual for SYNAPSE.*
