// Synthetic demo content for the mocks. No real patient data.
// Translations are demo phrases: a fluent speaker must review them before any real clinical use.
import type { Question } from "./types";

export type PatientLanguage = "en" | "es" | "ar" | "zh-Hans";

export const PATIENT_LANGUAGES: { code: PatientLanguage; name: string; english: string; dir: "ltr" | "rtl"; speech: string }[] = [
  { code: "es", name: "Español", english: "Spanish", dir: "ltr", speech: "es-ES" },
  { code: "ar", name: "العربية", english: "Arabic", dir: "rtl", speech: "ar-SA" },
  { code: "zh-Hans", name: "中文", english: "Mandarin", dir: "ltr", speech: "zh-CN" },
  { code: "en", name: "English", english: "English", dir: "ltr", speech: "en-US" },
];

/** Guided question bank (docs/API.md "Question bank"). Option labels are the English the clinician reads. */
export const QUESTIONS: Question[] = [
  {
    id: "where",
    text: { en: "Where does it hurt?", es: "¿Dónde le duele?", ar: "أين تشعر بالألم؟", "zh-Hans": "哪里疼？" },
    options: [
      { id: "head", label: "Head", pictogram: "head", text: { en: "Head", es: "Cabeza", ar: "الرأس", "zh-Hans": "头" } },
      { id: "chest", label: "Chest", pictogram: "chest", text: { en: "Chest", es: "Pecho", ar: "الصدر", "zh-Hans": "胸口" } },
      { id: "abdomen", label: "Stomach", pictogram: "abdomen", text: { en: "Stomach", es: "Estómago", ar: "البطن", "zh-Hans": "肚子" } },
      { id: "back", label: "Back", pictogram: "back", text: { en: "Back", es: "Espalda", ar: "الظهر", "zh-Hans": "背部" } },
      { id: "arm", label: "Arm", pictogram: "arm", text: { en: "Arm", es: "Brazo", ar: "الذراع", "zh-Hans": "手臂" } },
      { id: "leg", label: "Leg", pictogram: "leg", text: { en: "Leg", es: "Pierna", ar: "الساق", "zh-Hans": "腿" } },
    ],
  },
  {
    id: "how_long",
    text: { en: "How long has it been?", es: "¿Desde cuándo?", ar: "منذ متى؟", "zh-Hans": "多久了？" },
    options: [
      { id: "today", label: "Started today", pictogram: "clock", text: { en: "Today", es: "Hoy", ar: "اليوم", "zh-Hans": "今天" } },
      { id: "days", label: "1–2 days", pictogram: "calendar", text: { en: "1–2 days", es: "1–2 días", ar: "يوم أو يومان", "zh-Hans": "一两天" } },
      { id: "week", label: "About a week", pictogram: "calendar", text: { en: "About a week", es: "Una semana", ar: "حوالي أسبوع", "zh-Hans": "一周左右" } },
      { id: "longer", label: "Longer than a week", pictogram: "calendar", text: { en: "Longer", es: "Más tiempo", ar: "أكثر من ذلك", "zh-Hans": "更久" } },
    ],
  },
  {
    id: "how_strong",
    text: {
      en: "How strong is it? 1 is a little, 5 is the worst.",
      es: "¿Qué tan fuerte es? 1 es un poco, 5 es lo peor.",
      ar: "ما مدى شدته؟ ١ قليل، ٥ هو الأسوأ.",
      "zh-Hans": "有多严重？1 是一点点，5 是最严重。",
    },
    options: [1, 2, 3, 4, 5].map((n) => ({
      id: `s${n}`,
      label: `Severity ${n}/5`,
      text: { en: String(n), es: String(n), ar: "١٢٣٤٥"[n - 1], "zh-Hans": String(n) },
    })),
  },
  {
    id: "worse_when",
    text: { en: "What makes it worse?", es: "¿Qué lo empeora?", ar: "ما الذي يزيده سوءًا؟", "zh-Hans": "什么情况下会更严重？" },
    options: [
      { id: "breathing", label: "Worse when breathing", pictogram: "breath", text: { en: "Breathing", es: "Respirar", ar: "التنفس", "zh-Hans": "呼吸时" } },
      { id: "moving", label: "Worse when moving", pictogram: "move", text: { en: "Moving", es: "Moverse", ar: "الحركة", "zh-Hans": "活动时" } },
      { id: "eating", label: "Worse when eating", pictogram: "eat", text: { en: "Eating", es: "Comer", ar: "الأكل", "zh-Hans": "吃东西时" } },
      { id: "nothing", label: "Nothing in particular", pictogram: "none", text: { en: "Nothing", es: "Nada en especial", ar: "لا شيء محدد", "zh-Hans": "没有特别的" } },
    ],
  },
  {
    id: "other",
    text: { en: "Anything else?", es: "¿Algo más?", ar: "هل هناك شيء آخر؟", "zh-Hans": "还有其他症状吗？" },
    options: [
      { id: "fever", label: "Fever", pictogram: "fever", text: { en: "Fever", es: "Fiebre", ar: "حمّى", "zh-Hans": "发烧" } },
      { id: "nausea", label: "Nausea", pictogram: "nausea", text: { en: "Nausea", es: "Náuseas", ar: "غثيان", "zh-Hans": "恶心" } },
      { id: "dizzy", label: "Dizziness", pictogram: "dizzy", text: { en: "Dizzy", es: "Mareo", ar: "دوخة", "zh-Hans": "头晕" } },
      { id: "short_breath", label: "Shortness of breath", pictogram: "breath", text: { en: "Short of breath", es: "Falta de aire", ar: "ضيق في التنفس", "zh-Hans": "呼吸困难" } },
      { id: "none", label: "Nothing else", pictogram: "none", text: { en: "Nothing else", es: "Nada más", ar: "لا شيء", "zh-Hans": "没有了" } },
    ],
  },
];

