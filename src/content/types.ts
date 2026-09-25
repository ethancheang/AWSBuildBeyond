export interface Category {
  label: string;
  color: string;
}
export interface Term {
  cat: string;
  short: string;
  long: string;
  stray?: string;
}
export interface Avatar {
  skin?: string;
  hair?: string;
  style?: string;
  shirt?: string;
  singlet?: boolean;
  towel?: boolean;
  apron?: string;
  visor?: string;
  glasses?: boolean;
  tie?: string;
  cap?: string;
  mustache?: boolean;
}
export interface ConversationStage {
  q: string;
  a: string[];
  chips: string[];
}
export interface CustomerPrompt {
  c: { name: string; tag: string; av: Avatar };
  q: string;
  a: string[];
  stages?: ConversationStage[];
}
export interface Lesson {
  id: string;
  kind: 'drink' | 'noodle' | 'nasi';
  stall: string;
  stallZh: string;
  type: string;
  npc: string;
  role: string;
  honor: string;
  title: string;
  npcAv: Avatar;
  slots: string[];
  optional: string[];
  none: Record<string, string>;
  chips: string[];
  intro: string[];
  formula: { cat: string; opts: string[]; blank?: string }[];
  example: { tokens: string[]; meaning: string };
  orderNote?: string;
  next: string[];
  praise: string[];
  comfort: string[];
  prompts: CustomerPrompt[];
}
