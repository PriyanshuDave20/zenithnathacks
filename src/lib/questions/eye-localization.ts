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
const UI: Record<string, Translations> = {
  "Yes": {
    "en": "Yes",
    "es": "Sí",
    "ar": "نعم",
    "zh-Hans": "是"
  },
  "No": {
    "en": "No",
    "es": "No",
    "ar": "لا",
    "zh-Hans": "否"
  },
  "How will you use Eye mode?": {
    "en": "How will you use Eye mode?",
    "es": "¿Cómo usará el modo ocular?",
    "ar": "كيف ستستخدم وضع العين؟",
    "zh-Hans": "您将如何使用眼控模式？"
  },
  "Clinician: tap one. You can switch at any time.": {
    "en": "Clinician: tap one. You can switch at any time.",
    "es": "Profesional: toque una opción. Puede cambiarla después.",
    "ar": "للممارس الصحي: اضغط على خيار. يمكنك التبديل في أي وقت.",
    "zh-Hans": "医护人员：点击一个选项。您可以随时切换。"
  },
  "Answer, or tell us something": {
    "en": "Answer, or tell us something",
    "es": "Responda o díganos algo",
    "ar": "أجب أو أخبرنا بشيء",
    "zh-Hans": "回答或告诉我们您的需要"
  },
  "Look at a choice for two seconds to say it. Tap and keyboard also work.": {
    "en": "Look at a choice for two seconds to say it. Tap and keyboard also work.",
    "es": "Mire una opción durante dos segundos para decirla. También puede tocarla o usar el teclado.",
    "ar": "انظر إلى خيار لمدة ثانيتين لنطقه. يمكنك أيضًا اللمس أو استخدام لوحة المفاتيح.",
    "zh-Hans": "注视选项两秒即可说出。也可点击或使用键盘。"
  },
  "What do you need?": {
    "en": "What do you need?",
    "es": "¿Qué necesita?",
    "ar": "ماذا تحتاج؟",
    "zh-Hans": "您需要什么？"
  },
  "Look at a choice for two seconds to say it.": {
    "en": "Look at a choice for two seconds to say it.",
    "es": "Mire una opción durante dos segundos para decirla.",
    "ar": "انظر إلى خيار لمدة ثانيتين لنطقه.",
    "zh-Hans": "注视选项两秒即可说出。"
  },
  "Look at a choice for two seconds.": {
    "en": "Look at a choice for two seconds.",
    "es": "Mire una opción durante dos segundos.",
    "ar": "انظر إلى خيار لمدة ثانيتين.",
    "zh-Hans": "请注视选项两秒。"
  },
  "Resting": {
    "en": "Resting",
    "es": "Descansando",
    "ar": "استراحة",
    "zh-Hans": "休息中"
  },
  "Nothing is being said. Look at the button when you are ready.": {
    "en": "Nothing is being said. Look at the button when you are ready.",
    "es": "No se está diciendo nada. Mire el botón cuando esté listo.",
    "ar": "لن يتم نطق شيء. انظر إلى الزر عندما تكون مستعدًا.",
    "zh-Hans": "当前不会发声。准备好后请注视按钮。"
  },
  "Help": {
    "en": "Help",
    "es": "Ayuda",
    "ar": "مساعدة",
    "zh-Hans": "求助"
  },
  "The patient is asking for a person.": {
    "en": "The patient is asking for a person.",
    "es": "El paciente está pidiendo que venga alguien.",
    "ar": "المريض يطلب حضور شخص.",
    "zh-Hans": "患者正在请求有人过来。"
  },
  "Intake complete": {
    "en": "Intake complete",
    "es": "Preguntas terminadas",
    "ar": "اكتمل جمع المعلومات",
    "zh-Hans": "问询完成"
  },
  "Clinician: the summary is below.": {
    "en": "Clinician: the summary is below.",
    "es": "Profesional: el resumen está abajo.",
    "ar": "للممارس الصحي: الملخص أدناه.",
    "zh-Hans": "医护人员：摘要如下。"
  },
  "Are you in pain?": {
    "en": "Are you in pain?",
    "es": "¿Tiene dolor?",
    "ar": "هل تشعر بألم؟",
    "zh-Hans": "您有疼痛吗？"
  },
  "Look at Yes or No for two seconds.": {
    "en": "Look at Yes or No for two seconds.",
    "es": "Mire Sí o No durante dos segundos.",
    "ar": "انظر إلى نعم أو لا لمدة ثانيتين.",
    "zh-Hans": "请注视“是”或“否”两秒。"
  },
  "Where does it hurt?": {
    "en": "Where does it hurt?",
    "es": "¿Dónde le duele?",
    "ar": "أين تشعر بالألم؟",
    "zh-Hans": "哪里疼？"
  },
  "Which side?": {
    "en": "Which side?",
    "es": "¿Qué lado?",
    "ar": "أي جانب؟",
    "zh-Hans": "哪一侧？"
  },
  "How strong is the pain?": {
    "en": "How strong is the pain?",
    "es": "¿Qué tan fuerte es el dolor?",
    "ar": "ما شدة الألم؟",
    "zh-Hans": "疼痛有多严重？"
  },
  "How long has it been?": {
    "en": "How long has it been?",
    "es": "¿Desde hace cuánto tiempo?",
    "ar": "منذ متى؟",
    "zh-Hans": "已经多久了？"
  },
  "What makes it worse?": {
    "en": "What makes it worse?",
    "es": "¿Qué lo empeora?",
    "ar": "ما الذي يزيد الألم؟",
    "zh-Hans": "什么情况会加重疼痛？"
  },
  "Anything else?": {
    "en": "Anything else?",
    "es": "¿Algo más?",
    "ar": "هل هناك شيء آخر؟",
    "zh-Hans": "还有其他不适吗？"
  },
  "Is this right?": {
    "en": "Is this right?",
    "es": "¿Es correcto?",
    "ar": "هل هذا صحيح؟",
    "zh-Hans": "这样对吗？"
  },
  "If it is, it will be said aloud.": {
    "en": "If it is, it will be said aloud.",
    "es": "Si es correcto, se dirá en voz alta.",
    "ar": "إذا كان صحيحًا، فسيتم نطقه.",
    "zh-Hans": "确认后将朗读出来。"
  },
  "Intake": {
    "en": "Intake",
    "es": "Preguntas iniciales",
    "ar": "جمع المعلومات",
    "zh-Hans": "初次问询"
  },
  "First meeting: guided questions": {
    "en": "First meeting: guided questions",
    "es": "Primera consulta: preguntas guiadas",
    "ar": "اللقاء الأول: أسئلة موجهة",
    "zh-Hans": "初次交流：引导问询"
  },
  "Conversation": {
    "en": "Conversation",
    "es": "Conversación",
    "ar": "محادثة",
    "zh-Hans": "日常交流"
  },
  "Ongoing: yes, no, and what I need": {
    "en": "Ongoing: yes, no, and what I need",
    "es": "Comunicación: sí, no y lo que necesito",
    "ar": "تواصل مستمر: نعم ولا وما أحتاجه",
    "zh-Hans": "持续交流：是、否和我的需要"
  },
  "I’m ready": {
    "en": "I’m ready",
    "es": "Estoy listo",
    "ar": "أنا مستعد",
    "zh-Hans": "我准备好了"
  },
  "Look here to carry on": {
    "en": "Look here to carry on",
    "es": "Mire aquí para continuar",
    "ar": "انظر هنا للمتابعة",
    "zh-Hans": "注视这里继续"
  },
  "Cancel: I’m okay": {
    "en": "Cancel: I’m okay",
    "es": "Cancelar: estoy bien",
    "ar": "إلغاء: أنا بخير",
    "zh-Hans": "取消：我没事"
  },
  "Start conversation mode": {
    "en": "Start conversation mode",
    "es": "Iniciar conversación",
    "ar": "بدء المحادثة",
    "zh-Hans": "开始日常交流"
  },
  "For ongoing care": {
    "en": "For ongoing care",
    "es": "Para la atención continua",
    "ar": "للرعاية المستمرة",
    "zh-Hans": "用于持续照护"
  },
  "Redo the intake": {
    "en": "Redo the intake",
    "es": "Repetir las preguntas",
    "ar": "إعادة جمع المعلومات",
    "zh-Hans": "重新问询"
  },
  "No answers were recorded": {
    "en": "No answers were recorded",
    "es": "No se registraron respuestas",
    "ar": "لم تُسجل إجابات",
    "zh-Hans": "尚未选择答案"
  },
  "I am in pain": {
    "en": "I am in pain",
    "es": "Tengo dolor",
    "ar": "أشعر بألم",
    "zh-Hans": "我有疼痛"
  },
  "I am not in pain": {
    "en": "I am not in pain",
    "es": "No tengo dolor",
    "ar": "لا أشعر بألم",
    "zh-Hans": "我没有疼痛"
  },
  "Head": {
    "en": "Head",
    "es": "Cabeza",
    "ar": "الرأس",
    "zh-Hans": "头部"
  },
  "Chest": {
    "en": "Chest",
    "es": "Pecho",
    "ar": "الصدر",
    "zh-Hans": "胸部"
  },
  "Stomach": {
    "en": "Stomach",
    "es": "Estómago",
    "ar": "البطن",
    "zh-Hans": "腹部"
  },
  "Back": {
    "en": "Back",
    "es": "Espalda",
    "ar": "الظهر",
    "zh-Hans": "背部"
  },
  "Arm": {
    "en": "Arm",
    "es": "Brazo",
    "ar": "الذراع",
    "zh-Hans": "手臂"
  },
  "Leg": {
    "en": "Leg",
    "es": "Pierna",
    "ar": "الساق",
    "zh-Hans": "腿部"
  },
  "Left side": {
    "en": "Left side",
    "es": "Lado izquierdo",
    "ar": "الجانب الأيسر",
    "zh-Hans": "左侧"
  },
  "Right side": {
    "en": "Right side",
    "es": "Lado derecho",
    "ar": "الجانب الأيمن",
    "zh-Hans": "右侧"
  },
  "Both sides": {
    "en": "Both sides",
    "es": "Ambos lados",
    "ar": "كلا الجانبين",
    "zh-Hans": "两侧"
  },
  "My left": {
    "en": "My left",
    "es": "Mi izquierda",
    "ar": "يساري",
    "zh-Hans": "我的左侧"
  },
  "My right": {
    "en": "My right",
    "es": "Mi derecha",
    "ar": "يميني",
    "zh-Hans": "我的右侧"
  },
  "Left and right": {
    "en": "Left and right",
    "es": "Izquierda y derecha",
    "ar": "اليسار واليمين",
    "zh-Hans": "左侧和右侧"
  },
  "A little": {
    "en": "A little",
    "es": "Un poco",
    "ar": "قليل",
    "zh-Hans": "轻微"
  },
  "Mild": {
    "en": "Mild",
    "es": "Leve",
    "ar": "خفيف",
    "zh-Hans": "轻微"
  },
  "Medium": {
    "en": "Medium",
    "es": "Medio",
    "ar": "متوسط",
    "zh-Hans": "中等"
  },
  "Moderate": {
    "en": "Moderate",
    "es": "Moderado",
    "ar": "متوسط",
    "zh-Hans": "中等"
  },
  "Strong": {
    "en": "Strong",
    "es": "Fuerte",
    "ar": "شديد",
    "zh-Hans": "严重"
  },
  "Severe": {
    "en": "Severe",
    "es": "Intenso",
    "ar": "شديد",
    "zh-Hans": "严重"
  },
  "The worst": {
    "en": "The worst",
    "es": "El peor",
    "ar": "الأسوأ",
    "zh-Hans": "最剧烈"
  },
  "Worst pain": {
    "en": "Worst pain",
    "es": "El peor dolor",
    "ar": "أسوأ ألم",
    "zh-Hans": "最剧烈的疼痛"
  },
  "Today": {
    "en": "Today",
    "es": "Hoy",
    "ar": "اليوم",
    "zh-Hans": "今天"
  },
  "1–2 days": {
    "en": "1–2 days",
    "es": "1–2 días",
    "ar": "يوم إلى يومين",
    "zh-Hans": "1–2天"
  },
  "About a week": {
    "en": "About a week",
    "es": "Una semana aproximadamente",
    "ar": "حوالي أسبوع",
    "zh-Hans": "大约一周"
  },
  "Longer": {
    "en": "Longer",
    "es": "Más tiempo",
    "ar": "أكثر من ذلك",
    "zh-Hans": "更久"
  },
  "Breathing": {
    "en": "Breathing",
    "es": "Respirar",
    "ar": "التنفس",
    "zh-Hans": "呼吸"
  },
  "Moving": {
    "en": "Moving",
    "es": "Moverme",
    "ar": "الحركة",
    "zh-Hans": "活动"
  },
  "Eating": {
    "en": "Eating",
    "es": "Comer",
    "ar": "الأكل",
    "zh-Hans": "进食"
  },
  "Nothing in particular": {
    "en": "Nothing in particular",
    "es": "Nada en particular",
    "ar": "لا شيء محدد",
    "zh-Hans": "没有特别情况"
  },
  "Fever": {
    "en": "Fever",
    "es": "Fiebre",
    "ar": "حمى",
    "zh-Hans": "发烧"
  },
  "Nausea": {
    "en": "Nausea",
    "es": "Náuseas",
    "ar": "غثيان",
    "zh-Hans": "恶心"
  },
  "Dizziness": {
    "en": "Dizziness",
    "es": "Mareo",
    "ar": "دوار",
    "zh-Hans": "头晕"
  },
  "Short of breath": {
    "en": "Short of breath",
    "es": "Falta de aire",
    "ar": "ضيق التنفس",
    "zh-Hans": "气短"
  },
  "Nothing else": {
    "en": "Nothing else",
    "es": "Nada más",
    "ar": "لا شيء آخر",
    "zh-Hans": "没有其他不适"
  },
  "Pain": {
    "en": "Pain",
    "es": "Dolor",
    "ar": "ألم",
    "zh-Hans": "疼痛"
  },
  "Move me": {
    "en": "Move me",
    "es": "Cambiar de posición",
    "ar": "غيّر وضعيتي",
    "zh-Hans": "帮我换姿势"
  },
  "Water": {
    "en": "Water",
    "es": "Agua",
    "ar": "ماء",
    "zh-Hans": "水"
  },
  "Toilet": {
    "en": "Toilet",
    "es": "Baño",
    "ar": "الحمام",
    "zh-Hans": "厕所"
  },
  "Too hot": {
    "en": "Too hot",
    "es": "Mucho calor",
    "ar": "حر شديد",
    "zh-Hans": "太热"
  },
  "Too cold": {
    "en": "Too cold",
    "es": "Mucho frío",
    "ar": "برد شديد",
    "zh-Hans": "太冷"
  },
  "Yes, say it": {
    "en": "Yes, say it",
    "es": "Sí, dígalo",
    "ar": "نعم، انطق ذلك",
    "zh-Hans": "对，请朗读"
  },
  "No, change it": {
    "en": "No, change it",
    "es": "No, cambiar",
    "ar": "لا، غيّر ذلك",
    "zh-Hans": "不对，请修改"
  },
  "Start these questions again": {
    "en": "Start these questions again",
    "es": "Volver a empezar estas preguntas",
    "ar": "ابدأ هذه الأسئلة من جديد",
    "zh-Hans": "重新回答这些问题"
  },
  "Go back": {
    "en": "Go back",
    "es": "Volver",
    "ar": "رجوع",
    "zh-Hans": "返回"
  },
  "So far:": {
    "en": "So far:",
    "es": "Hasta ahora:",
    "ar": "حتى الآن:",
    "zh-Hans": "目前："
  },
  "Selected:": {
    "en": "Selected:",
    "es": "Elegido:",
    "ar": "المحدد:",
    "zh-Hans": "已选择："
  },
  "No choice selected yet.": {
    "en": "No choice selected yet.",
    "es": "Todavía no se eligió nada.",
    "ar": "لم يتم اختيار شيء بعد.",
    "zh-Hans": "尚未选择。"
  },
  "I need something": {
    "en": "I need something",
    "es": "Necesito algo",
    "ar": "أحتاج شيئًا",
    "zh-Hans": "我有需要"
  },
  "Rest": {
    "en": "Rest",
    "es": "Descansar",
    "ar": "استراحة",
    "zh-Hans": "休息"
  },
  "Speak again": {
    "en": "Speak again",
    "es": "Volver a escuchar",
    "ar": "النطق مجددًا",
    "zh-Hans": "再次朗读"
  },
  "Use device voice": {
    "en": "Use device voice",
    "es": "Usar voz del dispositivo",
    "ar": "استخدام صوت الجهاز",
    "zh-Hans": "使用设备语音"
  },
  "Waiting for the device to speak.": {
    "en": "Waiting for the device to speak.",
    "es": "Esperando el audio.",
    "ar": "بانتظار الصوت.",
    "zh-Hans": "正在等待语音。"
  },
  "Speaking aloud…": {
    "en": "Speaking aloud…",
    "es": "Hablando…",
    "ar": "جارٍ النطق…",
    "zh-Hans": "正在朗读……"
  },
  "Finished speaking aloud.": {
    "en": "Finished speaking aloud.",
    "es": "Audio terminado.",
    "ar": "انتهى النطق.",
    "zh-Hans": "朗读完成。"
  },
  "Not spoken. Sound was off when this choice was selected.": {
    "en": "Not spoken. Sound was off when this choice was selected.",
    "es": "No se leyó. El sonido estaba apagado.",
    "ar": "لم يُنطق. كان الصوت مكتومًا عند الاختيار.",
    "zh-Hans": "尚未朗读。选择时声音已关闭。"
  },
  "Speech is unavailable. Please show this choice to the clinician.": {
    "en": "Speech is unavailable. Please show this choice to the clinician.",
    "es": "Audio no disponible. Muestre la elección al profesional.",
    "ar": "الصوت غير متاح. اعرض هذا الاختيار على الممارس الصحي.",
    "zh-Hans": "语音不可用。请向医护人员展示此选择。"
  },
  "The device could not speak. Please show this choice to the clinician.": {
    "en": "The device could not speak. Please show this choice to the clinician.",
    "es": "No se pudo reproducir el audio. Muestre la elección al profesional.",
    "ar": "تعذر تشغيل الصوت. اعرض هذا الاختيار على الممارس الصحي.",
    "zh-Hans": "无法播放语音。请向医护人员展示此选择。"
  },
  "Speech stopped. The choice remains on screen.": {
    "en": "Speech stopped. The choice remains on screen.",
    "es": "Audio detenido. La elección sigue en pantalla.",
    "ar": "توقف الصوت. يبقى الاختيار على الشاشة.",
    "zh-Hans": "语音已停止。选择仍显示在屏幕上。"
  },
  "Tap Speak again to play the audio.": {
    "en": "Tap Speak again to play the audio.",
    "es": "Toque Volver a escuchar para reproducir el audio.",
    "ar": "اضغط على النطق مجددًا لتشغيل الصوت.",
    "zh-Hans": "请点击“再次朗读”播放语音。"
  },
  "Azure audio is unavailable. Tap Use device voice to try this device’s voice.": {
    "en": "Azure audio is unavailable. Tap Use device voice to try this device’s voice.",
    "es": "Audio de Azure no disponible. Toque Usar voz del dispositivo.",
    "ar": "صوت Azure غير متاح. اضغط على استخدام صوت الجهاز.",
    "zh-Hans": "Azure语音不可用。请点击“使用设备语音”。"
  },
  "Staff have not been notified automatically.": {
    "en": "Staff have not been notified automatically.",
    "es": "No se ha avisado al personal automáticamente.",
    "ar": "لم يتم إبلاغ الموظفين تلقائيًا.",
    "zh-Hans": "尚未自动通知工作人员。"
  },
  "HELP. The patient is asking for a person.": {
    "en": "HELP. The patient is asking for a person.",
    "es": "AYUDA. El paciente pide que venga alguien.",
    "ar": "مساعدة. المريض يطلب حضور شخص.",
    "zh-Hans": "求助。患者请求有人过来。"
  }
};
export function eyeText(source: string, language: EyeLanguage): string { return UI[source]?.[language] ?? SPOKEN[source]?.[language] ?? source; }
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
