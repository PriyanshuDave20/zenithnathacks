import { authHandlers } from "@/lib/server/auth";

// Deliberately allow only the native Google callback. All other routes return 404.
export const GET = authHandlers.callback;
export const POST = authHandlers.callback;
