# Guia de Reversão: Taxas de Pacote → "Control Fee"

> **Data da alteração:** 16 de Abril de 2026  
> **Tipo:** Mudança puramente visual (frontend only)  
> **Objetivo:** Unificar a nomenclatura de todas as taxas de pacote para o rótulo genérico "Control Fee" na jornada do aluno.  
> **Valores financeiros:** NÃO ALTERADOS ($1800 e $500 permanecem iguais)

---

## 🛠 Checklist de Reversão

Use esta lista para confirmar que cada ponto foi revertido:

- [ ] `src/components/ScholarshipDetailModal.tsx` — variável `fixedFees`
- [ ] `src/pages/StudentOnboarding/components/DocumentsUploadStep.tsx` — objeto `DOCUMENT_LABELS`
- [ ] `src/pages/StudentOnboarding/components/DocumentsUploadStep.tsx` — bloco do card financeiro (linha ~874)
- [ ] `src/pages/StudentOnboarding/components/ReinstatementFeeStep.tsx` — título do card (linha ~453)
- [ ] `src/pages/StudentOnboarding/components/ReinstatementFeeStep.tsx` — rótulo de valor (linha ~468)
- [ ] `src/pages/StudentOnboarding/components/UniversityDocumentsStep.tsx` — variáveis `feeName`, `sidebarSteps` e props de labels (linhas ~191, ~318, ~330, ~701, ~731)

---

## 1. ScholarshipDetailModal.tsx

**Arquivo:** `src/components/ScholarshipDetailModal.tsx`  
**Localização:** Linha ~114 — variável `fixedFees`  
**Como encontrar:** CTRL+F → `16/04/2026` ou `fixedFees`

### O que está no código HOJE:

```tsx
// 16/04/2026: Alterado visualmente para aparecer apenas 'Control Fee' independentemente do tipo de pacote 
// para simplificar a visualização do usuário no modal de detalhes.
const fixedFees = (() => {
  if (!processType) {
    return [
      { name: 'Control Fee', amount: 1800, details: t('scholarshipsPage.modal.i539PackageDescription', ...) },
      { name: 'Control Fee', amount: 1800, details: t('scholarshipsPage.modal.ds160PackageDescription', ...) },
      { name: 'Control Fee', amount: 500,  details: t('scholarshipsPage.modal.reinstatementPackageDescription') },
    ];
  }
  if (processType === 'initial') {
    return [{ name: 'Control Fee', amount: 1800, details: t('scholarshipsPage.modal.ds160PackageDescription', ...) }];
  }
  if (processType === 'change_of_status') {
    return [{ name: 'Control Fee', amount: 1800, details: t('scholarshipsPage.modal.i539PackageDescription', ...) }];
  }
  if (processType === 'transfer') {
    if (visaTransferActive === false) {
      return [
        { name: 'Control Fee', amount: 500,  details: t('scholarshipsPage.modal.reinstatementPackageDescription') },
        { name: 'Control Fee', amount: 1800, details: t('scholarshipsPage.modal.i539PackageDescription', ...) },
      ];
    }
    return [];
  }
  return [];
})();
```

### Como reverter (substitua CADA `'Control Fee'` pelo nome original):

```tsx
const fixedFees = (() => {
  if (!processType) {
    return [
      { name: t('scholarships:scholarshipsPage.modal.i539COSPackage'),      amount: 1800, details: t('scholarshipsPage.modal.i539PackageDescription', ...) },
      { name: t('scholarships:scholarshipsPage.modal.ds160Package'),         amount: 1800, details: t('scholarshipsPage.modal.ds160PackageDescription', ...) },
      { name: t('scholarships:scholarshipsPage.modal.reinstatementPackage'), amount: 500,  details: t('scholarshipsPage.modal.reinstatementPackageDescription') },
    ];
  }
  if (processType === 'initial') {
    return [{ name: t('scholarships:scholarshipsPage.modal.ds160Package'), amount: 1800, details: t('scholarshipsPage.modal.ds160PackageDescription', ...) }];
  }
  if (processType === 'change_of_status') {
    return [{ name: t('scholarships:scholarshipsPage.modal.i539COSPackage'), amount: 1800, details: t('scholarshipsPage.modal.i539PackageDescription', ...) }];
  }
  if (processType === 'transfer') {
    if (visaTransferActive === false) {
      return [
        { name: t('scholarships:scholarshipsPage.modal.reinstatementPackage'), amount: 500,  details: t('scholarshipsPage.modal.reinstatementPackageDescription') },
        { name: t('scholarships:scholarshipsPage.modal.i539Package'),           amount: 1800, details: t('scholarshipsPage.modal.i539PackageDescription', ...) },
      ];
    }
    return [];
  }
  return [];
})();
```

