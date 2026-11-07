# Model adapters

`llm.ts` is the only entry point for future routes. It accepts `{ system, user }`
and returns a `Promise<string>` containing model text. Only `mock` is implemented;
it needs no network, model, or API key. `LLM_MODEL` is reserved and ignored by mock.

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
