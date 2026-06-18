import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { formatDistanceToNow } from 'date-fns';

import T from '@shared/theme';
import type { ChatStackParamList } from '@navigation/AppNavigator';
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  ChatSession,
} from '@features/ai_chat/presentation/hooks/useChat';

// ============================================================
// Navigation type
// ============================================================

type NavProp = StackNavigationProp<ChatStackParamList, 'ChatSessionList'>;

// ============================================================
// Session Card
// ============================================================

interface SessionCardProps {
  session: ChatSession;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
}

const SessionCard = React.memo(function SessionCard({
  session,
  onPress,
  onDelete,
}: SessionCardProps) {
  const timeAgo = session.lastMessageAt
    ? formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })
    : 'No messages yet';

  const renderRightActions = useCallback(
    () => (
      <Pressable
        style={cardStyles.deleteAction}
        onPress={() => onDelete(session.id)}
      >
        <Text style={cardStyles.deleteText}>Delete</Text>
      </Pressable>
    ),
    [onDelete, session.id],
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        style={({ pressed }) => [
          cardStyles.container,
          pressed ? cardStyles.pressed : undefined,
        ]}
        onPress={() => onPress(session.id)}
      >
        <View style={cardStyles.iconContainer}>
          <Text style={cardStyles.icon}>💬</Text>
        </View>

        <View style={cardStyles.content}>
          <Text style={cardStyles.title} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={cardStyles.time}>{timeAgo}</Text>
        </View>

        {session.messageCount > 0 && (
          <View style={cardStyles.badge}>
            <Text style={cardStyles.badgeText}>{session.messageCount}</Text>
          </View>
        )}

        <Text style={cardStyles.chevron}>›</Text>
      </Pressable>
    </Swipeable>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.background,
    paddingVertical: T.spacing.md,
    paddingHorizontal: T.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.colors.border,
  },
  pressed: {
    backgroundColor: T.colors.surface,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: T.radius.md,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: T.spacing.md,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginRight: T.spacing.sm,
  },
  title: {
    fontSize: T.fontSize.md,
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.text,
    marginBottom: 2,
  },
  time: {
    fontSize: T.fontSize.xs,
    color: T.colors.textMuted,
  },
  badge: {
    backgroundColor: T.colors.primary,
    borderRadius: T.radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: T.spacing.sm,
  },
  badgeText: {
    fontSize: T.fontSize.xs,
    fontWeight: T.fontWeight.bold,
    color: '#FFFFFF',
  },
  chevron: {
    fontSize: T.fontSize.xl,
    color: T.colors.textMuted,
  },
  deleteAction: {
    backgroundColor: T.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: T.fontSize.sm,
    fontWeight: T.fontWeight.semiBold,
  },
});

// ============================================================
// Chat Session List Screen
// ============================================================

export default function ChatSessionListScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { sessions, isLoading } = useSessions();
  const createMutation = useCreateSession();
  const deleteMutation = useDeleteSession();

  const handleNewChat = useCallback(async () => {
    const newSession = await createMutation.mutateAsync();
    navigation.navigate('Chat', { sessionId: newSession.id });
  }, [createMutation, navigation]);

  const handlePress = useCallback(
    (sessionId: string) => {
      navigation.navigate('Chat', { sessionId });
    },
    [navigation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatSession }) => (
      <SessionCard
        session={item}
        onPress={handlePress}
        onDelete={handleDelete}
      />
    ),
    [handlePress, handleDelete],
  );

  const keyExtractor = useCallback((item: ChatSession) => item.id, []);

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  if (isLoading && sessions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FinPilot AI</Text>
        <Pressable
          style={({ pressed }) => [
            styles.newChatButton,
            pressed ? styles.newChatPressed : undefined,
          ]}
          onPress={handleNewChat}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.newChatText}>+ New Chat</Text>
          )}
        </Pressable>
      </View>

      {/* List or Empty State */}
      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>Ask FinPilot anything</Text>
          <Text style={styles.emptySubtitle}>
            How much did I spend on food this month?{'\n'}
            What are my biggest expenses?
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyAction,
              pressed ? styles.emptyActionPressed : undefined,
            ]}
            onPress={handleNewChat}
          >
            <Text style={styles.emptyActionText}>Start a Conversation</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
        />
      )}
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: T.spacing.lg,
    paddingTop: T.spacing.xxl,
    paddingBottom: T.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.colors.border,
  },
  headerTitle: {
    fontSize: T.fontSize.xxl,
    fontWeight: T.fontWeight.bold,
    color: T.colors.text,
  },
  newChatButton: {
    backgroundColor: T.colors.primary,
    borderRadius: T.radius.full,
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm,
  },
  newChatPressed: {
    opacity: 0.8,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: T.fontSize.sm,
    fontWeight: T.fontWeight.semiBold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: T.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: T.spacing.lg,
  },
  emptyTitle: {
    fontSize: T.fontSize.xxl,
    fontWeight: T.fontWeight.bold,
    color: T.colors.text,
    marginBottom: T.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: T.fontSize.md,
    color: T.colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: T.spacing.xl,
  },
  emptyAction: {
    backgroundColor: T.colors.primary,
    borderRadius: T.radius.full,
    paddingHorizontal: T.spacing.xl,
    paddingVertical: T.spacing.md,
  },
  emptyActionPressed: {
    opacity: 0.8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: T.fontSize.md,
    fontWeight: T.fontWeight.semiBold,
  },
});
