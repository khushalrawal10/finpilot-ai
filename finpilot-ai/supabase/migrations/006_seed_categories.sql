-- FILE: supabase/migrations/006_seed_categories.sql
-- Seed default categories (shared across all users)

INSERT INTO categories (user_id, name, icon, color, is_default, sort_order) VALUES
    (NULL, 'Food',          '🍔', '#EF4444', true, 1),
    (NULL, 'Transport',     '🚗', '#3B82F6', true, 2),
    (NULL, 'Shopping',      '🛍️', '#8B5CF6', true, 3),
    (NULL, 'Bills',         '⚡', '#F59E0B', true, 4),
    (NULL, 'Entertainment', '🎬', '#EC4899', true, 5),
    (NULL, 'Health',        '💊', '#10B981', true, 6),
    (NULL, 'Education',     '📚', '#06B6D4', true, 7),
    (NULL, 'Salary',        '💰', '#22C55E', true, 8),
    (NULL, 'Freelance',     '💻', '#84CC16', true, 9),
    (NULL, 'Other',         '📌', '#6B7280', true, 10);
