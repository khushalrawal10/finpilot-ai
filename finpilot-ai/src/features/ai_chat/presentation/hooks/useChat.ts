import { useCallback, useRef, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { supabase } from '@core/network/supabase-client';
import { useAuthUser } from '@core/di/stores/authStore';
import { DataError } from '@core/types/errors';

// ============================================================
// Types
// ============================================================

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sourceTransactionIds: string[];
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

// ============================================================
// Internal row types
// ============================================================

interface SessionRow {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  source_transaction_ids: string[] | null;
  created_at: string;
}

// ============================================================
// Repository functions
// ============================================================

async function getSessions(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) {
    throw new DataError(error.message, 'FETCH_SESSIONS_FAILED');
  }

  return (data as SessionRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
  }));
}

async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .neq('role', 'system')
    .order('created_at', { ascending: true });

  if (error) {
    throw new DataError(error.message, 'FETCH_MESSAGES_FAILED');
  }

  return (data as MessageRow[]).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    sourceTransactionIds: row.source_transaction_ids ?? [],
    createdAt: row.created_at,
  }));
}

async function createSession(userId: string): Promise<ChatSession> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title: 'New Chat',
    })
    .select('*')
    .single<SessionRow>();

  if (error || !data) {
    throw new DataError(
      error?.message ?? 'Failed to create session',
      'CREATE_SESSION_FAILED',
    );
  }

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    messageCount: data.message_count,
    lastMessageAt: data.last_message_at,
    createdAt: data.created_at,
  };
}

async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  sourceIds?: string[],
): Promise<void> {
  const { error: msgError } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role,
    content,
    source_transaction_ids: sourceIds ?? [],
  });

  if (msgError) {
    throw new DataError(msgError.message, 'SAVE_MESSAGE_FAILED');
  }

  // Update session metadata
  await supabase
    .from('chat_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId);
}

async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', id);

  if (error) {
    throw new DataError(error.message, 'DELETE_SESSION_FAILED');
  }
}

// ============================================================
// Query Keys
// ============================================================

const CHAT_KEYS = {
  sessions: ['chat', 'sessions'] as const,
  messages: (sessionId: string) => ['chat', 'messages', sessionId] as const,
};

// ============================================================
// React Query Hooks
// ============================================================

export function useSessions() {
  const user = useAuthUser();

  const query = useQuery<ChatSession[], Error>({
    queryKey: CHAT_KEYS.sessions,
    queryFn: () => {
      if (!user) return Promise.resolve([]);
      return getSessions(user.id);
    },
    enabled: user !== null,
  });

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useMessages(sessionId: string) {
  const query = useQuery<ChatMessage[], Error>({
    queryKey: CHAT_KEYS.messages(sessionId),
    queryFn: () => getMessages(sessionId),
    enabled: !!sessionId,
    staleTime: 0,
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCreateSession() {
  const user = useAuthUser();
  const queryClient = useQueryClient();

  return useMutation<ChatSession, Error, void>({
    mutationFn: () => {
      if (!user) return Promise.reject(new Error('Not authenticated'));
      return createSession(user.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_KEYS.sessions });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_KEYS.sessions });
    },
  });
}

// ============================================================
// Streaming Hook: useSendMessage
// ============================================================

interface StreamState {
  streamingText: string;
  isStreaming: boolean;
  sources: string[];
  error: string | null;
}

export function useSendMessage(sessionId: string) {
  const user = useAuthUser();
  const queryClient = useQueryClient();

  const [state, setState] = useState<StreamState>({
    streamingText: '',
    isStreaming: false,
    sources: [],
    error: null,
  });

  // Use ref to accumulate text without triggering re-renders on every token
  const fullTextRef = useRef('');

  const sendMessage = useCallback(
    async (message: string) => {
      if (!user || !sessionId) return;

      // Reset state
      setState({
        streamingText: '',
        isStreaming: true,
        sources: [],
        error: null,
      });
      fullTextRef.current = '';

      try {
        // -------------------------------------------------
        // 1. Optimistically add user message to cache
        // -------------------------------------------------
        const optimisticMsg: ChatMessage = {
          id: `temp-${Date.now()}`,
          sessionId,
          role: 'user',
          content: message,
          sourceTransactionIds: [],
          createdAt: new Date().toISOString(),
        };

        queryClient.setQueryData<ChatMessage[]>(
          CHAT_KEYS.messages(sessionId),
          (old) => [...(old ?? []), optimisticMsg],
        );

        // -------------------------------------------------
        // 2. Get access token
        // -------------------------------------------------
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('No active session');
        }

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

        // -------------------------------------------------
        // 3. Fetch SSE stream from edge function
        // -------------------------------------------------
        const response = await fetch(
          `${supabaseUrl}/functions/v1/chat`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'apikey': anonKey,
            },
            body: JSON.stringify({
              message,
              sessionId,
              userId: user.id,
            }),
          },
        );

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(errBody || `Request failed (${response.status})`);
        }

        // -------------------------------------------------
        // 4. Read stream
        // -------------------------------------------------
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const payload = JSON.parse(line.slice(6)) as {
                token?: string;
                done?: boolean;
                sources?: string[];
                error?: string;
              };

              if (payload.error) {
                setState((prev) => ({
                  ...prev,
                  error: payload.error ?? 'Unknown error',
                  isStreaming: false,
                }));
                return;
              }

              if (payload.token && !payload.done) {
                fullTextRef.current += payload.token;
                setState((prev) => ({
                  ...prev,
                  streamingText: fullTextRef.current,
                }));
              }

              if (payload.done) {
                const sourceIds = payload.sources ?? [];

                setState({
                  streamingText: fullTextRef.current,
                  isStreaming: false,
                  sources: sourceIds,
                  error: null,
                });

                // Invalidate to refetch messages from DB
                // (the edge function already saved both messages)
                void queryClient.invalidateQueries({
                  queryKey: CHAT_KEYS.messages(sessionId),
                });
                void queryClient.invalidateQueries({
                  queryKey: CHAT_KEYS.sessions,
                });

                return;
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isStreaming: false,
        }));
      }
    },
    [user, sessionId, queryClient],
  );

  return {
    sendMessage,
    streamingText: state.streamingText,
    isStreaming: state.isStreaming,
    sources: state.sources,
    error: state.error,
  };
}
