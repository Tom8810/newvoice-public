"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { NewsItem } from "../lib/news-generator";
import { useAuth } from "./auth-context";

export type { NewsItem } from "../lib/news-generator";

interface AudioPlayerState {
  currentNews: NewsItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLoading: boolean;
  isPlayingClickSound: boolean;
  clickSoundNewsId: string | null;
  error: string | null;
  nextNewsId: string | null; // 次に自動再生予定のアイテムID（ニュース or 解説）
}

interface AudioPlayerActions {
  playNews: (news: NewsItem, autoPlay?: boolean) => void;
  playNewsWithClick: (news: NewsItem) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
}

// 解説音声の情報
export interface DescriptionAudioInfo {
  newsId: string;
  title?: string;
  duration?: string;
  exactDurationSeconds?: number;
  audioUrl: string;
}

type AudioPlayerContextType = AudioPlayerState &
  AudioPlayerActions & {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    newsList: NewsItem[];
    setNewsList: (news: NewsItem[]) => void;
    descriptionAudioList: DescriptionAudioInfo[];
    setDescriptionAudioList: (
      descriptions:
        | DescriptionAudioInfo[]
        | ((prev: DescriptionAudioInfo[]) => DescriptionAudioInfo[])
    ) => void;
  };

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

interface AudioPlayerProviderProps {
  children: ReactNode;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [descriptionAudioList, setDescriptionAudioList] = useState<
    DescriptionAudioInfo[]
  >([]);

  const { isAuthenticated, userInfo } = useAuth();

  // アクセス制限検証関数
  const canPlayAudio = useCallback(
    (news: NewsItem): boolean => {
      const isVIPPlan = userInfo?.plan === "vip";
      const isVIPTrialPlan = userInfo?.plan === "vip-trial";
      const isFreePlan =
        isAuthenticated && (!userInfo?.plan || userInfo?.plan === "free");
      const isGuestUser = !isAuthenticated;

      // 解説音声かどうかを判定（IDに_descriptionが含まれる）
      const isDescriptionAudio = news.id.includes("_description");

      if (isDescriptionAudio) {
        // 解説音声はVIPプランのみ
        return isVIPPlan || isVIPTrialPlan;
      }

      // 通常のニュース音声
      if (isGuestUser) {
        // 未ログインは一番上のニュースのみ（newsList[0]との比較が必要）
        const topNewsId = newsList.length > 0 ? newsList[0].id : null;
        return news.id === topNewsId;
      }

      // ログイン済みは全てのニュース再生可能
      return isFreePlan || isVIPPlan || isVIPTrialPlan;
    },
    [isAuthenticated, userInfo, newsList]
  );

  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingAbortRef = useRef<(() => void) | null>(null);
  const downloadedAudioCache = useRef<Map<string, string>>(new Map()); // URL -> Blob URL のキャッシュ

