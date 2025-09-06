// お問い合わせ設定の管理

export const getContactEmail = (): string => {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@newvoice.jp';
};

export const contactConfig = {
  email: getContactEmail(),
};