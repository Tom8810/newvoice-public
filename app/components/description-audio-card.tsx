"use client";

import { Play, Pause, Lightbulb, GraduationCap, Crown } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import {
  useAudioPlayer,
  type NewsItem,
} from "@/app/contexts/audio-player-context";
import { useAuth } from "@/app/contexts/auth-context";
import { useToast } from "@/app/contexts/toast-context";

interface DescriptionAudioCardProps {
  news: NewsItem;
  descriptionAudioUrl: string;
  descriptionTitle?: string;
  descriptionDuration?: string;
  exactDurationSeconds?: number;
  canPlay?: boolean;
}

export function DescriptionAudioCard({
  news,
  descriptionAudioUrl,
  descriptionTitle,
  descriptionDuration = "未取得",
  exactDurationSeconds,
  canPlay = true,
}: DescriptionAudioCardProps) {
  const {
    currentNews,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    isPlayingClickSound,
    clickSoundNewsId,
    nextNewsId,
    playNewsWithClick,
    play,
    pause,
  } = useAudioPlayer();

  const { isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const descriptionNews: NewsItem = {
    ...news,
    id: `${news.id}_description`,
    title: descriptionTitle || "解説音声タイトル取得中...",
    audioUrl: descriptionAudioUrl,
    duration: descriptionDuration,
    exactDurationSeconds: exactDurationSeconds,
  };

  const isCurrentNews = currentNews?.id === descriptionNews.id;
  const isThisPlaying = isCurrentNews && isPlaying;
  const isThisLoading = isCurrentNews && isLoading;
  const isThisLoadingClick =
    isPlayingClickSound && clickSoundNewsId === descriptionNews.id;
  const isNextNews = nextNewsId === descriptionNews.id;

  const showLoadingState = isThisLoadingClick || isThisLoading || isNextNews;

  const togglePlay = async () => {
    if (showLoadingState) return;

    // 認証ローディング中の場合は何もしない
    if (authLoading) return;

    // アクセス制限チェック
    if (!canPlay) {
      showToast(
        "解説音声はVIPプラン限定です",
        "warning", 
        "VIP限定コンテンツ"
      );
      return;
    }

    if (isCurrentNews) {
      if (isPlaying) {
        pause();
      } else {
        await play();
      }
    } else {
      await playNewsWithClick(descriptionNews);
    }
  };

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
    isCurrentNews &&
    duration > 0 &&
    !isNaN(duration) &&
    !isNaN(currentTime) &&
    isFinite(duration) &&
    isFinite(currentTime)
      ? (currentTime / duration) * 100
      : 0;

  return (
    <Card
      className={`group transition-all duration-300 border-accent/60 border-2 bg-gradient-to-br from-accent/20 via-primary/15 to-accent/25 dark:from-accent/25 dark:via-primary/20 dark:to-accent/30 shadow-lg shadow-accent/30 ${
        isCurrentNews
          ? "shadow-2xl shadow-primary/60 border-primary dark:shadow-2xl dark:shadow-primary/50 dark:border-accent"
          : "hover:shadow-xl hover:shadow-accent/40 hover:border-accent/80 dark:hover:border-accent/80 dark:hover:shadow-xl dark:hover:shadow-accent/40"
      }`}
    >
      <CardContent className="p-4 relative overflow-hidden">
        {/* アクティブ時の追加グロー効果 */}
        {/* 常時適用される立体感エフェクト */}
        <div className="absolute -inset-2 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 blur-md -z-30" />
        <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-transparent via-transparent to-white/5 -z-20" />

        {isCurrentNews && (
          <>
            <div className="absolute -inset-4 rounded-xl bg-accent/15 blur-lg -z-20" />
            <div className="absolute -inset-2 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 blur-md -z-10" />
          </>
        )}

        {/* 背景装飾 - 学習テーマの装飾 */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/30 via-accent/20 to-transparent rounded-full -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-accent/25 via-primary/15 to-transparent rounded-full -ml-8 -mb-8" />
        <div className="absolute top-1/2 right-4 w-6 h-6 bg-accent/20 rounded-full transform -translate-y-1/2" />
        <div className="absolute bottom-4 right-1/3 w-4 h-4 bg-primary/25 rounded-full" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-accent via-primary to-accent items-center justify-center shadow-lg ring-2 ring-accent/20 hidden sm:flex">
              <div className="relative">
                <Lightbulb className="w-5 h-5 text-white" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2">
                  <GraduationCap className="w-2 h-2 text-white/80" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-3 relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-accent dark:text-primary uppercase tracking-wide">
                    Learning Point
                  </span>
                  {!canPlay && (
                    <span className="text-xs bg-gradient-to-r from-accent to-primary text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Crown className="w-3 h-3" />
                      VIP限定
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-foreground dark:text-foreground leading-tight bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  {descriptionTitle ? `${descriptionTitle}` : "準備中..."}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            {/* プログレスと時間表示 */}
            <div className="flex-1 min-w-0 relative">
              <div className="w-full bg-gradient-to-r from-muted via-accent/10 to-muted rounded-full h-2 overflow-hidden mb-2 ring-1 ring-accent/20">
                <div
                  className="h-full bg-gradient-to-r from-accent via-primary to-accent transition-all duration-300 ease-out shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-accent/80 dark:text-primary/80 font-medium">
                <span>{isCurrentNews ? formatTime(currentTime) : "0:00"}</span>
                <span>
                  {isCurrentNews && duration > 0
                    ? formatTime(duration)
                    : descriptionDuration}
                </span>
              </div>
              
              {/* 制限オーバーレイ */}
              {!canPlay && (
                <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg">
                  <div className="bg-gradient-to-br from-white/95 to-white/90 border border-accent/20 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-accent">VIP限定</p>
                    </div>
                    <p className="text-xs text-gray-600 text-center">
                      VIPプランが必要です
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 再生ボタン */}
            <div className="flex-shrink-0">
              <Button
                onClick={togglePlay}
                disabled={showLoadingState || !canPlay || authLoading}
                size="sm"
                className={`relative w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary shadow-lg transition-all duration-300 group-hover:scale-105 ${
                  showLoadingState || !canPlay || authLoading
                    ? "cursor-not-allowed opacity-40"
                    : "hover:from-accent/90 hover:to-primary/90 hover:shadow-xl hover:!scale-110 hover:!shadow-2xl"
                }`}
              >
                {/* バックグラウンドのブラー効果 */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

                {/* オーバーレイ */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent z-0" />

                {/* アイコン（最前面） */}
                <div className="relative z-10">
                  {showLoadingState ? (
                    /* 洗練されたローディングインジケータ */
                    <div className="relative w-6 h-6">
                      {/* 外側のリング */}
                      <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                      {/* 回転するアクセントリング */}
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                      {/* 中央の小さなドット */}
                      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                    </div>
                  ) : isThisPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  )}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
