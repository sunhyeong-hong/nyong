-- get_extra_delivery: 하나 더보기 기능 - SECURITY DEFINER로 RLS 우회
-- 어제 업로드된 사진 중 아직 안 본 것을 랜덤 선택 + 배달 레코드 생성
-- 버그 원인: uploads RLS가 본인 소유 or 이미 받은 것만 허용
-- → 아직 안 받은 사진은 클라이언트에서 볼 수 없으므로 서버사이드에서 처리
CREATE OR REPLACE FUNCTION get_extra_delivery(
  receiver_uuid UUID,
  p_yesterday_start TIMESTAMPTZ,
  p_yesterday_end TIMESTAMPTZ
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
  -- 어제 업로드된 사진 중 본인 것 제외, 이미 받은 것 제외, 랜덤 선택
  SELECT u.id, u.image_url INTO v_upload
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
    RETURN; -- 더 볼 사진 없음
  END IF;

  -- 새 배달 레코드 생성
  INSERT INTO deliveries (upload_id, sender_id, receiver_id, status, delivered_at, hits)
  VALUES (v_upload.id, receiver_uuid, receiver_uuid, 'delivered', NOW(), 0)
  RETURNING id INTO v_delivery_id;

  RETURN QUERY SELECT v_delivery_id AS delivery_id, v_upload.id AS upload_id, v_upload.image_url AS image_url;
END;
$$;

COMMENT ON FUNCTION get_extra_delivery IS '하나 더보기: RLS 우회해서 미배달 업로드 중 랜덤 선택 + 배달 레코드 생성';
