// Patient-facing interface text, in the patient's language. Demo phrases: a fluent speaker must
// review them before real clinical use. Clinician-facing text stays in English.
import type { PatientLanguage } from "@/lib/mocks";

type Strings = {
  intakeTitle: string;
  noNames: string;
  speak: string;
  listening: string;
  stop: string;
  typeInstead: string;
  speakInstead: string;
  showBody: string;
  showList: string;
  typeHere: string;
  done: string;
  next: string;
  back: string;
  questionOf: (n: number, t: number) => string;
  readAloud: string;
  speechLoading: string;
  speechReady: string;
  speechUnavailable: string;
  speechFailed: string;
  speechAudioLoading: string;
  speechAudioReady: string;
  speechBrowserReady: string;
  working: string;
  isThisRight: string;
  yesRight: string;
  shareUntranslated: string;
  tryAgain: string;
  passToClinician: string;
  clinicianSays: string;
  listen: string;
  yes: string;
  no: string;
  unsure: string;
  handBack: string;
  handBackDone: string;
  tapPhrases: string;
  speakForMe: string;
  clearPhrases: string;
  micUnavailable: string;
  yourMessage: string;
  inEnglish: string;
  couldNotTranslate: string;
  retry: string;
  stillThere: string;
  clearsIn: (n: number) => string;
  keepSession: string;
};

