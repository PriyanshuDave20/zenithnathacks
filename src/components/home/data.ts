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
    title: "Set up the visit in a few taps",
    body: "On the clinician’s own phone, tablet, or laptop: the patient’s language, how they communicate, where they start, and which body diagram they see. Eye mode opens a separate six-choice communication board. Then pass the device. Nothing for the patient to install.",
  },
  {
    id: "intake",
    holder: "Patient",
    title: "The patient shows and says it their way",
    body: "In their own language: tap exactly where it hurts on a body diagram, answer one question at a time with pictures, or speak and type freely. No names or personal details are asked.",
  },
  {
    id: "readback",
    holder: "Patient",
    title: "They check it, then hand it back",
    body: "Before anything reaches the clinician, the patient sees their answers read back in their own language and confirms them. A full-screen handoff then passes the device back.",
  },
  {
    id: "review",
    holder: "Clinician",
    title: "Read both views",
    body: "A summary in English: chief complaint, symptoms, duration, flags to check, and a body map with every spot the patient marked, beside the patient’s own words and the read-back.",
  },
  {
    id: "response",
    holder: "Patient",
    title: "Reply, then check understanding",
    body: "The clinician’s reply arrives in the patient’s language, read aloud if needed, and the patient answers a quick teach-back: yes, no, or not sure.",
  },
  {
    id: "end",
    holder: "Clinician",
    title: "End, and it’s gone",
    body: "The session clears from memory at the end of the visit, on Clear, or after inactivity. Nothing about the patient is kept.",
  },
];
