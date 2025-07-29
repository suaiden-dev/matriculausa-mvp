# Integração com Endpoint Ngrok

## Visão Geral

Esta Edge Function (`send-to-ngrok-endpoint`) permite enviar dados para o endpoint ngrok `https://78f512a1bd0d.ngrok-free.app` automaticamente substituindo o `client_id` pelo `user_id` do usuário autenticado.

## Funcionalidades

### 🔄 Substituição Automática
- **client_id** → **user_id** (ID do usuário autenticado)
- Adiciona **timestamp** automático
- Adiciona **source** como "matricula-usa"

### 🔐 Autenticação
- Requer token JWT válido
- Extrai user_id automaticamente do token
- Valida autenticação antes do envio
- Inclui header `apikey` necessário para o endpoint ngrok

### 📤 Envio de Dados
- POST para `https://78f512a1bd0d.ngrok-free.app`
- Headers apropriados incluindo User-Agent e apikey
- Tratamento de erros e logs detalhados

## Como Usar

### 1. Deploy da Edge Function
```bash
supabase functions deploy send-to-ngrok-endpoint
```

### 2. Chamada do Frontend
```typescript
// Exemplo de uso
const { data, error } = await supabase.functions.invoke('send-to-ngrok-endpoint', {
  body: {
    client_id: "any_value", // Será substituído pelo user_id
    action: "user_login",
    data: {
      page: "dashboard",
      timestamp: new Date().toISOString()
    }
  }
});
```

### 3. Dados Enviados
```json
{
  "user_id": "c517248f-1711-4b5d-bf35-7cb5673ff8a5",
  "action": "user_login",
  "data": {
    "page": "dashboard",
    "timestamp": "2025-01-27T10:30:00.000Z"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "source": "matricula-usa"
}
```

### 4. Headers Enviados
```
Content-Type: application/json
apikey: dGZvZVNVQUlERU4yMDI1Y2VtZUd1aWxoZXJtZQ==01983e6f-48be-7f83-bcca-df30867edaf6
User-Agent: MatriculaUSA/1.0
```

## Estrutura da Requisição

### Parâmetros de Entrada
```typescript
interface NgrokRequest {
  client_id?: string;    // Será substituído por user_id
  user_id?: string;      // Opcional, será sobrescrito
  [key: string]: any;    // Outros parâmetros dinâmicos
}
```

### Resposta de Sucesso
```json
{
  "success": true,
  "message": "Data sent to ngrok endpoint successfully",
  "ngrokStatus": 200,
  "ngrokResponse": "OK",
  "sentData": {
    "user_id": "c517248f-1711-4b5d-bf35-7cb5673ff8a5",
    "action": "user_login",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "source": "matricula-usa"
  }
}
```

### Resposta de Erro
```json
{
  "success": false,
  "error": "User not authenticated"
}
```

## Casos de Uso

### 1. Tracking de Usuário
```typescript
// Enviar dados de navegação
await supabase.functions.invoke('send-to-ngrok-endpoint', {
  body: {
    client_id: "tracking",
    event: "page_view",
    page: "scholarship_application",
    scholarship_id: "123"
  }
});
```

### 2. Logs de Ação
```typescript
// Log de ações do usuário
await supabase.functions.invoke('send-to-ngrok-endpoint', {
  body: {
    client_id: "action_log",
    action: "document_upload",
    document_type: "transcript",
    file_size: 1024000
  }
});
```

### 3. Analytics
```typescript
// Dados de analytics
await supabase.functions.invoke('send-to-ngrok-endpoint', {
  body: {
    client_id: "analytics",
    metric: "application_started",
    university_id: "456",
    student_type: "undergraduate"
  }
});
```

## Monitoramento

### Logs Importantes
- `📤 send-to-ngrok-endpoint: Received request`
- `📤 send-to-ngrok-endpoint: Sending to ngrok`
- `✅ Successfully sent to ngrok`
- `❌ Failed to send to ngrok`

### Verificação
```bash
# Ver logs da função
supabase functions logs send-to-ngrok-endpoint

# Procurar por envios
grep "Sending to ngrok" logs.txt
grep "Successfully sent to ngrok" logs.txt
```

## Configuração

### Variáveis de Ambiente
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_ANON_KEY`: Chave anônima do Supabase

### Endpoint Ngrok
- **URL**: `https://78f512a1bd0d.ngrok-free.app`
- **Método**: POST
- **Content-Type**: application/json

## Segurança

### Autenticação
- ✅ Requer token JWT válido
- ✅ Valida usuário antes do envio
- ✅ Não expõe dados sensíveis

### Validação
- ✅ Verifica headers de autorização
- ✅ Valida estrutura dos dados
- ✅ Trata erros de rede

## Troubleshooting

### Problema: "User not authenticated"
1. Verificar se o token JWT é válido
2. Verificar se o usuário está logado
3. Verificar headers de autorização

### Problema: "Ngrok endpoint error"
1. Verificar se o endpoint ngrok está ativo
2. Verificar conectividade de rede
3. Verificar formato dos dados enviados

### Problema: Timeout
1. Verificar se o ngrok está respondendo
2. Verificar tamanho dos dados enviados
3. Verificar configurações de timeout

## Exemplo Completo

### Frontend (React)
```typescript
import { useAuth } from '../hooks/useAuth';

const MyComponent = () => {
  const { user } = useAuth();

  const sendToNgrok = async (data: any) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-to-ngrok-endpoint', {
        body: {
          client_id: "tracking",
          event: "button_click",
          button_id: "apply_now",
          ...data
        }
      });

      if (error) {
        console.error('Erro ao enviar para ngrok:', error);
        return;
      }

      console.log('Dados enviados com sucesso:', result);
    } catch (err) {
      console.error('Erro inesperado:', err);
    }
  };

  return (
    <button onClick={() => sendToNgrok({ page: 'homepage' })}>
      Enviar Dados
    </button>
  );
};
```

### Backend (Node.js)
```javascript
const sendToNgrok = async (data) => {
  const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/send-to-ngrok-endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      client_id: "server_tracking",
      event: "api_call",
      endpoint: "/api/scholarships",
      ...data
    })
  });

  return response.json();
};
``` 