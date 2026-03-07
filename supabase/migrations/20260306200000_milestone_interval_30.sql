-- Change milestone interval from 50 to 30 uploads
CREATE OR REPLACE FUNCTION grant_upload_point(uploader_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upload_count INTEGER;
  milestone INTEGER;
  bonus INTEGER := 0;
BEGIN
  -- +1P
  UPDATE profiles SET nyong_points = nyong_points + 1 WHERE id = uploader_uuid;

  SELECT COUNT(*) INTO upload_count FROM uploads WHERE user_id = uploader_uuid;

  -- 30's multiple -> milestone bonus
  IF upload_count > 0 AND upload_count % 30 = 0 THEN
    milestone := upload_count / 30;
    bonus := milestone * 10;
    UPDATE profiles SET nyong_points = nyong_points + bonus WHERE id = uploader_uuid;
  END IF;

  RETURN bonus;
END;
$$;
