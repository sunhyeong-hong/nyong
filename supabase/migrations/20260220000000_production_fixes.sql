-- Production Fixes: 서버 사이드 RPC로 성능 및 안전성 개선

-- 1. update_receiver_date: 수신자 날짜 업데이트 (RLS 우회)
-- upload.tsx에서 수신자 배송 완료 후 호출
CREATE OR REPLACE FUNCTION update_receiver_date(
  receiver_uuid UUID,
  receive_date DATE
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET last_receive_date = receive_date
  WHERE id = receiver_uuid;
$$;

COMMENT ON FUNCTION update_receiver_date IS '수신자의 last_receive_date 업데이트 (RLS 우회)';

-- 2. find_eligible_receiver: 수신 가능한 사용자 서버 사이드 선택
-- 전체 유저를 클라이언트로 가져오지 않고 DB에서 직접 필터링 + 랜덤 선택
CREATE OR REPLACE FUNCTION find_eligible_receiver(
  sender_uuid UUID,
  p_current_time TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nickname TEXT,
  push_token TEXT,
  use_exclusion BOOLEAN,
  exclusion_start TEXT,
  exclusion_end TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.nickname,
    p.push_token,
    p.use_exclusion,
    p.exclusion_start,
    p.exclusion_end
  FROM profiles p
  WHERE p.id <> sender_uuid
    AND (
      p.last_receive_date IS NULL
      OR p.last_receive_date < CURRENT_DATE
    )
    AND (
      NOT p.use_exclusion
      OR p_current_time IS NULL
      OR NOT (
        -- 제외 시간 범위 체크 (자정 넘어가는 경우 포함)
        CASE
          WHEN p.exclusion_start <= p.exclusion_end THEN
            p_current_time >= p.exclusion_start AND p_current_time < p.exclusion_end
          ELSE
            p_current_time >= p.exclusion_start OR p_current_time < p.exclusion_end
        END
      )
    )
  ORDER BY RANDOM()
  LIMIT 1;
$$;

COMMENT ON FUNCTION find_eligible_receiver IS '수신 가능한 사용자 랜덤 선택 (날짜 + 제외 시간 필터, 서버 사이드)';

-- 3. record_delivery_hits: hits 저장 + nyong stats 업데이트 (트랜잭션)
-- notification.tsx에서 카운트다운 종료 후 호출
-- 중복 호출 방지를 위해 isSaved 체크는 클라이언트에서 수행
CREATE OR REPLACE FUNCTION record_delivery_hits(
  delivery_id BIGINT,
  hit_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nyong_id INTEGER;
BEGIN
  -- deliveries 업데이트 (status, hits, received_at)
  UPDATE deliveries
  SET
    hits = hit_count,
    status = 'received',
    received_at = NOW()
  WHERE id = delivery_id
    AND status = 'delivered';  -- 이미 received 처리된 경우 skip

  -- nyong_id 조회
  SELECT u.nyong_id INTO v_nyong_id
  FROM deliveries d
  JOIN uploads u ON u.id = d.upload_id
  WHERE d.id = delivery_id;

  -- nyong stats 업데이트
  IF v_nyong_id IS NOT NULL THEN
    UPDATE nyongs
    SET
      total_hits = COALESCE(total_hits, 0) + hit_count,
      monthly_hits = COALESCE(monthly_hits, 0) + hit_count
    WHERE id = v_nyong_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION record_delivery_hits IS 'deliveries hits 기록 + nyong stats 원자적 업데이트';
