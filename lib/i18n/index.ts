import { ko, Translations } from './ko';
import { en } from './en';

// 지원 언어 목록
export const languages = {
  ko,
  en,
} as const;

export type Language = keyof typeof languages;

// 현재 언어 (추후 설정에서 변경 가능)
let currentLanguage: Language = 'ko';

// 언어 변경
export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

// 현재 언어 가져오기
export function getLanguage(): Language {
  return currentLanguage;
}

// 번역 객체 가져오기
export function getTranslations(): Translations {
  return languages[currentLanguage];
}

// 단축 alias
export const t = getTranslations;

// 문자열 포맷팅 (예: "{count} 터치" → "5 터치")
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/{(\w+)}/g, (_, key) => String(values[key] ?? ''));
}

// Re-export types
export type { Translations };
