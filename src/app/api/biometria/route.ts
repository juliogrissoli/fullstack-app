// 🏛️ SECURITY BROKER SB v13 - BIOMETRIA FACIAL
// Sistema de assinatura online com biometria facial e registro de IP (Lastro Jurídico)

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

let _supabase: ReturnType<typeof createClient> | null = null;
const supabase = new Proxy({}, {
  get(_: unknown, prop: string | symbol) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return Reflect.get(_supabase, prop);
  },
}) as SupabaseClient<any>;

interface BiometriaRequest {
  venda_id: string;
  lead_id: string;
  broker_id: string;
  dados_assinatura: {
    nome_completo: string;
    cpf: string;
    email: string;
    telefone: string;
  };
  biometria: {
    foto_base64: string;
    face_id?: string;
    confidence_score?: number;
  };
  dispositivo: {
    ip_address: string;
    user_agent: string;
    fingerprint?: string;
  };
  localizacao?: {
    latitude: number;
    longitude: number;
    precisao?: number;
  };
}

interface BiometriaResponse {
  success: boolean;
  assinatura_id?: string;
  hash_assinatura?: string;
  status_validacao?: 'aprovada' | 'rejeitada' | 'pendente';
  mensagem?: string;
  detalhes?: {
    validacao_biometrica: boolean;
    validacao_dispositivo: boolean;
    score_confianca: number;
    timestamp_assinatura: string;
    ip_registrado: string;
    localizacao_registrada?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BiometriaRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.venda_id || !body.lead_id || !body.biometria.foto_base64) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // 1. Validar biometria facial
    const resultadoBiometria = await validarBiometriaFacial(body.biometria);
    
    if (!resultadoBiometria.valida) {
      // Registrar tentativa falha
      await registrarTentativaAssinatura(body, 'rejeitada', resultadoBiometria.motivo || 'Motivo não especificado');
      
      return NextResponse.json({
        success: false,
        error: 'Validação biométrica falhou',
        detalhes: resultadoBiometria
      }, { status: 400 });
    }

    // 2. Validar dispositivo e IP
    const validacaoDispositivo = await validarDispositivo(body.dispositivo);
    
    if (!validacaoDispositivo.valido) {
      await registrarTentativaAssinatura(body, 'rejeitada', 'Dispositivo não autorizado');
      
      return NextResponse.json({
        success: false,
        error: 'Dispositivo não autorizado',
        detalhes: validacaoDispositivo
      }, { status: 403 });
    }

    // 3. Gerar hash da assinatura (Lastro Jurídico)
    const hashAssinatura = gerarHashAssinatura(body);

    // 4. Registrar assinatura no banco
    const assinaturaId = await registrarAssinatura(body, hashAssinatura, resultadoBiometria);

    // 5. Atualizar status da venda
    await atualizarStatusVenda(body.venda_id, 'confirmada', hashAssinatura);

    // 6. Gerar documento final
    const documentoFinal = await gerarDocumentoFinal(body, hashAssinatura);

    // 7. Enviar notificações
    await enviarNotificacoesAssinatura(body, hashAssinatura);

    const response: BiometriaResponse = {
      success: true,
      assinatura_id: assinaturaId,
      hash_assinatura: hashAssinatura,
      status_validacao: 'aprovada',
      mensagem: 'Assinatura biométrica realizada com sucesso',
      detalhes: {
        validacao_biometrica: true,
        validacao_dispositivo: true,
        score_confianca: resultadoBiometria.score_confianca,
        timestamp_assinatura: new Date().toISOString(),
        ip_registrado: body.dispositivo.ip_address,
        localizacao_registrada: body.localizacao ? 
          `${body.localizacao.latitude}, ${body.localizacao.longitude}` : undefined
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Erro na assinatura biométrica:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na assinatura biométrica',
      details: error.message
    }, { status: 500 });
  }
}

