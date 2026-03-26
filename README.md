# nyong (뇽파민)

> 하루 한 번, 예고 없이 찾아오는 랜덤 고양이 알림
>
> 터치할수록 솟아오르는 뇽파민(도파민), 말랑한 젤리 한 조각을 배달해 드립니다.

## 프로젝트 개요

**뇽파민**은 하루에 딱 한 번, 아무도 모르는 랜덤한 시간에 귀여운 고양이(뇽) 사진이 푸시 알림으로 찾아오는 앱입니다.

내 고양이를 등록하고, 사진을 다른 집사들에게 보내고, 받은 뇽을 마구 터치해서 뇽펀치를 날리세요. 이번 달 가장 많은 뇽펀치를 받은 뇽은 명예의 전당에 오릅니다.

## 핵심 기능

### 1. 뇽펀치

알림이 오면 10초 안에 고양이 사진을 미친 듯이 터치합니다.

- **10초 카운트다운** — 타임바가 줄어드는 동안 최대한 많이 터치
- **발바닥 이펙트** — 터치할 때마다 발바닥 자국 + 플로팅 숫자 애니메이션
- **햅틱 피드백** — 5, 10, 20, 50회 등 마일스톤마다 다른 진동
- **단계별 반응** — "살살 해달라냥..." → "좋아! 더 더!" → "뇽파민 폭발!!" → "전설의 집사 등장!!!"
- **자동 저장** — 뇽펀치를 1개라도 준 사진은 갤러리에 자동 저장

### 2. 뇽 ID 카드 시스템

내 고양이를 등록하면 고유한 뇽 ID 카드가 발급됩니다.

- **AI 고양이 판별** — OpenAI GPT-4o로 진짜 고양이인지, 정면 사진인지 검증
- **특징 추출** — 털 색상, 무늬, 눈 색상, 귀 모양, 체형 등 자동 분석 (NyongFeatures)
- **CLIP 임베딩** — Replicate API로 512차원 벡터 생성, 업로드 시 같은 뇽인지 매칭
- **다중 사진** — 정면 사진 1장(필수) + 추가 사진 최대 4장

### 3. 뇽 보내기

등록한 뇽을 선택하고 오늘의 사진을 업로드하면 다른 집사에게 배달됩니다.

- **뇽 선택** — 등록한 뇽 중 누구를 보낼지 선택
- **AI 매칭 검증** — 업로드한 사진이 선택한 뇽과 일치하는지 확인
- **하루 1회 제한** — 뇽 ID당 하루 한 번만 업로드 가능
- **태그** — 사진에 태그를 달아서 보내기 (최대 20자)
- **업로드 히스토리** — 보낸 뇽 사진 목록 + 받은 뇽펀치 수 확인
- **자동 배정** — 방해금지 시간을 피해 랜덤 수신자에게 전달

### 4. 뇽 갤러리

받은 뇽 사진을 3열 그리드로 모아봅니다.

- **그리드 뷰** — 3열 그리드에 뇽펀치 카운트 오버레이
- **풀스크린 뷰어** — 사진 터치 시 전체 화면, 좌우 스와이프로 연속 감상
- **뇽 이름 + 태그** — "모찌 #낮잠에게 32뇽펀치를 날렸어요!" 형태로 표시
- **인앱 배너** — 새 뇽이 도착하면 갤러리 상단에 알림 배너

### 5. 명예의 전당

뇽펀치를 가장 많이 받은 Top 5 뇽 랭킹입니다.

- **1등 풀너비** — 1등은 4:3 비율의 큰 카드로 표시 (왕관 배지)
- **2~5등 2열 그리드** — 은메달, 동메달 등 랭크 배지
- **기간 필터** — 일간 / 주간 / 월간 전환 가능
- **월간 리셋** — 매월 1일 monthly_hits 자동 초기화
- **RPC 집계** — `get_top_nyongs` 함수로 deliveries 기반 실시간 집계

### 6. 뇽 개별 갤러리

명예의 전당에서 뇽을 터치하면 해당 뇽의 전체 업로드 사진을 볼 수 있습니다.

- **업로드별 뇽펀치 집계** — `get_nyong_uploads` RPC로 조회
- **풀스크린 뷰어** — 개별 뇽의 사진을 크게 감상

