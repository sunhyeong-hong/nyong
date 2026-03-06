-- get_nyong_extra_delivery: p_source 파라미터 추가 (무료 vs 광고 구분)
DROP FUNCTION IF EXISTS get_nyong_extra_delivery(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_nyong_extra_delivery(UUID, INTEGER, TEXT);

CREATE FUNCTION get_nyong_extra_delivery(
  receiver_uuid UUID,
  target_nyong_id INTEGER,
  p_source TEXT DEFAULT 'nyong_extra'
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
  VALUES (v_upload.id, receiver_uuid, receiver_uuid, 'delivered', NOW(), NOW(), 0, p_source)
  RETURNING id INTO v_delivery_id;

  -- 글로벌 일별 UPSERT
  INSERT INTO nyong_extra_usage (user_id, usage_date, count)
  VALUES (receiver_uuid, v_today, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET count = nyong_extra_usage.count + 1;

  RETURN QUERY SELECT v_delivery_id, v_upload.id, v_upload.image_url;
END;
$$;

COMMENT ON FUNCTION get_nyong_extra_delivery IS '뇽별 한장 더 받기 (source: nyong_extra | nyong_ad_extra)';
