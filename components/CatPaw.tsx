import React from 'react';
import { Image } from 'react-native';

interface CatPawProps {
  width?: number;
  height?: number;
}

export function CatPaw({ width = 100, height = 100 }: CatPawProps) {
  return (
    <Image
      source={require('../assets/cat-paw.png')}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}
