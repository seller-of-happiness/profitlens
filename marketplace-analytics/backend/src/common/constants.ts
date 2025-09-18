export const Marketplace = {
  WILDBERRIES: 'WILDBERRIES',
  OZON: 'OZON',
} as const;

export type Marketplace = typeof Marketplace[keyof typeof Marketplace];

export const SubscriptionPlan = {
  FREE: 'FREE',
  START: 'START',
  BUSINESS: 'BUSINESS',
  PRO: 'PRO',
} as const;

export type SubscriptionPlan = typeof SubscriptionPlan[keyof typeof SubscriptionPlan];