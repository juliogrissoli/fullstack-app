// 🏛️ SECURITY BROKER SB v22 - OUROBOROS & COMPLIANCE JURÍDICO
// API de Compliance Jurídico com Trava de CPF, Nexo Causal e Radar 5km

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface OuroborosComplianceRequest {
  acao: 'travar_cpf' | 'registrar_nexo_causal' | 'atualizar_radar_5km' | 'consultar_compliance';
  dados?: {
    cpf_cliente?: string;
    nome_cliente?: string;
    broker_id?: string;
    corretor_eleito_id?: string;
    broker_id_interacao?: string;
    cliente_id_interacao?: string;
    unidade_id?: string;
    tipo_interacao?: string;
    descricao_interacao?: string;
    canal_comunicacao?: string;
    latitude?: number;
    longitude?: number;
    cidade?: string;
    estado?: string;
    raio_monitoramento?: number;
  };
}

interface OuroborosComplianceResponse {
  success: boolean;
  cpf_travado?: {
    id: string;
    cpf_cliente: string;
    nome_cliente: string;
    corretores_vinculados: string[];
    corretor_eleito_id?: string;
    data_eleicao?: string;
    status_trava: string;
    alerta_duplicidade: boolean;
  };
  nexo_causal_registrado?: {
    id: string;
    broker_id: string;
    cliente_id: string;
    tipo_interacao: string;
    descricao_interacao: string;
    data_primeiro_contato: string;
    nexo_estabelecido: boolean;
    forca_nexo: string;
    hash_interacao: string;
  };
  radar_atualizado?: {
    id: string;
    cidade: string;
    estado: string;
    preco_medio_m2: number;
    deficit_habitacional: number;
    total_ofertas: number;
    projetos_sb_vizinhos: number;
    alerta_preco_baixo: boolean;
    alerta_deficit_alto: boolean;
    data_atualizacao: string;
  };
  compliance_consultado?: {
    trava_cpf: Array<{
      cpf_cliente: string;
      nome_cliente: string;
      status_trava: string;
      corretor_eleito: string;
      alerta_duplicidade: boolean;
    }>;
    nexo_causal: Array<{
      broker_nome: string;
      cliente_nome: string;
      tipo_interacao: string;
      nexo_estabelecido: boolean;
      forca_nexo: string;
      data_interacao: string;
    }>;
    radar_5km: Array<{
      cidade: string;
      estado: string;
      preco_medio_m2: number;
      deficit_habitacional: number;
      alertas: string[];
      data_atualizacao: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: OuroborosComplianceRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Ouroboros Compliance: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'travar_cpf':
        resultado = await travarCPF(dados);
        break;
      case 'registrar_nexo_causal':
        resultado = await registrarNexoCausal(dados);
        break;
      case 'atualizar_radar_5km':
        resultado = await atualizarRadar5km(dados);
        break;
      case 'consultar_compliance':
        resultado = await consultarCompliance(dados);
        break;
      default:
        throw new Error('Ação inválida');
    }
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: `Operação ${acao} concluída com sucesso`
    });
    
  } catch (error: any) {
    console.error('Erro no Ouroboros Compliance:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Ouroboros Compliance',
      details: error.message
    }, { status: 500 });
  }
}

