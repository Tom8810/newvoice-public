"use client";

import React, { useEffect } from "react";
import { X, Mail, Copy } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { contactConfig } from "@/app/lib/contact-config";
import { useToast } from "@/app/contexts/toast-context";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const contactEmail = contactConfig.email;
  const { showToast } = useToast();

  // メイン画面のスクロールを防止
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // クリーンアップ
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      // 簡単なフィードバック（必要に応じて改善可能）
      showToast(
        "メールアドレスがクリップボードにコピーされました",
        "success",
        "コピー完了"
      );
    } catch (err) {
      console.error("コピーに失敗しました:", err);
    }
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-accent/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              お問い合わせ
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
          <div className="text-center mb-6">
            <p className="text-muted-foreground text-sm mb-4">
              ご質問やお困りの際は、以下のメールアドレスまでお気軽にお問い合わせください。
            </p>
          </div>

          {/* Email Display */}
          <div className="bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/15 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-accent" />
                <span className="font-mono text-foreground font-medium text-sm">
                  {contactEmail}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-8 w-8 p-0 hover:bg-accent/10"
                title="クリップボードにコピー"
              >
                <Copy className="w-4 h-4 text-accent" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/10">
          <div className="flex justify-center">
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white"
            >
              閉じる
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
