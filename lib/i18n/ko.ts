// 한국어 (기본 언어)
export const ko = {
  // 공통
  common: {
    cancel: '취소',
    confirm: '확인',
    save: '저장',
    complete: '완료',
    back: '뒤로가기',
    error: '앗!',
    success: '성공',
    loading: '로딩 중',
  },

  // 탭 네비게이션
  tabs: {
    gallery: '뇽 갤러리',
    upload: '뇽 보내기',
  },

  // 갤러리 화면
  gallery: {
    title: '뇽',
    emptyTitle: '아직 받은 뇽이 없어요',
    emptySubtitle: '뇽이 오면 뇽펀치를 날려보세요!',
    punchWithTag: '{tag}에게 {count}뇽펀치를 날렸어요!',
    punchWithoutTag: '{count}뇽펀치를 날렸어요!',
  },

  // 업로드 화면
  upload: {
    button: '뇽 보내기',
    verifying: '뇽 확인 중...',
    uploadButton: '보내기',
    tagPlaceholder: '태그 입력 (최대 20자)',
    historyTitle: '보낸 뇽',
    emptyHistory: '아직 보낸 뇽이 없어요',
    sortRecent: '최신',
    sortHits: '뇽펀치',
    hits: '{count}뇽펀치를 받았어요!',
    // 알림
    deliverySuccessTitle: '뇽 배달 완료!',
    deliverySuccessMessage: '당신의 뇽이 누군가에게 전달되었어요',
    deliveryPendingTitle: '뇽 대기 중',
    deliveryPendingMessage: '뇽을 받을 사람을 찾는 중이에요!',
    // 에러
    errorNotCat: '진짜 뇽(고양이) 사진만 보낼 수 있어요',
    errorVerifyFailed: '뇽 확인에 실패했어요',
    errorAlreadyUploaded: '오늘은 이미 뇽을 보냈어요! 내일 또 만나요',
    errorUploadFailed: '뇽 보내기에 실패했어요',
  },

  // 알림 화면 (뇽펀치)
  notification: {
    instruction: '뇽을 터치해서 뇽펀치!',
    punchLabel: '뇽펀치!',
    // Unlock (잠든 뇽)
    sleepingTitle: '시간이 지나 뇽이 잠들었어요',
    sleepingEmoji: '💤',
    unlockButton: '광고 보고 오늘의 뇽 깨우기',
    // Extra (하나 더)
    extraButton: '광고 보고 뇽 하나 더 받기',
    extraRemaining: '남은 횟수: {remaining}/5',
    extraExhausted: '오늘의 뇽을 모두 만났어요',
  },

  // 알림 배너
  banner: {
    title: '뇽! 뇽이 왔어요!',
    subtitle: '터치해서 뇽펀치를 날려보세요',
  },

  // 온보딩 화면
  onboarding: {
    appName: '뇽',
    appTagline: '랜덤 뇽 알람',
    appDescription: '하루에 한 번, 랜덤한 시간에\n귀여운 뇽이 찾아옵니다!',
    googleLogin: 'Google로 시작하기',
    emailLogin: '이메일로 로그인',
    loginTitle: '로그인 / 회원가입',
    nicknameTitle: '닉네임 설정',
    nicknameDescription: '다른 뇽집사에게 보여질 이름이에요',
    nicknamePlaceholder: '닉네임',
    emailPlaceholder: '이메일',
    passwordPlaceholder: '비밀번호',
    loginButton: '로그인',
    signupButton: '회원가입',
    // 알림
    signupSuccessTitle: '가입 완료!',
    signupSuccessMessage: '이메일 확인 후 로그인해주세요.',
    // 에러
    errorEmptyFields: '이메일과 비밀번호를 입력해주세요.',
    errorGoogleLogin: 'Google 로그인에 실패했어요.',
    errorSignup: '회원가입에 실패했어요.',
    errorLogin: '로그인에 실패했어요.',
    errorEmptyNickname: '닉네임을 입력해주세요.',
    errorUserNotFound: '사용자를 찾을 수 없어요.',
    errorProfileSetup: '프로필 설정에 실패했어요.',
  },

  // 설정 화면
  settings: {
    profileSection: '프로필',
    nicknameLabel: '닉네임',
    nicknamePlaceholder: '닉네임을 입력하세요',
    alarmSection: '뇽 알람 설정',
    exclusionToggle: '방해금지 시간',
    exclusionDescription: '이 시간에는 뇽이 오지 않아요',
    startTime: '시작',
    endTime: '종료',
    adminPage: '관리자 페이지',
    logout: '로그아웃',
    version: '뇽 v1.0.0',
    // 알림
    saveSuccess: '저장되었어요!',
    logoutTitle: '로그아웃',
    logoutMessage: '정말 나가실 건가요?',
    // 에러
    errorEmptyNickname: '닉네임을 입력해주세요.',
    errorSaveFailed: '저장에 실패했어요.',
  },

  // 푸시 알림
  push: {
    title: '뇽! 뇽이 왔어요!',
    body: '터치해서 뇽펀치를 날려보세요',
  },
};

export type Translations = typeof ko;
