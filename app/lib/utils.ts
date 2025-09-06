import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * オーディオファイルURLを生成する（サーバーサイドAPI経由）
 * @param filename mp3ファイル名（例: "news-001.mp3"）
 * @returns サーバーサイドAPIのURL
 */
export function getAudioUrl(filename: string): string {
  return `/api/audio?filename=${encodeURIComponent(filename)}`
}

/**
 * 解説音声ファイルURLを生成する（サーバーサイドAPI経由）
 * @param filename mp3ファイル名（例: "audio_2025_08_23.mp3"）
 * @returns サーバーサイドAPIのURL（description バケット使用）
 */
export function getDescriptionAudioUrl(filename: string): string {
  return `/api/audio?filename=${encodeURIComponent(filename)}&bucket=description`
}


/**
 * ニュース音声のファイル名から解説音声のファイル名を生成する
 * @param newsAudioUrl ニュース音声のURL（例: "/api/audio?filename=2025_08_23.mp4"）
 * @returns 解説音声のファイル名（例: "2025_08_23.mp4"）
 */
export function getDescriptionAudioFileNameFromNewsUrl(newsAudioUrl: string): string {
  try {
    const url = new URL(newsAudioUrl, window.location.origin);
    const filename = url.searchParams.get('filename');
    return filename || '';
  } catch {
    return '';
  }
}