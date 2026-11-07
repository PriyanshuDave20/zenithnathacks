import type { ReactNode } from "react";
import { languages, summary, type Step } from "./data";
import { Bubble, ScreenBar } from "./phone";
import { Captions, Check, Clear, Handoff, IdMasked, Keyboard, Mic, PictoChest, Shield, Speaker } from "./icons";

const es = languages[0];

function Choice({ on, children, icon }: { on?: boolean; children: ReactNode; icon?: ReactNode }) {
  return (
    <span
      className={`flex min-h-12 items-center gap-2 rounded-full px-4 text-base font-semibold ${
        on ? "bg-blue-deep text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line"
      }`}
    >
      {on ? <Check size={16} /> : icon}
      {children}
    </span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 mt-4 text-sm font-medium text-ink-soft first:mt-0">{children}</p>;
}

function PrimaryBar({ children }: { children: ReactNode }) {
  return (
    <div className="mt-auto px-4 pb-5">
      <span className="flex min-h-13 items-center justify-center gap-2 rounded-full bg-blue-deep text-base font-semibold text-white shadow-lift">
        {children}
      </span>
    </div>
  );
}

export function StepScreen({ step, index }: { step: Step; index: number }) {
  const n = `Step ${index + 1} of 6`;
  switch (step.id) {
    case "start":
      return (
        <>
          <ScreenBar holder="Clinician" step={n} />
          <div className="px-4 pt-4">
            <p className="font-display text-xl font-bold leading-tight">New patient</p>
            <Label>Patient&rsquo;s language</Label>
            <div className="flex flex-wrap gap-2">
              <Choice on>Español</Choice>
              <Choice>
                <span lang="ar">العربية</span>
              </Choice>
              <Choice>
                <span lang="zh-Hans">中文</span>
              </Choice>
            </div>
            <Label>How they communicate</Label>
            <div className="grid gap-2">
              <Choice on>Speaks</Choice>
              <Choice icon={<Captions size={18} />}>Deaf or hard of hearing</Choice>
              <Choice icon={<PictoChest size={18} />}>Prefers pictures</Choice>
              <Choice icon={<Keyboard size={18} />}>Can&rsquo;t speak</Choice>
            </div>
          </div>
          <PrimaryBar>
            Pass to patient <Handoff size={20} />
          </PrimaryBar>
        </>
      );
    case "intake":
      return (
        <>
          <ScreenBar holder="Patient" step={n} />
          <div className="flex flex-1 flex-col px-4 pt-5" lang="es">
            <p className="font-display text-2xl font-bold leading-tight">Díganos qué le pasa.</p>
            <p className="mt-1 text-base text-ink-soft">No diga su nombre ni datos personales.</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="grid size-20 place-items-center rounded-full bg-blue-deep text-white shadow-lift">
                <Mic size={34} />
              </span>
              <span className="text-sm font-semibold text-blue-deeper">Hablar</span>
            </div>
            <Bubble tone="patient" caption="Paciente" lang="es" className="mt-6">
              {es.said}
            </Bubble>
            <span className="mt-3 flex min-h-12 items-center gap-2 rounded-full px-4 text-base text-ink-soft ring-1 ring-line">
              <Keyboard size={18} /> O escriba aquí
            </span>
          </div>
        </>
      );
    case "handoff":
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-navy px-8 text-center text-white">
          <span className="grid size-20 place-items-center rounded-full bg-navy-raised text-blue">
            <Handoff size={38} />
          </span>
          <p className="font-display text-2xl font-bold leading-tight">Pass the device to the clinician</p>
          <p className="text-base text-on-navy-soft">The patient&rsquo;s answers are hidden until the clinician continues.</p>
          <span className="mt-2 flex min-h-13 w-full items-center justify-center rounded-full bg-blue text-base font-semibold text-navy">
            I&rsquo;m the clinician
          </span>
        </div>
      );
    case "review":
      return (
        <>
          <ScreenBar holder="Clinician" step={n} />
          <div className="flex flex-col gap-3 px-4 pt-4">
            <section className="rounded-[1.75rem] bg-navy p-4 text-white">
              <p className="text-sm font-medium text-on-navy-soft">Chief complaint</p>
              <p className="font-display text-lg font-semibold leading-snug">{summary.chiefComplaint}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-navy-raised px-3 py-1">Duration: {summary.duration}</span>
                <span className="rounded-full bg-navy-raised px-3 py-1 text-blue">Red flag: {summary.redFlag}</span>
              </div>
            </section>
            <div className="rounded-[1.5rem] bg-ground-2 p-4">
              <p className="text-sm font-medium text-ink-soft">Patient&rsquo;s words · Español</p>
              <p lang="es" className="mt-0.5 text-base font-semibold leading-snug">{es.said}</p>
            </div>
            <div className="rounded-[1.5rem] p-4 ring-1 ring-line">
              <p className="text-sm font-medium text-ink-soft">Back-translation check</p>
              <p lang="es" className="mt-0.5 text-base font-semibold leading-snug">{es.readBack}</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-blue-deeper">
                <Check size={16} /> Patient confirmed
              </p>
            </div>
          </div>
        </>
      );
    case "response":
      return (
        <>
          <ScreenBar holder="Patient" step={n} />
          <div className="flex flex-1 flex-col gap-3 px-4 pt-4">
            <Bubble tone="clinician" caption="Su médico dice" lang="es">
              {es.reply}
            </Bubble>
            <span className="flex min-h-11 items-center gap-2 self-end rounded-full bg-blue-soft px-4 text-sm font-semibold text-blue-deeper">
              <Speaker size={18} /> Escuchar
            </span>
            <p lang="es" className="mt-3 font-display text-xl font-bold leading-tight">{es.teachBack}</p>
            <div className="grid gap-2" lang="es">
              <Choice on>{es.yes}</Choice>
              <Choice>{es.no}</Choice>
              <Choice>{es.unsure}</Choice>
            </div>
          </div>
        </>
      );
    case "end":
      return (
        <>
          <ScreenBar holder="Clinician" step={n} />
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-blue-soft text-blue-deep">
              <Clear size={36} />
            </span>
            <p className="font-display text-2xl font-bold leading-tight">Session cleared</p>
            <p className="text-base text-ink-soft">
              The summary, the patient&rsquo;s words, and every answer have been removed from this device.
            </p>
          </div>
          <PrimaryBar>New patient</PrimaryBar>
        </>
      );
  }
}

