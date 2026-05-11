const fs = require('fs');
const keys = {
  pt: {
    title: 'Documento I-20',
    description: 'Seu I-20 foi recebido. Efetue o pagamento da Control Fee para liberar o documento completo e em alta qualidade.',
    payButton: 'Ir para Pagamento'
  },
  en: {
    title: 'I-20 Document',
    description: 'Your I-20 has been received. Please pay the Control Fee to release the full, high-quality document.',
    payButton: 'Go to Payment'
  },
  es: {
    title: 'Documento I-20',
    description: 'Su I-20 ha sido recibido. Por favor realice el pago de la Control Fee para liberar el documento completo y en alta calidad.',
    payButton: 'Ir al Pago'
  }
};
['pt', 'en', 'es'].forEach(lang => {
  const path = `src/i18n/locales/${lang}/registration.json`;
  let data = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!data.i20Preview) data.i20Preview = {};
  data.i20Preview = keys[lang];
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
});
