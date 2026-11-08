import { z } from "zod";
import type { ModelRequest } from "../llm";

export const NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
const CompletionSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.literal("stop"),
    message: z.object({ content: z.string().trim().min(1) }),
  })).min(1),
});

/** Server only. No SDK, retries, conversation history, content logs or response cache. */
export async function callNvidia(request: ModelRequest): Promise<string> {
  try {
    const key = process.env.NVIDIA_API_KEY?.trim();
    if (!key) throw new Error();
    const base = new URL(process.env.NVIDIA_BASE_URL?.trim() || "https://integrate.api.nvidia.com/v1/");
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error();
    const endpoint = new URL(`${base.href.replace(/\/$/, "")}/chat/completions`);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        model: process.env.LLM_MODEL?.trim() || NVIDIA_MODEL,
        messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }],
        temperature: 0,
        max_tokens: 4096,
        stream: false,
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
      }),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: request.signal ? AbortSignal.any([request.signal, AbortSignal.timeout(25_000)]) : AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error();
    const completion = CompletionSchema.parse(await response.json());
    // Never return reasoning_content, request IDs, usage, or provider metadata.
    const content = completion.choices[0].message.content;
    JSON.parse(content); // Reject reasoning, markdown fences and incomplete JSON.
    return content;
  } catch {
    // Provider errors can contain credentials or prompt content. Do not chain the cause.
    throw new Error("Translation provider is unavailable.");
  }
}
