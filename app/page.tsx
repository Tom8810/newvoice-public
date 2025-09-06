"use client";

import { useEffect, useState } from "react";
import { Volume2, Calendar } from "lucide-react";
import { NewsCard } from "./components/news-card";
import { LoginButton } from "./components/auth/login-button";
import { UserMenu } from "./components/auth/user-menu";
import { TermsModal } from "./components/modals/terms-modal";
import { ContactModal } from "./components/modals/contact-modal";
import { useAuth } from "./contexts/auth-context";
import { useAudioPlayer } from "./contexts/audio-player-context";
import { generateNewsData, type NewsItem } from "./lib/news-generator";

export default function HomePage() {
  const { setNewsList, currentNews } = useAudioPlayer();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallbackPage, setIsCallbackPage] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    // コールバックページかどうかを判定
    if (typeof window !== "undefined") {
      setIsCallbackPage(window.location.pathname === "/auth/callback");

      // 認証コードがある場合は強制的にコールバックページにリダイレクト
      const urlParams = new URLSearchParams(window.location.search);
      const hasAuthCode = urlParams.get("code") && urlParams.get("state");
      if (hasAuthCode && window.location.pathname === "/") {
        window.location.href = "/auth/callback" + window.location.search;
        return;
      }
    }
  }, []);

  useEffect(() => {
    // コールバックページではニュースデータを読み込まない
    if (isCallbackPage) {
      return;
    }

    const loadNewsData = async () => {
      try {
        setIsLoading(true);
        const data = await generateNewsData();
        setNewsData(data);
        setNewsList(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNewsData();
  }, [setNewsList, isCallbackPage]);

  // コールバックページの場合は何も表示しない（コールバックページ自体が表示される）
  if (isCallbackPage) {
    return null;
  }

  return (
    <div
      className={`min-h-screen bg-background prevent-horizontal-scroll ${
        currentNews ? "pb-40 sm:pb-20" : "pb-0"
      }`}
    >
      {/* ヘッダー */}
      <header
        className="border-b border-border bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 backdrop-blur-md fixed top-0 left-0 right-0 z-20 shadow-sm"
        style={{
          borderBottomColor: "rgba(179, 105, 143, 0.2)",
          background:
            "linear-gradient(to right, rgba(179, 105, 143, 0.1), rgba(179, 105, 143, 0.05), rgba(179, 105, 143, 0.1))",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-foreground">
                  NewVoice
                </h1>
              </div>
            </div>

            {/* 認証ボタン */}
            <div className="flex items-center gap-4">
              {authLoading ? (
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : isAuthenticated ? (
                <UserMenu />
              ) : (
                <LoginButton />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8 pt-36">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-accent" />
            <h2 className="font-display font-semibold text-xl text-foreground">
              今日のニュース&解説
            </h2>
          </div>
          <p className="text-muted-foreground">
            忙しい毎日に、流すだけでOK。探す手間なし、操作いらずで、厳選されたニュースと解説をお届けします。
          </p>
        </div>

        {/* ニュース一覧 */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span className="text-muted-foreground">
                  ニュースを読み込み中...
                </span>
                <span className="sr-only">
                  最新のニュースを読み込んでいます。しばらくお待ちください。
                </span>
              </div>
            </div>
          ) : newsData.length > 0 ? (
            newsData.map((news, index) => (
              <NewsCard key={news.id} news={news} isTopNews={index === 0} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                ニュースデータの取得に失敗しました。
              </p>
            </div>
          )}
        </div>
      </main>

      {/* フッター */}
      <footer
        className="border-t border-border backdrop-blur-sm mt-8"
        style={{
          borderTopColor: "rgba(179, 105, 143, 0.2)",
          backgroundColor: "rgba(179, 105, 143, 0.05)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-2 text-center text-muted-foreground text-sm">
            <p>© 2025 NewVoice, All rights preserved.</p>
            <p>コンテンツの作成にはAIを利用しています。</p>
            {isAuthenticated && (
              <div className="flex justify-center gap-6 mt-4">
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="hover:text-accent transition-colors underline"
                >
                  利用規約
                </button>
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="hover:text-accent transition-colors underline"
                >
                  プライバシーポリシー
                </button>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="hover:text-accent transition-colors underline"
                >
                  お問い合わせ
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        type="terms"
      />

      {/* Privacy Modal */}
      <TermsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        type="privacy"
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  );
}
