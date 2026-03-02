-- 시딩 가드: 미래 날짜 업로드가 앱에 노출되지 않도록 필터 추가

-- get_nyong_uploads: uploaded_at <= NOW() 필터 추가
CREATE OR REPLACE FUNCTION get_nyong_uploads(target_nyong_id int)
RETURNS TABLE (
  id bigint,
  user_id uuid,
  image_url text,
  tag text,
  nyong_id int,
  uploaded_at timestamptz,
  hits bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.user_id,
    u.image_url,
    u.tag,
    u.nyong_id,
    u.uploaded_at,
    COALESCE(SUM(d.hits), 0)::bigint AS hits
  FROM uploads u
  LEFT JOIN deliveries d ON d.upload_id = u.id
  WHERE u.nyong_id = target_nyong_id
    AND u.uploaded_at <= NOW()
  GROUP BY u.id, u.user_id, u.image_url, u.tag, u.nyong_id, u.uploaded_at
  ORDER BY u.uploaded_at DESC;
$$;

COMMENT ON FUNCTION get_nyong_uploads IS '뇽 갤러리: 특정 뇽의 업로드 + hits 합산 (미래 날짜 제외)';
