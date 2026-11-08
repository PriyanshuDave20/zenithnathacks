import { STORIES } from "../fixtures/stories";
import { translate } from "../translate";
import { respond } from "../respond";

/** Explicit live check using checked-in synthetic fixtures only; never prints their content. */
export async function run(): Promise<void> {
  if (!process.env.NVIDIA_API_KEY?.trim() || !process.env.AZURE_TRANSLATOR_KEY?.trim()) throw new Error("Translation provider is unavailable.");
  process.env.LLM_PROVIDER = "nvidia";
  process.env.TRANSLATION_PROVIDER = "azure";
  for (const story of STORIES) {
    const started = Date.now();
    const translated = await translate(story.translateRequest);
    const reply = await respond(story.respondRequest);
    if (translated.translated.startsWith("Mock provider:") || reply.patientText.startsWith("Mock provider:")) {
      throw new Error("Synthetic live smoke test did not use the selected provider.");
    }
    console.info(JSON.stringify({ language: story.translateRequest.context.language, schemaValid: true, elapsedMs: Date.now() - started }));
  }
}
