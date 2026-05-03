import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      land_opportunities: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          valor_total: number | null;
          area_m2: number | null;
          localizacao_exata: string | null;
          dados_proprietario: any | null;
          status: string;
          tag_zoneamento: string | null;
          roi_projetado: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descricao?: string | null;
          valor_total?: number | null;
          area_m2?: number | null;
          localizacao_exata?: string | null;
          dados_proprietario?: any | null;
          status?: string;
          tag_zoneamento?: string | null;
          roi_projetado?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string | null;
          valor_total?: number | null;
          area_m2?: number | null;
          localizacao_exata?: string | null;
          dados_proprietario?: any | null;
          status?: string;
          tag_zoneamento?: string | null;
          roi_projetado?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      lead_behavior_scoring: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          search_intent: string | null;
          engagement_depth: number;
          last_interaction: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score?: number;
          search_intent?: string | null;
          engagement_depth?: number;
          last_interaction?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          score?: number;
          search_intent?: string | null;
          engagement_depth?: number;
          last_interaction?: string;
          created_at?: string;
        };
      };
      lead_views: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          nexo_causal_hash: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id: string;
          nexo_causal_hash?: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_id?: string;
          nexo_causal_hash?: string;
          viewed_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          acao: string;
          tabela_afetada: string | null;
          dados_antigos: any | null;
          dados_novos: any | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          acao: string;
          tabela_afetada?: string | null;
          dados_antigos?: any | null;
          dados_novos?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          acao?: string;
          tabela_afetada?: string | null;
          dados_antigos?: any | null;
          dados_novos?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      sales_commissions: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          valor_comissao: number | null;
          status_comissao: string;
          data_venda: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id: string;
          valor_comissao?: number | null;
          status_comissao?: string;
          data_venda?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_id?: string;
          valor_comissao?: number | null;
          status_comissao?: string;
          data_venda?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      public_assets_secure: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          valor_total: number | null;
          area_m2: number | null;
          status: string;
          tag_zoneamento: string | null;
          roi_projetado: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Delete: never;
      };
      land_opportunities_full: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          valor_total: number | null;
          area_m2: number | null;
          localizacao_exata: string | null;
          dados_proprietario: any | null;
          status: string;
          tag_zoneamento: string | null;
          roi_projetado: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Delete: never;
      };
    };
    Functions: {
      generate_nexo_causal_hash: {
        Args: {
          p_user_id: string;
          p_asset_id: string;
          p_timestamp: string;
        };
        Returns: string;
      };
      user_has_validated_docs: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
      update_lead_score: {
        Args: {
          p_user_id: string;
          p_search_intent: string;
          p_engagement_bonus?: number;
        };
        Returns: number;
      };
    };
  };
};
