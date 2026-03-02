-- uploads 테이블에 content_status 추가
ALTER TABLE uploads
  ADD COLUMN content_status text NOT NULL DEFAULT 'approved'
  CHECK (content_status IN ('approved', 'flagged', 'blocked'));

-- nyongs 테이블에 content_status 추가
ALTER TABLE nyongs
  ADD COLUMN content_status text NOT NULL DEFAULT 'approved'
  CHECK (content_status IN ('approved', 'flagged', 'blocked'));

-- content_reports 테이블 (신고 기능 인프라)
CREATE TABLE content_reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  -- 신고 대상: upload 또는 nyong
  target_type text NOT NULL CHECK (target_type IN ('upload', 'nyong')),
  target_id BIGINT NOT NULL,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'violence', 'spam', 'other')),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- RLS 활성화
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- 로그인한 유저는 자기 신고만 볼 수 있음
CREATE POLICY "Users can view own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- 로그인한 유저는 신고 생성 가능
CREATE POLICY "Users can create reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- 같은 유저가 같은 대상을 중복 신고 방지
CREATE UNIQUE INDEX idx_unique_report
  ON content_reports(reporter_id, target_type, target_id);

-- flagged/blocked 콘텐츠는 배달에서 제외되도록 인덱스
CREATE INDEX idx_uploads_content_status ON uploads(content_status);
CREATE INDEX idx_nyongs_content_status ON nyongs(content_status);
