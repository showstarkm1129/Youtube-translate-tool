"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { YTPlayer } from "@/lib/types";

// YouTube URLから動画IDを抽出
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// YouTube IFrame APIスクリプトの読み込み状態
let apiLoaded = false;
let apiLoading = false;
const apiReadyCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (apiLoaded) {
      resolve();
      return;
    }
    apiReadyCallbacks.push(resolve);
    if (apiLoading) return;

    apiLoading = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      apiLoading = false;
      apiReadyCallbacks.forEach((cb) => cb());
      apiReadyCallbacks.length = 0;
    };
  });
}

export function useYouTubePlayer(containerId: string) {
  const playerRef = useRef<YTPlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 再生位置の監視を開始/停止
  const startTracking = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 100);
  }, []);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 動画をロード
  const loadVideo = useCallback(
    async (videoId: string) => {
      await loadYouTubeAPI();

      // 既存プレーヤーを破棄
      if (playerRef.current) {
        stopTracking();
        playerRef.current.destroy();
        playerRef.current = null;
        setIsReady(false);
        setIsPlaying(false);
        setCurrentTime(0);
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            setIsReady(true);
          },
          onStateChange: (event) => {
            const playing = event.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            if (playing) {
              startTracking();
            } else {
              stopTracking();
              // 一時停止/シーク時でも現在位置を更新
              if (playerRef.current) {
                setCurrentTime(playerRef.current.getCurrentTime());
              }
            }
          },
        },
      });
    },
    [containerId, startTracking, stopTracking]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [stopTracking]);

  return {
    loadVideo,
    currentTime,
    isPlaying,
    isReady,
    player: playerRef.current,
  };
}
