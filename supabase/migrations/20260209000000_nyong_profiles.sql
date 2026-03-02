-- 뇽(고양이) 프로필 시스템
-- 1장 필수 (정면), 4장 옵션 (다양한 각도)

-- 뇽 프로필 테이블
CREATE TABLE nyongs (
  id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,

  -- 사진 (1장 필수, 4장 옵션)
  front_photo_url TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',  -- 추가 사진 (최대 4장)

  -- AI 추출 특징 (GPT-4o로 등록 시 한 번 추출)
  features JSONB DEFAULT '{}',
  -- 예: {
  --   "fur_color": "orange tabby",
  --   "fur_pattern": "striped with white patches",
  --   "eye_color": "green",
  --   "ear_shape": "pointed, slightly folded tips",
  --   "distinctive_marks": "M shape on forehead, white chin",
  --   "body_type": "medium, slightly chubby"
  -- }

  -- CLIP 임베딩 (각 사진별)
  front_embedding VECTOR(512),  -- 정면 사진 임베딩
  embeddings VECTOR(512)[],     -- 추가 사진 임베딩들

  -- 통계
  total_hits INTEGER DEFAULT 0,      -- 누적 뇽펀치
  monthly_hits INTEGER DEFAULT 0,    -- 이번 달 뇽펀치
  upload_count INTEGER DEFAULT 0,    -- 업로드 횟수

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- uploads 테이블에 nyong_id 연결
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS nyong_id INTEGER REFERENCES nyongs(id);

-- 인덱스
CREATE INDEX idx_nyongs_owner ON nyongs(owner_id);
CREATE INDEX idx_nyongs_monthly_hits ON nyongs(monthly_hits DESC);
CREATE INDEX idx_uploads_nyong ON uploads(nyong_id);

-- RLS 정책
ALTER TABLE nyongs ENABLE ROW LEVEL SECURITY;

-- 자신의 뇽만 생성/수정/삭제 가능
CREATE POLICY "Users can manage own nyongs" ON nyongs
  FOR ALL USING (auth.uid() = owner_id);

-- 모든 사용자가 뇽 프로필 조회 가능 (명예의 전당용)
CREATE POLICY "Anyone can view nyongs" ON nyongs
  FOR SELECT USING (true);

-- 매월 1일 monthly_hits 리셋 함수
CREATE OR REPLACE FUNCTION reset_monthly_hits()
RETURNS void AS $$
BEGIN
  UPDATE nyongs SET monthly_hits = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE nyongs IS '뇽(고양이) 프로필 - ID 카드 시스템';
COMMENT ON COLUMN nyongs.features IS 'GPT-4o로 추출한 고양이 특징 (털색, 눈색, 무늬 등)';
COMMENT ON COLUMN nyongs.front_embedding IS 'CLIP 임베딩 벡터 (정면 사진)';
