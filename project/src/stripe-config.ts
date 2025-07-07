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
        priceId: import.meta.env.VITE_STRIPE_CONTROL_FEE_PRICE_ID,
        name: 'Control Fee',
        description: 'Fee for I-20 control and document validation',
        mode: 'payment',
      }
    : {
        productId: 'prod_SWVk1e4mFkUJ2Z',
        priceId: import.meta.env.VITE_STRIPE_CONTROL_FEE_PRICE_ID,
        name: 'Control Fee',
        description: 'Fee for I-20 control and document validation',
        mode: 'payment',
      },
  applicationFee: isProd
    ? {
        productId: 'prod_SZ3nS58QT5NrFL',
        priceId: import.meta.env.VITE_STRIPE_APPLICATION_FEE_PRICE_ID,
        name: 'Application Fee',
        description: 'Fee for processing the student application after document analysis',
        mode: 'payment',
      }
    : {
        productId: 'prod_SWVjg1nJuHD4mb',
        priceId: import.meta.env.VITE_STRIPE_APPLICATION_FEE_PRICE_ID,
        name: 'Application Fee',
        description: 'Fee for processing the student application after document analysis',
        mode: 'payment',
      },
  scholarshipFee: isProd
    ? {
        productId: 'prod_SZ3nMU2XGBe7KD',
        priceId: import.meta.env.VITE_STRIPE_SCHOLARSHIP_FEE_PRICE_ID,
        name: 'Scholarship Fee',
        description: 'One-time fee for applying to scholarships',
        mode: 'payment',
      }
    : {
        productId: 'prod_SWViFzT8SgWeiC',
        priceId: import.meta.env.VITE_STRIPE_SCHOLARSHIP_FEE_PRICE_ID,
        name: 'Scholarship Fee',
        description: 'One-time fee for applying to scholarships',
        mode: 'payment',
      },
  selectionProcess: isProd
    ? {
        productId: 'prod_SW6LcrOKKbAmbi',
        priceId: import.meta.env.VITE_STRIPE_SELECTION_PROCESS_PRICE_ID,
        name: 'Selection Process',
        description: 'Complete application process for international students',
        mode: 'payment',
      }
    : {
        productId: 'prod_SW8CWWoXmOiyfA',
        priceId: import.meta.env.VITE_STRIPE_SELECTION_PROCESS_PRICE_ID,
        name: 'Selection Process',
        description: 'Complete application process for international students',
        mode: 'payment',
      },
};