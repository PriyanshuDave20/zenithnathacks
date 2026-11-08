# Translation and guided communication

Free-form patient text/transcripts and clinician replies use `callModel`. Set
`LLM_PROVIDER=nvidia` and `NVIDIA_API_KEY` in ignored `.env` for the selected
`nvidia/nemotron-3.5-lightning-30b-a3b`; mock stays the no-key default for new clones.
The key is server-only. See `src/lib/server/providers/README.md` for endpoint,
timeout, model limitations and the hosted trial's data-use restrictions.

Guided answers never call a model. The browser submits registered question/option
IDs; the server maps them to fixed English labels and assembles a report. The
internal `/api/translate` handler still accepts these submissions, but makes zero
external translation calls. Mixed submissions send only their text/transcript
portion to the model and combine its result with the deterministic guided report.
Typed details attached to a question are still free text, not cached answers.

## Static language packs

`src/lib/questions/index.ts` owns the 17 English questions and answer IDs.
`localization.ts` selects five for the bedside flow. The frontend now uses those
same IDs and the canonical 0–10 severity scale; the old mock /5 scale is no longer
used by the active guided flow. Detailed body-part IDs retain side and location.
Fixed phrase taps use registered `phrase:*` IDs and their existing static demo
translations; they do not become free text. Changing the typed draft still invokes
the model. Legacy frontend mock data remains for other demo surfaces.

`src/lib/questions/language-packs.json` contains generated Spanish, Arabic and
Simplified Chinese questions **and answer labels**. English comes directly from
the source. Each pack stores schema version, language, model, generation time,
review status and an exact English source snapshot including clinical wording.
The clinical mapping is owned by code/source data, never generated from a patient's
translated labels. Any changed source text, option ID, English label or clinical
mapping invalidates the old pack. Missing/stale packs fail explicitly; runtime
requests never generate a pack or silently show English as a translated question.

Generate or reuse static packs from public source strings only:

```sh
npm run questions:translate -- es ar zh-Hans
# Explicitly regenerate a language, resetting it to draft:
npm run questions:translate -- es --force
# Live checks use checked-in synthetic fixtures and print only status/timing:
npm run llm:smoke
```

Generation works independently of the app's `LLM_PROVIDER`, using NVIDIA explicitly.
It translates at most three questions per request, validates exact IDs/nonempty
strings and the expected writing system, protects numeric values in questions as
placeholders and restores them locally. Severity answers are numeric data formatted
as `value/10`, so the model does not translate eleven copies of the same scale.
Numbers/scales are checked again when loading packs. Complete, current packs are reused with **zero** model calls.
Writes are atomic per language; failure preserves the last complete pack. These
maintenance commands are never called by a route, page or server startup.

All generated packs are **drafts**. Clinical and fluent-speaker review must check
meaning, negation, side, uncertainty, numbers and accessibility before marking a
pack `reviewed`. Schema tests and successful live calls do not establish translation
accuracy. Arabic/Chinese are not listed among this model card's supported languages;
their packs and synthetic live calls succeeded, but language quality is unverified.
Actual generation exposed mixed-script Arabic labels and English filler in Chinese
scale answers. The checked-in draft records five Arabic source-vocabulary corrections
in `reviewNotes`; numeric scale formatting is now deterministic. Wrong-script output
fails validation and is never served as a valid pack. These corrections are not a
fluent-speaker or clinical sign-off.

## Reports and failure behavior

Guided reports preserve selected labels and explicit negative/uncertain answers.
They do not infer diagnoses or symptoms from a selected body region. Only selected
positive answers to the explicit red-flags question populate its red-flags array;
this is not automated triage. English clinical headings and values are deterministic
across languages. Draft wording produces a review notice in `lowConfidence`.

Free-form model outputs still undergo strict schema validation and best-effort
redaction. Provider/invalid-output errors return generic 502 responses; the frontend
retains the draft. The reply prompt has a fixed `Translation unavailable.` sentinel
for unsupported translation; the UI shows interpreter guidance instead of asking
the patient to confirm that placeholder. No existing HTTP schema fields changed.

Only public static language packs are written to JSON. Patient inputs, responses,
summaries, identifiers and session history are never written to files, a database,
logs or a translation cache. Browser session content remains in memory. Synthetic
data only: best-effort redaction does not authorize sending real patient data to
NVIDIA's hosted trial.
