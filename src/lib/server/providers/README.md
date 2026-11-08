# Model adapters

`llm.ts` is the only entry point for future routes. It accepts `{ system, user }`
and returns a `Promise<string>` containing model text. `mock` remains the default;
it needs no network, model, or API key and ignores `LLM_MODEL`.

## NVIDIA Nemotron (synthetic demos only)

In your ignored `.env`, set `LLM_PROVIDER=nvidia`, `NVIDIA_API_KEY`, and optionally
`LLM_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b`. Restart Next.js after changing env.
Never put a key in `NEXT_PUBLIC_*`, a request from the browser, a tracked file or chat.
The native-fetch adapter calls `https://integrate.api.nvidia.com/v1/chat/completions`;
an HTTPS `NVIDIA_BASE_URL` ending in `/v1` can select a different deployment.
No model SDK is installed. Calls use a 25-second deadline, JSON mode, disabled thinking,
no streaming/cache/credentials/redirects, and no automatic retries. Truncated or
malformed responses fail generically. The existing pipelines redact before/after
the model and validate the task-specific output schema. Best-effort redaction is
not complete identifier detection; do not enter real patient data.

Reviewed 2026-11-07:
- [NVIDIA model API reference](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b-infer)
- [NIM structured JSON/reasoning guidance](https://docs.nvidia.com/nim/large-language-models/2.0.10/get-started/advanced/get-started-nemotron-3.5-lightning.html)
- [Model card](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b/modelcard): lists English, Spanish, French, German, Italian and Japanese; Arabic/Chinese quality is unverified here.
- [NVIDIA API Trial Terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf): trial/evaluation only; sections 2.6 and 4.3 prohibit sensitive/identifiable health data, and section 3.3 permits content collection/use. No zero-retention or real-clinic suitability claim is made. Use public static questions and synthetic examples only.

## Mock behavior

Add a real adapter here later (for example Ollama, a hosted open model, or
Anthropic), then select it in `llm.ts` using `LLM_PROVIDER`. Keep provider SDKs out
of routes, omit identifiers in prompts, and validate model JSON with the contracts.
Review the provider's retention terms before using it. No adapter may log bodies
or retain session content.

Ordinary text prompts return a fixed mock notice without echoing the input.
For canned contract-shaped JSON, the mock also accepts a JSON user message with either
`{ "task": "translate", "request": TranslateRequest }` or
`{ "task": "respond", "request": RespondRequest }`. For example:

```ts
const text = await callModel({
  system: "Translate this synthetic example. Omit identifiers. Return JSON only.",
  user: JSON.stringify({ task: "translate", request: STORIES[1].translateRequest }),
});
const response = TranslateResponseSchema.parse(JSON.parse(text));
```

It returns the four synthetic fixture translations and one canned clinician reply
in those languages. Other valid requests get an explicit mock-unavailable response,
never an invented clinical summary or a pretend translation. Guided options are
left for the real translate pipeline. Mock replies are fixed examples; they do not
implement reading-level adaptation. Invalid structured tasks throw a generic error without
including prompt content. This envelope is a mock convention, not an HTTP contract;
no API routes or frontend integration are included in the foundation.
