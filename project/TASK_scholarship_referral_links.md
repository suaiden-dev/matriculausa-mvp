# TASK: Links de Matrícula Personalizada com Pré-Seleção de Bolsas

**Status:** Aguardando Execução  
**Prioridade:** Alta  
**Estimativa:** 3-4 horas de implementação

---

## Objetivo

Permitir que vendedores gerem links especializados de cadastro que, ao serem usados por um
novo aluno, pré-selecionam automaticamente até 4 bolsas definidas pelo vendedor no momento da
criação da conta (sem esperar o pagamento da taxa de seleção).

**URL resultante do link:**
```
/selection-fee-registration?sref=CODIGO_VENDEDOR&scholarships=UUID1,UUID2,UUID3,UUID4
```

---

## Esclarecimentos e Decisões de Design

| Questão | Decisão |
|---|---|
| Onde fica a ferramenta? | Nova seção exclusiva "Gerador de Links" no Seller Dashboard |
| Quais bolsas podem ser selecionadas? | Qualquer bolsa ativa (`is_active = true AND is_test = false`) |
| Status das aplicações criadas? | `pending` — fluxo normal de análise |
| Quando criar as aplicações? | No momento exato do cadastro da conta (sem esperar pagamento) |
| Histórico de links? | Sim — persistido no banco (nova tabela `seller_generated_links`) |
| Limite de bolsas? | Até 4 (máximo) |
| O `?sref=` dá desconto? | **NÃO** — o `?sref=` é rastreamento puro, vincula ao vendedor sem desconto. O `?ref=` é que dá desconto de $50. |
| `seller_id` nas aplicações? | Sim — buscar seller pelo `sref` code e inserir em `scholarship_applications.seller_id` |

> **IMPORTANTE sobre sref:** O parâmetro `?sref=CODE` já existente no sistema é rastreamento sem
> desconto. Ele registra `referred_by_seller_id` no perfil do aluno e marca `no_referral_discount = true`.
> O aluno pagará o preço cheio ($400). Isso é o comportamento correto e desejado para este link.

---

## Questão Aberta (Pesquisar no Início da Execução)

### Q1: Como obter `user_profiles.id` após o registro?

O `student_id` em `scholarship_applications` referencia `user_profiles.id` (PK da tabela), 
**não** o `auth.uid()`. Antes de fazer o `INSERT` das bolsas, precisamos buscar o `user_profiles.id`
do aluno recém-criado.

**O que verificar no início da execução:**
- Ver o retorno da função `register()` no hook `useAuth.ts` — ela retorna o perfil completo?
- Se não, executar um `SELECT id FROM user_profiles WHERE user_id = auth.uid()` logo após o registro.

---

## Banco de Dados

### Nova Tabela: `seller_generated_links`

```sql
CREATE TABLE seller_generated_links (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id     UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  scholarship_ids UUID[] NOT NULL,           -- Array de até 4 IDs de bolsas
  generated_url TEXT NOT NULL,              -- URL completa gerada
  label         TEXT,                       -- Apelido opcional dado pelo vendedor
  use_count     INTEGER NOT NULL DEFAULT 0, -- Incrementado a cada cadastro via esse link
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS: seller só vê seus próprios links
ALTER TABLE seller_generated_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage own links"
  ON seller_generated_links
  FOR ALL
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all links"
  ON seller_generated_links
  FOR SELECT
  USING (is_admin());
```

> Esta tabela é simples o suficiente para não precisar de uma migração complexa.
> Criar via `apply_migration` antes de qualquer código frontend.

---

## Fase 1 — Banco de Dados

**Ações:**
1. Executar a migration SQL acima criando `seller_generated_links`
2. Verificar que `scholarship_applications` já aceita `seller_id` nullable (✅ confirmado)
3. Verificar RLS de INSERT em `scholarship_applications` para usuário autenticado (✅ confirmado — política "Allow users to insert own applications" existe)

---

## Fase 2 — Dashboard do Vendedor: Gerador de Links

### Arquivo Novo: `src/pages/SellerDashboard/ScholarshipLinkGenerator.tsx`

