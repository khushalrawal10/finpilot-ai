#!/usr/bin/env node

/**
 * Seed Embeddings Script
 *
 * Calls the /embed Edge Function for every transaction that has no embedding yet.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/seed-embeddings.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hqweqasbzmtbfizfcyrp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY env var is required');
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-embeddings.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EMBED_URL = `${SUPABASE_URL}/functions/v1/embed`;
const DELAY_MS = 200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔍 Fetching transactions without embeddings...\n');

  // Find all transactions that have no embedding row
  const { data: rows, error } = await supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      transaction_embeddings!left ( id )
    `)
    .is('is_deleted', false);

  if (error) {
    console.error('❌ Failed to fetch transactions:', error.message);
    process.exit(1);
  }

  // Filter to only those with no embedding
  const missing = rows.filter(
    (r) => !r.transaction_embeddings || r.transaction_embeddings.length === 0
  );

  if (missing.length === 0) {
    console.log('✅ All transactions already have embeddings. Nothing to do.');
    return;
  }

  console.log(`📊 Found ${missing.length} transactions without embeddings.\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const txn = missing[i];

    try {
      const res = await fetch(EMBED_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: txn.id,
          userId: txn.user_id,
        }),
      });

      if (res.ok) {
        success++;
        console.log(`✅ Embedded ${i + 1}/${missing.length}: ${txn.id}`);
      } else {
        const body = await res.text();
        failed++;
        console.error(`❌ Failed ${i + 1}/${missing.length}: ${txn.id} — ${res.status}: ${body}`);
      }
    } catch (err) {
      failed++;
      console.error(`❌ Error ${i + 1}/${missing.length}: ${txn.id} — ${err.message}`);
    }

    // Rate limit delay
    if (i < missing.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n🏁 Done! ${success} succeeded, ${failed} failed out of ${missing.length} total.`);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
