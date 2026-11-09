"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  PictoArm,
  PictoBack,
  PictoBreath,
  PictoCalendar,
  PictoChest,
  PictoClock,
  PictoDizzy,
  PictoEat,
  PictoFever,
  PictoHead,
  PictoLeg,
  PictoMove,
  PictoNausea,
  PictoNone,
  PictoPain,
  PictoStomach,
} from "@/components/home/icons";
import { icuStyles as i, workspaceStyles as s } from "@/components/communication/styles";
import type { SelectEvent } from "@/lib/contracts/input";
import {
  clearFrom,
  describeAnswers,
  DURATION_OPTIONS,
  NEEDS,
  nextStep,
  OTHER_OPTIONS,
  previousStep,
  SIDE_OPTIONS,
  speakableSummary,
  STRENGTH_OPTIONS,
  WHERE_OPTIONS,
  WORSE_OPTIONS,
  type EyeScreen,
  type FlowAnswers,
  type FlowStep,
} from "@/lib/eye/flow";
import { eye, useEyeState } from "@/lib/eye/session";
import { eyeText, eyeSummary } from "@/lib/questions/eye-localization";
import { prepareEyeSpeech } from "@/lib/eye/speak";
import { speechStatusLabel } from "@/lib/eye/speak";
import { FlowTile } from "./flow-tile";

type Icon = (p: { size?: number }) => ReactNode;
const PICTOS: Record<string, Icon> = {
  head: PictoHead, chest: PictoChest, abdomen: PictoStomach, back: PictoBack, arm: PictoArm, leg: PictoLeg,
  clock: PictoClock, calendar: PictoCalendar, breath: PictoBreath, move: PictoMove, eat: PictoEat, none: PictoNone,
  fever: PictoFever, nausea: PictoNausea, dizzy: PictoDizzy,
};
const icon = (key: string | undefined, size = 40) => {
  const Picto = key ? PICTOS[key] : undefined;
  return Picto ? <Picto size={size} /> : undefined;
};

const HELP_SAY = "I need help. Please come now.";
const HELP_REPEAT_MS = 9000;

const TITLES: Record<EyeScreen, [string, string]> = {
  mode: ["How will you use Eye mode?", "Clinician: tap one. You can switch at any time."],
  home: ["Answer, or tell us something", "Look at a choice for two seconds to say it. Tap and keyboard also work."],
  needs: ["What do you need?", "Look at a choice for two seconds to say it."],
  rest: ["Resting", "Nothing is being said. Look at the button when you are ready."],
  help: ["Help", "The patient is asking for a person."],
  done: ["Intake complete", "Clinician: the summary is below."],
  pain_q: ["Are you in pain?", "Look at Yes or No for two seconds."],
  where: ["Where does it hurt?", "Look at a choice for two seconds."],
  side: ["Which side?", "Look at a choice for two seconds."],
  strength: ["How strong is the pain?", "Look at a choice for two seconds."],
  duration: ["How long has it been?", "Look at a choice for two seconds."],
  worse: ["What makes it worse?", "Look at a choice for two seconds."],
  other: ["Anything else?", "Look at a choice for two seconds."],
  review: ["Is this right?", "If it is, it will be said aloud."],
};

const channelOf = (event: MouseEvent) =>
  (event.nativeEvent as MouseEvent["nativeEvent"] & { synapseInputChannel?: string }).synapseInputChannel === "gaze" ? ("gaze" as const) : ("tap" as const);

