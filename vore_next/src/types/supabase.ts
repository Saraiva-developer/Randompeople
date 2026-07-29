export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          cover_url: string | null;
          created_at: string;
          data: Json;
          id: string;
          is_published: boolean;
          location: string | null;
          name: string;
          slug: string;
          type: "service_pro" | "food" | "shop" | "lodging" | "creator";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          cover_url?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          is_published?: boolean;
          location?: string | null;
          name: string;
          slug: string;
          type: "service_pro" | "food" | "shop" | "lodging" | "creator";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          cover_url?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          is_published?: boolean;
          location?: string | null;
          name?: string;
          slug?: string;
          type?: "service_pro" | "food" | "shop" | "lodging" | "creator";
          updated_at?: string;
          user_id?: string;
        };
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          profile_id: string;
          rating: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          profile_id: string;
          rating: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          profile_id?: string;
          rating?: number;
          updated_at?: string;
          user_id?: string;
        };
      };
      password_resets: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          token_hash: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          token_hash: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          token_hash?: string;
          used_at?: string | null;
          user_id?: string;
        };
      };
      recommendation_permissions: {
        Row: {
          created_at: string;
          id: string;
          status: "pending" | "approved" | "blocked" | "rejected";
          target_user_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          status?: "pending" | "approved" | "blocked" | "rejected";
          target_user_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          status?: "pending" | "approved" | "blocked" | "rejected";
          target_user_id?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      recommendation_reactions: {
        Row: {
          created_at: string;
          id: string;
          reaction: "like" | "fire" | "wow" | "love";
          recommendation_id: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reaction: "like" | "fire" | "wow" | "love";
          recommendation_id: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reaction?: "like" | "fire" | "wow" | "love";
          recommendation_id?: number;
          updated_at?: string;
          user_id?: string;
        };
      };
      recommendation_settings: {
        Row: {
          receive_mode: "all" | "approved" | "off";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          receive_mode?: "all" | "approved" | "off";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          receive_mode?: "all" | "approved" | "off";
          updated_at?: string;
          user_id?: string;
        };
      };
      recommendations: {
        Row: {
          content_type: "profile" | "photo" | "video" | "reel";
          content_uri: string | null;
          created_at: string;
          expires_at: string;
          id: number;
          profile_id: string | null;
          profile_slug: string | null;
          receiver_user_id: string;
          sender_user_id: string;
          source_profile_name: string | null;
        };
        Insert: {
          content_type?: "profile" | "photo" | "video" | "reel";
          content_uri?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: number;
          profile_id?: string | null;
          profile_slug?: string | null;
          receiver_user_id: string;
          sender_user_id: string;
          source_profile_name?: string | null;
        };
        Update: {
          content_type?: "profile" | "photo" | "video" | "reel";
          content_uri?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: number;
          profile_id?: string | null;
          profile_slug?: string | null;
          receiver_user_id?: string;
          sender_user_id?: string;
          source_profile_name?: string | null;
        };
      };
      saved_entries: {
        Row: {
          created_at: string;
          data: Json;
          entry_key: string;
          id: string;
          kind: "media" | "item";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          data?: Json;
          entry_key: string;
          id?: string;
          kind: "media" | "item";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          entry_key?: string;
          id?: string;
          kind?: "media" | "item";
          updated_at?: string;
          user_id?: string;
        };
      };
      saved_profiles: {
        Row: {
          created_at: string;
          id: string;
          profile_ref: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          profile_ref: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          profile_ref?: string;
          user_id?: string;
        };
      };
      users: {
        Row: {
          account_type: "professional" | "common";
          created_at: string;
          email: string;
          id: string;
          name: string | null;
          updated_at: string;
        };
        Insert: {
          account_type?: "professional" | "common";
          created_at?: string;
          email: string;
          id: string;
          name?: string | null;
          updated_at?: string;
        };
        Update: {
          account_type?: "professional" | "common";
          created_at?: string;
          email?: string;
          id?: string;
          name?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
