'use client';
import { useState, useRef } from 'react';
import { TourScene } from '@/lib/tours';

interface Props {
    imovelId: string;
    initialScenes: TourScene[];
}

export default function TourUploader({ imovelId, initialScenes }: Props) {
    const [scenes, setScenes] = useState<TourScene[]>(initialScenes);
    const [titulo, setTitulo] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(f));
        setErrorMsg('');
    };

    const handleUpload = async () => {
        if (!file || !titulo.trim()) return;
        setUploading(true);
        setErrorMsg('');

        const form = new FormData();
        form.append('file', file);
        form.append('imovel_id', imovelId);
        form.append('titulo', titulo.trim());

        try {
            const res = await fetch('/api/tour/upload', { method: 'POST', body: form });
            const json = await res.json();
            if (!res.ok) { setErrorMsg(json.error || 'Erro ao enviar imagem'); return; }
            setScenes(json.scenes ?? []);
            setFile(null);
            setPreview(null);
            setTitulo('');
            if (fileRef.current) fileRef.current.value = '';
        } catch {
            setErrorMsg('Erro de conexão. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (sceneId: string) => {
        setDeletingId(sceneId);
        try {
            const res = await fetch('/api/tour/scene', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imovel_id: imovelId, scene_id: sceneId }),
            });
            const json = await res.json();
            if (res.ok) setScenes(json.scenes ?? []);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Upload form */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[#D4AF37]">Adicionar cena panorâmica</h2>

                <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Título da cena</label>
                    <input
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Ex: Sala de estar, Suíte master…"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1.5">
                        Imagem 360° <span className="text-gray-500">(equiretangular — JPG, PNG ou WebP)</span>
                    </label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#D4AF37] file:text-gray-900 file:font-medium hover:file:bg-yellow-400 cursor-pointer"
                    />
                </div>

                {preview && (
                    <div className="rounded-lg overflow-hidden border border-gray-600" style={{ height: '160px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Pré-visualização" className="w-full h-full object-cover" />
                    </div>
                )}

                {errorMsg && (
                    <p className="text-red-400 text-sm">{errorMsg}</p>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!file || !titulo.trim() || uploading}
                    className="w-full py-3 bg-[#D4AF37] text-gray-900 font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {uploading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                            Enviando…
                        </span>
                    ) : 'Adicionar cena'}
                </button>
            </div>

            {/* Scene list */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white">
                    Cenas cadastradas
                    <span className="ml-2 text-sm font-normal text-gray-400">({scenes.length})</span>
                </h2>

                {scenes.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center text-gray-500 text-sm">
                        Nenhuma cena cadastrada. Envie a primeira imagem acima.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {scenes.map((cena) => (
                            <div key={cena.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                <div className="h-36 overflow-hidden bg-gray-700">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={cena.imageUrl}
                                        alt={cena.titulo}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="px-4 py-3 flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-gray-200 truncate">{cena.titulo}</span>
                                    <button
                                        onClick={() => handleDelete(cena.id)}
                                        disabled={deletingId === cena.id}
                                        className="text-red-400 hover:text-red-300 text-xs font-medium flex-shrink-0 disabled:opacity-50"
                                    >
                                        {deletingId === cena.id ? 'Removendo…' : 'Remover'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
