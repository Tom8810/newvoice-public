import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
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

    // Customer Portal Session作成
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("Portal session creation error:", error);
    return NextResponse.json(
      { error: "カスタマーポータルセッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}