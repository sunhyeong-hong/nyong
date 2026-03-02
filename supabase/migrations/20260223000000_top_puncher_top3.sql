-- get_top_puncher: LIMIT 1 → LIMIT 3 (top 3 punchers per upload)
CREATE OR REPLACE FUNCTION get_top_puncher(target_upload_id int)
RETURNS TABLE(nickname text, total_hits bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT p.nickname, d.hits::bigint AS total_hits
  FROM deliveries d
  JOIN profiles p ON d.receiver_id = p.id
  WHERE d.upload_id = target_upload_id AND d.hits > 0
  ORDER BY d.hits DESC LIMIT 3;
$$;
