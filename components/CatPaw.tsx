import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface CatPawProps {
  width?: number;
  height?: number;
  color?: string;
}

export function CatPaw({ width = 100, height = 100, color = '#FFB6C1' }: CatPawProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 100">
      {/* Main pad */}
      <Path
        d="M50 85 C30 85 15 70 15 55 C15 40 30 30 50 30 C70 30 85 40 85 55 C85 70 70 85 50 85"
        fill={color}
      />
      {/* Top left toe */}
      <Circle cx="25" cy="22" r="12" fill={color} />
      {/* Top right toe */}
      <Circle cx="75" cy="22" r="12" fill={color} />
      {/* Middle left toe */}
      <Circle cx="35" cy="15" r="10" fill={color} />
      {/* Middle right toe */}
      <Circle cx="65" cy="15" r="10" fill={color} />
    </Svg>
  );
}