**Estrutura de estados:**
```tsx
const [allScholarships, setAllScholarships] = useState<Scholarship[]>([]);
const [selectedIds, setSelectedIds] = useState<string[]>([]);     // máx 4
const [searchQuery, setSearchQuery] = useState('');
const [label, setLabel] = useState('');
const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
const [history, setHistory] = useState<GeneratedLink[]>([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [copied, setCopied] = useState(false);
```

**Query de bolsas:**
```ts
supabase
  .from('scholarships')
  .select('id, title, amount, scholarshipvalue, scholarship_type, universities(name)')
  .eq('is_active', true)
  .eq('is_test', false)
  .order('title', { ascending: true });
```

**Query de histórico:**
```ts
supabase
  .from('seller_generated_links')
  .select('*, scholarships:scholarship_ids')
  .eq('seller_id', sellerProfile.id)
  .order('created_at', { ascending: false })
  .limit(20);
```

**Lógica de seleção:**
- Clicar em uma bolsa adiciona à seleção se `selectedIds.length < 4`
- Se já está selecionada, remove
- Botão de bolsa fica desabilitado (cinza) quando `selectedIds.length === 4` e a bolsa não está selecionada
- Contador visual: "X/4 bolsas selecionadas"

**Lógica de geração:**
```ts
const handleGenerate = async () => {
  if (selectedIds.length === 0) return;
  
  const scholarshipsParam = selectedIds.join(',');
  const url = `${window.location.origin}/selection-fee-registration?sref=${sellerProfile.referral_code}&scholarships=${scholarshipsParam}`;
  
  setSaving(true);
  await supabase.from('seller_generated_links').insert({
    seller_id: sellerProfile.id,
    scholarship_ids: selectedIds,
    generated_url: url,
    label: label || null,
  });
  setSaving(false);
  
  setGeneratedUrl(url);
  // Recarregar histórico
};
```

