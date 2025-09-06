"use client";

import React, { useState } from "react";
import { X, FileText, Shield, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { termsContent, privacyContent } from "@/app/lib/terms-content";
import { renderMarkdownArray } from "@/app/lib/markdown-utils";

interface TermsConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: () => void;
}

export function TermsConsentModal({
  isOpen,
  onClose,
  onConsent,
}: TermsConsentModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  if (!isOpen) return null;

  const isConsentComplete = termsAccepted && privacyAccepted;

  const handleConsent = () => {
    if (isConsentComplete) {
      onConsent();
    }
  };

  const handleClose = () => {
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    onClose();
  };

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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden transform transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-accent/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              利用規約・プライバシーポリシーに同意
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Subtitle */}

        {/* Content */}
        <div className="px-6 pb-4 overflow-y-auto max-h-[40vh]">
          <div className="py-4 text-left">
            <p className="text-muted-foreground text-sm">
              サインアップを続けるには、以下の項目に同意が必要です
            </p>
          </div>
          <div className="space-y-12">
            {/* 利用規約 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-foreground">利用規約</h3>
              </div>
              <div className="bg-gradient-to-r from-accent/5 to-primary/5 border border-accent rounded-lg p-4 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                {renderMarkdownArray(termsContent.content)}
              </div>

              <label className="flex items-center gap-3 cursor-pointer group pt-2">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    termsAccepted
                      ? "bg-accent border-accent"
                      : "border-muted-foreground group-hover:border-accent"
                  }`}
                  onClick={() => setTermsAccepted(!termsAccepted)}
                >
                  {termsAccepted && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-foreground">
                  利用規約に同意します
                </span>
              </label>
            </div>

            {/* プライバシーポリシー */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-foreground">
                  プライバシーポリシー
                </h3>
              </div>
              <div className="bg-gradient-to-r from-accent/5 to-primary/5 border border-accent rounded-lg p-4 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                {renderMarkdownArray(privacyContent.content)}
              </div>

              <label className="flex items-center gap-3 cursor-pointer group pt-2">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    privacyAccepted
                      ? "bg-accent border-accent"
                      : "border-muted-foreground group-hover:border-accent"
                  }`}
                  onClick={() => setPrivacyAccepted(!privacyAccepted)}
                >
                  {privacyAccepted && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-foreground">
                  プライバシーポリシーに同意します
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/10">
          <div className="flex gap-3">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              キャンセル
            </Button>
            <Button
              onClick={handleConsent}
              disabled={!isConsentComplete}
              className={`flex-1 ${
                isConsentComplete
                  ? "bg-gradient-to-r from-accent to-primary hover:from-accent/80 hover:to-primary/80 text-white hover:text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              同意して続ける
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
