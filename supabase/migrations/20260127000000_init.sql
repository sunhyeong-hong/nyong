-- profiles 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  use_exclusion BOOLEAN DEFAULT FALSE,
  exclusion_start TEXT DEFAULT '00:00',
  exclusion_end TEXT DEFAULT '08:00',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cats 테이블
CREATE TABLE IF NOT EXISTS cats (
  id BIGSERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  distributed_count INTEGER DEFAULT 0,
  total_hits INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- received_cats 테이블
CREATE TABLE IF NOT EXISTS received_cats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cat_id BIGINT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  hits INTEGER DEFAULT 0,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- uploads 테이블
CREATE TABLE IF NOT EXISTS uploads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  hits INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE received_cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- profiles 정책
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- cats 정책
CREATE POLICY "Authenticated users can view cats" ON cats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert cats" ON cats FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update cats" ON cats FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- received_cats 정책
CREATE POLICY "Users can view own received cats" ON received_cats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own received cats" ON received_cats FOR INSERT WITH CHECK (auth.uid() = user_id);

-- uploads 정책
CREATE POLICY "Users can view own uploads" ON uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own uploads" ON uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_received_cats_user ON received_cats(user_id);
CREATE INDEX IF NOT EXISTS idx_received_cats_cat ON received_cats(cat_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_cats_active ON cats(is_active);
CREATE INDEX IF NOT EXISTS idx_cats_deployed ON cats(deployed_at);

-- Storage 버킷
INSERT INTO storage.buckets (id, name, public) VALUES ('cats', 'cats', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT DO NOTHING;

-- Storage 정책
CREATE POLICY "Public read cats" ON storage.objects FOR SELECT USING (bucket_id = 'cats');
CREATE POLICY "Admins upload cats" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'cats' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Public read uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Users upload own" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'uploads' AND auth.uid() IS NOT NULL
);
