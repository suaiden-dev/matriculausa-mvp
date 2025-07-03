// Mapeamento centralizado dos produtos e preços do Stripe para AMBIENTE DE TESTE e PRODUÇÃO.
// O sistema seleciona automaticamente os IDs corretos conforme o ambiente (test ou live).
// Basta usar STRIPE_PRODUCTS.<nome> no código, sem se preocupar com o ambiente.

export interface StripeProduct {
  productId: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

const isProd = import.meta.env.MODE === 'production';

export const STRIPE_PRODUCTS = {
  controlFee: isProd
    ? {
        productId: 'prod_SZ3ma6T2b0o702',
        priceId: 'price_1RgpiMKdCh3y3bmY7zkNInNG',
        name: 'Control Fee',
        description: 'Fee for I-20 control and document validation',
        mode: 'payment',
      }
    : {
        productId: 'prod_SWVk1e4mFkUJ2Z',
        priceId: 'price_1RbSjQKdCh3y3bmYQdmGvtpk',
        name: 'Control Fee',
        description: 'Fee for I-20 control and document validation',
        mode: 'payment',
      },
  applicationFee: isProd
    ? {
        productId: 'prod_SZ3nS58QT5NrFL',
        priceId: 'price_1Rgpk7KdCh3y3bmYy0vA0b4j',
        name: 'Application Fee',
        description: 'Fee for processing the student application after document analysis',
        mode: 'payment',
      }
    : {
        productId: 'prod_SWVjg1nJuHD4mb',
        priceId: 'price_1RbShpKdCh3y3bmYmgROPgMe',
        name: 'Application Fee',
        description: 'Fee for processing the student application after document analysis',
        mode: 'payment',
      },
  scholarshipFee: isProd
    ? {
        productId: 'prod_SZ3nMU2XGBe7KD',
        priceId: 'price_1RgpkfKdCh3y3bmYZPyMEZ7l',
        name: 'Scholarship Fee',
        description: 'One-time fee for applying to scholarships',
        mode: 'payment',
      }
    : {
        productId: 'prod_SWViFzT8SgWeiC',
        priceId: 'price_1RbSh9KdCh3y3bmYrklG84hH',
        name: 'Scholarship Fee',
        description: 'One-time fee for applying to scholarships',
        mode: 'payment',
      },
  selectionProcess: isProd
    ? {
        productId: 'prod_SW6LcrOKKbAmbi',
        priceId: 'price_1RgBJNKdCh3y3bmYkXY2qIZ7',
        name: 'Selection Process',
        description: 'Complete application process for international students',
        mode: 'payment',
      }
    : {
        productId: 'prod_SW8CWWoXmOiyfA',
        priceId: 'price_1Rb5w8KdCh3y3bmYqSmUyW2Z',
        name: 'Selection Process',
        description: 'Complete application process for international students',
        mode: 'payment',
      },
};