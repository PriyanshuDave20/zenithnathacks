import type { Metadata } from "next";
import { RequireClinician } from "@/components/auth/require-clinician";
import { IcuBoard } from "@/components/communication/icu-board";

export const metadata: Metadata = {
  title: "Eye mode · Synapse",
  description: "A frontend preview of the eye-selection communication board.",
};

export default function IcuPage() {
  return (
    <RequireClinician next="/icu">
      <IcuBoard />
    </RequireClinician>
  );
}
