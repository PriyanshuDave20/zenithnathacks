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
  id: "start" | "intake" | "handoff" | "review" | "response" | "end";
  holder: Holder;
  title: string;
  body: string;
};

export const steps: Step[] = [
  {
    id: "start",
    holder: "Clinician",
    title: "Pick the patient’s language and how they communicate",
    body: "Two taps on the clinician’s own phone, tablet, or laptop. No interpreter to book, no patient account, nothing for the patient to install.",
  },
  {
    id: "intake",
    holder: "Patient",
    title: "The patient says it their way",
    body: "Speak or type in their own language, or answer one question at a time with large buttons and pictures. No names or personal details are asked.",
  },
  {
    id: "handoff",
    holder: "Patient",
    title: "Pass the device back",
    body: "A full-screen handoff hides what the patient wrote, so each person only ever sees what is meant for them.",
  },
  {
    id: "review",
    holder: "Clinician",
    title: "Read a structured summary",
    body: "Chief complaint, symptoms, duration, and red flags in English, beside the patient’s own words and a back-translation to judge reliability.",
  },
  {
    id: "response",
    holder: "Patient",
    title: "Reply, simplified for them",
    body: "The clinician’s instructions arrive in the patient’s language and reading level, read aloud if needed, with a quick check that they understood.",
  },
  {
    id: "end",
    holder: "Clinician",
    title: "End, and it’s gone",
    body: "The session clears from memory at the end of the visit, on Clear, or after inactivity. Nothing about the patient is kept.",
  },
];
