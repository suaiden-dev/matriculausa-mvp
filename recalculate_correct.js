// Funções de cálculo
function removeStripeFees(gross, isPIX = false) {
  if (isPIX) {
    return gross * (1 - 0.018); // 1.8% para PIX
  } else {
    return Math.max(0, gross * (1 - 0.039) - 0.30); // 3.9% + $0.30 para card
  }
}

// Dados dos pagamentos BRUTOS originais (da Payment Management)
// Valores específicos serão aplicados onde indicado
const payments = [
  // Tatiane Garcia Pereira Silva - gp.tatiane@gmail.com
  { email: 'gp.tatiane@gmail.com', fee: 'Selection Process', amount: 280, method: 'Zelle' },
  
  // Victor Vieira Pacheco - vieirapachecovictor@gmail.com
  // Valores brutos: I-20 $1,057.64 (Pix), Scholarship $933.67 (Stripe), Selection $413.73 (Stripe)
  // Valores específicos: I-20 $999, Scholarship $900, Selection $400
  { email: 'vieirapachecovictor@gmail.com', fee: 'I-20 Control', amount: 999, method: 'Override' },
  { email: 'vieirapachecovictor@gmail.com', fee: 'Scholarship', amount: 900, method: 'Override' },
  { email: 'vieirapachecovictor@gmail.com', fee: 'Selection Process', amount: 400, method: 'Override' },
  
  // Felipe Luis Aquino Pereira da Rocha - flaprocha@gmail.com
  // Valores brutos: I-20 $1,057.64 (Pix), Scholarship $933.67 (Stripe), Selection $1,036.10 (Stripe)
  // Valores específicos: I-20 $999, Scholarship $900, Selection $1,000
  { email: 'flaprocha@gmail.com', fee: 'I-20 Control', amount: 999, method: 'Override' },
  { email: 'flaprocha@gmail.com', fee: 'Scholarship', amount: 900, method: 'Override' },
  { email: 'flaprocha@gmail.com', fee: 'Selection Process', amount: 1000, method: 'Override' },
  
  // Juliana Vasconcelos Carmo - juvasconcelos252@gmail.com
  { email: 'juvasconcelos252@gmail.com', fee: 'Scholarship', amount: 900, method: 'Zelle' },
  { email: 'juvasconcelos252@gmail.com', fee: 'Selection Process', amount: 400, method: 'Zelle' },
  
  // Maria Luísa Santos de Almeida - marialuisasalmeid@gmail.com
  // Selection Process específico: $550
  { email: 'marialuisasalmeid@gmail.com', fee: 'Scholarship', amount: 900, method: 'Zelle' },
  { email: 'marialuisasalmeid@gmail.com', fee: 'I-20 Control', amount: 900, method: 'Zelle' },
  { email: 'marialuisasalmeid@gmail.com', fee: 'Selection Process', amount: 550, method: 'Override' },
  
  // Gerson Aparecido Chesque Pereira - gerson_sk@hotmail.com
  // Valores específicos: I-20 $900, Scholarship $900, Selection $700
  { email: 'gerson_sk@hotmail.com', fee: 'I-20 Control', amount: 900, method: 'Override' },
  { email: 'gerson_sk@hotmail.com', fee: 'Scholarship', amount: 900, method: 'Override' },
  { email: 'gerson_sk@hotmail.com', fee: 'Selection Process', amount: 700, method: 'Override' },
  
  // Mariana Moura Fontenele de Brito - mmfontenelebrito@gmail.com
  // Valores específicos: I-20 $900, Scholarship $900, Selection $550
  { email: 'mmfontenelebrito@gmail.com', fee: 'I-20 Control', amount: 900, method: 'Override' },
  { email: 'mmfontenelebrito@gmail.com', fee: 'Scholarship', amount: 900, method: 'Override' },
  { email: 'mmfontenelebrito@gmail.com', fee: 'Selection Process', amount: 550, method: 'Override' },
  
  // Isabela Ohana Ribeiro Machado - isabelaohana.io@gmail.com
  // Valor bruto: Selection $417.43 (Stripe)
  // Valor específico: Selection $400
  { email: 'isabelaohana.io@gmail.com', fee: 'Selection Process', amount: 400, method: 'Override' },
  
  // Stephanie Cristine Santos Ferreira - stephaniecriistine25@gmail.com
  // Valores brutos: I-20 $937.49 (Pix), Scholarship $900 (Stripe), Selection $550 (Stripe)
  // Valores específicos: I-20 $900, Scholarship $900, Selection $550
  { email: 'stephaniecriistine25@gmail.com', fee: 'I-20 Control', amount: 900, method: 'Override' },
  { email: 'stephaniecriistine25@gmail.com', fee: 'Scholarship', amount: 900, method: 'Override' },
  { email: 'stephaniecriistine25@gmail.com', fee: 'Selection Process', amount: 550, method: 'Override' },
  
  // Vanessa Henrique Fogaça - vanessapullmantur@gmail.com
  { email: 'vanessapullmantur@gmail.com', fee: 'Selection Process', amount: 400, method: 'Outside' },
  
  // Brenda Quintana - brendastorck@hotmail.com
  { email: 'brendastorck@hotmail.com', fee: 'Selection Process', amount: 550, method: 'Zelle' },
  
  // Sara Bianey Stith Campo - sarastith0@gmail.com
  // Valor específico: Scholarship $1,000
  { email: 'sarastith0@gmail.com', fee: 'Scholarship', amount: 1000, method: 'Override' },
  
  // Renan da Conceição Freire - renan_cvc@hotmail.com
  { email: 'renan_cvc@hotmail.com', fee: 'Scholarship', amount: 400, method: 'Zelle' },
];

// Agrupar por email e calcular totais
const students = {};
payments.forEach(p => {
  if (!students[p.email]) {
    students[p.email] = { fees: [] };
  }
  
  let netAmount = p.amount;
  
  // Se for Override, usar valor direto (sem remover taxas)
  if (p.method === 'Override') {
    netAmount = p.amount;
  } else if (p.method === 'Pix') {
    netAmount = removeStripeFees(p.amount, true);
  } else if (p.method === 'Stripe') {
    netAmount = removeStripeFees(p.amount, false);
  } else {
    // Zelle e Outside: usar valor direto
    netAmount = p.amount;
  }
  
  students[p.email].fees.push({
    fee: p.fee,
    gross: p.amount,
    net: netAmount,
    method: p.method
  });
});

// Calcular totais
Object.keys(students).forEach(email => {
  const student = students[email];
  student.total = student.fees.reduce((sum, f) => sum + f.net, 0);
  student.totalRounded = Math.round(student.total * 100) / 100;
});

// Exibir resultados
console.log('=== CÁLCULOS REVISADOS ===\n');

Object.keys(students).forEach(email => {
  const student = students[email];
  console.log(`${email}:`);
  student.fees.forEach(f => {
    if (f.method === 'Override') {
      console.log(`  ${f.fee}: $${f.net.toFixed(2)} (específico)`);
    } else {
      console.log(`  ${f.fee}: $${f.gross.toFixed(2)} (${f.method}) → $${f.net.toFixed(2)}`);
    }
  });
  console.log(`  TOTAL: $${student.totalRounded.toFixed(2)}\n`);
});

// Resumo
const totalAll = Object.values(students).reduce((sum, s) => sum + s.totalRounded, 0);
console.log(`TOTAL GERAL: $${totalAll.toFixed(2)}`);

