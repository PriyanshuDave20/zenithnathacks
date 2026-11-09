# Translation and guided communication

Free-form patient text/transcripts pass through Azure Translator into English.
`callModel` receives English for summary extraction and plain-language reply/teach-back
preparation. Azure translates the canonical English read-back and prepared reply
fields into the patient's language. A summary never replaces the full translation
used for read-back. Set `TRANSLATION_PROVIDER=azure` independently of
`LLM_PROVIDER=nvidia`; see [Azure setup](AZURE.md) for server-only credentials.
New clones default to offline mocks. Unknown foreign mock text fails explicitly;
Azure errors never fall back to multilingual Nemotron. See
`src/lib/server/providers/README.md` for NVIDIA's hosted-trial restrictions.

Guided answers never call a model. The browser submits registered question/option
IDs; the server maps them to fixed English labels and assembles a report. The
internal `/api/translate` handler still accepts these submissions, but makes zero
external translation calls. Mixed submissions send only their text/transcript
portion through translation/English processing and combine it with the deterministic guided report.
Typed details attached to a question are still free text, not cached answers.

## Static language packs

`src/lib/questions/index.ts` owns the 17 English questions and answer IDs.
`localization.ts` selects five for the bedside flow. The frontend now uses those
same IDs and the canonical 0–10 severity scale; the old mock /5 scale is no longer
used by the active guided flow. Detailed body-part IDs retain side and location.
Fixed phrase taps use registered `phrase:*` IDs and their existing static demo
translations; they do not become free text. Changing the typed draft still invokes
the translation pipeline. Legacy frontend mock data remains for other demo surfaces.

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

Generation uses Azure Translator explicitly, independently of runtime provider
selection. It sends bounded batches of public source strings; IDs and English
clinical mappings stay in code. Cardinality, nonempty strings, numbers and writing
systems are checked before publication. Severity answers are numeric data formatted
as `value/10`, so they need no translation call. Numbers/scales are checked again
when loading packs. Complete current packs are reused with **zero** provider calls.
Writes are atomic per language; failure preserves the last complete pack. These
maintenance commands are never called by a route, page or server startup.

All generated packs are **drafts**. Clinical and fluent-speaker review must check
meaning, negation, side, uncertainty, numbers and accessibility before marking a
pack `reviewed`. Schema tests and successful live calls do not establish translation
accuracy. The current Spanish, Arabic and Simplified Chinese packs were explicitly
regenerated with Azure Translator on 2026-11-08 and remain drafts. Their English
source snapshots, question/answer IDs and clinical mappings are unchanged.
Earlier Nemotron generation exposed mixed-script Arabic labels and English filler
in Chinese scale answers; those packs have now been replaced. Numeric scale
formatting remains deterministic. Wrong-script output fails validation and is never
served as a valid pack. Successful Azure generation is not a fluent-speaker or
clinical sign-off.

## Reports and failure behavior

### Eye mode

Eye intake and conversation use a separate fixed four-language catalog in
`src/lib/questions/eye-localization.ts` (`en`, `es`, `ar`, `zh-Hans`). Patient setup
passes the language to the Eye memory store; direct entry has a clinician-only
language selector. Changing language clears the previous Eye flow. Patient text
and spoken clauses are localized deterministically; the clinician's structured
summary and choice log retain their English meaning. This catalog is a draft and
still requires fluent-speaker and clinical review.

Eye speech resolves complete registered clauses into public Azure MP3 playlists.
No selected answers are sent to a model, Translator or runtime synthesis endpoint.
Only the fixed public source wording is supplied to the explicit speech-generation
maintenance tool. Missing/failed audio offers an explicit device-voice fallback;
autoplay blocking offers a fresh-tap replay. Replay does not record another choice
or metric. Mute, Clear, language/account changes, Help cancellation, handoff and
navigation stop playback and invalidate pending callbacks. Session content and
audio selection remain in memory.

Guided reports preserve selected labels and explicit negative/uncertain answers.
They do not infer diagnoses or symptoms from a selected body region. Only selected
positive answers to the explicit red-flags question populate its red-flags array;
this is not automated triage. English clinical headings and values are deterministic
across languages. Draft wording produces a review notice in `lowConfidence`.

Every external text boundary and final output undergo best-effort redaction;
English model outputs use strict schemas. Nonclinical conversation is translated normally with no invented clinical
fields. An explicitly null optional provider duration is normalized to omission;
other malformed fields still fail validation. Provider/invalid-output errors return generic 502 responses; the frontend
retains the draft. Mock/unavailable reply notices remain explicit and are never
translated as though they were clinician instructions. No existing HTTP schema fields changed.

Only public static language packs are written to JSON. Patient inputs, responses,
summaries, identifiers and session history are never written to files, a database,
logs or a translation cache. Browser session content remains in memory. Synthetic
data only: best-effort redaction does not authorize sending real patient data to
NVIDIA's hosted trial.
