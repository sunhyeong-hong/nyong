-- 중복 신고 허용: unique 인덱스 제거
DROP INDEX IF EXISTS idx_unique_report;

-- 신고 누적 시 자동 content_status 변경 트리거
CREATE OR REPLACE FUNCTION auto_flag_content()
RETURNS TRIGGER AS $$
DECLARE
  report_count INT;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM content_reports
  WHERE target_type = NEW.target_type AND target_id = NEW.target_id;

  IF report_count >= 5 THEN
    IF NEW.target_type = 'upload' THEN
      UPDATE uploads SET content_status = 'blocked' WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'nyong' THEN
      UPDATE nyongs SET content_status = 'blocked' WHERE id = NEW.target_id;
    END IF;
  ELSIF report_count >= 3 THEN
    IF NEW.target_type = 'upload' THEN
      UPDATE uploads SET content_status = 'flagged' WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'nyong' THEN
      UPDATE nyongs SET content_status = 'flagged' WHERE id = NEW.target_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_flag_content
  AFTER INSERT ON content_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_content();
