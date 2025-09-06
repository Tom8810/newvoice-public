// AWS Amplify configuration for Cognito
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
          scopes: ['openid', 'email', 'profile', "aws.cognito.signin.user.admin"],
          redirectSignIn: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN || 'https://newvoice.jp/auth/callback/'],
          redirectSignOut: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT || 'https://newvoice.jp/'],
          responseType: 'code' as const,
        },
        email: true,
        username: false,
      },
    },
  },
};