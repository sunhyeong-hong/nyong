// Ad Service
// 개발 모드에서는 광고 없이 즉시 성공 처리
// 프로덕션 빌드에서만 실제 광고 표시

export type AdType = 'unlock' | 'extra';

export interface AdResult {
  success: boolean;
  reward?: boolean;
}

/**
 * Show a rewarded ad
 * 개발 모드(__DEV__)에서는 즉시 성공 반환
 * 프로덕션에서는 실제 광고 SDK 호출
 */
export async function showRewardedAd(adType: AdType): Promise<AdResult> {
  // 개발 모드에서는 광고 스킵
  if (__DEV__) {
    console.log(`[Ad Service] DEV mode - skipping ${adType} ad`);
    return { success: true, reward: true };
  }

  // TODO: 프로덕션 빌드 시 실제 AdMob SDK 연동
  // import { AdMobRewarded } from 'expo-ads-admob';
  // await AdMobRewarded.setAdUnitID(AD_UNIT_ID);
  // await AdMobRewarded.requestAdAsync();
  // await AdMobRewarded.showAdAsync();

  console.log(`[Ad Service] Showing ${adType} ad...`);

  return new Promise((resolve) => {
    // 프로덕션 placeholder (실제 SDK 연동 전까지)
    setTimeout(() => {
      console.log(`[Ad Service] ${adType} ad completed`);
      resolve({ success: true, reward: true });
    }, 2000);
  });
}

/**
 * Check if ads are available
 */
export async function isAdAvailable(): Promise<boolean> {
  if (__DEV__) return false; // 개발 모드에서는 광고 없음
  return true;
}

/**
 * Preload ads for better user experience
 */
export function preloadAds(): void {
  if (__DEV__) return; // 개발 모드에서는 프리로드 안함
  console.log('[Ad Service] Preloading ads...');
}
