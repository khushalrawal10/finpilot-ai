-- FILE: supabase/migrations/005_indexes.sql
-- Performance indexes for common query patterns

CREATE INDEX idx_txn_user_date
    ON transactions (user_id, transaction_date DESC)
    WHERE is_deleted = false;

CREATE INDEX idx_txn_user_category
    ON transactions (user_id, category_id);

CREATE INDEX idx_chat_sessions_user
    ON chat_sessions (user_id, last_message_at DESC);

CREATE INDEX idx_chat_messages_session
    ON chat_messages (session_id, created_at ASC);

CREATE INDEX idx_embeddings_user
    ON transaction_embeddings (user_id);

CREATE INDEX idx_embeddings_hnsw
    ON transaction_embeddings
    USING hnsw (embedding vector_cosine_ops);
