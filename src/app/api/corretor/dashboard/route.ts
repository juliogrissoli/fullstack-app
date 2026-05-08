// 🏛️ SECURITY BROKER SB v14.0 - DASHBOARD DO CORRETOR
// Performance otimizada <200ms para Match Areas
// Nexo Causal para trava de comissão
// Dossiê Patrimonial com Creci vinculado

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// 🚀 CLIENTE SUPABASE OTIMIZADO
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      timeout: 10000 // 10 segundos timeout
    }
  }
);

// 📊 INTERFACES OTIMIZADAS
interface CorretorDashboard {
  corretor: {
    id: string;
    nome: string;
    email: string;
    creci: string;
    sb_score: number;
    total_vendas: number;
    comissao_estimada: number;
  };
  match_areas: {
    imoveis_disponiveis: Array<{
      id: string;
      titulo: string;
      preco: number;
      area: number;
      localizacao: string;
      match_score: number;
      tempo_carregamento: number;
    }>;
    total_imoveis: number;
    tempo_carregamento_ms: number;
  };
  leads_atendidos: Array<{
    id: string;
    nome: string;
    status: string;
    valor_estimado: number;
    data_atendimento: string;
    nexo_causal_hash: string;
  }>;
  comissoes: {
    pendentes: number;
    liberadas: number;
    total_estimado: number;
  };
}

// 🏃‍♂️ CACHE DE PERFORMANCE (30 segundos)
const cache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(corretorId: string, endpoint: string): string {
  return `corretor_${corretorId}_${endpoint}`;
}

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// 🔒 GERAR NEXO CAUSAL PARA TRAVA DE COMISSÃO
function gerarNexoCausal(corretorId: string, leadId: string, timestamp: string): string {
  const dados = `${corretorId}:${leadId}:${timestamp}:SB_NEXO_CAUSAL`;
  return createHash('sha256').update(dados).digest('hex');
}

// 🏛️ VALIDAR NEXO CAUSAL (TRAVA DE COMISSÃO)
async function validarNexoCausal(
  corretorId: string, 
  leadId: string, 
  usuarioId: string
): Promise<{ permitido: boolean; motivo?: string }> {
  try {
    // Verificar se o lead já está associado a outro corretor
    const { data: associacao, error } = await supabase
      .from('lead_corretor_associacoes')
      .select('*')
      .eq('lead_id', leadId)
      .eq('status', 'ativa')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (associacao && associacao.corretor_id !== corretorId) {
      // Verificar se o usuário é admin
      const { data: usuario } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', usuarioId)
        .single();

      if (usuario?.role !== 'admin') {
        return {
          permitido: false,
          motivo: `Lead já associado ao corretor ${associacao.corretor_id}. Apenas administradores podem editar.`
        };
      }
    }

    return { permitido: true };
  } catch (error) {
    console.error('🏛️ Erro na validação do Nexo Causal:', error);
    return { permitido: false, motivo: 'Erro na validação de acesso' };
  }
}