async function travarCPF(dados: any): Promise<OuroborosComplianceResponse['cpf_travado']> {
  const { cpf_cliente, nome_cliente, broker_id, corretor_eleito_id } = dados;
  
  // Validar dados obrigatórios
  if (!cpf_cliente || !nome_cliente || !broker_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Verificar se CPF já existe
  const { data: travaExistente } = await supabase
    .from('trava_cpf')
    .select('*')
    .eq('cpf_cliente', cpf_cliente)
    .single();
  
  if (travaExistente) {
    // Adicionar broker aos corretores vinculados
    const corretoresAtualizados = [...travaExistente.corretores_vinculados, broker_id];
    
    // Verificar duplicidade
    const alertaDuplicidade = corretoresAtualizados.length > 1;
    
    // Atualizar trava existente
    const { data: travaAtualizada } = await supabase
      .from('trava_cpf')
      .update({
        corretores_vinculados: corretoresAtualizados,
        alerta_duplicidade: alertaDuplicidade,
        data_ultimo_alerto: alertaDuplicidade ? new Date().toISOString() : travaExistente.data_ultimo_alerto,
        updated_at: new Date().toISOString()
      })
      .eq('id', travaExistente.id)
      .select('*')
      .single();
    
    // Criar notificação de alerta
    if (alertaDuplicidade) {
      await supabase
        .from('notificacoes')
        .insert([
          {
            broker_id,
            tipo: 'ourobos_compliance',
            titulo: 'Alerta de Duplicidade de CPF',
            mensagem: `CPF ${cpf_cliente} já está vinculado a outro corretor`,
            status: 'nao_lida'
          },
          {
            broker_id: travaExistente.corretores_vinculados[0],
            tipo: 'ourobos_compliance',
            titulo: 'Novo Corretor Vinculado',
            mensagem: `Novo corretor tentando vincular seu cliente ${nome_cliente}`,
            status: 'nao_lida'
          }
        ]);
    }
    
    return {
      id: travaAtualizada.id,
      cpf_cliente: travaAtualizada.cpf_cliente,
      nome_cliente: travaAtualizada.nome_cliente,
      corretores_vinculados: travaAtualizada.corretores_vinculados,
      corretor_eleito_id: travaAtualizada.corretor_eleito_id,
      data_eleicao: travaAtualizada.data_eleicao,
      status_trava: travaAtualizada.status_trava,
      alerta_duplicidade: travaAtualizada.alerta_duplicidade
    };
  }
  
  // Criar nova trava
  const { data: novaTrava } = await supabase
    .from('trava_cpf')
    .insert({
      cpf_cliente,
      nome_cliente,
      corretores_vinculados: [broker_id],
      corretor_eleito_id: corretor_eleito_id,
      data_eleicao: corretor_eleito_id ? new Date().toISOString().split('T')[0] : null,
      status_trava: 'ativa'
    })
    .select('*')
    .single();
  
  return {
    id: novaTrava.id,
    cpf_cliente: novaTrava.cpf_cliente,
    nome_cliente: novaTrava.nome_cliente,
    corretores_vinculados: novaTrava.corretores_vinculados,
    corretor_eleito_id: novaTrava.corretor_eleito_id,
    data_eleicao: novaTrava.data_eleicao,
    status_trava: novaTrava.status_trava,
    alerta_duplicidade: novaTrava.alerta_duplicidade
  };
}

async function registrarNexoCausal(dados: any): Promise<OuroborosComplianceResponse['nexo_causal_registrado']> {
  const { broker_id_interacao, cliente_id_interacao, unidade_id, tipo_interacao, descricao_interacao, canal_comunicacao } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id_interacao || !cliente_id_interacao || !tipo_interacao) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar dados do cliente
  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', cliente_id_interacao)
    .single();
  
  // Determinar data da interação
  const dataInteracao = new Date().toISOString().split('T')[0];
  
  // Gerar hash imutável da interação
  const hashInteracao = require('crypto').createHash('sha256')
    .update(broker_id_interacao + cliente_id_interacao + tipo_interacao + dataInteracao + descricao_interacao)
    .digest('hex');
  
  // Gerar hash do registro completo
  const hashRegistro = require('crypto').createHash('sha256')
    .update(hashInteracao + new Date().toISOString())
    .digest('hex');
  
  // Determinar força do nexo causal
  let forcaNexo = 'fraco';
  if (tipo_interacao === 'visita') forcaNexo = 'medio';
  if (tipo_interacao === 'proposta') forcaNexo = 'forte';
  if (tipo_interacao === 'fechamento') forcaNexo = 'forte';
  
  // Registrar nexo causal
  const { data: nexoCausal } = await supabase
    .from('nexo_causal')
    .insert({
      broker_id: broker_id_interacao,
      cliente_id: cliente_id_interacao,
      unidade_id,
      data_primeiro_contato: dataInteracao,
      tipo_interacao,
      descricao_interacao,
      canal_comunicacao,
      nexo_estabelecido: tipo_interacao !== 'contato',
      forca_nexo: forcaNexo,
      hash_interacao: hashInteracao,
      hash_registro: hashRegistro
    })
    .select('*')
    .single();
  
  // Atualizar trava de CPF se necessário
  if (cliente) {
    await supabase
      .from('trava_cpf')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('cpf_cliente', cliente.cpf);
  }
  
  return {
    id: nexoCausal.id,
    broker_id: nexoCausal.broker_id,
    cliente_id: nexoCausal.cliente_id,
    tipo_interacao: nexoCausal.tipo_interacao,
    descricao_interacao: nexoCausal.descricao_interacao,
    data_primeiro_contato: nexoCausal.data_primeiro_contato,
    nexo_estabelecido: nexoCausal.nexo_estabelecido,
    forca_nexo: nexoCausal.forca_nexo,
    hash_interacao: nexoCausal.hash_interacao
  };
}

