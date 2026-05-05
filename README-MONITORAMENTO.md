# 🏛️ Monitoramento Soberano SB v6.7.0

Sistema completo de monitoramento em tempo real para garantir a saúde patrimonial do Reino SB.

## 📋 Funcionalidades

### 1. ✅ Health Check Real-Time
- **Supabase**: Monitoramento de latência e conectividade
- **Resend**: Verificação de status da API de e-mails
- **Alertas automáticos**: Disparo quando latência > 500ms ou status != 200
- **Log ASEC**: Registro automático de "🚨 ALERTA DE INSTABILIDADE PATRIMONIAL"

### 2. 🚨 Notificação de Erro Crítico
- **Webhook Integration**: Suporte para Discord e Slack
- **Mensagem estruturada**: Módulo, Skill, Erro, Timestamp, Severidade
- **Disparo automático**: Build errors, Runtime errors, Instabilidade
- **Formatação rica**: Embeds coloridos por severidade

### 3. 📊 Log de Sucesso (O Pulso)
- **Contador automático**: A cada 100 transações Match bem-sucedidas
- **E-mail para Comendador**: Resumo com VGV processado e dízimo Reino SB
- **Template HTML**: Design profissional com cores do Reino SB
- **Estatísticas detalhadas**: Período, total transações, valores

### 4. 🔧 Integração Vercel Edge Config
- **Controle remoto**: Desabilitar/habilitar módulos via Dashboard
- **Sem deploy**: Manutenção instantânea de módulos específicos
- **Middleware automático**: Verificação de status antes de executar
- **Log de alterações**: Registro histórico de mudanças

## 🚀 Configuração

### Variáveis de Ambiente
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Resend
RESEND_API_KEY=your_resend_api_key

# Webhooks
DISCORD_WEBHOOK_URL=your_discord_webhook
SLACK_WEBHOOK_URL=your_slack_webhook

# E-mail Comendador
EMAIL_COMENDADOR=comendador@reino-sb.systems
```

### Tabelas Necessárias no Supabase

```sql
-- Health Check
CREATE TABLE health_check (
  timestamp timestamptz default now()
);

-- Logs ASEC
CREATE TABLE logs_asec (
  id uuid primary key default gen_random_uuid(),
  tipo_alerta varchar(100),
  severidade varchar(20),
  mensagem text,
  dados_tecnicos jsonb,
  timestamp timestamptz default now(),
  skill varchar(50),
  modulo varchar(100)
);

-- Transações Match Sucesso
CREATE TABLE transacoes_match_sucesso (
  id uuid primary key default gen_random_uuid(),
  vgv numeric,
  dizimo_reino_sb numeric,
  timestamp timestamptz default now(),
  detalhes jsonb
);

-- Logs de Módulos
CREATE TABLE logs_modulos (
  id uuid primary key default gen_random_uuid(),
  nome_modulo varchar(100),
  acao varchar(20),
  motivo text,
  timestamp timestamptz default now(),
  origem varchar(50)
);
```

## 📡 Uso da API

### Health Check
```bash
GET /api/monitoramento?action=health
```

### Status dos Módulos
```bash
GET /api/monitoramento?action=modules
```

### Dashboard Completo
```bash
GET /api/monitoramento
```

### Testar Webhook
```bash
GET /api/monitoramento?action=test-webhook
```

### Desabilitar Módulo
```bash
POST /api/monitoramento
{
  "action": "disable",
  "module": "match-autonomos",
  "reason": "Manutenção programada"
}
```

### Habilitar Módulo
```bash
POST /api/monitoramento
{
  "action": "enable", 
  "module": "match-autonomos",
  "reason": "Manutenção concluída"
}
```

### Enviar Alerta Personalizado
```bash
POST /api/monitoramento
{
  "action": "alert",
  "modulo": "Match Autônomos",
  "skill": "ASEC", 
  "erro": "Erro crítico detectado",
  "severidade": "critical"
}
```

## 💻 Integração nos Endpoints

### Exemplo Básico
```typescript
import { 
  healthCheckRealTime, 
  enviarNotificacaoErroCritico, 
  registrarSucessoMatch 
} from '@/lib/monitoramento-soberano';

