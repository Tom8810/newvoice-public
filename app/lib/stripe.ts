import { fetchAuthSession } from 'aws-amplify/auth';

// Stripe価格設定（環境変数で管理することを推奨）
export const STRIPE_PRICES = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || 'price_monthly_test',
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || 'price_yearly_test',
};

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface StripePortalResponse {
  url: string;
}

// チェックアウトセッション作成
export async function createCheckoutSession(
  planType: 'monthly' | 'yearly'
): Promise<StripeCheckoutResponse> {
  const priceId = STRIPE_PRICES[planType];
  
  // Amplifyからアクセストークンを取得
  const session = await fetchAuthSession();
  
  if (!session.tokens?.idToken) {
    throw new Error('認証が必要です');
  }
  
  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.tokens.idToken}`,
    },
    body: JSON.stringify({
      priceId,
      planType,
    }),
  });

  if (!response.ok) {
    console.error('Stripe API error:', response.status, response.statusText);
    const responseText = await response.text();
    console.error('Response body:', responseText);
    
    let errorMessage = 'チェックアウトセッションの作成に失敗しました';
    try {
      const error = JSON.parse(responseText);
      errorMessage = error.error || errorMessage;
    } catch (jsonError) {
      console.error('Failed to parse error response as JSON:', jsonError);
      errorMessage += ` (HTTP ${response.status})`;
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

// カスタマーポータルセッション作成
export async function createPortalSession(): Promise<StripePortalResponse> {
  // Amplifyからアクセストークンを取得
  const session = await fetchAuthSession();
  
  if (!session.tokens?.idToken) {
    throw new Error('認証が必要です');
  }

  const response = await fetch('/api/stripe/create-portal-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.tokens.idToken}`,
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    let errorMessage = 'カスタマーポータルセッションの作成に失敗しました';
    try {
      const error = JSON.parse(responseText);
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage += ` (HTTP ${response.status})`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// サブスクリプション解約
export async function cancelSubscription(immediate = false): Promise<void> {
  // Amplifyからアクセストークンを取得
  const session = await fetchAuthSession();
  
  if (!session.tokens?.idToken) {
    throw new Error('認証が必要です');
  }

  const response = await fetch('/api/stripe/cancel-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.tokens.idToken}`,
    },
    body: JSON.stringify({
      immediate,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    let errorMessage = 'サブスクリプションの解約に失敗しました';
    try {
      const error = JSON.parse(responseText);
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage += ` (HTTP ${response.status})`;
    }
    throw new Error(errorMessage);
  }
}