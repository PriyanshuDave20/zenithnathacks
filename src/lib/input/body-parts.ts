// Body parts the patient can tap on the body diagram (src/components/input/body-diagram.tsx).
// Each part is finer than the contract's RegionId; `region` maps it back so the question bank's
// follow-ups still work. Labels are the English the clinician reads; `text` is shown to the patient.
// Translations are demo phrases: a fluent speaker must review them before any real clinical use.
import type { RegionId } from "@/lib/contracts/input";

export type BodyView = "front" | "back";
export type BodySide = "right" | "left";
type Lang = "en" | "es" | "ar" | "zh-Hans";
type Text = Record<Lang, string>;

export type BodyPart = {
  id: string; // e.g. "right_knee", "chest"
  view: BodyView;
  region: RegionId;
  label: string; // English for the clinician
  text: Text;
};

const centre: { id: string; view: BodyView; region: RegionId; text: Text }[] = [
  { id: "head", view: "front", region: "head", text: { en: "Head", es: "Cabeza", ar: "الرأس", "zh-Hans": "头部" } },
  { id: "neck", view: "front", region: "neck", text: { en: "Neck", es: "Cuello", ar: "الرقبة", "zh-Hans": "脖子" } },
  { id: "chest", view: "front", region: "chest", text: { en: "Chest", es: "Pecho", ar: "الصدر", "zh-Hans": "胸口" } },
  { id: "abdomen", view: "front", region: "abdomen", text: { en: "Stomach", es: "Estómago", ar: "البطن", "zh-Hans": "肚子" } },
  { id: "groin", view: "front", region: "abdomen", text: { en: "Groin", es: "Ingle", ar: "منطقة الأربية", "zh-Hans": "腹股沟" } },
  { id: "head_back", view: "back", region: "head", text: { en: "Back of head", es: "Parte de atrás de la cabeza", ar: "مؤخرة الرأس", "zh-Hans": "后脑勺" } },
  { id: "neck_back", view: "back", region: "neck", text: { en: "Back of neck", es: "Nuca", ar: "مؤخرة الرقبة", "zh-Hans": "后颈" } },
  { id: "upper_back", view: "back", region: "back", text: { en: "Upper back", es: "Parte alta de la espalda", ar: "أعلى الظهر", "zh-Hans": "上背部" } },
  { id: "lower_back", view: "back", region: "back", text: { en: "Lower back", es: "Parte baja de la espalda", ar: "أسفل الظهر", "zh-Hans": "腰部" } },
];

// Written for the right side; the left side is derived by swapping the side words.
// `views` lists where the part is drawn: arms look the same from both sides, so they share one id.
const sided: { key: string; views: BodyView[]; limb: "arm" | "leg" | "back"; text: Text }[] = [
  { key: "shoulder", views: ["front"], limb: "arm", text: { en: "Right shoulder", es: "Hombro derecho", ar: "الكتف الأيمن", "zh-Hans": "右肩" } },
  { key: "upper_arm", views: ["front", "back"], limb: "arm", text: { en: "Right upper arm", es: "Parte superior del brazo derecho", ar: "أعلى الذراع اليمنى", "zh-Hans": "右上臂" } },
  { key: "elbow", views: ["front", "back"], limb: "arm", text: { en: "Right elbow", es: "Codo derecho", ar: "المرفق الأيمن", "zh-Hans": "右肘" } },
  { key: "forearm", views: ["front", "back"], limb: "arm", text: { en: "Right forearm", es: "Antebrazo derecho", ar: "الساعد الأيمن", "zh-Hans": "右前臂" } },
  { key: "hand", views: ["front", "back"], limb: "arm", text: { en: "Right hand", es: "Mano derecha", ar: "اليد اليمنى", "zh-Hans": "右手" } },
  { key: "hip", views: ["front"], limb: "leg", text: { en: "Right hip", es: "Cadera derecha", ar: "الورك الأيمن", "zh-Hans": "右髋部" } },
  { key: "thigh", views: ["front"], limb: "leg", text: { en: "Right thigh", es: "Muslo derecho", ar: "الفخذ الأيمن", "zh-Hans": "右大腿" } },
  { key: "knee", views: ["front"], limb: "leg", text: { en: "Right knee", es: "Rodilla derecha", ar: "الركبة اليمنى", "zh-Hans": "右膝" } },
  { key: "shin", views: ["front"], limb: "leg", text: { en: "Right shin", es: "Espinilla derecha", ar: "مقدمة الساق اليمنى", "zh-Hans": "右小腿前侧" } },
  { key: "foot", views: ["front"], limb: "leg", text: { en: "Right foot", es: "Pie derecho", ar: "القدم اليمنى", "zh-Hans": "右脚" } },
  { key: "shoulder_blade", views: ["back"], limb: "back", text: { en: "Right shoulder blade", es: "Omóplato derecho", ar: "لوح الكتف الأيمن", "zh-Hans": "右肩胛" } },
  { key: "buttock", views: ["back"], limb: "back", text: { en: "Right buttock", es: "Glúteo derecho", ar: "الردف الأيمن", "zh-Hans": "右臀部" } },
  { key: "thigh_back", views: ["back"], limb: "leg", text: { en: "Back of right thigh", es: "Parte de atrás del muslo derecho", ar: "خلف الفخذ الأيمن", "zh-Hans": "右大腿后侧" } },
  { key: "knee_back", views: ["back"], limb: "leg", text: { en: "Back of right knee", es: "Parte de atrás de la rodilla derecha", ar: "خلف الركبة اليمنى", "zh-Hans": "右膝后侧" } },
  { key: "calf", views: ["back"], limb: "leg", text: { en: "Right calf", es: "Pantorrilla derecha", ar: "ربلة الساق اليمنى", "zh-Hans": "右小腿肚" } },
  { key: "heel", views: ["back"], limb: "leg", text: { en: "Right heel", es: "Talón derecho", ar: "الكعب الأيمن", "zh-Hans": "右脚跟" } },
];

