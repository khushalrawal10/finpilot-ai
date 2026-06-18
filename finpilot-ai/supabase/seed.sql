-- ============================================================
-- SEED DATA: 100 realistic transactions for demo user
-- Replace 'USER_ID_HERE' with your actual auth user UUID
-- Run AFTER creating your account via the app
-- ============================================================

DO $$
DECLARE
  user_uuid UUID := 'USER_ID_HERE'::uuid;
  cat_food UUID;
  cat_transport UUID;
  cat_shopping UUID;
  cat_bills UUID;
  cat_entertainment UUID;
  cat_health UUID;
  cat_salary UUID;
  cat_freelance UUID;
BEGIN

  -- Ensure user row exists
  INSERT INTO users (id, email, display_name, default_currency)
  VALUES (user_uuid, 'demo@finpilot.ai', 'Demo User', 'USD')
  ON CONFLICT (id) DO NOTHING;

  -- Look up default category IDs
  SELECT id INTO cat_food          FROM categories WHERE name = 'Food'          AND is_default = true;
  SELECT id INTO cat_transport     FROM categories WHERE name = 'Transport'     AND is_default = true;
  SELECT id INTO cat_shopping      FROM categories WHERE name = 'Shopping'      AND is_default = true;
  SELECT id INTO cat_bills         FROM categories WHERE name = 'Bills'         AND is_default = true;
  SELECT id INTO cat_entertainment FROM categories WHERE name = 'Entertainment' AND is_default = true;
  SELECT id INTO cat_health        FROM categories WHERE name = 'Health'        AND is_default = true;
  SELECT id INTO cat_salary        FROM categories WHERE name = 'Salary'        AND is_default = true;
  SELECT id INTO cat_freelance     FROM categories WHERE name = 'Freelance'     AND is_default = true;

  -- ========================================================
  -- FOOD (30 transactions)
  -- ========================================================
  INSERT INTO transactions (user_id, category_id, type, amount, currency_code, description, transaction_date, tags) VALUES
  (user_uuid, cat_food, 'expense', 14.50, 'USD', 'Uber Eats — Thai Basil Bowl',          CURRENT_DATE - INTERVAL '2 days',   ARRAY['delivery','lunch']),
  (user_uuid, cat_food, 'expense', 42.30, 'USD', 'Uber Eats — Family Pizza Night',       CURRENT_DATE - INTERVAL '5 days',   ARRAY['delivery','dinner']),
  (user_uuid, cat_food, 'expense',  6.75, 'USD', 'Starbucks — Iced Latte',               CURRENT_DATE - INTERVAL '1 day',    ARRAY['coffee']),
  (user_uuid, cat_food, 'expense',  8.20, 'USD', 'Starbucks — Mocha Frappuccino',        CURRENT_DATE - INTERVAL '8 days',   ARRAY['coffee']),
  (user_uuid, cat_food, 'expense', 11.50, 'USD', 'Starbucks — Breakfast Sandwich + Drip',CURRENT_DATE - INTERVAL '15 days',  ARRAY['coffee','breakfast']),
  (user_uuid, cat_food, 'expense', 67.40, 'USD', 'Whole Foods — Weekly Groceries',       CURRENT_DATE - INTERVAL '3 days',   ARRAY['groceries']),
  (user_uuid, cat_food, 'expense', 52.15, 'USD', 'Trader Joe''s — Groceries',            CURRENT_DATE - INTERVAL '10 days',  ARRAY['groceries']),
  (user_uuid, cat_food, 'expense', 78.90, 'USD', 'Costco — Bulk Groceries',              CURRENT_DATE - INTERVAL '18 days',  ARRAY['groceries','bulk']),
  (user_uuid, cat_food, 'expense', 34.00, 'USD', 'Kroger — Weekly Essentials',            CURRENT_DATE - INTERVAL '25 days',  ARRAY['groceries']),
  (user_uuid, cat_food, 'expense', 45.60, 'USD', 'Whole Foods — Organic Produce',        CURRENT_DATE - INTERVAL '32 days',  ARRAY['groceries']),
  (user_uuid, cat_food, 'expense', 38.75, 'USD', 'Chipotle — Dinner for Two',            CURRENT_DATE - INTERVAL '7 days',   ARRAY['restaurant','dinner']),
  (user_uuid, cat_food, 'expense', 55.20, 'USD', 'Olive Garden — Anniversary Dinner',    CURRENT_DATE - INTERVAL '22 days',  ARRAY['restaurant','dinner']),
  (user_uuid, cat_food, 'expense', 28.90, 'USD', 'Panda Express — Lunch',                CURRENT_DATE - INTERVAL '12 days',  ARRAY['restaurant','lunch']),
  (user_uuid, cat_food, 'expense', 22.40, 'USD', 'Subway — Work Lunch',                  CURRENT_DATE - INTERVAL '30 days',  ARRAY['restaurant','lunch']),
  (user_uuid, cat_food, 'expense', 19.80, 'USD', 'McDonald''s — Quick Bite',             CURRENT_DATE - INTERVAL '40 days',  ARRAY['fast-food']),
  (user_uuid, cat_food, 'expense', 33.50, 'USD', 'DoorDash — Indian Curry',              CURRENT_DATE - INTERVAL '45 days',  ARRAY['delivery','dinner']),
  (user_uuid, cat_food, 'expense', 16.25, 'USD', 'Uber Eats — Sushi Roll',               CURRENT_DATE - INTERVAL '50 days',  ARRAY['delivery','lunch']),
  (user_uuid, cat_food, 'expense',  7.50, 'USD', 'Dunkin Donuts — Coffee + Donut',       CURRENT_DATE - INTERVAL '55 days',  ARRAY['coffee','breakfast']),
  (user_uuid, cat_food, 'expense', 62.30, 'USD', 'Whole Foods — Weekly Run',             CURRENT_DATE - INTERVAL '60 days',  ARRAY['groceries']),
  (user_uuid, cat_food, 'expense', 41.80, 'USD', 'Trader Joe''s — Snacks + Wine',        CURRENT_DATE - INTERVAL '68 days',  ARRAY['groceries']),
  (user_uuid, cat_food, 'expense', 29.00, 'USD', 'Five Guys — Burgers',                  CURRENT_DATE - INTERVAL '75 days',  ARRAY['restaurant']),
  (user_uuid, cat_food, 'expense', 12.60, 'USD', 'Starbucks — Cold Brew',                CURRENT_DATE - INTERVAL '80 days',  ARRAY['coffee']),
  (user_uuid, cat_food, 'expense', 58.40, 'USD', 'Restaurant — Sushi Dinner',            CURRENT_DATE - INTERVAL '90 days',  ARRAY['restaurant','dinner']),
  (user_uuid, cat_food, 'expense', 71.20, 'USD', 'Costco — Monthly Stock-up',            CURRENT_DATE - INTERVAL '100 days', ARRAY['groceries','bulk']),
  (user_uuid, cat_food, 'expense', 15.30, 'USD', 'Uber Eats — Burrito Bowl',             CURRENT_DATE - INTERVAL '110 days', ARRAY['delivery','lunch']),
  (user_uuid, cat_food, 'expense', 44.50, 'USD', 'Whole Foods — Organic Haul',           CURRENT_DATE - INTERVAL '120 days', ARRAY['groceries']),
  (user_uuid, cat_food, 'expense',  9.40, 'USD', 'Starbucks — Chai Latte',               CURRENT_DATE - INTERVAL '130 days', ARRAY['coffee']),
  (user_uuid, cat_food, 'expense', 36.70, 'USD', 'Thai Palace — Pad Thai + Apps',        CURRENT_DATE - INTERVAL '140 days', ARRAY['restaurant','dinner']),
  (user_uuid, cat_food, 'expense', 23.80, 'USD', 'Panera Bread — Soup + Salad',          CURRENT_DATE - INTERVAL '150 days', ARRAY['restaurant','lunch']),
  (user_uuid, cat_food, 'expense', 48.90, 'USD', 'Kroger — Groceries + Cleaning',        CURRENT_DATE - INTERVAL '160 days', ARRAY['groceries']);

  -- ========================================================
  -- TRANSPORT (20 transactions)
  -- ========================================================
  INSERT INTO transactions (user_id, category_id, type, amount, currency_code, description, transaction_date, tags) VALUES
  (user_uuid, cat_transport, 'expense', 12.50, 'USD', 'Uber — Ride to Office',            CURRENT_DATE - INTERVAL '1 day',    ARRAY['rideshare']),
  (user_uuid, cat_transport, 'expense', 18.30, 'USD', 'Uber — Airport Drop-off',          CURRENT_DATE - INTERVAL '6 days',   ARRAY['rideshare','airport']),
  (user_uuid, cat_transport, 'expense', 24.70, 'USD', 'Lyft — Downtown Round Trip',       CURRENT_DATE - INTERVAL '14 days',  ARRAY['rideshare']),
  (user_uuid, cat_transport, 'expense',  8.50, 'USD', 'Uber — Quick Ride',                CURRENT_DATE - INTERVAL '20 days',  ARRAY['rideshare']),
  (user_uuid, cat_transport, 'expense', 15.00, 'USD', 'Uber — Date Night Ride',           CURRENT_DATE - INTERVAL '28 days',  ARRAY['rideshare']),
  (user_uuid, cat_transport, 'expense', 48.50, 'USD', 'Shell — Gas Fill-up',              CURRENT_DATE - INTERVAL '4 days',   ARRAY['gas','car']),
  (user_uuid, cat_transport, 'expense', 52.30, 'USD', 'Chevron — Gas',                    CURRENT_DATE - INTERVAL '19 days',  ARRAY['gas','car']),
  (user_uuid, cat_transport, 'expense', 55.10, 'USD', 'BP — Full Tank',                   CURRENT_DATE - INTERVAL '35 days',  ARRAY['gas','car']),
  (user_uuid, cat_transport, 'expense', 42.80, 'USD', 'Shell — Gas',                      CURRENT_DATE - INTERVAL '50 days',  ARRAY['gas','car']),
  (user_uuid, cat_transport, 'expense', 58.70, 'USD', 'Costco Gas — Fill-up',             CURRENT_DATE - INTERVAL '65 days',  ARRAY['gas','car']),
  (user_uuid, cat_transport, 'expense', 45.00, 'USD', 'Chevron — Gas',                    CURRENT_DATE - INTERVAL '80 days',  ARRAY['gas','car']),
  (user_uuid, cat_transport, 'expense', 50.20, 'USD', 'Shell — Gas Fill-up',              CURRENT_DATE - INTERVAL '95 days',  ARRAY['gas','car']),
  (user_uuid, cat_transport, 'expense', 47.60, 'USD', 'BP — Gas',                         CURRENT_DATE - INTERVAL '110 days', ARRAY['gas','car']),
  (user_uuid, cat_transport, 'expense',  3.50, 'USD', 'Metro — One Way',                  CURRENT_DATE - INTERVAL '9 days',   ARRAY['public-transit']),
  (user_uuid, cat_transport, 'expense',  3.50, 'USD', 'Metro — One Way',                  CURRENT_DATE - INTERVAL '16 days',  ARRAY['public-transit']),
  (user_uuid, cat_transport, 'expense',  5.00, 'USD', 'Bus — Day Pass',                   CURRENT_DATE - INTERVAL '33 days',  ARRAY['public-transit']),
  (user_uuid, cat_transport, 'expense',  3.50, 'USD', 'Metro — Commute',                  CURRENT_DATE - INTERVAL '48 days',  ARRAY['public-transit']),
  (user_uuid, cat_transport, 'expense',  4.00, 'USD', 'Metro — Evening Return',           CURRENT_DATE - INTERVAL '70 days',  ARRAY['public-transit']),
  (user_uuid, cat_transport, 'expense',  3.50, 'USD', 'Metro — Morning Commute',          CURRENT_DATE - INTERVAL '105 days', ARRAY['public-transit']),
  (user_uuid, cat_transport, 'expense', 22.00, 'USD', 'Uber — Concert Ride',              CURRENT_DATE - INTERVAL '125 days', ARRAY['rideshare']);

  -- ========================================================
  -- SHOPPING (15 transactions)
  -- ========================================================
  INSERT INTO transactions (user_id, category_id, type, amount, currency_code, description, transaction_date, tags) VALUES
  (user_uuid, cat_shopping, 'expense',  34.99, 'USD', 'Amazon — Wireless Charger',         CURRENT_DATE - INTERVAL '3 days',   ARRAY['online','electronics']),
  (user_uuid, cat_shopping, 'expense', 149.99, 'USD', 'Amazon — Noise Cancelling Earbuds', CURRENT_DATE - INTERVAL '11 days',  ARRAY['online','electronics']),
  (user_uuid, cat_shopping, 'expense',  22.50, 'USD', 'Amazon — Book: Atomic Habits',      CURRENT_DATE - INTERVAL '27 days',  ARRAY['online','books']),
  (user_uuid, cat_shopping, 'expense',  89.00, 'USD', 'Amazon — Running Shoes',            CURRENT_DATE - INTERVAL '42 days',  ARRAY['online','fitness']),
  (user_uuid, cat_shopping, 'expense',  45.30, 'USD', 'Amazon — Kitchen Gadgets',          CURRENT_DATE - INTERVAL '72 days',  ARRAY['online','home']),
  (user_uuid, cat_shopping, 'expense',  67.40, 'USD', 'Target — Home Decor',               CURRENT_DATE - INTERVAL '13 days',  ARRAY['home']),
  (user_uuid, cat_shopping, 'expense',  42.80, 'USD', 'Target — Toiletries + Cleaning',    CURRENT_DATE - INTERVAL '38 days',  ARRAY['essentials']),
  (user_uuid, cat_shopping, 'expense',  78.50, 'USD', 'Target — Bedding Set',              CURRENT_DATE - INTERVAL '62 days',  ARRAY['home']),
  (user_uuid, cat_shopping, 'expense',  35.00, 'USD', 'Target — Office Supplies',          CURRENT_DATE - INTERVAL '88 days',  ARRAY['office']),
  (user_uuid, cat_shopping, 'expense',  55.00, 'USD', 'Zara — Summer Shirt',               CURRENT_DATE - INTERVAL '21 days',  ARRAY['clothing']),
  (user_uuid, cat_shopping, 'expense',  98.00, 'USD', 'Nike — Running Shorts + Tee',       CURRENT_DATE - INTERVAL '47 days',  ARRAY['clothing','fitness']),
  (user_uuid, cat_shopping, 'expense', 120.00, 'USD', 'H&M — Winter Jacket',               CURRENT_DATE - INTERVAL '130 days', ARRAY['clothing']),
  (user_uuid, cat_shopping, 'expense',  40.00, 'USD', 'Uniqlo — Basic Tees x2',            CURRENT_DATE - INTERVAL '100 days', ARRAY['clothing']),
  (user_uuid, cat_shopping, 'expense',  65.00, 'USD', 'Levi''s — Jeans',                   CURRENT_DATE - INTERVAL '155 days', ARRAY['clothing']),
  (user_uuid, cat_shopping, 'expense',  28.99, 'USD', 'Amazon — USB Hub + Cables',         CURRENT_DATE - INTERVAL '170 days', ARRAY['online','electronics']);

  -- ========================================================
  -- BILLS (10 transactions)
  -- ========================================================
  INSERT INTO transactions (user_id, category_id, type, amount, currency_code, description, transaction_date, tags) VALUES
  (user_uuid, cat_bills, 'expense',  15.49, 'USD', 'Netflix — Monthly Subscription',     CURRENT_DATE - INTERVAL '2 days',   ARRAY['subscription']),
  (user_uuid, cat_bills, 'expense',  15.49, 'USD', 'Netflix — Monthly Subscription',     CURRENT_DATE - INTERVAL '32 days',  ARRAY['subscription']),
  (user_uuid, cat_bills, 'expense',  10.99, 'USD', 'Spotify — Premium',                  CURRENT_DATE - INTERVAL '5 days',   ARRAY['subscription']),
  (user_uuid, cat_bills, 'expense',  10.99, 'USD', 'Spotify — Premium',                  CURRENT_DATE - INTERVAL '35 days',  ARRAY['subscription']),
  (user_uuid, cat_bills, 'expense',  95.40, 'USD', 'City Power — Electricity Bill',      CURRENT_DATE - INTERVAL '10 days',  ARRAY['utilities']),
  (user_uuid, cat_bills, 'expense', 112.30, 'USD', 'City Power — Electricity Bill',      CURRENT_DATE - INTERVAL '40 days',  ARRAY['utilities']),
  (user_uuid, cat_bills, 'expense',  88.50, 'USD', 'City Power — Electricity Bill',      CURRENT_DATE - INTERVAL '70 days',  ARRAY['utilities']),
  (user_uuid, cat_bills, 'expense',  60.00, 'USD', 'Xfinity — Internet',                 CURRENT_DATE - INTERVAL '8 days',   ARRAY['utilities','internet']),
  (user_uuid, cat_bills, 'expense',  60.00, 'USD', 'Xfinity — Internet',                 CURRENT_DATE - INTERVAL '38 days',  ARRAY['utilities','internet']),
  (user_uuid, cat_bills, 'expense',  60.00, 'USD', 'Xfinity — Internet',                 CURRENT_DATE - INTERVAL '68 days',  ARRAY['utilities','internet']);

  -- ========================================================
  -- ENTERTAINMENT (8 transactions)
  -- ========================================================
  INSERT INTO transactions (user_id, category_id, type, amount, currency_code, description, transaction_date, tags) VALUES
  (user_uuid, cat_entertainment, 'expense', 32.00, 'USD', 'AMC — Movie: Inside Out 3',     CURRENT_DATE - INTERVAL '6 days',   ARRAY['movies']),
  (user_uuid, cat_entertainment, 'expense', 28.00, 'USD', 'AMC — Movie: Avengers',          CURRENT_DATE - INTERVAL '30 days',  ARRAY['movies']),
  (user_uuid, cat_entertainment, 'expense', 38.50, 'USD', 'IMAX — Dune Part III',           CURRENT_DATE - INTERVAL '55 days',  ARRAY['movies']),
  (user_uuid, cat_entertainment, 'expense', 25.00, 'USD', 'Regal — Date Night Movie',       CURRENT_DATE - INTERVAL '85 days',  ARRAY['movies']),
  (user_uuid, cat_entertainment, 'expense', 59.99, 'USD', 'Steam — Elden Ring DLC',         CURRENT_DATE - INTERVAL '20 days',  ARRAY['gaming']),
  (user_uuid, cat_entertainment, 'expense', 14.99, 'USD', 'PlayStation Store — Indie Game',  CURRENT_DATE - INTERVAL '44 days',  ARRAY['gaming']),
  (user_uuid, cat_entertainment, 'expense', 39.99, 'USD', 'Nintendo eShop — Zelda',         CURRENT_DATE - INTERVAL '78 days',  ARRAY['gaming']),
  (user_uuid, cat_entertainment, 'expense', 19.99, 'USD', 'Xbox — Game Pass Monthly',       CURRENT_DATE - INTERVAL '115 days', ARRAY['gaming','subscription']);

  -- ========================================================
  -- HEALTH (5 transactions)
  -- ========================================================
  INSERT INTO transactions (user_id, category_id, type, amount, currency_code, description, transaction_date, tags) VALUES
  (user_uuid, cat_health, 'expense', 28.50, 'USD', 'CVS Pharmacy — Vitamins + Meds',       CURRENT_DATE - INTERVAL '4 days',   ARRAY['pharmacy']),
  (user_uuid, cat_health, 'expense', 45.00, 'USD', 'Walgreens — Prescription Refill',      CURRENT_DATE - INTERVAL '36 days',  ARRAY['pharmacy','prescription']),
  (user_uuid, cat_health, 'expense', 22.30, 'USD', 'CVS — Cold Medicine + Bandages',       CURRENT_DATE - INTERVAL '74 days',  ARRAY['pharmacy']),
  (user_uuid, cat_health, 'expense', 40.00, 'USD', 'Planet Fitness — Monthly Membership',  CURRENT_DATE - INTERVAL '1 day',    ARRAY['gym','subscription']),
  (user_uuid, cat_health, 'expense', 40.00, 'USD', 'Planet Fitness — Monthly Membership',  CURRENT_DATE - INTERVAL '31 days',  ARRAY['gym','subscription']);

  -- ========================================================
  -- SALARY (6 transactions — $3500 each, 1st of each month)
  -- ========================================================
  INSERT INTO transactions (user_id, category_id, type, amount, currency_code, description, transaction_date, tags) VALUES
  (user_uuid, cat_salary, 'income', 3500.00, 'USD', 'Acme Corp — Monthly Salary',    DATE_TRUNC('month', CURRENT_DATE)::date,                          ARRAY['salary','direct-deposit']),
  (user_uuid, cat_salary, 'income', 3500.00, 'USD', 'Acme Corp — Monthly Salary',    (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::date,   ARRAY['salary','direct-deposit']),
  (user_uuid, cat_salary, 'income', 3500.00, 'USD', 'Acme Corp — Monthly Salary',    (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months')::date,  ARRAY['salary','direct-deposit']),
  (user_uuid, cat_salary, 'income', 3500.00, 'USD', 'Acme Corp — Monthly Salary',    (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months')::date,  ARRAY['salary','direct-deposit']),
  (user_uuid, cat_salary, 'income', 3500.00, 'USD', 'Acme Corp — Monthly Salary',    (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months')::date,  ARRAY['salary','direct-deposit']),
  (user_uuid, cat_salary, 'income', 3500.00, 'USD', 'Acme Corp — Monthly Salary',    (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months')::date,  ARRAY['salary','direct-deposit']);

  -- ========================================================
  -- FREELANCE (6 transactions — $200-600 scattered)
  -- ========================================================
  INSERT INTO transactions (user_id, category_id, type, amount, currency_code, description, transaction_date, tags) VALUES
  (user_uuid, cat_freelance, 'income', 450.00, 'USD', 'Upwork — Logo Design Project',     CURRENT_DATE - INTERVAL '9 days',   ARRAY['freelance','design']),
  (user_uuid, cat_freelance, 'income', 600.00, 'USD', 'Client — Website Redesign',        CURRENT_DATE - INTERVAL '26 days',  ARRAY['freelance','web']),
  (user_uuid, cat_freelance, 'income', 250.00, 'USD', 'Fiverr — SEO Audit',               CURRENT_DATE - INTERVAL '52 days',  ARRAY['freelance','seo']),
  (user_uuid, cat_freelance, 'income', 380.00, 'USD', 'Client — Mobile App Mockups',      CURRENT_DATE - INTERVAL '83 days',  ARRAY['freelance','design']),
  (user_uuid, cat_freelance, 'income', 200.00, 'USD', 'Upwork — Blog Article x4',         CURRENT_DATE - INTERVAL '112 days', ARRAY['freelance','writing']),
  (user_uuid, cat_freelance, 'income', 520.00, 'USD', 'Client — E-commerce Integration',  CURRENT_DATE - INTERVAL '145 days', ARRAY['freelance','web']);

END $$;
