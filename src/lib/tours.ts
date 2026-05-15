import { createClient } from '@/lib/supabase/client';

export interface TourScene {
    id: string;
    titulo: string;
    imageUrl: string;
    createdAt?: string;
}

export async function addTourScene(
    imovelId: string,
    sceneId: string,
    titulo: string,
    imageUrl: string
): Promise<TourScene[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('add_tour_scene', {
        p_imovel_id: imovelId,
        p_scene_id: sceneId,
        p_titulo: titulo,
        p_image_url: imageUrl,
    });
    if (error) throw new Error(error.message);
    return data as TourScene[];
}

export async function removeTourScene(
    imovelId: string,
    sceneId: string
): Promise<TourScene[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('remove_tour_scene', {
        p_imovel_id: imovelId,
        p_scene_id: sceneId,
    });
    if (error) throw new Error(error.message);
    return data as TourScene[];
}

export async function getTourScenes(imovelId: string): Promise<TourScene[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('properties')
        .select('tour_scenes')
        .eq('id', imovelId)
        .single();
    if (error) throw new Error(error.message);
    return (data?.tour_scenes as TourScene[]) || [];
}

export async function uploadTourImage(
    imovelId: string,
    file: File
): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `tours/${imovelId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
        .from('property-images')
        .upload(path, file, { upsert: false, contentType: file.type });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from('property-images').getPublicUrl(path);
    return data.publicUrl;
}
