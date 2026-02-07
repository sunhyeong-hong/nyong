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

  // Tab Navigation
  tabs: {
    gallery: 'Nyong Gallery',
    upload: 'Send Nyong',
  },

  // Gallery Screen
  gallery: {
    title: 'Nyong',
    emptyTitle: 'No Nyongs received yet',
    emptySubtitle: 'Nyong Punch when a Nyong arrives!',
    punchWithTag: 'Gave {count} punches to {tag}!',
    punchWithoutTag: 'Gave {count} punches!',
  },

  // Upload Screen
  upload: {
    button: 'Send Nyong',
    verifying: 'Checking Nyong...',
    uploadButton: 'Send',
    tagPlaceholder: 'Add tag (max 20 chars)',
    historyTitle: 'Sent Nyongs',
    emptyHistory: 'No Nyongs sent yet',
    sortRecent: 'Recent',
    sortHits: 'Punches',
    hits: '{count} punches received!',
    // Alerts
    deliverySuccessTitle: 'Nyong Delivered!',
    deliverySuccessMessage: 'Your Nyong has been sent to someone',
    deliveryPendingTitle: 'Nyong Waiting',
    deliveryPendingMessage: 'Looking for someone to receive your Nyong!',
    // Errors
    errorNotCat: 'Only real Nyong (cat) photos allowed',
    errorVerifyFailed: 'Failed to verify Nyong',
    errorAlreadyUploaded: 'Already sent a Nyong today! See you tomorrow',
    errorUploadFailed: 'Failed to send Nyong',
  },

  // Notification Screen (Punch)
  notification: {
    instruction: 'Touch the Nyong to Nyong Punch!',
    punchLabel: 'Nyong Punch!',
    // Unlock (Sleeping Nyong)
    sleepingTitle: 'The Nyong fell asleep',
    sleepingEmoji: '💤',
    unlockButton: 'Watch Ad to Wake Up',
    // Extra (One More)
    extraButton: 'Watch Ad for One More',
    extraRemaining: 'Remaining: {remaining}/5',
    extraExhausted: 'Used all extra Nyongs for today',
  },

  // Notification Banner
  banner: {
    title: 'Nyong! A Nyong is here!',
    subtitle: 'Touch to give Nyong Punch',
  },

  // Onboarding Screen
  onboarding: {
    appName: 'Nyong',
    appTagline: 'Random Nyong Alarm',
    appDescription: 'Once a day, at a random time,\na cute Nyong will visit you!',
    googleLogin: 'Continue with Google',
    emailLogin: 'Login with Email',
    loginTitle: 'Login / Sign Up',
    nicknameTitle: 'Set Nickname',
    nicknameDescription: 'This name will be shown to other Nyong Parents',
    nicknamePlaceholder: 'Nickname',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    loginButton: 'Login',
    signupButton: 'Sign Up',
    // Alerts
    signupSuccessTitle: 'Welcome!',
    signupSuccessMessage: 'Please check your email and login.',
    // Errors
    errorEmptyFields: 'Please enter email and password.',
    errorGoogleLogin: 'Google login failed.',
    errorSignup: 'Sign up failed.',
    errorLogin: 'Login failed.',
    errorEmptyNickname: 'Please enter a nickname.',
    errorUserNotFound: 'User not found.',
    errorProfileSetup: 'Failed to set up profile.',
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
    version: 'Nyong v1.0.0',
    // Alerts
    saveSuccess: 'Saved!',
    logoutTitle: 'Logout',
    logoutMessage: 'Are you sure you want to leave?',
    // Errors
    errorEmptyNickname: 'Please enter a nickname.',
    errorSaveFailed: 'Failed to save.',
  },

  // Push Notifications
  push: {
    title: 'Nyong! A Nyong is here!',
    body: 'Touch to give Nyong Punch',
  },
};
