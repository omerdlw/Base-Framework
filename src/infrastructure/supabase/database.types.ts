export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          avatar_url: string | null;
          background_url: string | null;
          banner_position: string | null;
          banner_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          is_active: boolean;
          is_private: boolean;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          background_url?: string | null;
          banner_position?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          is_active?: boolean;
          is_private?: boolean;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          background_url?: string | null;
          banner_position?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          is_private?: boolean;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      account_emails: {
        Row: {
          account_id: string;
          created_at: string;
          email: string;
          id: string;
          is_primary: boolean;
          verified_at: string | null;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          email: string;
          id?: string;
          is_primary?: boolean;
          verified_at?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          is_primary?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "account_emails_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          id: string;
          status: "pending" | "accepted" | "rejected";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          id?: string;
          status?: "pending" | "accepted" | "rejected";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          id?: string;
          status?: "pending" | "accepted" | "rejected";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_sessions: {
        Row: {
          created_at: string;
          ip_address: string | null;
          last_seen_at: string;
          revoked_at: string | null;
          session_id: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ip_address?: string | null;
          last_seen_at?: string;
          revoked_at?: string | null;
          session_id: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ip_address?: string | null;
          last_seen_at?: string;
          revoked_at?: string | null;
          session_id?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: string;
          payload: Json;
          read: boolean;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          read?: boolean;
          read_at?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          read?: boolean;
          read_at?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      deactivate_current_account: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      get_account_follow_target: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          id: string;
          is_private: boolean;
        }[];
      };
      reactivate_current_account: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      revoke_auth_session: {
        Args: {
          p_session_id: string;
        };
        Returns: void;
      };
      revoke_other_auth_sessions: {
        Args: {
          p_current_session_id: string;
        };
        Returns: void;
      };
      touch_auth_session: {
        Args: {
          p_ip_address?: string | null;
          p_session_id: string;
          p_user_agent?: string | null;
        };
        Returns: void;
      };
      update_account: {
        Args: {
          p_avatar_url?: string | null;
          p_background_url?: string | null;
          p_banner_position?: string | null;
          p_banner_url?: string | null;
          p_bio?: string | null;
          p_display_name?: string | null;
          p_is_private?: boolean | null;
          p_username?: string | null;
        };
        Returns: Database["public"]["Tables"]["accounts"]["Row"][];
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
