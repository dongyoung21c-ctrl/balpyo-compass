import type { AppData } from '../domain/types';
import { parseAppData } from './schema';

/** 백업 파일 최대 크기. 반 수십 개 분량이면 수십 KB라 넉넉하다. */
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

export function toBackupJson(data: AppData, now: Date = new Date()): string {
  return JSON.stringify({ app: 'balpyo-compass', exportedAt: now.toISOString(), ...data }, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `발표나침반-백업-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.json`;
}

export type BackupParse = { ok: true; data: AppData } | { ok: false; error: string };

export function parseBackup(text: string): BackupParse {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: '파일이 너무 커요. 발표나침반 백업 파일이 맞는지 확인하세요.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON 파일이 아니에요. 발표나침반에서 내려받은 백업 파일을 고르세요.' };
  }
  const data = parseAppData(raw);
  if (!data) return { ok: false, error: '발표나침반 백업 파일 형식이 아니에요.' };
  return { ok: true, data };
}