## 수익화 모델

### 잠든 뇽 깨우기 (Unlock)

알림을 받고 **1시간 이상 지나서** 앱을 열면 뇽이 잠들어 있습니다.

- 이미지가 블러 처리되어 표시
- **광고 시청** 후 잠금 해제 → 뇽펀치 시작 (`deliveries.source = 'unlock_ad'`)

```
[알림 수신] ── 1시간 경과 ──> [앱 열기] ── 광고 시청 ──> [잠금 해제]
                                  │                         │
                                  v                         v
                            블러 이미지                뇽펀치 시작
```

### 오늘의 뇽 더보기 (Extra)

뇽펀치가 끝난 후 **추가 뇽**을 받을 수 있습니다.

- **무료 더보기**: 1회 무료 제공 (`source = 'extra'`)
- **광고 더보기**: 광고 시청 후 추가 수신 (`source = 'ad_extra'`)
- DB 레벨 횟수 제한 없음, 어제 업로드된 미수신 사진 중 랜덤 배정

### 뇽별 한장 더 받기 (Nyong Extra)

명예의전당 또는 뇽 갤러리에서 특정 뇽의 사진을 추가로 받을 수 있습니다.

- **무료 더보기**: 1회 무료 제공 (`source = 'nyong_extra'`)
- **광고 더보기**: 광고 시청 후 추가 수신 (`source = 'nyong_ad_extra'`)
- 글로벌 일별 **2회** 제한 (`nyong_extra_usage` 테이블)

> 광고는 Google AdMob (`react-native-google-mobile-ads`)으로 구현 (`lib/ads.ts`)

## 관리자 기능

> `is_admin = true`이거나 닉네임이 `admin`이면 설정 화면에서 관리자 버튼이 활성화됩니다.

- 일자별 배포 현황 조회 (CalendarPicker)
- 배포 시간 / 배포 수 / 뇽펀치 수 기준 정렬
- 고양이 사진 업로드 및 활성/비활성 토글

## 온보딩

3단계 플로우로 진행됩니다.

1. **환영 화면** — 앱 소개 + 로그인 방식 선택
2. **로그인/회원가입** — Google OAuth 또는 이메일/비밀번호
3. **닉네임 설정** — 다른 집사들에게 보여질 이름

> 테스트 모드: 이메일 `admin`, 비밀번호 `admin`으로 로그인하면 데모 모드 진입

## 알림 시스템

### 서버 기반 백그라운드 푸시

Supabase Edge Function이 매 시간 cron으로 실행되어 랜덤 사용자에게 푸시 알림을 발송합니다.

```
1. 오늘 업로드된 이미지 풀 확인
2. 아직 알림 안 받은 사용자 필터링 (오늘 수신 여부 + 방해금지 시간)
3. 시간대별 확률로 사용자 랜덤 선택
4. 각 사용자에게 랜덤 이미지 배정
5. Expo Push API로 푸시 알림 발송
6. deliveries 테이블에 기록 (status: delivered)
```

### 시간대별 알림 확률

| 시간대 | 확률 | 설명 |
|--------|------|------|
| 오전 8-10시 | 20% | 출근 시간 |
| 오후 5-7시 | 25% | 퇴근 시간 |
| 저녁 7-10시 | 15% | 따라잡기 |
| 밤 10시 이후 | 100% | 남은 사용자 전부 발송 |
| 그 외 시간 | 5% | 랜덤 서프라이즈 |

### 방해금지 시간

사용자별로 설정 가능하며, 해당 시간에는 알림이 발송되지 않습니다.

### 배송 플로우

```
1. 업로더가 뇽 선택 + 사진 업로드 → uploads 테이블에 저장
2. 방해금지 시간 외 수신 가능한 사용자 탐색
3. deliveries 테이블에 등록 + 푸시 알림 발송
4. 수신자가 알림 터치 → 뇽펀치 화면으로 이동
5. 10초간 뇽펀치 인터랙션 후 hits 저장 (status: received)
6. 갤러리에 자동 추가 + 뇽 통계 업데이트
```

### Edge Function 배포

```bash
# 마이그레이션 적용
supabase db push

# Edge Function 배포
supabase functions deploy send-daily-notifications
```

