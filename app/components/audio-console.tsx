"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  useAudioPlayer,
  PLAYBACK_RATES,
  type NewsItem,
} from "@/app/contexts/audio-player-context";

export function AudioConsole() {
  const {
    currentNews,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isLoading,
    error,
    play,
    pause,
    stop,
    seekTo,
    setPlaybackRate,
    playNext,
    playPrevious,
    newsList,
    descriptionAudioList,
  } = useAudioPlayer();

  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // 統合プレイリストを生成（ニュース→解説の順）
  const getIntegratedPlaylist = useCallback(() => {
    const playlist: NewsItem[] = [];

    newsList.forEach((news) => {
      // 1. ニュース音声を追加
      playlist.push(news);

      // 2. 対応する解説音声があれば追加
      const description = descriptionAudioList.find(
        (desc) => desc.newsId === news.id
      );
      if (description) {
        const descriptionNews = {
          ...news,
          id: `${news.id}_description`,
          title: description.title || `${news.title} - 詳細解説`,
          audioUrl: description.audioUrl,
          duration: description.duration || news.duration,
          exactDurationSeconds: description.exactDurationSeconds,
        };
        playlist.push(descriptionNews);
      }
    });

    return playlist;
  }, [newsList, descriptionAudioList]);

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time) || time < 0) {
      return "0:00";
    }
    // 表示用は切り捨て
    const totalSeconds = Math.floor(time);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (
      isNaN(minutes) ||
      isNaN(seconds) ||
      !isFinite(minutes) ||
      !isFinite(seconds)
    ) {
      return "0:00";
    }

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage =
    duration > 0 &&
    !isNaN(duration) &&
    !isNaN(currentTime) &&
    isFinite(duration) &&
    isFinite(currentTime)
      ? (currentTime / duration) * 100
      : 0;
  const displayPercentage = isDragging ? dragValue : progressPercentage;

  // デバッグ: 無効な値をログ出力
  useEffect(() => {
    if ((isNaN(duration) || !isFinite(duration)) && currentNews) {
    }
  }, [duration, currentTime, currentNews]);

  // プログレスバーのクリック処理
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration > 0 && !isDragging && isFinite(duration) && !isNaN(duration)) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(
        0,
        Math.min(100, (clickX / rect.width) * 100)
      );
      const newTime = (percentage / 100) * duration;

      // 計算結果の安全性チェック
      if (isNaN(newTime) || !isFinite(newTime) || newTime < 0) {
        return;
      }

      seekTo(newTime);
    }
  };

  // ドラッグ開始
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragValue(progressPercentage);

      let currentDragValue = progressPercentage;

      const handleMouseMove = (e: MouseEvent) => {
        if (progressBarRef.current && duration > 0) {
          const rect = progressBarRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
          currentDragValue = percentage;
          setDragValue(percentage);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        if (duration > 0 && isFinite(duration) && !isNaN(duration)) {
          const newTime = (currentDragValue / 100) * duration;

          // 計算結果の安全性チェック
          if (isNaN(newTime) || !isFinite(newTime) || newTime < 0) {
          } else {
            seekTo(newTime);
          }
        }
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [progressPercentage, duration, seekTo]
  );

  // タッチイベント対応
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragValue(progressPercentage);

      let currentDragValue = progressPercentage;

      const handleTouchMove = (e: TouchEvent) => {
        if (progressBarRef.current && duration > 0 && e.touches[0]) {
          const rect = progressBarRef.current.getBoundingClientRect();
          const x = e.touches[0].clientX - rect.left;
          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
          currentDragValue = percentage;
          setDragValue(percentage);
        }
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        if (duration > 0 && isFinite(duration) && !isNaN(duration)) {
          const newTime = (currentDragValue / 100) * duration;

          // 計算結果の安全性チェック
          if (isNaN(newTime) || !isFinite(newTime) || newTime < 0) {
          } else {
            seekTo(newTime);
          }
        }
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    },
    [progressPercentage, duration, seekTo]
  );

  // キーボード操作
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (duration <= 0 || !isFinite(duration) || isNaN(duration)) return;
      if (!isFinite(currentTime) || isNaN(currentTime)) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          const backTime = Math.max(0, currentTime - 10);
          if (isFinite(backTime) && !isNaN(backTime)) {
            seekTo(backTime); // 10秒戻る
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          const forwardTime = Math.min(duration, currentTime + 10);
          if (isFinite(forwardTime) && !isNaN(forwardTime)) {
            seekTo(forwardTime); // 10秒進む
          }
          break;
        case "Home":
          e.preventDefault();
          seekTo(0); // 最初に戻る
          break;
        case "End":
          e.preventDefault();
          const endTime = duration - 1;
          if (isFinite(endTime) && !isNaN(endTime) && endTime > 0) {
            seekTo(endTime); // 最後に移動
          }
          break;
      }
    },
    [duration, currentTime, seekTo]
  );

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // 音声が再生中でない場合は表示しない
  if (!currentNews) {
    return null;
  }

  const playlist = getIntegratedPlaylist();
  const currentIndex = playlist.findIndex(
    (item) => item.id === currentNews?.id
  );
  const canPlayPrevious = currentIndex > 0;
  const canPlayNext = currentIndex < playlist.length - 1;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 backdrop-blur-md shadow-xl z-[10] prevent-horizontal-scroll"
      style={{
        background:
          "linear-gradient(to right, rgba(179, 105, 143, 0.2), rgba(179, 105, 143, 0.15), rgba(179, 105, 143, 0.2))",
        borderTopColor: "rgba(179, 105, 143, 0.3)",
        borderTopWidth: "1px",
        borderTopStyle: "solid",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-4 pt-3 pb-6 sm:pb-3 ">
        {/* レスポンシブ：モバイルのみタイトル部分を上段に表示 */}
        <div className="block sm:hidden mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-accent flex-shrink-0" />
            <h3 className="font-medium text-foreground text-sm truncate">
              {currentNews.title}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground truncate ml-6">
            {currentNews.date}
          </p>
          {error && <p className="text-xs text-red-500 mt-1 ml-6">{error}</p>}
        </div>

        {/* メイン情報とコントロール */}
        <div className="flex items-center gap-4 mb-3">
          {/* ニュース情報（デスクトップのみ） */}
          <div className="flex-1 min-w-0 hidden sm:block">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-4 h-4 text-accent flex-shrink-0" />
              <h3 className="font-medium text-foreground text-sm truncate">
                {currentNews.title}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {currentNews.date}
            </p>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* モバイル用：コントロールエリア（右寄せ） */}
          <div className="flex items-center gap-4 sm:hidden ml-auto">
            {/* 再生コントロール */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playPrevious()}
                disabled={!canPlayPrevious}
                className="w-8 h-8 p-0"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                onClick={handlePlayPause}
                disabled={isLoading}
                size="sm"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary hover:from-accent/90 hover:to-primary/90"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={stop}
                className="w-8 h-8 p-0"
              >
                <Square className="w-3 h-3 fill-current" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => playNext()}
                disabled={!canPlayNext}
                className="w-8 h-8 p-0"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* 再生速度 */}
            <div className="flex items-center gap-2">
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {PLAYBACK_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}x
                  </option>
                ))}
              </select>
            </div>

            {/* 時間表示 */}
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTime(
                isDragging ? (dragValue / 100) * duration : currentTime
              )}{" "}
              / {formatTime(duration)}
            </div>
          </div>

          {/* デスクトップ用：従来のレイアウト */}
          <div className="hidden sm:flex items-center gap-4">
            {/* 再生コントロール */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playPrevious()}
                disabled={!canPlayPrevious}
                className="w-8 h-8 p-0"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                onClick={handlePlayPause}
                disabled={isLoading}
                size="sm"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary hover:from-accent/90 hover:to-primary/90"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={stop}
                className="w-8 h-8 p-0"
              >
                <Square className="w-3 h-3 fill-current" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => playNext()}
                disabled={!canPlayNext}
                className="w-8 h-8 p-0"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* 再生速度 */}
            <div className="flex items-center gap-2">
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {PLAYBACK_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}x
                  </option>
                ))}
              </select>
            </div>

            {/* 時間表示 */}
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTime(
                isDragging ? (dragValue / 100) * duration : currentTime
              )}{" "}
              / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="relative pt-3 sm:pt-0" ref={progressBarRef}>
          <div
            className="w-full bg-muted rounded-full h-2 cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className={`h-full bg-gradient-to-r from-accent to-primary transition-all ease-out ${
                isDragging ? "duration-0" : "duration-100"
              }`}
              style={{ width: `${displayPercentage}%` }}
            />
          </div>

          {/* プログレスハンドル */}
          <div
            className={`absolute top-4 sm:top-1/2 transform -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-all ease-out select-none ${
              isDragging
                ? "scale-125 duration-0"
                : "duration-100 hover:scale-110"
            }`}
            style={{
              left: `calc(${displayPercentage}% - 8px)`,
              opacity: displayPercentage > 0 || isDragging ? 1 : 0,
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onKeyDown={handleKeyDown}
            role="slider"
            aria-label="再生位置（矢印キー：10秒移動、Home/End：最初/最後）"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={
              isDragging ? (dragValue / 100) * duration : currentTime
            }
            tabIndex={0}
          />
        </div>
      </div>
    </div>
  );
}
