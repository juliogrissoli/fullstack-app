/**
 * 🏛️ SB IMPERIUM v14.0 - FEED DE IMPACTO SOCIAL
 * 
 * Widget em tempo real mostrando contratos assinados e Medidômetro da Função Social
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// 🎨 CORES SOBERANAS
const COLORS = {
  gold: '#D4AF37',
  deepOcean: '#0a1628',
  ocean: '#1e3a5f',
  lightGold: '#f4e5c2',
  white: '#ffffff',
  green: '#4CAF50',
  red: '#f44336',
  success: '#10b981'
};

// Interfaces
interface ImpactEvent {
  id: string;
  tipo: 'assinatura' | 'funcao_social' | 'marco_atingido';
  titulo: string;
  descricao: string;
  valor?: number;
  assinante?: string;
  deal_titulo?: string;
  timestamp: string;
  hash_auditoria?: string;
  icone: string;
  cor: string;
}

interface FuncaoSocialStats {
  total_funcao_social: number;
  total_contratos: number;
  valor_ultima_atualizacao: number;
  ultima_atualizacao: string;
  proximo_marco: number;
  progresso_proximo_marco: number;
}

interface ImpactFeedProps {
  className?: string;
  maxItems?: number;
}

export function ImpactFeed({ className = '', maxItems = 10 }: ImpactFeedProps) {
  const [events, setEvents] = useState<ImpactEvent[]>([]);
  const [stats, setStats] = useState<FuncaoSocialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  const supabase = createClient();

  // Buscar dados iniciais
  useEffect(() => {
    carregarDadosIniciais();
    
    // Configurar WebSocket/Realtime para atualizações
    configurarRealtime();
    
    // Atualizar periodicamente (fallback)
    const interval = setInterval(carregarDadosIniciais, 30000); // 30s
    
    return () => {
      clearInterval(interval);
      cleanupRealtime();
    };
  }, []);

  const carregarDadosIniciais = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Buscar eventos recentes
      const { data: eventosRecentes } = await supabase
        .from('impact_events_view')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(maxItems);
      
      // Buscar estatísticas da Função Social
      const { data: statsData } = await supabase
        .from('funcao_social_stats')
        .select('*')
        .eq('id', 'principal')
        .single();
      
      if (eventosRecentes) {
        setEvents(eventosRecentes);
      }
      
      if (statsData) {
        // Calcular próximo marco e progresso
        const marcos = [10000, 50000, 100000, 500000, 1000000];
        const proximoMarco = marcos.find(marco => marco > statsData.total_funcao_social) || marcos[marcos.length - 1];
        const progresso = ((statsData.total_funcao_social % proximoMarco) / proximoMarco) * 100;
        
        setStats({
          total_funcao_social: statsData.total_funcao_social,
          total_contratos: statsData.total_contratos || 0,
          valor_ultima_atualizacao: statsData.valor_ultima_atualizacao || 0,
          ultima_atualizacao: statsData.ultima_atualizacao,
          proximo_marco: proximoMarco,
          progresso_proximo_marco: progresso
        });
      }
      
      setIsConnected(true);
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do Feed de Impacto:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [maxItems]);

  const configurarRealtime = useCallback(() => {
    // Configurar canal de real-time do Supabase
    const channel = supabase
      .channel('impact_feed')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'signatures',
          filter: 'status=eq.assinado'
        }, 
        (payload) => {
          console.log('📡 Nova assinatura recebida:', payload);
          adicionarEventoAssinatura(payload.new);
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'funcao_social_stats'
        },
        (payload) => {
          console.log('📡 Função Social atualizada:', payload);
          atualizarStats(payload.new);
        }
      )
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'funcao_social_notificacoes'
        },
        (payload) => {
          console.log('📡 Marco atingido:', payload);
          adicionarEventoMarco(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('✅ Conectado ao feed de impacto em tempo real');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          console.error('❌ Erro na conexão do feed');
        }
      });

    // Salvar referência para cleanup
    (window as any).impactFeedChannel = channel;
  }, []);

  const cleanupRealtime = useCallback(() => {
    const channel = (window as any).impactFeedChannel;
    if (channel) {
      supabase.removeChannel(channel);
      delete (window as any).impactFeedChannel;
    }
  }, []);

  const adicionarEventoAssinatura = useCallback((signature: any) => {
    const novoEvento: ImpactEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo: 'assinatura',
      titulo: '📝 Novo Contrato Assinado',
      descricao: `${signature.nome_assinante} assinou ${signature.deal_titulo || 'contrato'}`,
      valor: signature.valor_contrato,
      assinante: signature.nome_assinante,
      deal_titulo: signature.deal_titulo,
      timestamp: signature.data_assinatura,
      hash_auditoria: signature.hash_auditoria,
      icone: '✍️',
      cor: COLORS.success
    };
    
    setEvents(prev => [novoEvento, ...prev.slice(0, maxItems - 1)]);
    
    // Atualizar contador de contratos
    if (stats) {
      setStats(prev => prev ? {
        ...prev,
        total_contratos: prev.total_contratos + 1
      } : null);
    }
  }, [maxItems, stats]);

  const atualizarStats = useCallback((newStats: any) => {
    if (newStats.total_funcao_social !== stats?.total_funcao_social) {
      // Adicionar evento de atualização da Função Social
      const diferenca = newStats.total_funcao_social - (stats?.total_funcao_social || 0);
      
      if (diferenca > 0) {
        const eventoFuncao: ImpactEvent = {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tipo: 'funcao_social',
          titulo: '💰 Função Social Atualizada',
          descricao: `+R$ ${diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para a Função Social de Jesus`,
          valor: diferenca,
          timestamp: new Date().toISOString(),
          icone: '🏛️',
          cor: COLORS.gold
        };
        
        setEvents(prev => [eventoFuncao, ...prev.slice(0, maxItems - 1)]);
      }
    }
    
    setStats({
      total_funcao_social: newStats.total_funcao_social,
      total_contratos: newStats.total_contratos || 0,
      valor_ultima_atualizacao: newStats.valor_ultima_atualizacao || 0,
      ultima_atualizacao: newStats.ultima_atualizacao,
      proximo_marco: stats?.proximo_marco || 10000,
      progresso_proximo_marco: ((newStats.total_funcao_social % (stats?.proximo_marco || 10000)) / (stats?.proximo_marco || 10000)) * 100
    });
  }, [stats, maxItems]);

  const adicionarEventoMarco = useCallback((notificacao: any) => {
    const eventoMarco: ImpactEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo: 'marco_atingido',
      titulo: '🎯 MARCO HISTÓRICO!',
      descricao: `R$ ${notificacao.valor_marco.toLocaleString('pt-BR')} atingidos na Função Social!`,
      valor: notificacao.valor_marco,
      timestamp: notificacao.criada_em,
      icone: '🏆',
      cor: COLORS.gold
    };
    
    setEvents(prev => [eventoMarco, ...prev.slice(0, maxItems - 1)]);
  }, [maxItems]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarTempo = (timestamp: string) => {
    const data = new Date(timestamp);
    const agora = new Date();
    const diferencaMs = agora.getTime() - data.getTime();
    const diferencaMinutos = Math.floor(diferencaMs / 60000);
    
    if (diferencaMinutos < 1) return 'Agora';
    if (diferencaMinutos < 60) return `${diferencaMinutos}min`;
    
    const diferencaHoras = Math.floor(diferencaMinutos / 60);
    if (diferencaHoras < 24) return `${diferencaHoras}h`;
    
    const diferencaDias = Math.floor(diferencaHoras / 24);
    return `${diferencaDias}d`;
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-t-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                 style={{ borderColor: COLORS.gold, borderTopColor: 'transparent' }} />
            <p className="text-gray-400">Carregando Feed de Impacto...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: COLORS.gold }}>
            📊 Feed de Impacto Social
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </h2>
          <p className="text-sm text-gray-400">Contratos e Função Social em tempo real</p>
        </div>
        
        {stats && (
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: COLORS.gold }}>
              {formatarMoeda(stats.total_funcao_social)}
            </div>
            <div className="text-xs text-gray-400">Função Social Total</div>
          </div>
        )}
      </div>

      {/* Medidômetro */}
      {stats && (
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: COLORS.ocean }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium" style={{ color: COLORS.lightGold }}>
              🏛️ Medidômetro da Função Social
            </span>
            <span className="text-sm" style={{ color: COLORS.gold }}>
              {stats.progresso_proximo_marco.toFixed(1)}%
            </span>
          </div>
          
          <div className="h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: COLORS.deepOcean }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                backgroundColor: COLORS.gold,
                width: `${stats.progresso_proximo_marco}%`,
                boxShadow: `0 0 10px ${COLORS.gold}`
              }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>R$ {stats.total_funcao_social.toLocaleString('pt-BR')}</span>
            <span>Próximo marco: R$ {stats.proximo_marco.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      )}

      {/* Lista de Eventos */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-400">Nenhum evento recente</p>
            <p className="text-xs text-gray-500 mt-1">Os eventos aparecerão aqui em tempo real</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-lg border transition-all hover:opacity-80"
              style={{ 
                borderColor: event.cor,
                backgroundColor: `${event.cor}10`
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{event.icone}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-white truncate">
                      {event.titulo}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatarTempo(event.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-300 mb-1">
                    {event.descricao}
                  </p>
                  
                  {event.valor && (
                    <div className="text-sm font-medium" style={{ color: event.cor }}>
                      {formatarMoeda(event.valor)}
                    </div>
                  )}
                  
                  {event.hash_auditoria && (
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      Hash: {event.hash_auditoria.substring(0, 12)}...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>📝 {stats?.total_contratos || 0} contratos</span>
            <span>🏛️ {formatarMoeda(stats?.total_funcao_social || 0)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImpactFeed;
