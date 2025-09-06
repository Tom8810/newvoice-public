import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Cognito クライアント設定
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Webhook署名検証
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // イベント処理
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, "active");
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, "cancelled");
        break;
      }

    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  status: "active" | "cancelled"
) {
  try {
    const amplifyUserId = subscription.metadata.amplify_user_id;
    const originalPlan = subscription.metadata.original_plan;

    if (!amplifyUserId) {
      console.error("No amplify_user_id in subscription metadata");
      return;
    }

    let plan: string;
    let planExpireDate: string | undefined;
    let vipStartFrom: string | undefined;

    if (status === "active") {
      // 期間末解約が設定されている場合は解約予定として処理
      if (subscription.cancel_at_period_end && subscription.cancel_at) {
        plan = "vip";
        // cancel_atの前日をplan_expire_dateに設定
        const cancelAt = subscription.cancel_at;
        const endDate = new Date(cancelAt * 1000);
        const expireDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        planExpireDate = expireDate.toISOString().split('T')[0];
      } else {
        // 通常のアクティブサブスクリプション
        plan = "vip";
        // 支払い成功時はplan_expire_dateをnullに（無期限）
        planExpireDate = undefined;
        
        // vip-trialからの継続の場合、vip_start_fromを設定
        if (originalPlan === 'vip-trial' && subscription.trial_end) {
          // trial_endの日付をvip_start_fromに設定
          const trialEndDate = new Date(subscription.trial_end * 1000);
          vipStartFrom = trialEndDate.toISOString().split('T')[0];
          
          // vip-trialからの継続の場合、planをvip-trialのまま保持し、plan_expire_dateも保持
          plan = "vip-trial";
          // 元のplan_expire_dateを保持するため、undefinedにしない
          const originalExpireDate = new Date(subscription.trial_end * 1000 - 24 * 60 * 60 * 1000);
          planExpireDate = originalExpireDate.toISOString().split('T')[0];
        }
      }
    } else {
      plan = "free";
      planExpireDate = undefined;
    }

    // Cognito ユーザー属性を更新
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
    
    const userAttributes = [
      {
        Name: 'custom:plan',
        Value: plan,
      },
      {
        Name: 'custom:subscription_id',
        Value: subscription.id,
      },
    ];

    // planExpireDateがundefinedの場合は属性を削除（null設定）
    if (planExpireDate) {
      userAttributes.push({
        Name: 'custom:plan_expire_date',
        Value: planExpireDate,
      });
    } else {
      // 属性を削除してnullにする
      userAttributes.push({
        Name: 'custom:plan_expire_date',
        Value: '',
      });
    }

    // vipStartFromが設定されている場合は追加
    if (vipStartFrom) {
      userAttributes.push({
        Name: 'custom:vip_start_from',
        Value: vipStartFrom,
      });
    }
    
    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: amplifyUserId,
      UserAttributes: userAttributes,
    });

    await cognitoClient.send(updateCommand);

  } catch (error) {
    console.error("Error updating user plan:", error);
  }
}

