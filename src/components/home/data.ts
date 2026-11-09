// Synthetic demonstration content for the home page. No real patient data.
// The translations are demo phrases: have a fluent speaker review them before any real clinical use.

export type LanguageCode = "es" | "ar" | "zh-Hans";

export type DemoLanguage = {
  code: LanguageCode;
  name: string; // the language’s name in itself
  english: string;
  dir: "ltr" | "rtl";
  said: string;
  readBack: string;
  reply: string;
  teachBack: string;
  yes: string;
  no: string;
  unsure: string;
};

export const languages: DemoLanguage[] = [
  {
    code: "es",
    name: "Español",
    english: "Spanish",
    dir: "ltr",
    said: "Me duele el pecho cuando respiro. Empezó hace dos días.",
    readBack: "Le duele el pecho al respirar desde hace dos días. ¿Es correcto?",
    reply: "Voy a escuchar su pecho. Respire despacio, por favor.",
    teachBack: "¿Entendió lo que vamos a hacer?",
    yes: "Sí",
    no: "No",
    unsure: "No estoy seguro",
  },
  {
    code: "ar",
    name: "العربية",
    english: "Arabic",
    dir: "rtl",
    said: "يؤلمني صدري عندما أتنفس. بدأ الألم قبل يومين.",
    readBack: "صدرك يؤلمك عند التنفس منذ يومين. هل هذا صحيح؟",
    reply: "سأستمع إلى صدرك. تنفّس ببطء من فضلك.",
    teachBack: "هل فهمت ما سنفعله؟",
    yes: "نعم",
    no: "لا",
    unsure: "لست متأكدًا",
  },
  {
    code: "zh-Hans",
    name: "中文",
    english: "Mandarin",
    dir: "ltr",
    said: "我呼吸的时候胸口疼，已经两天了。",
    readBack: "您呼吸时胸口疼，已经两天了，对吗？",
    reply: "我要听一下您的胸部。请慢慢呼吸。",
    teachBack: "您明白我们要做什么吗？",
    yes: "明白",
    no: "不明白",
    unsure: "不确定",
  },
];

export const summary = {
  chiefComplaint: "Chest pain on breathing",
  duration: "2 days",
  symptoms: ["Pain worse on inspiration"],
  redFlag: "Chest pain",
  clinicianReply: "I’m going to listen to your chest. Please breathe slowly.",
};

export type Holder = "Clinician" | "Patient";

export type Step = {
  id: "start" | "intake" | "readback" | "review" | "response" | "end";
  holder: Holder;
  title: string;
  body: string;
};

// The six steps mirror the real session at /start (src/components/communication/workspace.tsx).
export const steps: Step[] = [
  {
    id: "start",
    holder: "Clinician",
    title: "Choose a language and a way to communicate",
    body: "Use your own phone, tablet, or laptop. Set the patient’s language and choose speech, text, pictures, or Eye mode. The patient needs no app or account.",
  },
  {
    id: "intake",
    holder: "Patient",
    title: "Let the patient explain in their own way",
    body: "They can speak or type freely, answer simple questions, or mark where it hurts on the body diagram. Prompts ask them to leave out names and other personal details.",
  },
  {
    id: "readback",
    holder: "Patient",
    title: "Check the message before sharing",
    body: "The patient checks the message in their own language before sharing it. The handoff screen shows when to return the device to the clinician.",
  },
  {
    id: "review",
    holder: "Clinician",
    title: "See the patient’s words and the summary",
    body: "Review an English summary of the patient’s concern, symptoms, duration, and flags to check. See their original message, read-back, and marked body locations alongside it.",
  },
  {
    id: "response",
    holder: "Patient",
    title: "Reply and check understanding",
    body: "Send a reply in the patient’s language, with read-aloud when useful. The patient can say whether they understand or need another explanation.",
  },
  {
    id: "end",
    holder: "Clinician",
    title: "Clear the session when you’re done",
    body: "End the session to clear its messages from memory. You can also use Clear at any time, and inactive sessions clear automatically.",
  },
];