## 디자인 시스템

| 항목 | 내용 |
|------|------|
| Primary | `#F06292` |
| Gradient | `#FF6B9D` → `#FFB347` (핑크-오렌지) |
| Background | `#FFF8F9` |
| Text | `#4A3636` |
| 폰트 | Quicksand (본문), Jua (타이틀) |
| 심볼 | 말랑한 입체감의 분홍 젤리 고양이 발바닥 |
| UI 원칙 | 라운드 코너, 충분한 여백, 따뜻한 핑크톤 |

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router 6 |
| Language | TypeScript 5.9 |
| Backend | Supabase (Auth, Database, Storage, Edge Functions) |
| AI | OpenAI GPT-4o (고양이 판별/특징 추출), Replicate CLIP (임베딩/매칭) |
| Push | expo-notifications + Expo Push API |
| Image | expo-image-picker, expo-file-system |
| Auth | expo-auth-session (Google OAuth), expo-web-browser |
| Storage | expo-secure-store |
| UI | expo-linear-gradient, expo-blur, expo-haptics |
| Fonts | @expo-google-fonts/quicksand, @expo-google-fonts/jua |
| Platform | Android, iOS, Web |

## 데이터베이스 구조

### 테이블

| 테이블 | 설명 |
|--------|------|
| `profiles` | 사용자 프로필 (닉네임, 푸시 토큰, 방해금지 시간) |
| `nyongs` | 뇽 ID 카드 (이름, 사진들, 특징 JSONB, CLIP 임베딩 VECTOR(512), 통계) |
| `uploads` | 업로드된 사진 (이미지 URL, 업로더 ID, 뇽 ID, 태그, content_status) |
| `deliveries` | 배송 큐 (업로드 ID, 발신자, 수신자, 상태, 뇽펀치 횟수, source) |
| `nyong_extra_usage` | 뇽별 한장 더 받기 글로벌 일별 카운트 (2회/day 제한) |
| `content_reports` | 사용자 콘텐츠 신고 (3회→flagged, 5회→blocked 자동 처리) |
| `app_config` | 앱 운영 설정 (강제 업데이트 최소 버전 등) |

### deliveries.source 값

| source | 설명 |
|--------|------|
| `scheduled` | 정기 배달 (Edge Function cron) |
| `extra` | 오늘의 뇽 무료 더보기 |
| `ad_extra` | 오늘의 뇽 광고 더보기 |
| `nyong_extra` | 뇽별 무료 한장 더 받기 |
| `nyong_ad_extra` | 뇽별 광고 한장 더 받기 |
| `unlock_ad` | 잠든 뇽 광고 잠금해제 |

### RPC 함수

| 함수 | 설명 |
|------|------|
| `get_top_nyongs(p_period, limit_count)` | 뇽펀치 Top N 집계 (daily/weekly/monthly) |
| `get_nyong_uploads(target_nyong_id, viewer_uuid)` | 특정 뇽의 업로드 + 뇽펀치 합산 |
| `get_extra_delivery(receiver_uuid, yesterday_start, yesterday_end, p_source)` | 오늘의 뇽 더보기 배달 생성 |
| `get_nyong_extra_delivery(receiver_uuid, target_nyong_id, p_source)` | 뇽별 한장 더 받기 배달 생성 |
| `get_nyong_extra_status(receiver_uuid, target_nyong_id)` | 뇽별 더보기 상태 조회 (used_today, available_photos) |
| `record_delivery_hits(p_delivery_id, p_hits)` | 뇽펀치 횟수 저장 + status 업데이트 |

### 마이그레이션

