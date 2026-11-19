import { Drawer } from 'expo-router/drawer';
import { Icon } from 'react-native-paper';
import { Platform } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

const drawerIcon =
  (name) =>
  ({ color, size }) => <Icon source={name} color={color} size={size} />;

export default function TabsLayout() {
  const { palette } = useAppTheme();

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: Platform.OS === 'web' ? 'permanent' : 'front',
        drawerActiveTintColor: palette.primary,
        drawerInactiveTintColor: palette.muted,
        drawerStyle: {
          backgroundColor: palette.surface,
          borderRightColor: palette.border,
          borderRightWidth: 1,
          width: Platform.OS === 'web' ? 220 : undefined,
        },
        drawerLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
        },
      }}
    >
      <Drawer.Screen
        name="today"
        options={{
          title: 'Hoy',
          drawerIcon: drawerIcon('home-outline'),
        }}
      />
      <Drawer.Screen
        name="calendar"
        options={{
          title: 'Calendario',
          drawerIcon: drawerIcon('calendar-month-outline'),
        }}
      />
      <Drawer.Screen
        name="tasks"
        options={{
          title: 'Tareas',
          drawerIcon: drawerIcon('format-list-checks'),
        }}
      />
      <Drawer.Screen
        name="projects"
        options={{
          title: 'Proyectos',
          drawerIcon: drawerIcon('folder-star-outline'),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Perfil',
          drawerIcon: drawerIcon('account-outline'),
        }}
      />
    </Drawer>
  );
}
