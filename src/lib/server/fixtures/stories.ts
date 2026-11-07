import type { RespondRequest, RespondResponse, TranslateRequest, TranslateResponse } from "../../contracts";

// Synthetic demo cases only. Translations are drafts requiring fluent-speaker review.
const DEMOS = [
  { id: "headache-en", language: "en", text: "My head has hurt since this morning.", translated: "My head has hurt since this morning.", complaint: "Headache", duration: "Since this morning", reply: "Please point to where it hurts.", teachBack: "Can you show me where it hurts?" },
  { id: "abdominal-pain-es", language: "es", text: "Me duele el estómago desde hace dos días.", translated: "My stomach has hurt for two days.", complaint: "Abdominal pain", duration: "2 days", reply: "Por favor, señale dónde le duele.", teachBack: "¿Puede mostrarme dónde le duele?" },
  { id: "back-pain-ar", language: "ar", text: "أشعر بألم في ظهري منذ أمس.", translated: "My back has hurt since yesterday.", complaint: "Back pain", duration: "Since yesterday", reply: "يرجى الإشارة إلى مكان الألم.", teachBack: "هل يمكنك أن تريني مكان الألم؟" },
  { id: "knee-pain-zh", language: "zh-Hans", text: "我的膝盖疼了三天。", translated: "My knee has hurt for three days.", complaint: "Knee pain", duration: "3 days", reply: "请指出哪里疼。", teachBack: "你能指出哪里疼吗？" },
] as const;

export const STORIES: {
  id: string;
  translateRequest: TranslateRequest;
  translateResponse: TranslateResponse;
  respondRequest: RespondRequest;
  respondResponse: RespondResponse;
}[] = DEMOS.map(({ id, language, text, translated, complaint, duration, reply, teachBack }) => {
  const context = { language, mode: "standard" as const, readingLevel: 3 as const };
  return {
    id,
    translateRequest: { context, inputs: [{ kind: "text", value: text }] },
    translateResponse: {
      original: text,
      translated,
      backTranslation: text,
      summary: { chiefComplaint: complaint, symptoms: [complaint], duration, redFlags: [] },
      lowConfidence: [{ phrase: text, reason: "Mock provider: canned synthetic example, not a live translation." }],
      redactions: 0,
    },
    respondRequest: { context, message: "Please point to where it hurts." },
    respondResponse: { patientText: reply, readAloudText: reply, teachBackPrompt: teachBack },
  };
});
