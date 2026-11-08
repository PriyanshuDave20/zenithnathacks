type Dependencies = {
  origin: () => string;
  clinician: (headers: Headers) => Promise<unknown | null>;
};
const failure = (status: number, code: string, message: string) => Response.json(
  { error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } },
);

/** Authenticate before consuming patient input or calling paid providers. */
export function protectClinician(
  handler: (request: Request) => Promise<Response>,
  dependencies?: Dependencies,
): (request: Request) => Promise<Response> {
  return async request => {
    try {
      const origin = dependencies ? dependencies.origin() : (await import("./auth/config")).readAuthConfig().baseURL;
      if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") {
        return failure(403, "forbidden", "Use Synapse from its configured app origin.");
      }
      const clinician = dependencies
        ? await dependencies.clinician(request.headers)
        : await (await import("./auth")).getCurrentClinician(request.headers);
      if (!clinician) return failure(401, "unauthorized", "Sign in to your clinician account.");
    } catch {
      return failure(503, "auth_unavailable", "The clinician account service is unavailable.");
    }
    return handler(request);
  };
}