| 파일 | 내용 |
|------|------|
| `20260127000000_init.sql` | 초기 스키마 (profiles, uploads, cats) |
| `20260207000000_delivery_system.sql` | 배송 시스템 (deliveries) |
| `20260207100000_extra_feature.sql` | 광고 보상 (extra_count) |
| `20260209000000_nyong_profiles.sql` | 뇽 ID 카드 시스템 (nyongs, 임베딩, RLS) |
| `20260211000000_hall_of_fame_rpc.sql` | 명예의전당 RPC 함수 |
| `20260218000000_nyong_points.sql` | 뇽 포인트 시스템 |
| `20260223000000_top_puncher_top3.sql` | 명예의전당 Top 3 |
| `20260223100000_get_extra_delivery_rpc.sql` | 오늘의 뇽 더보기 RPC |
| `20260226000000_nyong_extra_delivery.sql` | 뇽별 한장 더 받기 RPC + nyong_extra_usage 테이블 |
| `20260227000000_add_content_status.sql` | 콘텐츠 상태 컬럼 |
| `20260227100000_report_policy_and_auto_flag.sql` | 신고 정책 + 자동 플래그 트리거 |
| `20260305000000_monthly_hits_filter.sql` | 명예의전당 기간 필터 (daily/weekly/monthly) |
| `20260305200000_get_extra_delivery_source_param.sql` | 더보기 source 파라미터 추가 |
| `20260305300000_get_nyong_extra_delivery_source_param.sql` | 뇽별 더보기 source 파라미터 추가 |
| `20260305400000_app_config_force_update.sql` | 강제 업데이트 설정 테이블 |

### RLS 정책

| 테이블 | 정책 |
|--------|------|
| `profiles` | 자신의 프로필만 조회/수정 |
| `nyongs` | 자신의 뇽만 생성/수정, 전체 조회 가능 |
| `uploads` | 자신의 업로드 + 배송된 업로드 조회 |
| `deliveries` | 자신이 발신/수신한 배송 조회 |

## 프로젝트 구조

```
nyong/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          # 탭 레이아웃 (갤러리, 보내기, 명예의전당)
│   │   ├── index.tsx            # 뇽 갤러리 (홈)
│   │   ├── upload.tsx           # 뇽 보내기
│   │   └── hall-of-fame.tsx     # 명예의 전당
│   ├── _layout.tsx              # 루트 레이아웃 (강제 업데이트 모달 포함)
│   ├── notification.tsx         # 뇽펀치 화면
│   ├── onboarding.tsx           # 로그인/회원가입
│   ├── nickname-setup.tsx       # 닉네임 설정 (최초 가입 시)
│   ├── settings.tsx             # 설정
│   ├── admin.tsx                # 관리자 페이지
│   ├── upload-calendar.tsx      # 업로드 캘린더 (관리자)
│   ├── nyong-register.tsx       # 뇽 ID 카드 등록
│   ├── nyong-id-card.tsx        # 뇽 ID 카드 상세
│   └── nyong-gallery.tsx        # 뇽 개별 갤러리
├── components/
│   ├── CatPaw.tsx               # 발바닥 아이콘
│   ├── GradientText.tsx         # 그라데이션 텍스트
│   ├── NotificationBanner.tsx   # 인앱 알림 배너
│   ├── TimePicker.tsx           # 시간 선택 모달
│   ├── BirthdayPicker.tsx       # 생일 선택 모달
│   ├── CalendarPicker.tsx       # 달력 선택 (관리자)
│   ├── UploadCalendar.tsx       # 업로드 캘린더 컴포넌트
│   ├── PinchableImage.tsx       # 핀치 줌 이미지 뷰어
│   └── Toast.tsx                # 토스트 알림
├── contexts/
│   └── AuthContext.tsx           # 인증, 알림, 테스트모드 상태 관리
├── lib/
│   ├── supabase.ts              # Supabase 클라이언트
│   ├── notifications.ts         # 푸시 알림 유틸리티
│   ├── openai.ts                # AI 고양이 판별 + 특징 추출
│   ├── catMatcher.ts            # CLIP 임베딩 생성 + 뇽 매칭
│   ├── ads.ts                   # 광고 서비스 (플레이스홀더)
│   ├── theme.ts                 # 색상, 라운드, 간격 토큰
│   └── i18n/                    # 다국어 (ko, en)
├── supabase/
│   ├── migrations/              # DB 마이그레이션 (5개)
│   └── functions/
│       └── send-daily-notifications/  # 알림 발송 Edge Function
├── types/
│   └── index.ts                 # TypeScript 타입 정의
└── assets/
    ├── icon.png                 # 앱 아이콘
    ├── adaptive-icon.png        # Android 적응형 아이콘
    ├── screen.png               # 스플래시 화면
    ├── nyong.png                # 뇽 마스코트 캐릭터
    ├── cat-paw.png              # 발바닥 이미지
    ├── crown.png                # 명예의전당 왕관
    └── hof-cat.png              # 명예의전당 고양이
```

