-- FILE: supabase/migrations/004_rls.sql
-- Enable Row Level Security and define access policies

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================
CREATE POLICY users_select ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE POLICY categories_select ON categories
    FOR SELECT USING (is_default = true OR auth.uid() = user_id);

CREATE POLICY categories_insert ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY categories_update ON categories
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY categories_delete ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE POLICY transactions_select ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY transactions_insert ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY transactions_update ON transactions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY transactions_delete ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CHAT SESSIONS
-- ============================================================
CREATE POLICY chat_sessions_select ON chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY chat_sessions_insert ON chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY chat_sessions_update ON chat_sessions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY chat_sessions_delete ON chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE POLICY chat_messages_select ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY chat_messages_insert ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY chat_messages_update ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY chat_messages_delete ON chat_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
              AND chat_sessions.user_id = auth.uid()
        )
    );

-- ============================================================
-- TRANSACTION EMBEDDINGS
-- ============================================================
CREATE POLICY embeddings_select ON transaction_embeddings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY embeddings_insert ON transaction_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY embeddings_update ON transaction_embeddings
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY embeddings_delete ON transaction_embeddings
    FOR DELETE USING (auth.uid() = user_id);
