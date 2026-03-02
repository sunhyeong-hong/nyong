import React, { useRef } from 'react';
import { StyleSheet, View, ViewStyle, GestureResponderEvent } from 'react-native';
import { Image, ImageSource, ImageContentFit } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  source: ImageSource;
  style?: ViewStyle;
  contentFit?: ImageContentFit;
  onPinchActive?: (active: boolean) => void;
}

const RESET_CONFIG = { duration: 200, easing: Easing.out(Easing.ease) };

export function PinchableImage({ source, style, contentFit = 'contain', onPinchActive }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isPinching = useRef(false);

  const handleTouchStart = (e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length >= 2 && !isPinching.current) {
      isPinching.current = true;
      onPinchActive?.(true);
    }
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length < 2 && isPinching.current) {
      isPinching.current = false;
      onPinchActive?.(false);
    }
  };

  const resetPinch = () => {
    if (isPinching.current) {
      isPinching.current = false;
      onPinchActive?.(false);
    }
  };

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(4, savedScale.value * e.scale));
    })
    .onEnd(() => {
      scale.value = withTiming(1, RESET_CONFIG);
      translateX.value = withTiming(0, RESET_CONFIG);
      translateY.value = withTiming(0, RESET_CONFIG);
      resetPinch();
    })
    .onFinalize(() => {
      resetPinch();
    });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minPointers(2)
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      }
    })
    .onEnd(() => {
      translateX.value = withTiming(0, RESET_CONFIG);
      translateY.value = withTiming(0, RESET_CONFIG);
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <Image
            source={source}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
