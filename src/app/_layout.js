import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { LocalStorageProvider } from '../data/database';
import { ThemeProvider, useAppTheme } from '../theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

function NavigationShell() {
  const { theme, isDark } = useAppTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <PaperProvider
      theme={theme}
      settings={{
        icon: (props) => <MaterialCommunityIcons {...props} />,
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <LocalStorageProvider>
      <ThemeProvider>
        <NavigationShell />
      </ThemeProvider>
    </LocalStorageProvider>
  );
}
