"use client";

import React, { useState, useEffect } from "react";
import { signInWithRedirect } from "aws-amplify/auth";
import { Button } from "@/app/components/ui/button";
import { UserCircle, X } from "lucide-react";
import { useAuth } from "@/app/contexts/auth-context";
import { AuthSelectionModal } from "./auth-selection-modal";
import { TermsConsentModal } from "./terms-consent-modal";
import { SignupInstructionModal } from "./signup-instruction-modal";

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className }: LoginButtonProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthSelection, setShowAuthSelection] = useState(false);
  const [showTermsConsent, setShowTermsConsent] = useState(false);
  const [showSignupInstruction, setShowSignupInstruction] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // ツールチップの表示管理
  useEffect(() => {
    // 認証状態のローディング中は表示しない
    if (!isLoading && !isAuthenticated) {
      const tooltipHidden = localStorage.getItem("vip-trial-tooltip-hidden");
      if (!tooltipHidden) {
        // 少し遅延を入れてスムーズに表示
        const timer = setTimeout(() => {
          setShowTooltip(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    } else {
      // 認証済みまたはローディング中は非表示
      setShowTooltip(false);
    }
  }, [isAuthenticated, isLoading]);

  const hideTooltip = () => {
    setShowTooltip(false);
    localStorage.setItem("vip-trial-tooltip-hidden", "true");
  };

  const closeTooltip = () => {
    setShowTooltip(false);
  };

  const handleButtonClick = () => {
    // 既にログイン済みの場合はリロード
    if (isAuthenticated) {
      window.location.reload();
      return;
    }

    setShowAuthSelection(true);
  };

  const handleLogin = async () => {
    try {
      await signInWithRedirect({
        options: {
          lang: "ja",
        },
      });
    } catch (error) {
      console.error("Sign in error:", error);
      setShowAuthSelection(false);

      // UserAlreadyAuthenticatedException の場合は状態不整合なのでリロード
      const errorName = error instanceof Error ? error.name : "";
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorName === "UserAlreadyAuthenticatedException" ||
        errorMessage.includes("already a signed in user")
      ) {
        window.location.reload();
      }
    }
  };

  const handleSignUp = () => {
    setShowAuthSelection(false);
    setShowTermsConsent(true);
  };

  const handleTermsConsent = () => {
    setShowTermsConsent(false);
    setShowSignupInstruction(true);
  };

  return (
    <div className="relative">
      <Button
        onClick={handleButtonClick}
        className={`bg-gradient-to-br w-cover h-cover from-accent to-primary hover:from-accent/90 hover:to-primary/90 p-2 ${className}`}
      >
        <UserCircle className="w-6 h-6" />
      </Button>

      {/* VIPトライアルのツールチップ */}
      {showTooltip && !isAuthenticated && !isLoading && (
        <div className="absolute top-full right-0 mt-2 z-50 animate-fadeInUp">
          <div className="relative bg-gradient-to-r from-accent to-primary text-white px-3 py-2 rounded-lg shadow-lg min-w-[240px]">
            {/* 吹き出しの矢印 */}
            <div className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-primary"></div>

            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="font-semibold text-sm whitespace-nowrap">
                  初回無料登録でVIPを5日間無料お試し！
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white hover:bg-white/20 flex-shrink-0"
                onClick={closeTooltip}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="mt-1 pt-1 border-t border-white/20">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-white/80 hover:text-white hover:bg-white/10 h-auto p-1"
                onClick={hideTooltip}
              >
                今後表示しない
              </Button>
            </div>
          </div>
        </div>
      )}

      <AuthSelectionModal
        isOpen={showAuthSelection}
        onClose={() => setShowAuthSelection(false)}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
      />

      <TermsConsentModal
        isOpen={showTermsConsent}
        onClose={() => setShowTermsConsent(false)}
        onConsent={handleTermsConsent}
      />

      <SignupInstructionModal
        isOpen={showSignupInstruction}
        onClose={() => setShowSignupInstruction(false)}
      />
    </div>
  );
}