async function atualizarRadar5km(dados: any): Promise<OuroborosComplianceResponse['radar_atualizado']> {
  const { latitude, longitude, cidade, estado, raio_monitoramento } = dados;
  
  // Validar dados obrigatórios
  if (!latitude || !longitude || !cidade || !estado) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Criar ponto geográfico
  const pontoGeografico = `POINT(${longitude} ${latitude})`;
  
  // Buscar dados de mercado na área
  const { data: dadosMercado } = await supabase
    .from('unidades_projetos')
    .select(`
      valor_venda,
      area_total,
      status_unidade
    `)
    .eq('status_unidade', 'disponivel')
    .limit(100); // Limitar para performance
  
  // Calcular estatísticas
  const precoMedioM2 = (dadosMercado || [])?.reduce((sum, u) => sum + (u.valor_venda / u.area_total), 0) / (dadosMercado?.length || 1) || 0;
  const precoMinimoM2 = (dadosMercado || [])?.reduce((min, u) => Math.min(min, u.valor_venda / u.area_total), Infinity) || 0;
  const precoMaximoM2 = (dadosMercado || [])?.reduce((max, u) => Math.max(max, u.valor_venda / u.area_total), 0) || 0;
  
  // Simular dados de déficit habitacional
  const deficitHabitacional = Math.floor(Math.random() * 10000) + 1000;
  const demandaReprimida = Math.floor(deficitHabitacional * 0.8);
  const indiceCarencia = (deficitHabitacional / 100000) * 100;
  
  // Buscar projetos SB vizinhos
  const { data: projetosSB } = await supabase
    .from('projetos_sb')
    .select('id')
    .eq('cidade', cidade)
    .eq('estado', estado);
  
  // Determinar alertas
  const alertaPrecoBaixo = precoMedioM2 < 3000; // Preço abaixo de R$ 3.000/m²
  const alertaPrecoAlto = precoMedioM2 > 10000; // Preço acima de R$ 10.000/m²
  const alertaDeficitAlto = deficitHabitacional > 5000;
  
  // Gerar hash do radar
  const hashRadar = require('crypto').createHash('sha256')
    .update(pontoGeografico + cidade + estado + new Date().toISOString())
    .digest('hex');
  
  // Atualizar ou criar radar
  const { data: radar } = await supabase
    .from('radar_5km')
    .upsert({
      centro_referencia: pontoGeografico,
      raio_monitoramento: raio_monitoramento || 5000,
      cidade,
      estado,
      data_atualizacao: new Date().toISOString(),
      preco_medio_m2: precoMedioM2,
      preco_minimo_m2: precoMinimoM2,
      preco_maximo_m2: precoMaximoM2,
      deficit_habitacional: deficitHabitacional,
      demanda_reprimida: demandaReprimida,
      indice_carencia: indiceCarencia,
      total_ofertas: dadosMercado?.length || 0,
      ofertas_disponiveis: dadosMercado?.length || 0,
      projetos_sb_vizinhos: projetosSB?.length || 0,
      alerta_preco_baixo: alertaPrecoBaixo,
      alerta_preco_alto: alertaPrecoAlto,
      alerta_deficit_alto: alertaDeficitAlto,
      hash_radar: hashRadar
    }, {
      onConflict: 'centro_referencia'
    })
    .select('*')
    .single();
  
  return {
    id: radar.id,
    cidade: radar.cidade,
    estado: radar.estado,
    preco_medio_m2: radar.preco_medio_m2,
    deficit_habitacional: radar.deficit_habitacional,
    total_ofertas: radar.total_ofertas,
    projetos_sb_vizinhos: radar.projetos_sb_vizinhos,
    alerta_preco_baixo: radar.alerta_preco_baixo,
    alerta_deficit_alto: radar.alerta_deficit_alto,
    data_atualizacao: radar.data_atualizacao
  };
}

