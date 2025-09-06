"use client";

import { Play, Pause, Star } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import {
  useAudioPlayer,
  type NewsItem,
  type DescriptionAudioInfo,
} from "@/app/contexts/audio-player-context";
import { ScrollingTitle } from "./scrolling-title";
import { DescriptionAudioCard } from "./description-audio-card";
import {
  getDescriptionAudioUrl,
  getDescriptionAudioFileNameFromNewsUrl,
} from "@/app/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/contexts/auth-context";
import { useToast } from "@/app/contexts/toast-context";

interface NewsCardProps {
  news: NewsItem;
  isTopNews?: boolean;
}

export function NewsCard({ news, isTopNews = false }: NewsCardProps) {
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
    setDescriptionAudioList,
  } = useAudioPlayer();

  const { isAuthenticated, userInfo, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  // プラン判定
  const isVIPPlan = userInfo?.plan === "vip";
  const isVIPTrialPlan = userInfo?.plan === "vip-trial";
  const isFreePlan =
    isAuthenticated && (!userInfo?.plan || userInfo?.plan === "free");
  const isGuestUser = !isAuthenticated;

  // アクセス制限判定（認証ローディング中は再生不可）
  const canPlayNews = !authLoading &&
    (isVIPPlan || isVIPTrialPlan || isFreePlan || (isGuestUser && isTopNews));
  const canPlayDescriptionAudio = !authLoading &&
    (isVIPPlan || isVIPTrialPlan) && isAuthenticated;

  const [hasDescriptionAudio, setHasDescriptionAudio] = useState(false);
  const [checkingDescription, setCheckingDescription] = useState(true);
  const [descriptionAudioData, setDescriptionAudioData] = useState<{
    exists: boolean;
    title?: string;
    duration?: string;
    exactDurationSeconds?: number;
  }>({ exists: false });

  // 解説音声の存在確認とメタデータ取得（1回のリクエストで統合）
  useEffect(() => {
    const checkDescription = async () => {
      try {
        setCheckingDescription(true);
        const descriptionFileName = getDescriptionAudioFileNameFromNewsUrl(
          news.audioUrl
        );
        
        let title: string | undefined;
        let duration: string | undefined;
        let exactDurationSeconds: number | undefined;
        let exists = false;

        // メタデータを取得して存在確認も兼ねる
        try {
          const metadataUrl = `/api/audio/metadata?filename=${encodeURIComponent(
            descriptionFileName
          )}&bucket=description`;
          const metadataResult = await fetch(metadataUrl)
            .then((response) => {
              if (response.ok) {
                exists = true; // レスポンスが成功なら存在する
                return response.json();
              }
              return null;
            })
            .catch((error) => {
              console.error("Description metadata fetch error:", error);
              return null;
            });

          if (metadataResult && exists) {
            if (
              metadataResult.duration &&
              metadataResult.durationSource === "metadata"
            ) {
              duration = metadataResult.duration;
              exactDurationSeconds = metadataResult.exactDurationSeconds;
            }

            if (
              metadataResult.customMetadata &&
              metadataResult.customMetadata.title
            ) {
              const titleValue = metadataResult.customMetadata.title;
              // Base64デコード処理（ニュースと同じ）
              if (titleValue.match(/^[A-Za-z0-9+/]+=*$/)) {
                try {
                  const binaryString = atob(titleValue);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  title = new TextDecoder("utf-8").decode(bytes);
                } catch {
                  title = titleValue;
                }
              } else {
                title = titleValue;
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch description metadata:", error);
          exists = false;
        }

        setDescriptionAudioData({
          exists,
          title,
          duration,
          exactDurationSeconds,
        });
        setHasDescriptionAudio(exists);

        // 解説音声が存在する場合、コンテキストに登録
        if (exists && title && duration) {
          const descriptionFileName = getDescriptionAudioFileNameFromNewsUrl(
            news.audioUrl
          );
          const descriptionUrl = getDescriptionAudioUrl(descriptionFileName);

          setDescriptionAudioList((prev: DescriptionAudioInfo[]) => {
            // 既に存在するかチェック
            const existingIndex = prev.findIndex(
              (desc) => desc.newsId === news.id
            );
            const newDescription: DescriptionAudioInfo = {
              newsId: news.id,
              title,
              duration,
              exactDurationSeconds,
              audioUrl: descriptionUrl,
            };

            if (existingIndex !== -1) {
              // 既存のものを更新
              const updated = [...prev];
              updated[existingIndex] = newDescription;
              return updated;
            } else {
              // 新しく追加
              const newList = [...prev, newDescription];
              return newList;
            }
          });
        } else {
          // 解説音声が存在しない場合は、既存の登録があれば削除
          setDescriptionAudioList((prev: DescriptionAudioInfo[]) =>
            prev.filter((desc) => desc.newsId !== news.id)
          );
        }
      } catch (error) {
        console.error("Description audio check failed:", error);
        setHasDescriptionAudio(false);
        setDescriptionAudioData({ exists: false });
      } finally {
        setCheckingDescription(false);
      }
    };

    checkDescription();
  }, [news.audioUrl, news.id, setDescriptionAudioList]);

  // 現在のニュースがこのカードのニュースかどうかを判定
  const isCurrentNews = currentNews?.id === news.id;
  const isThisPlaying = isCurrentNews && isPlaying;
  const isThisLoading = isCurrentNews && isLoading;
  const isThisLoadingClick =
    isPlayingClickSound && clickSoundNewsId === news.id;
  // 次に自動再生予定かどうか（ニュース自体のみ）
  const isNextNews = nextNewsId === news.id;

  // ボタンの表示状態を決定
  const showLoadingState = isThisLoadingClick || isThisLoading || isNextNews;

  const togglePlay = async () => {
    // ローディング中（クリック音またはニュース読み込み中）は何もしない
    if (showLoadingState) return;

    // 認証ローディング中の場合は何もしない
    if (authLoading) return;
    
    // アクセス制限チェック
    if (!canPlayNews) {
      // 制限されている場合の処理（ログインやプラン変更を促すモーダルなど）
      showToast(
        isGuestUser
          ? "この音声を聞くにはログインが必要です"
          : "このコンテンツはVIPプラン限定です",
        "warning",
        isGuestUser ? "ログインが必要です" : "VIP限定コンテンツ"
      );
      return;
    }

    if (isCurrentNews) {
      // 現在再生中のニュースの場合、再生/一時停止を切り替え（クリック音なし）
      if (isPlaying) {
        pause();
      } else {
        await play();
      }
    } else {
      // 異なるニュースの場合、クリック音を再生してから新しいニュースを開始
      await playNewsWithClick(news);
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

  // 現在のニュースの場合のみプログレス表示
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
      className={`group transition-all duration-300 border-border/50 ${
        isCurrentNews
          ? "shadow-2xl shadow-accent/70 border-accent border-2"
          : "hover:shadow-lg hover:border-accent/30"
      }`}
    >
      <CardContent className="p-6 relative">
        {/* アクティブ時の追加グロー効果 */}
        {isCurrentNews && (
          <>
            <div className="absolute -inset-6 rounded-2xl bg-accent/50 blur-xl -z-20" />
            <div className="absolute -inset-3 rounded-xl bg-gradient-to-br from-accent/60 to-primary/60 blur-lg -z-10" />
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 blur-sm -z-5" />
          </>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-3 font-medium tracking-wide">
              {news.date} 05:00
            </div>
            <div className="mb-6">
              <ScrollingTitle
                title={news.title}
                className={`font-display font-bold text-2xl text-foreground leading-tight ${
                  !canPlayNews && isGuestUser ? "blur select-none" : ""
                }`}
              />
            </div>

            {/* プログレスバー */}
            <div className="mb-4 relative">
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{isCurrentNews ? formatTime(currentTime) : "0:00"}</span>
                <span>
                  {isCurrentNews && duration > 0
                    ? formatTime(duration)
                    : news.duration}
                </span>
              </div>

              {/* 制限オーバーレイ */}
              {!canPlayNews && (
                <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg">
                  <div className="bg-gradient-to-br from-white/95 to-white/90 border border-accent/20 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <Star className="w-2.5 h-2.5 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-accent">
                        {isGuestUser ? "ログインして再生" : "VIP限定"}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 text-center">
                      {isGuestUser
                        ? "ログインが必要です"
                        : "VIPプランが必要です"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 再生ボタン */}
          <div className="flex-shrink-0">
            <Button
              onClick={togglePlay}
              disabled={showLoadingState || !canPlayNews || authLoading}
              size="lg"
              className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary shadow-lg transition-all duration-300 group-hover:scale-105 ${
                showLoadingState || !canPlayNews || authLoading
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

        {/* 解説音声カード */}
        {hasDescriptionAudio && !checkingDescription && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <DescriptionAudioCard
              news={news}
              descriptionAudioUrl={getDescriptionAudioUrl(
                getDescriptionAudioFileNameFromNewsUrl(news.audioUrl)
              )}
              descriptionTitle={descriptionAudioData.title}
              descriptionDuration={descriptionAudioData.duration}
              exactDurationSeconds={descriptionAudioData.exactDurationSeconds}
              canPlay={canPlayDescriptionAudio}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
