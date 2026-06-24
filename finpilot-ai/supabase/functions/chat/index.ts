// deno-lint-ignore-file
// @ts-nocheck — Deno runtime, not Node
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, verifyAuth } from '../_shared/utils.ts';

// ============================================================
// Date range parser
// ============================================================

interface DateRange {
  dateFrom: string | null;
  dateTo: string | null;
}

function parseDateRange(message: string, timezone?: string): DateRange {
  const lower = message.toLowerCase();
  const now = new Date();

  // "this month"
  if (/this\s+month/.test(lower)) {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  }

  // "last month"
  if (/last\s+month/.test(lower)) {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  }

  // "this week" (Monday to today)
  if (/this\s+week/.test(lower)) {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    return { dateFrom: fmt(monday), dateTo: fmt(now) };
  }

  // "last N days" / "past N days"
  const daysMatch = lower.match(/(?:last|past)\s+(\d+)\s+days?/);
  if (daysMatch) {
    const n = parseInt(daysMatch[1], 10);
    const from = new Date(now);
    from.setDate(now.getDate() - n);
    return { dateFrom: fmt(from), dateTo: fmt(now) };
  }

  // "in january", "in february", etc.
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
  };
  const monthMatch = lower.match(
    /in\s+(january|february|march|april|may|june|july|august|september|october|november|december)/,
  );
  if (monthMatch) {
    const monthIdx = months[monthMatch[1]];
    const from = new Date(now.getFullYear(), monthIdx, 1);
    const to = new Date(now.getFullYear(), monthIdx + 1, 0);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  }

  return { dateFrom: null, dateTo: null };
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Chat handler
// ============================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ------------------------------------------------------
    // 1. Auth + parse body
    // ------------------------------------------------------
    const authenticatedUserId = await verifyAuth(req);

    const { message, sessionId, userId, timezone } = (await req.json()) as {
      message: string;
      sessionId: string;
      userId: string;
      timezone?: string;
    };

    if (!message || !sessionId || !userId) {
      return new Response(
        JSON.stringify({ error: 'message, sessionId, and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (authenticatedUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ------------------------------------------------------
    // 2. Supabase admin client
    // ------------------------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const groqKey = Deno.env.get('GROQ_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ------------------------------------------------------
    // STEP A — Parse date range from message
    // ------------------------------------------------------
    const { dateFrom, dateTo } = parseDateRange(message, timezone);

    // ------------------------------------------------------
    // STEP B — Fetch conversation history
    // ------------------------------------------------------
    const { data: historyRows } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(8);

    const history: Array<{ role: string; content: string }> =
      (historyRows as Array<{ role: string; content: string }>) ?? [];

    // ------------------------------------------------------
    // STEP C — Fetch transactions (semantic or fallback)
    // ------------------------------------------------------
    interface SearchRow {
      id: string;
      type: string;
      amount: number;
      currency_code: string;
      description: string;
      category_name: string;
      transaction_date: string;
      tags: string[];
      similarity?: number;
    }

    let rows: SearchRow[] = [];

    try {
      // Try semantic search with OpenAI embeddings
      const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: message,
        }),
      });

      if (!embeddingRes.ok) {
        throw new Error('Embedding API unavailable');
      }

      const embeddingData = await embeddingRes.json();
      const queryEmbedding: number[] = embeddingData.data[0].embedding;

      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_transactions_semantic',
        {
          p_query_embedding: queryEmbedding,
          p_user_id: userId,
          p_date_from: dateFrom,
          p_date_to: dateTo,
          p_limit: 15,
        },
      );

      if (searchError) {
        console.error('Semantic search error:', searchError.message);
      }

      rows = (searchResults as SearchRow[]) ?? [];
    } catch (embeddingErr) {
      // Fallback: simple SQL-based search (no embeddings needed)
      console.warn('Embedding unavailable, using fallback search:', embeddingErr);

      let query = supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          currency_code,
          description,
          transaction_date,
          tags,
          categories ( name )
        `)
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(20);

      if (dateFrom) query = query.gte('transaction_date', dateFrom);
      if (dateTo) query = query.lte('transaction_date', dateTo);

      const { data: fallbackRows, error: fallbackError } = await query;

      if (fallbackError) {
        console.error('Fallback search error:', fallbackError.message);
      }

      rows = ((fallbackRows as any[]) ?? []).map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        currency_code: r.currency_code,
        description: r.description,
        category_name: r.categories?.name ?? 'Uncategorized',
        transaction_date: r.transaction_date,
        tags: r.tags ?? [],
      }));
    }

    // ------------------------------------------------------
    // STEP D — Format context
    // ------------------------------------------------------
    const context =
      rows.length > 0
        ? rows
            .map(
              (r) =>
                `[${r.transaction_date}] ${r.type}: ${r.currency_code}${r.amount} — ${r.description} (Category: ${r.category_name})`,
            )
            .join('\n')
        : 'No matching transactions found.';

    // ------------------------------------------------------
    // STEP F — Build messages for Groq LLM
    // ------------------------------------------------------
    const systemPrompt =
      'You are FinPilot, a personal finance assistant. Answer ONLY using the provided transaction data. Cite specific amounts, dates, and merchants. Never invent transactions. If data is insufficient, say so. Be concise — 2-3 sentences max for simple queries.';

    const llmMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `User transactions:\n${context}` },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // ------------------------------------------------------
    // STEP H — Save user message BEFORE streaming
    // ------------------------------------------------------
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    });

    // Auto-name session from first user message
    const autoTitle = history.length === 0
      ? message.trim().slice(0, 40) + (message.trim().length > 40 ? '…' : '')
      : undefined;

    // Update session metadata
    await supabase
      .from('chat_sessions')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (history.length + 1),
        ...(autoTitle ? { title: autoTitle } : {}),
      })
      .eq('id', sessionId);

    // ------------------------------------------------------
    // STEP G — Stream Groq response
    // ------------------------------------------------------
    const llmResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: llmMessages,
          stream: true,
          temperature: 0.1,
          max_tokens: 500,
        }),
      },
    );

    if (!llmResponse.ok) {
      throw new Error(
        `Groq Chat API error (${llmResponse.status}): ${await llmResponse.text()}`,
      );
    }

    const sourceIds = rows.map((r) => r.id);
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const reader = llmResponse.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Send final event with sources
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ done: true, sources: sourceIds })}\n\n`,
                ),
              );

              // Save assistant response to DB
              await supabase.from('chat_messages').insert({
                session_id: sessionId,
                role: 'assistant',
                content: fullResponse,
                source_transaction_ids: sourceIds,
              });

              controller.close();
              break;
            }

            const text = decoder.decode(value, { stream: true });

            for (const line of text.split('\n')) {
              if (!line.startsWith('data: ') || line === 'data: [DONE]') {
                continue;
              }

              try {
                const json = JSON.parse(line.slice(6));
                const token: string | undefined =
                  json.choices?.[0]?.delta?.content;

                if (token) {
                  fullResponse += token;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ token, done: false })}\n\n`,
                    ),
                  );
                }
              } catch {
                // Skip malformed SSE chunks
              }
            }
          }
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errMsg, done: true })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