export async function POST(request: NextRequest) {
  try {
    // Verificar saúde do sistema
    const health = await healthCheckRealTime();
    if (health.overall === 'critical') {
      throw new Error('Sistema em estado crítico');
    }
    
    // Processar transação
    const resultado = await processarMatch(await request.json());
    
    // Registrar sucesso
    if (resultado.success && resultado.vgv) {
      await registrarSucessoMatch(resultado.vgv);
    }
    
    return NextResponse.json(resultado);
    
  } catch (error: any) {
    // Notificar erro crítico
    await enviarNotificacaoErroCritico({
      modulo: 'Match Autônomos',
      skill: 'ASEC',
      erro: error.message,
      timestamp: new Date().toISOString(),
      severidade: 'high'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno'
    }, { status: 500 });
  }
}
```

### Com Middleware de Módulo
```typescript
import { withModuleCheck } from '@/lib/monitoramento-soberano';

const withModuleCheckExample = withModuleCheck('match-autonomos');

export async function POST(request: NextRequest) {
  return withModuleCheckExample(async () => {
    // Seu código aqui
    // Só executará se o módulo estiver habilitado
  });
}
```

## 📊 Estrutura de Dados

### Health Check Result
```typescript
interface HealthCheckResult {
  supabase: {
    status: 'healthy' | 'degraded' | 'critical';
    latency: number;
    error?: string;
  };
  resend: {
    status: 'healthy' | 'degraded' | 'critical'; 
    latency: number;
    error?: string;
  };
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
}
```

### Alerta Crítico
```typescript
interface CriticalErrorAlert {
  modulo: string;
  skill: string;
  erro: string;
  timestamp: string;
  contexto?: any;
  severidade: 'low' | 'medium' | 'high' | 'critical';
}
```

### Log de Sucesso
```typescript
interface MatchSuccessLog {
  total_matches: number;
  vgv_processado: number;
  dizimo_reino_sb: number;
  timestamp: string;
  periodo: string;
}
```

## 🔄 Monitoramento Contínuo

### Cron Job Automático
```typescript
import { iniciarMonitoramentoContinuo } from '@/lib/monitoramento-soberano';

// Inicia monitoramento a cada 30 segundos
iniciarMonitoramentoContinuo();
```

### Vercel Cron Job
```json
{
  "crons": [
    {
      "path": "/api/monitoramento/cron",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

## 🎨 Webhook Formats

### Discord Embed
```json
{
  "embeds": [{
    "title": "🚨 ERRO CRÍTICO DETECTADO",
    "color": 0xFF0000,
    "fields": [
      { "name": "🏛️ Módulo", "value": "Match Autônomos", "inline": true },
      { "name": "⚡ Skill", "value": "ASEC", "inline": true },
      { "name": "❌ Erro", "value": "```Erro detalhado```", "inline": false }
    ]
  }]
}
```

### Slack Attachment
```json
{
  "text": "🚨 ERRO CRÍTICO DETECTADO",
  "attachments": [{
    "color": "danger",
    "fields": [
      { "title": "🏛️ Módulo", "value": "Match Autônomos", "short": true },
      { "title": "⚡ Skill", "value": "ASEC", "short": true }
    ]
  }]
}
```

## 📈 Métricas Monitoradas

### Latência
- **Verde**: < 500ms
- **Amarelo**: 500-1000ms  
- **Vermelho**: > 1000ms

### Status Codes
- **200**: Healthy
- **206**: Degraded (Partial Content)
- **503**: Critical (Service Unavailable)

### Severidade de Alertas
- **Low**: Informações gerais
- **Medium**: Atenção necessária
- **High**: Impacto significativo
- **Critical**: Sistema afetado

## 🛠️ Manutenção

### Backup de Configurações
```bash
# Exportar Edge Config
vercel env ls

# Backup de webhooks
curl $DISCORD_WEBHOOK_URL -d '{"content":"Backup test"}'
```

### Logs e Diagnóstico
```sql
-- Verificar alertas recentes
SELECT * FROM logs_asec 
WHERE timestamp > now() - interval '24 hours'
ORDER BY timestamp DESC;

-- Estatísticas de transações
SELECT 
  COUNT(*) as total_matches,
  SUM(vgv) as vgv_total,
  SUM(dizimo_reino_sb) as dizimo_total
FROM transacoes_match_sucesso
WHERE timestamp > now() - interval '7 days';
```

## 🚀 Deploy

### Vercel
```bash
# Deploy com variáveis de ambiente
vercel --prod

# Verificar Edge Config
vercel env pull .env.production
```

### Health Check pós-deploy
```bash
curl https://seu-app.vercel.app/api/monitoramento?action=health
```

---

🏛️ **Sistema de Monitoramento Soberano SB v6.7.0**  
*Garantindo a saúde patrimonial do Reino SB 24/7*
