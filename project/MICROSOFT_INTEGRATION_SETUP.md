# Configuração da Integração Microsoft

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Microsoft Azure App Registration
VITE_AZURE_CLIENT_ID=your_client_id_here
VITE_AZURE_TENANT_ID=your_tenant_id_here
VITE_AZURE_REDIRECT_URI=http://localhost:5173

# Microsoft Graph API
VITE_GRAPH_SCOPES=User.Read,Mail.Read,Mail.Send,offline_access
```

## Configuração no Azure Portal

### 1. Criar Registro de Aplicação
1. Acesse o [Portal do Azure](https://portal.azure.com)
2. Vá para **Azure Active Directory** > **Registros de aplicativo**
3. Clique em **Novo registro**
4. Configure:
   - **Nome**: Matricula USA Microsoft Integration
   - **Tipos de conta**: Contas em qualquer diretório organizacional e contas pessoais da Microsoft
   - **URI de redirecionamento**: `http://localhost:5173` (para desenvolvimento)

### 2. Configurar Permissões
1. No registro da aplicação, vá para **Permissões de API**
2. Clique em **Adicionar uma permissão**
3. Selecione **Microsoft Graph**
4. Escolha **Permissões delegadas**
5. Adicione:
   - `User.Read`
   - `Mail.Read`
   - `Mail.Send`
   - `offline_access`
6. Clique em **Conceder consentimento do administrador**

### 3. Obter Credenciais
1. No menu lateral, clique em **Visão geral**
2. Copie:
   - **ID do aplicativo (cliente)** → `VITE_AZURE_CLIENT_ID`
   - **ID do diretório (locatário)** → `VITE_AZURE_TENANT_ID`

## Como Usar

### 1. Envolver a Aplicação com MSAL Provider

No seu arquivo principal (ex: `App.tsx` ou `main.tsx`):

```tsx
import { MsalProviderWrapper } from './providers/MsalProvider';

function App() {
  return (
    <MsalProviderWrapper>
      {/* Sua aplicação existente */}
    </MsalProviderWrapper>
  );
}
```

### 2. Usar o Componente de Integração

```tsx
import MicrosoftEmailIntegration from './components/Microsoft/MicrosoftEmailIntegration';

function EmailPage() {
  return <MicrosoftEmailIntegration />;
}
```

### 3. Usar Componentes Individuais

```tsx
import MicrosoftLoginButton from './components/Microsoft/LoginButton';
import MicrosoftUserProfile from './components/Microsoft/UserProfile';
import MicrosoftEmailList from './components/Microsoft/EmailList';

function MyComponent() {
  return (
    <div>
      <MicrosoftLoginButton />
      <MicrosoftUserProfile />
      <MicrosoftEmailList onEmailSelect={(email) => console.log(email)} />
    </div>
  );
}
```

## Funcionalidades Disponíveis

- ✅ **Autenticação Microsoft**: Login/logout seguro
- ✅ **Listar emails**: Caixa de entrada com filtros
- ✅ **Visualizar emails**: Conteúdo completo HTML/Texto
- ✅ **Enviar emails**: Composer com CC/BCC
- ✅ **Responder emails**: Reply direto
- ✅ **Perfil do usuário**: Dados Microsoft
- ✅ **Estados de leitura**: Lido/não lido
- ✅ **Interface responsiva**: Mobile e desktop

## Troubleshooting

### Erro de Autenticação
- Verifique se as variáveis de ambiente estão corretas
- Confirme se o URI de redirecionamento está configurado no Azure
- Verifique se as permissões foram concedidas

### Emails não carregam
- Verifique se a conta tem permissões para acessar emails
- Confirme se a aplicação tem as permissões necessárias no Azure
- Verifique os logs do console para erros específicos

### Problemas de CORS
- Certifique-se de que está executando na porta correta
- Verifique a configuração do URI de redirecionamento
- Para produção, configure o domínio correto no Azure
