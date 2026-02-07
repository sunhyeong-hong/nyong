-- Extra feature: 광고 보고 뇽 하나 더 받기
-- 하루 최대 5회까지 추가 뇽을 받을 수 있음

-- profiles 테이블에 extra 관련 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_count_today INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_count_date DATE;

-- 매일 자정에 extra_count_today를 리셋하는 것은 앱에서 처리
-- (extra_count_date가 오늘이 아니면 0으로 간주)

COMMENT ON COLUMN profiles.extra_count_today IS '오늘 사용한 추가 뇽 횟수 (최대 5)';
COMMENT ON COLUMN profiles.extra_count_date IS '마지막으로 추가 뇽을 사용한 날짜';