export const STRINGS: Record<PatientLanguage, Strings> = {
  en: {
    intakeTitle: "Tell us what's wrong.",
    noNames: "Please don't say your name or personal details.",
    speak: "Speak",
    listening: "Listening…",
    stop: "Stop",
    typeInstead: "Type instead",
    speakInstead: "Speak instead",
    showBody: "Point on a body picture",
    showList: "Show a list instead",
    typeHere: "Type here",
    done: "I'm finished",
    next: "Next",
    back: "Back",
    questionOf: (n, t) => `Question ${n} of ${t}`,
    readAloud: "Read aloud",
    speechLoading: "Loading this device’s voices…",
    speechReady: "The voice is ready. Tap the audio button again.",
    speechUnavailable: "A voice for this language isn’t available. Ask the clinician to add this language’s voice in the device’s speech settings, then try again.",
    speechFailed: "Read aloud couldn’t start. Tap again, or ask the clinician to check this language’s voice in the device’s speech settings.",
    speechAudioLoading: "Preparing the voice…",
    speechAudioReady: "The audio is ready. Tap the speak button again to listen.",
    speechBrowserReady: "The natural voice is unavailable. Tap the speak button again to try this device’s voice.",
    working: "One moment…",
    isThisRight: "Is this what you meant?",
    yesRight: "Yes, that's right",
    shareUntranslated: "Share without translation",
    tryAgain: "No, try again",
    passToClinician: "Pass the device to the clinician",
    clinicianSays: "Your clinician says",
    listen: "Listen",
    yes: "Yes",
    no: "No",
    unsure: "Not sure",
    handBack: "Hand the device back to the clinician",
    handBackDone: "I've handed it back",
    tapPhrases: "Tap words to build what you want to say",
    speakForMe: "Say it out loud",
    clearPhrases: "Clear",
    micUnavailable: "The microphone isn't available here. Please type.",
    yourMessage: "Your message",
    inEnglish: "Shown in English",
    couldNotTranslate: "Translation isn’t available right now. The clinician will see your words as you wrote them.",
    retry: "Try again",
    stillThere: "Still there?",
    clearsIn: (n) => `To protect privacy, this session clears in ${n}s.`,
    keepSession: "Keep session",
  },
  es: {
    intakeTitle: "Díganos qué le pasa.",
    noNames: "Por favor, no diga su nombre ni datos personales.",
    speak: "Hablar",
    listening: "Escuchando…",
    stop: "Detener",
    typeInstead: "Prefiero escribir",
    speakInstead: "Prefiero hablar",
    showBody: "Señalar en el dibujo del cuerpo",
    showList: "Ver una lista",
    typeHere: "Escriba aquí",
    done: "Terminé",
    next: "Siguiente",
    back: "Atrás",
    questionOf: (n, t) => `Pregunta ${n} de ${t}`,
    readAloud: "Leer en voz alta",
    speechLoading: "Cargando las voces de este dispositivo…",
    speechReady: "La voz está lista. Toque el botón de audio otra vez.",
    speechUnavailable: "No hay una voz disponible para este idioma. Pida al personal médico que añada una voz para este idioma en los ajustes de voz del dispositivo y vuelva a intentarlo.",
    speechFailed: "No se pudo iniciar la lectura. Toque otra vez o pida al personal médico que revise la voz de este idioma en los ajustes del dispositivo.",
    speechAudioLoading: "Preparando la voz…",
    speechAudioReady: "El audio está listo. Toque el botón de voz otra vez para escuchar.",
    speechBrowserReady: "La voz natural no está disponible. Toque el botón de voz otra vez para probar la voz de este dispositivo.",
    working: "Un momento…",
    isThisRight: "¿Es esto lo que quiso decir?",
    yesRight: "Sí, es correcto",
    shareUntranslated: "Compartir sin traducción",
    tryAgain: "No, decirlo otra vez",
    passToClinician: "Pase el dispositivo al personal médico",
    clinicianSays: "El personal médico dice",
    listen: "Escuchar",
    yes: "Sí",
    no: "No",
    unsure: "No estoy seguro",
    handBack: "Devuelva el dispositivo al personal médico",
    handBackDone: "Ya lo devolví",
    tapPhrases: "Toque las palabras para decir lo que necesita",
    speakForMe: "Decirlo en voz alta",
    clearPhrases: "Borrar",
    micUnavailable: "El micrófono no está disponible aquí. Por favor, escriba.",
    yourMessage: "Su mensaje",
    inEnglish: "Se muestra en inglés",
    couldNotTranslate: "La traducción no está disponible ahora. El personal médico verá sus palabras tal como las escribió.",
    retry: "Intentar de nuevo",
    stillThere: "¿Sigue ahí?",
    clearsIn: (n) => `Para proteger su privacidad, esta sesión se borra en ${n} s.`,
    keepSession: "Mantener la sesión",
  },
  ar: {
    intakeTitle: "أخبرنا بما تشعر به.",
    noNames: "من فضلك لا تذكر اسمك أو أي معلومات شخصية.",
    speak: "تحدّث",
    listening: "جارٍ الاستماع…",
    stop: "إيقاف",
    typeInstead: "أفضّل الكتابة",
    speakInstead: "أفضّل التحدث",
    showBody: "الإشارة على صورة الجسم",
    showList: "عرض قائمة بدلًا من ذلك",
    typeHere: "اكتب هنا",
    done: "انتهيت",
    next: "التالي",
    back: "رجوع",
    questionOf: (n, t) => `السؤال ${n} من ${t}`,
    readAloud: "اقرأ بصوت عالٍ",
    speechLoading: "جارٍ تحميل أصوات هذا الجهاز…",
    speechReady: "الصوت جاهز. اضغط على زر الصوت مرة أخرى.",
    speechUnavailable: "لا يتوفر صوت لهذه اللغة. اطلب من الطاقم الطبي إضافة صوت لهذه اللغة في إعدادات النطق بالجهاز، ثم حاول مرة أخرى.",
    speechFailed: "تعذر بدء القراءة بصوت عالٍ. اضغط مرة أخرى أو اطلب من الطاقم الطبي التحقق من صوت هذه اللغة في إعدادات النطق بالجهاز.",
    speechAudioLoading: "جارٍ تحضير الصوت…",
    speechAudioReady: "الصوت جاهز. اضغط على زر النطق مرة أخرى للاستماع.",
    speechBrowserReady: "الصوت الطبيعي غير متاح. اضغط على زر النطق مرة أخرى لتجربة صوت هذا الجهاز.",
    working: "لحظة من فضلك…",
    isThisRight: "هل هذا ما قصدته؟",
    yesRight: "نعم، صحيح",
    shareUntranslated: "المشاركة بدون ترجمة",
    tryAgain: "لا، سأعيد",
    passToClinician: "سلّم الجهاز إلى الطاقم الطبي",
    clinicianSays: "يقول الطاقم الطبي",
    listen: "استمع",
    yes: "نعم",
    no: "لا",
    unsure: "لست متأكدًا",
    handBack: "أعد الجهاز إلى الطاقم الطبي",
    handBackDone: "أعدته",
    tapPhrases: "اضغط على الكلمات لتقول ما تحتاجه",
    speakForMe: "انطقها بصوت عالٍ",
    clearPhrases: "مسح",
    micUnavailable: "الميكروفون غير متاح هنا. من فضلك اكتب.",
    yourMessage: "رسالتك",
    inEnglish: "معروض باللغة الإنجليزية",
    couldNotTranslate: "الترجمة غير متاحة الآن. سيرى الطاقم الطبي كلماتك كما كتبتها.",
    retry: "حاول مرة أخرى",
    stillThere: "هل ما زلت هنا؟",
    clearsIn: (n) => `لحماية خصوصيتك، ستُمسح هذه الجلسة خلال ${n} ثانية.`,
    keepSession: "إبقاء الجلسة",
  },
  "zh-Hans": {
    intakeTitle: "请告诉我们您哪里不舒服。",
    noNames: "请不要说出您的姓名或个人信息。",
    speak: "说话",
    listening: "正在聆听…",
    stop: "停止",
    typeInstead: "我想打字",
    speakInstead: "我想说话",
    showBody: "在人体图上指出",
    showList: "改用列表",
    typeHere: "在这里输入",
    done: "说完了",
    next: "下一步",
    back: "返回",
    questionOf: (n, t) => `第 ${n} 题，共 ${t} 题`,
    readAloud: "朗读",
    speechLoading: "正在加载此设备的语音…",
    speechReady: "语音已准备好。请再次点击语音按钮。",
    speechUnavailable: "此语言的语音不可用。请医护人员在设备的语音设置中添加此语言的语音，然后重试。",
    speechFailed: "无法开始朗读。请再次点击，或请医护人员检查设备语音设置中此语言的语音。",
    speechAudioLoading: "正在准备语音…",
    speechAudioReady: "音频已准备好。请再次点击朗读按钮收听。",
    speechBrowserReady: "自然语音暂时不可用。请再次点击朗读按钮，尝试此设备的语音。",
    working: "请稍候…",
    isThisRight: "这是您想表达的意思吗？",
    yesRight: "对，没错",
    shareUntranslated: "不翻译，直接分享",
    tryAgain: "不对，重新说",
    passToClinician: "请把设备交给医护人员",
    clinicianSays: "医护人员说",
    listen: "收听",
    yes: "明白",
    no: "不明白",
    unsure: "不确定",
    handBack: "请把设备还给医护人员",
    handBackDone: "已经还给医护人员",
    tapPhrases: "点击词语，说出您想表达的内容",
    speakForMe: "替我说出来",
    clearPhrases: "清除",
    micUnavailable: "这里无法使用麦克风，请打字。",
    yourMessage: "您的信息",
    inEnglish: "以英文显示",
    couldNotTranslate: "暂时无法翻译。医护人员会看到您写下的原话。",
    retry: "重试",
    stillThere: "您还在吗？",
    clearsIn: (n) => `为保护您的隐私，本次会话将在 ${n} 秒后清除。`,
    keepSession: "保留会话",
  },
};
