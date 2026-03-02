import { NativeModules } from 'react-native';

export type AdType = 'unlock' | 'extra' | 'nyong_extra';

export interface AdResult {
  success: boolean;
  reward?: boolean;
}

// 네이티브 모듈 존재 여부 체크 (Expo Go에는 없음)
const hasNativeAds = !!NativeModules.RNGoogleMobileAdsModule;

function getAdsModule() {
  if (!hasNativeAds) return null;
  return require('react-native-google-mobile-ads');
}

function getAdUnitId(): string {
  const ads = getAdsModule();
  if (__DEV__ && ads?.TestIds) return ads.TestIds.REWARDED;
  return 'ca-app-pub-4591317861924477/8689212330';
}

/**
 * Show a rewarded ad and wait for completion
 * 네이티브 모듈 없으면 (Expo Go) 바로 성공 반환
 */
export async function showRewardedAd(_adType: AdType): Promise<AdResult> {
  const ads = getAdsModule();
  if (!ads) {
    return { success: true, reward: true };
  }

  const { RewardedAd, RewardedAdEventType, AdEventType } = ads;

  return new Promise((resolve) => {
    let resolved = false;
    const rewarded = RewardedAd.createForAdRequest(getAdUnitId(), {
      requestNonPersonalizedAdsOnly: false,
    });

    let opened = false;

    const cleanup = rewarded.addAdEventsListener(
      ({ type, payload }: { type: string; payload?: any }) => {
        console.log('[Ad Service] event:', type);

        if (type === RewardedAdEventType.LOADED) {
          rewarded.show().catch((e: any) => {
            console.error('[Ad Service] show error:', e);
            if (!resolved) {
              resolved = true;
              cleanup();
              resolve({ success: false, reward: false });
            }
          });
        } else if (type === AdEventType.OPENED) {
          opened = true;
        } else if (type === AdEventType.CLOSED) {
          // opened → closed = 광고 시청 완료로 간주
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({ success: true, reward: opened });
          }
        } else if (type === AdEventType.ERROR) {
          console.error('[Ad Service] error:', payload);
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({ success: true, reward: true }); // 광고 로드 실패 시 사용자 불이익 방지
          }
        }
      }
    );

    rewarded.load();
  });
}

export async function isAdAvailable(): Promise<boolean> {
  return hasNativeAds;
}

export function preloadAds(): void {}
