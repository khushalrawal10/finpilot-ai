// deno-lint-ignore-file
// @ts-nocheck — Deno runtime, not Node
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, verifyAuth } from '../_shared/utils.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --------------------------------------------------------
    // 1. Verify auth
    // --------------------------------------------------------
    const authenticatedUserId = await verifyAuth(req);

    // --------------------------------------------------------
    // 2. Parse request body
    // --------------------------------------------------------
    const { transactionId, userId } = (await req.json()) as {
      transactionId: string;
      userId: string;
    };

    if (!transactionId || !userId) {
      return new Response(
        JSON.stringify({ error: 'transactionId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Ensure the authenticated user matches the requested userId
    if (authenticatedUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --------------------------------------------------------
    // 3. Create Supabase client (service role)
    // --------------------------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --------------------------------------------------------
    // 4. Fetch transaction
    // --------------------------------------------------------
    const { data: txn, error: fetchError } = await supabase
      .from('transactions')
      .select(
        `
        id,
        type,
        amount,
        currency_code,
        description,
        transaction_date,
        tags,
        categories!left ( name )
      `,
      )
      .eq('id', transactionId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !txn) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --------------------------------------------------------
    // 5. Build embedding text
    // --------------------------------------------------------
    const categoryName =
      (txn.categories as { name: string } | null)?.name ?? 'Uncategorized';
    const tags = (txn.tags as string[]) ?? [];
    const tagsSuffix = tags.length > 0 ? ` ${tags.join(' ')}` : '';

    const embeddingText =
      `${txn.type} ${txn.amount} ${txn.currency_code} on ${txn.description} in category ${categoryName} on ${txn.transaction_date}${tagsSuffix}`;

    // --------------------------------------------------------
    // 6. Call OpenAI Embeddings API
    // --------------------------------------------------------
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const embeddingResponse = await fetch(
      'https://api.openai.com/v1/embeddings',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: embeddingText,
        }),
      },
    );

    if (!embeddingResponse.ok) {
      const errBody = await embeddingResponse.text();
      throw new Error(`OpenAI API error (${embeddingResponse.status}): ${errBody}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding: number[] = embeddingData.data[0].embedding;

    // --------------------------------------------------------
    // 7. Upsert into transaction_embeddings
    // --------------------------------------------------------
    const { error: upsertError } = await supabase
      .from('transaction_embeddings')
      .upsert(
        {
          transaction_id: transactionId,
          user_id: userId,
          embedding: JSON.stringify(embedding),
          embedding_text: embeddingText,
          model_version: 'text-embedding-3-small',
        },
        { onConflict: 'transaction_id' },
      );

    if (upsertError) {
      throw new Error(`Failed to store embedding: ${upsertError.message}`);
    }

    // --------------------------------------------------------
    // 8. Return success
    // --------------------------------------------------------
    return new Response(
      JSON.stringify({ success: true, transactionId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
