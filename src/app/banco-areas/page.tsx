import { createClient } from '@/lib/supabase/server';

export default async function BancoAreasPage() {
  const supabase = await createClient();

  const { data: areas } = await supabase
    .from('banco_areas')
    .select('*')
    .eq('status', 'disponivel')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-500 mb-2">Banco de Áreas B2B</h1>
      <p className="text-gray-400 mb-8">Áreas disponíveis para desenvolvimento e investimento</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas && areas.length > 0 ? (
          areas.map((area) => (
            <div key={area.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-yellow-500 transition">
              <h2 className="text-lg font-semibold text-yellow-400 mb-1">{area.titulo}</h2>
              <p className="text-gray-400 text-sm mb-3">{area.descricao}</p>
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div>
                  <p className="text-gray-500 text-xs">Área</p>
                  <p className="font-medium">{area.area_m2 ? `${area.area_m2} m²` : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Zoneamento</p>
                  <p className="font-medium">{area.zoneamento ?? '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Preço/m²</p>
                  <p className="font-medium text-green-400">
                    {area.preco_m2
                      ? `R$ ${Number(area.preco_m2).toLocaleString('pt-BR')}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Status</p>
                  <span className="px-2 py-0.5 bg-green-900 text-green-300 rounded-full text-xs">
                    {area.status}
                  </span>
                </div>
              </div>
              <button className="w-full py-2 bg-yellow-500 text-gray-900 rounded-lg font-semibold text-sm hover:bg-yellow-400 transition">
                Solicitar Informações
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center text-gray-500 py-16">
            Nenhuma área disponível no momento.
          </div>
        )}
      </div>
    </main>
  );
}
