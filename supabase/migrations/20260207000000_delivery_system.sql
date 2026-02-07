-- profiles 테이블 확장
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_upload_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_receive_date DATE;

-- uploads 테이블에 tag 컬럼 추가
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS tag TEXT;

-- deliveries 테이블 생성 (배송 기록)
CREATE TABLE IF NOT EXISTS deliveries (
  id BIGSERIAL PRIMARY KEY,
  upload_id BIGINT REFERENCES uploads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'received', 'expired')),
  delivered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- deliveries 정책
-- 보낸 사람은 자신이 보낸 배송 조회 가능
CREATE POLICY "Senders can view own deliveries" ON deliveries
  FOR SELECT USING (auth.uid() = sender_id);

-- 받는 사람은 자신이 받은 배송 조회 가능
CREATE POLICY "Receivers can view own deliveries" ON deliveries
  FOR SELECT USING (auth.uid() = receiver_id);

-- 받는 사람은 자신이 받은 배송 업데이트 가능 (hits 업데이트)
CREATE POLICY "Receivers can update own deliveries" ON deliveries
  FOR UPDATE USING (auth.uid() = receiver_id);

-- 서비스 롤은 모든 배송 관리 가능 (Edge Function용)
CREATE POLICY "Service role full access" ON deliveries
  FOR ALL USING (auth.role() = 'service_role');

-- profiles 업데이트 정책 (push_token 등)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_deliveries_sender ON deliveries(sender_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_receiver ON deliveries(receiver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_upload ON deliveries(upload_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created ON deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_receive ON profiles(last_receive_date);
CREATE INDEX IF NOT EXISTS idx_uploads_date ON uploads(uploaded_at);

-- pg_cron 확장 (Supabase Pro 필요)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 매 시간 Edge Function 호출 (Supabase Dashboard에서 설정)
-- SELECT cron.schedule('send-notifications', '0 * * * *', $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-daily-notifications',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--   );
-- $$);
