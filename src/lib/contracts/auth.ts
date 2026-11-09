import { z } from "zod";

export const ClinicianRoleSchema = z.enum(["doctor", "nurse", "other"]);
export type ClinicianRole = z.infer<typeof ClinicianRoleSchema>;
const email = z.string().trim().max(254).pipe(z.email()).transform((value) => value.toLowerCase());
const name = z.string().trim().min(1).max(120);
const clinic = z.string().trim().max(200);
const languages = z.array(z.string().min(2).max(35).regex(/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/)).max(20);
export const ClinicianProfileSchema = z.strictObject({
  id: z.string().min(1).max(128), email, name, role: ClinicianRoleSchema, clinic, languages,
  plan: z.strictObject({ name: z.string(), status: z.enum(["active", "trial"]), renews: z.string() }),
  provider: z.enum(["password", "google"]),
});
export type ClinicianProfile = z.infer<typeof ClinicianProfileSchema>;
export type AuthError = { code: string; message: string };
export const SignUpInputSchema = z.strictObject({
  email, password: z.string().min(8).max(128), name, role: ClinicianRoleSchema, clinic,
});
export type SignUpInput = z.infer<typeof SignUpInputSchema>;
export const SignInInputSchema = z.strictObject({ email, password: z.string().min(1).max(128) });
export type SignInInput = z.infer<typeof SignInInputSchema>;
export const ProfilePatchSchema = z.strictObject({
  name: name.optional(), role: ClinicianRoleSchema.optional(), clinic: clinic.optional(), languages: languages.optional(),
}).refine((value) => Object.keys(value).length > 0);
export type ProfilePatch = z.infer<typeof ProfilePatchSchema>;
export const ForgotPasswordInputSchema = z.strictObject({ email });
export const ResetPasswordInputSchema = z.strictObject({
  token: z.string().min(1).max(256).regex(/^[a-zA-Z0-9_-]+$/), newPassword: z.string().min(8).max(128),
});
