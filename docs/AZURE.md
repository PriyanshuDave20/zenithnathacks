# Azure translation and speech setup

Synapse separates multilingual translation from English language-model processing.
Azure Translator handles free-form patient text/transcripts, read-backs and clinician
replies. Nemotron receives English for summary extraction and plain-language reply
preparation. Guided selections retain their existing local English mappings and
reviewed/draft language packs; they never need a live translation or LLM call.

## Local resources

1. Sign in to [Azure portal](https://portal.azure.com/) with an Azure subscription.
2. Create a **Translator** resource. Select **F0 (Free)**. Open **Keys and Endpoint**
   and copy a key and the resource region into the gitignored `.env`.
3. Create a **Speech** resource with **F0 (Free)**. Copy its key and region from
   **Keys and Endpoint** into `.env`. Use prebuilt neural voices; no voice cloning,
   custom voice training, batch synthesis or storage resource is needed.
4. Keep the existing server-only NVIDIA key/model settings, then configure:

```dotenv
LLM_PROVIDER=nvidia
LLM_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
TRANSLATION_PROVIDER=azure
AZURE_TRANSLATOR_KEY=your_translator_key
AZURE_TRANSLATOR_REGION=global
SPEECH_PROVIDER=azure
AZURE_SPEECH_KEY=your_speech_key
AZURE_SPEECH_REGION=your_speech_region
```

`global` is for a global Translator resource. Otherwise use its actual region.
Speech must use the actual region of its own resource. The resources can have
different keys and regions. Never paste keys into chat or put them in
`NEXT_PUBLIC_*`. Restart `npm run dev` after updating configuration.

New clones default to `LLM_PROVIDER=mock`, `TRANSLATION_PROVIDER=mock` and
`SPEECH_PROVIDER=browser`: no paid service or API key is required for offline
synthetic fixtures and guided communication. Mock translation is fixture-only;
unknown foreign text must fail explicitly. Configuring Azure does not authorize
fallback to multilingual Nemotron if Azure fails.

## Static guided wording and audio

Existing language packs remain drafts until fluent-speaker and clinical review.
The explicit maintenance commands use only the public source catalog:

```sh
# Reuse current packs, or use --force to replace a language with a new Azure draft.
npm run questions:translate -- es ar zh-Hans
npm run questions:translate -- ar --force
# Generate/reuse prebuilt voice clips; no patient text can be supplied to this command.
npm run speech:generate -- en es ar zh-Hans
# Check the complete text pipeline with checked-in synthetic fixtures, without body logs.
npm run llm:smoke
```

Review/regenerate language packs before generating their audio. Changed wording
invalidates old clip selection. Public clips are reusable application assets;
guided playback falls back to the browser when a matching clip is absent. Free-form
audio is synthesized per request and never written into this directory.
The public generator deduplicates identical wording, reuses existing clips and
paces new synthesis calls for F0's request limits. Initial generation takes minutes
per language and can be resumed; it is never run by a route, startup or patient flow.

Microsoft currently lists 2 million characters/month for Translator F0 and
500,000 neural TTS characters/month for Speech F0. A back-translation and multiple
reply fields consume additional characters; the services have separate quotas.
See [Translator pricing](https://azure.microsoft.com/en-us/pricing/details/translator/)
and [Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/).

## Privacy and service boundaries

Synthetic data only. Existing identifier redaction remains best effort, so it does
not authorize sending real patient information. Text/audio/session content must
not be written to logs, files, a database, browser storage or content caches.
Runtime audio is ephemeral. Only public static question/phrase wording and its
generated audio may be saved as application assets.

Reviewed 2026-11-08:

- [Translator REST v3](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate)
  uses the Translator API independently of the NVIDIA chat endpoint.
- [Translator privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/translator/data-privacy-security)
  and [No Trace policy](https://www.microsoft.com/en-us/translator/business/notrace/)
  describe text translation without persistent storage of submitted content.
- [Speech real-time REST](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)
  and [prebuilt neural voice privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/text-to-speech/data-privacy-security)
  describe real-time synthesis with no input/output content in Microsoft logs.
  Those statements are not a claim about custom training or batch APIs.
- NVIDIA's hosted trial restrictions still apply to English processing; see
  [provider notes](../src/lib/server/providers/README.md). Redacting or translating
  input does not establish real-clinic suitability.

Supported language lists, passing schema checks and successful API calls do not
establish medical translation or pronunciation accuracy. Review Arabic, Mandarin
and every added language with fluent speakers, including negation, laterality,
uncertainty, numbers, durations and clinician instructions.
