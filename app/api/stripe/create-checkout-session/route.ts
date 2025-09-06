import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

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
  let priceId: string | undefined;
  let planType: string | undefined;
  
  try {
    const requestData = await request.json();
    priceId = requestData.priceId;
    planType = requestData.planType;

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

    // Cognitoから直接ユーザー属性を取得（セキュア）
    let currentPlan = 'free';
    let planExpireDate: string | undefined;
    
    try {
      const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: userId,
      });
      
      const userResult = await cognitoClient.send(getUserCommand);
      
      // ユーザー属性から値を取得
      const planAttr = userResult.UserAttributes?.find(attr => attr.Name === 'custom:plan');
      const expireDateAttr = userResult.UserAttributes?.find(attr => attr.Name === 'custom:plan_expire_date');
      
      currentPlan = planAttr?.Value || 'free';
      planExpireDate = expireDateAttr?.Value;
      
    } catch (error) {
      console.error("Failed to get user attributes from Cognito:", error);
      // エラーの場合はデフォルト値を使用して続行
    }

        // Stripe Customer検索または作成
        let customer;
        const existingCustomers = await stripe.customers.list({
          email: userEmail,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
        } else {
          customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
              amplify_user_id: userId,
            },
          });
        }

        // vip-trialユーザーの場合のtrial_end計算
        let trialEnd: number | undefined;
        
        if (currentPlan === 'vip-trial' && planExpireDate) {
          try {
            // planExpireDateをJSTとして解釈し、翌日0時（JST）のUnixタイムスタンプを取得
            const expireDate = new Date(planExpireDate + 'T00:00:00+09:00'); // JSTとして解釈
            const nextDay = new Date(expireDate.getTime() + 24 * 60 * 60 * 1000); // 翌日0時JST
            trialEnd = Math.floor(nextDay.getTime() / 1000); // Unixタイムスタンプ
            
          } catch (error) {
            console.error("Error calculating trial_end for vip-trial user:", error);
            // エラーの場合は通常のサブスクリプション作成を継続
          }
        }

        // Checkout Session作成
        const subscriptionData: {
          metadata: {
            plan_type: string;
            amplify_user_id: string;
            original_plan: string;
          };
          trial_end?: number;
        } = {
          metadata: {
            plan_type: planType || '',
            amplify_user_id: userId,
            original_plan: currentPlan || 'free',
          },
        };

        // vip-trialユーザーの場合はtrial_endを設定
        if (trialEnd) {
          subscriptionData.trial_end = trialEnd;
        }

        const checkoutSession = await stripe.checkout.sessions.create({
          customer: customer.id,
          payment_method_types: ["card"],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/`,
          cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/`,
          metadata: {
            plan_type: planType || '',
            amplify_user_id: userId,
            original_plan: currentPlan || 'free',
          },
          subscription_data: subscriptionData,
        });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      priceId,
      planType,
    });
    return NextResponse.json(
      { 
        error: "チェックアウトセッションの作成に失敗しました",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}