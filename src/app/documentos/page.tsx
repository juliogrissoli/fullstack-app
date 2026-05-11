'use client';

import { useState, useRef } from 'react';

const TIPOS_DOCUMENTO = ['matricula', 'iptu', 'rg', 'cpf', 'contrato', 'outros'];

const statusColor: Record<string, string> = {
  pendente: 'bg-yellow-900 text-yellow-300',
  processado: 'bg-green-900 text-green-300',
  pendente_manual: 'bg-red-900 text-red-300',
};

export default function DocumentosPage() {
  const [tipo, setTipo] = useState('matricula');
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setResultado(null);

    const fd = new FormData();
    fd.append('documento', file);
    fd.append('tipo', tipo);

    const res = await fetch('/api/documentos/upload', { method: 'POST', body: fd });
    const json = await res.json();
    setResultado(json);
    setUploading(false);
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-500 mb-2">Doc Vault</h1>
      <p className="text-gray-400 mb-8">Cofre seguro de documentos com validação automática</p>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Enviar Documento</h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Tipo de documento</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Arquivo (imagem ou PDF)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-yellow-500 file:text-gray-900 file:text-sm"
          />
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-2 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-400 transition disabled:opacity-50"
        >
          {uploading ? 'Enviando...' : 'Enviar e Processar'}
        </button>
      </div>

      {resultado && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-3">Resultado</h2>
          {resultado.success ? (
            <div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[(resultado.documento as Record<string,string>)?.status] ?? 'bg-gray-700 text-gray-300'}`}>
                {(resultado.documento as Record<string,string>)?.status}
              </span>
              <pre className="mt-3 text-xs text-gray-400 overflow-auto">
                {JSON.stringify(resultado.documento, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-red-400">{resultado.error as string}</p>
          )}
        </div>
      )}
    </main>
  );
}
