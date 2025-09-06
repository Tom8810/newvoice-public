"use client";

import React, { useState } from "react";
import { X, LogIn, UserPlus, UserCircle, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TermsModal } from "../modals/terms-modal";

interface AuthSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignUp: () => void;
}

export function AuthSelectionModal({
  isOpen,
  onClose,
  onLogin,
  onSignUp,
}: AuthSelectionModalProps) {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const handleLogin = () => {
    setIsLoginLoading(true);
    onLogin();
  };

  const handleSignUp = () => {
    onSignUp();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        height: "100vh",
        width: "100vw",
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm z-[1001]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-200 overflow-hidden z-[1002] relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-accent/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <UserCircle className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              NewVoiceへようこそ
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-muted-foreground text-center mb-6">
            ログインまたはサインアップを選択してください
          </p>

          {/* Buttons */}
          <div className="space-y-4">
            <Button
              onClick={handleLogin}
              className="w-full bg-gradient-to-l from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold py-3 rounded-lg transition-all duration-200 hover:text-white"
              disabled={isLoginLoading}
              aria-describedby={isLoginLoading ? "login-loading" : undefined}
            >
              {isLoginLoading ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" aria-hidden="true" />
              ) : (
                <LogIn className="w-5 h-5 mr-3" aria-hidden="true" />
              )}
              {isLoginLoading ? "ログイン処理中..." : "既存のアカウントでログイン"}
              {isLoginLoading && (
                <span id="login-loading" className="sr-only">
                  ログイン処理を実行中です。しばらくお待ちください。
                </span>
              )}
            </Button>

            <Button
              onClick={handleSignUp}
              variant="outline"
              className="w-full border-2 border-accent/30 hover:border-accent hover:bg-accent/10 hover:text-foreground font-semibold py-3 rounded-lg transition-all duration-200"
            >
              <UserPlus className="w-5 h-5 mr-3" />
              新規アカウント作成
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-xs text-muted-foreground">
            <p>
              新規アカウント作成に際し、お客様は
              <button
                onClick={() => setShowTermsModal(true)}
                className="text-accent hover:text-accent/80 underline mx-1"
              >
                利用規約
              </button>
              、
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="text-accent hover:text-accent/80 underline mx-1"
              >
                プライバシーポリシー
              </button>
              へ同意したものとみなします。
            </p>
          </div>
        </div>
      </div>

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
    </div>
  );
}
