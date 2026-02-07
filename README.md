# 🐾 nyong (뇽)

> 하루 한 번, 예고 없이 찾아오는 고양이 조각
>
> "일상의 틈새를 채우는 5초간의 도파민, 말랑한 젤리 한 조각을 배달해 드립니다."

## 🌟 프로젝트 개요

**nyong**은 바쁜 일상을 살아가는 현대인들에게 하루 한 번 무작위 시각에 귀여운 고양이 사진을 전송하여 짧지만 강력한 힐링 타임을 제공하는 앱입니다.

복잡한 소셜 미디어 피드에서 벗어나, 오직 한 장의 사진에만 집중하고 반응하는 특별한 경험을 선사합니다.

## 🎯 주요 목표

- 사용자가 설정한 제외 시간을 피해 랜덤한 시각에 푸시 알림 발송
- 알람 클릭 후 5초간의 '뇽 펀치' 인터랙션으로 도파민 극대화
- 고양이를 자랑하고 싶은 '뇽급자'와 힐링이 필요한 '수요자'를 연결

## ✨ 핵심 기능

### 1. 온보딩 및 개인화 설정

- **간편 로그인** — 구글 계정 연동을 통한 간편 가입
- **제외 시간 설정** — 수면 시간이나 업무 시간 등 알람을 받고 싶지 않은 시간대를 분 단위로 직접 설정
- **닉네임 설정** — 서비스 내에서 불릴 나만의 집사 닉네임 지정

### 2. 오늘의 뇽 알람 및 인터랙션

- **랜덤 딜리버리** — 매일 무작위 시각에 고양이 사진 알림 전송
- **5초 타임 어택** — 사진 조회 시 5초 카운트다운 시작
- **뇽 펀치 (nyong hit)** — 5초 동안 하단 젤리 심볼을 연타하여 고양이에게 애정을 표현
- **자동 저장** — 뇽 펀치를 1개라도 준 사진은 자동으로 '나의 뇽 갤러리'에 저장

### 3. 몰입형 갤러리 및 기록

- **수직 스와이프 뷰어** — 저장된 사진을 클릭하면 전체 화면으로 확대되며, 위아래 스와이프를 통해 릴스/틱톡처럼 연속 감상 가능
- **뇽급자 스토리 (히스토리)** — 내가 올린 사진이 전 세계 사용자들에게 도달한 횟수와 받은 총 '뇽 펀치' 수를 한눈에 확인

### 4. 오늘의 뇽 도전 (업로드)

- **AI 판별 시뮬레이션** — 고양이 사진 여부를 확인하는 '오늘의 뇽 도전' 프로세스
- **공급 로직** — 공급이 적을 땐 여러 사용자에게 배포되고, 공급이 많을 땐 소수에게 희귀하게 배달되는 유동적 배포 시스템

## 🛡️ 관리자 기능

> 닉네임을 `admin`으로 설정하면 홈 화면에 관리자 전용 버튼이 활성화됩니다.

- **일자별 데이터 조회** — 달력을 통해 특정 날짜의 배포 현황 확인
- **스마트 정렬** — 배포 시간, 배포 수(유저 수), 받은 펀치(hit) 수 순으로 데이터 리스트 정렬
- **실시간 모니터링** — 현재 활성화된 사진의 배달 성공 여부 관리

## 💰 수익화 모델

### 1. 잠든 뇽 깨우기 (Unlock)

알림을 받고 **1시간 이상 지나서** 앱을 열면, 뇽이 잠들어 있습니다.

- 이미지가 블러 처리되어 표시됨
- "시간이 지나 뇽이 잠들었어요 💤" 메시지 표시
- **광고 시청** 후 잠금 해제 → 뇽펀치 인터랙션 시작

```
[알림 수신] ─── 1시간 경과 ───> [앱 열기] ─── 광고 시청 ───> [잠금 해제]
                                    │                           │
                                    v                           v
                              🔒 블러 이미지              🔓 뇽펀치 시작
```

### 2. 뇽 하나 더 받기 (Extra)

뇽펀치가 끝난 후, **광고를 보고 추가 뇽을 받을 수** 있습니다.

