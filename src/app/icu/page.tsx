import type { Metadata } from "next";
import { RequireClinician } from "@/components/auth/require-clinician";
import { IcuBoard } from "@/components/communication/icu-board";

export const metadata: Metadata = {
  title: "Eye mode · Synapse",
  description: "A communication board with on-device gaze control and dwell selection.",
};

export default function IcuPage() {
  return (
    <RequireClinician next="/icu">
      <IcuBoard />
    </RequireClinician>
  );
}
