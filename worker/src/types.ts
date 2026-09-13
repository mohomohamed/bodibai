export interface Env {
  DB: D1Database;
  APP_PASSWORD: string;
  ALLOWED_ORIGINS: string;
}

export interface Session {
  id: string;
  userName: string;
  expiresAt: number;
}

export interface RecordRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  category: string | null;
  group_name: string | null;
  area: string | null;
  portions: number;
  delivery_status: string;
  driver_id: string | null;
  status: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
  updated_by: string | null;
  version: number;
  deleted_at: number | null;
}

export interface AddressRow {
  id: string;
  record_id: string;
  label: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  island_city: string | null;
  atoll_region: string | null;
  country: string | null;
  notes: string | null;
  is_primary: number;
  created_at: number;
  updated_at: number;
  updated_by: string | null;
  version: number;
  deleted_at: number | null;
}

export interface DriverRow {
  id: string;
  name: string;
  phone: string | null;
  vehicle: string | null;
  area: string | null;
  notes: string | null;
  active: number;
  created_at: number;
  updated_at: number;
  updated_by: string | null;
  version: number;
  deleted_at: number | null;
}
