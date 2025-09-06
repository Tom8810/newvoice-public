# NewVoice 📻

音声ニュースプラットフォーム - AI による日々のニュース音声配信と解説コンテンツ

## 🚀 概要

NewVoice は、日々のニュースを音声で配信し、重要なトピックについて AI が生成した詳細な解説音声を提供する Web アプリケーションです。忙しい現代人が移動中や作業中でも効率的にニュースを把握できるよう設計されています。

### 主要機能

- **📰 日々のニュース音声**: 過去 1 週間のニュース音声を自動取得・配信
- **🎯 解説コンテンツ**: ニュース内の重要なキーワードやトピックに対する AI 生成解説音声
- **🎵 シームレス再生**: ニュース → 解説 → 次のニュース → 次の解説の自動遷移
- **🔐 認証システム**: AWS Cognito による安全なユーザー認証
- **💳 サブスクリプション**: Stripe による VIP プラン管理
- **📱 レスポンシブデザイン**: デスクトップ・モバイル両対応
- **⏯️ 高機能プレイヤー**: 再生速度調整、シーク操作、前後スキップ
- **🎨 モダン UI**: Tailwind CSS + shadcn/ui による洗練されたインターフェース

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **アイコン**: Lucide React
- **認証**: AWS Cognito + AWS Amplify
- **決済**: Stripe (サブスクリプション管理)
- **インフラ**: AWS S3 (音声ファイル配信)
- **コンテナ**: Docker + Docker Compose
- **Web サーバー**: Nginx (リバースプロキシ)

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   API Routes    │────│     AWS S3      │
│                 │    │                 │    │                 │
│ ・UI Components │    │ ・/api/audio    │    │ ・your-bucket    │
│ ・Audio Player  │    │ ・/api/stripe   │    │                 │
│ ・Auth System   │    │ ・/api/account  │    │                 │
│ ・State Mgmt    │    │ ・Proxy & Cache │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                ↓                ↓                      ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  AWS Cognito    │    │     Stripe      │    │   DynamoDB      │
│                 │    │                 │    │                 │
│ ・User Auth     │    │ ・Subscriptions │    │ ・User Data     │
│ ・OAuth Flow    │    │ ・Payments      │    │ ・Account Mgmt  │
│ ・JWT Tokens    │    │ ・Webhooks      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 プロジェクト構造

```
newvoice/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── audio/                # 音声プロキシAPI
│   │   │   ├── route.ts          # 音声ファイル配信
│   │   │   └── metadata/         # メタデータ取得
│   │   ├── stripe/               # Stripe決済API
│   │   │   ├── create-checkout-session/
│   │   │   ├── create-portal-session/
│   │   │   ├── cancel-subscription/
│   │   │   └── webhook/
│   │   ├── account/              # アカウント管理API
│   │   │   └── delete/
│   ├── auth/                     # 認証ページ
│   │   └── callback/             # OAuthコールバック
│   ├── components/               # UIコンポーネント
│   │   ├── auth/                 # 認証関連コンポーネント
│   │   │   ├── login-button.tsx
│   │   │   ├── user-menu.tsx
│   │   │   └── protected-route.tsx
│   │   ├── modals/               # モーダルコンポーネント
│   │   ├── audio-console.tsx     # 音声コントロール
│   │   ├── news-card.tsx         # ニュースカード
│   │   └── ui/                   # 基本UIコンポーネント
│   ├── contexts/                 # React Context
│   │   ├── auth-context.tsx      # 認証状態管理
│   │   └── audio-player-context.tsx # 音声プレイヤー状態管理
│   ├── lib/                      # ユーティリティ
│   │   ├── amplify-config.ts     # AWS Amplify設定
│   │   ├── stripe.ts             # Stripe設定
│   │   ├── utils.ts              # 共通関数
│   │   └── news-generator.ts     # ニュースデータ生成
│   └── globals.css               # グローバルスタイル
├── public/                       # 静的ファイル
│   └── icons/                    # アイコンファイル
├── nginx/                        # Nginx設定
├── .env.local                    # 開発環境用
├── .env.production               # 本番環境用
├── docker-compose.yml            # Docker構成
├── Dockerfile                    # 本番用Dockerファイル
├── Dockerfile.dev                # 開発用Dockerファイル
└── README.md                     # このファイル
```
