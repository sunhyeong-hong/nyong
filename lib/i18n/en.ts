// English
import { Translations } from './ko';

export const en: Translations = {
  // Common
  common: {
    cancel: 'Cancel',
    confirm: 'OK',
    save: 'Save',
    complete: 'Done',
    back: 'Back',
    error: 'Oops!',
    success: 'Success',
    loading: 'Loading',
  },

  // Nickname Setup
  nicknameSetup: {
    title: 'What should Nyongs call you?',
    subtitle: "This is the name Nyongs will use for you.\nYou can change it later in settings.",
    placeholder: 'Enter nickname (max 20 chars)',
    hint: 'Up to 20 characters, no special characters',
    button: 'Start Nyongpamine!',
  },

  // Tab Navigation
  tabs: {
    gallery: 'Nyong Gallery',
    upload: 'Send Nyong',
  },

  // Gallery Screen
  gallery: {
    title: 'Nyongpamine',
    emptyMessage: 'Nyongs will find their way to {nickname} soon.\nStay tuned to see which Nyong will choose you!',
    emptyNotifButton: 'Enable Notifications',
    punchWithTag: 'Gave {count} punches to {tag}!',
    punchWithoutTag: 'Gave {count} punches!',
    sortLatest: 'Latest',
    sortPunch: 'Punches',
    sortName: 'Name',
    groupOther: 'Other',
    groupPhotoCount: '{count} photos',
    nyongExtraButton: 'Get One More',
    nyongExtraButtonAd: 'Watch Ad for More {name}',
    nyongExtraExhausted: 'All done for today!',
    nyongExtraNoPhotos: 'No more {name} photos',
    nyongExtraTomorrow: 'See you tomorrow',
    nyongExtraGuide: 'You can meet your favorite nyong one more time a day!',
  },

  // Upload Screen
  upload: {
    button: 'Send Nyong',
    verifying: 'Checking Nyong...',
    uploadButton: 'Send',
    tagPlaceholder: 'Add tag (max 20 chars)',
    historyTitle: 'Sent {name}',
    emptyHistory: 'No Nyongs sent yet',
    sortRecent: 'Recent',
    sortHits: 'Punches',
    hits: 'Received {count} punches!',
    pendingDelivery: 'Delivery scheduled for tomorrow 🐾',
    greeting: 'Show off our cute Nyongs\ntoday, meow!',
    // No Nyong state
    noNyongTitle: "Register {nickname}'s Nyong and share the Nyongpamine!",
    noNyongDescription: 'First Nyong registration +10P, Photo upload +1P\nExtra bonus every 50 consecutive uploads.\nUp to +100P for Hall of Fame entry',
    registerNyongButton: 'Register Nyong ID Card',
    selectNyong: 'Who shall we send today, meow?',
    addNyong: 'New Nyong',
    pickPhoto: 'Upload today\'s {name}',
    uploadSuccessMessage: "Today's Nyong sent! It'll be delivered to someone tomorrow 🐾",
    // Errors
    errorNotCat: 'Only real Nyong (cat) photos allowed',
    errorUnsafeContent: 'Inappropriate photo detected. Please upload cute Nyong photos only!',
    errorVerifyFailed: 'Failed to verify Nyong...',
    errorAlreadyUploaded: 'Already sent today! See you tomorrow',
    errorUploadFailed: 'Failed to send Nyong...',
    errorSelectNyong: 'Pick who to send!',
    matchSuccess: 'That\'s {name}, meow!',
    matchFail: 'Hmm... that doesn\'t look like {name}',
    statUploads: 'Uploads',
    statPunches: 'Punches',
  },

  // Notification Screen (Punch)
  notification: {
    instruction: 'Touch the Nyong to Nyong Punch!',
    punchLabel: 'Nyong Punch!',
    // Punch result messages (by count)
    resultLow: 'Be gentle, meow...',
    resultMid: 'Nice! More more!',
    resultHigh: 'Nyongpamine explosion!!',
    resultLegend: 'A legendary hooman has appeared!!!',
    // Unlock (Sleeping Nyong)
    sleepingTitle: 'The Nyong fell asleep...',
    sleepingEmoji: '💤',
    unlockButton: 'Watch Ad to Wake Up Today\'s Nyong',
    // Extra (One More)
    extraButtonFree: 'Get One More Nyong',
    extraButton: 'Watch Ad for One More Nyong',
    extraRemaining: 'Remaining: {remaining}/5',
    extraExhausted: 'Met all the Nyongs for today!',
    extraPoolEmpty: 'No more Nyong photos available',
    finishButton: 'See you tomorrow',
  },

  // Notification Banner
  banner: {
    title: 'Nyong! A Nyong is here, meow!',
    subtitle: 'Touch to give a Nyong Punch',
  },

  // Onboarding Screen
  onboarding: {
    appName: 'Nyongpamine',
    appTagline: 'Random Nyong Alarm',
    appDescription: 'Once a day, at a random time,\na cute Nyong will visit you, meow!',
    googleLogin: 'Continue with Google',
    emailLogin: 'Login with Email',
    loginTitle: 'Login / Sign Up',
    nicknameTitle: 'Set your nickname',
    nicknameDescription: 'This name will be shown to other Nyong parents',
    nicknamePlaceholder: 'Nickname',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    loginButton: 'Login',
    signupButton: 'Sign Up',
    // Email Verification
    verifyTitle: 'Email Verification',
    verifyDescription: 'Verification code sent to {email}',
    verifyPlaceholder: '6-digit code',
    verifyButton: 'Verify',
    resendButton: 'Resend code',
    resendCooldown: 'Resend in {seconds}s',
    // Alerts
    signupSuccessTitle: 'Signed up!',
    signupSuccessMessage: 'Please check your email and login.',
    // Errors
    errorEmptyFields: 'Please enter email and password.',
    errorInvalidEmail: 'Please enter a valid email address.',
    errorInvalidPassword: 'Password must be 5-20 characters with at least 2 of: letters, numbers, special characters.',
    errorGoogleLogin: 'Google login failed.',
    errorSignup: 'Sign up failed.',
    errorAlreadyRegistered: 'This email is already registered. Please log in.',
    errorLogin: 'Login failed.',
    errorEmptyNickname: 'Please enter a nickname.',
    errorInvalidNickname: 'Nickname can only contain letters, numbers, and Korean characters.',
    errorUserNotFound: 'User not found.',
    errorProfileSetup: 'Failed to set up profile.',
    errorInvalidOtp: 'Invalid verification code.',
    errorResendFailed: 'Failed to resend code.',
    privacyAgree: 'I agree to the Privacy Policy',
    privacyLink: 'View Privacy Policy',
    errorPrivacyRequired: 'Please agree to the Privacy Policy.',
  },

  // Settings Screen
  settings: {
    profileSection: 'Profile',
    nicknameLabel: 'Nickname',
    nicknamePlaceholder: 'Enter nickname',
    alarmSection: 'Nyong Alarm Settings',
    exclusionToggle: 'Do Not Disturb',
    exclusionDescription: 'No Nyongs during these hours',
    startTime: 'Start',
    endTime: 'End',
    adminPage: 'Admin Page',
    logout: 'Logout',
    deleteAccount: 'Delete Account',
    version: 'Nyongpamine v1.0.0',
    // Alerts
    saveSuccess: 'Saved!',
    logoutTitle: 'Logout',
    logoutMessage: 'Really leaving, meow...?',
    deleteAccountTitle: 'Delete your account?',
    deleteAccountMessage: 'All data including Nyongs, photos, and points will be permanently deleted.',
    deleteAccountConfirm: 'Delete Account',
    deleteAccountError: 'An error occurred while deleting your account.',
    // Errors
    errorEmptyNickname: 'Please enter a nickname.',
    errorSaveFailed: 'Failed to save.',
    errorSessionExpired: 'Session expired. Please log in again.',
  },

  // Push Notifications
  push: {
    title: '{nickname}, you were chosen by {nyongName} today, meow!',
    body: 'Go Nyong Punch {nyongName}',
  },

  // Nyong Registration (ID Card)
  nyongRegister: {
    title: 'Register Nyong',
    subtitle: 'Register me! I\'ll make you an ID card',
    nameLabel: 'Nyong Name',
    namePlaceholder: 'e.g., Mochi, Cheddar, Shadow',
    frontPhotoLabel: 'Front Photo (Required)',
    frontPhotoDesc: 'Upload a front-facing photo with both eyes visible',
    additionalPhotos: 'Additional Photos (Optional, max 4)',
    additionalPhotosDesc: 'More angles help recognize better',
    addPhoto: 'Add Photo',
    analyzing: 'Analyzing Nyong...',
    registerButton: 'Register Nyong',
    registering: 'Registering...',
    // Success
    successTitle: 'Registered!',
    successMessage: '{name}\'s ID Card has been issued',
    // Errors
    errorNoName: 'Please enter a name',
    errorNoPhoto: 'Please upload a front photo',
    errorNotFrontFacing: 'Not front-facing! Show both eyes',
    errorNotCat: 'That doesn\'t look like a cat...',
    errorUnsafeContent: 'Inappropriate photo detected. Please upload cute Nyong photos only!',
    errorRegisterFailed: 'Registration failed',
    // Birthday/Gender
    birthdayLabel: 'Birthday',
    birthdayPlaceholder: 'When is your Nyong\'s birthday? (optional)',
    genderLabel: 'Gender',
    genderMale: 'Boy',
    genderFemale: 'Girl',
    genderUnknown: 'Unknown',
    personalityLabel: 'Personality',
    personalityPlaceholder: 'Describe your Nyong\'s personality (max 30 chars)',
    viewIdCard: 'View ID Card',
    // Edit mode
    editTitle: 'Edit Nyong',
    updateButton: 'Update',
    updating: 'Updating...',
    errorUpdateFailed: 'Failed to update',
    // Points promo
    pointsBonus: 'First Nyong registration bonus earned!',
    pointsPromo: 'First reg +10P! 100P = Premium Chao Churu!',
  },

  // Nyong Citizen Card
  idCard: {
    title: 'Nyongpamine Citizen Card',
    subtitle: 'NYONGPAMINE ID CARD',
    nameLabel: 'Name',
    birthdayLabel: 'Birthday',
    genderLabel: 'Gender',
    personalityLabel: 'Personality',
    regDateLabel: 'Registered',
    citizenNoLabel: 'Citizen No.',
    genderMale: 'Boy',
    genderFemale: 'Girl',
    genderUnknown: 'N/A',
    noBirthday: 'N/A',
    noPersonality: 'N/A',
    issuedBy: 'Nyongpamine Bureau of Citizenship',
    doneButton: 'Done',
    // Edit/Delete
    editButton: 'Edit',
    deleteButton: 'Delete',
    deleteConfirmTitle: 'Really delete?',
    deleteConfirmMessage: '{name}\'s ID Card will be permanently deleted',
    deleteHasDeliveries: 'Cannot delete: this Nyong has been delivered',
    deleteSuccess: '{name}\'s ID Card has been deleted',
  },

  // My Nyongs
  myNyongs: {
    title: 'My Nyongs',
    empty: 'Nobody here yet, meow...',
    registerFirst: 'Register your first Nyong!',
    totalHits: '{count} total punches',
    monthlyHits: '{count} punches this month',
    uploads: '{count} uploads',
  },

  // Nyong Points
  points: {
    sectionTitle: 'Nyong Points',
    balance: 'Balance',
    currentPoints: '{count} P',
    description: 'First Nyong +10P, Upload Photo +1P\nBonus every 50 uploads!',
    rewardHighlight: '100P = Premium Chao Churu Gifticon!',
    redeemButton: 'Redeem Premium Chao Churu (100P)',
    redeemTitle: 'Redeem Premium Chao Churu',
    redeemDescription: '100 points will be deducted.\nA Premium Chao Churu gifticon\nwill be sent to your number.',
    phonePlaceholder: 'Phone number',
    redeemSuccess: 'Redemption submitted! We\'ll send the gifticon soon',
    errorNotEnough: 'Not enough points (100P required)',
    errorInvalidPhone: 'Please enter a valid phone number',
    errorRedeemFailed: 'Redemption failed. Please try again.',
    // Milestone bonus
    milestoneTitle: 'Milestone!',
    milestoneMessage: '{count} uploads reached! +{bonus}P bonus!',
  },

  // Hall of Fame
  hallOfFame: {
    title: 'Hall of Fame',
    subtitle: 'Top 5 Nyongs This Month',
    rank: '#{rank}',
    monthlyHits: 'Received {count} punches',
    viewGallery: 'View Gallery',
    headerTitle: "Who's {month}'s Nyongpamine King?",
    empty: 'Nobody here yet, meow...',
    // Rank titles
    rankTitle1: 'Nyongpamine King',
    rankTitle2: 'Popular Nyong',
    rankTitle3: 'Cuteness Bomb',
    rankTitleDefault: 'Rising Star',
    rewardLabel: '+{points}P',
    rewardInfo: 'On the 1st of each month, last month\'s Hall of Fame winners receive\n1st 200P, 2nd 100P, 3rd 50P, 4th 30P, 5th 10P!',
    filterDaily: 'Daily',
    filterWeekly: 'Weekly',
    filterMonthly: 'Monthly',
    headerTitleDaily: "Who's today's Nyongpamine King?",
    headerTitleWeekly: "Who's this week's Nyongpamine King?",
  },

  // Upload Calendar
  calendar: {
    monthlyCount: '{count} uploads this month',
    yearMonth: '{month} {year}',
    sun: 'Sun',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
  },

  // Report
  report: {
    title: 'Report this photo?',
    inappropriate: 'Inappropriate/Sexual content',
    violence: 'Violent/Hateful content',
    spam: 'Spam',
    other: 'Other',
    otherPlaceholder: 'Please describe the issue',
    success: 'Report submitted',
    error: 'Failed to submit report. Please try again.',
  },
};
