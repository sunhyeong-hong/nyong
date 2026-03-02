-- 뇽별 한장 더 받기 사용량 추적 테이블 (글로벌 일별 카운트)
CREATE TABLE IF NOT EXISTS nyong_extra_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, usage_date)
);

ALTER TABLE nyong_extra_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nyong_extra_usage" ON nyong_extra_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_nyong_extra_usage_lookup
  ON nyong_extra_usage(user_id, usage_date);

-- RPC: 특정 뇽의 사진 1장 더 받기 (글로벌 일별 카운트 체크)
CREATE OR REPLACE FUNCTION get_nyong_extra_delivery(
  receiver_uuid UUID,
  target_nyong_id INTEGER
)
RETURNS TABLE(delivery_id BIGINT, upload_id BIGINT, image_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upload RECORD;
  v_delivery_id BIGINT;
  v_today DATE;
  v_current_count INTEGER;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::date;

  -- 글로벌 일별 카운트 (뇽 무관)
  SELECT COALESCE(ne.count, 0) INTO v_current_count
  FROM nyong_extra_usage ne
  WHERE ne.user_id = receiver_uuid
    AND ne.usage_date = v_today;

  IF COALESCE(v_current_count, 0) >= 2 THEN
    RETURN;
  END IF;

  SELECT u.id, u.image_url INTO v_upload
  FROM uploads u
  WHERE u.nyong_id = target_nyong_id
    AND u.user_id <> receiver_uuid
    -- 이미 누군가에게 정기 배달된 적 있는 사진만 (미래 예약 / 오늘 업로드 제외)
    AND EXISTS (
      SELECT 1 FROM deliveries d2
      WHERE d2.upload_id = u.id
        AND d2.source = 'scheduled'
    )
    AND NOT EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.upload_id = u.id
        AND d.receiver_id = receiver_uuid
    )
  ORDER BY RANDOM()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO deliveries (upload_id, sender_id, receiver_id, status, delivered_at, received_at, hits, source)
  VALUES (v_upload.id, receiver_uuid, receiver_uuid, 'delivered', NOW(), NOW(), 0, 'nyong_extra')
  RETURNING id INTO v_delivery_id;

  -- 글로벌 일별 UPSERT
  INSERT INTO nyong_extra_usage (user_id, usage_date, count)
  VALUES (receiver_uuid, v_today, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET count = nyong_extra_usage.count + 1;

  RETURN QUERY SELECT v_delivery_id, v_upload.id, v_upload.image_url;
END;
$$;

-- RPC: 한장 더 받기 상태 조회 (글로벌 used_today + 해당 뇽 available_photos)
CREATE OR REPLACE FUNCTION get_nyong_extra_status(
  receiver_uuid UUID,
  target_nyong_id INTEGER
)
RETURNS TABLE(used_today INTEGER, available_photos BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::date;

  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT ne.count FROM nyong_extra_usage ne
       WHERE ne.user_id = receiver_uuid
         AND ne.usage_date = v_today), 0
    )::INTEGER AS used_today,
    (SELECT COUNT(*) FROM uploads u
     WHERE u.nyong_id = target_nyong_id
       AND u.user_id <> receiver_uuid
       AND EXISTS (
         SELECT 1 FROM deliveries d2
         WHERE d2.upload_id = u.id
           AND d2.source = 'scheduled'
       )
       AND NOT EXISTS (
         SELECT 1 FROM deliveries d
         WHERE d.upload_id = u.id
           AND d.receiver_id = receiver_uuid
       )
    ) AS available_photos;
END;
$$;