## 빌드 및 배포

| 항목 | 값 |
|------|-----|
| Package | `com.nyong.app` |
| Bundle ID | `com.nyong.app` |
| EAS Project | `b7354b39-b61c-4470-bbc5-f5fab6a0d32b` |
| ASC App ID | `6759514657` |

### 1. 버전 업데이트

네이티브 변경(새 에셋, 네이티브 모듈 등)이 있으면 `app.json`에서 버전을 올려야 합니다.

```jsonc
// app.json
{
  "version": "1.1.0",           // runtimeVersion 결정 (OTA 호환성 기준)
  "ios": { "buildNumber": "5" },
  "android": { "versionCode": 30 }
}
```

- `version`: runtimeVersion policy가 `appVersion`이므로, 이 값이 바뀌면 새 네이티브 빌드 필수
- `versionCode`: Play Store에 올린 최대값보다 반드시 높아야 함
- `buildNumber`: App Store Connect에 올린 최대값보다 높아야 함

### 2. Android 빌드 (로컬)

EAS Free 월간 빌드 한도가 있으므로 로컬 빌드 권장.

```bash
export PATH="/Users/al01967928/.nvm/versions/node/v24.13.0/bin:$PATH"
ANDROID_HOME=~/Library/Android/sdk eas build --local --platform android --profile production
```

빌드 완료 시 프로젝트 루트에 `build-{timestamp}.aab` 파일이 생성됩니다.

**Play Console 업로드:**
1. [Play Console](https://play.google.com/console) → 앱 선택
2. 프로덕션 (또는 내부 테스트) → 새 버전 만들기
3. `.aab` 파일 업로드 → 검토 후 출시

### 3. iOS 빌드 (EAS 리모트)

```bash
eas build --platform ios --profile production
```

- Apple 계정 로그인이 필요하므로 **터미널에서 직접 실행** (Claude Code에서는 stdin 미지원)
- 빌드 완료 후 `.ipa`가 EAS에 업로드됨

### 4. iOS 제출 (App Store Connect)

```bash
eas submit --platform ios --latest --profile production
```

- `eas.json`에 `ascAppId: 6759514657` 설정됨
- 제출 후 Apple 처리 5~10분 → TestFlight에서 확인 가능
- [App Store Connect](https://appstoreconnect.apple.com/apps/6759514657/testflight/ios)

### 5. OTA 업데이트

JS/에셋만 변경되고 네이티브 변경이 없을 때 (같은 `version` 내에서):

```bash
eas update --channel production --message "업데이트 내용"
```

### 6. 강제 업데이트 (DB)

앱 시작 시 `app_config.min_android_version_code`와 현재 versionCode를 비교합니다.
현재 버전이 낮으면 플레이스토어로 이동하는 강제 업데이트 모달이 표시됩니다.

**스토어 배포 완료 후** DB를 업데이트하여 기존 사용자에게 업데이트를 유도합니다:

```sql
-- 사용자들이 versionCode 30으로 업데이트하도록 강제
UPDATE app_config SET min_android_version_code = 30 WHERE id = 1;

-- 강제 업데이트 해제 (모든 버전 허용)
UPDATE app_config SET min_android_version_code = 1 WHERE id = 1;
```

> iOS: 앱스토어 정식 출시 후 `min_ios_build_number` 컬럼 추가 + `itms-apps://` 링크로 동일하게 구현 예정

### 전체 배포 플로우 요약

```
1. app.json 버전 업데이트 (version, versionCode, buildNumber)
2. git commit
3. Android 로컬 빌드 → .aab 생성
4. iOS EAS 리모트 빌드 (터미널) → .ipa 생성
5. iOS 제출: eas submit --platform ios --latest
6. Android 업로드: Play Console에 .aab 수동 업로드
7. 양쪽 스토어 배포 확인 후 DB 업데이트: UPDATE app_config SET min_android_version_code = N
```

## 링크

- [개인정보처리방침](https://nyongpamine.com/nyong/privacy-policy)
- [이용약관](https://nyongpamine.com/nyong/terms)

## 라이선스

MIT License
