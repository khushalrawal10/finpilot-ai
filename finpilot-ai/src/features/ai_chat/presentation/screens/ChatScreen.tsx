import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
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
import { Ionicons } from '@expo/vector-icons';

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
// Blinking cursor hook
// ============================================================

function useBlinkingCursor(active: boolean): boolean {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!active) { setShow(false); return; }
    const id = setInterval(() => setShow((v) => !v), 500);
    return () => clearInterval(id);
  }, [active]);

  return active && show;
}

// ============================================================
// Streaming dots (3-dot placeholder before first token)
// ============================================================

function StreamingDots(): React.JSX.Element {
  const anims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    const seq = Animated.loop(
      Animated.sequence(
        anims.map((a, i) =>
          Animated.sequence([
            Animated.delay(i * 150),
            Animated.timing(a, { toValue: 0.2, duration: 300, useNativeDriver: true, easing: Easing.ease }),
            Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.ease }),
          ]),
        ),
      ),
    );
    seq.start();
    return () => seq.stop();
  }, [anims]);

  return (
    <View style={dotsStyles.row}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[dotsStyles.dot, { opacity: a }]} />
      ))}
    </View>
  );
}

const dotsStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.colors.border,
  },
});

// ============================================================
// Message Bubble
// ============================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isStreamingMessage: boolean;
  streamingText: string;
  showCursor: boolean;
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  isStreamingMessage,
  streamingText,
  showCursor,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const displayText = isStreamingMessage ? streamingText : message.content;
  const timestamp = format(new Date(message.createdAt), 'h:mm a');

  if (isUser) {
    return (
      <View style={bubbleStyles.userWrapper}>
        <View style={bubbleStyles.userBubble}>
          <Text style={bubbleStyles.userText}>{displayText}</Text>
        </View>
        <Text style={bubbleStyles.userTimestamp}>{timestamp}</Text>
      </View>
    );
  }

  return (
    <View style={bubbleStyles.assistantWrapper}>
      <View style={bubbleStyles.avatar}>
        <Text style={bubbleStyles.avatarText}>FP</Text>
      </View>
      <View style={bubbleStyles.assistantContent}>
        <View style={bubbleStyles.assistantBubble}>
          {isStreamingMessage && !displayText ? (
            <StreamingDots />
          ) : (
            <Text style={bubbleStyles.assistantText}>
              {displayText || ''}
              {isStreamingMessage && showCursor ? (
                <Text style={bubbleStyles.cursor}>{'|'}</Text>
              ) : null}
            </Text>
          )}
        </View>
        <Text style={bubbleStyles.assistantTimestamp}>{timestamp}</Text>
      </View>
    </View>
  );
});

const bubbleStyles = StyleSheet.create({
  userWrapper: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  userBubble: {
    backgroundColor: T.colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  userTimestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    marginRight: 4,
  },
  assistantWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assistantContent: {
    maxWidth: '82%',
  },
  assistantBubble: {
    backgroundColor: T.colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantText: {
    fontSize: 15,
    color: T.colors.text,
    lineHeight: 22,
  },
  cursor: {
    color: T.colors.primary,
    fontWeight: '300',
  },
  assistantTimestamp: {
    fontSize: 11,
    color: T.colors.border,
    marginTop: 4,
    marginLeft: 4,
  },
});

// ============================================================
// Streaming status indicator (pulsing dot in header)
// ============================================================

function StreamingDot({ active }: { active: boolean }): React.JSX.Element {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [active, pulse]);

  return (
    <Animated.View
      style={[
        headerDotStyles.dot,
        { backgroundColor: active ? T.colors.primary : '#22C55E', opacity: pulse },
      ]}
    />
  );
}

const headerDotStyles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ============================================================
// ChatScreen
// ============================================================