function toLeft(t: Text): Text {
  return {
    en: t.en.replace("Right", "Left").replace("right", "left"),
    es: t.es.replace("derecho", "izquierdo").replace("derecha", "izquierda"),
    ar: t.ar.replace("الأيمن", "الأيسر").replace("اليمنى", "اليسرى"),
    "zh-Hans": t["zh-Hans"].replace("右", "左"),
  };
}

function sidedRegion(limb: "arm" | "leg" | "back", side: BodySide): RegionId {
  return limb === "back" ? "back" : `${side}_${limb}`;
}

/** Every tappable part, once per view it appears in (arm parts appear in both views with the same id). */
export const BODY_PARTS: BodyPart[] = [
  ...centre.map((c) => ({ id: c.id, view: c.view, region: c.region, label: c.text.en, text: c.text })),
  ...sided.flatMap((s) =>
    (["right", "left"] as const).flatMap((side) => {
      const text = side === "right" ? s.text : toLeft(s.text);
      return s.views.map((view) => ({ id: `${side}_${s.key}`, view, region: sidedRegion(s.limb, side), label: text.en, text }));
    }),
  ),
];

const BY_ID = new Map(BODY_PARTS.map((p) => [p.id, p]));

export function getBodyPart(id: string): BodyPart | undefined {
  return BY_ID.get(id);
}

/** The contract region a part belongs to, for the question bank and the real API. */
export function regionOf(id: string): RegionId | undefined {
  return BY_ID.get(id)?.region;
}

/** Words on the diagram itself, in the patient's language. */
export const DIAGRAM_TEXT: Record<Lang, { front: string; back: string; right: string; left: string; hint: string; chosen: string; none: string; remove: (part: string) => string }> = {
  en: { front: "Front", back: "Back", right: "Right", left: "Left", hint: "Tap where it hurts. You can choose more than one.", chosen: "Where it hurts", none: "Nothing chosen yet", remove: (p) => `Remove ${p}` },
  es: { front: "Delante", back: "Detrás", right: "Derecha", left: "Izquierda", hint: "Toque donde le duele. Puede elegir más de uno.", chosen: "Dónde le duele", none: "Aún no ha elegido nada", remove: (p) => `Quitar ${p}` },
  ar: { front: "الأمام", back: "الخلف", right: "يمين", left: "يسار", hint: "المس مكان الألم. يمكنك اختيار أكثر من مكان.", chosen: "مكان الألم", none: "لم تختر شيئًا بعد", remove: (p) => `إزالة ${p}` },
  "zh-Hans": { front: "正面", back: "背面", right: "右", left: "左", hint: "点一下疼的地方。可以选多个。", chosen: "疼的地方", none: "还没有选择", remove: (p) => `移除${p}` },
};
