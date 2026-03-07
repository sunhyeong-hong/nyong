-- point_logs: 모든 포인트 변동 이력

CREATE TABLE IF NOT EXISTS point_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('upload', 'milestone', 'registration', 'hof', 'redeem')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point logs" ON point_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_point_logs_user ON point_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_created ON point_logs(user_id, created_at);

-- Rebuild grant_first_nyong_bonus with logging
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
    INSERT INTO point_logs (user_id, points, type) VALUES (owner_uuid, 10, 'registration');
    granted := 10;
  END IF;

  RETURN granted;
END;
$$;

-- Rebuild grant_upload_point with logging (30-interval milestone)
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
  -- +1P
  UPDATE profiles SET nyong_points = nyong_points + 1 WHERE id = uploader_uuid;
  INSERT INTO point_logs (user_id, points, type) VALUES (uploader_uuid, 1, 'upload');

  SELECT COUNT(*) INTO upload_count FROM uploads WHERE user_id = uploader_uuid;

  -- 30's multiple -> milestone bonus
  IF upload_count > 0 AND upload_count % 30 = 0 THEN
    milestone := upload_count / 30;
    bonus := milestone * 10;
    UPDATE profiles SET nyong_points = nyong_points + bonus WHERE id = uploader_uuid;
    INSERT INTO point_logs (user_id, points, type) VALUES (uploader_uuid, bonus, 'milestone');
  END IF;

  RETURN bonus;
END;
$$;

-- Rebuild redeem_points with logging
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
  INSERT INTO point_logs (user_id, points, type) VALUES (redeemer_uuid, -100, 'redeem');

  INSERT INTO point_redemptions (user_id, points_spent, phone_number, status)
  VALUES (redeemer_uuid, 100, phone, 'pending');

  RETURN TRUE;
END;
$$;

-- Rebuild grant_hof_rewards with logging
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
  IF EXISTS (SELECT 1 FROM hof_rewards WHERE reward_month = target_month) THEN
    RETURN;
  END IF;

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

    UPDATE profiles SET nyong_points = nyong_points + reward_points[i] WHERE id = rec.owner_id;
    INSERT INTO point_logs (user_id, points, type) VALUES (rec.owner_id, reward_points[i], 'hof');

    INSERT INTO hof_rewards (reward_month, rank, nyong_id, owner_id, points_granted)
    VALUES (target_month, i, rec.nyong_id, rec.owner_id, reward_points[i]);

    rank := i;
    nyong_name := rec.nyong_name;
    owner_uuid := rec.owner_id;
    points := reward_points[i];
    RETURN NEXT;
  END LOOP;
END;
$$;