export default function ChatScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<ChatRouteProp>();
  const { sessionId } = route.params;

  const { messages, isLoading: messagesLoading } = useMessages(sessionId);
  const { sendMessage, streamingText, isStreaming, sources, error } =
    useSendMessage(sessionId);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showCursor = useBlinkingCursor(isStreaming);

  // Build display list (inject streaming placeholder ONLY while actively streaming)
  const displayMessages = useMemo(() => {
    if (!isStreaming) return messages;

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

  // Generate follow-up suggestions based on last assistant message
  const followUpSuggestions = useMemo(() => {
    if (isStreaming || messages.length === 0) return [];
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return [];

    const content = lastMsg.content.toLowerCase();
    const suggestions: string[] = [];

    if (content.includes('spend') || content.includes('expense')) {
      suggestions.push('Break it down by category');
      suggestions.push('Compare with last month');
    } else if (content.includes('income')) {
      suggestions.push('What are my expenses?');
      suggestions.push('What\'s my net savings?');
    } else if (content.includes('categor')) {
      suggestions.push('Which category is highest?');
      suggestions.push('Show monthly trends');
    } else if (content.includes('transaction')) {
      suggestions.push('Summarize my spending');
      suggestions.push('Any unusual transactions?');
    }

    // Always add generic follow-ups if we don't have enough
    if (suggestions.length < 2) {
      suggestions.push('How much did I save this month?');
    }
    if (suggestions.length < 3) {
      suggestions.push('What\'s my biggest expense?');
    }

    return suggestions.slice(0, 3);
  }, [messages, isStreaming]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  useEffect(() => { scrollToBottom(); }, [displayMessages.length, scrollToBottom]);
  useEffect(() => { if (isStreaming) scrollToBottom(); }, [streamingText, isStreaming, scrollToBottom]);
  useEffect(() => () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); }, []);

  // Handlers
  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text ?? inputText).trim();
      if (!msg || isStreaming) return;
      setInputText('');
      void sendMessage(msg);
    },
    [inputText, isStreaming, sendMessage],
  );

  const handleBack = useCallback(() => { navigation.goBack(); }, [navigation]);

  // Title
  const title = useMemo(() => {
    if (messages.length === 0) return 'New Chat';
    const first = messages[0].content;
    return first.length > 24 ? first.slice(0, 24) + '…' : first;
  }, [messages]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isStreamingMsg = item.id === 'streaming-placeholder';
      return (
        <MessageBubble
          message={item}
          isStreamingMessage={isStreamingMsg}
          streamingText={isStreamingMsg ? streamingText : ''}
          showCursor={showCursor}
        />
      );
    },
    [streamingText, showCursor],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const canSend = Boolean(inputText.trim()) && !isStreaming;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <StreamingDot active={isStreaming} />
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
          !messagesLoading && messages.length === 0 && !isStreaming ? (
            <View style={styles.welcome}>
              <View style={styles.welcomeIconBox}>
                <Ionicons name="sparkles" size={28} color={T.colors.primary} />
              </View>
              <Text style={styles.welcomeTitle}>Hi! I'm FinPilot</Text>
              <Text style={styles.welcomeSub}>Ask me anything about your finances</Text>
            </View>
          ) : null
        }
      />

      {/* Error bar */}
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}


      {/* Suggested questions — initial or follow-up */}
      {!isStreaming && (messages.length === 0 || followUpSuggestions.length > 0) ? (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.tryAsking}>
            {messages.length === 0 ? 'Try asking:' : 'Follow up:'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {(messages.length === 0 ? SUGGESTED_QUESTIONS : followUpSuggestions).map((q) => (
              <Pressable
                key={q}
                style={({ pressed }) => [
                  styles.suggestionChip,
                  pressed ? styles.suggestionChipPressed : undefined,
                ]}
                onPress={() => handleSend(q)}
              >
                <Text style={styles.suggestionText}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your finances..."
          placeholderTextColor={T.colors.border}
          multiline
          maxLength={500}
          editable={!isStreaming}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
          blurOnSubmit
        />
        <Pressable
          style={[styles.sendButton, !canSend ? styles.sendButtonDisabled : undefined]}
          onPress={() => handleSend()}
          disabled={!canSend}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSend ? '#FFFFFF' : T.colors.border}
          />
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
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: T.colors.text,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: T.colors.textInverse,
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  welcome: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: T.spacing.xl,
  },
  welcomeIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: T.colors.text,
    marginTop: 16,
  },
  welcomeSub: {
    fontSize: 14,
    color: T.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  errorBar: {
    backgroundColor: T.colors.expenseLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: T.colors.error,
    textAlign: 'center',
  },
  sourcesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 52,
    marginBottom: 4,
    backgroundColor: T.colors.primaryLight,
    borderRadius: T.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sourcesText: {
    fontSize: 12,
    color: T.colors.primary,
    fontWeight: '600',
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
  tryAsking: {
    fontSize: 13,
    fontWeight: '600',
    color: T.colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  suggestionChip: {
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  suggestionChipPressed: {
    opacity: 0.7,
  },
  suggestionText: {
    fontSize: 13,
    color: T.colors.text,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: T.colors.background,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: T.colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: T.colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: T.colors.surface,
  },
});
