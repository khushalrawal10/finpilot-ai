import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';

import T from '@shared/theme';
import type { ChatStackParamList } from '@navigation/AppNavigator';
import {
  useMessages,
  useSendMessage,
  ChatMessage,
} from '@features/ai_chat/presentation/hooks/useChat';

// ============================================================
// Types
// ============================================================

type ChatRouteProp = RouteProp<ChatStackParamList, 'Chat'>;

const SUGGESTED_QUESTIONS = [
  'How much did I spend this month?',
  'What are my biggest expenses?',
  'Show my food spending',
  'How much income this month?',
];

// ============================================================
// Blinking Cursor Hook
// ============================================================

function useBlinkingCursor(active: boolean): string {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [active]);

  return active && visible ? '|' : '';
}

// ============================================================
// Message Bubble
// ============================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isStreamingMessage: boolean;
  streamingText: string;
  cursor: string;
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  isStreamingMessage,
  streamingText,
  cursor,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const displayText = isStreamingMessage ? streamingText + cursor : message.content;
  const timestamp = format(new Date(message.createdAt), 'h:mm a');

  return (
    <View
      style={[
        bubbleStyles.row,
        isUser ? bubbleStyles.rowUser : bubbleStyles.rowAssistant,
      ]}
    >
      <View
        style={[
          bubbleStyles.bubble,
          isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAssistant,
        ]}
      >
        <Text
          style={[
            bubbleStyles.text,
            isUser ? bubbleStyles.textUser : bubbleStyles.textAssistant,
          ]}
        >
          {displayText || (isStreamingMessage ? '...' : '')}
        </Text>
      </View>
      <Text
        style={[
          bubbleStyles.timestamp,
          isUser ? bubbleStyles.timestampUser : bubbleStyles.timestampAssistant,
        ]}
      >
        {timestamp}
      </Text>
    </View>
  );
});

const bubbleStyles = StyleSheet.create({
  row: {
    marginBottom: T.spacing.sm,
    paddingHorizontal: T.spacing.md,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: T.radius.lg,
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm + 2,
  },
  bubbleUser: {
    backgroundColor: T.colors.primary,
    borderBottomRightRadius: T.radius.sm,
  },
  bubbleAssistant: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: T.radius.sm,
  },
  text: {
    fontSize: T.fontSize.md,
    lineHeight: 22,
  },
  textUser: {
    color: '#FFFFFF',
  },
  textAssistant: {
    color: T.colors.text,
  },
  timestamp: {
    fontSize: T.fontSize.xs - 1,
    color: T.colors.textMuted,
    marginTop: 2,
  },
  timestampUser: {
    marginRight: 4,
  },
  timestampAssistant: {
    marginLeft: 4,
  },
});

// ============================================================
// Suggestion Chip
// ============================================================

interface SuggestionChipProps {
  text: string;
  onPress: (text: string) => void;
}

const SuggestionChip = React.memo(function SuggestionChip({
  text,
  onPress,
}: SuggestionChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        chipStyles.chip,
        pressed ? chipStyles.chipPressed : undefined,
      ]}
      onPress={() => onPress(text)}
    >
      <Text style={chipStyles.chipText}>{text}</Text>
    </Pressable>
  );
});

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: '#E8F4FD',
    borderRadius: T.radius.full,
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm,
    marginRight: T.spacing.sm,
    borderWidth: 1,
    borderColor: T.colors.primary + '30',
  },
  chipPressed: {
    backgroundColor: T.colors.primary + '20',
  },
  chipText: {
    fontSize: T.fontSize.sm,
    color: T.colors.primary,
    fontWeight: T.fontWeight.medium,
  },
});

// ============================================================
// Chat Screen
// ============================================================

