// Input channel contract: every way a patient answers (tap, speech, gaze, sign) emits the same event.
// Plain types only; zod schemas for the API routes are added in the shared-pieces PR.
// Change by small PR and tell the team first. See docs/API.md, "Input channels".

export type RegionId =
  | "head"
  | "neck"
  | "chest"
  | "abdomen"
  | "back"
  | "left_arm"
  | "right_arm"
  | "left_leg"
  | "right_leg";

export type InputChannel = "tap" | "speech" | "gaze" | "sign";

export type SelectEvent = {
  channel: InputChannel;
  optionId: string;
};

export type BodyDiagramProps = {
  regions: RegionId[];
  onSelect: (region: RegionId, channel: InputChannel) => void;
};
