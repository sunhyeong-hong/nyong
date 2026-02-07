export interface Profile {
  id: string;
  nickname: string;
  use_exclusion: boolean;
  exclusion_start: string;
  exclusion_end: string;
  is_admin: boolean;
  created_at: string;
  push_token?: string;
  last_upload_date?: string;
  last_receive_date?: string;
  // Extra feature tracking
  extra_count_today?: number;
  extra_count_date?: string;
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
  tag?: string | null;
}

export interface Delivery {
  id: number;
  upload_id: number;
  sender_id: string;
  receiver_id: string | null;
  status: 'pending' | 'delivered' | 'received' | 'expired';
  delivered_at: string | null;
  received_at: string | null;
  hits: number;
  created_at: string;
  upload?: Upload;
}

export interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}
