import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Pool } from "npm:pg@^8.11.3";

// Configuração do PostgreSQL externo
const POSTGRES_CONFIG = {
  host: "212.1.213.163",
  port: 5432,
  user: "postgres",
  password: "61cedf22a8e02d92aefb3025997cc3d2",
  database: "n8n_utility",
  ssl: false
};

// Interface para dados do pagamento Zelle
interface ZellePaymentData {
  confirmation_code: string;
}

// Interface para resposta
interface ZellePaymentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Pool de conexões (singleton)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool(POSTGRES_CONFIG);
    console.log('✅ [ZellePaymentManager] Pool PostgreSQL inicializado');
  }
  return pool;
}

Deno.serve(async (req: Request) => {
  // Configurar CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
      },
    });
  }

  try {
    const { confirmation_code }: ZellePaymentData = await req.json();
    
    console.log('🔍 [ZellePaymentManager] Inserindo código Zelle:', confirmation_code);

    const result = await insertZelleCode(confirmation_code);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ [ZellePaymentManager] Erro geral:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

/**
 * Insere um código Zelle na tabela do PostgreSQL externo
 */
async function insertZelleCode(confirmationCode: string): Promise<ZellePaymentResponse> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO public.zelle_payment_history 
      (confirmation_code, used)
      VALUES ($1, $2)
      RETURNING *
    `;

    const values = [
      confirmationCode,
      false // Código não usado inicialmente
    ];

    console.log('🔍 [ZellePaymentManager] Executando INSERT:', query);
    console.log('🔍 [ZellePaymentManager] Valores:', values);

    const result = await client.query(query, values);
    
    console.log('✅ [ZellePaymentManager] Código Zelle inserido com sucesso:', result.rows[0]);
    
    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error) {
    console.error('❌ [ZellePaymentManager] Erro ao inserir código Zelle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  } finally {
    client.release();
  }
}
