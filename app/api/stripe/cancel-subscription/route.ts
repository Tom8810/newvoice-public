import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Cognito クライアント設定
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// JWT検証用のヘルパー関数
async function verifyJWTToken(token: string) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header) {
      throw new Error('Invalid token format');
    }

    // Cognitoの公開鍵を取得してJWTを検証
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1';
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    
    const response = await fetch(jwksUrl);
    const jwks = await response.json();
    
    const key = jwks.keys.find((k: { kid: string }) => k.kid === decoded.header.kid);
    if (!key) {
      throw new Error('Public key not found');
    }
    
    const pem = jwkToPem(key);
    const payload = jwt.verify(token, pem) as { email: string; sub: string; [key: string]: unknown };
    
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { immediate = false } = await request.json();

    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("No authorization header or invalid format");
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // "Bearer " を除去
    const payload = await verifyJWTToken(token);
    
    if (!payload) {
      console.error("Invalid or expired token");
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const userEmail = payload.email as string;
    const userId = payload.sub as string;
    
    if (!userEmail) {
      console.error("No user email found in token");
      return NextResponse.json(
        { error: "ユーザー情報が不正です" },
        { status: 400 }
      );
    }

    // Stripe Customer検索
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length === 0) {
      return NextResponse.json(
        { error: "Stripeカスタマーが見つかりません" },
        { status: 404 }
      );
    }

    const customer = existingCustomers.data[0];

    // アクティブなサブスクリプション検索
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: "アクティブなサブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    const subscription = subscriptions.data[0];

    // サブスクリプション解約
    let canceledSubscription;
    if (immediate) {
      // 即座に解約
      canceledSubscription = await stripe.subscriptions.cancel(subscription.id);
    } else {
      // 期間末に解約
      canceledSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
    }

    // Cognitoユーザー属性を更新（解約時）
    try {
      const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
      
      // 解約処理：plan_expire_dateを次回支払いの前日に設定
      let planExpireDate: string | undefined;
      if (immediate) {
        // 即座に解約の場合は今日に設定
        planExpireDate = new Date().toISOString().split('T')[0];
      } else {
        // 期間末解約の場合は current_period_end の前日を設定
        // cancel_at_period_end=trueの場合、cancel_atがcurrent_period_endと同じ値になる
        const cancelAt = canceledSubscription.cancel_at;
        if (cancelAt) {
          const endDate = new Date(cancelAt * 1000);
          const expireDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 1日前
          planExpireDate = expireDate.toISOString().split('T')[0];
        }
      }
      
      const updateCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: userId,
        UserAttributes: [
          {
            Name: 'custom:plan',
            Value: immediate ? 'free' : 'vip', // 即座解約なら即座にfree、期間末なら現在はvip
          },
          ...(planExpireDate ? [{
            Name: 'custom:plan_expire_date',
            Value: planExpireDate,
          }] : []),
          {
            Name: 'custom:subscription_id',
            Value: immediate ? '' : canceledSubscription.id, // 即座解約なら空、期間末解約なら継続
          },
        ],
      });

      await cognitoClient.send(updateCommand);
      
    } catch (error) {
      console.error("Failed to update user attributes after cancellation:", error);
      // Cognito更新エラーでも解約自体は成功しているので続行
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
      },
    });
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    return NextResponse.json(
      { error: "サブスクリプションの解約に失敗しました" },
      { status: 500 }
    );
  }
}