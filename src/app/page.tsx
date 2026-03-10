"use client";

import { useState, useCallback } from "react";
import UrlInput from "@/components/UrlInput";
import VideoPlayer from "@/components/VideoPlayer";
import { useYouTubePlayer, extractVideoId } from "@/hooks/useYouTubePlayer";

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const { loadVideo, currentTime, isReady } = useYouTubePlayer("youtube-player");

  const handleUrlSubmit = useCallback(
    async (url: string) => {
      setError(null);
      const videoId = extractVideoId(url);
      if (!videoId) {
        setError("有効なYouTube URLを入力してください");
        return;
      }
      await loadVideo(videoId);
      setVideoLoaded(true);
    },
    [loadVideo]
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ヘッダー */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            YouTube 字幕翻訳プレーヤー
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* URL入力 */}
        <UrlInput onSubmit={handleUrlSubmit} isLoading={false} />

        {/* エラー表示 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 動画プレーヤー */}
        {videoLoaded && (
          <VideoPlayer isReady={isReady} currentTime={currentTime} />
        )}
      </main>
    </div>
  );
}
