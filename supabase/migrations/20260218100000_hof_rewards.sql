-- 명예의 전당 포인트 보상 시스템
-- 1등 200P, 2등 100P, 3등 50P, 4등 30P, 5등 10P

-- 1. 보상 지급 기록 테이블
CREATE TABLE IF NOT EXISTS hof_rewards (
  id BIGSERIAL PRIMARY KEY,
  reward_month TEXT NOT NULL,  -- 'YYYY-MM' 형식
  rank INTEGER NOT NULL,
  nyong_id INTEGER NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  points_granted INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reward_month, rank)
);

ALTER TABLE hof_rewards ENABLE ROW LEVEL SECURITY;

-- 유저는 자기 보상 내역만 조회
CREATE POLICY "Users can view own hof rewards" ON hof_rewards
  FOR SELECT USING (auth.uid() = owner_id);

-- 관리자는 전체 관리
CREATE POLICY "Admins can manage hof rewards" ON hof_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_hof_rewards_month ON hof_rewards(reward_month);

-- 2. RPC: 명예의 전당 보상 지급 (월 1회, 중복 방지)
CREATE OR REPLACE FUNCTION grant_hof_rewards(target_month TEXT)
RETURNS TABLE (rank INTEGER, nyong_name TEXT, owner_uuid UUID, points INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_points INTEGER[] := ARRAY[200, 100, 50, 30, 10];
  rec RECORD;
  i INTEGER := 0;
BEGIN
  -- 이미 해당 월 보상이 지급되었으면 빈 결과 반환
  IF EXISTS (SELECT 1 FROM hof_rewards WHERE reward_month = target_month) THEN
    RETURN;
  END IF;

  -- 상위 5 뇽 조회
  FOR rec IN
    SELECT
      n.id AS nyong_id,
      n.name AS nyong_name,
      n.owner_id,
      COALESCE(SUM(d.hits), 0)::bigint AS monthly_hits
    FROM nyongs n
    LEFT JOIN uploads u ON u.nyong_id = n.id
    LEFT JOIN deliveries d ON d.upload_id = u.id
    GROUP BY n.id, n.name, n.owner_id
    ORDER BY monthly_hits DESC
    LIMIT 5
  LOOP
    i := i + 1;

    -- 포인트 지급
    UPDATE profiles SET nyong_points = nyong_points + reward_points[i] WHERE id = rec.owner_id;

    -- 기록 저장
    INSERT INTO hof_rewards (reward_month, rank, nyong_id, owner_id, points_granted)
    VALUES (target_month, i, rec.nyong_id, rec.owner_id, reward_points[i]);

    -- 결과 반환
    rank := i;
    nyong_name := rec.nyong_name;
    owner_uuid := rec.owner_id;
    points := reward_points[i];
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION grant_hof_rewards IS '명예의 전당 월별 포인트 보상 (1등 200P, 2등 100P, 3등 50P, 4등 30P, 5등 10P)';