- 하루 최대 **5회**까지 추가 뇽 수신 가능
- "광고 보고 뇽 하나 더 받기 (남은 횟수: 5/5)" 버튼 표시
- 광고 시청 완료 → 대기 중인 다른 뇽 자동 배정

```typescript
// profiles 테이블 컬럼
extra_count_today: number;  // 오늘 사용한 횟수 (0-5)
extra_count_date: string;   // 마지막 사용 날짜 (YYYY-MM-DD)
```

### 광고 통합

현재는 플레이스홀더로 구현되어 있으며, 실제 광고 SDK로 교체 필요:

```typescript
// lib/ads.ts
export async function showRewardedAd(adType: 'unlock' | 'extra'): Promise<AdResult> {
  // TODO: AdMob, Unity Ads 등 실제 SDK 연동
  return { success: true, reward: true };
}
```

## 🎨 디자인 시스템

| 항목 | 내용 |
|------|------|
| 메인 컬러 | `#EC4899` (Pink 500), `#FBCFE8` (Pink 200) |
| 심볼 | 말랑말랑한 입체감이 살아있는 '분홍 젤리' 고양이 발바닥 |
| UI 원칙 | 라운드 코너(Rounded-3xl), 충분한 여백, 따뜻하고 부드러운 핑크톤 테마 |

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router 6 |
| Language | TypeScript 5.9 |
| Backend | Supabase (Auth, Database, Storage) |
| Image | expo-image-picker |
| Secure Storage | expo-secure-store |
| Push Notifications | expo-notifications |
| Platform | iOS, Android, Web |

## 📊 데이터베이스 구조

### 테이블

| 테이블 | 설명 |
|--------|------|
| `profiles` | 사용자 프로필 (닉네임, 푸시 토큰, 제외 시간, 업로드/수신 날짜) |
| `uploads` | 업로드된 고양이 사진 (이미지 URL, 업로더 ID) |
| `deliveries` | 배송 큐 (업로드 ID, 발신자, 수신자, 상태, 뇽펀치 횟수) |

### 배송 플로우

```
1. 업로더가 사진 업로드 → uploads 테이블에 저장
2. deliveries 테이블에 pending 상태로 등록
3. 서버 Edge Function이 매 시간 실행되어 랜덤 사용자에게 푸시 알림 발송
4. 수신자가 푸시 알림 클릭 → 앱 열림 → 뇽펀치 화면으로 이동
5. 5초간 뇽펀치 인터랙션 후 hits 저장 (status: received)
6. 갤러리에 자동 추가
```

## 🔔 알림 시스템 (상세)

### 서버 기반 백그라운드 푸시

사용자가 앱을 열지 않아도 **백그라운드에서 푸시 알림**을 받을 수 있습니다.

```
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge Function (매 시간 cron 실행)                  │
│                                                             │
│  1. 오늘 업로드된 이미지 풀 확인                               │
│  2. 아직 알림 안 받은 사용자 필터링                            │
│     - 오늘 이미 받았으면 제외                                 │
│     - 방해금지 시간이면 제외                                  │
│  3. 시간대별 확률로 사용자 랜덤 선택                           │
│  4. 각 사용자에게 랜덤 이미지 배정                             │
│  5. Expo Push API로 푸시 알림 발송                           │
│  6. deliveries 테이블에 기록 (status: delivered)             │
└─────────────────────────────────────────────────────────────┘
```

### 시간대별 알림 확률

| 시간대 | 확률 | 설명 |
|--------|------|------|
| 오전 8-10시 | **20%** | 출근 시간 ⭐ |
| 오후 5-7시 | **25%** | 퇴근 시간 ⭐ |
| 저녁 7-10시 | 15% | 따라잡기 |
| 밤 10시 이후 | **100%** | 남은 사용자 전부 발송 |
| 그 외 시간 | 5% | 랜덤 서프라이즈 |

출퇴근 시간에 알림 받을 확률이 높아져서, 지하철/버스에서 뇽 선물을 받을 확률이 높습니다!

### 방해금지 시간

사용자별로 설정 가능하며, 해당 시간에는 알림이 발송되지 않습니다.

