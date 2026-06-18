import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import T from '@shared/theme';
import useAuthStore, { useIsAuthenticated } from '@core/di/stores/authStore';

// Feature screens
import LoginScreen from '@features/auth/presentation/screens/LoginScreen';
import RegisterScreen from '@features/auth/presentation/screens/RegisterScreen';
import TransactionListScreen from '@features/transactions/presentation/screens/TransactionListScreen';
import AddTransactionScreen from '@features/transactions/presentation/screens/AddTransactionScreen';
import ChatSessionListScreen from '@features/ai_chat/presentation/screens/ChatSessionListScreen';
import ChatScreen from '@features/ai_chat/presentation/screens/ChatScreen';

// ============================================================
// Param List Types
// ============================================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Transactions: undefined;
  Chat: undefined;
  Analytics: undefined;
};

export type TransactionStackParamList = {
  TransactionList: undefined;
  AddTransaction: undefined;
};

export type ChatStackParamList = {
  ChatSessionList: undefined;
  Chat: { sessionId: string };
};

// ============================================================
// Placeholder Screens
// ============================================================

function AnalyticsScreen(): React.JSX.Element {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.icon}>📊</Text>
      <Text style={placeholderStyles.title}>Analytics</Text>
      <Text style={placeholderStyles.subtitle}>Coming Soon</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.colors.background,
  },
  icon: {
    fontSize: 48,
    marginBottom: T.spacing.md,
  },
  title: {
    fontSize: T.fontSize.xxl,
    fontWeight: T.fontWeight.bold,
    color: T.colors.text,
    marginBottom: T.spacing.xs,
  },
  subtitle: {
    fontSize: T.fontSize.md,
    color: T.colors.textMuted,
  },
});

// ============================================================
// Auth Stack
// ============================================================

const AuthStackNav = createStackNavigator<AuthStackParamList>();

function AuthStack(): React.JSX.Element {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
    </AuthStackNav.Navigator>
  );
}

// ============================================================
// Transaction Stack
// ============================================================

const TransactionStackNav = createStackNavigator<TransactionStackParamList>();

function TransactionStack(): React.JSX.Element {
  return (
    <TransactionStackNav.Navigator screenOptions={{ headerShown: false }}>
      <TransactionStackNav.Screen
        name="TransactionList"
        component={TransactionListScreen}
      />
      <TransactionStackNav.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ presentation: 'modal' }}
      />
    </TransactionStackNav.Navigator>
  );
}

// ============================================================
// Chat Stack
// ============================================================

const ChatStackNav = createStackNavigator<ChatStackParamList>();

function ChatStack(): React.JSX.Element {
  return (
    <ChatStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ChatStackNav.Screen
        name="ChatSessionList"
        component={ChatSessionListScreen}
      />
      <ChatStackNav.Screen name="Chat" component={ChatScreen} />
    </ChatStackNav.Navigator>
  );
}

// ============================================================
// Main Tabs
// ============================================================

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.colors.primary,
        tabBarInactiveTintColor: T.colors.textMuted,
        tabBarStyle: tabStyles.tabBar,
        tabBarLabelStyle: tabStyles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Transactions"
        component={TransactionStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={focused ? tabStyles.iconActive : tabStyles.icon}>
              🏠
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          tabBarLabel: 'AI Chat',
          tabBarIcon: ({ focused }) => (
            <Text style={focused ? tabStyles.iconActive : tabStyles.icon}>
              💬
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={focused ? tabStyles.iconActive : tabStyles.icon}>
              📊
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: T.colors.background,
    borderTopColor: T.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: T.spacing.xs,
    height: 56,
  },
  tabLabel: {
    fontSize: T.fontSize.xs,
    fontWeight: T.fontWeight.medium,
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    fontSize: 20,
    opacity: 1,
  },
});

// ============================================================
// Root Navigator
// ============================================================

const RootStack = createStackNavigator<RootStackParamList>();

export default function AppNavigator(): React.JSX.Element {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={T.colors.primary} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthStack} />
      )}
    </RootStack.Navigator>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.colors.background,
  },
});
