import type { Metadata } from "next";
import { RequireClinician } from "@/components/auth/require-clinician";
import { CommunicationWorkspace } from "@/components/communication/workspace";

export const metadata: Metadata = {
  title: "Session · Synapse",
  description:
    "Start a Synapse session: the patient describes the problem their way, the clinician reads a clear summary.",
};

// The visit runs entirely in the browser's memory; nothing is stored or sent except to the translation API.
export default function StartPage() {
  return (
    <RequireClinician next="/start">
      <CommunicationWorkspace />
    </RequireClinician>
  );
}