  // モバイル判定
  const isMobile = useCallback(() => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (typeof window !== "undefined" && window.innerWidth <= 768)
    );
  }, []);

  // 音声ファイルをダウンロードする関数
  const downloadAudioFile = useCallback(
    async (url: string): Promise<string> => {
      // キャッシュをチェック
      if (downloadedAudioCache.current.has(url)) {
        return downloadedAudioCache.current.get(url)!;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
        const blobUrl = URL.createObjectURL(blob);

        // キャッシュに保存
        downloadedAudioCache.current.set(url, blobUrl);

        return blobUrl;
      } catch (error) {
        console.error("Audio download failed:", error);
        throw error;
      }
    },
    []
  );

  const [state, setState] = useState<AudioPlayerState>({
    currentNews: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    isLoading: false,
    isPlayingClickSound: false,
    clickSoundNewsId: null,
    error: null,
    nextNewsId: null,
  });

  // 再生順序を統合したリストを生成（ニュース→解説の順）
  const getIntegratedPlaylist = useCallback((): NewsItem[] => {
    const playlist: NewsItem[] = [];

    newsList.forEach((news) => {
      // 1. ニュース音声を追加
      playlist.push(news);

      // 2. 対応する解説音声があれば追加
      const description = descriptionAudioList.find(
        (desc) => desc.newsId === news.id
      );
      if (description) {
        const descriptionNews: NewsItem = {
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

  const playClickSound = useCallback((newsId: string) => {
    return new Promise<void>((resolve) => {
      // クリック音の状態を設定
      setState((prev) => ({
        ...prev,
        isPlayingClickSound: true,
        clickSoundNewsId: newsId,
      }));

      const clickAudio = new Audio("/click.mp3");
      clickAudio.volume = 0.3; // 控えめな音量

      const handleEnd = () => {
        clickAudio.removeEventListener("ended", handleEnd);
        clickAudio.removeEventListener("error", handleError);
        // クリック音再生完了
        setState((prev) => ({
          ...prev,
          isPlayingClickSound: false,
          clickSoundNewsId: null,
        }));
        resolve();
      };

      const handleError = () => {
        clickAudio.removeEventListener("ended", handleEnd);
        clickAudio.removeEventListener("error", handleError);
        // エラーでもクリック音状態をリセット
        setState((prev) => ({
          ...prev,
          isPlayingClickSound: false,
          clickSoundNewsId: null,
        }));
        resolve(); // エラーでも続行
      };

      clickAudio.addEventListener("ended", handleEnd);
      clickAudio.addEventListener("error", handleError);

      clickAudio.play().catch(() => {
        // 自動再生ポリシーで失敗した場合もそのまま続行
        handleError();
      });
    });
  }, []);

  const playNews = useCallback(
    async (news: NewsItem, autoPlay = false) => {
      // 既存の処理をキャンセル
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
      if (loadingAbortRef.current) {
        loadingAbortRef.current();
        loadingAbortRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        currentNews: news,
        isPlaying: false,
        currentTime: 0,
        error: null,
        isLoading: autoPlay,
        nextNewsId: null, // 自動遷移のローディング状態をリセット
      }));

      if (audioRef.current) {
        const audio = audioRef.current;

        // 自動再生の場合のみ音声データを取得
        if (autoPlay) {
          let audioSrc = news.audioUrl;

          try {
            // モバイルの場合は事前ダウンロード
            if (isMobile()) {
              audioSrc = await downloadAudioFile(news.audioUrl);
            }

            let isAborted = false;

            const handleCanPlay = async () => {
              if (isAborted) return;

              try {
                await audio.play();
                if (!isAborted) {
                  setState((prev) => ({
                    ...prev,
                    isPlaying: true,
                    isLoading: false,
                  }));
                  loadingAbortRef.current = null;
                }
              } catch (error) {
                console.error(error);
                if (!isAborted) {
                  const errorMessage = "オーディオの再生に失敗しました";
                  setState((prev) => ({
                    ...prev,
                    isPlaying: false,
                    isLoading: false,
                    error: errorMessage,
                  }));
                  loadingAbortRef.current = null;
                  
                  // トーストでエラーを表示
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("showToast", {
                        detail: { 
                          message: "音声の再生ができませんでした。ネットワーク接続を確認してください。", 
                          type: "error", 
                          title: "再生エラー" 
                        },
                      })
                    );
                  }
                }
              }
            };

            // アボート関数を設定
            loadingAbortRef.current = () => {
              isAborted = true;
              audio.removeEventListener("canplay", handleCanPlay);
            };

            audio.addEventListener("canplay", handleCanPlay, { once: true });
            audio.src = audioSrc;
            audio.load();
          } catch (error) {
            console.error("Failed to load audio:", error);
            const errorMessage = "音声の読み込みに失敗しました";
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: errorMessage,
            }));
            
            // トーストでエラーを表示
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("showToast", {
                  detail: { 
                    message: "ネットワーク接続を確認してください。", 
                    type: "error", 
                    title: "音声読み込みエラー" 
                  },
                })
              );
            }
          }
        } else {
          // autoPlay=falseの場合は音声データを取得せず、preload="metadata"を設定するだけ
          audio.removeAttribute("src");
          audio.load();
        }
      }
    },
    [downloadAudioFile, isMobile]
  );

  const playNewsWithClick = useCallback(
    async (news: NewsItem) => {
      // アクセス制限チェック
      if (!canPlayAudio(news)) {
        const isDescriptionAudio = news.id.includes("_description");
        const isGuestUser = !isAuthenticated;

        // カスタムイベントでトーストを表示
        const message = isDescriptionAudio
          ? "解説音声はVIPプラン限定です"
          : isGuestUser
          ? "この音声を聞くにはログインが必要です"
          : "このコンテンツはVIPプラン限定です";

        const title = isDescriptionAudio
          ? "VIP限定コンテンツ"
          : isGuestUser
          ? "ログインが必要です"
          : "VIP限定コンテンツ";

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("showToast", {
              detail: { message, type: "warning", title },
            })
          );
        }
        return;
      }

      // 既存の処理をキャンセル（自動遷移のローディングもリセット）
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
      if (loadingAbortRef.current) {
        loadingAbortRef.current();
        loadingAbortRef.current = null;
      }

      // 現在の再生を即座に停止
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // 自動遷移のローディング状態を即座にリセット（時間表示もリセット）
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        nextNewsId: null,
      }));

      // クリック音を再生してからニュースを開始
      await playClickSound(news.id);

      // クリック音完了後、直接ニュースを読み込んで再生開始
      setState((prev) => ({
        ...prev,
        currentNews: news,
        currentTime: 0,
        duration: 0, // 新しい音声のdurationが設定されるまで0にリセット
        error: null,
        isLoading: true,
        nextNewsId: null, // 念のため再度リセット
        // クリック音状態は既にplayClickSoundでfalseに設定済み
      }));

      if (audioRef.current) {
        const audio = audioRef.current;
        audio.currentTime = 0; // audio要素の時間もリセット
        let audioSrc = news.audioUrl;

        try {
          // モバイルの場合は事前ダウンロード
          if (isMobile()) {
            audioSrc = await downloadAudioFile(news.audioUrl);
          }

          let isAborted = false;

          const handleCanPlay = async () => {
            if (isAborted) return;

            try {
              await audio.play();
              if (!isAborted) {
                setState((prev) => ({
                  ...prev,
                  isPlaying: true,
                  isLoading: false,
                }));
                loadingAbortRef.current = null;
              }
            } catch (error) {
              console.error(error);
              if (!isAborted) {
                setState((prev) => ({
                  ...prev,
                  isPlaying: false,
                  isLoading: false,
                  error: "オーディオの再生に失敗しました",
                }));
                loadingAbortRef.current = null;
              }
            }
          };

          // アボート関数を設定
          loadingAbortRef.current = () => {
            isAborted = true;
            audio.removeEventListener("canplay", handleCanPlay);
          };

          audio.addEventListener("canplay", handleCanPlay, { once: true });
          audio.src = audioSrc;
          audio.load();
        } catch (error) {
          console.error("Failed to load audio for click play:", error);
          const errorMessage = "音声の読み込みに失敗しました";
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
          
          // トーストでエラーを表示
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("showToast", {
                detail: { 
                  message: "ネットワーク接続を確認してください。", 
                  type: "error", 
                  title: "音声読み込みエラー" 
                },
              })
            );
          }
        }
      }
    },
    [playClickSound, downloadAudioFile, isMobile, canPlayAudio, isAuthenticated]
  );

  const play = useCallback(async () => {
    // 現在の音声に対するアクセス制限チェック
    if (state.currentNews && !canPlayAudio(state.currentNews)) {
      const isDescriptionAudio = state.currentNews.id.includes("_description");
      const isGuestUser = !isAuthenticated;

      // カスタムイベントでトーストを表示
      const message = isDescriptionAudio
        ? "解説音声はVIPプラン限定です"
        : isGuestUser
        ? "この音声を聞くにはログインが必要です"
        : "このコンテンツはVIPプラン限定です";

      const title = isDescriptionAudio
        ? "VIP限定コンテンツ"
        : isGuestUser
        ? "ログインが必要です"
        : "VIP限定コンテンツ";

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { message, type: "warning", title },
          })
        );
      }
      return;
    }

    // 既存の処理をキャンセル
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    if (loadingAbortRef.current) {
      loadingAbortRef.current();
      loadingAbortRef.current = null;
    }

    if (audioRef.current && state.currentNews) {
      const audio = audioRef.current;

      try {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
          nextNewsId: null,
        }));

        // 音声データがまだ読み込まれていない場合は取得する
        if (!audio.src || audio.src === window.location.href) {
          let audioSrc = state.currentNews.audioUrl;

          // モバイルの場合は事前ダウンロード
          if (isMobile()) {
            audioSrc = await downloadAudioFile(state.currentNews.audioUrl);
          }

          let isAborted = false;

          const handleCanPlay = async () => {
            if (isAborted) return;

            try {
              await audio.play();
              if (!isAborted) {
                setState((prev) => ({
                  ...prev,
                  isPlaying: true,
                  isLoading: false,
                }));
                loadingAbortRef.current = null;
              }
            } catch (error) {
              console.error(error);
              if (!isAborted) {
                const errorMessage = "オーディオの再生に失敗しました";
                setState((prev) => ({
                  ...prev,
                  isPlaying: false,
                  isLoading: false,
                  error: errorMessage,
                }));
                loadingAbortRef.current = null;
                
                // トーストでエラーを表示
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("showToast", {
                      detail: { 
                        message: "音声の再生ができませんでした。ネットワーク接続を確認してください。", 
                        type: "error", 
                        title: "再生エラー" 
                      },
                    })
                  );
                }
              }
            }
          };

          // アボート関数を設定
          loadingAbortRef.current = () => {
            isAborted = true;
            audio.removeEventListener("canplay", handleCanPlay);
          };

          audio.addEventListener("canplay", handleCanPlay, { once: true });
          audio.src = audioSrc;
          audio.load();
        } else {
          // 既に音声データが読み込まれている場合は直接再生
          await audio.play();
          setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
        }
      } catch (error) {
        console.error(error);
        const errorMessage = "オーディオの再生に失敗しました";
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isLoading: false,
          error: errorMessage,
        }));
        
        // トーストでエラーを表示
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("showToast", {
              detail: { 
                message: "音声の再生ができませんでした。ネットワーク接続を確認してください。", 
                type: "error", 
                title: "再生エラー" 
              },
            })
          );
        }
      }
    }
  }, [
    state.currentNews,
    canPlayAudio,
    isAuthenticated,
    downloadAudioFile,
    isMobile,
  ]);

  const pause = useCallback(() => {
    // 既存の処理をキャンセル
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    if (loadingAbortRef.current) {
      loadingAbortRef.current();
      loadingAbortRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        nextNewsId: null,
      }));
    }
  }, []);

  const stop = useCallback(() => {
    // 既存の処理をキャンセル
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    if (loadingAbortRef.current) {
      loadingAbortRef.current();
      loadingAbortRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        isLoading: false,
        nextNewsId: null,
      }));
    }
  }, []);

  const seekTo = useCallback(
    (time: number) => {
      // 既存の処理をキャンセル
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
      if (loadingAbortRef.current) {
        loadingAbortRef.current();
        loadingAbortRef.current = null;
      }

      if (audioRef.current && state.currentNews) {
        // 値の安全性をチェック
        if (isNaN(time) || !isFinite(time) || time < 0) {
          return;
        }

        // durationが有効でない場合は処理しない
        if (
          isNaN(state.duration) ||
          !isFinite(state.duration) ||
          state.duration <= 0
        ) {
          return;
        }

        // 時間をduration範囲内に制限
        const clampedTime = Math.max(0, Math.min(time, state.duration));

        try {
          audioRef.current.currentTime = clampedTime;
          setState((prev) => ({
            ...prev,
            currentTime: clampedTime,
            isLoading: false,
            nextNewsId: null,
          }));
        } catch (error) {
          console.error(error);
          // シークエラーは無視
        }
      }
    },
    [state.currentNews, state.duration]
  );

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setState((prev) => ({ ...prev, playbackRate: rate }));
    }
  }, []);

  const getCurrentIndex = useCallback(() => {
    const currentNews = state.currentNews;
    if (!currentNews) return -1;
    const playlist = getIntegratedPlaylist();
    return playlist.findIndex((news) => news.id === currentNews.id);
  }, [state.currentNews, getIntegratedPlaylist]);

  const playNext = useCallback(async () => {
    const playlist = getIntegratedPlaylist();
    const currentIndex = getCurrentIndex();
    if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
      const nextItem = playlist[currentIndex + 1];
      await playNewsWithClick(nextItem);
    } else {
    }
  }, [getCurrentIndex, getIntegratedPlaylist, playNewsWithClick]);

  const playPrevious = useCallback(async () => {
    const playlist = getIntegratedPlaylist();
    const currentIndex = getCurrentIndex();
    if (currentIndex > 0) {
      await playNewsWithClick(playlist[currentIndex - 1]);
    }
  }, [getCurrentIndex, getIntegratedPlaylist, playNewsWithClick]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      // currentTimeの安全性チェック
      if (isNaN(time) || !isFinite(time) || time < 0) {
        return;
      }
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      // 正確なdurationがメタデータにある場合はそれを使用、なければaudio要素のdurationを使用
      const exactDuration = state.currentNews?.exactDurationSeconds;
      const audioDuration = audioRef.current.duration;

      let finalDuration: number;

      // 正確なdurationが有効な値の場合
      if (
        exactDuration &&
        !isNaN(exactDuration) &&
        isFinite(exactDuration) &&
        exactDuration > 0
      ) {
        // audio要素のdurationも有効で、差が大きすぎない場合は正確な値を使用
        if (
          !isNaN(audioDuration) &&
          isFinite(audioDuration) &&
          Math.abs(exactDuration - audioDuration) < 5
        ) {
          finalDuration = exactDuration;
        } else if (
          !isNaN(audioDuration) &&
          isFinite(audioDuration) &&
          audioDuration > 0
        ) {
          // 差が大きい場合はaudio要素の値を使用
          finalDuration = audioDuration;
        } else {
          // audio要素の値が無効な場合はメタデータの値を使用
          finalDuration = exactDuration;
        }
      } else if (
        !isNaN(audioDuration) &&
        isFinite(audioDuration) &&
        audioDuration > 0
      ) {
        // メタデータがない場合はaudio要素の値を使用
        finalDuration = audioDuration;
      } else {
        // どちらも無効な場合はデフォルト値
        finalDuration = 300; // 5分
      }

      // 最終確認: durationが有効でない場合はデフォルト値
      if (
        isNaN(finalDuration) ||
        !isFinite(finalDuration) ||
        finalDuration <= 0
      ) {
        finalDuration = 300;
      }

      setState((prev) => ({ ...prev, duration: finalDuration }));
    }
  }, [state.currentNews]);

  const handleEnded = useCallback(() => {
    const playlist = getIntegratedPlaylist();
    const currentIndex = playlist.findIndex(
      (item) => item.id === state.currentNews?.id
    );
    const hasNext = currentIndex !== -1 && currentIndex < playlist.length - 1;
    const nextItem = hasNext ? playlist[currentIndex + 1] : null;

    setState((prev) => ({
      ...prev,
      isPlaying: false,
      nextNewsId: nextItem?.id || null,
    }));

    // 0.5秒後に自動的に次のアイテム（ニュース or 解説）を再生
    if (hasNext && nextItem) {
      autoPlayTimeoutRef.current = setTimeout(() => {
        autoPlayTimeoutRef.current = null;
        setState((prev) => ({ ...prev, nextNewsId: null }));
        playNewsWithClick(nextItem);
      }, 500);
    }
  }, [getIntegratedPlaylist, state.currentNews, playNewsWithClick]);

  const handleError = useCallback(() => {
    const errorMessage = "オーディオファイルの読み込みに失敗しました";
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      error: errorMessage,
    }));
    
    // トーストでエラーを表示
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("showToast", {
          detail: { 
            message: "音声ファイルの読み込みに失敗しました。ネットワーク接続を確認してください。", 
            type: "error", 
            title: "読み込みエラー" 
          },
        })
      );
    }
  }, []);

  const contextValue: AudioPlayerContextType = {
    ...state,
    audioRef,
    newsList,
    setNewsList,
    descriptionAudioList,
    setDescriptionAudioList,
    playNews,
    playNewsWithClick,
    play,
    pause,
    stop,
    seekTo,
    setPlaybackRate,
    playNext,
    playPrevious,
  };

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
        crossOrigin="anonymous"
      />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}

export { PLAYBACK_RATES };
