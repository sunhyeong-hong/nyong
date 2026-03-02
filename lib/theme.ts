export const colors = {
  primary: '#F06292',
  primaryDark: '#E04578',
  primaryLight: '#FCE4EC',
  primaryBg: '#FFF0F3',
  background: '#FFF8F9',
  white: '#FFFFFF',
  cream: '#FFF0EB',
  surface: '#FFF5F5',
  text: '#4A3636',
  textSecondary: '#7A6565',
  textTertiary: '#A08E8E',
  textMuted: '#B8A8A8',
  textDisabled: '#D4C8C8',
  border: '#F0E0E0',
  inputBg: '#FFF5F2',
  success: '#7BC67E',
  inactive: '#B8A8A8',
  overlay: 'rgba(0, 0, 0, 0.9)',
  overlayMedium: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayDim: 'rgba(0, 0, 0, 0.5)',
  resultOverlay: 'rgba(255, 249, 247, 0.98)',
  shadow: '#C0A0A0',
  switchTrackOff: '#E8D8D8',
  switchThumbOff: '#F4F3F4',
  filterBg: '#FFF0EB',
  adminButton: '#4A3636',
  errorLight: '#FFEBEE',
  placeholder: '#F0F0F0',
  rankGold: '#FFD700',
  rankSilver: '#C0C0C0',
  rankBronze: '#CD7F32',
  testButton: '#4CAF50',
  fullscreenBg: '#000000',
  toastBg: 'rgba(60, 40, 40, 0.88)',
  whiteTranslucent: 'rgba(255, 255, 255, 0.8)',
  whiteOverlay: 'rgba(255, 255, 255, 0.3)',
  whiteSubtle: 'rgba(255, 255, 255, 0.9)',
  primaryHighlight: 'rgba(236, 72, 153, 0.08)',
};

export const gradient = {
  primary: ['#FF6B9D', '#FFB347'] as const,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30,
  xxxl: 40,
};

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}
