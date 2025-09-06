"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/app/contexts/auth-context";
import { Button } from "@/app/components/ui/button";
import {
  User,
  LogOut,
  Menu,
  X,
  CreditCard,
  Crown,
  Edit3,
  Check,
  Trash2,
  Clock,
  Mail,
  Star,
  Loader2,
} from "lucide-react";
import {
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
} from "@/app/lib/stripe";
import { LegalDocumentsModal } from "@/app/components/modals/legal-documents-modal";
import { useToast } from "@/app/contexts/toast-context";

export function UserMenu() {
  const { user, userInfo, signOut, updateUserName, deleteAccount } = useAuth();
  const { showToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showPlanInfo, setShowPlanInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancelPlan, setShowCancelPlan] = useState(false);
  const [showCancelRestricted, setShowCancelRestricted] = useState(false);
  const [restrictionType, setRestrictionType] = useState<"cancel" | "delete">(
    "cancel"
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCancellingPlan, setIsCancellingPlan] = useState(false);
  const [showLegalDocuments, setShowLegalDocuments] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // モーダル排他制御
  const closeAllModals = () => {
    setShowUserInfo(false);
    setShowPlanInfo(false);
    setShowDeleteConfirm(false);
    setShowUpgrade(false);
    setShowCancelPlan(false);
    setShowCancelRestricted(false);
    setShowLegalDocuments(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  const handleUserInfo = () => {
    closeAllModals();
    setShowUserInfo(true);
    setIsMenuOpen(false);
  };

  const handlePlanInfo = () => {
    closeAllModals();
    setShowPlanInfo(true);
    setIsMenuOpen(false);
  };

  const handleUpgrade = () => {
    closeAllModals();
    setShowUpgrade(true);
  };

  const handleCancelPlan = () => {
    closeAllModals();

    // vip_start_from属性をチェック
    const vipStartFrom = userInfo?.vip_start_from;
    if (vipStartFrom) {
      const today = new Date();
      const startDate = new Date(vipStartFrom);

      // 今日がvip_start_fromよりも前（または同じ日）の場合、解約を制限
      if (today <= startDate) {
        setRestrictionType("cancel");
        setShowCancelRestricted(true);
        return;
      }
    }

    setShowCancelPlan(true);
  };

  // リーガルドキュメントを表示
  const handleShowLegalDocuments = () => {
    closeAllModals();
    setShowLegalDocuments(true);
  };

  // リーガルドキュメント確認後の決済処理
  const handleLegalConfirmed = async () => {
    try {
      setIsProcessingPayment(true);
      const { url } = await createCheckoutSession(selectedPlan);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout session error:", error);
      showToast(
        `決済処理でエラーが発生しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
        "error",
        "決済エラー"
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Stripe処理ハンドラー（リーガルドキュメント表示に変更）
  const handleStripeUpgrade = () => {
    handleShowLegalDocuments();
  };

  const handleStripeCancelPlan = async () => {
    try {
      setIsProcessingPayment(true);
      setIsCancellingPlan(true);
      await cancelSubscription(false); // 期間末で解約
      showToast(
        "プランの解約手続きが完了しました。現在の期間終了時まではご利用いただけます。",
        "success",
        "解約完了"
      );
      setShowCancelPlan(false);
      // ページをリロードしてユーザー情報を更新
      window.location.reload();
    } catch (error) {
      console.error("Cancellation error:", error);
      showToast(
        `解約処理でエラーが発生しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
        "error",
        "エラーが発生しました"
      );
    } finally {
      setIsProcessingPayment(false);
      setIsCancellingPlan(false);
    }
  };

  const handleStripePortal = async () => {
    try {
      setIsProcessingPayment(true);
      setIsLoadingPortal(true);
      const { url } = await createPortalSession();
      if (url) {
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Portal session error:", error);
      showToast(
        `カスタマーポータルでエラーが発生しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
        "error",
        "エラーが発生しました"
      );
    } finally {
      setIsProcessingPayment(false);
      setIsLoadingPortal(false);
    }
  };

  const handleEditName = () => {
    setEditingName(userInfo?.name || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) return;

    setIsSavingName(true);
    try {
      await updateUserName(editingName.trim());
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update name:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditingName("");
  };

  const userName = userInfo?.name || "ユーザー";
  const userPlan = userInfo?.plan || "free";
  const isFreePlan = userPlan === "free";
  const isVIPPlan = userPlan === "vip";
  const isVIPTrialPlan = userPlan === "vip-trial";

  // vip-trial継続中かどうかの判定
  const vipStartFrom = userInfo?.vip_start_from;
  const isVIPTrialContinued =
    isVIPTrialPlan && vipStartFrom && new Date(vipStartFrom) > new Date();

  const displayPlan = isVIPPlan || isVIPTrialPlan ? "VIP" : userPlan;

  const truncateEmail = (email: string, maxLength: number = 20) => {
    if (email.length <= maxLength) return email;
    return email.substring(0, maxLength) + "...";
  };

  const formatExpireDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ja-JP");
    } catch {
      return dateString;
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (error) {
      console.error("Failed to delete account:", error);
      showToast(
        "アカウント削除に失敗しました。しばらくしてから再度お試しください。",
        "error",
        "削除に失敗しました"
      );
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="group relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-accent/5 to-primary/5 hover:bg-white/80 rounded-full border-2 border-accent hover:border-primary hover:shadow-md transition-all duration-300"
        onClick={() => setIsMenuOpen(true)}
        aria-label="ユーザーメニュー"
      >
        {/* ログイン状態インジケーター - 洗練されたピンク系デザイン */}
        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-accent via-primary to-accent rounded-full border-2 border-background shadow-lg animate-pulse"></div>
        <Menu className="w-4 h-4 text-accent group-hover:text-primary transition-colors duration-300" />
      </Button>

      {/* Drawer Menu */}
      {mounted &&
        isMenuOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[95] transition-opacity duration-300"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Right Drawer */}
            <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[96] transform transition-transform duration-300 ease-out">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-foreground">
                  メニュー
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* User Card */}
              <div className="p-6 bg-gradient-to-br from-accent/10 to-primary/10 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {userName}
                      </h3>
                    </div>
                    <p
                      className="text-sm text-muted-foreground"
                      title={userInfo?.email}
                    >
                      {userInfo?.email ? truncateEmail(userInfo.email) : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {isFreePlan ? (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          Free Plan
                        </span>
                      ) : isVIPTrialPlan ? (
                        <span className="text-xs bg-gradient-to-r from-accent to-primary text-white px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Clock className="w-3 h-3" />
                          VIP Trial
                        </span>
                      ) : (
                        <span className="text-xs bg-gradient-to-r from-accent to-primary text-white px-2 py-1 rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          {displayPlan}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-4 space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-left"
                  onClick={handleUserInfo}
                >
                  <User className="w-4 h-4 mr-3" />
                  ユーザー情報
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-left"
                  onClick={handlePlanInfo}
                >
                  <CreditCard className="w-4 h-4 mr-3" />
                  プラン
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-left text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  ログアウト
                </Button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* User Info Modal */}
      {mounted &&
        showUserInfo &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
              onClick={() => setShowUserInfo(false)}
            >
              {/* Modal */}
              <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-accent/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      ユーザー情報
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowUserInfo(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* メールアドレス */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/10">
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4" />
                      メールアドレス
                    </label>
                    <p className="text-sm text-foreground font-medium">
                      {userInfo?.email || "未設定"}
                    </p>
                  </div>

                  {/* 名前 */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/10">
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      名前
                    </label>
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white/80"
                          placeholder="名前を入力"
                          disabled={isSavingName}
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveName}
                          disabled={!editingName.trim() || isSavingName}
                          className="h-8 w-8 p-0 bg-gradient-to-r from-accent to-primary text-white shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isSavingName ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          disabled={isSavingName}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-foreground font-medium flex-1">
                          {userInfo?.name || "未設定"}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-60 hover:opacity-100 hover:bg-white/80 hover:text-accent transition-all"
                          onClick={handleEditName}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* プラン */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/10">
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4" />
                      プラン
                    </label>
                    <div className="flex items-center gap-2">
                      {isFreePlan ? (
                        <span className="text-xs bg-white/80 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full shadow-sm">
                          Free Plan
                        </span>
                      ) : isVIPTrialPlan ? (
                        <span className="text-xs bg-gradient-to-r from-accent to-primary text-white px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Clock className="w-3 h-3" />
                          VIP Trial
                        </span>
                      ) : (
                        <span className="text-xs bg-gradient-to-r from-accent to-primary text-white px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Crown className="w-3 h-3" />
                          {displayPlan}
                        </span>
                      )}
                    </div>
                    {(isVIPTrialPlan ||
                      (isVIPPlan && userInfo?.plan_expire_date)) && (
                      <p className="text-xs text-accent font-medium mt-2">
                        {isVIPTrialPlan
                          ? isVIPTrialContinued
                            ? `${vipStartFrom}からVIPプランに移行します`
                            : userInfo?.plan_expire_date
                            ? `有効期限: ${formatExpireDate(
                                userInfo.plan_expire_date
                              )}`
                            : null
                          : isVIPPlan && userInfo?.plan_expire_date
                          ? `有効期限: ${formatExpireDate(
                              userInfo.plan_expire_date
                            )}`
                          : null}
                      </p>
                    )}
                  </div>

                  {/* アカウント削除ボタン */}
                  <div className="pt-4 border-t border-gray-200 text-center">
                    <button
                      className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
                      onClick={() => {
                        closeAllModals();

                        // vip-trial継続中の場合は解約制限モーダルを表示
                        if (isVIPTrialContinued) {
                          setRestrictionType("delete");
                          setShowCancelRestricted(true);
                        } else {
                          setShowDeleteConfirm(true);
                        }
                      }}
                    >
                      アカウントを削除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Plan Info Modal */}
      {mounted &&
        showPlanInfo &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
              onClick={() => setShowPlanInfo(false)}
            >
              {/* Modal */}
              <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-accent/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>

                    <h2 className="text-lg font-semibold text-foreground">
                      プラン情報
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowPlanInfo(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {isFreePlan || (isVIPTrialPlan && !isVIPTrialContinued) ? (
                    /* Free Plan or VIP Trial Comparison View */
                    <div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Free Plan */}
                        <div className="text-center p-4 border border-gray-200 rounded-lg">
                          <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <Star className="w-6 h-6 text-gray-600" />
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">
                            Free Plan
                          </h3>
                          <p className="text-xs text-gray-500 mb-3">
                            {isVIPTrialPlan
                              ? "Trial終了後のプラン"
                              : "現在のプラン"}
                          </p>
                          <ul className="space-y-1 text-xs text-muted-foreground text-left">
                            <li>• ニュースのみ</li>
                          </ul>
                        </div>

                        {/* VIP Plan */}
                        <div className="text-center p-4 border-2 border-accent rounded-lg bg-gradient-to-br from-accent/5 to-primary/5">
                          <div className="w-12 h-12 mx-auto bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mb-3">
                            <Crown className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">
                            VIP Plan
                          </h3>
                          <p className="text-xs text-accent font-medium mb-3">
                            {isVIPTrialPlan
                              ? "現在のプラン (Trial)"
                              : "おすすめ"}
                          </p>
                          <ul className="space-y-1 text-xs text-muted-foreground text-left">
                            <li>• 全てのニュース</li>
                            <li>• 全ての解説</li>
                          </ul>
                          {isVIPTrialPlan && userInfo?.plan_expire_date && (
                            <p className="text-xs text-accent font-medium mt-2">
                              {formatExpireDate(userInfo.plan_expire_date)}まで
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-center">
                        <Button
                          className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white w-full disabled:opacity-70 disabled:cursor-not-allowed"
                          onClick={handleUpgrade}
                          disabled={isProcessingPayment}
                        >
                          {isProcessingPayment ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                              <span>処理中...</span>
                              <span className="sr-only">
                                決済処理を実行中です。しばらくお待ちください。
                              </span>
                            </div>
                          ) : isVIPTrialPlan ? (
                            "VIPプランを継続する"
                          ) : (
                            "VIPプランにアップグレード"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* VIP Plan View */
                    <div>
                      <div className="text-center p-4 border-2 border-accent rounded-lg bg-gradient-to-br from-accent/5 to-primary/5 mb-6">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mb-4">
                          <Crown className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {isVIPTrialContinued ? `VIP Trial` : "VIP Plan"}
                        </h3>
                        <p className="text-xs text-accent font-medium mb-3">
                          {isVIPTrialContinued
                            ? `${vipStartFrom}からVIPプランに移行します`
                            : userInfo?.plan_expire_date
                            ? `有効期限: ${formatExpireDate(
                                userInfo.plan_expire_date
                              )}`
                            : "現在のプラン"}
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground text-left">
                          <li>• 全てのニュース</li>
                          <li>• 全ての解説</li>
                        </ul>
                      </div>

                      {/* Action Buttons */}
                      <div className="text-center">
                        <Button
                          variant="outline"
                          className="text-accent border-accent hover:bg-accent/5 hover:text-accent hover:border-accent mb-4 disabled:opacity-70 disabled:cursor-not-allowed"
                          onClick={handleStripePortal}
                          disabled={isLoadingPortal}
                        >
                          {isLoadingPortal ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                              <span>読み込み中...</span>
                              <span className="sr-only">
                                支払い設定ページを読み込み中です。しばらくお待ちください。
                              </span>
                            </div>
                          ) : (
                            "支払い設定・履歴を確認"
                          )}
                        </Button>

                        {/* 解約済みVIPユーザー(planがvipかつplan_expire_dateが設定されている)の場合は解約ボタンを非表示 */}
                        {!(isVIPPlan && userInfo?.plan_expire_date) && (
                          <div className="border-t border-gray-200 pt-3">
                            <button
                              className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
                              onClick={handleCancelPlan}
                            >
                              VIPプランを解約する
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Account Delete Confirmation Modal */}
      {mounted &&
        showDeleteConfirm &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
              onClick={() => !isDeletingAccount && setShowDeleteConfirm(false)}
            >
              {/* Modal */}
              <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-gray-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      アカウント削除の確認
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 hover:text-gray-700"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingAccount}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      アカウント削除すると、データが完全に削除され、
                      プランの有効期間が残っている場合もご利用いただけなくなります。
                    </p>
                    <p className="text-sm text-red-600 font-bold">
                      この操作は取り消すことができません。
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeletingAccount}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isDeletingAccount ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>削除中...</span>
                        </div>
                      ) : (
                        "削除する"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Plan Upgrade Modal */}
      {mounted &&
        showUpgrade &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
              onClick={() => !isProcessingPayment && setShowUpgrade(false)}
            >
              {/* Modal */}
              <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-accent/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                      <Crown className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {isVIPTrialPlan
                        ? "VIPプラン継続"
                        : "VIPプランにアップグレード"}
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowUpgrade(false)}
                    disabled={isProcessingPayment}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mb-4 shadow-lg">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      VIP Plan
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {isVIPTrialPlan ? (
                        "トライアル期間終了後もVIPプランをご利用いただけます"
                      ) : (
                        <>
                          すべての機能をお楽しみいただける <br /> premium
                          プランです
                        </>
                      )}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="bg-gradient-to-r from-accent/5 to-primary/5 rounded-lg p-4 mb-6 border border-accent/10">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-accent" />
                      VIPプランの特典
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                        全てのニュース音声が聴き放題
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                        ニュースの解説でより深く理解
                      </li>
                    </ul>
                  </div>

                  {/* Plan Selection */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-foreground mb-3 text-center">
                      プランを選択
                    </h4>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Monthly Plan */}
                      <button
                        onClick={() => setSelectedPlan("monthly")}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          selectedPlan === "monthly"
                            ? "border-accent bg-accent/5"
                            : "border-gray-200 hover:border-accent/50"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm text-gray-500 mb-1">
                            月額プラン
                          </div>
                          <div className="text-2xl font-bold text-accent">
                            ¥199
                          </div>
                          <div className="text-xs text-gray-400">/ 月</div>
                        </div>
                      </button>

                      {/* Yearly Plan */}
                      <button
                        onClick={() => setSelectedPlan("yearly")}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          selectedPlan === "yearly"
                            ? "border-accent bg-accent/5"
                            : "border-gray-200 hover:border-accent/50"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm text-gray-500 mb-1">
                            年額プラン
                          </div>
                          <div className="text-2xl font-bold text-accent">
                            ¥1,499
                          </div>
                          <div className="text-xs text-gray-400">/ 年</div>
                          <div className="text-xs text-accent mt-1 font-medium">
                            約37%お得
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Selected Plan Summary */}
                    <div className="text-center text-sm text-gray-600">
                      {selectedPlan === "monthly"
                        ? "月額 ¥199（税込）で毎月自動更新されます"
                        : "年額 ¥1,499（税込）で毎年自動更新されます"}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowUpgrade(false)}
                      className="flex-1"
                      disabled={isProcessingPayment}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleStripeUpgrade}
                      disabled={isProcessingPayment}
                      className="flex-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white disabled:opacity-70 disabled:cursor-not-allowed relative"
                    >
                      {isProcessingPayment ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>処理中...</span>
                          <span className="sr-only">
                            プラン変更処理を実行中です。しばらくお待ちください。
                          </span>
                        </div>
                      ) : isVIPTrialPlan ? (
                        `${selectedPlan === "monthly" ? "月額" : "年額"}で継続`
                      ) : (
                        `${
                          selectedPlan === "monthly" ? "月額" : "年額"
                        }でご利用`
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Cancel Restricted Modal */}
      {mounted &&
        showCancelRestricted &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
              onClick={() => setShowCancelRestricted(false)}
            >
              {/* Modal */}
              <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {restrictionType === "cancel"
                        ? "プランを解約できません"
                        : "アカウント削除できません"}
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 hover:text-gray-900"
                    onClick={() => setShowCancelRestricted(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {restrictionType === "cancel"
                        ? "現在、VIPプランを解約できません"
                        : "現在、アカウントを削除できません"}
                    </h3>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {restrictionType === "cancel"
                        ? "すでにVIPプランの継続をいただいているため、無料期間中はVIPプランを解約できません。契約開始後にアカウント削除手続きを行ってください。"
                        : "すでにVIPプランの継続をいただいているため、無料期間中はアカウントを削除できません。継続予約をキャンセルしたい場合は、契約開始後に解約手続きを行ってください。"}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        契約開始日:{" "}
                        <span className="font-semibold">
                          {userInfo?.vip_start_from}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {restrictionType === "cancel"
                          ? "この日以降に解約手続きが可能になります"
                          : "この日以降にアカウント削除が可能になります"}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={() => setShowCancelRestricted(false)}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-8"
                    >
                      了解しました
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Plan Cancel Modal */}
      {mounted &&
        showCancelPlan &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
              onClick={() => !isCancellingPlan && setShowCancelPlan(false)}
            >
              {/* Modal */}
              <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-gray-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      プラン解約の確認
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-accent/10"
                    onClick={() => setShowCancelPlan(false)}
                    disabled={isCancellingPlan}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      VIPプランを解約しますか？
                    </h3>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      解約すると利用できなくなる機能
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <X className="w-3 h-3 text-gray-500" />
                        ニュース解説音声の再生
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelPlan(false)}
                      className="flex-1 hover:bg-gray-100 hover:text-gray-900"
                      disabled={isCancellingPlan}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleStripeCancelPlan}
                      disabled={isCancellingPlan}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isCancellingPlan ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>処理中...</span>
                          <span className="sr-only">
                            プラン解約処理を実行中です。しばらくお待ちください。
                          </span>
                        </div>
                      ) : (
                        "解約する"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Legal Documents Modal */}
      {mounted && (
        <LegalDocumentsModal
          isOpen={showLegalDocuments}
          onClose={() => setShowLegalDocuments(false)}
          onConfirm={handleLegalConfirmed}
          showConfirmButton={true}
        />
      )}
    </div>
  );
}
