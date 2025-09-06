"use client";

import React, { useState } from "react";
import { signInWithRedirect } from "aws-amplify/auth";
import { Button } from "@/app/components/ui/button";
import { ListOrdered, X } from "lucide-react";

interface SignupInstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignupInstructionModal({
  isOpen,
  onClose,
}: SignupInstructionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    try {
      setIsLoading(true);
      await signInWithRedirect({
        customState: JSON.stringify({
          action: "signup",
          initialPage: "signup",
        }),
        options: {
          lang: "ja",
        },
      });
    } catch (error) {
      console.error("Sign up error:", error);
      setIsLoading(false);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center min-h-screen">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <ListOrdered className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              サインアップ手順
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              画面遷移後、下部の
              <span className="font-bold text-accent">「Sign up」</span>
              から、サインアップに進んでください。
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSignup}
              className="flex-1 bg-gradient-to-br from-accent to-primary hover:from-accent/90 hover:to-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  遷移中...
                </>
              ) : (
                "サインアップ"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
