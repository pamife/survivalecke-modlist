export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ModStatus = 'allowed' | 'restricted' | 'blocked' | 'unknown';
export type UserRole = 'owner' | 'project_lead' | 'admin' | 'moderator' | 'member';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';
export type ModSource = 'modrinth' | 'curseforge' | 'github' | 'website' | 'other' | 'manual';

export interface ModRestriction {
  id: string;
  mod_id: string;
  title: string;
  description: string;
  created_at: string;
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          entity_id: string | null;
          entity_name: string | null;
          entity_type: string;
          id: string;
          new_values: Json | null;
          old_values: Json | null;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity_id?: string | null;
          entity_name?: string | null;
          entity_type: string;
          id?: string;
          new_values?: Json | null;
          old_values?: Json | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_name?: string | null;
          entity_type?: string;
          id?: string;
          new_values?: Json | null;
          old_values?: Json | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mod_restrictions: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          mod_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          mod_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          mod_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mod_restrictions_mod_id_fkey";
            columns: ["mod_id"];
            isOneToOne: false;
            referencedRelation: "mods";
            referencedColumns: ["id"];
          },
        ];
      };
      mod_reviews: {
        Row: {
          created_at: string;
          decision: string;
          id: string;
          mod_id: string;
          notes: string | null;
          reviewer_id: string | null;
        };
        Insert: {
          created_at?: string;
          decision: string;
          id?: string;
          mod_id: string;
          notes?: string | null;
          reviewer_id?: string | null;
        };
        Update: {
          created_at?: string;
          decision?: string;
          id?: string;
          mod_id?: string;
          notes?: string | null;
          reviewer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mod_reviews_mod_id_fkey";
            columns: ["mod_id"];
            isOneToOne: false;
            referencedRelation: "mods";
            referencedColumns: ["id"];
          },
        ];
      };
      mod_suggestions: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          id: string;
          loader: string | null;
          minecraft_version: string | null;
          mod_name: string;
          mod_version: string | null;
          modrinth_url: string | null;
          notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitter_ip_hash: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          id?: string;
          loader?: string | null;
          minecraft_version?: string | null;
          mod_name: string;
          mod_version?: string | null;
          modrinth_url?: string | null;
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitter_ip_hash?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          id?: string;
          loader?: string | null;
          minecraft_version?: string | null;
          mod_name?: string;
          mod_version?: string | null;
          modrinth_url?: string | null;
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitter_ip_hash?: string | null;
        };
        Relationships: [];
      };
      mod_versions: {
        Row: {
          changelog: string | null;
          created_at: string;
          files_metadata: Json | null;
          id: string;
          loader: string;
          minecraft_version: string;
          mod_id: string;
          mod_version: string;
          note: string | null;
          published_at: string | null;
          release_type: string | null;
          source_version_id: string | null;
          status: string;
        };
        Insert: {
          changelog?: string | null;
          created_at?: string;
          files_metadata?: Json | null;
          id?: string;
          loader: string;
          minecraft_version: string;
          mod_id: string;
          mod_version: string;
          note?: string | null;
          published_at?: string | null;
          release_type?: string | null;
          source_version_id?: string | null;
          status?: string;
        };
        Update: {
          changelog?: string | null;
          created_at?: string;
          files_metadata?: Json | null;
          id?: string;
          loader?: string;
          minecraft_version?: string;
          mod_id?: string;
          mod_version?: string;
          note?: string | null;
          published_at?: string | null;
          release_type?: string | null;
          source_version_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mod_versions_mod_id_fkey";
            columns: ["mod_id"];
            isOneToOne: false;
            referencedRelation: "mods";
            referencedColumns: ["id"];
          },
        ];
      };
      mods: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          curseforge_id: string | null;
          curseforge_url: string | null;
          description: string | null;
          icon_url: string | null;
          id: string;
          last_reviewed_at: string;
          last_synced_at: string | null;
          latest_external_version: string | null;
          loaders: string[];
          minecraft_versions: string[];
          mod_id: string | null;
          modrinth_id: string | null;
          modrinth_metadata: Json | null;
          modrinth_url: string | null;
          name: string;
          reason: string | null;
          restrictions: string | null;
          slug: string;
          source: string;
          source_project_id: string | null;
          source_url: string | null;
          status: string;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          curseforge_id?: string | null;
          curseforge_url?: string | null;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          last_reviewed_at?: string;
          last_synced_at?: string | null;
          latest_external_version?: string | null;
          loaders?: string[];
          minecraft_versions?: string[];
          mod_id?: string | null;
          modrinth_id?: string | null;
          modrinth_metadata?: Json | null;
          modrinth_url?: string | null;
          name: string;
          reason?: string | null;
          restrictions?: string | null;
          slug: string;
          source?: string;
          source_project_id?: string | null;
          source_url?: string | null;
          status?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          curseforge_id?: string | null;
          curseforge_url?: string | null;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          last_reviewed_at?: string;
          last_synced_at?: string | null;
          latest_external_version?: string | null;
          loaders?: string[];
          minecraft_versions?: string[];
          mod_id?: string | null;
          modrinth_id?: string | null;
          modrinth_metadata?: Json | null;
          modrinth_url?: string | null;
          name?: string;
          reason?: string | null;
          restrictions?: string | null;
          slug?: string;
          source?: string;
          source_project_id?: string | null;
          source_url?: string | null;
          status?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      is_staff: { Args: never; Returns: boolean };
      is_owner: { Args: never; Returns: boolean };
      claim_initial_admin: {
        Args: { admin_user_id: string; admin_email: string };
        Returns: boolean;
      };
      assign_user_role: {
        Args: { target_user_id: string; new_role: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Mod = Omit<Database['public']['Tables']['mods']['Row'], 'status' | 'source'> & {
  status: ModStatus;
  source: ModSource;
};
export type ModWithRestrictions = Mod & {
  mod_restrictions?: ModRestriction[];
};
export type ModVersion = Omit<Database['public']['Tables']['mod_versions']['Row'], 'status'> & {
  status: 'allowed' | 'restricted' | 'blocked' | 'unknown';
};
export type ModSuggestion = Omit<Database['public']['Tables']['mod_suggestions']['Row'], 'status'> & {
  status: SuggestionStatus;
};
export type ModReview = Database['public']['Tables']['mod_reviews']['Row'];
export type Profile = Omit<Database['public']['Tables']['profiles']['Row'], 'role'> & {
  role: UserRole;
};
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
