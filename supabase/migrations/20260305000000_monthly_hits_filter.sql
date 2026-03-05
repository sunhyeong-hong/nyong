-- 명예의 전당: monthly_hits에 월별 필터링 추가
-- total_hits: 전체 기간 합산, monthly_hits: 이번 달만 합산

CREATE OR REPLACE FUNCTION get_top_nyongs(limit_count int DEFAULT 5, time_range text DEFAULT 'monthly')
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
    COALESCE(SUM(CASE WHEN d.source = 'scheduled' THEN d.hits ELSE 0 END), 0)::bigint AS total_hits,
    COALESCE(SUM(
      CASE WHEN d.source = 'scheduled' AND d.delivered_at >= (
        CASE time_range
          WHEN 'daily' THEN date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
          WHEN 'weekly' THEN date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' - interval '6 days'
          ELSE date_trunc('month', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
        END
      ) THEN d.hits ELSE 0 END
    ), 0)::bigint AS monthly_hits
  FROM nyongs n
  LEFT JOIN uploads u ON u.nyong_id = n.id AND u.uploaded_at <= NOW()
  LEFT JOIN deliveries d ON d.upload_id = u.id
  GROUP BY n.id, n.name, n.front_photo_url, n.owner_id, n.upload_count
  ORDER BY monthly_hits DESC
  LIMIT limit_count;
$$;

-- 뇽 갤러리: monthly_hits 컬럼 추가 (반환 타입 변경이므로 DROP 후 재생성)
DROP FUNCTION IF EXISTS get_nyong_uploads(int, boolean);

CREATE FUNCTION get_nyong_uploads(target_nyong_id int, delivered_only boolean DEFAULT false)
RETURNS TABLE (
  id bigint,
  user_id uuid,
  image_url text,
  tag text,
  nyong_id bigint,
  uploaded_at timestamptz,
  hits bigint,
  monthly_hits bigint
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
    COALESCE(SUM(CASE WHEN d.source = 'scheduled' THEN d.hits ELSE 0 END), 0)::bigint AS hits,
    COALESCE(SUM(CASE WHEN d.source = 'scheduled' AND d.delivered_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' THEN d.hits ELSE 0 END), 0)::bigint AS monthly_hits
  FROM uploads u
  LEFT JOIN deliveries d ON d.upload_id = u.id
  WHERE u.nyong_id = target_nyong_id
    AND u.uploaded_at <= NOW()
    AND (NOT delivered_only OR EXISTS (SELECT 1 FROM deliveries d2 WHERE d2.upload_id = u.id))
  GROUP BY u.id, u.user_id, u.image_url, u.tag, u.nyong_id, u.uploaded_at
  ORDER BY u.uploaded_at DESC;
$$;
