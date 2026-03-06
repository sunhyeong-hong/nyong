-- 앱 강제 업데이트를 위한 최소 버전 관리 테이블
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  min_android_version_code INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO app_config (id, min_android_version_code) VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_config" ON app_config
  FOR SELECT USING (true);