> ⚠️ O namespace das traduções é `scholarships:`. Confirme que o componente importa `useTranslation(['scholarships'])`.

---

## 2. DocumentsUploadStep.tsx — DOCUMENT_LABELS

**Arquivo:** `src/pages/StudentOnboarding/components/DocumentsUploadStep.tsx`  
**Localização:** Linha ~77 — objeto `DOCUMENT_LABELS`  
**Como encontrar:** CTRL+F → `DOCUMENT_LABELS`

### Como está HOJE:

```tsx
const DOCUMENT_LABELS: Record<string, string> = {
  passport:      t('studentDashboard.documentsAndScholarshipChoice.passport') || 'Passport',
  diploma:       t('studentDashboard.documentsAndScholarshipChoice.diploma') || 'High School Diploma',
  funds_proof:   t('studentDashboard.documentsAndScholarshipChoice.fundsProof') || 'Proof of Funds',
  ds160:         'Control Fee',            // ← ALTERADO em 16/04/2026
  i539:          'Control Fee',            // ← ALTERADO em 16/04/2026
  reinstatement: 'Control Fee',            // ← ALTERADO em 16/04/2026
};
```

### Como reverter:

```tsx
const DOCUMENT_LABELS: Record<string, string> = {
  passport:      t('studentDashboard.documentsAndScholarshipChoice.passport') || 'Passport',
  diploma:       t('studentDashboard.documentsAndScholarshipChoice.diploma') || 'High School Diploma',
  funds_proof:   t('studentDashboard.documentsAndScholarshipChoice.fundsProof') || 'Proof of Funds',
  ds160:         t('scholarships:scholarshipsPage.modal.ds160Package') || 'DS-160 Package',
  i539:          t('scholarships:scholarshipsPage.modal.i539Package') || 'I-539 Package',
  reinstatement: t('scholarships:scholarshipsPage.modal.reinstatementPackage') || 'Reinstatement Package',
};
```

---

## 3. DocumentsUploadStep.tsx — Card Financeiro

**Arquivo:** `src/pages/StudentOnboarding/components/DocumentsUploadStep.tsx`  
**Localização:** Linha ~874 — bloco `{/* I539, DS160 or Reinstatement Package Fee */}`  
**Como encontrar:** CTRL+F → `I539, DS160 or Reinstatement Package Fee`

### Como está HOJE:

```tsx
{/* I539, DS160 or Reinstatement Package Fee */}
{(() => {
  const pType = app.student_process_type || processType;
  if (!pType) return null;

  const visaTransferActive = userProfile?.visa_transfer_active;
  const fees = [];

  if (pType === 'initial') {
    fees.push({ name: 'Control Fee', amount: 1800 });
  } else if (pType === 'change_of_status') {
    fees.push({ name: 'Control Fee', amount: 1800 });
  } else if (pType === 'transfer' && visaTransferActive === false) {
    fees.push({ name: 'Control Fee', amount: 500 });
    fees.push({ name: 'Control Fee', amount: 1800 });
  }

  if (fees.length === 0) return null;

  return fees.map((f, idx) => (
    <div key={idx} className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200">
      <span className="text-xs text-slate-500 font-medium">{f.name}</span>
      <span className="text-blue-600 font-bold text-sm">{formatCurrency(f.amount)}</span>
    </div>
  ));
})()}
```

### Como reverter (substitua o `name` dentro de cada `push`):

```tsx
if (pType === 'initial') {
  fees.push({ name: t('scholarships:scholarshipsPage.modal.ds160Package'), amount: 1800 });
} else if (pType === 'change_of_status') {
  fees.push({ name: t('scholarships:scholarshipsPage.modal.i539COSPackage'), amount: 1800 });
} else if (pType === 'transfer' && visaTransferActive === false) {
  fees.push({ name: t('scholarships:scholarshipsPage.modal.reinstatementPackage'), amount: 500 });
  fees.push({ name: t('scholarships:scholarshipsPage.modal.i539Package'), amount: 1800 });
}
```

---

## 4. ReinstatementFeeStep.tsx — Título do Card

**Arquivo:** `src/pages/StudentOnboarding/components/ReinstatementFeeStep.tsx`  
**Localização:** Linha ~453  
**Como encontrar:** CTRL+F → `Control Fee` dentro deste arquivo

### Como está HOJE (linha ~453):

