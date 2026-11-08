import type { ReactNode } from "react";
import { languages, type Step } from "./data";
import { Bubble, ScreenBar } from "./phone";
import { Alert, ArrowRight, Check, Clear, Cross, Handoff, IdMasked, Repeat, Shield, Speaker } from "./icons";
import { BodyPicture } from "@/components/input/body-diagram";
import type { BodySpot } from "@/lib/input/body-parts";

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

// One synthetic patient carried through all six screens: chest pain, marked on the body diagram.
const SPOT: BodySpot[] = [{ id: "demo", view: "front", x: 104, y: 128, partId: "chest" }];

function Pill({ on, children }: { on?: boolean; children: ReactNode }) {
  return (
    <span
      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold ${
        on ? "bg-blue-deep text-white" : "bg-surface text-ink ring-1 ring-line"
      }`}
    >
      {on ? <Check size={14} /> : null}
      {children}
    </span>
  );
}

export function StepScreen({ step, index }: { step: Step; index: number }) {
  const n = `Step ${index + 1} of 6`;
  switch (step.id) {
    case "start":
      return (
        <>
          <ScreenBar holder="Clinician" step={n} />
          <div className="px-4 pt-3">
            <p className="font-display text-lg font-bold leading-tight">Set up a comfortable conversation.</p>
            <Label>Patient&rsquo;s language</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <Pill on>Español</Pill>
              <Pill>
                <span lang="ar">العربية</span>
              </Pill>
              <Pill>
                <span lang="zh-Hans">中文</span>
              </Pill>
            </div>
            <Label>How will they communicate?</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Pill>Speaks</Pill>
              <Pill>Deaf / HoH</Pill>
              <Pill on>Pictures</Pill>
              <Pill>Can&rsquo;t speak</Pill>
              <Pill>Eye mode</Pill>
            </div>
            <Label>Where should the patient start?</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Pill>Speak or type</Pill>
              <Pill on>Guided</Pill>
            </div>
            <Label>Which body diagram?</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Pill on>Male</Pill>
              <Pill>Female</Pill>
            </div>
          </div>
          <PrimaryBar>
            <Handoff size={20} /> Pass to patient
          </PrimaryBar>
        </>
      );
    case "intake":
      return (
        <>
          <ScreenBar holder="Patient" step={n} />
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-3" lang="es">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-soft">Pregunta 1 de 5</span>
              <span aria-hidden="true" className="flex flex-1 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full ${i === 0 ? "bg-blue-deep" : "bg-line"}`} />
                ))}
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold leading-tight">¿Dónde le duele?</p>
            <p className="text-sm text-ink-soft">Toque donde le duele.</p>
            <div className="relative mt-2 min-h-0 flex-1 rounded-[1.5rem] bg-surface ring-1 ring-line">
              <BodyPicture view="front" lang="es" spots={SPOT} className="absolute inset-2" />
            </div>
            <div className="mt-2 flex">
              <span className="flex min-h-10 items-center gap-2 rounded-full bg-blue-deep py-1 pe-2 ps-4 text-sm font-semibold text-white">
                Pecho
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-white/15">
                  <Cross size={12} />
                </span>
              </span>
            </div>
          </div>
          <PrimaryBar>
            Siguiente <ArrowRight size={20} />
          </PrimaryBar>
        </>
      );
    case "readback":
      return (
        <>
          <ScreenBar holder="Patient" step={n} />
          <div className="flex flex-1 flex-col px-4 pt-5" lang="es">
            <p className="font-display text-2xl font-bold leading-tight">¿Es esto lo que quiso decir?</p>
            <div className="mt-4 rounded-[1.5rem] bg-ground-2 p-4">
              <p className="text-sm font-medium text-ink-soft">Su mensaje</p>
              <dl className="mt-1 grid gap-1 text-base font-semibold leading-snug">
                {[
                  ["Dónde", "Pecho"],
                  ["Desde", "1–2 días"],
                  ["Intensidad", "4 de 10"],
                  ["Empeora al", "Respirar"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-1.5">
                    <dt className="font-medium text-ink-soft">{k}:</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <span className="mt-3 flex min-h-11 items-center gap-2 self-start rounded-full bg-blue-soft px-4 text-sm font-semibold text-blue-deeper">
              <Speaker size={18} /> Leer en voz alta
            </span>
          </div>
          <div className="mt-auto grid gap-2 px-4 pb-5" lang="es">
            <span className="flex min-h-13 items-center justify-center gap-2 rounded-full bg-blue-deep text-base font-semibold text-white shadow-lift">
              <Check size={20} /> Sí, es correcto
            </span>
            <span className="flex min-h-12 items-center justify-center gap-2 rounded-full text-base font-semibold text-blue-deeper ring-1 ring-line">
              <Repeat size={18} /> No, decirlo otra vez
            </span>
          </div>
        </>
      );
    case "review":
      return (
        <>
          <ScreenBar holder="Clinician" step={n} />
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 pt-3">
            <section className="rounded-[1.5rem] bg-navy p-4 text-white">
              <p className="text-sm font-medium text-on-navy-soft">Chief complaint</p>
              <p className="font-display text-lg font-semibold leading-snug">Chest pain, worse when breathing</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-sm">
                <span className="rounded-full bg-navy-raised px-3 py-1">1–2 days · 4/10</span>
                <span className="flex items-center gap-1 rounded-full bg-navy-raised px-3 py-1 text-blue">
                  <Alert size={14} /> Chest pain
                </span>
              </div>
            </section>
            <div className="flex gap-3 rounded-[1.5rem] bg-ground-2 p-3">
              <BodyPicture view="front" spots={SPOT} className="aspect-[1/2] w-[36%] shrink-0" />
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-ink-soft">Where it hurts</p>
                <p className="text-base font-semibold leading-snug">Chest</p>
                <p className="mt-2 text-sm font-medium text-ink-soft">Patient&rsquo;s words · Español</p>
                <p lang="es" className="text-sm font-semibold leading-snug">Dónde: Pecho · Desde: 1–2 días</p>
                <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-blue-deeper">
                  <Check size={14} /> Patient confirmed
                </p>
              </div>
            </div>
          </div>
          <PrimaryBar>Reply to patient</PrimaryBar>
        </>
      );
    case "response":
      return (
        <>
          <ScreenBar holder="Patient" step={n} />
          <div className="flex flex-1 flex-col gap-3 px-4 pt-4">
            <Bubble tone="clinician" caption="El personal médico dice" lang="es">
              {es.reply}
            </Bubble>
            <span lang="es" className="flex min-h-11 items-center gap-2 self-end rounded-full bg-blue-soft px-4 text-sm font-semibold text-blue-deeper">
              <Speaker size={18} /> Escuchar
            </span>
            <p lang="es" className="mt-2 font-display text-xl font-bold leading-tight">{es.teachBack}</p>
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
              Conversation, drafts, summaries and the body map have been removed from this device.
            </p>
          </div>
          <PrimaryBar>Start a new conversation</PrimaryBar>
        </>
      );
  }
}

/** Privacy, on the device: what this session keeps (nothing past the tab) and how it ends. */
export function PrivacyScreen() {
  const rows = [
    { icon: <Shield size={20} />, title: "Kept in this tab only", note: "Nothing is saved to a server" },
    { icon: <IdMasked size={20} />, title: "No identifiers asked", note: "No names, IDs or birth dates" },
    { icon: <Clear size={20} />, title: "Clears itself", note: "After 6 hours of inactivity (you can shorten it)" },
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
          End or clear the session at any time.
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
