-- 명예의전당 일간 보기: 프로필 사진 대신 해당 기간 hits 최고 업로드 사진 반환
-- top_upload_photo_url 컬럼 추가

CREATE OR REPLACE FUNCTION get_top_nyongs(limit_count int DEFAULT 5, time_range text DEFAULT 'monthly')
RETURNS TABLE (
  id int,
  name text,
  front_photo_url text,
  owner_id uuid,
  upload_count int,
  total_hits bigint,
  monthly_hits bigint,
  top_upload_photo_url text
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
    COALESCE(SUM(
      CASE WHEN (
        SELECT MIN(ds.delivered_at) FROM deliveries ds WHERE ds.upload_id = u.id
      ) >= (
        CASE time_range
          WHEN 'daily' THEN date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
          WHEN 'weekly' THEN date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' - interval '6 days'
          ELSE date_trunc('month', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
        END
      ) THEN d.hits ELSE 0 END
    ), 0)::bigint AS monthly_hits,
    (
      SELECT u2.image_url
      FROM uploads u2
      JOIN deliveries d2 ON d2.upload_id = u2.id
      WHERE u2.nyong_id = n.id
        AND u2.uploaded_at <= NOW()
        AND (
          SELECT MIN(ds.delivered_at) FROM deliveries ds WHERE ds.upload_id = u2.id
        ) >= (
          CASE time_range
            WHEN 'daily' THEN date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
            WHEN 'weekly' THEN date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' - interval '6 days'
            ELSE date_trunc('month', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
          END
        )
      GROUP BY u2.id, u2.image_url
      ORDER BY SUM(d2.hits) DESC
      LIMIT 1
    ) AS top_upload_photo_url
  FROM nyongs n
  LEFT JOIN uploads u ON u.nyong_id = n.id AND u.uploaded_at <= NOW()
  LEFT JOIN deliveries d ON d.upload_id = u.id
  GROUP BY n.id, n.name, n.front_photo_url, n.owner_id, n.upload_count
  ORDER BY monthly_hits DESC
  LIMIT limit_count;
$$;
