"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("ログイン処理中...");
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);

        const code = urlParams.get("code");
        const error = urlParams.get("error");

        if (error) {
          throw new Error(`Authentication error: ${error}`);
        }

        if (code) {
          setStatus("アカウント情報を確認中...");

          try {
            // Amplifyに認証処理を委ねる（標準的な方法）
            // 認証セッション確立を確実に行う
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
              try {
                await fetchAuthSession({ forceRefresh: true });
                break;
              } catch (sessionError) {
                retryCount++;
                if (retryCount >= maxRetries) {
                  throw sessionError;
                }
                // 少し待ってリトライ
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            }

            // サインアップかログインかを判別してフラグを設定
            const urlParams = new URLSearchParams(window.location.search);
            const state = urlParams.get("state");
            const isSignup =
              state?.includes("signup") ||
              window.location.search.includes("signup");

            localStorage.setItem("amplify_auth_success", "true");
            if (isSignup) {
              localStorage.setItem("amplify_auth_signup", "true");
            }
            setStatus("ログイン完了！NewVoiceへようこそ");
          } catch (error) {
            console.error("Auth session error:", error);
            localStorage.setItem("amplify_auth_error", "true");
            setStatus("ログイン処理でエラーが発生しました");
          }

          // 認証セッション確立を待ってからリダイレクト
          setTimeout(() => {
            setShouldRedirect(true);
          }, 2000);
          return;
        } else {
          throw new Error("認証コードが見つかりません");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setStatus(`エラーが発生しました: ${errorMessage}`);

        // エラーの場合は少し待ってからリダイレクト
        setTimeout(() => {
          router.push("/");
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

  // リダイレクト処理用のuseEffect
  useEffect(() => {
    if (shouldRedirect) {
      // シンプルにホームページにリダイレクト
      const timer = setTimeout(() => {
        window.location.replace("/");
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [shouldRedirect, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background fixed inset-0 z-50">
      <div className="text-center max-w-md">
        <div
          className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"
          aria-hidden="true"
        ></div>
        <p className="text-muted-foreground text-lg">{status}</p>
        <span className="sr-only">少々お待ちください。</span>
      </div>
    </div>
  );
}
