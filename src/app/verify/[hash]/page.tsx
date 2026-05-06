'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function VerificationPage({ params }: { params: { hash: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      const { data: signature } = await supabase
        .from('sb_signatures')
        .select(`
          *,
          sb_deals ( property_address, buyer_name, seller_name, value )
        `)
        .eq('document_hash', params.hash)
        .single();
      
      setData(signature);
      setLoading(false);
    }
    verify();
  }, [params.hash]);

  if (loading) return <div className="flex justify-center p-20 text-sb-gold">Verificando Nexo Causal...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-md mx-auto border border-sb-gold rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Cabeçalho de Status */}
        <div className={`p-8 text-center ${data ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
          {data ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-black text-green-500">DOCUMENTO AUTÊNTICO</h1>
              <p className="text-xs text-gray-400 mt-2">Auditado via SB Signature v14.0</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-black text-red-500">HASH NÃO ENCONTRADO</h1>
              <p className="text-xs text-gray-400 mt-2">Atenção: Este documento pode ser apócrifo.</p>
            </>
          )}
        </div>

        {data && (
          <div className="p-8 space-y-6">
            {/* Detalhes do Deal */}
            <div>
              <p className="text-xs text-sb-gold font-bold uppercase tracking-widest">Propriedade</p>
              <p className="text-lg font-medium">{data.sb_deals.property_address}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs text-sb-gold font-bold uppercase tracking-widest">Signatário</p>
                <p className="text-sm">{data.signer_name}</p>
              </div>
              <div>
                <p className="text-xs text-sb-gold font-bold uppercase tracking-widest">Data/Hora</p>
                <p className="text-sm">{new Date(data.signed_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Prova Técnica */}
            <div className="bg-white/5 p-4 rounded-lg">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Hash de Integridade (SHA-256)</p>
              <code className="text-[10px] break-all text-gray-300 leading-none">{data.document_hash}</code>
            </div>

            <div className="pt-4 text-center">
               <p className="text-[9px] text-gray-500 italic">
                A validade deste documento é garantida pela MP 2.200-2/2001. <br/>
                Esta operação cumpre a <strong>Função Social de Jesus</strong>.
               </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-center mt-8">
        <p className="text-sb-gold text-xs font-black tracking-widest">SECURITY BROKER IMPERIUM</p>
      </div>
    </div>
  );
}
