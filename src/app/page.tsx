import { SiteHeader } from "@/components/home/site-header";
import { Hero } from "@/components/home/hero";
import { Workflow } from "@/components/home/workflow";
import { Modes } from "@/components/home/modes";
import { Privacy } from "@/components/home/privacy";
import { Closing } from "@/components/home/closing";
import { HeartbeatJourney } from "@/components/home/heartbeat-journey";
import { PhoneRail } from "@/components/home/phone-rail";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="relative flex-1 bg-ground">
        <Hero />
        <Workflow />
        <Modes />
        <Privacy />
        <PhoneRail />
      </main>
      <Closing />
      <HeartbeatJourney />
    </>
  );
}