**Layout visual:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔗 Gerador de Links Personalizados                         │
│  Selecione até 4 bolsas para pré-cadastrar seu lead         │
├─────────────────────────────────────────────────────────────┤
│  [Buscar bolsas...            ]    [2/4 selecionadas]       │
│                                                              │
│  ┌──────────────────┐ ┌──────────────────┐                  │
│  │ ✅ Nome Bolsa 1   │ │ ☐ Nome Bolsa 2   │                  │
│  │ Universidade X   │ │ Universidade Y   │                  │
│  │ $4.500/ano       │ │ $3.800/ano       │                  │
│  └──────────────────┘ └──────────────────┘                  │
│                                                              │
│  Apelido do link (opcional): [_______________]              │
│                                                              │
│  [          GERAR LINK          ]                           │
├─────────────────────────────────────────────────────────────┤
│  Link gerado:                                               │
│  [https://matriculausa.com/selection-fee...] [📋 Copiar]   │
├─────────────────────────────────────────────────────────────┤
│  Histórico de Links                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ "Lead Enfermagem"  • 3 bolsas  • 2 usos  • 21/04 [📋]│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Alterações em `SellerDashboardLayout.tsx`

**Adicionar no array `baseItems` de `getSidebarItems()`:**
```ts
{ id: 'link-generator', label: 'Gerador de Links', icon: Link2, path: '/seller/dashboard/link-generator', badge: null },
```
> Adicionar `Link2` ao import do lucide-react. Posicionado após 'affiliate-tools'.

**Atualizar `getActiveTab()`:**
```ts
if (path.includes('/link-generator')) return 'link-generator';
```

### Alterações em `index.tsx`

**Adicionar ao tipo do `currentView`:**
```ts
useState<'overview' | 'students' | 'student-details' | 'affiliate-tools' | 'performance' | 'profile' | 'link-generator'>
```

**Adicionar import:**
```ts
import ScholarshipLinkGenerator from './ScholarshipLinkGenerator';
```

**Adicionar case no switch do `currentViewComponent`:**
```ts
case 'link-generator':
  return (
    <ScholarshipLinkGenerator sellerProfile={sellerProfile} />
  );
```

---

## Fase 3 — QuickRegistration: Captura, Exibição e Inserção

### Arquivo: `src/pages/QuickRegistration.tsx`

#### Novos estados:
```ts
const [preSelectedScholarshipIds, setPreSelectedScholarshipIds] = useState<string[]>([]);
const [preSelectedScholarships, setPreSelectedScholarships] = useState<PreSelectedScholarship[]>([]);
```

#### Interface auxiliar:
```ts
interface PreSelectedScholarship {
  id: string;
  title: string;
  university_name: string;
  scholarshipvalue: number | null;
}
```

#### No `useEffect` de parsing de URL (onde já lê `sref`, `ref`, `coupon`):

Adicionar ao bloco de leitura de params:
```ts
// Ler bolsas pré-selecionadas pelo vendedor
const scholarshipsParam = params.get('scholarships');
if (scholarshipsParam) {
  // Validar — aceitar apenas UUIDs válidos, máx 4
  const ids = scholarshipsParam
    .split(',')
    .map(id => id.trim())
    .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    .slice(0, 4);
  
  if (ids.length > 0) {
    setPreSelectedScholarshipIds(ids);
    // Buscar dados para exibição
    fetchPreSelectedScholarships(ids);
  }
}
```

#### Função `fetchPreSelectedScholarships`:
```ts
const fetchPreSelectedScholarships = async (ids: string[]) => {
  const { data } = await supabase
    .from('scholarships')
    .select('id, title, scholarshipvalue, universities(name)')
    .in('id', ids)
    .eq('is_active', true);
  
  if (data) {
    setPreSelectedScholarships(
      data.map(s => ({
        id: s.id,
        title: s.title,
        university_name: s.universities?.[0]?.name || 'Universidade Parceira',
        scholarshipvalue: s.scholarshipvalue,
      }))
    );
  }
};
```

#### Banner visual (adicionar no JSX, acima do formulário principal):
```tsx
{preSelectedScholarships.length > 0 && (
  <div className="mb-6 p-4 rounded-2xl border-2 border-blue-200 bg-blue-50">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-2xl">🎓</span>
      <div>
        <p className="font-bold text-blue-900 text-sm">Bolsas pré-selecionadas para você!</p>
        <p className="text-xs text-blue-600">Ao se cadastrar, você já entrará no processo seletivo destas bolsas.</p>
      </div>
    </div>
    <div className="space-y-2">
      {preSelectedScholarships.map(s => (
        <div key={s.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-blue-100">
          <div>
            <p className="text-sm font-semibold text-slate-800">{s.title}</p>
            <p className="text-xs text-slate-500">{s.university_name}</p>
          </div>
          {s.scholarshipvalue && (
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
              ${s.scholarshipvalue.toLocaleString()}/ano
            </span>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

#### Em `handleRegisterAndPay` — após criação bem-sucedida da conta:

Localizar o ponto após o `register()` retornar sucesso e o usuário estar logado. Em seguida:

```ts
// PASSO 1: Obter o user_profiles.id (PK da tabela) do novo usuário
// ATENÇÃO: student_id em scholarship_applications = user_profiles.id, NÃO o auth.uid()
if (preSelectedScholarshipIds.length > 0) {
  try {
    // Buscar o profile ID recém-criado
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', newUser.id)  // newUser.id = auth.uid()
      .maybeSingle();
    
    if (profileData?.id) {
      // Buscar o seller_id pelo código sref para vincular nas aplicações
      let sellerId: string | null = null;
      const srefCode = new URLSearchParams(location.search).get('sref');
      if (srefCode) {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('id')
          .eq('referral_code', srefCode.toUpperCase())
          .maybeSingle();
        sellerId = sellerData?.id || null;
      }

      // Incrementar use_count no link gerado (se houver)
      // Por simplicidade, o link está na URL — não temos um ID único do link aqui.
      // O use_count será tratado via trigger ou função futura.

      // Inserir as bolsas pré-selecionadas
      const inserts = preSelectedScholarshipIds.map(scholarshipId => ({
        student_id: profileData.id,    // user_profiles.id (PK)
        scholarship_id: scholarshipId,
        status: 'pending' as const,
        seller_id: sellerId,           // null se não houver sref válido
      }));

      const { error: insertError } = await supabase
        .from('scholarship_applications')
        .insert(inserts);

      if (insertError) {
        // Não bloquear o fluxo — logar e continuar
        console.error('[QuickRegistration] Erro ao inserir bolsas pré-selecionadas:', insertError);
      }
    }
  } catch (err) {
    // Não bloquear o fluxo principal de cadastro
    console.error('[QuickRegistration] Erro no fluxo de bolsas pré-selecionadas:', err);
  }
}
```

> **Regra de ouro:** Se a inserção das bolsas falhar por qualquer motivo, o fluxo principal de cadastro
> NÃO deve ser interrompido. O aluno ainda vai criar a conta e pagar normalmente. O erro deve ser
> apenas logado.

---

## Fase 4 — Incremento de `use_count` no Histórico

Quando um aluno se cadastrar via link, incrementar `use_count` na tabela `seller_generated_links`.

**Abordagem:** Após o `INSERT` bem-sucedido das aplicações, tentar identificar o link pelo conjunto
de IDs de bolsas + seller_id e incrementar:

```ts
if (!insertError && sellerId) {
  // Encontrar o link mais recente deste seller com estes scholarship_ids
  await supabase.rpc('increment_link_use_count', {
    p_seller_id: sellerId,
    p_scholarship_ids: preSelectedScholarshipIds,
  });
}
```

**RPC SQL:**
```sql
CREATE OR REPLACE FUNCTION increment_link_use_count(
  p_seller_id UUID,
  p_scholarship_ids UUID[]
) RETURNS VOID AS $$
BEGIN
  UPDATE seller_generated_links
  SET use_count = use_count + 1
  WHERE seller_id = p_seller_id
    AND scholarship_ids @> p_scholarship_ids       -- contém todos os IDs
    AND p_scholarship_ids @> scholarship_ids       -- é contido por todos os IDs (igualdade de set)
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> Esta RPC é opcional para o MVP. Se não for criada, o `use_count` permanece em 0 e pode ser
> implementado depois sem impacto no fluxo principal.

---

## Fase 5 — Onboarding: Nenhuma Alteração Necessária ✅

A lógica em `useOnboardingProgress.tsx` já verifica:
```ts
scholarshipsSelected = !!(
  currentCart.length > 0 ||
  (appsData && appsData.length > 0) ||      // ← JÁ COBRE NOSSO CASO
  !!freshProfile.selected_scholarship_id
);
```

Como as aplicações já foram inseridas antes do primeiro passo do onboarding, `appsData.length > 0`
será `true` e o sistema irá automaticamente pular a etapa `scholarship_selection`, avançando para
`process_type` → `documents_upload`.

---

## Ordem de Execução

```
[1] Criar migration da tabela `seller_generated_links` (Supabase MCP)
[2] Criar RPC `increment_link_use_count` (Supabase MCP)
[3] Criar ScholarshipLinkGenerator.tsx (novo arquivo)
[4] Alterar SellerDashboardLayout.tsx (novo item na nav)
[5] Alterar index.tsx do SellerDashboard (novo case + import)
[6] Alterar QuickRegistration.tsx (captura + banner + insert)
[7] Verificar função register() em useAuth.ts para confirmar como obter user.id
[8] Testar fluxo ponta a ponta em localhost
```

---

## Critérios de Aceite

- [ ] Vendedor consegue buscar bolsas por nome no gerador
- [ ] Vendedor consegue selecionar até 4 bolsas (5ª fica bloqueada)
- [ ] Link é gerado e copiado com 1 clique
- [ ] Histórico de links gerados aparece na tela com `use_count`
- [ ] Aluno que abre o link vê o banner com as bolsas antes de preencher o formulário
- [ ] Ao criar conta via esse link, as bolsas aparecem na tabela `scholarship_applications` com `status = pending`
- [ ] O vendedor fica vinculado nas aplicações via `seller_id`
- [ ] Se o insert das bolsas falhar, o cadastro do aluno ainda é concluído normalmente
- [ ] No onboarding, o aluno **não vê** a etapa de escolha de bolsas (é pulada automaticamente)
- [ ] O admin consegue ver as bolsas já registradas para o aluno na tela de detalhes do Admin Dashboard