async function consultarCompliance(dados: any): Promise<OuroborosComplianceResponse['compliance_consultado']> {
  const { broker_id, cliente_id, cidade, estado } = dados;
  
  // Buscar trava de CPF
  let travaCpf: any[] = [];
  if (broker_id) {
    const { data: travas } = await supabase
      .from('trava_cpf')
      .select('*')
      .contains('corretores_vinculados', [broker_id])
      .order('created_at', { ascending: false })
      .limit(10);
    
    travaCpf = (travas || []).map(t => ({
      cpf_cliente: t.cpf_cliente,
      nome_cliente: t.nome_cliente,
      status_trava: t.status_trava,
      corretor_eleito: t.corretor_eleito_id || 'Não definido',
      alerta_duplicidade: t.alerta_duplicidade
    }));
  }
  
  // Buscar nexo causal
  let nexoCausal: any[] = [];
  if (broker_id) {
    const { data: nexos } = await supabase
      .from('nexo_causal')
      .select(`
        *,
        brokers!inner(nome),
        clientes!inner(nome)
      `)
      .eq('broker_id', broker_id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    nexoCausal = (nexos || []).map(n => ({
      broker_nome: n.brokers.nome,
      cliente_nome: n.clientes.nome,
      tipo_interacao: n.tipo_interacao,
      nexo_estabelecido: n.nexo_estabelecido,
      forca_nexo: n.forca_nexo,
      data_interacao: n.created_at
    }));
  }
  
  // Buscar radar 5km
  let radar5km: any[] = [];
  if (cidade && estado) {
    const { data: radares } = await supabase
      .from('radar_5km')
      .select('*')
      .eq('cidade', cidade)
      .eq('estado', estado)
      .order('data_atualizacao', { ascending: false })
      .limit(10);
    
    radar5km = (radares || []).map(r => {
      const alertas = [];
      if (r.alerta_preco_baixo) alertas.push('Preço abaixo do mercado');
      if (r.alerta_preco_alto) alertas.push('Preço acima do mercado');
      if (r.alerta_deficit_alto) alertas.push('Alto déficit habitacional');
      
      return {
        cidade: r.cidade,
        estado: r.estado,
        preco_medio_m2: r.preco_medio_m2,
        deficit_habitacional: r.deficit_habitacional,
        alertas,
        data_atualizacao: r.data_atualizacao
      };
    });
  }
  
  return {
    trava_cpf: travaCpf,
    nexo_causal: nexoCausal,
    radar_5km: radar5km
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const cpf = searchParams.get('cpf');
    const broker_id = searchParams.get('broker_id');
    
    if (tipo === 'cpf' && cpf) {
      return await consultarPorCPF(cpf);
    }
    
    if (tipo === 'broker' && broker_id) {
      return await consultarPorBroker(broker_id);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Tipo de consulta inválido'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar compliance:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar compliance',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarPorCPF(cpf: string): Promise<NextResponse> {
  // Buscar trava de CPF
  const { data: trava } = await supabase
    .from('trava_cpf')
    .select('*')
    .eq('cpf_cliente', cpf)
    .single();
  
  if (!trava) {
    return NextResponse.json({
      success: true,
      data: null,
      message: 'CPF não encontrado'
    });
  }
  
  // Buscar nexo causal relacionado
  const { data: nexos } = await supabase
    .from('nexo_causal')
    .select(`
      *,
      brokers!inner(nome),
      clientes!inner(nome, cpf)
    `)
    .eq('clientes.cpf', cpf)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: {
      trava_cpf: trava,
      nexo_causal: nexos
    },
    message: 'CPF consultado com sucesso'
  });
}

async function consultarPorBroker(brokerId: string): Promise<NextResponse> {
  // Buscar todos os CPFs vinculados ao broker
  const { data: travas } = await supabase
    .from('trava_cpf')
    .select('*')
    .contains('corretores_vinculados', [brokerId])
    .order('created_at', { ascending: false });
  
  // Buscar nexo causal do broker
  const { data: nexos } = await supabase
    .from('nexo_causal')
    .select(`
      *,
      brokers!inner(nome),
      clientes!inner(nome)
    `)
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: {
      trava_cpf: travas,
      nexo_causal: nexos
    },
    message: 'Broker consultado com sucesso'
  });
}
