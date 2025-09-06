"use client";

import React, { useEffect, useState } from "react";
import { X, Scale, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { specifiedCommercialTransactionAct } from "@/app/lib/terms-content";
import { renderMarkdownArray } from "@/app/lib/markdown-utils";

interface LegalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  showConfirmButton?: boolean;
}

export function LegalDocumentsModal({
  isOpen,
  onClose,
  onConfirm,
  showConfirmButton = false,
}: LegalDocumentsModalProps) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const commercialContent = specifiedCommercialTransactionAct();

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

  // モーダルが開かれるときに同意状態をリセット
  useEffect(() => {
    if (isOpen) {
      setHasAgreed(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!onConfirm) return;

    try {
      setIsProcessing(true);
      await onConfirm();
    } catch (error) {
      console.error("Confirm error:", error);
    } finally {
      setIsProcessing(false);
      onClose();
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[1005]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-200 z-[1006]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-accent/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {commercialContent.title}
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
            {renderMarkdownArray(commercialContent.content)}
          </div>
        </div>

        {/* Agreement Checkbox */}
        <div className="p-6 border-t border-border bg-muted/10">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="legal-agreement"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 text-accent focus:ring-accent border-accent rounded accent-accent"
            />
            <label
              htmlFor="legal-agreement"
              className="text-sm text-foreground cursor-pointer"
            >
              上記の特定商取引法に基づく表記の内容を確認し、同意します。
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              {showConfirmButton ? "キャンセル" : "閉じる"}
            </Button>
            {showConfirmButton && (
              <Button
                onClick={handleConfirm}
                disabled={!hasAgreed || isProcessing}
                className="flex-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                aria-describedby={isProcessing ? "legal-processing" : undefined}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>処理中...</span>
                    <span id="legal-processing" className="sr-only">
                      特定商取引法に基づく表記への同意処理を実行中です。しばらくお待ちください。
                    </span>
                  </div>
                ) : (
                  "同意して続行"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
