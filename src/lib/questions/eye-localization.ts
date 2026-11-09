// Fixed public Eye wording only. Draft translations require fluent/clinical review.
import type { FlowAnswers } from "../eye/flow";
import { speakableSummary } from "../eye/flow";
export const EYE_LANGUAGES = ["en", "es", "ar", "zh-Hans"] as const;
export type EyeLanguage = typeof EYE_LANGUAGES[number];
export function eyeLanguage(value: string): EyeLanguage {
  try {
    const locale = new Intl.Locale(value);
    if (["en", "es", "ar"].includes(locale.language)) return locale.language as EyeLanguage;
    if (["zh", "cmn"].includes(locale.language) && locale.script !== "Hant" && !["HK", "MO"].includes(locale.region ?? "")) return "zh-Hans";
  } catch { /* Unsupported locale defaults to English, never echoed. */ }
  return "en";
}
type Translations = Record<EyeLanguage, string>;
const SPOKEN: Record<string, Translations> = {
  "Yes.": {
    "en": "Yes.",
    "es": "Sí.",
    "ar": "نعم.",
    "zh-Hans": "是的。"
  },
  "No.": {
    "en": "No.",
    "es": "No.",
    "ar": "لا.",
    "zh-Hans": "不是。"
  },
  "I need help. Please come now.": {
    "en": "I need help. Please come now.",
    "es": "Necesito ayuda. Por favor, venga ahora.",
    "ar": "أحتاج إلى مساعدة. من فضلك، تعال الآن.",
    "zh-Hans": "我需要帮助。请马上过来。"
  },
  "I would like to rest.": {
    "en": "I would like to rest.",
    "es": "Quiero descansar.",
    "ar": "أريد أن أستريح.",
    "zh-Hans": "我想休息。"
  },
  "Please help me change position.": {
    "en": "Please help me change position.",
    "es": "Por favor, ayúdeme a cambiar de posición.",
    "ar": "من فضلك، ساعدني على تغيير وضعيتي.",
    "zh-Hans": "请帮我换个姿势。"
  },
  "I would like some water.": {
    "en": "I would like some water.",
    "es": "Quiero un poco de agua.",
    "ar": "أريد بعض الماء.",
    "zh-Hans": "我想喝点水。"
  },
  "I need the toilet.": {
    "en": "I need the toilet.",
    "es": "Necesito ir al baño.",
    "ar": "أحتاج إلى استخدام الحمام.",
    "zh-Hans": "我需要上厕所。"
  },
  "I am having trouble breathing.": {
    "en": "I am having trouble breathing.",
    "es": "Me cuesta respirar.",
    "ar": "أجد صعوبة في التنفس.",
    "zh-Hans": "我呼吸困难。"
  },
  "I am too hot.": {
    "en": "I am too hot.",
    "es": "Tengo demasiado calor.",
    "ar": "أشعر بحر شديد.",
    "zh-Hans": "我太热了。"
  },
  "I am too cold.": {
    "en": "I am too cold.",
    "es": "Tengo demasiado frío.",
    "ar": "أشعر ببرد شديد.",
    "zh-Hans": "我太冷了。"
  },
  "I do not have pain.": {
    "en": "I do not have pain.",
    "es": "No tengo dolor.",
    "ar": "لا أشعر بألم.",
    "zh-Hans": "我没有疼痛。"
  },
  "I have pain.": {
    "en": "I have pain.",
    "es": "Tengo dolor.",
    "ar": "أشعر بألم.",
    "zh-Hans": "我感到疼痛。"
  },
  "It is mild.": {
    "en": "It is mild.",
    "es": "Es leve.",
    "ar": "الألم خفيف.",
    "zh-Hans": "疼痛轻微。"
  },
  "It is moderate.": {
    "en": "It is moderate.",
    "es": "Es moderado.",
    "ar": "الألم متوسط.",
    "zh-Hans": "疼痛中等。"
  },
  "It is severe.": {
    "en": "It is severe.",
    "es": "Es intenso.",
    "ar": "الألم شديد.",
    "zh-Hans": "疼痛严重。"
  },
  "It is the worst pain.": {
    "en": "It is the worst pain.",
    "es": "Es el peor dolor.",
    "ar": "إنه أسوأ ألم.",
    "zh-Hans": "这是最剧烈的疼痛。"
  },
  "It started today.": {
    "en": "It started today.",
    "es": "Empezó hoy.",
    "ar": "بدأ اليوم.",
    "zh-Hans": "今天开始的。"
  },
  "It has been one to two days.": {
    "en": "It has been one to two days.",
    "es": "Lleva uno o dos días.",
    "ar": "استمر منذ يوم إلى يومين.",
    "zh-Hans": "已经一到两天了。"
  },
  "It has been about a week.": {
    "en": "It has been about a week.",
    "es": "Lleva aproximadamente una semana.",
    "ar": "استمر منذ حوالي أسبوع.",
    "zh-Hans": "已经大约一周了。"
  },
  "It has been longer than a week.": {
    "en": "It has been longer than a week.",
    "es": "Lleva más de una semana.",
    "ar": "استمر منذ أكثر من أسبوع.",
    "zh-Hans": "已经超过一周了。"
  },
  "It is worse when I breathe.": {
    "en": "It is worse when I breathe.",
    "es": "Empeora cuando respiro.",
    "ar": "يزداد الألم عندما أتنفس.",
    "zh-Hans": "呼吸时疼痛加重。"
  },
  "It is worse when I move.": {
    "en": "It is worse when I move.",
    "es": "Empeora cuando me muevo.",
    "ar": "يزداد الألم عندما أتحرك.",
    "zh-Hans": "活动时疼痛加重。"
  },
  "It is worse when I eat.": {
    "en": "It is worse when I eat.",
    "es": "Empeora cuando como.",
    "ar": "يزداد الألم عندما آكل.",
    "zh-Hans": "进食时疼痛加重。"
  },
  "I also have a fever.": {
    "en": "I also have a fever.",
    "es": "También tengo fiebre.",
    "ar": "لدي حمى أيضًا.",
    "zh-Hans": "我还发烧。"
  },
  "I also feel sick to my stomach.": {
    "en": "I also feel sick to my stomach.",
    "es": "También tengo náuseas.",
    "ar": "أشعر بالغثيان أيضًا.",
    "zh-Hans": "我还感到恶心。"
  },
  "I also feel dizzy.": {
    "en": "I also feel dizzy.",
    "es": "También me siento mareado.",
    "ar": "أشعر بالدوار أيضًا.",
    "zh-Hans": "我还感到头晕。"
  },
  "I also feel short of breath.": {
    "en": "I also feel short of breath.",
    "es": "También me falta el aire.",
    "ar": "أشعر بضيق في التنفس أيضًا.",
    "zh-Hans": "我还感到气短。"
  },
  "I have pain in my head.": {
    "en": "I have pain in my head.",
    "es": "Tengo dolor en la cabeza.",
    "ar": "أشعر بألم في رأسي.",
    "zh-Hans": "我的头部疼痛。"
  },
  "I have pain in my chest.": {
    "en": "I have pain in my chest.",
    "es": "Tengo dolor en el pecho.",
    "ar": "أشعر بألم في صدري.",
    "zh-Hans": "我的胸部疼痛。"
  },
  "I have pain in my stomach.": {
    "en": "I have pain in my stomach.",
    "es": "Tengo dolor en el estómago.",
    "ar": "أشعر بألم في بطني.",
    "zh-Hans": "我的腹部疼痛。"
  },
  "I have pain in my back.": {
    "en": "I have pain in my back.",
    "es": "Tengo dolor en la espalda.",
    "ar": "أشعر بألم في ظهري.",
    "zh-Hans": "我的背部疼痛。"
  },
  "I have pain in my arm.": {
    "en": "I have pain in my arm.",
    "es": "Tengo dolor en el brazo.",
    "ar": "أشعر بألم في ذراعي.",
    "zh-Hans": "我的手臂疼痛。"
  },
  "I have pain in my left arm.": {
    "en": "I have pain in my left arm.",
    "es": "Tengo dolor en el brazo izquierdo.",
    "ar": "أشعر بألم في ذراعي اليسرى.",
    "zh-Hans": "我的左手臂疼痛。"
  },
  "I have pain in my right arm.": {
    "en": "I have pain in my right arm.",
    "es": "Tengo dolor en el brazo derecho.",
    "ar": "أشعر بألم في ذراعي اليمنى.",
    "zh-Hans": "我的右手臂疼痛。"
  },
  "I have pain in my arm, on both sides.": {
    "en": "I have pain in my arm, on both sides.",
    "es": "Tengo dolor en ambos brazos.",
    "ar": "أشعر بألم في كلتا ذراعيّ.",
    "zh-Hans": "我的双臂疼痛。"
  },
  "I have pain in my leg.": {
    "en": "I have pain in my leg.",
    "es": "Tengo dolor en la pierna.",
    "ar": "أشعر بألم في ساقي.",
    "zh-Hans": "我的腿部疼痛。"
  },
  "I have pain in my left leg.": {
    "en": "I have pain in my left leg.",
    "es": "Tengo dolor en la pierna izquierda.",
    "ar": "أشعر بألم في ساقي اليسرى.",
    "zh-Hans": "我的左腿部疼痛。"
  },
  "I have pain in my right leg.": {
    "en": "I have pain in my right leg.",
    "es": "Tengo dolor en la pierna derecha.",
    "ar": "أشعر بألم في ساقي اليمنى.",
    "zh-Hans": "我的右腿部疼痛。"
  },
  "I have pain in my leg, on both sides.": {
    "en": "I have pain in my leg, on both sides.",
    "es": "Tengo dolor en ambas piernas.",
    "ar": "أشعر بألم في كلتا ساقيّ.",
    "zh-Hans": "我的双腿疼痛。"
  }
};
export function eyePublicSpeechCatalog() {
  return Object.entries(SPOKEN).flatMap(([source, translated]) => EYE_LANGUAGES.map(language => ({ id: `eye:${source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`, language, text: translated[language] })));
}
// Resolve only complete registered clauses; never guess, omit or cache selected answers.
export function eyeSpeechSegments(text: string, language: string): string[] | undefined {
  if (!(EYE_LANGUAGES as readonly string[]).includes(language)) return undefined;
  const allowed = Object.values(SPOKEN).map(value => value[language as EyeLanguage]).sort((a, b) => b.length - a.length);
  const segments: string[] = [];
  let remaining = text;
  while (remaining) {
    const next = allowed.find(value => remaining === value || remaining.startsWith(`${value} `));
    if (!next) return undefined;
    segments.push(next);
    remaining = remaining.slice(next.length).replace(/^ /, "");
  }
  return segments.length ? segments : undefined;
}
export function localizeEyeSpeech(english: string, language: EyeLanguage): string | undefined {
  const segments = eyeSpeechSegments(english, "en");
  return segments?.map(segment => SPOKEN[segment][language]).join(" ");
}
export function eyeSummary(answers: FlowAnswers, language: EyeLanguage): string {
  return localizeEyeSpeech(speakableSummary(answers), language) ?? "";
}
