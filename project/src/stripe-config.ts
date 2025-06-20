export interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const PRODUCTS: Record<string, StripeProduct> = {
  SELECTION_PROCESS: {
    priceId: 'price_1Rb5w8KdCh3y3bmYqSmUyW2Z',
    name: 'Selection Process',
    description: 'Complete application process for international students',
    mode: 'payment'
  },
  APPLICATION_FEE: {
    priceId: 'price_1RbShpKdCh3y3bmYmgROPgMe',
    name: 'Application Fee',
    description: 'One-time application fee for scholarship applications',
    mode: 'payment'
  }
};