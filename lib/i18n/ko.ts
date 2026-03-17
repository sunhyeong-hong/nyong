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

  // 닉네임 설정
  nicknameSetup: {
    title: '집사님, 닉네임을 알려주세요!',
    subtitle: '뇽들이 집사님을 부를 이름이에요.\n나중에 설정에서 변경할 수 있어요.',
    placeholder: '닉네임 입력 (최대 20자)',
    hint: '특수문자 없이 최대 20자',
    button: '뇽파민 시작하기!',
  },

  // 탭 네비게이션
  tabs: {
    gallery: '뇽 갤러리',
    upload: '뇽 보내기',
  },

  // 갤러리 화면
  gallery: {
    title: 'Nyongpamine',
    emptyMessage: '곧 뇽들이 {nickname}님을 찾아갈거에요.\n언제 어떤 뇽에게 간택당할지 두근두근 기다려주세요!',
    emptyNotifButton: '알림 허용하기',
    punchWithTag: '{tag}에게 {count}뇽펀치를 날렸어요!',
    punchWithoutTag: '{count}뇽펀치를 날렸어요!',
    sortLatest: '최신순',
    sortPunch: '뇽펀치순',
    sortName: '뇽이름순',
    groupOther: '기타',
    groupPhotoCount: '{count}장',
    nyongExtraButton: '한장 더 받기',
    nyongExtraButtonAd: '광고보고 {name} 한장 더 받기',
    nyongExtraExhausted: '오늘은 다 받았어요!',
    nyongExtraNoPhotos: '더 받을 {name} 사진이 없어요',
    nyongExtraTomorrow: '내일 또 받을 수 있어요',
    nyongExtraGuide: '하루 한 장 원하는 뇽을 한 번 더 만날 수 있어요!',
  },

  // 업로드 화면
  upload: {
    button: '뇽 보내기',
    verifying: '뇽 확인 중...',
    uploadButton: '보내기',
    tagPlaceholder: '태그 입력 (최대 20자)',
    historyTitle: '보낸 {name}',
    emptyHistory: '아직 보낸 뇽이 없어요',
    sortRecent: '최신순',
    sortHits: '뇽펀치순',
    hits: '{count}뇽펀치를 받았어요!',
    pendingDelivery: '내일 배달 예정이에요 🐾',
    greeting: '오늘도 귀여운 우리 뇽들을\n뽐내달라냥!',
    // 뇽 미등록 상태
    noNyongTitle: '{nickname}님의 뇽이를 등록하고 뇽파민을 나눠보세요!',
    noNyongDescription: '최초 뇽 등록 +10P, 사진 업로드 +1P\n30회 연속 업로드마다 추가 보너스\n명예의 전당에 등록되면 최대 +100P 지급',
    registerNyongButton: '뇽 ID 카드 등록하기',
    selectNyong: '누구를 보내볼까냥?',
    addNyong: '새 뇽 등록',
    pickPhoto: '오늘의 {name} 업로드',
    uploadSuccessMessage: '오늘의 뇽을 보냈어요! 내일 누군가에게 전달돼요 🐾',
    // 에러
    errorNotCat: '진짜 뇽(고양이) 사진만 보낼 수 있어요',
    errorUnsafeContent: '부적절한 사진이에요. 귀여운 뇽 사진만 올려주세요!',
    errorVerifyFailed: '뇽 확인에 실패했어요...',
    errorAlreadyUploaded: '오늘은 이미 보냈어요! 내일 또 만나요',
    errorUploadFailed: '뇽 보내기에 실패했어요...',
    errorSelectNyong: '누구를 보낼지 골라주세요!',
    matchSuccess: '{name} 맞다냥!',
    matchFail: '음... {name}이(가) 아닌 것 같아요',
    statUploads: '업로드',
    statPunches: '뇽펀치',
  },

  // 알림 화면 (뇽펀치)
  notification: {
    instruction: '뇽을 터치해서 뇽펀치!',
    punchLabel: '뇽펀치!',
    // 펀치 결과 메시지 (횟수별)
    resultLow: '살살 해달라냥...',
    resultMid: '좋아! 더 더!',
    resultHigh: '뇽파민 폭발!!',
    resultLegend: '전설의 집사 등장!!!',
    // Unlock (잠든 뇽)
    sleepingTitle: '시간이 지나 뇽이 잠들었어요...',
    sleepingEmoji: '💤',
    unlockButton: '광고 보고 오늘의 뇽 깨우기',
    // Extra (하나 더)
    extraButtonFree: '오늘의 뇽 하나 더 받기',
    extraButton: '광고보고 오늘의 뇽 하나 더 받기',
    extraRemaining: '남은 횟수: {remaining}/5',
    extraExhausted: '오늘의 뇽을 모두 만났어요!',
    extraPoolEmpty: '더 받을 뇽 사진이 없어요',
    finishButton: '내일 다시 만나기',
  },

  // 알림 배너
  banner: {
    title: '뇽! 뇽이 왔다냥!',
    subtitle: '터치해서 뇽펀치를 날려보세요',
  },

  // 온보딩 화면
  onboarding: {
    appName: 'Nyongpamine',
    appTagline: '',
    appDescription: '하루 한 번 귀여움 과다\n뇽파민 충전하고 가라냥!',
    googleLogin: 'Google로 시작하기',
    appleLogin: 'Apple로 시작하기',
    emailLogin: '이메일로 로그인',
    loginTitle: '로그인 / 회원가입',
    nicknameTitle: '닉네임을 알려주세요',
    nicknameDescription: '다른 뇽집사에게 보여질 이름이에요',
    nicknamePlaceholder: '닉네임',
    emailPlaceholder: '이메일',
    passwordPlaceholder: '비밀번호',
    loginButton: '로그인',
    signupButton: '회원가입',
    // 이메일 인증
    verifyTitle: '이메일 인증',
    verifyDescription: '{email}로 인증코드를 보냈어요',
    verifyPlaceholder: '인증코드 6자리',
    verifyButton: '인증하기',
    resendButton: '인증코드 재전송',
    resendCooldown: '{seconds}초 후 재전송 가능',
    // 알림
    signupSuccessTitle: '가입 완료!',
    signupSuccessMessage: '이메일 확인 후 로그인해주세요.',
    // 에러
    errorEmptyFields: '이메일과 비밀번호를 입력해주세요.',
    errorInvalidEmail: '올바른 이메일 형식을 입력해주세요.',
    errorInvalidPassword: '비밀번호는 숫자, 영문, 특수문자 중 2가지 이상 조합으로 5~20자여야 해요.',
    errorGoogleLogin: 'Google 로그인에 실패했어요.',
    errorAppleLogin: 'Apple 로그인에 실패했어요.',
    errorSignup: '회원가입에 실패했어요.',
    errorAlreadyRegistered: '이미 가입된 이메일이에요. 로그인해주세요.',
    errorLogin: '로그인에 실패했어요.',
    errorEmptyNickname: '닉네임을 입력해주세요.',
    errorInvalidNickname: '닉네임은 한글, 영문, 숫자만 사용할 수 있어요.',
    errorUserNotFound: '사용자를 찾을 수 없어요.',
    errorProfileSetup: '프로필 설정에 실패했어요.',
    errorInvalidOtp: '인증코드가 올바르지 않아요.',
    errorResendFailed: '재전송에 실패했어요.',
    privacyAgree: '개인정보처리방침에 동의합니다',
    privacyLink: '개인정보처리방침 보기',
    errorPrivacyRequired: '개인정보처리방침 및 이용약관에 동의해주세요.',
    termsAgree: '이용약관에 동의합니다',
    termsLink: '이용약관 보기',
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
    deleteAccount: '탈퇴하기',
    version: '뇽파민 v1.0.0',
    // 알림
    saveSuccess: '저장되었어요!',
    logoutTitle: '로그아웃',
    logoutMessage: '정말 나갈 거냥...?',
    deleteAccountTitle: '정말 탈퇴하시겠어요?',
    deleteAccountMessage: '뇽, 사진, 포인트 등 모든 데이터가 영구적으로 삭제됩니다.',
    deleteAccountConfirm: '탈퇴하기',
    deleteAccountError: '탈퇴 처리 중 오류가 발생했어요.',
    // 에러
    errorEmptyNickname: '닉네임을 입력해주세요.',
    errorSaveFailed: '저장에 실패했어요.',
    errorSessionExpired: '세션이 만료되었습니다. 다시 로그인해주세요.',
    bgmSection: '뇽파민 배경음악',
    bgmToggle: '앱 배경음악',
    bgmDescription: '뇽파민의 귀엽고 감미로운 노래들을 들어보세요',
    track1: '뇽파민',
    track2: '분홍빛 젤리',
    track3: '말랑한 꿈 조각',
  },

  // 푸시 알림
  push: {
    title: '{nickname}님, 오늘은 {nyongName}에게 간택당했다냥',
    body: '{nyongName}에게 뇽펀치 하러가기',
  },

  // 뇽 등록 (ID 카드)
  nyongRegister: {
    title: '뇽 등록하기',
    subtitle: '뇽을 등록해주세요! ID 카드를 만들어줄게요',
    nameLabel: '뇽 이름',
    namePlaceholder: '예: 나비, 치즈, 까미',
    frontPhotoLabel: '정면 사진 (필수)',
    frontPhotoDesc: '양쪽 눈이 보이는 정면 사진을 올려주세요',
    additionalPhotos: '추가 사진 (선택, 최대 4장)',
    additionalPhotosDesc: '여러 각도의 사진이 있으면 더 잘 알아볼 수 있어요',
    addPhoto: '사진 추가',
    analyzing: '뇽을 분석 중...',
    registerButton: '뇽 등록하기',
    registering: '등록 중...',
    // 성공
    successTitle: '등록 완료!',
    successMessage: '{name}의 ID 카드가 발급되었어요',
    // 에러
    errorNoName: '이름을 입력해주세요',
    errorNoPhoto: '정면 사진을 올려주세요',
    errorNotFrontFacing: '정면이 아니에요! 양쪽 눈이 보이는 사진으로 해주세요',
    errorNotCat: '이건 고양이가 아닌 것 같아요...',
    errorUnsafeContent: '부적절한 사진이에요. 귀여운 뇽 사진만 올려주세요!',
    errorRegisterFailed: '등록에 실패했어요',
    // 생일/성별
    birthdayLabel: '생일',
    birthdayPlaceholder: '뇽의 생일을 알려주세요 (몰라도 괜찮아요)',
    genderLabel: '성별',
    genderMale: '남아',
    genderFemale: '여아',
    genderUnknown: '모름',
    personalityLabel: '성격',
    personalityPlaceholder: '우리 뇽의 성격을 알려주세요 (최대 30자)',
    viewIdCard: 'ID 카드 보기',
    // 수정 모드
    editTitle: '뇽 수정하기',
    updateButton: '수정 완료',
    updating: '수정 중...',
    errorUpdateFailed: '수정에 실패했어요',
    // 포인트 프로모
    pointsBonus: '첫 뇽 등록 보너스가 적립되었어요!',
    pointsPromo: '첫 뇽 등록 +10P! 100P 모으면 프리미엄 차오츄르 교환권을 드려요!',
  },

  // 뇽 ID 카드
  idCard: {
    title: '뇽파민 ID 카드',
    subtitle: 'NYONGPAMINE ID CARD',
    nameLabel: '이름',
    birthdayLabel: '생일',
    genderLabel: '성별',
    personalityLabel: '성격',
    regDateLabel: '등록일',
    citizenNoLabel: 'ID 번호',
    genderMale: '남아',
    genderFemale: '여아',
    genderUnknown: '비공개',
    noBirthday: '미등록',
    noPersonality: '미등록',
    issuedBy: '뇽파민 ID 카드 발급국',
    doneButton: '완료',
    // 수정/삭제
    editButton: '수정',
    deleteButton: '삭제',
    deleteConfirmTitle: '정말 삭제할 거냥...?',
    deleteConfirmMessage: '{name}의 ID 카드가 영구 삭제돼요',
    deleteHasDeliveries: '이미 배달된 뇽이 있어서 삭제할 수 없어요',
    deleteSuccess: '{name}의 ID 카드가 삭제되었어요',
  },

  // 내 뇽 목록
  myNyongs: {
    title: '내 뇽',
    empty: '아직 아무도 없다냥...',
    registerFirst: '첫 번째 뇽을 등록해주세요!',
    totalHits: '누적 {count}뇽펀치',
    monthlyHits: '이번 달 {count}뇽펀치',
    uploads: '{count}번 업로드',
  },

  // 뇽 포인트
  points: {
    sectionTitle: '뇽 포인트',
    balance: '보유 포인트',
    currentPoints: '{count} P',
    description: '최초 뇽 등록 +10P, 사진 업로드 +1P\n30회 연속 업로드마다 추가 보너스!',
    rewardHighlight: '100P = 프리미엄 차오츄르 교환권!',
    redeemButton: '프리미엄 차오츄르 교환 (100P)',
    redeemTitle: '프리미엄 차오츄르 교환',
    redeemDescription: '100 포인트가 차감되며,\n입력하신 번호로 프리미엄 차오츄르\n기프티콘이 발송됩니다.',
    phonePlaceholder: '전화번호 (- 없이)',
    redeemSuccess: '교환 신청 완료! 곧 기프티콘을 보내드릴게요',
    errorNotEnough: '포인트가 부족해요 (100P 필요)',
    errorInvalidPhone: '올바른 전화번호를 입력해주세요',
    errorRedeemFailed: '교환에 실패했어요. 다시 시도해주세요.',
    // 마일스톤 보너스
    milestoneTitle: '마일스톤 달성!',
    milestoneMessage: '{count}번째 업로드 달성! +{bonus}P 보너스!',
  },

  // 명예의 전당
  hallOfFame: {
    title: '명예의 전당',
    subtitle: '이번 달 Top 5 뇽',
    rank: '{rank}위',
    monthlyHits: '{count}뇽펀치를 받았어요',
    viewGallery: '갤러리 보기',
    headerTitle: '{month}월 뇽파민 킹은 누구냥?',
    empty: '아직 아무도 없다냥...',
    // 랭킹 칭호
    rankTitle1: '뇽파민 킹',
    rankTitle2: '인기냥',
    rankTitle3: '귀여움 폭탄',
    rankTitleDefault: '떠오르는 스타냥',
    rewardLabel: '+{points}P',
    rewardInfo: '매월 1일 지난 달 명예의 전당 뇽으로 선정되신 분들께\n1등 200P, 2등 100P, 3등 50P, 4등 30P, 5등 10P를 드립니다.',
    filterDaily: '일간',
    filterWeekly: '주간',
    filterMonthly: '월간',
    headerTitleDaily: '오늘의 뇽파민 킹은 누구냥?',
    headerTitleWeekly: '이번 주 뇽파민 킹은 누구냥?',
  },

  // 업로드 달력
  calendar: {
    monthlyCount: '이번 달 {count}회 업로드',
    streakCount: '연속 {count}일 업로드 중',
    noStreak: '오늘 업로드하고 연속 기록을 시작하세요!',
    yearMonth: '{year}년 {month}월',
    sun: '일',
    mon: '월',
    tue: '화',
    wed: '수',
    thu: '목',
    fri: '금',
    sat: '토',
  },

  // 신고
  report: {
    title: '이 사진을 신고할까요?',
    inappropriate: '음란/선정적 콘텐츠',
    violence: '폭력적/혐오 콘텐츠',
    spam: '스팸/도배',
    other: '기타',
    otherPlaceholder: '신고 사유를 입력해주세요',
    success: '신고가 접수되었어요',
    error: '신고에 실패했어요. 다시 시도해주세요.',
  },
};

export type Translations = typeof ko;
