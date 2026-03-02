import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, Image } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { t } from '../../lib/i18n';

function GalleryIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={2} stroke={color} strokeWidth={2} />
      <Circle cx={8.5} cy={8.5} r={1.5} fill={color} />
      <Path d="M21 15l-5-5L5 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UploadIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 8l-5-5-5 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 3v12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CrownIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M2 17l2-11 5 5 3-7 3 7 5-5 2 11H2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 17h20v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}


function HeaderLeft() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}>
      <Image
        source={require('../../assets/nyong_paw.png')}
        style={{ width: 38, height: 38, marginRight: 0 }}
        resizeMode="contain"
      />
      <Image
        source={require('../../assets/nyongpamine.png')}
        style={{ width: 140, height: 32 }}
        resizeMode="contain"
      />
    </View>
  );
}

function HeaderRight({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <TouchableOpacity
      style={{ marginRight: 16 }}
      onPress={() => router.push('/settings')}
    >
      <Image
        source={require('../../assets/setting.png')}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t().tabs.gallery,
          headerTitle: '',
          tabBarIcon: ({ color }) => <GalleryIcon color={color} />,
          headerLeft: () => <HeaderLeft />,
          headerRight: () => <HeaderRight router={router} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: t().tabs.upload,
          headerTitle: '',
          tabBarIcon: ({ color }) => <UploadIcon color={color} />,
          headerLeft: () => <HeaderLeft />,
          headerRight: () => <HeaderRight router={router} />,
        }}
      />
      <Tabs.Screen
        name="hall-of-fame"
        options={{
          title: t().hallOfFame.title,
          headerTitle: '',
          tabBarIcon: ({ color }) => <CrownIcon color={color} />,
          headerLeft: () => <HeaderLeft />,
          headerRight: () => <HeaderRight router={router} />,
        }}
      />
    </Tabs>
  );
}