```typescript
// 방해금지 시간 체크
if (user.use_exclusion) {
  if (isInExclusionTime(currentTime, user.exclusion_start, user.exclusion_end)) {
    return false; // 알림 제외
  }
}
```

### 풀(Pool) 기반 1:N 배포

- 업로더가 올린 이미지는 **여러 사용자에게 배포**될 수 있음
- 모든 로그인 사용자는 하루에 한 번 알림을 받는 것이 보장됨 (밤 10시까지)
- 자기가 올린 사진은 받지 않음

### 알림 수신 흐름

```
[백그라운드] 서버에서 푸시 발송
     ↓
[사용자] 푸시 알림 수신 (앱 미실행 상태)
     ↓
[사용자] 알림 클릭
     ↓
[앱] AuthContext에서 알림 데이터 추출 (deliveryId, imageUrl)
     ↓
[앱] NotificationBanner 표시 또는 바로 뇽펀치 화면으로 이동
     ↓
[앱] 5초간 뇽펀치 인터랙션
     ↓
[앱] deliveries 테이블 업데이트 (hits, status: received)
```

### Edge Function 배포

```bash
# 마이그레이션 적용
supabase db push

# Edge Function 배포
supabase functions deploy send-daily-notifications

# Cron 스케줄 설정 (Supabase Dashboard에서)
SELECT cron.schedule(
  'send-notifications',
  '0 * * * *',  -- 매 시간 정각
  $$SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-daily-notifications',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );$$
);
```

### RLS 정책

| 테이블 | 정책 |
|--------|------|
| `profiles` | 자신의 프로필만 조회/수정 가능 |
| `uploads` | 자신의 업로드 + 배송된 업로드 조회 가능 |
| `deliveries` | 자신이 발신/수신한 배송 + pending 상태 배송 조회 가능 |

## 📱 플랫폼별 이미지 업로드

```typescript
// 웹: blob URL → fetch로 blob 변환 후 업로드
if (Platform.OS === 'web') {
  const response = await fetch(selectedImage);
  const blob = await response.blob();
  await supabase.storage.from('uploads').upload(fileName, blob);
}

// 네이티브: FileSystem으로 base64 읽기 후 업로드
else {
  const base64 = await FileSystem.readAsStringAsync(selectedImage, {
    encoding: 'base64',
  });
  await supabase.storage.from('uploads').upload(fileName, decode(base64));
}
```

## 📁 프로젝트 구조

```
nyong/
├── app/                      # Expo Router 페이지
│   ├── (tabs)/               # 탭 네비게이션
│   │   ├── index.tsx         # 뇽 갤러리 (홈)
│   │   ├── upload.tsx        # 뇽 보내기
│   │   └── _layout.tsx       # 탭 레이아웃
│   ├── notification.tsx      # 뇽펀치 화면
│   ├── onboarding.tsx        # 로그인/회원가입
│   ├── settings.tsx          # 설정
│   └── admin.tsx             # 관리자 페이지
├── components/               # 재사용 컴포넌트
│   ├── CatPaw.tsx            # 발바닥 아이콘
│   ├── NotificationBanner.tsx # 인앱 알림 배너
│   └── TimePicker.tsx        # 시간 선택 모달
├── contexts/
│   └── AuthContext.tsx       # 인증 및 알림 상태 관리
├── lib/
│   ├── supabase.ts           # Supabase 클라이언트
│   ├── notifications.ts      # 푸시 알림 유틸리티
│   ├── openai.ts             # AI 고양이 판별
│   ├── ads.ts                # 광고 서비스 (수익화)
│   ├── theme.ts              # 테마 (색상, 라운드)
│   └── i18n/                 # 다국어 지원 (ko, en)
├── supabase/
│   ├── migrations/           # DB 마이그레이션
│   └── functions/            # Edge Functions
│       └── send-daily-notifications/  # 알림 발송 함수
└── types/
    └── index.ts              # TypeScript 타입 정의
```

## 🚀 시작하기

```bash
# 의존성 설치
yarn install

# 개발 서버 실행
yarn start

# iOS 실행
yarn ios

# Android 실행
yarn android
```

## 📝 라이선스

MIT License
