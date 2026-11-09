import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { ClinicianProfileSchema, type ClinicianProfile } from "../../contracts/auth";
import { readAuthConfig } from "./config";
import { authOptions } from "./options";
import { createAuthHandlers } from "./service";

function createRuntimeAuth() {
  return betterAuth({
    ...authOptions(readAuthConfig()),
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
  });
}
let instance: ReturnType<typeof createRuntimeAuth> | undefined;
/** Lazy initialization allows builds without credentials; runtime fails closed. */
export function getAuth() {
  if (!instance) instance = createRuntimeAuth();
  return instance;
}
const profileSelection = { id: true, email: true, name: true, role: true, clinic: true, languages: true } as const;
async function ownClinicianId(headers: Headers): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });
  return session?.user.id ?? null;
}
async function readOwnProfile(id: string): Promise<ClinicianProfile | null> {
  const clinician = await db.clinician.findUnique({ where: { id }, select: profileSelection });
  if (!clinician) return null;
  const credential = await db.clinicianAccount.findFirst({ where: { userId: id, providerId: "credential" }, select: { id: true } });
  return ClinicianProfileSchema.parse({
    ...clinician, provider: credential ? "password" : "google",
    plan: { name: "Demo access", status: "active", renews: "not scheduled" },
  });
}
/** Validates the signed cookie AND database session on every request; never globally cached. */
export async function getCurrentClinician(headers: Headers): Promise<ClinicianProfile | null> {
  const id = await ownClinicianId(headers);
  return id ? readOwnProfile(id) : null;
}
export const authHandlers = createAuthHandlers({
  config: readAuthConfig,
  call: (request) => getAuth().handler(request),
  current: getCurrentClinician,
  patch: async (headers, patch) => {
    const id = await ownClinicianId(headers);
    if (!id) return null;
    await db.clinician.update({ where: { id }, data: patch, select: { id: true } });
    return readOwnProfile(id);
  },
});
