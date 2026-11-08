import { callMock } from "./providers/mock";
import { callNvidia } from "./providers/nvidia";

export type ModelRequest = { system: string; user: string; signal?: AbortSignal };

/** Provider-neutral text in/text out. Callers validate JSON against the shared schemas. */
export async function callModel(request: ModelRequest): Promise<string> {
  const provider = process.env.LLM_PROVIDER?.trim() || "mock";
  if (provider !== "mock" && provider !== "nvidia") {
    // Do not echo configuration values or prompt content in errors.
    throw new Error("LLM provider is not configured.");
  }
  return (provider === "nvidia" ? callNvidia : callMock)({
    ...request,
    system: `${request.system}\nOmit names, IDs, dates of birth, phone numbers, addresses, and other identifiers. Do not diagnose.`,
  });
}
