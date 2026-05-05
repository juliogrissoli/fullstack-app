# 🧪 SCRIPT DE TESTE DE AUDITORIA - SB V17
# PowerShell para testar a auditoria de stress do sistema

# Teste 1: Carga Massiva
Write-Host "🧪 Iniciando Teste 1: Carga Massiva" -ForegroundColor Green
$body = @{
    tipo_teste = "carga_massiva"
    parametros = @{
        num_projetos = 500
        num_unidades = 1000
    }
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auditoria-stress" -Method POST -ContentType "application/json" -Body $body
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Teste de Carga Massiva concluído" -ForegroundColor Green
    Write-Host "Tempo: $($result.data.tempo_execucao_total)ms" -ForegroundColor Yellow
    Write-Host "Projetos: $($result.data.resultado_teste.metricas.projetos_criados)" -ForegroundColor Cyan
    Write-Host "Unidades: $($result.data.resultado_teste.metricas.unidades_criadas)" -ForegroundColor Cyan
    Write-Host "Espelho Vendas: $($result.data.resultado_teste.metricas.tempo_espelho_vendas_ms)ms" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro no Teste de Carga Massiva: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 2: Concorrência CPF
Write-Host "`n👥 Iniciando Teste 2: Concorrência CPF" -ForegroundColor Green
$body = @{
    tipo_teste = "concorrencia_cpf"
    parametros = @{
        num_corretores = 10
    }
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auditoria-stress" -Method POST -ContentType "application/json" -Body $body
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Teste de Concorrência CPF concluído" -ForegroundColor Green
    Write-Host "Tempo: $($result.data.tempo_execucao_total)ms" -ForegroundColor Yellow
    Write-Host "Corretores: $($result.data.resultado_teste.metricas.corretores_criados)" -ForegroundColor Cyan
    Write-Host "Alerta Duplicidade: $($result.data.resultado_teste.metricas.alerta_duplicidade_gerado)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro no Teste de Concorrência CPF: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 3: Auditoria Financeira
Write-Host "`n💰 Iniciando Teste 3: Auditoria Financeira" -ForegroundColor Green
$body = @{
    tipo_teste = "auditoria_financeira"
    parametros = @{
        num_vendas = 100
    }
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auditoria-stress" -Method POST -ContentType "application/json" -Body $body
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Teste de Auditoria Financeira concluído" -ForegroundColor Green
    Write-Host "Tempo: $($result.data.tempo_execucao_total)ms" -ForegroundColor Yellow
    Write-Host "Vendas: $($result.data.resultado_teste.metricas.vendas_simuladas)" -ForegroundColor Cyan
    Write-Host "Split 2%: $($result.data.resultado_teste.metricas.split_2_percent_verificado)" -ForegroundColor Cyan
    Write-Host "Mora Automática: $($result.data.resultado_teste.metricas.mora_automatica_verificada)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro no Teste de Auditoria Financeira: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 4: Inteligência Geográfica
Write-Host "`n🗺️ Iniciando Teste 4: Inteligência Geográfica" -ForegroundColor Green
$body = @{
    tipo_teste = "inteligencia_geografica"
    parametros = @{
        num_regioes = 500
    }
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auditoria-stress" -Method POST -ContentType "application/json" -Body $body
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Teste de Inteligência Geográfica concluído" -ForegroundColor Green
    Write-Host "Tempo: $($result.data.tempo_execucao_total)ms" -ForegroundColor Yellow
    Write-Host "Regiões: $($result.data.resultado_teste.metricas.regioes_criadas)" -ForegroundColor Cyan
    Write-Host "Radar 5km: $($result.data.resultado_teste.metricas.tempo_radar_5km_ms)ms" -ForegroundColor Cyan
    Write-Host "Fundo Corretores: $($result.data.resultado_teste.metricas.fundo_corretores_testado)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro no Teste de Inteligência Geográfica: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 5: Auditoria Completa
Write-Host "`n🔍 Iniciando Teste 5: Auditoria Completa" -ForegroundColor Green
$body = @{
    tipo_teste = "completo"
    parametros = @{
        num_projetos = 100
        num_unidades = 500
        num_corretores = 5
        num_regioes = 100
    }
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auditoria-stress" -Method POST -ContentType "application/json" -Body $body
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Teste de Auditoria Completa concluído" -ForegroundColor Green
    Write-Host "Tempo: $($result.data.auditoria_completa.tempo_execucao_total)ms" -ForegroundColor Yellow
    Write-Host "Status: $($result.data.auditoria_completa.status_global)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro no Teste de Auditoria Completa: $($_.Exception.Message)" -ForegroundColor Red
}

# Relatório Final
Write-Host "`n📊 Gerando Relatório Final..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auditoria-stress?relatorio=final" -Method GET
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Relatório Final gerado" -ForegroundColor Green
    Write-Host "Título: $($result.data.titulo)" -ForegroundColor Cyan
    Write-Host "Versão: $($result.data.versao)" -ForegroundColor Cyan
    Write-Host "Status Final: $($result.data.status_final)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao gerar Relatório Final: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Auditoria de Stress Concluída!" -ForegroundColor Green