/** Phrases a patient who cannot speak taps to build a sentence; spoken aloud in their language. */
export const PHRASES: { id: string; en: string; text: Record<PatientLanguage, string> }[] = [
  { id: "pain", en: "Pain", text: { en: "Pain", es: "Dolor", ar: "ألم", "zh-Hans": "疼" } },
  { id: "chest", en: "in my chest", text: { en: "in my chest", es: "en el pecho", ar: "في الصدر", "zh-Hans": "胸口" } },
  { id: "stomach", en: "in my stomach", text: { en: "in my stomach", es: "en el estómago", ar: "في البطن", "zh-Hans": "肚子" } },
  { id: "head", en: "in my head", text: { en: "in my head", es: "en la cabeza", ar: "في الرأس", "zh-Hans": "头" } },
  { id: "breathing", en: "when I breathe", text: { en: "when I breathe", es: "al respirar", ar: "عند التنفس", "zh-Hans": "呼吸时" } },
  { id: "two_days", en: "for two days", text: { en: "for two days", es: "desde hace dos días", ar: "منذ يومين", "zh-Hans": "两天了" } },
  { id: "dizzy", en: "Dizzy", text: { en: "Dizzy", es: "Mareo", ar: "دوخة", "zh-Hans": "头晕" } },
  { id: "nausea", en: "Nauseous", text: { en: "Nauseous", es: "Náuseas", ar: "غثيان", "zh-Hans": "恶心" } },
  { id: "help", en: "I need help", text: { en: "I need help", es: "Necesito ayuda", ar: "أحتاج مساعدة", "zh-Hans": "我需要帮助" } },
];

/** Clinician quick replies with demo translations (the mock respond step uses these). */
export const CLINICIAN_REPLIES: { en: string; text: Record<PatientLanguage, string> }[] = [
  {
    en: "I’m going to listen to your chest. Please breathe slowly.",
    text: {
      en: "I’m going to listen to your chest. Please breathe slowly.",
      es: "Voy a escuchar su pecho. Respire despacio, por favor.",
      ar: "سأستمع إلى صدرك. تنفّس ببطء من فضلك.",
      "zh-Hans": "我要听一下您的胸部。请慢慢呼吸。",
    },
  },
  {
    en: "Do you have any allergies to medicine?",
    text: {
      en: "Do you have any allergies to medicine?",
      es: "¿Es alérgico a algún medicamento?",
      ar: "هل لديك حساسية من أي دواء؟",
      "zh-Hans": "您对什么药物过敏吗？",
    },
  },
  {
    en: "Please wait here. A nurse will come soon.",
    text: {
      en: "Please wait here. A nurse will come soon.",
      es: "Por favor, espere aquí. Una enfermera vendrá pronto.",
      ar: "من فضلك انتظر هنا. ستأتي ممرضة قريبًا.",
      "zh-Hans": "请在这里等一下，护士很快就来。",
    },
  },
  {
    en: "Take this medicine twice a day, with food.",
    text: {
      en: "Take this medicine twice a day, with food.",
      es: "Tome este medicamento dos veces al día, con comida.",
      ar: "تناول هذا الدواء مرتين في اليوم مع الطعام.",
      "zh-Hans": "这个药每天吃两次，随餐服用。",
    },
  },
];

export const TEACH_BACK: Record<PatientLanguage, string> = {
  en: "Did you understand?",
  es: "¿Entendió?",
  ar: "هل فهمت؟",
  "zh-Hans": "您明白了吗？",
};

/** Short question labels used to compose a readable read-back of guided answers. */
export const QUESTION_SHORT: Record<string, Record<PatientLanguage, string>> = {
  where: { en: "Where", es: "Dónde", ar: "المكان", "zh-Hans": "部位" },
  how_long: { en: "Since", es: "Desde", ar: "منذ", "zh-Hans": "持续" },
  how_strong: { en: "Strength", es: "Intensidad", ar: "الشدة", "zh-Hans": "程度" },
  worse_when: { en: "Worse when", es: "Empeora al", ar: "يزداد عند", "zh-Hans": "加重时" },
  other: { en: "Also", es: "También", ar: "أيضًا", "zh-Hans": "其他" },
};

/** "4 of 5" in each language, for the strength answer. */
export const OUT_OF_FIVE: Record<PatientLanguage, (n: string) => string> = {
  en: (n) => `${n} of 5`,
  es: (n) => `${n} de 5`,
  ar: (n) => `${n} من ٥`,
  "zh-Hans": (n) => `${n} / 5`,
};