/** Privacy, on the device: what this session keeps (nothing past the tab) and how it ends. */
export function PrivacyScreen() {
  const rows = [
    { icon: <Shield size={20} />, title: "Kept in this tab only", note: "Nothing is saved to a server" },
    { icon: <IdMasked size={20} />, title: "No identifiers asked", note: "No names, IDs or birth dates" },
    { icon: <Clear size={20} />, title: "Clears itself", note: "After 5 minutes without a tap" },
  ];
  return (
    <>
      <ScreenBar holder="Clinician" step="This session" />
      <div className="flex flex-1 flex-col gap-3 px-4 pt-5">
        <p className="font-display text-xl font-bold leading-tight">Nothing about this patient is kept.</p>
        {rows.map((r) => (
          <div key={r.title} className="flex items-center gap-3 rounded-[1.5rem] bg-ground-2 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-soft text-blue-deep">{r.icon}</span>
            <span>
              <span className="block text-base font-semibold leading-snug">{r.title}</span>
              <span className="block text-sm text-ink-soft">{r.note}</span>
            </span>
          </div>
        ))}
        <p className="mt-1 text-center text-sm text-ink-soft">
          Auto-clear in <span className="font-semibold tabular-nums text-ink">4:59</span>
        </p>
      </div>
      <div className="mt-auto px-4 pb-5">
        <span className="flex min-h-13 items-center justify-center gap-2 rounded-full text-base font-semibold text-blue-deeper ring-1 ring-line">
          <Clear size={20} /> End and clear
        </span>
      </div>
    </>
  );
}