async function validarBiometriaFacial(biometria: BiometriaRequest['biometria']): Promise<{
  valida: boolean;
  score_confianca: number;
  motivo?: string;
  face_id?: string;
}> {
  try {
    // Simulação de validação biométrica (em produção, integrar com API real)
    const fotoBase64 = biometria.foto_base64;
    
    // Validações básicas
    if (!fotoBase64 || fotoBase64.length < 1000) {
      return {
        valida: false,
        score_confianca: 0,
        motivo: 'Foto inválida ou muito pequena'
      };
    }

    // Verificar se é uma imagem base64 válida
    if (!fotoBase64.startsWith('data:image/')) {
      return {
        valida: false,
        score_confianca: 0,
        motivo: 'Formato de imagem inválido'
      };
    }

    // Simular análise de confiança (em produção, usar API de reconhecimento facial)
    const scoreConfianca = Math.random() * 30 + 70; // 70-100%
    const faceId = `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Critérios de aprovação
    if (scoreConfianca < 75) {
      return {
        valida: false,
        score_confianca: scoreConfianca,
        motivo: 'Baixa confiança na validação facial'
      };
    }

    return {
      valida: true,
      score_confianca: scoreConfianca,
      face_id: faceId
    };

  } catch (error: any) {
    return {
      valida: false,
      score_confianca: 0,
      motivo: `Erro na validação biométrica: ${error.message}`
    };
  }
}

async function validarDispositivo(dispositivo: BiometriaRequest['dispositivo']): Promise<{
  valido: boolean;
  motivo?: string;
  fingerprint?: string;
}> {
  try {
    const ipAddress = dispositivo.ip_address;
    const userAgent = dispositivo.user_agent;

    // Validações básicas
    if (!ipAddress || !userAgent) {
      return {
        valido: false,
        motivo: 'IP ou User Agent não fornecido'
      };
    }

    // Verificar se IP está em blacklist (simulado)
    const ipBlacklist = ['0.0.0.0', '127.0.0.1'];
    if (ipBlacklist.includes(ipAddress)) {
      return {
        valido: false,
        motivo: 'IP em blacklist'
      };
    }

    // Gerar fingerprint do dispositivo
    const fingerprint = gerarFingerprint(ipAddress, userAgent);

    // Verificar se dispositivo já foi usado recentemente (anti-fraude)
    const dispositivoUsadoRecentemente = await verificarDispositivoRecente(fingerprint);
    
    if (dispositivoUsadoRecentemente) {
      return {
        valido: false,
        motivo: 'Dispositivo usado em assinatura muito recente',
        fingerprint
      };
    }

    return {
      valido: true,
      fingerprint
    };

  } catch (error: any) {
    return {
      valido: false,
      motivo: `Erro na validação do dispositivo: ${error.message}`
    };
  }
}

function gerarFingerprint(ipAddress: string, userAgent: string): string {
  const data = `${ipAddress}:${userAgent}:${Date.now()}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 32);
}

async function verificarDispositivoRecente(fingerprint: string): Promise<boolean> {
  try {
    // Verificar se houve assinatura com mesmo fingerprint nas últimas 5 minutos
    const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('assinaturas_biometricas')
      .select('id')
      .eq('dispositivo_fingerprint', fingerprint)
      .gte('created_at', cincoMinutosAtras.toISOString())
      .limit(1);

    return !error && data && data.length > 0;
  } catch {
    return false;
  }
}

function gerarHashAssinatura(request: BiometriaRequest): string {
  const dados = {
    venda_id: request.venda_id,
    lead_id: request.lead_id,
    broker_id: request.broker_id,
    dados_assinatura: request.dados_assinatura,
    ip_address: request.dispositivo.ip_address,
    user_agent: request.dispositivo.user_agent,
    timestamp: new Date().toISOString(),
    biometria_hash: createHash('sha256').update(request.biometria.foto_base64).digest('hex')
  };

  return createHash('sha256').update(JSON.stringify(dados)).digest('hex');
}

