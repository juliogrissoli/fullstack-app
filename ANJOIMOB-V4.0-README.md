# Anjoimob v4.0 — Security Broker + Real Estate + Payments Platform

**Status:** Production Ready | Last Updated: May 15, 2026

---

## Overview

Anjoimob é uma plataforma enterprise de corretagem imobiliária com:

- 73+ features implementadas (Pilares 1-8)
- Suporta 100+ corretores simultâneos
- Funil de aquisição completo (PRO → Captar → Pipeline)
- IA integrada (Yara, Themis, Hermes, Plutus)

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16.2.4 + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes + Vercel Edge Functions |
| Database | Supabase (PostgreSQL) com 90+ RLS policies |
| Payments | Stripe Connect + Split Engine |
| AI | PGVector + Agentes especializados |
| Hosting | Vercel + Supabase |
| Email | Resend (transacional) |

---

## Entregas v4.0

### Fase 1 — Core

| Componente | Arquivo | Status |
|-----------|---------|--------|
| Tour Upload API | `api/tour/upload/route.ts` | ✅ |
| Tour Scene API | `api/tour/scene/route.ts` | ✅ |
| Tour Notification API | `api/tour/notificar/route.ts` | ✅ |
| Imoveis API | `api/imoveis/route.ts` | ✅ |
| Tour Uploader | `components/TourUploader.tsx` | ✅ |
| Lead Capture Tour | `components/LeadCaptureTour.tsx` | ✅ |
| Analytics Chart | `components/TourAnalyticsChart.tsx` | ✅ Recharts dual-line |
| Onboarding Modal | `components/OnboardingModal.tsx` | ✅ 3 etapas + localStorage |
| Analytics Dashboard | `dashboard/tours/analytics/page.tsx` | ✅ KPIs + Top 5 |
| Dashboard Layout | `dashboard/layout.tsx` | ✅ Modal ao login |

### Fase 2 — Acquisition Funnel

| Componente | Arquivo | Status |
|-----------|---------|--------|
| PRO Landing | `app/pro/page.tsx` | ✅ 6 benefícios + 3 planos |
| Lead Capture | `app/captar/page.tsx` | ✅ Form + UTM tracking |
| Closing Scripts | `components/ClosingScript.tsx` | ✅ 3 templates WhatsApp |
| Registro de Imóvel | `app/imoveis/novo/page.tsx` | ✅ |
| Tours Dashboard | `dashboard/tours/page.tsx` | ✅ |
| Tours Gerenciar | `dashboard/tours/[id]/page.tsx` | ✅ |

---

## Fluxo de Aquisição

```
/pro (Landing)
  ↓ "Começar Grátis"
/captar (Lead Capture Form)
  ↓ POST /api/leads/capturar
Supabase.leads (utm_source, utm_campaign, corretor_ref)
  ↓ trigger: intencao_alta = true (3min no tour)
Resend → e-mail ao corretor
  ↓
/dashboard → Closing Scripts (copy-paste WhatsApp)
  ↓
/dashboard/pipeline (Kanban de avanço)
```

---

## Setup Local

```bash
# 1. Clonar e instalar
git clone https://github.com/juliogrissoli/fullstack-app.git
cd fullstack-app
npm install

# 2. Configurar variáveis
cp .env.production.example .env.local
# Editar .env.local com as chaves reais

# 3. Rodar
npm run dev

# 4. Checar TypeScript
npx tsc --noEmit --skipLibCheck
```

---

## Arquitetura de Pastas

```
src/
├── app/
│   ├── pro/page.tsx              — Landing PRO
│   ├── captar/page.tsx           — Lead Capture
│   ├── imoveis/novo/page.tsx     — Cadastro de imóvel
│   ├── dashboard/
│   │   ├── page.tsx              — Dashboard (+ ClosingScript)
│   │   ├── layout.tsx            — Onboarding Modal wrapper
│   │   ├── pipeline/             — Kanban
│   │   └── tours/
│   │       ├── page.tsx          — Listagem de tours
│   │       ├── [id]/page.tsx     — Gerenciar tour
│   │       └── analytics/page.tsx
│   └── api/
│       ├── leads/capturar/
│       ├── tour/upload|scene|notificar/
│       ├── imoveis/
│       ├── stripe/connect|checkout|webhook/
│       └── agentes/
├── components/
│   ├── TourUploader.tsx
│   ├── TourImersivo.tsx
│   ├── TourAnalyticsChart.tsx
│   ├── OnboardingModal.tsx
│   ├── ClosingScript.tsx
│   └── LeadCaptureTour.tsx
└── lib/
    ├── supabase/
    ├── stripe/
    └── agentes/   (yara, themis, hermes, plutus)
```

---

## Schema Principal (Tabelas-chave)

```sql
-- Leads com UTM tracking
leads (
  id, client_name, client_phone, client_email,
  property_id, source, utm_medium, utm_campaign,
  broker_id, status, created_at
)

-- Analytics de Tours
tours_analytics (
  id, imovel_id, duracao_segundos,
  intencao_alta, created_at
)

-- Imóveis
properties (
  id, broker_id, titulo, tipo, bairro,
  valor, tour_scenes, status, created_at
)
```

---

## Segurança Implementada

- Row Level Security (RLS) — 90+ políticas
- pgcrypto — criptografia de dados sensíveis
- Security Headers — CSP, HSTS, X-Frame-Options DENY
- CORS restrito por origem
- Rate Limiting — 100 req/min por IP
- Nexo Causal SHA-256 — proteção de comissões
- Audit logs em `agent_logs`

---

## Pendências de Infraestrutura (Ações Manuais)

| Item | Onde | Status |
|------|------|--------|
| DNS A record `@ 216.198.79.1` | HostGator | Configurar |
| CNAME `www → cname.vercel-dns.com` | HostGator | Configurar |
| Resend SPF/DKIM records | HostGator DNS | Configurar |
| `STRIPE_LIVE_SECRET_KEY` | Vercel env vars | Adicionar |
| `STRIPE_WEBHOOK_SECRET` | Vercel env vars | Adicionar |
| `RESEND_API_KEY` | Vercel env vars | Adicionar |
| `ALTER DATABASE SET "app.encryption_key"` | Supabase SQL editor | Executar |

---

## URLs de Produção

| URL | Descrição |
|-----|-----------|
| https://anjoimob.com | Home |
| https://anjoimob.com/pro | Landing PRO |
| https://anjoimob.com/captar | Lead Capture |
| https://anjoimob.com/dashboard | Painel do Corretor |
| https://anjoimob.com/dashboard/tours/analytics | Analytics de Tours |

---

**Desenvolvedor:** JRiss (Júlio Grissoli) | **v4.0.0** | May 15, 2026
