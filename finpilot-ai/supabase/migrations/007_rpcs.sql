-- FILE: supabase/migrations/007_rpcs.sql
-- Remote Procedure Calls for semantic search, monthly summaries, and category breakdowns

-- ============================================================
-- SEMANTIC TRANSACTION SEARCH
-- ============================================================
CREATE OR REPLACE FUNCTION search_transactions_semantic(
    p_query_embedding VECTOR(1536),
    p_user_id         UUID,
    p_date_from       DATE DEFAULT NULL,
    p_date_to         DATE DEFAULT NULL,
    p_limit           INT  DEFAULT 15
)
RETURNS TABLE (
    id               UUID,
    type             TEXT,
    amount           NUMERIC,
    currency_code    TEXT,
    description      TEXT,
    category_name    TEXT,
    transaction_date DATE,
    tags             TEXT[],
    similarity       FLOAT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        t.id,
        t.type,
        t.amount,
        t.currency_code,
        t.description,
        COALESCE(c.name, 'Uncategorized'),
        t.transaction_date,
        t.tags,
        1 - (te.embedding <=> p_query_embedding)
    FROM transactions t
    JOIN transaction_embeddings te ON t.id = te.transaction_id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND t.is_deleted = false
      AND (p_date_from IS NULL OR t.transaction_date >= p_date_from)
      AND (p_date_to   IS NULL OR t.transaction_date <= p_date_to)
    ORDER BY te.embedding <=> p_query_embedding
    LIMIT p_limit;
$$;

-- ============================================================
-- MONTHLY SUMMARY
-- ============================================================
CREATE OR REPLACE FUNCTION get_monthly_summary(
    p_user_id UUID,
    p_year    INT,
    p_month   INT
)
RETURNS TABLE (
    total_income      NUMERIC,
    total_expense     NUMERIC,
    net               NUMERIC,
    transaction_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0),
        COUNT(*)
    FROM transactions
    WHERE user_id = p_user_id
      AND EXTRACT(YEAR  FROM transaction_date) = p_year
      AND EXTRACT(MONTH FROM transaction_date) = p_month
      AND is_deleted = false;
$$;

-- ============================================================
-- CATEGORY BREAKDOWN
-- ============================================================
CREATE OR REPLACE FUNCTION get_category_breakdown(
    p_user_id   UUID,
    p_date_from DATE,
    p_date_to   DATE
)
RETURNS TABLE (
    category_name  TEXT,
    category_color TEXT,
    total          NUMERIC,
    transaction_count BIGINT,
    percentage     NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    WITH totals AS (
        SELECT
            COALESCE(c.name, 'Uncategorized')  AS cat,
            COALESCE(c.color, '#6B7280')       AS col,
            SUM(t.amount)                      AS s,
            COUNT(*)                           AS n
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = p_user_id
          AND t.type = 'expense'
          AND t.transaction_date BETWEEN p_date_from AND p_date_to
          AND t.is_deleted = false
        GROUP BY c.name, c.color
    ),
    grand AS (
        SELECT SUM(s) AS total FROM totals
    )
    SELECT
        cat,
        col,
        s,
        n,
        ROUND(s / grand.total * 100, 1)
    FROM totals, grand
    ORDER BY s DESC;
$$;
