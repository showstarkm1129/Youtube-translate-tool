"use client";

interface VideoPlayerProps {
  isReady: boolean;
  currentTime: number;
}

export default function VideoPlayer({ isReady, currentTime }: VideoPlayerProps) {
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full">
      {/* YouTube IFrame Player がここに挿入される */}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <div
          id="youtube-player"
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>

      {/* デバッグ用：再生位置の表示 */}
      {isReady && (
        <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">
          再生位置: {formatTime(currentTime)} ({currentTime.toFixed(1)}秒)
        </div>
      )}
    </div>
  );
}
