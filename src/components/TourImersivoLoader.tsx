'use client';
import dynamic from 'next/dynamic';

const TourImersivo = dynamic(() => import('./TourImersivo'), { ssr: false });

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

interface Props {
    imovelId: string;
    cenas: Cena[];
}

export default function TourImersivoLoader({ imovelId, cenas }: Props) {
    return <TourImersivo imovelId={imovelId} cenas={cenas} />;
}
