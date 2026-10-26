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

export type MaterialCategoryDb =
  | 'interior_paint'
  | 'ceiling_paint'
  | 'exterior_paint'
  | 'primer'
  | 'filler'
  | 'sandpaper'
  | 'roller'
  | 'brush'
  | 'masking_tape'
  | 'drop_sheet'
  | 'other';

export type MaterialUnitDb = 'L' | 'kg' | 'adet' | 'rulo' | 'kutu' | 'paket' | 'm²';
export type PriceSourceDb = 'estimate' | 'store';

export type MaterialCatalogRow = {
  id: string;
  category: MaterialCategoryDb;
  name: string;
  unit: MaterialUnitDb;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectMaterialRow = {
  id: string;
  project_id: string;
  catalog_id: string | null;
  category: MaterialCategoryDb;
  name: string;
  quantity: number;
  unit: MaterialUnitDb;
  unit_price: number | null;
  price_source: PriceSourceDb;
  store_name: string | null;
  note: string | null;
  from_calculation: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectCostRow = {
  id: string;
  project_id: string;
  kind: 'labor' | 'transport' | 'other';
  label: string;
  amount: number;
  price_source: PriceSourceDb;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectExpenseRow = {
  id: string;
  project_id: string;
  owner_id: string;
  category: 'paint' | 'material' | 'labor' | 'other';
  label: string;
  amount: number;
  /** YYYY-MM-DD */
  spent_on: string;
  store_name: string | null;
  note: string | null;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
};

export type GuideCategory =
  | 'preparation'
  | 'primer'
  | 'filler_sanding'
  | 'ceiling'
  | 'walls'
  | 'tools'
  | 'mistakes'
  | 'exterior'
  | 'materials';

export type GuideArticleRow = {
  id: string;
  slug: string;
  category: GuideCategory;
  title: string;
  summary: string;
  body: string;
  reading_minutes: number;
  status: 'draft' | 'published';
  published_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Normalised wall outline: points with 0 <= x, y <= 1. */
export type WallOutline = [number, number][];

/**
 * One surface on a photo and the colour tried on it. A surface is either
 * outlined by its corners (`points`) or picked by tapping (`seeds`: the tapped
 * points, re-grown over similar colours with `tolerance` each time it is shown).
 */
export type PhotoSurface = {
  label: string;
  points: WallOutline;
  hex: string | null;
  seeds?: WallOutline;
  tolerance?: number;
  /** Taps on spots to keep out (a ceiling, a cupboard) when the surface was picked by tapping. */
  excludes?: WallOutline;
};

/**
 * Stored in project_photos.wall_outline. Older rows hold a single WallOutline;
 * newer rows hold a list of surfaces.
 */
export type StoredOutline = WallOutline | PhotoSurface[];

export type InspectionPlace = 'room' | 'wet' | 'exterior';

export type InspectionResultRow = {
  id: string;
  project_id: string;
  place: InspectionPlace;
  /** Symptom ids from src/features/inspect/rules.ts; empty when nothing was wrong. */
  symptoms: string[];
  location: string | null;
  created_at: string;
};

export type ProjectColourRow = {
  id: string;
  project_id: string;
  hex: string;
  name: string;
  surface: string | null;
  created_at: string;
};

export type ProjectPhotoRow = {
  id: string;
  project_id: string;
  room_id: string | null;
  owner_id: string;
  storage_path: string;
  width: number;
  height: number;
  byte_size: number;
  wall_outline: StoredOutline | null;
  created_at: string;
};

export type AdminStats = {
  users: number;
  projects: number;
  rooms: number;
  published_guides: number;
  pros: number;
  pending_pros: number;
  quotes: number;
  open_questions: number;
};

export type ProSpecialty = 'interior' | 'exterior' | 'ceiling' | 'decorative' | 'insulation' | 'plaster' | 'repair';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type ProProfileRow = {
  user_id: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  show_phone: boolean;
  city: string;
  districts: string;
  specialties: ProSpecialty[];
  years_experience: number | null;
  bio: string;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
};

/** What a customer sees of a painter (pro_card): the phone only when the painter shows it. */
export type ProCard = Omit<ProProfileRow, 'created_at' | 'updated_at'>;

export type ProjectInviteRow = {
  id: string;
  project_id: string;
  code: string;
  created_by: string;
  expires_at: string;
  revoked_at: string | null;
  /** How many painters may join with this code, and how many already did. */
  max_uses: number;
  uses: number;
  created_at: string;
};

export type ProjectMemberRow = { project_id: string; user_id: string; role: 'pro'; created_at: string };

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'withdrawn';

export type QuoteRow = {
  id: string;
  pro_id: string;
  project_id: string | null;
  number: number;
  title: string;
  customer_name: string;
  customer_contact: string;
  notes: string;
  vat_rate: number;
  discount: number;
  currency: string;
  valid_until: string | null;
  status: QuoteStatus;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteItemRow = {
  id: string;
  quote_id: string;
  kind: 'labor' | 'material' | 'other';
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  sort_order: number;
  created_at: string;
};

export type ClientErrorRow = {
  id: number;
  user_id: string | null;
  message: string;
  stack: string;
  screen: string;
  platform: '' | 'ios' | 'android' | 'web';
  app_version: string;
  created_at: string;
};

export type EntitlementRow = {
  id: string;
  user_id: string;
  product: 'pro' | 'usta_pro';
  source: 'admin' | 'promo' | 'app_store' | 'play_store';
  starts_at: string;
  expires_at: string | null;
  note: string;
  created_at: string;
};

export type MyPlan = { pro: boolean; usta_pro: boolean; project_limit: number; projects_used: number };

export type ConsultationTopic = 'preparation' | 'paint_choice' | 'problem' | 'cost' | 'other';
export type ConsultationStatus = 'open' | 'answered' | 'closed';

export type ConsultationRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  topic: ConsultationTopic;
  subject: string;
  status: ConsultationStatus;
  created_at: string;
  updated_at: string;
};

export type ConsultationMessageRow = {
  id: string;
  consultation_id: string;
  author_id: string | null;
  from_team: boolean;
  body: string;
  created_at: string;
};

export type SharedProject = {
  id: string;
  title: string;
  status: ProjectStatus;
  owner_name: string;
  shared_at: string;
  updated_at: string;
};

export type ProjectMember = {
  user_id: string;
  full_name: string;
  business_name: string | null;
  verification_status: VerificationStatus;
  joined_at: string;
};

type Generated = 'id' | 'created_at' | 'updated_at';

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
      material_catalog: Table<MaterialCatalogRow, Omit<MaterialCatalogRow, Generated | 'active' | 'sort_order'>>;
      project_materials: Table<
        ProjectMaterialRow,
        Omit<ProjectMaterialRow, Generated | 'catalog_id' | 'store_name' | 'note' | 'from_calculation' | 'sort_order' | 'unit_price' | 'price_source'> &
          Partial<Pick<ProjectMaterialRow, 'catalog_id' | 'store_name' | 'note' | 'from_calculation' | 'sort_order' | 'unit_price' | 'price_source'>>
      >;
      guide_articles: Table<
        GuideArticleRow,
        Pick<GuideArticleRow, 'slug' | 'category' | 'title'> & Partial<Omit<GuideArticleRow, Generated | 'slug' | 'category' | 'title'>>
      >;
      project_photos: Table<
        ProjectPhotoRow,
        Pick<ProjectPhotoRow, 'id' | 'project_id' | 'storage_path' | 'width' | 'height' | 'byte_size'> &
          Partial<Pick<ProjectPhotoRow, 'room_id' | 'wall_outline'>>,
        Partial<Pick<ProjectPhotoRow, 'room_id' | 'wall_outline'>>
      >;
      inspection_results: Table<
        InspectionResultRow,
        Pick<InspectionResultRow, 'project_id' | 'place'> & Partial<Pick<InspectionResultRow, 'symptoms' | 'location'>>,
        never
      >;
      project_colours: Table<
        ProjectColourRow,
        Pick<ProjectColourRow, 'project_id' | 'hex' | 'name'> & Partial<Pick<ProjectColourRow, 'surface'>>,
        Record<string, never>
      >;
      pro_profiles: Table<
        ProProfileRow,
        Pick<ProProfileRow, 'user_id' | 'full_name' | 'city'> &
          Partial<Omit<ProProfileRow, 'user_id' | 'full_name' | 'city' | 'created_at' | 'updated_at'>>
      >;
      project_members: Table<ProjectMemberRow, never, never>;
      project_invites: Table<
        ProjectInviteRow,
        Pick<ProjectInviteRow, 'project_id'> & Partial<Pick<ProjectInviteRow, 'expires_at' | 'max_uses'>>,
        Partial<Pick<ProjectInviteRow, 'revoked_at'>>
      >;
      quotes: Table<
        QuoteRow,
        Pick<QuoteRow, 'title'> & Partial<Omit<QuoteRow, 'id' | 'pro_id' | 'number' | 'title' | 'created_at' | 'updated_at'>>,
        Partial<Omit<QuoteRow, 'id' | 'pro_id' | 'number' | 'created_at' | 'updated_at'>>
      >;
      quote_items: Table<QuoteItemRow, Omit<QuoteItemRow, 'id' | 'created_at' | 'sort_order'> & Partial<Pick<QuoteItemRow, 'sort_order'>>>;
      client_errors: Table<
        ClientErrorRow,
        Pick<ClientErrorRow, 'message'> & Partial<Pick<ClientErrorRow, 'stack' | 'screen' | 'platform' | 'app_version'>>,
        never
      >;
      entitlements: Table<EntitlementRow, Pick<EntitlementRow, 'user_id' | 'product' | 'source'> & Partial<Pick<EntitlementRow, 'starts_at' | 'expires_at' | 'note'>>, never>;
      consultations: Table<
        ConsultationRow,
        Pick<ConsultationRow, 'topic' | 'subject'> & Partial<Pick<ConsultationRow, 'id' | 'project_id'>>,
        Partial<Pick<ConsultationRow, 'status'>>
      >;
      consultation_messages: Table<ConsultationMessageRow, Pick<ConsultationMessageRow, 'consultation_id' | 'body'>, never>;
      project_costs: Table<
        ProjectCostRow,
        Omit<ProjectCostRow, Generated | 'note' | 'price_source'> & Partial<Pick<ProjectCostRow, 'note' | 'price_source'>>
      >;
      project_expenses: Table<
        ProjectExpenseRow,
        Omit<ProjectExpenseRow, Generated | 'owner_id' | 'spent_on' | 'store_name' | 'note' | 'receipt_path'> &
          Partial<Pick<ProjectExpenseRow, 'id' | 'spent_on' | 'store_name' | 'note' | 'receipt_path'>>,
        Partial<Pick<ProjectExpenseRow, 'category' | 'label' | 'amount' | 'spent_on' | 'store_name' | 'note' | 'receipt_path'>>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { check_role: AppRole }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_stats: { Args: Record<string, never>; Returns: AdminStats[] };
      /** null when the code is unknown, expired or revoked. */
      redeem_project_invite: { Args: { invite_code: string }; Returns: string | null };
      pro_card: { Args: { pro: string }; Returns: ProCard[] };
      shared_projects: { Args: Record<string, never>; Returns: SharedProject[] };
      project_member_list: { Args: { project: string }; Returns: ProjectMember[] };
      respond_to_quote: { Args: { quote: string; accept: boolean }; Returns: undefined };
      export_my_data: { Args: Record<string, never>; Returns: Json };
      export_my_data_v2: { Args: Record<string, never>; Returns: Json };
      export_my_data_v3: { Args: Record<string, never>; Returns: Json };
      my_plan: { Args: Record<string, never>; Returns: MyPlan[] };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: { app_role: AppRole; project_status: ProjectStatus };
    CompositeTypes: Record<string, never>;
  };
};
