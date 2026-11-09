import { protectClinician } from "@/lib/server/clinician-api";
import { POST as handle } from "./handler";
export { GET } from "./handler";

export const POST = protectClinician(handle);
