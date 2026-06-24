import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import T from '@shared/theme';
import useAuthStore, { useIsAuthenticated } from '@core/di/stores/authStore';

// Feature screens
import LoginScreen from '@features/auth/presentation/screens/LoginScreen';
import RegisterScreen from '@features/auth/presentation/screens/RegisterScreen';
import TransactionListScreen from '@features/transactions/presentation/screens/TransactionListScreen';
import AddTransactionScreen from '@features/transactions/presentation/screens/AddTransactionScreen';
import ChatSessionListScreen from '@features/ai_chat/presentation/screens/ChatSessionListScreen';
import ChatScreen from '@features/ai_chat/presentation/screens/ChatScreen';
import AnalyticsScreen from '@features/analytics/presentation/screens/AnalyticsScreen';
import SettingsScreen from '@features/settings/presentation/screens/SettingsScreen';

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
  Settings: undefined;
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
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          tabBarLabel: 'AI Chat',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: T.colors.background,
    borderTopColor: 'rgba(0,0,0,0.06)',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingBottom: 6,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: T.fontWeight.semiBold,
    marginTop: 2,
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
