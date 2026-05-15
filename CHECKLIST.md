# Checklist — Setup Stripe + Resend + DNS

Tempo estimado: ~50 minutos de ações manuais.

---

## CRÍTICA 1: DNS no HostGator (~15 min)

- [ ] Acesse cliente.hostgator.com.br → Gerenciar domínio `anjoimob.com`
- [ ] Zona de DNS avançada → Adicionar/editar:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | `216.198.79.1` |
| CNAME | www | `cname.vercel-dns.com` |

- [ ] Salvar e aguardar propagação (até 24h)
- [ ] Testar: `curl -I https://anjoimob.com` → esperar `HTTP 200`

---

## CRÍTICA 2: Vercel — Redirect Permanente

- [ ] Vercel → Settings → Domains → `anjoimob.com`
- [ ] Alterar redirect `www → anjoimob.com` de **307** para **308** (Permanent)

---

## CRÍTICA 3: Stripe Live (~15 min)

### 3.1 Obter chaves Live
- [ ] Acesse https://dashboard.stripe.com/apikeys
- [ ] Selecione modo **Live** (não Test)
- [ ] Copie **Publishable key** (`pk_live_...`)
- [ ] Copie **Secret key** (`sk_live_...`)

### 3.2 Adicionar no Vercel
- [ ] Vercel → Settings → Environment Variables
- [ ] Criar `STRIPE_LIVE_SECRET_KEY` = `sk_live_...`
- [ ] Criar/atualizar `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`

### 3.3 Criar Webhook
- [ ] Stripe Dashboard → Developers → Webhooks → **Add endpoint**
- [ ] Endpoint URL: `https://anjoimob.com/api/stripe/webhook`
- [ ] Eventos:
  - [x] `account.updated`
  - [x] `payout.paid`
  - [x] `payment_intent.succeeded`
- [ ] Copie o **Signing secret** gerado (`whsec_...`)
- [ ] Vercel → Environment Variables → Criar `STRIPE_WEBHOOK_SECRET` = `whsec_...`

### 3.4 Validar
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger account.updated
# Verificar em Supabase: brokers.stripe_verified = true
```

---

## CRÍTICA 4: Resend SPF/DKIM (~20 min)

### 4.1 Add Domain no Resend
- [ ] Acesse https://resend.com/dashboard/domains
- [ ] Clique **Add Domain** → Digite `anjoimob.com`
- [ ] Copie os 3 registros DNS exibidos:
  - SPF TXT para `@`
  - DKIM TXT para `resend._domainkey`
  - DMARC TXT para `_dmarc`

### 4.2 Adicionar no HostGator DNS

| Tipo | Nome | Valor |
|------|------|-------|
| TXT | @ | `v=spf1 include:resend.com ~all` |
| TXT | resend._domainkey | `[valor do painel Resend]` |
| TXT | _dmarc | `[valor do painel Resend]` |

### 4.3 Validar propagação (24-48h)
- [ ] https://mxtoolbox.com → SPF Lookup → `anjoimob.com`
- [ ] https://mxtoolbox.com → DKIM Lookup → `resend._domainkey.anjoimob.com`

### 4.4 Adicionar no Vercel
- [ ] Vercel → Environment Variables → Criar `RESEND_API_KEY` = `re_...`

---

## CRÍTICA 5: Supabase — Encryption Key (~2 min)

- [ ] Supabase → SQL Editor → Executar:

```sql
ALTER DATABASE postgres
  SET "app.encryption_key" = '1e5603c22182871eaf7e683338d230ebe314663193734a2ec80afdf53d543e04';
```

---

## CRÍTICA 6: Outras Variáveis no Vercel

- [ ] `NEXT_PUBLIC_APP_URL` = `https://www.anjoimob.com`
- [ ] `ENCRYPTION_KEY` = `1e5603c22182871eaf7e683338d230ebe314663193734a2ec80afdf53d543e04`
- [ ] `RESEND_API_KEY` = `re_...` (do Resend)
- [ ] `GEMINI_API_KEY` = chave do Google AI Studio (se usar Yara)

---

## Verificação Final

```bash
# Testar páginas principais
curl -I https://anjoimob.com/pro
curl -I https://anjoimob.com/captar
curl -I https://anjoimob.com/dashboard/tours/analytics

# Testar API de leads
curl -X POST https://anjoimob.com/api/leads/capturar \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","telefone":"(11) 99999-0000","utm_source":"checklist"}'
# Esperado: {"success":true,"lead_id":"..."}
```

---

## Status Final

- [ ] DNS propagado e HTTPS funcionando
- [ ] Stripe Live + Webhook ativo
- [ ] Resend verificado (SPF/DKIM verde)
- [ ] Supabase encryption key configurada
- [ ] Todas as env vars no Vercel
- [ ] Deploy Vercel status = Ready
- [ ] /pro, /captar, /dashboard carregando sem erro

**Produção pronta.**
