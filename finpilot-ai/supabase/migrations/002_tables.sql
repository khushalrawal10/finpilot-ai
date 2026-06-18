-- FILE: supabase/migrations/002_tables.sql
-- Create all application tables

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email       TEXT NOT NULL UNIQUE,
    display_name TEXT,
    default_currency CHAR(3) NOT NULL DEFAULT 'USD',
    timezone    TEXT NOT NULL DEFAULT 'UTC',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users (id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    icon        TEXT DEFAULT 'circle',
    color       TEXT DEFAULT '#6B7280',
    is_default  BOOLEAN DEFAULT false,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_user_category UNIQUE (user_id, name)
);

-- Partial unique index: enforce uniqueness only for user-owned categories
CREATE UNIQUE INDEX uq_user_category_partial
    ON categories (user_id, name)
    WHERE user_id IS NOT NULL;

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories (id) ON DELETE SET NULL,
    type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency_code   CHAR(3) NOT NULL DEFAULT 'USD',
    description     TEXT NOT NULL,
    notes           TEXT,
    tags            TEXT[] DEFAULT '{}',
    transaction_date DATE NOT NULL,
    is_deleted      BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHAT SESSIONS
-- ============================================================
CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title           TEXT DEFAULT 'New Chat',
    is_active       BOOLEAN DEFAULT true,
    message_count   INT DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE chat_messages (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
    role                    TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content                 TEXT NOT NULL,
    source_transaction_ids  UUID[] DEFAULT '{}',
    token_count             INT,
    model_used              TEXT,
    latency_ms              INT,
    created_at              TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TRANSACTION EMBEDDINGS
-- ============================================================
CREATE TABLE transaction_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL UNIQUE REFERENCES transactions (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    embedding       VECTOR(1536) NOT NULL,
    embedding_text  TEXT NOT NULL,
    model_version   TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at      TIMESTAMPTZ DEFAULT now()
);
