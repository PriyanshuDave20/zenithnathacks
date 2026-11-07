# Synapse: Personalization / ML Plan

**Status: mostly cut.** Patient data is not stored (see `docs/PRODUCT.md`, Privacy), so there are no
cross-visit profiles, learned per-patient models, bandits, or clustering. Do not add storage to revive them.

## What remains: within-visit adaptation (optional)
All state lives in browser memory for the length of one visit and is cleared at the end.
- Complexity level (1-5): the clinician-response step can be simplified further if the patient's teach-back
  tap says they did not understand. Claude rewrites at the lower level.
- Rule-based flow tweaks within the visit (for example offer pictograms if the patient skips free-text steps).

## Prompt quality is the main "intelligence" work
- Translation and structuring prompts tested on 3-4 canned synthetic stories in several languages.
- Back-translation check and a low-confidence flag on risky phrases.
- Instruction to omit names, dates of birth, phone numbers, and addresses.

## Honest framing
Synthetic data shows the mechanism and proxy metrics (time to first message, teach-back confirmed),
not clinical outcomes.