```tsx
) : (
  <h3 className="text-2xl font-black text-gray-900 truncate uppercase tracking-tight">
    Control Fee
  </h3>
)}
```

### Como reverter:

```tsx
) : (
  <h3 className="text-2xl font-black text-gray-900 truncate uppercase tracking-tight">
    {t('reinstatementFeeStep.feeLabel')}
  </h3>
)}
```

---

## 5. ReinstatementFeeStep.tsx — Rótulo de Valor

**Arquivo:** `src/pages/StudentOnboarding/components/ReinstatementFeeStep.tsx`  
**Localização:** Linha ~468 (logo após o bloco de exibição de preço)  
**Como encontrar:** CTRL+F → segunda ocorrência de `Control Fee` neste arquivo

### Como está HOJE (linha ~468):

```tsx
<span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Control Fee</span>
```

### Como reverter:

```tsx
<span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{t('reinstatementFeeStep.feeLabel')}</span>
```

---

## 6. UniversityDocumentsStep.tsx — My Applications

**Arquivo:** `src/pages/StudentOnboarding/components/UniversityDocumentsStep.tsx`  
**Localização:** Vários pontos (Linhas ~191, ~318, ~330, ~701, ~731)
**Como encontrar:** CTRL+F → `16/04/2026`

### O que está no código HOJE:

1.  **Variável `feeName` (Linha ~191):**
    ```tsx
    const feeName = 'Control Fee'; // 16/04/2026: Alterado visualmente para aparecer apenas 'Control Fee'...
    ```
2.  **Sidebar `sidebarSteps` (Linhas ~318 e ~330):**
    ```tsx
    title: 'Control Fee', // 16/04/2026: Alterado visualmente...
    ```
3.  **Componente `PackageFeeTab` (Linhas ~701 e ~731):**
    ```tsx
    feeLabel="Control Fee" // 16/04/2026: Alterado visualmente...
    ```

### Como reverter:

1.  **Reverter `feeName`:**
    ```tsx
    const feeName = showDs160Tab 
        ? t('scholarships:scholarshipsPage.modal.ds160Package') 
        : t('scholarships:scholarshipsPage.modal.i539COSPackage');
    ```
2.  **Reverter `sidebarSteps` (primeiro item):**
    ```tsx
    title: t('scholarships:scholarshipsPage.modal.ds160Package'),
    ```
3.  **Reverter `sidebarSteps` (segundo item):**
    ```tsx
    title: (studentProcessType === 'transfer' && userProfile?.visa_transfer_active === false)
        ? t('registration:studentOnboarding.stepper.steps.reinstatement_fee')
        : t('scholarships:scholarshipsPage.modal.i539COSPackage'),
    ```
4.  **Reverter `PackageFeeTab` (prop `feeLabel`):**
    ```tsx
    // Para ds160_package:
    feeLabel={t('scholarships:scholarshipsPage.modal.ds160Package')}
    
    // Para i539_cos_package:
    feeLabel={t('scholarships:scholarshipsPage.modal.i539COSPackage')}
    ```

---

## 📁 Onde estão as chaves de tradução (i18n)

As chaves usadas na reversão estão nos arquivos JSON de tradução em:

```
src/i18n/locales/pt/scholarships.json   ← Português
src/i18n/locales/en/scholarships.json   ← Inglês
src/i18n/locales/es/scholarships.json   ← Espanhol
```

**Chaves relevantes:**
- `scholarshipsPage.modal.ds160Package` → ex: "DS-160 Package"
- `scholarshipsPage.modal.i539Package` → ex: "I-539 Package"
- `scholarshipsPage.modal.i539COSPackage` → ex: "I-539 COS Package"
- `scholarshipsPage.modal.reinstatementPackage` → ex: "Reinstatement Package"

---

## 📝 Notas Técnicas Importantes

| Ponto | Detalhe |
|---|---|
| **Escopo** | Apenas visual. Nenhuma lógica de negócio, valor ou banco de dados foi alterado. |
| **Valores** | $1800 (pacotes DS-160 e I-539) e $500 (Reinstatement) permanecem inalterados. |
| **Stripe/Checkout** | Os `fee_type` no payload (`ds160_package`, `i539_cos_package`, `reinstatement_package`) não foram alterados. |
| **Descrições** | O campo `details` no `ScholarshipDetailModal` continua usando traduções dinâmicas para manter o contexto. |
| **Busca rápida** | CTRL+SHIFT+F no VSCode por `'Control Fee'` ou `16/04/2026` localiza todos os pontos alterados. |

---

*Documentação gerada em 16/04/2026 para garantir conformidade técnica e facilitar rollback.*
