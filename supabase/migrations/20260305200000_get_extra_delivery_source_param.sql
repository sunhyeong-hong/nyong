-- get_extra_delivery: p_source 파라미터 추가 (무료 더보기 vs 광고 더보기 구분)
CREATE OR REPLACE FUNCTION get_extra_delivery(
  receiver_uuid UUID,
  p_yesterday_start TIMESTAMPTZ,
  p_yesterday_end TIMESTAMPTZ,
  p_source TEXT DEFAULT 'extra'
)
RETURNS TABLE(delivery_id BIGINT, upload_id BIGINT, image_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upload RECORD;
  v_delivery_id BIGINT;
BEGIN
  SELECT u.id, u.image_url, u.user_id INTO v_upload
  FROM uploads u
  WHERE u.uploaded_at >= p_yesterday_start
    AND u.uploaded_at <= p_yesterday_end
    AND u.user_id <> receiver_uuid
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

  INSERT INTO deliveries (upload_id, sender_id, receiver_id, status, delivered_at, hits, source)
  VALUES (v_upload.id, v_upload.user_id, receiver_uuid, 'delivered', NOW(), 0, p_source)
  RETURNING id INTO v_delivery_id;

  RETURN QUERY SELECT v_delivery_id AS delivery_id, v_upload.id AS upload_id, v_upload.image_url AS image_url;
END;
$$;

COMMENT ON FUNCTION get_extra_delivery IS '하나 더보기: RLS 우회해서 미배달 업로드 중 랜덤 선택 + 배달 레코드 생성 (source: extra | ad_extra)';
