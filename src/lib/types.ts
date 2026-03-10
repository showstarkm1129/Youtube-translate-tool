// 字幕の1エントリ
export interface SubtitleEntry {
  startTime: number; // 開始時間（秒）
  endTime: number; // 終了時間（秒）
  originalText: string; // 原語テキスト
  translatedText: string; // 翻訳済みテキスト
}

// 翻訳リクエスト用チャンク
export interface TranslationChunk {
  entries: SubtitleEntry[];
  contextBefore?: string; // 前のチャンクの最後の数行（文脈用）
}

// 翻訳プロバイダーのインターフェース
export interface TranslationProvider {
  name: string; // 表示名（"Gemini", "Claude" 等）
  translate(
    entries: SubtitleEntry[],
    context?: string
  ): Promise<SubtitleEntry[]>;
}

// 利用可能なプロバイダーID
export type ProviderId = "gemini" | "claude" | "deepl";

// YouTube IFrame Player API の型定義
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

export interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

// YouTube IFrame API のグローバル型
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: YTPlayerEvent) => void;
            onStateChange?: (event: YTPlayerEvent) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