async function registrarAssinatura(
  request: BiometriaRequest,
  hashAssinatura: string,
  resultadoBiometria: any
): Promise<string> {
  try {
    const assinaturaData = {
      venda_id: request.venda_id,
      lead_id: request.lead_id,
      broker_id: request.broker_id,
      dados_assinatura: request.dados_assinatura,
      biometria: {
        face_id: resultadoBiometria.face_id,
        confidence_score: resultadoBiometria.score_confianca,
        foto_armazenada_url: await armazenarFotoBiometria(request.biometria.foto_base64)
      },
      dispositivo: {
        ip_address: request.dispositivo.ip_address,
        user_agent: request.dispositivo.user_agent,
        fingerprint: gerarFingerprint(request.dispositivo.ip_address, request.dispositivo.user_agent)
      },
      localizacao: request.localizacao,
      hash_assinatura: hashAssinatura,
      status: 'aprovada',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('assinaturas_biometricas')
      .insert(assinaturaData)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Erro ao registrar assinatura: ${error.message}`);
    }

    return data.id;
  } catch (error: any) {
    console.error('Erro ao registrar assinatura:', error);
    throw error;
  }
}

async function armazenarFotoBiometria(fotoBase64: string): Promise<string> {
  try {
    // Em produção, armazenar em serviço de storage (AWS S3, etc.)
    // Por enquanto, retornar URL simulada
    const fotoId = `biometria_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return `https://storage.securitybroker.com.br/biometria/${fotoId}.jpg`;
  } catch (error) {
    console.error('Erro ao armazenar foto:', error);
    return '';
  }
}

async function atualizarStatusVenda(vendaId: string, status: string, hashAssinatura: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('vendas')
      .update({
        status,
        biometria_assinatura: true,
        ip_assinatura: new Date().toISOString(),
        hash_contrato: hashAssinatura,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendaId);

    if (error) {
      throw new Error(`Erro ao atualizar venda: ${error.message}`);
    }
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    throw error;
  }
}

async function gerarDocumentoFinal(request: BiometriaRequest, hashAssinatura: string): Promise<string> {
  try {
    // Gerar documento final com todos os dados da assinatura
    const documento = {
      tipo: 'CONTRATO_VENDA_IMOBILIARIA',
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR'),
      partes: {
        comprador: request.dados_assinatura,
        vendedor: 'Security Broker SB',
        corretor: request.broker_id
      },
      assinatura: {
        metodo: 'BIOMETRIA FACIAL',
        hash: hashAssinatura,
        ip: request.dispositivo.ip_address,
        dispositivo: request.dispositivo.user_agent,
        localizacao: request.localizacao
      },
      lastro_juridico: {
        artigo_725_cc: 'Proteção de comissão',
        lgpd: 'Conformidade com Lei 13.709/2018',
        validade: 'Indeterminada'
      }
    };

    // Em produção, gerar PDF e armazenar
    return `CONTRATO_${hashAssinatura.substring(0, 8)}.pdf`;
  } catch (error) {
    console.error('Erro ao gerar documento:', error);
    return '';
  }
}

async function enviarNotificacoesAssinatura(request: BiometriaRequest, hashAssinatura: string): Promise<void> {
  try {
    // Notificar broker
    await supabase
      .from('notificacoes')
      .insert({
        broker_id: request.broker_id,
        lead_id: request.lead_id,
        tipo: 'info',
        titulo: 'Assinatura Biométrica Realizada',
        mensagem: `Assinatura biométrica realizada com sucesso para venda ${request.venda_id}. Hash: ${hashAssinatura.substring(0, 16)}...`,
        status: 'nao_lida'
      });

    // Notificar incorporadora
    const { data: venda } = await supabase
      .from('vendas')
      .select('incorporadora_id')
      .eq('id', request.venda_id)
      .single();

    if (venda) {
      await supabase
        .from('notificacoes')
        .insert({
          incorporadora_id: venda.incorporadora_id,
          tipo: 'info',
          titulo: 'Venda Confirmada com Assinatura Biométrica',
          mensagem: `Venda ${request.venda_id} confirmada com assinatura biométrica. Cliente: ${request.dados_assinatura.nome_completo}`,
          status: 'nao_lida'
        });
    }

  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
  }
}

async function registrarTentativaAssinatura(
  request: BiometriaRequest,
  status: string,
  motivo: string
): Promise<void> {
  try {
    await supabase
      .from('tentativas_assinatura')
      .insert({
        venda_id: request.venda_id,
        lead_id: request.lead_id,
        broker_id: request.broker_id,
        status,
        motivo,
        ip_address: request.dispositivo.ip_address,
        user_agent: request.dispositivo.user_agent,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Erro ao registrar tentativa:', error);
  }
}

// Endpoint para verificar status de assinatura
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendaId = searchParams.get('venda_id');
    
    if (!vendaId) {
      return NextResponse.json({
        success: false,
        error: 'venda_id é obrigatório'
      }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('vendas')
      .select(`
        *,
        assinaturas_biometricas(*)
      `)
      .eq('id', vendaId)
      .single();
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Venda não encontrada'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        venda_id: data.id,
        status: data.status,
        biometria_assinatura: data.biometria_assinatura,
        hash_contrato: data.hash_contrato,
        ip_assinatura: data.ip_assinatura,
        assinatura_biometrica: data.assinaturas_biometricas
      }
    });
    
  } catch (error: any) {
    console.error('Erro ao verificar assinatura:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao verificar assinatura',
      details: error.message
    }, { status: 500 });
  }
}