export default function ChatScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<ChatRouteProp>();
  const { sessionId } = route.params;

  const { messages, isLoading: messagesLoading } = useMessages(sessionId);
  const { sendMessage, streamingText, isStreaming, sources } =
    useSendMessage(sessionId);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursor = useBlinkingCursor(isStreaming);

  // ----------------------------------------------------------
  // Build display messages (append streaming placeholder)
  // ----------------------------------------------------------

  const displayMessages = useMemo(() => {
    if (!isStreaming || !streamingText) return messages;

    const streamingMsg: ChatMessage = {
      id: 'streaming-placeholder',
      sessionId,
      role: 'assistant',
      content: streamingText,
      sourceTransactionIds: [],
      createdAt: new Date().toISOString(),
    };

    return [...messages, streamingMsg];
  }, [messages, isStreaming, streamingText, sessionId]);

  // ----------------------------------------------------------
  // Auto-scroll
  // ----------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, scrollToBottom]);

  // Scroll during streaming (debounced)
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [streamingText, isStreaming, scrollToBottom]);

  // Cleanup scroll timer
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const handleSend = useCallback(
    (text?: string) => {
      const messageText = (text ?? inputText).trim();
      if (!messageText || isStreaming) return;

      setInputText('');
      void sendMessage(messageText);
    },
    [inputText, isStreaming, sendMessage],
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ----------------------------------------------------------
  // Render message
  // ----------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isStreamingMsg = item.id === 'streaming-placeholder';
      return (
        <MessageBubble
          message={item}
          isStreamingMessage={isStreamingMsg}
          streamingText={isStreamingMsg ? streamingText : ''}
          cursor={isStreamingMsg ? cursor : ''}
        />
      );
    },
    [streamingText, cursor],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // ----------------------------------------------------------
  // Title
  // ----------------------------------------------------------

  const title = useMemo(() => {
    const raw = messages.length > 0
      ? messages[0].content.slice(0, 20) + (messages[0].content.length > 20 ? '...' : '')
      : 'New Chat';
    return raw;
  }, [messages]);

  // ----------------------------------------------------------
  // Sources bar
  // ----------------------------------------------------------

  const showSources = !isStreaming && sources.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerRight}>
          {isStreaming && (
            <Text style={styles.streamingLabel}>Thinking...</Text>
          )}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        ListHeaderComponent={
          !messagesLoading && messages.length === 0 ? (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeIcon}>🤖</Text>
              <Text style={styles.welcomeTitle}>
                Hi! I&apos;m FinPilot
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Ask me anything about your finances
              </Text>
            </View>
          ) : null
        }
      />

      {/* Sources bar */}
      {showSources && (
        <View style={styles.sourcesBar}>
          <Text style={styles.sourcesText}>
            📎 Based on {sources.length} transaction
            {sources.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Suggestion chips (only when empty) */}
      {messages.length === 0 && !isStreaming && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {SUGGESTED_QUESTIONS.map((q) => (
              <SuggestionChip key={q} text={q} onPress={handleSuggestion} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your finances..."
          placeholderTextColor={T.colors.textMuted}
          multiline
          maxLength={500}
          editable={!isStreaming}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
          blurOnSubmit
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (!inputText.trim() || isStreaming)
              ? styles.sendButtonDisabled
              : undefined,
            pressed && inputText.trim() && !isStreaming
              ? styles.sendButtonPressed
              : undefined,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isStreaming}
        >
          <Text
            style={[
              styles.sendIcon,
              (!inputText.trim() || isStreaming)
                ? styles.sendIconDisabled
                : undefined,
            ]}
          >
            ↑
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: T.spacing.sm,
    paddingTop: T.spacing.xxl,
    paddingBottom: T.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.colors.border,
    backgroundColor: T.colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 32,
    color: T.colors.primary,
    lineHeight: 36,
  },
  headerTitle: {
    flex: 1,
    fontSize: T.fontSize.lg,
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.text,
    textAlign: 'center',
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: T.spacing.sm,
  },
  streamingLabel: {
    fontSize: T.fontSize.xs,
    color: T.colors.primary,
    fontWeight: T.fontWeight.medium,
  },
  messageList: {
    paddingVertical: T.spacing.md,
    flexGrow: 1,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: T.spacing.xxl * 2,
    paddingHorizontal: T.spacing.xl,
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: T.spacing.md,
  },
  welcomeTitle: {
    fontSize: T.fontSize.xxl,
    fontWeight: T.fontWeight.bold,
    color: T.colors.text,
    marginBottom: T.spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: T.fontSize.md,
    color: T.colors.textMuted,
    textAlign: 'center',
  },
  sourcesBar: {
    paddingHorizontal: T.spacing.lg,
    paddingVertical: T.spacing.sm,
    backgroundColor: '#F8F9FA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.border,
  },
  sourcesText: {
    fontSize: T.fontSize.sm,
    color: T.colors.textMuted,
    fontWeight: T.fontWeight.medium,
  },
  suggestionsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.border,
    paddingVertical: T.spacing.sm,
  },
  suggestionsScroll: {
    paddingHorizontal: T.spacing.md,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.border,
    backgroundColor: T.colors.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.lg,
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm + 2,
    fontSize: T.fontSize.md,
    color: T.colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: T.radius.full,
    backgroundColor: T.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: T.spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: T.colors.surface,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendIcon: {
    fontSize: T.fontSize.lg,
    fontWeight: T.fontWeight.bold,
    color: '#FFFFFF',
  },
  sendIconDisabled: {
    color: T.colors.textMuted,
  },
});
