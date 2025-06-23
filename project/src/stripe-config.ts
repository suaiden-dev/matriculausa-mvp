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
    description: 'Fee for processing the student application after document analysis',
    mode: 'payment'
  },
  SCHOLARSHIPS_FEE: {
    priceId: 'price_1RbSh9KdCh3y3bmYrklG84hH',
    name: 'Scholarships Fee',
    description: 'One-time fee for applying to scholarships',
    mode: 'payment'
  }
};