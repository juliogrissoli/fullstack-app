'use client';
import { useEffect, useRef, useState } from 'react';
import LeadCaptureTour from '@/components/LeadCaptureTour';

interface Hotspot {
    pitch: number;
    yaw: number;
    text: string;
    type?: 'info' | 'scene';
}

interface Cena {
    id: string;
    titulo: string;
    imageUrl: string;
    hotspots?: Hotspot[];
}

interface TourImersivoProps {
    imovelId: string;
    cenas: Cena[];
}

const ENGAJAMENTO_THRESHOLD_MS = 120_000; // 2 minutos

export default function TourImersivo({ imovelId, cenas }: TourImersivoProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [cenaAtual, setCenaAtual] = useState(0);
    const [carregado, setCarregado] = useState(false);
    const [intencaoAlta, setIntencaoAlta] = useState(false);
    const [duracaoEngajamento, setDuracaoEngajamento] = useState(0);
    const inicioRef = useRef<number>(Date.now());
    const engajamentoRegistradoRef = useRef(false);
    const pannellumRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !viewerRef.current || cenas.length === 0) return;

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
        script.onload = () => inicializarViewer();
        document.head.appendChild(script);

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
        document.head.appendChild(link);

        return () => {
            if (pannellumRef.current) {
                try { pannellumRef.current.destroy(); } catch {}
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const inicializarViewer = () => {
        if (!viewerRef.current || !(window as any).pannellum) return;
        const cena = cenas[cenaAtual];

        pannellumRef.current = (window as any).pannellum.viewer(viewerRef.current, {
            type: 'equirectangular',
            panorama: cena.imageUrl,
            autoLoad: true,
            autoRotate: -2,
            compass: false,
            showControls: true,
            hotSpots: (cena.hotspots || []).map((h) => ({
                pitch: h.pitch,
                yaw: h.yaw,
                type: h.type === 'scene' ? 'scene' : 'info',
                text: h.text,
                cssClass: 'hotspot-anjoimob',
            })),
        });

        pannellumRef.current.on('load', () => setCarregado(true));
    };

    useEffect(() => {
        const timer = setInterval(() => {
            const elapsed = Date.now() - inicioRef.current;
            if (elapsed >= ENGAJAMENTO_THRESHOLD_MS && !engajamentoRegistradoRef.current) {
                engajamentoRegistradoRef.current = true;
                setIntencaoAlta(true);
                setDuracaoEngajamento(Math.round(elapsed / 1000));
                registrarEngajamento(imovelId, elapsed);
            }
        }, 5_000);
        return () => clearInterval(timer);
    }, [imovelId]);

    const registrarEngajamento = async (id: string, duracaoMs: number) => {
        try {
            await fetch('/api/tour/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imovel_id: id,
                    duracao_segundos: Math.round(duracaoMs / 1000),
                    intencao_alta: true,
                }),
            });
        } catch {}
    };

    const trocarCena = (index: number) => {
        if (!pannellumRef.current || index === cenaAtual) return;
        const cena = cenas[index];
        pannellumRef.current.loadScene
            ? pannellumRef.current.loadScene(cena.id)
            : pannellumRef.current.loadPanorama(cena.imageUrl);
        setCenaAtual(index);
    };

    if (cenas.length === 0) {
        return (
            <div className="flex items-center justify-center h-80 bg-gray-800 rounded-xl border border-gray-700 text-gray-400">
                Nenhuma imagem panorâmica disponível para este imóvel.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {intencaoAlta && (
                <LeadCaptureTour imovelId={imovelId} duracaoSegundos={duracaoEngajamento} />
            )}

            <div className="relative rounded-xl overflow-hidden border border-gray-700" style={{ height: '480px' }}>
                {!carregado && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                        <div className="text-center space-y-3">
                            <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-gray-400 text-sm">Carregando tour imersivo…</p>
                        </div>
                    </div>
                )}
                <div ref={viewerRef} className="w-full h-full" />
            </div>

            {cenas.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {cenas.map((cena, i) => (
                        <button
                            key={cena.id}
                            onClick={() => trocarCena(i)}
                            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                i === cenaAtual
                                    ? 'bg-[#D4AF37] text-gray-900'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {cena.titulo}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
