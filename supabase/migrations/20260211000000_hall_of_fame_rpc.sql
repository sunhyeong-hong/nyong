-- 명예의 전당용 RPC: RLS를 우회하여 전체 뇽 랭킹 조회
CREATE OR REPLACE FUNCTION get_top_nyongs(limit_count int DEFAULT 5)
RETURNS TABLE (
  id int,
  name text,
  front_photo_url text,
  owner_id uuid,
  upload_count int,
  total_hits bigint,
  monthly_hits bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.name,
    n.front_photo_url,
    n.owner_id,
    n.upload_count,
    COALESCE(SUM(d.hits), 0)::bigint AS total_hits,
    COALESCE(SUM(d.hits), 0)::bigint AS monthly_hits
  FROM nyongs n
  LEFT JOIN uploads u ON u.nyong_id = n.id
  LEFT JOIN deliveries d ON d.upload_id = u.id
  GROUP BY n.id, n.name, n.front_photo_url, n.owner_id, n.upload_count
  ORDER BY monthly_hits DESC
  LIMIT limit_count;
$$;

-- 뇽 갤러리용 RPC: 특정 뇽의 업로드 목록 + hits 합산 (RLS 우회)
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
  GROUP BY u.id, u.user_id, u.image_url, u.tag, u.nyong_id, u.uploaded_at
  ORDER BY u.uploaded_at DESC;
$$;

COMMENT ON FUNCTION get_top_nyongs IS '명예의 전당: 뇽펀치 합산 랭킹 (SECURITY DEFINER로 RLS 우회)';
COMMENT ON FUNCTION get_nyong_uploads IS '뇽 갤러리: 특정 뇽의 업로드 + hits 합산 (SECURITY DEFINER로 RLS 우회)';
