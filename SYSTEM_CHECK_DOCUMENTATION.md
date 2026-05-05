# 🔧 SYSTEM CHECK INTEGRATION DOCUMENTATION

## 📋 OVERVIEW

O `system-check` é uma API de integração completa para validar toda a infraestrutura do Security Broker SB, garantindo que todos os componentes críticos estejam operacionais antes do deploy e em produção.

---

## 🚀 ENDPOINTS

### GET `/api/admin/system-check`
Executa validação completa de toda a infraestrutura.

**Response:**
```json
{
  "status": "Soberano" | "Crítico" | "Parcial",
  "infra": {
    "supabase": {
      "status": "ok" | "error",
      "details": "string",
      "rls_active": boolean
    },
    "resend": {
      "status": "ok" | "error", 
      "details": "string",
      "message_id": "string?"
    },
    "financeiro": {
      "status": "ok" | "error",
      "details": "string", 
      "webhook_configured": boolean
    },
    "ambiente": {
      "status": "ok" | "error",
      "details": "string",
      "missing_vars": ["string"]
    },
    "nexo_causal": {
      "status": "ok" | "error",
      "details": "string",
      "hash_test": "string?"
    }
  },
  "timestamp": "ISO string",
  "versao": "SB v14.0 - System Check Integration",
  "meta": {
    "execution_time_ms": number,
    "total_tests": number,
    "passed_tests": number,
    "failed_tests": number
  }
}
```

### POST `/api/admin/system-check`
Executa teste individual de componente específico.

**Request:**
```json
{
  "component": "supabase" | "resend" | "financeiro" | "ambiente" | "nexo_causal"
}
```

---

## 🔍 VALIDAÇÕES IMPLEMENTADAS

### 1. SUPABASE (BANCO + RLS)

**Testes Realizados:**
- ✅ Health check na tabela `configuracoes`
- ✅ Validação de RLS (Row Level Security)
- ✅ Conexão com cliente anon e admin
- ✅ Verificação de bloqueio de acessos não autorizados

**Critérios de Sucesso:**
- Conexão bem-sucedida com o banco
- RLS ativo e bloqueando acessos não autorizados
- Sem erros de permissão

---

### 2. RESEND (COMUNICAÇÃO)

**Testes Realizados:**
- ✅ Instanciação do cliente Resend
- ✅ Envio simulado de e-mail de boas-vindas
- ✅ Validação de API key
- ✅ Retorno de message_id

**E-mail de Teste:**
```
Assunto: 🏛️ Teste de Integração - Decisão Patrimonial
Destino: system@securitybroker.com
Conteúdo: Template HTML com status do sistema
```

---

### 3. FINANCEIRO (STRIPE)

**Testes Realizados:**
- ✅ Conexão com Stripe API
- ✅ Verificação de balance disponível
- ✅ Validação de webhook secret
- ✅ Criação e deleção de customer de teste

**Validações:**
- `STRIPE_SECRET_KEY` configurada
- `STRIPE_WEBHOOK_SECRET` presente
- API responsiva

---

### 4. AMBIENTE (VARIÁVEIS)

**Variáveis Críticas Validadas:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

**Status:**
- ✅ OK: Todas presentes
- ❌ Error: Lista ausentes

---

### 5. NEXO CAUSAL (CRIPTOGRAFIA)

**Testes Realizados:**
- ✅ Geração de hash SHA-256
- ✅ Validação contra hash esperado
- ✅ Performance test (1000 hashes)
- ✅ Consistência de criptografia

**Dados de Teste:**
```json
{
  "user_id": "system-test",
  "asset_id": "nexus-causal-test", 
  "timestamp": "ISO string",
  "action": "system_check"
}
```

---

## 📊 STATUS SYSTEM

### **SOBERANO** ✅
- Todos os componentes OK
- Sistema pronto para produção
- Infraestrutura 100% operacional

### **PARCIAL** ⚠️
- Até 2 componentes com erro
- Sistema funcional com limitações
- Investigar componentes críticos

### **CRÍTICO** 🔴
- Mais de 2 componentes com erro
- Sistema não pronto para produção
- Ação imediata necessária

---

## 🛡️ SEGURANÇA

### Autenticação
- Endpoint protegido (admin apenas)
- Validação de tokens JWT
- Audit logging automático

### Privacidade
- Dados de teste não persistentes
- Customers Stripe criados e deletados
- E-mails enviados apenas para sistema

### Performance
- Timeout: 30 segundos por teste
- Cache de resultados (5 minutos)
- Execução paralela quando possível

---

## 🔧 USO

### Verificação Completa
```bash
curl -X GET "https://seu-dominio.com/api/admin/system-check" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Teste Individual
```bash
curl -X POST "https://seu-dominio.com/api/admin/system-check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"component": "supabase"}'
```

### Monitoramento
```javascript
// Frontend integration
const checkSystem = async () => {
  const response = await fetch('/api/admin/system-check');
  const system = await response.json();
  
  if (system.status !== 'Soberano') {
    // Alertar equipe de infraestrutura
    console.warn('System check alert:', system);
  }
  
  return system;
};
```

---

## 📈 MONITORAMENTO E ALERTAS

### Métricas Coletadas
- Tempo de execução total
- Tempo por componente
- Taxa de sucesso/erro
- Performance de criptografia

### Integrações Sugeridas
- **Monitoring:** Datadog/New Relic
- **Alerts:** Slack/Email
- **Dashboard:** Grafana
- **Logs:** ELK Stack

### Automação
- **CI/CD:** Executar antes de cada deploy
- **Cron:** Verificação a cada hora
- **Health Checks:** Load balancer integration

---

## 🚨 TROUBLESHOOTING

### Supabase Error
```bash
# Verificar conexão
psql $DATABASE_URL -c "SELECT 1;"

# Verificar RLS
psql $DATABASE_URL -c "SELECT * FROM pg_policies WHERE tablename = 'leads';"
```

### Resend Error
```bash
# Testar API key
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","to":"test@example.com","subject":"Test","html":"Test"}'
```

### Stripe Error
```bash
# Testar CLI
stripe balance --api-key $STRIPE_SECRET_KEY

# Verificar webhooks
stripe listen --api-key $STRIPE_SECRET_KEY
```

---

## 📝 LOGS

### Formato de Log
```json
{
  "timestamp": "2025-05-04T20:13:00Z",
  "level": "INFO" | "WARN" | "ERROR",
  "component": "supabase" | "resend" | "financeiro" | "ambiente" | "nexo_causal",
  "message": "string",
  "details": {},
  "execution_time_ms": number
}
```

### Localização
- **Application:** Console logs
- **Infrastructure:** System logs
- **Monitoring:** APM tools

---

## 🔄 VERSIONAMENTO

### v14.0 - Current
- ✅ Todos os 5 componentes validados
- ✅ Teste individual via POST
- ✅ Meta informações de performance
- ✅ Documentação completa

### Futuras Versões
- 🔄 Cache inteligente
- 🔄 Histórico de verificações
- 🔄 Alertas automáticos
- 🔄 Integração com monitoring

---

## 📞 SUPORTE

### Emergência
- **Critical:** +1-555-SB-EMERGENCY
- **Infrastructure:** infra@securitybroker.com

### Documentação
- **API:** `/api/docs/system-check`
- **GitHub:** `docs/system-check.md`
- **Wiki:** Confluence space

---

**Status:** ✅ **PRODUCTION READY**  
**Last Updated:** May 4, 2026  
**Version:** SB v14.0  

---

*"A Decisão Patrimonial merece infraestrutura soberana"* 🏛️
