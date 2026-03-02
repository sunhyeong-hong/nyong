-- 뇽 포인트 시스템

-- 1. profiles 테이블에 nyong_points 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nyong_points INTEGER DEFAULT 0;

-- 2. point_redemptions 테이블 생성
CREATE TABLE IF NOT EXISTS point_redemptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  points_spent INTEGER NOT NULL DEFAULT 100,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

-- 유저는 자기 교환내역만 조회
CREATE POLICY "Users can view own redemptions" ON point_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- 유저는 교환 요청 생성 가능
CREATE POLICY "Users can insert own redemptions" ON point_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 관리자는 전체 관리
CREATE POLICY "Admins can manage redemptions" ON point_redemptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON point_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON point_redemptions(status);

-- 3. RPC: 첫 뇽 등록 보너스 (+10)
CREATE OR REPLACE FUNCTION grant_first_nyong_bonus(owner_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nyong_count INTEGER;
  granted INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO nyong_count FROM nyongs WHERE owner_id = owner_uuid;

  IF nyong_count = 1 THEN
    UPDATE profiles SET nyong_points = nyong_points + 10 WHERE id = owner_uuid;
    granted := 10;
  END IF;

  RETURN granted;
END;
$$;

-- 4. RPC: 업로드 포인트 (+1, 마일스톤 보너스 포함)
-- 50회마다 보너스: 50회 +10P, 100회 +20P, 150회 +30P ...
CREATE OR REPLACE FUNCTION grant_upload_point(uploader_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upload_count INTEGER;
  milestone INTEGER;
  bonus INTEGER := 0;
BEGIN
  -- 기본 +1P
  UPDATE profiles SET nyong_points = nyong_points + 1 WHERE id = uploader_uuid;

  -- 총 업로드 수 확인 (방금 추가된 것 포함)
  SELECT COUNT(*) INTO upload_count FROM uploads WHERE user_id = uploader_uuid;

  -- 50의 배수면 마일스톤 보너스
  IF upload_count > 0 AND upload_count % 50 = 0 THEN
    milestone := upload_count / 50;
    bonus := milestone * 10;
    UPDATE profiles SET nyong_points = nyong_points + bonus WHERE id = uploader_uuid;
  END IF;

  RETURN bonus;
END;
$$;

-- 5. RPC: 포인트 교환 (100P 차감 + 기록 생성)
CREATE OR REPLACE FUNCTION redeem_points(redeemer_uuid UUID, phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points INTEGER;
BEGIN
  SELECT nyong_points INTO current_points FROM profiles WHERE id = redeemer_uuid FOR UPDATE;

  IF current_points < 100 THEN
    RETURN FALSE;
  END IF;

  UPDATE profiles SET nyong_points = nyong_points - 100 WHERE id = redeemer_uuid;

  INSERT INTO point_redemptions (user_id, points_spent, phone_number, status)
  VALUES (redeemer_uuid, 100, phone, 'pending');

  RETURN TRUE;
END;
$$;
