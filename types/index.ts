export interface Profile {
  id: string;
  nickname: string;
  use_exclusion: boolean;
  exclusion_start: string;
  exclusion_end: string;
  is_admin: boolean;
  created_at: string;
}

export interface Cat {
  id: number;
  image_url: string;
  deployed_at: string;
  distributed_count: number;
  total_hits: number;
  is_active: boolean;
}

export interface ReceivedCat {
  id: number;
  user_id: string;
  cat_id: number;
  hits: number;
  received_at: string;
  cat?: Cat;
}

export interface Upload {
  id: number;
  user_id: string;
  image_url: string;
  hits: number;
  uploaded_at: string;
}

export interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}