/** The Eye mode screens. All state is in memory (src/lib/eye/session.ts); this file only draws it. */
export function EyeWorkspace({ onSelect }: { onSelect?: (event: SelectEvent) => void }) {
  const { mode, screen, answers, lastSaid, lastIntake, speechStatus, language, muted, intake } = useEyeState();
  const t = (source: string) => eyeText(source, language);
  const label = (option: { label: string; hint?: string }) => ({ label: t(option.label), hint: option.hint ? t(option.hint) : undefined });
  useEffect(() => { prepareEyeSpeech(); return () => eye.stopSpeech(); }, []);
  const emit = (event: MouseEvent, optionId: string) => onSelect?.({ channel: channelOf(event), optionId });

  // While Help is up it keeps calling until someone cancels it.
  useEffect(() => {
    if (screen !== "help") return;
    const timer = setInterval(() => eye.say(HELP_SAY, true), HELP_REPEAT_MS);
    return () => {
      clearInterval(timer);
      eye.stopSpeech();
    };
  }, [screen]);

  const isStep = (x: EyeScreen): x is FlowStep =>
    ["pain_q", "where", "side", "strength", "duration", "worse", "other", "review"].includes(x);

  /** Record an answer and move to the next screen; at the end of a chain, say it aloud and finish. */
  function answer(step: FlowStep, next: FlowAnswers) {
    eye.answers(next);
    const to = mode ? nextStep(step, next, mode) : null;
    if (to) return eye.go(to);
    const sentence = speakableSummary(next);
    eye.say(sentence);
    if (mode === "intake") eye.finishIntake(next, describeAnswers(next).join(" · "));
    else eye.home();
  }

  function goBack() {
    if (!isStep(screen) || !mode) return eye.go(mode === "intake" ? "mode" : "home");
    const to = previousStep(screen, answers, mode);
    eye.answers(clearFrom(screen, answers));
    eye.go(to ?? (mode === "intake" ? "mode" : "needs"));
  }

  const showBack = (isStep(screen) && screen !== "review") || screen === "needs";
  const [title, subtitle] = TITLES[screen].map(t);
  const wizard = isStep(screen) && screen !== "pain_q" && screen !== "review";
  const columns = "repeat(var(--eye-choice-columns, 3), minmax(0, 1fr))";
  const sofar = eyeSummary(answers, language);

  let body: ReactNode = null;
  let grid: React.CSSProperties | undefined = { gridTemplateColumns: columns };

  if (screen === "mode") {
    grid = { gridTemplateColumns: "repeat(2, 1fr)" };
    body = (
      <>
        <FlowTile id="mode-intake" tone="strong" label={t("Intake")} hint={t("First meeting: guided questions")} onPick={() => eye.start("intake")} />
        <FlowTile id="mode-conversation" tone="strong" label={t("Conversation")} hint={t("Ongoing: yes, no, and what I need")} onPick={() => eye.start("conversation")} />
      </>
    );
  } else if (screen === "home") {
    grid = undefined;
  } else if (screen === "needs") {
    body = NEEDS.map((n) => (
      <FlowTile
        key={n.id}
        id={`need-${n.id}`}
        label={t(n.label)}
        icon={n.id === "pain" ? <PictoPain size={40} /> : n.id === "move" ? <PictoMove size={40} /> : n.id === "breathing" ? <PictoBreath size={40} /> : undefined}
        onPick={(e) => {
          emit(e, `need-${n.id}`);
          if (n.id === "pain") {
            eye.answers({ ...answers, hurts: "yes" });
            return eye.go("where");
          }
          eye.say(n.say);
          eye.go("home");
        }}
      />
    ));
  } else if (screen === "rest") {
    grid = { gridTemplateColumns: "1fr" };
    body = <FlowTile id="rest-ready" tone="strong" label={t("I’m ready")} hint={t("Look here to carry on")} onPick={() => eye.go("home")} />;
  } else if (screen === "help") {
    grid = { gridTemplateColumns: "1fr" };
    body = (
      <>
        <p role="alert" className="eye-help-banner">
          {t("HELP. The patient is asking for a person.")}
          <small>{t(speechStatusLabel[speechStatus])} {t("Staff have not been notified automatically.")}</small>
        </p>
        <FlowTile id="help-cancel" label={t("Cancel: I’m okay")} hint={t("Look here to stop calling")} onPick={() => eye.go("home")} />
      </>
    );
  } else if (screen === "done") {
    grid = { gridTemplateColumns: "repeat(2, 1fr)" };
    body = (
      <>
        <p className="sf-icu-review-choice" role="status" style={{ gridColumn: "1 / -1" }}>
          {intake ? eyeSummary(intake, language) : (lastIntake ?? t("No answers were recorded"))}
        </p>
        <FlowTile id="done-conversation" tone="strong" label={t("Start conversation mode")} hint={t("For ongoing care")} onPick={() => eye.start("conversation")} />
        <FlowTile id="done-redo" label={t("Redo the intake")} onPick={() => eye.start("intake")} />
      </>
    );
  } else if (screen === "pain_q") {
    grid = { gridTemplateColumns: "repeat(2, 1fr)" };
    body = (
      <>
        <FlowTile id="pain-yes" tone="strong" minHeight={220} label={t("Yes")} hint={t("I am in pain")} onPick={(e) => { emit(e, "pain-yes"); answer("pain_q", { ...answers, hurts: "yes" }); }} />
        <FlowTile id="pain-no" tone="strong" minHeight={220} label={t("No")} hint={t("I am not in pain")} onPick={(e) => { emit(e, "pain-no"); answer("pain_q", { ...answers, hurts: "no" }); }} />
      </>
    );
  } else if (screen === "where") {
    body = WHERE_OPTIONS.map((o) => <FlowTile key={o.id} id={`where-${o.id}`} label={t(o.label)} icon={icon(o.picto, 44)} onPick={() => answer("where", { ...answers, where: o.id })} />);
  } else if (screen === "side") {
    body = SIDE_OPTIONS.map((o) => <FlowTile key={o.id} id={`side-${o.id}`} {...label(o)} onPick={() => answer("side", { ...answers, side: o.id })} />);
  } else if (screen === "strength") {
    body = STRENGTH_OPTIONS.map((o) => <FlowTile key={o.id} id={`strength-${o.id}`} {...label(o)} onPick={() => answer("strength", { ...answers, strength: o.id })} />);
  } else if (screen === "duration") {
    body = DURATION_OPTIONS.map((o) => <FlowTile key={o.id} id={`duration-${o.id}`} label={t(o.label)} icon={icon(o.picto)} onPick={() => answer("duration", { ...answers, duration: o.id })} />);
  } else if (screen === "worse") {
    body = WORSE_OPTIONS.map((o) => <FlowTile key={o.id} id={`worse-${o.id}`} label={t(o.label)} icon={icon(o.picto)} onPick={() => answer("worse", { ...answers, worse: o.id })} />);
  } else if (screen === "other") {
    body = OTHER_OPTIONS.map((o) => <FlowTile key={o.id} id={`other-${o.id}`} label={t(o.label)} icon={icon(o.picto)} onPick={() => answer("other", { ...answers, other: o.id })} />);
  } else if (screen === "review") {
    grid = { gridTemplateColumns: "repeat(2, 1fr)" };
    body = (
      <>
        <FlowTile id="review-yes" tone="strong" label={t("Yes, say it")} hint={sofar} onPick={(e) => { emit(e, "review-yes"); answer("review", answers); }} />
        <FlowTile
          id="review-change"
          label={t("No, change it")}
          hint={t("Start these questions again")}
          onPick={() => {
            eye.answers(mode === "intake" ? { ...answers, hurts: null, where: null, side: null, strength: null, duration: null, worse: null, other: null } : { ...answers, where: null, side: null, strength: null });
            eye.go(mode === "intake" ? "pain_q" : "where");
          }}
        />
      </>
    );
  }

  return (
    <section lang={language} dir={language === "ar" ? "rtl" : "ltr"} className={s.panel} aria-labelledby="icu-prompt">
      <style>{`
        .eye-help-banner{grid-column:1/-1;margin:0;padding:28px;border-radius:20px;background:var(--alert-deep,#9b1c1c);color:#fff;font-size:2.2rem;font-weight:800;line-height:1.15;text-align:center}
        .eye-help-banner small{display:block;margin-top:10px;font-size:1.05rem;font-weight:500;opacity:.9}
        @media (prefers-reduced-motion: no-preference){.eye-help-banner{animation:eye-help-flash 1.1s ease-in-out infinite}}
        @keyframes eye-help-flash{50%{background:var(--alert,#c62828)}}
      `}</style>
      <div className={s.panelHead}>
        <div>
          <h2 id="icu-prompt">{title}</h2>
          <p>{subtitle}</p>
        </div>
        {showBack ? (
          // Always on screen at the top of the question: Back is a normal big target like any choice.
          <button
            type="button"
            className={s.quiet}
            data-gaze-target="flow-back"
            onClick={goBack}
            style={{ minHeight: 56, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <ArrowLeft size={22} /> {t("Go back")}
          </button>
        ) : null}
      </div>
      <div className={`sf-icu-status ${!((wizard || screen === "review") && sofar) && !lastSaid ? "eye-status-empty" : ""}`} role="status" aria-live="polite">
        {(wizard || screen === "review") && sofar ? (
          <>
            {t("So far:")} <strong>{sofar}</strong>
          </>
        ) : lastSaid ? (
          <>
            {t("Selected:")} <strong>{lastSaid}</strong>{" "}
            <span>{t(speechStatusLabel[speechStatus])}</span>
          </>
        ) : (
          t("No choice selected yet.")
        )}
      </div>
      {lastSaid && !muted && ["home", "done", "help", "rest"].includes(screen) ? (
        <button type="button" className={s.quiet} data-gaze-ignore onClick={() => eye.repeat()} style={{ minHeight: 44, marginBlock: 8 }}>
          {t(speechStatus === "browser-ready" ? "Use device voice" : "Speak again")}
        </button>
      ) : null}
      {screen === "home" ? (
        <div key={screen}>
          <div className={i.board} style={{ gridTemplateColumns: "repeat(2, 1fr)", paddingBottom: 0 }}>
            <FlowTile id="answer-yes" tone="strong" minHeight={190} label={t("Yes")} onPick={(e) => { emit(e, "yes"); eye.say("Yes."); }} />
            <FlowTile id="answer-no" tone="strong" minHeight={190} label={t("No")} onPick={(e) => { emit(e, "no"); eye.say("No."); }} />
          </div>
          <div className={i.board} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <FlowTile id="home-needs" minHeight={96} label={t("I need something")} onPick={(e) => { emit(e, "needs"); eye.go("needs"); }} />
            <FlowTile id="home-rest" minHeight={96} label={t("Rest")} onPick={(e) => { emit(e, "rest"); eye.say("I would like to rest."); eye.go("rest"); }} />
            <FlowTile id="home-help" tone="help" minHeight={96} label={t("Help")} onPick={(e) => { emit(e, "help"); eye.say(HELP_SAY, true); eye.go("help"); }} />
          </div>
        </div>
      ) : (
        // The clinician, not the patient, picks the mode: on this screen choices are tap-only and gaze ignores them.
        <div key={screen} className={i.board} style={grid} data-gaze-ignore={screen === "mode" ? "" : undefined}>
          {body}
        </div>
      )}
    </section>
  );
}
