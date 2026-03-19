export interface Profile {
  id: string;
  nickname: string;
  use_exclusion: boolean;
  exclusion_start: string;
  exclusion_end: string;
  is_admin: boolean;
  created_at: string;
  push_token?: string | null;
  last_upload_date?: string;
  last_receive_date?: string;
  // Extra feature tracking
  extra_count_today?: number;
  extra_count_date?: string;
  // 뇽 포인트
  nyong_points: number;
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
  nyong_id?: number;
  nyong?: Nyong;
}

// 뇽(고양이) 프로필 - ID 카드 시스템
export interface NyongFeatures {
  fur_color: string;        // 털 색상: "orange tabby", "black", "white with gray spots"
  fur_pattern: string;      // 털 무늬: "striped", "solid", "calico", "tuxedo"
  eye_color: string;        // 눈 색상: "green", "yellow", "blue", "heterochromia"
  ear_shape: string;        // 귀 모양: "pointed", "folded", "rounded"
  distinctive_marks: string; // 특이점: "M on forehead", "white chin", "scar on left ear"
  body_type: string;        // 체형: "slim", "medium", "chubby"
}

export interface Nyong {
  id: number;
  owner_id: string;
  name: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'unknown';
  personality?: string;
  front_photo_url: string;
  top_upload_photo_url?: string;
  photo_urls: string[];
  features: NyongFeatures;
  front_embedding?: number[];     // CLIP 정면 임베딩 (512차원)
  embeddings?: number[][];        // 추가 사진 임베딩들
  total_hits: number;
  monthly_hits: number;
  upload_count: number;
  created_at: string;
  updated_at: string;
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
  source?: string;
  created_at: string;
  upload?: Upload;
}

export interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}
