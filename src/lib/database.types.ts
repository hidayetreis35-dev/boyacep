/**
 * Types for the Supabase schema in supabase/migrations.
 * Hand-written for now; replace with `supabase gen types typescript` once the
 * project is linked, and keep this file in sync with every migration.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'homeowner' | 'pro' | 'admin';
export type ProjectStatus = 'draft' | 'planning' | 'awaiting_quote' | 'in_progress' | 'completed' | 'cancelled';

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  locale: string;
  country: string;
  active_role: AppRole | null;
  created_at: string;
  updated_at: string;
};

export type UserRoleRow = {
  user_id: string;
  role: AppRole;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  status: ProjectStatus;
  notes: string | null;
  budget: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type RoomRow = {
  id: string;
  project_id: string;
  name: string;
  length_m: number;
  width_m: number;
  height_m: number;
  paint_walls: boolean;
  paint_ceiling: boolean;
  coats: number;
  surface_type: 'painted' | 'new_plaster' | 'plasterboard' | 'concrete';
  surface_condition: 'good' | 'minor_repair' | 'poor';
  coverage_m2_per_l: number | null;
  coverage_source: 'manufacturer' | 'user' | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type RoomOpeningRow = {
  id: string;
  room_id: string;
  kind: 'door' | 'window';
  width_m: number;
  height_m: number;
  count: number;
  created_at: string;
};

export type CalculationRow = {
  id: string;
  project_id: string;
  engine_version: string;
  input: Json;
  result: Json;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Pick<ProfileRow, 'id'> & Partial<Omit<ProfileRow, 'id'>>,
        Partial<Pick<ProfileRow, 'display_name' | 'avatar_path' | 'locale' | 'country' | 'active_role'>>
      >;
      user_roles: Table<UserRoleRow, Omit<UserRoleRow, 'created_at'>>;
      projects: Table<
        ProjectRow,
        Pick<ProjectRow, 'title'> & Partial<Omit<ProjectRow, 'title' | 'owner_id' | 'created_at' | 'updated_at'>>
      >;
      rooms: Table<
        RoomRow,
        Omit<RoomRow, 'id' | 'created_at' | 'updated_at' | 'sort_order'> & Partial<Pick<RoomRow, 'id' | 'sort_order'>>
      >;
      room_openings: Table<RoomOpeningRow, Omit<RoomOpeningRow, 'id' | 'created_at'> & Partial<Pick<RoomOpeningRow, 'id'>>>;
      calculations: Table<CalculationRow, Omit<CalculationRow, 'id' | 'created_at'>>;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { check_role: AppRole }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { app_role: AppRole; project_status: ProjectStatus };
    CompositeTypes: Record<string, never>;
  };
};
