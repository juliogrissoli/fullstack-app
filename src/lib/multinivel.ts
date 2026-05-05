// 🏛️ SECURITY BROKER SB v7.0 - REDE MULTINÍVEL
// Sistema de repasses multinível até 5 níveis

// Percentuais de repasse por nível (5% total distribuído)
export const PERCENTUAIS_MULTINIVEL = [5.0, 4.0, 3.0, 2.0, 1.0];
export const PERCENTUAL_SB = 20; // 20% do Security Broker

export interface RepasseCalculado {
  nivel: number;
  percentual: number;
  valor: number;
}

export function calcularRepasses(valorHonorario: number): RepasseCalculado[] {
  const valorSB = valorHonorario * PERCENTUAL_SB / 100;
  
  return PERCENTUAIS_MULTINIVEL.map((percentual, index) => ({
    nivel: index + 1,
    percentual,
    valor: valorSB * percentual / 100
  }));
}

export function calcularValorTotalRepasses(valorHonorario: number): number {
  const valorSB = valorHonorario * PERCENTUAL_SB / 100;
  const totalPercentual = PERCENTUAIS_MULTINIVEL.reduce((sum, pct) => sum + pct, 0);
  return valorSB * totalPercentual / 100;
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

export function gerarLinkIndicacao(codigoIndicacao: string, baseUrl?: string): string {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://imobai.vercel.app';
  return `${url}/cadastro?indica=${codigoIndicacao}`;
}

export function validarCodigoIndicacao(codigo: string): boolean {
  // Código deve ter exatamente 8 caracteres alfanuméricos
  return /^[a-zA-Z0-9]{8}$/.test(codigo);
}

export async function buscarCodigoIndicacao(supabase: any, codigo: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email, foto_url, sb_score')
    .eq('codigo_indicacao', codigo)
    .eq('ativo', true)
    .single();
    
  if (error) {
    console.error('Erro ao buscar código de indicação:', error);
    return null;
  }
    
  return data;
}

export async function registrarIndicacao(supabase: any, novoUserId: string, codigoIndicacao: string) {
  // Buscar quem indicou
  const indicador = await buscarCodigoIndicacao(supabase, codigoIndicacao);
  
  if (!indicador) {
    throw new Error('Código de indicação inválido');
  }
  
  // Atualizar o novo usuário com quem o indicou
  const { error } = await supabase
    .from('profiles')
    .update({ indicado_por: indicador.id })
    .eq('id', novoUserId);
    
  if (error) {
    console.error('Erro ao registrar indicação:', error);
    throw error;
  }
  
  return indicador;
}

export function calcularNivelUsuario(indicadoPor: string | null): number {
  // Esta função seria usada em um contexto real para calcular o nível
  // baseado na cadeia de indicações. Por enquanto, retorna 1 como padrão
  return 1;
}

export function getBadgePorNivel(nivel: number): string {
  const badges = {
    1: '🥇 Elite',
    2: '🥈 Master',
    3: '🥉 Expert',
    4: '💎 Pro',
    5: '⭐ Starter'
  };
  
  return badges[nivel as keyof typeof badges] || '⭐ Starter';
}

export function getCorPorNivel(nivel: number): string {
  const cores = {
    1: '#FFD700', // Dourado
    2: '#C0C0C0', // Prata
    3: '#CD7F32', // Bronze
    4: '#00CED1', // Azul turquesa
    5: '#32CD32'  // Verde
  };
  
  return cores[nivel as keyof typeof cores] || '#32CD32';
}
