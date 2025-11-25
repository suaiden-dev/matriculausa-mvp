# Guia Rápido: Links de Rastreamento

## URL Base

Sempre comece com esta URL base:
```
https://matriculausa.com/register?ref=BRANT
```

O parâmetro `ref=BRANT` é obrigatório e deve estar sempre presente.

## Parâmetros UTM

Após o `ref=BRANT`, você pode adicionar parâmetros UTM para rastrear de onde veio o tráfego.

### utm_source

Sempre use `utm_source=brant` para identificar que o tráfego veio da Brant Immigration.

### utm_medium

Escolha o meio de marketing baseado no canal que você está usando:
- Google Ads: use `utm_medium=cpc`
- Facebook ou Instagram: use `utm_medium=social`
- Email: use `utm_medium=email`
- WhatsApp: use `utm_medium=whatsapp`
- Site próprio: use `utm_medium=website`
- Link compartilhado por cliente: use `utm_medium=organic`

### utm_campaign

Nome da sua campanha. Use apenas letras, números e underscores, sem espaços.
Exemplos: `utm_campaign=spring2024`, `utm_campaign=black_friday`, `utm_campaign=newsletter_janeiro`

## Parâmetro de Cliente (client)

Quando um cliente compartilha o link com outra pessoa, você pode adicionar o nome ou email do cliente na URL para rastrear quem compartilhou.

### Como usar o parâmetro client

Adicione `client=` seguido do nome ou email do cliente. O sistema detecta automaticamente se é email (contém @) ou nome.

Exemplo com nome do cliente:
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=organic&gs=1&client=Maria%20Silva
```

Exemplo com email do cliente:
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=organic&gs=1&client=maria@example.com
```

Quando usar o parâmetro client, sempre adicione também `gs=1` para marcar como tráfego orgânico (compartilhado).

## Exemplos Completos

Link para Google Ads:
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=cpc&utm_campaign=google_ads
```

Link para Facebook Ads:
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=social&utm_campaign=facebook_ads
```

Link para Email:
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=email&utm_campaign=newsletter
```

Link compartilhado por cliente (com nome):
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=organic&gs=1&client=João%20Silva
```

Link compartilhado por cliente (com email):
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=organic&gs=1&client=joao@example.com
```

## Template Geral

Use este template e substitua os valores:
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=SEU_CANAL&utm_campaign=SUA_CAMPANHA
```

Para links compartilhados por clientes, adicione também `gs=1&client=NOME_OU_EMAIL`:
```
https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=organic&gs=1&client=NOME_OU_EMAIL
```

## Checklist

Antes de usar um link, verifique:
- O parâmetro ref=BRANT está presente
- O parâmetro utm_source=brant está presente
- O parâmetro utm_medium está preenchido com o canal correto
- O parâmetro utm_campaign está preenchido (opcional mas recomendado)
- Se for link compartilhado, inclui gs=1 e client com nome ou email
- Não há espaços nos valores dos parâmetros
- O link foi testado antes de usar

## Dicas Importantes

- Sempre use letras minúsculas nos valores dos parâmetros UTM
- Substitua espaços por underscores ou use codificação de URL (%20 para espaço)
- Para nomes com espaços, use codificação: Maria Silva vira Maria%20Silva
- O parâmetro client é opcional, mas recomendado quando um cliente compartilha o link
- Links compartilhados devem sempre incluir gs=1 para marcar como tráfego orgânico

Precisa de ajuda? Entre em contato com a equipe do MatriculaUSA.
