import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BGM_PREF_KEY = 'nyong_app_bgm_enabled';
const BGM_PROMO_SEEN_KEY = 'nyong_bgm_promo_seen';
const BGM_ENABLED_TRACKS_KEY = 'nyong_bgm_enabled_tracks';

export const PLAYLIST = [
  { source: require('../assets/nyongpamine_song1.mp3'), titleKey: 'track1' as const, duration: '1:38' },
  { source: require('../assets/nyongpamine_bgm2.mp3'), titleKey: 'track2' as const, duration: '3:04' },
  { source: require('../assets/nyongpamine_bgm3.mp3'), titleKey: 'track3' as const, duration: '2:40' },
];

const ALL_ENABLED = [true, true, true];

interface BgmContextType {
  isBgmOn: boolean;
  setBgmOn: (on: boolean) => Promise<void>;
  pauseBgm: () => void;
  resumeBgm: () => void;
  showPromo: boolean;
  dismissPromo: () => void;
  currentTrackIndex: number;
  enabledTracks: boolean[];
  toggleTrack: (index: number) => void;
  selectTrack: (index: number) => void;
}

const BgmContext = createContext<BgmContextType | undefined>(undefined);

export function useBgm() {
  const ctx = useContext(BgmContext);
  if (!ctx) throw new Error('useBgm must be used within BgmProvider');
  return ctx;
}

export function BgmProvider({ children }: { children: ReactNode }) {
  const [isBgmOn, setIsBgmOn] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [enabledTracks, setEnabledTracks] = useState<boolean[]>(ALL_ENABLED);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPausedByScreen = useRef(false);
  const isPausedByBackground = useRef(false);
  const isPlayingRef = useRef(false);
  const trackIndexRef = useRef(0);
  const enabledTracksRef = useRef<boolean[]>(ALL_ENABLED);
  const mountedRef = useRef(true);

  const getNextEnabledIndex = (fromIndex: number): number => {
    const enabled = enabledTracksRef.current;
    for (let i = 1; i <= PLAYLIST.length; i++) {
      const idx = (fromIndex + i) % PLAYLIST.length;
      if (enabled[idx]) return idx;
    }
    return fromIndex;
  };

  const getFirstEnabledIndex = (): number => {
    const idx = enabledTracksRef.current.indexOf(true);
    return idx >= 0 ? idx : 0;
  };

  const loadAndPlayTrack = async (index: number, shouldPlay: boolean) => {
    await soundRef.current?.unloadAsync();
    soundRef.current = null;
    trackIndexRef.current = index;
    setCurrentTrackIndex(index);

    const { sound } = await Audio.Sound.createAsync(
      PLAYLIST[index].source,
      { shouldPlay, isLooping: false, volume: 0.4 }
    );
    if (!mountedRef.current) {
      sound.unloadAsync();
      return;
    }
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        const nextIndex = getNextEnabledIndex(trackIndexRef.current);
        loadAndPlayTrack(nextIndex, true).catch(() => {});
      }
    });
    soundRef.current = sound;
    isPlayingRef.current = shouldPlay;
  };

  // Load preference and sound
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const [saved, savedTracks] = await Promise.all([
          AsyncStorage.getItem(BGM_PREF_KEY),
          AsyncStorage.getItem(BGM_ENABLED_TRACKS_KEY),
        ]);
        const enabled = saved === null ? false : saved === 'true';
        if (!mountedRef.current) return;

        if (savedTracks) {
          try {
            const parsed = JSON.parse(savedTracks);
            if (Array.isArray(parsed) && parsed.some(Boolean)) {
              setEnabledTracks(parsed);
              enabledTracksRef.current = parsed;
            }
          } catch (_) {}
        }

        setIsBgmOn(enabled);

        // BGM OFF인 유저에게 프로모 배너 (하루 1회)
        if (!enabled) {
          const lastSeen = await AsyncStorage.getItem(BGM_PROMO_SEEN_KEY);
          const today = new Date().toISOString().slice(0, 10);
          if (lastSeen !== today && mountedRef.current) {
            setShowPromo(true);
            await AsyncStorage.setItem(BGM_PROMO_SEEN_KEY, today);
          }
        }

        if (!enabled) return;

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false });
        await loadAndPlayTrack(getFirstEnabledIndex(), true);
      } catch (_) {}
    };

    init();
    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  // AppState: pause on background, resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!isBgmOn || !soundRef.current) return;
      if (state === 'background' || state === 'inactive') {
        isPausedByBackground.current = true;
        soundRef.current.pauseAsync().catch(() => {});
        isPlayingRef.current = false;
      } else if (state === 'active' && isPausedByBackground.current) {
        isPausedByBackground.current = false;
        if (!isPausedByScreen.current) {
          soundRef.current.playAsync().catch(() => {});
          isPlayingRef.current = true;
        }
      }
    });
    return () => sub.remove();
  }, [isBgmOn]);

  const setBgmOn = async (on: boolean) => {
    setIsBgmOn(on);
    await AsyncStorage.setItem(BGM_PREF_KEY, String(on));
    if (on) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false });
        await loadAndPlayTrack(getFirstEnabledIndex(), !isPausedByScreen.current);
      } catch (_) {}
    } else {
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      isPlayingRef.current = false;
    }
  };

  const pauseBgm = () => {
    isPausedByScreen.current = true;
    if (soundRef.current && isPlayingRef.current) {
      soundRef.current.pauseAsync().catch(() => {});
      isPlayingRef.current = false;
    }
  };

  const resumeBgm = () => {
    isPausedByScreen.current = false;
    if (isBgmOn && soundRef.current && !isPausedByBackground.current) {
      soundRef.current.playAsync().catch(() => {});
      isPlayingRef.current = true;
    }
  };

  const toggleTrack = (index: number) => {
    const next = [...enabledTracksRef.current];
    // 최소 1곡은 활성화
    if (next[index] && next.filter(Boolean).length <= 1) return;
    next[index] = !next[index];
    setEnabledTracks(next);
    enabledTracksRef.current = next;
    AsyncStorage.setItem(BGM_ENABLED_TRACKS_KEY, JSON.stringify(next));

    // 현재 재생 중인 곡이 비활성화되면 다음 곡으로 이동
    if (!next[index] && isBgmOn && trackIndexRef.current === index) {
      const nextIdx = getNextEnabledIndex(index);
      loadAndPlayTrack(nextIdx, !isPausedByScreen.current).catch(() => {});
    }
  };

  const selectTrack = (index: number) => {
    if (isBgmOn) {
      loadAndPlayTrack(index, !isPausedByScreen.current).catch(() => {});
    }
  };

  const dismissPromo = () => setShowPromo(false);

  return (
    <BgmContext.Provider value={{ isBgmOn, setBgmOn, pauseBgm, resumeBgm, showPromo, dismissPromo, currentTrackIndex, enabledTracks, toggleTrack, selectTrack }}>
      {children}
    </BgmContext.Provider>
  );
}
