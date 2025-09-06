"use client";

import React, { useEffect } from "react";
import { X, FileText, Shield, Scale } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  getTermsContent,
  getPrivacyContent,
  specifiedCommercialTransactionAct,
} from "@/app/lib/terms-content";
import { renderMarkdownArray } from "@/app/lib/markdown-utils";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "terms" | "privacy" | "commercial";
}

export function TermsModal({ isOpen, onClose, type }: TermsModalProps) {
  const getContent = () => {
    switch (type) {
      case "terms":
        return getTermsContent();
      case "privacy":
        return getPrivacyContent();
      case "commercial":
        return specifiedCommercialTransactionAct();
      default:
        return getTermsContent();
    }
  };

  const content = getContent();
  const getIcon = () => {
    switch (type) {
      case "terms":
        return FileText;
      case "privacy":
        return Shield;
      case "commercial":
        return Scale;
      default:
        return FileText;
    }
  };
  const Icon = getIcon();

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
        zIndex: 1010,
        height: "100vh",
        width: "100vw",
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[1011]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden transform transition-all duration-200 z-[1012]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-accent/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {content.title}
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
            {renderMarkdownArray(content.content)}
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
