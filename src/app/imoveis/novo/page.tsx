'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const TIPOS = [
    { value: 'apartamento', label: 'Apartamento' },
    { value: 'casa', label: 'Casa' },
    { value: 'terreno', label: 'Terreno' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'rural', label: 'Rural' },
    { value: 'galpao', label: 'Galpão' },
];

interface FormState {
    titulo: string;
    tipo: string;
    bairro: string;
    endereco: string;
    descricao: string;
    valor: string;
    area_m2: string;
    quartos: string;
    banheiros: string;
    vagas: string;
}

const EMPTY: FormState = {
    titulo: '', tipo: 'apartamento', bairro: '', endereco: '',
    descricao: '', valor: '', area_m2: '', quartos: '', banheiros: '', vagas: '',
};

export default function NovoImovelPage() {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'saving' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? []);
        if (!picked.length) return;
        setFiles(prev => [...prev, ...picked]);
        setPreviews(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
    };

    const removePhoto = (i: number) => {
        URL.revokeObjectURL(previews[i]);
        setFiles(prev => prev.filter((_, idx) => idx !== i));
        setPreviews(prev => prev.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.titulo.trim()) { setErrorMsg('Título é obrigatório.'); return; }
        if (!form.valor || Number(form.valor) <= 0) { setErrorMsg('Informe um valor válido.'); return; }
        setErrorMsg('');

        const supabase = createClient();

        // 1. Upload photos
        const fotoUrls: string[] = [];
        if (files.length > 0) {
            setStatus('uploading');
            for (const file of files) {
                const ext = file.name.split('.').pop() ?? 'jpg';
                const path = `imoveis/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from('property-images')
                    .upload(path, file, { upsert: false, contentType: file.type });
                if (upErr) {
                    setErrorMsg(`Erro no upload: ${upErr.message}`);
                    setStatus('error');
                    return;
                }
                const { data } = supabase.storage.from('property-images').getPublicUrl(path);
                fotoUrls.push(data.publicUrl);
            }
        }

        // 2. Create property
        setStatus('saving');
        const res = await fetch('/api/imoveis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo: form.titulo,
                tipo: form.tipo,
                bairro: form.bairro,
                endereco: form.endereco,
                descricao: form.descricao,
                valor: Number(form.valor),
                area_m2: form.area_m2 ? Number(form.area_m2) : null,
                quartos: form.quartos ? Number(form.quartos) : null,
                banheiros: form.banheiros ? Number(form.banheiros) : null,
                vagas: form.vagas ? Number(form.vagas) : null,
                fotos: fotoUrls,
            }),
        });

        const json = await res.json();
        if (!res.ok) {
            setErrorMsg(json.error || 'Erro ao cadastrar imóvel.');
            setStatus('error');
            return;
        }

        router.push(`/dashboard/tours/${json.id}`);
    };

    const busy = status === 'uploading' || status === 'saving';
    const busyLabel = status === 'uploading' ? `Enviando fotos (${files.length})…` : 'Salvando imóvel…';

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <Link href="/dashboard" className="text-[#D4AF37] hover:underline text-sm">
                    ← Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-white mt-2 mb-8">Cadastrar Imóvel</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Identificação */}
                    <section className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wide">Identificação</h2>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Título *</label>
                            <input
                                type="text"
                                value={form.titulo}
                                onChange={set('titulo')}
                                placeholder="Ex: Apartamento Alto Padrão — Higienópolis"
                                required
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Tipo</label>
                                <select
                                    value={form.tipo}
                                    onChange={set('tipo')}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                                >
                                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Bairro</label>
                                <input
                                    type="text"
                                    value={form.bairro}
                                    onChange={set('bairro')}
                                    placeholder="Ex: Higienópolis"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Endereço completo</label>
                            <input
                                type="text"
                                value={form.endereco}
                                onChange={set('endereco')}
                                placeholder="Rua, número, complemento"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                            />
                        </div>
                    </section>

                    {/* Valores e Dimensões */}
                    <section className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wide">Valores e Dimensões</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Valor (R$) *</label>
                                <input
                                    type="number"
                                    value={form.valor}
                                    onChange={set('valor')}
                                    min="0"
                                    step="1000"
                                    placeholder="850000"
                                    required
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Área (m²)</label>
                                <input
                                    type="number"
                                    value={form.area_m2}
                                    onChange={set('area_m2')}
                                    min="0"
                                    placeholder="120"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Quartos</label>
                                <input
                                    type="number"
                                    value={form.quartos}
                                    onChange={set('quartos')}
                                    min="0"
                                    placeholder="3"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Banheiros</label>
                                <input
                                    type="number"
                                    value={form.banheiros}
                                    onChange={set('banheiros')}
                                    min="0"
                                    placeholder="2"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm text-gray-400 mb-1.5">Vagas de garagem</label>
                                <input
                                    type="number"
                                    value={form.vagas}
                                    onChange={set('vagas')}
                                    min="0"
                                    placeholder="2"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Descrição */}
                    <section className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wide">Descrição</h2>
                        <textarea
                            value={form.descricao}
                            onChange={set('descricao')}
                            rows={5}
                            placeholder="Descreva os diferenciais do imóvel, acabamentos, vista, localização…"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
                        />
                    </section>

                    {/* Fotos */}
                    <section className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wide">
                            Fotos <span className="text-gray-500 normal-case font-normal">(JPG, PNG ou WebP)</span>
                        </h2>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handlePhotos}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#D4AF37] file:text-gray-900 file:font-medium hover:file:bg-yellow-400 cursor-pointer"
                        />
                        {previews.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
                                {previews.map((url, i) => (
                                    <div key={i} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-700">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(i)}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {errorMsg && (
                        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
                            {errorMsg}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-4 bg-[#D4AF37] text-gray-900 font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
                    >
                        {busy ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                                {busyLabel}
                            </span>
                        ) : 'Cadastrar Imóvel'}
                    </button>
                </form>
            </div>
        </div>
    );
}
