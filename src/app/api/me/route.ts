import { authHandlers } from "@/lib/server/auth";

export const GET = authHandlers.me;
export const PATCH = authHandlers.update;
