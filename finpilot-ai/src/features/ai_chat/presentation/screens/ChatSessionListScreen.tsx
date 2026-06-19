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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import T from '@shared/theme';
import { EmptyState } from '@shared/components';
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
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
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
        {/* Icon */}
        <View style={cardStyles.iconContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={T.colors.primary} />
        </View>

        {/* Content */}
        <View style={cardStyles.content}>
          <View style={cardStyles.topRow}>
            <Text style={cardStyles.title} numberOfLines={1}>
              {session.title}
            </Text>
            <Text style={cardStyles.time}>{timeAgo}</Text>
          </View>
          <View style={cardStyles.bottomRow}>
            <View style={cardStyles.countBadge}>
              <Text style={cardStyles.countText}>
                {session.messageCount} message{session.messageCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.colors.border} />
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.background,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: T.colors.text,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: T.colors.textMuted,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 11,
    color: T.colors.textMuted,
    fontWeight: '500',
  },
  deleteAction: {
    backgroundColor: T.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 14,
    marginBottom: 8,
  },
});

// ============================================================
// ChatSessionListScreen
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
    (sessionId: string) => { navigation.navigate('Chat', { sessionId }); },
    [navigation],
  );

  const handleDelete = useCallback(
    (id: string) => { deleteMutation.mutate(id); },
    [deleteMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatSession }) => (
      <SessionCard session={item} onPress={handlePress} onDelete={handleDelete} />
    ),
    [handlePress, handleDelete],
  );

  const keyExtractor = useCallback((item: ChatSession) => item.id, []);

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
          style={({ pressed }) => [styles.newChatButton, pressed ? styles.newChatPressed : undefined]}
          onPress={handleNewChat}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.newChatText}> New Chat</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Hero card */}
      <LinearGradient
        colors={T.gradients.primaryCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroIconBox}>
          <Ionicons name="sparkles" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Ask anything about your money</Text>
          <Text style={styles.heroSub}>Food spending? Biggest expenses? Income trends?</Text>
        </View>
      </LinearGradient>

      {/* Session list */}
      {sessions.length === 0 ? (
        <EmptyState
          iconName="chatbubble-outline"
          title="No conversations yet"
          subtitle="Ask FinPilot about your spending, income, and financial trends"
          actionLabel="Start Chatting"
          onAction={handleNewChat}
        />
      ) : (
        <>
          <Text style={styles.sectionLabel}>Recent Chats</Text>
          <FlatList
            data={sessions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </>
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
    backgroundColor: T.colors.surface,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: T.colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: T.colors.text,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newChatPressed: {
    opacity: 0.8,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    margin: 16,
    padding: 20,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    marginLeft: 12,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 24,
  },
});
