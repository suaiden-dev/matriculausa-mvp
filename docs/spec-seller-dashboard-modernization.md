# Spec: Modernização do Seller Dashboard

## Contexto

O Seller Dashboard está visualmente desatualizado — usa o padrão antigo com azul (`blue-600`), bordas desnecessárias nos itens de nav e navegação por state. O Agency Dashboard (recentemente modernizado) é a referência visual e estrutural. O objetivo é igualar o visual e a estrutura sem alterar funcionalidades existentes.

---

## Análise Comparativa

### Seller Dashboard (atual — desatualizado)

**Arquivo de layout:** `project/src/pages/SellerDashboard/SellerDashboardLayout.tsx`

**Problemas identificados:**
- Usa `bg-blue-600` em vez do navy padrão `#05294E`
- Nav item ativo tem `border border-blue-500` (Agency não tem border)
- Nav item hover tem `hover:border hover:border-blue-200` (desnecessário)
- Search bar presente no topbar (Agency removeu)
- Navegação por `useState` + switch/case em vez de `<Routes>`
- Badge "Seller Access" com `Shield` icon — visual elaborado desnecessário
- Avatar e ícones em `bg-blue-600`

### Agency Dashboard (referência — moderno)

**Arquivo de layout:** `project/src/pages/AgencyDashboard/AgencyDashboardLayout.tsx`

**Padrão visual:**
- Cor primária: `bg-[#05294E]` (dark navy)
- Nav item ativo: `bg-[#05294E] text-white shadow-lg` (sem borders)
- Nav item hover: `bg-slate-100`
- Sem search bar no topbar
- Navegação via `<Routes>` nested + `<Link>` na sidebar
- Status section simples: logo/ícone + nome + email, sem badge

---

## Mudanças a Implementar

### 1. Paleta de cores

| Elemento | Atual | Novo |
|----------|-------|------|
| Nav item ativo | `bg-blue-600` | `bg-[#05294E]` |
| Nav item hover | `bg-blue-50` | `bg-slate-100` |
| Avatar / ícone | `bg-blue-600` | `bg-[#05294E]` |
| Badge "Seller Access" | `bg-blue-100 text-blue-700 border-blue-200` | Remover ou simplificar |

### 2. Nav items — remover bordas

```tsx
// Antes (Seller)
className={isActive
  ? 'bg-blue-600 text-white shadow-lg border border-blue-500'
  : 'text-slate-600 hover:bg-blue-50 hover:border hover:border-blue-200'
}

// Depois (padrão Agency)
className={isActive
  ? 'bg-[#05294E] text-white shadow-lg'
  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
}
```

### 3. Search bar no topbar

Remover o campo de busca do header — Agency não tem, simplifica o topbar.

### 4. Navegação: state → Routes

```tsx
// Antes (index.tsx) — state-based
const [currentView, setCurrentView] = useState('overview');
// ... switch/case renderizando componente

// Depois — Routes-based (igual Agency)
<Routes>
  <Route index element={<Overview />} />
  <Route path="my-students" element={<MyStudents />} />
  <Route path="affiliate-tools" element={<AffiliateTools />} />
  <Route path="performance" element={<Performance />} />
  <Route path="profile" element={<ProfileSettings />} />
</Routes>
```

### 5. Status section do sidebar

```tsx
// Antes — badge elaborado
<div className="bg-blue-600 rounded-xl">
  <DollarSign />
</div>
<span className="bg-blue-100 text-blue-700 border border-blue-200">
  <Shield /> Seller Access
</span>

// Depois — simples, igual Agency
<div className="bg-[#05294E] rounded-xl">
  <User />
</div>
<div>
  <h3>{user.name}</h3>
  <p>{user.email}</p>
</div>
```

---

## Seções/Páginas (manter todas, sem alterações funcionais)

| Seção | Path atual | Status |
|-------|-----------|--------|
| Overview | `/seller/dashboard` | Manter |
| My Students | `/seller/dashboard/my-students` | Manter |
| Affiliate Tools | `/seller/dashboard/affiliate-tools` | Manter |
| Performance | `/seller/dashboard/performance` | Manter |
| Profile Settings | `/seller/dashboard/profile` | Manter |

> Payment Management **não** será adicionado nesta fase.

---

## Arquivos a Modificar

| Arquivo | O que muda |
|---------|-----------|
| `project/src/pages/SellerDashboard/SellerDashboardLayout.tsx` | Cores, nav borders, search bar, status section |
| `project/src/pages/SellerDashboard/index.tsx` | Converter state-based → Routes-based |

---

## Referência Visual

**Agency Dashboard** (estado final desejado para o Seller):
- Sidebar: branca, `shadow-xl`, logo no topo
- Nav items: `rounded-xl`, ativo em `#05294E`, hover em `slate-100`
- Topbar: branca, `border-b border-slate-200`, notificações + user menu
- Main content: `bg-slate-50`, padding `p-6`

---

## Verificação (pós-implementação)

1. Logar como seller → sidebar aparece em navy `#05294E` nos itens ativos
2. Navegar entre seções via URL → URLs mudam corretamente (`/seller/dashboard/my-students`, etc.)
3. Nenhum `border` visível nos itens de nav
4. Search bar não aparece no topbar
5. Status section simples — sem badge "Seller Access"
6. Logout funciona normalmente
7. Mobile: sidebar abre/fecha corretamente