// 📄 GERAR DOSSIÊ PATRIMONIAL COM CRECI
async function gerarDossiePatrimonial(corretorId: string, leadId: string): Promise<{
  sucesso: boolean;
  dossie_url?: string;
  erro?: string;
}> {
  try {
    const startTime = Date.now();

    // Buscar dados do corretor com Creci
    const { data: corretor, error: erroCorretor } = await supabase
      .from('profiles')
      .select('id, nome, email, creci, sb_score')
      .eq('id', corretorId)
      .single();

    if (erroCorretor || !corretor) {
      throw new Error('Corretor não encontrado ou sem Creci vinculado');
    }

    // Buscar dados do lead
    const { data: lead, error: erroLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (erroLead || !lead) {
      throw new Error('Lead não encontrado');
    }

    // Gerar hash do dossiê
    const dossieHash = gerarNexoCausal(
      corretorId,
      leadId,
      new Date().toISOString()
    );

    // Criar registro do dossiê
    const { data: dossie, error: erroDossie } = await supabase
      .from('dossies_patrimoniais')
      .insert({
        corretor_id: corretorId,
        lead_id: leadId,
        creci_corretor: corretor.creci,
        hash_dossie: dossieHash,
        dados_corretor: {
          nome: corretor.nome,
          email: corretor.email,
          creci: corretor.creci,
          sb_score: corretor.sb_score
        },
        dados_lead: {
          nome: lead.nome,
          email: lead.email,
          telefone: lead.telefone,
          cpf: lead.cpf
        },
        status: 'gerado',
        created_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      })
      .select()
      .single();

    if (erroDossie || !dossie) {
      throw new Error('Falha ao gerar dossiê patrimonial');
    }

    // Gerar URL do dossiê
    const dossieUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dossie/${dossie.id}`;

    return {
      sucesso: true,
      dossie_url: dossieUrl
    };

  } catch (error: any) {
    console.error('🏛️ Erro ao gerar dossiê patrimonial:', error);
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

// 🚀 CARREGAR MATCH AREAS OTIMIZADO (<200ms)
async function carregarMatchAreas(corretorId: string): Promise<{
  imoveis_disponiveis: any[];
  total_imoveis: number;
  tempo_carregamento_ms: number;
}> {
  const startTime = Date.now();
  
  try {
    // Verificar cache primeiro
    const cacheKey = getCacheKey(corretorId, 'match_areas');
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return {
        ...cached,
        tempo_carregamento_ms: Date.now() - startTime
      };
    }

    // Query otimizada com índices
    const { data: imoveis, error } = await supabase
      .from('imoveis_disponiveis_view') // View pré-calculada
      .select(`
        id,
        titulo,
        preco,
        area,
        localizacao,
        match_score,
        broker_id,
        created_at
      `)
      .eq('status', 'disponivel')
      .eq('broker_id', corretorId)
      .order('match_score', { ascending: false })
      .limit(50); // Limitar para performance

    if (error) {
      throw error;
    }

    const resultado = {
      imoveis_disponiveis: (imoveis || []).map(imovel => ({
        ...imovel,
        tempo_carregamento: Date.now() - startTime
      })),
      total_imoveis: imoveis?.length || 0,
      tempo_carregamento_ms: Date.now() - startTime
    };

    // Cache por 30 segundos
    setCache(cacheKey, resultado);

    return resultado;

  } catch (error) {
    console.error('🏛️ Erro ao carregar Match Areas:', error);
    return {
      imoveis_disponiveis: [],
      total_imoveis: 0,
      tempo_carregamento_ms: Date.now() - startTime
    };
  }
}

// 💰 CALCULAR COMISSÃO ESTIMADA
async function calcularComissaoEstimada(corretorId: string): Promise<{
  pendentes: number;
  liberadas: number;
  total_estimado: number;
}> {
  try {
    // Buscar transações do corretor
    const { data: transacoes, error } = await supabase
      .from('transacoes_corretor')
      .select('valor, status, comissao_percentual')
      .eq('corretor_id', corretorId);

    if (error) throw error;

    const pendentes = transacoes?.filter(t => t.status === 'pendente') || [];
    const liberadas = transacoes?.filter(t => t.status === 'liberada') || [];

    const totalPendentes = pendentes.reduce((sum, t) => 
      sum + (t.valor * (t.comissao_percentual / 100)), 0
    );

    const totalLiberadas = liberadas.reduce((sum, t) => 
      sum + (t.valor * (t.comissao_percentual / 100)), 0
    );

    return {
      pendentes: totalPendentes,
      liberadas: totalLiberadas,
      total_estimado: totalPendentes + totalLiberadas
    };

  } catch (error) {
    console.error('🏛️ Erro ao calcular comissão:', error);
    return {
      pendentes: 0,
      liberadas: 0,
      total_estimado: 0
    };
  }
}

// 📋 BUSCAR LEADS ATENDIDOS COM NEXO CAUSAL
async function buscarLeadsAtendidos(corretorId: string): Promise<any[]> {
  try {
    const { data: leads, error } = await supabase
      .from('lead_corretor_associacoes')
      .select(`
        lead_id,
        status,
        created_at,
        nexo_causal_hash,
        leads (
          id,
          nome,
          email,
          telefone,
          valor_estimado
        )
      `)
      .eq('corretor_id', corretorId)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return leads?.map(associacao => {
      const leadData = Array.isArray(associacao.leads) ? associacao.leads[0] : associacao.leads;
      return {
        id: associacao.lead_id,
        nome: leadData?.nome || 'Lead',
        status: associacao.status,
        valor_estimado: leadData?.valor_estimado || 0,
        data_atendimento: associacao.created_at,
        nexo_causal_hash: associacao.nexo_causal_hash
      };
    }) || [];

  } catch (error) {
    console.error('🏛️ Erro ao buscar leads atendidos:', error);
    return [];
  }
}

// 🎯 GET - DASHBOARD COMPLETO
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Extrair token JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Token de autenticação não fornecido'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Validar token e obter usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Token inválido ou expirado'
      }, { status: 401 });
    }

    // Buscar perfil do corretor
    const { data: corretor, error: erroCorretor } = await supabase
      .from('profiles')
      .select('id, nome, email, creci, sb_score, role')
      .eq('id', user.id)
      .single();

    if (erroCorretor || !corretor) {
      return NextResponse.json({
        error: 'Corretor não encontrado'
      }, { status: 404 });
    }

    // Verificar se é corretor ou admin
    if (corretor.role !== 'corretor' && corretor.role !== 'admin') {
      return NextResponse.json({
        error: 'Acesso não autorizado'
      }, { status: 403 });
    }

    // Carregar dados em paralelo para performance
    const [
      matchAreas,
      leadsAtendidos,
      comissoes
    ] = await Promise.all([
      carregarMatchAreas(corretor.id),
      buscarLeadsAtendidos(corretor.id),
      calcularComissaoEstimada(corretor.id)
    ]);

    // Calcular total de vendas
    const totalVendas = leadsAtendidos.reduce((sum, lead) => 
      sum + (lead.valor_estimado || 0), 0
    );

    const dashboard: CorretorDashboard = {
      corretor: {
        id: corretor.id,
        nome: corretor.nome,
        email: corretor.email,
        creci: corretor.creci || 'Não vinculado',
        sb_score: corretor.sb_score || 0,
        total_vendas: totalVendas,
        comissao_estimada: comissoes.total_estimado
      },
      match_areas: matchAreas,
      leads_atendidos: leadsAtendidos,
      comissoes: comissoes
    };

    // Métricas de performance
    const processingTime = Date.now() - startTime;
    
    console.log(`🏛️ Dashboard carregado em ${processingTime}ms para corretor ${corretor.id}`);

    return NextResponse.json({
      success: true,
      data: dashboard,
      meta: {
        processing_time_ms: processingTime,
        match_areas_loaded: matchAreas.tempo_carregamento_ms < 200,
        cache_hit: cache.has(getCacheKey(corretor.id, 'match_areas'))
      }
    });

  } catch (error: any) {
    console.error('🏛️ Erro no dashboard do corretor:', error);
    return NextResponse.json({
      error: 'Erro interno no servidor',
      details: error.message
    }, { status: 500 });
  }
}

// 📄 POST - GERAR DOSSIÊ PATRIMONIAL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, action } = body;

    if (!lead_id || !action) {
      return NextResponse.json({
        error: 'Parâmetros obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Validar token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Token de autenticação não fornecido'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Token inválido ou expirado'
      }, { status: 401 });
    }

    // Verificar perfil
    const { data: corretor, error: erroCorretor } = await supabase
      .from('profiles')
      .select('id, nome, creci, role')
      .eq('id', user.id)
      .single();

    if (erroCorretor || !corretor) {
      return NextResponse.json({
        error: 'Corretor não encontrado'
      }, { status: 404 });
    }

    // Validar Nexo Causal para trava de comissão
    if (action === 'editar_lead') {
      const nexoValidacao = await validarNexoCausal(corretor.id, lead_id, user.id);
      
      if (!nexoValidacao.permitido) {
        return NextResponse.json({
          error: 'Acesso negado',
          motivo: nexoValidacao.motivo
        }, { status: 403 });
      }
    }

    // Gerar Dossiê Patrimonial
    if (action === 'gerar_dossie') {
      const resultado = await gerarDossiePatrimonial(corretor.id, lead_id);
      
      if (!resultado.sucesso) {
        return NextResponse.json({
          error: 'Falha ao gerar dossiê',
          details: resultado.erro
        }, { status: 500 });
      }

      // Buscar valor estimado para notificação
      const { data: lead } = await supabase
        .from('leads')
        .select('valor_estimado')
        .eq('id', lead_id)
        .single();

      const valorEstimado = lead?.valor_estimado || 0;
      const comissaoEstimada = valorEstimado * 0.02; // 2% de comissão

      return NextResponse.json({
        success: true,
        message: `Sua Condução de Decisão Patrimonial foi concluída. Comissão estimada: R$ ${comissaoEstimada.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        })}`,
        dossie_url: resultado.dossie_url,
        creci_vinculado: corretor.creci,
        comissao_estimada: comissaoEstimada
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Ação executada com sucesso'
    });

  } catch (error: any) {
    console.error('🏛️ Erro na ação do corretor:', error);
    return NextResponse.json({
      error: 'Erro interno no servidor',
      details: error.message
    }, { status: 500 });
  }
}

// 🔄 PUT - ATUALIZAR STATUS DE LEAD (COM NEXO CAUSAL)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, status, motivo } = body;

    if (!lead_id || !status) {
      return NextResponse.json({
        error: 'Parâmetros obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Validar token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Token de autenticação não fornecido'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Token inválido ou expirado'
      }, { status: 401 });
    }

    // Validar Nexo Causal
    const nexoValidacao = await validarNexoCausal(user.id, lead_id, user.id);
    
    if (!nexoValidacao.permitido) {
      return NextResponse.json({
        error: 'Acesso negado',
        motivo: nexoValidacao.motivo
      }, { status: 403 });
    }

    // Gerar novo hash do Nexo Causal
    const nexoHash = gerarNexoCausal(
      user.id,
      lead_id,
      new Date().toISOString()
    );

    // Atualizar lead
    const { data: leadAtualizado, error } = await supabase
      .from('leads')
      .update({
        status,
        motivo_atualizacao: motivo,
        nexo_causal_hash: nexoHash,
        updated_at: new Date().toISOString(),
        atualizado_por: user.id
      })
      .eq('id', lead_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Registrar auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'UPDATE_LEAD_STATUS',
        resource: 'leads',
        resource_id: lead_id,
        details: {
          status_anterior: leadAtualizado?.status,
          status_novo: status,
          nexo_causal_hash: nexoHash
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: 'Status atualizado com sucesso',
      data: leadAtualizado,
      nexo_causal_hash: nexoHash
    });

  } catch (error: any) {
    console.error('🏛️ Erro ao atualizar lead:', error);
    return NextResponse.json({
      error: 'Erro interno no servidor',
      details: error.message
    }, { status: 500 });
  }
}
