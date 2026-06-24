import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const paymentId = 'f8f19b0d-634f-40f5-aea8-ceab1bb709ad';
  const { data, error } = await supabase
    .from('zelle_payments')
    .delete()
    .eq('id', paymentId);
    
  if (error) {
    console.error('Error deleting payment', error);
  } else {
    console.log('Payment successfully deleted/undone from Matricula USA!', data);
  }
}

main();
