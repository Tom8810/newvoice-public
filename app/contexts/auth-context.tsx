"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Amplify } from "aws-amplify";
import {
  signOut,
  AuthUser,
  fetchUserAttributes,
  updateUserAttributes,
  deleteUser,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
import { amplifyConfig } from "@/app/lib/amplify-config";

// Configure Amplify
Amplify.configure(amplifyConfig);

interface UserInfo {
  email: string;
  name?: string;
  plan?: string;
  plan_expire_date?: string;
  vip_start_from?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  userInfo: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isRefreshingRef = useRef(false);
  const isSigningOutRef = useRef(false);

  const refreshUser = useCallback(async (retryCount = 0) => {
    if (isRefreshingRef.current) {
      return;
    }

    if (isSigningOutRef.current) {
      return;
    }

    const maxRetries = 3;

    try {
      isRefreshingRef.current = true;
      setIsLoading(true);

      // getCurrentUserとfetchUserAttributesを順次実行（安定性優先）
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      // メールアドレスがない場合は認証が不完全
      if (!attributes.email) {
        throw new Error(
          "Email attribute not found - user may not be fully authenticated"
        );
      }

      // userAttributesからユーザー情報を構築
      // サインアップ直後はカスタム属性が未設定の場合があるのでデフォルト値を使用
      const userInfo: UserInfo = {
        email: attributes.email,
        name: attributes["custom:name"],
        plan: attributes["custom:plan"] || "free", // デフォルトはfree
        plan_expire_date: attributes["custom:plan_expire_date"],
        vip_start_from: attributes["custom:vip_start_from"],
      };
      setUserInfo(userInfo);

      // currentUserを使用してAuthUserオブジェクトを作成
      const user: AuthUser = {
        username: currentUser.username,
        userId: currentUser.userId,
        signInDetails: currentUser.signInDetails || {
          loginId: attributes.email,
          authFlowType: "USER_SRP_AUTH",
        },
      };
      setUser(user);
    } catch (error: unknown) {
      // UserUnAuthenticatedException の場合もリトライする
      if (retryCount < maxRetries) {
        // リトライのためにフラグを一時的にリセット
        isRefreshingRef.current = false;

        // リトライ中はローディング状態を一時的に解除してUIをブロックしない
        setIsLoading(false);

        // 指数バックオフで再試行
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retryCount) * 300)
        );
        return refreshUser(retryCount + 1);
      } else {
        // 最大リトライ回数に達した場合のみ未認証状態に設定
        const errorName = error instanceof Error ? error.name : "";
        const errorMessage = error instanceof Error ? error.message : "";

        if (
          errorName === "UserUnAuthenticatedException" ||
          errorName === "NotAuthorizedException" ||
          errorMessage?.includes("not authenticated")
        ) {
          setUser(null);
          setUserInfo(null);
          return;
        } else {
          // その他のエラーの場合もリトライ上限で未認証扱い
          setUser(null);
          setUserInfo(null);
        }
      }
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      isSigningOutRef.current = true;

      await signOut();
      setUser(null);
      setUserInfo(null);

      // 認証関連のlocalStorageをクリア（ログアウト後の不要な認証処理を防ぐ）
      if (typeof window !== "undefined") {
        localStorage.removeItem("amplify_auth_success");
        localStorage.removeItem("amplify_auth_error");
      }
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      isSigningOutRef.current = false;
    }
  };

  const updateUserName = async (name: string) => {
    try {
      await updateUserAttributes({
        userAttributes: {
          "custom:name": name,
        },
      });

      // ローカル状態を更新
      setUserInfo((prev) => (prev ? { ...prev, name } : null));
    } catch (error) {
      console.error("Error updating user name:", error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      // アクティブなサブスクリプションを解除
      if (userInfo?.plan === "vip") {
        const session = await fetchAuthSession();

        if (!session.tokens?.idToken) {
          throw new Error(
            "認証トークンの取得に失敗しました。アカウント削除を中止します。"
          );
        }

        const response = await fetch("/api/stripe/cancel-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.tokens.idToken}`,
          },
          body: JSON.stringify({
            immediate: true, // 即座に解約
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `サブスクリプションの解除に失敗しました: ${errorText}`
          );
        }
      }

      // DynamoDBに削除レコードを記録
      if (userInfo?.email) {
        try {
          const response = await fetch("/api/account/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: userInfo.email,
            }),
          });

          if (!response.ok) {
            console.error("Failed to record account deletion in DynamoDB");
          }
        } catch (dbError) {
          console.error(
            "Error recording account deletion in DynamoDB:",
            dbError
          );
          // DynamoDBの記録に失敗してもアカウント削除は継続
        }
      }

      // Cognitoからユーザーを削除
      await deleteUser();

      // 状態をクリア
      setUser(null);
      setUserInfo(null);

      // 強制的にホームページにリダイレクト（ログアウト状態）
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // ログアウト処理中は初期化を行わない
      if (isSigningOutRef.current) {
        return;
      }

      if (
        typeof window !== "undefined" &&
        window.location.pathname === "/auth/callback"
      ) {
        try {
          // サインアップ・ログイン共通でセッション確立を実行
          const { fetchAuthSession } = await import("aws-amplify/auth");
          await fetchAuthSession(); // code→token の交換を実行

          await refreshUser();
        } catch (err) {
          console.error("Failed to establish session at callback:", err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // localStorageから認証状態をチェック
      if (typeof window !== "undefined") {
        const authSuccess = localStorage.getItem("amplify_auth_success");
        const authError = localStorage.getItem("amplify_auth_error");
        const isSignup = localStorage.getItem("amplify_auth_signup");

        // 認証処理が完了した場合
        if (authSuccess) {
          // フラグをクリア
          localStorage.removeItem("amplify_auth_success");
          localStorage.removeItem("amplify_auth_error");
          localStorage.removeItem("amplify_auth_signup");

          if (isSignup) {
            // サインアップの場合: /auth/callbackで既にセッション確立済みなので、refreshUserのみ実行
            if (!isSigningOutRef.current) {
              refreshUser();
            }
          } else {
            // 通常ログインの場合: 既存の動作を維持
            await new Promise((resolve) => setTimeout(resolve, 1500));
            if (!isSigningOutRef.current) {
              refreshUser();
            }
          }
          return;
        }

        // エラーがある場合はクリアして通常処理
        if (authError) {
          localStorage.removeItem("amplify_auth_success");
          localStorage.removeItem("amplify_auth_error");
        }
      }

      // 通常の認証状態確認
      if (!isSigningOutRef.current) {
        refreshUser();
      }
    };

    initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // フォーカスイベントをリッスン（localStorageベースの認証状態チェック）
  useEffect(() => {
    const handleFocus = () => {
      if (isSigningOutRef.current) {
        return;
      }
      if (typeof window !== "undefined") {
        // localStorageベースの認証状態チェック
        const authSuccess = localStorage.getItem("amplify_auth_success");

        if (authSuccess) {
          // フラグをクリア
          localStorage.removeItem("amplify_auth_success");
          localStorage.removeItem("amplify_auth_error");

          refreshUser();
          return;
        }

        // ブラウザの戻るボタン等で認証状態が不整合になった場合の検出
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthParams = urlParams.get("code") && urlParams.get("state");
        if (hasAuthParams && window.location.pathname === "/") {
          refreshUser();
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);

      return () => {
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue: AuthContextType = {
    user,
    userInfo,
    isLoading,
    isAuthenticated: !!user,
    signOut: handleSignOut,
    refreshUser,
    updateUserName,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
