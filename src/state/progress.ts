import { LEVELS } from '../content/lessons';

export interface LevelProgress {
  done: boolean;
  stars: number;
  best: number;
}
export interface Progress {
  levels: Record<string, LevelProgress>;
  sound: boolean;
}
export const SAVE_KEY = 'hawker-lingo-v1';
const emptyLevel = (): LevelProgress => ({ done: false, stars: 0, best: 0 });
const emptyProgress = (): Progress => ({ levels: {}, sound: true });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const bounded = (value: unknown, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.floor(value)))
    : 0;

/** Accept the original save format, but never trust arbitrary browser storage. */
export function parseProgress(raw: string | null): Progress {
  const result = emptyProgress();
  try {
    const data: unknown = raw ? JSON.parse(raw) : null;
    if (!isRecord(data)) return result;
    if (typeof data.sound === 'boolean') result.sound = data.sound;
    if (!isRecord(data.levels)) return result;
    for (const level of LEVELS) {
      const record = data.levels[level.id];
      if (!isRecord(record)) continue;
      result.levels[level.id] = {
        done: record.done === true,
        stars: bounded(record.stars, 3),
        best: bounded(record.best, level.prompts.length * 100),
      };
    }
  } catch {
    /* Malformed saves should never prevent starting a lesson. */
  }
  return result;
}

export function readProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY));
  } catch {
    return emptyProgress();
  }
}
export const save = readProgress();
export function persist(): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
export const levelSave = (id: string): LevelProgress =>
  save.levels[id] ?? emptyLevel();
