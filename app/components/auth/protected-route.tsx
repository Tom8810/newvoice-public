"use client";

import React, { ReactNode } from 'react';
import { useAuth } from '@/app/contexts/auth-context';
import { LoginButton } from './login-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        {fallback || (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-xl font-bold">
                ログインが必要です
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                このコンテンツにアクセスするには、ログインしてください。
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <LoginButton className="w-full" />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return <>{children}</>;
}