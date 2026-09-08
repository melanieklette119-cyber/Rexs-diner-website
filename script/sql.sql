-- ============================================
-- CONSOLIDATED MIGRATION: All tables & data
-- ============================================

-- 001: Create base tables
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  user_group TEXT DEFAULT 'mitarbeiter',
  must_change_password BOOLEAN DEFAULT true,
  is_temporary_password BOOLEAN DEFAULT false,
  discord_user_id TEXT,
  image TEXT,
  warning_count INTEGER DEFAULT 0,
  suspended_until TIMESTAMP WITH TIME ZONE,
  dienstvorschriften_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ensure new columns exist on existing databases
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE;


CREATE TABLE IF NOT EXISTS public.ranks (
  id SERIAL PRIMARY KEY,
  rank_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 30,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.website_config (
  id SERIAL PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  guests INTEGER NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'Ausstehend',
  notes TEXT,
  timestamp BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'Neu',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL,
  category TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_ratings (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  customer_name TEXT,
  timestamp BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.menu_ratings
  ADD COLUMN IF NOT EXISTS timestamp BIGINT;

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL,
  valid_until TEXT,
  max_usages INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.discount_codes
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id TYPE TEXT USING id::text,
  ADD COLUMN IF NOT EXISTS valid_until TEXT,
  ADD COLUMN IF NOT EXISTS max_usages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.hausverbote (
  id BIGSERIAL PRIMARY KEY,
  who TEXT NOT NULL,
  reason TEXT NOT NULL,
  duration TEXT,
  photo TEXT,
  timestamp BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE TABLE IF NOT EXISTS public.werkstatt_orders (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'Neu',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discount_code TEXT,
  discount_percent INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id SERIAL PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  discord_username TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vacation_requests (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'Ausstehend',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id SERIAL PRIMARY KEY,
  date text NOT NULL,
  title text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  location text
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_hausverbote_timestamp ON public.hausverbote (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hausverbote_who ON public.hausverbote (who);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events (date);


-- ============================================
-- RLS policies
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hausverbote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.werkstatt_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to users" ON public.users;
DROP POLICY IF EXISTS "Allow all access to ranks" ON public.ranks;
DROP POLICY IF EXISTS "Allow all access to website_config" ON public.website_config;
DROP POLICY IF EXISTS "Allow all access to reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow all access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all access to reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow all access to menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow all access to menu_ratings" ON public.menu_ratings;
DROP POLICY IF EXISTS "Allow all access to discount_codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Allow all access to hausverbote" ON public.hausverbote;
DROP POLICY IF EXISTS "Allow all access to werkstatt_orders" ON public.werkstatt_orders;
DROP POLICY IF EXISTS "Allow all access to calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow all access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow all access to vacation_requests" ON public.vacation_requests;


CREATE POLICY "Allow all access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ranks" ON public.ranks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to website_config" ON public.website_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to reservations" ON public.reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to menu_ratings" ON public.menu_ratings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to discount_codes" ON public.discount_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to hausverbote" ON public.hausverbote FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to werkstatt_orders" ON public.werkstatt_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to calendar_events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to vacation_requests" ON public.vacation_requests FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- Seed data
-- ============================================

-- Default admin user
INSERT INTO public.users (username, password, role, user_group, must_change_password, is_temporary_password)
VALUES ('Website Entwickler (TeamKillerpaul)', '$2b$12$...', 'admin', 'owner', false, false)
ON CONFLICT (username) DO NOTHING;

-- Default website config
INSERT INTO "public"."website_config" ("id", "config_key", "config_value", "created_at", "updated_at") VALUES ('1', 'discord_channels', '{"orders":"1476083546912194703","reviews":"1476083546912194703","adminLogs":"1476083546912194703","reservations":"1476083546912194703","announcements":"1476083546912194703"}', '2026-01-29 21:09:24.290699+00', '2026-02-25 21:35:55.454+00'), ('2', 'opening_hours', '{"So":"12:00 - 22:00","Fr-Sa":"17:00 - 24:00","Mo-Do":"17:00 - 23:00"}', '2026-01-29 21:09:24.290699+00', '2026-02-25 21:35:55.597+00'), ('3', 'website_settings', '{"title":"Rex''s Diner","contactCity":"3056 Teamhausen","description":"Authentisches Restaurant","contactPhone":"+49 (0) 123 456789","contactAddress":"Senora Way","contactDiscord":"https://discord.gg/v42GuchGEr"}', '2026-01-29 21:09:24.290699+00', '2026-02-25 21:35:55.734+00'), ('4', 'discord_bot', '{"token":"","guildId":"","clientId":""}', '2026-01-29 21:09:24.290699+00', '2026-02-25 21:35:55.878+00');
;

INSERT INTO "public"."menu_items" ("id", "name", "description", "price", "category", "rating", "created_at", "updated_at", "image") VALUES (3952, 'Dino Nuggets', 'Saftige, goldbraun frittierte Dino Nuggets – perfekt, um sie mit etwas BBQ- oder Süß-Sauer-Sauce zu dippen.', '5', 'Beilagen', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/DPkGqHt1/Bild-2026-02-09-182748741-removebg-preview.png'), (3953, 'Zwiebel Ringe', 'Klassische, goldbraun frittierte Zwiebelringe, die einfach zu jedem Burger passen. Ein echter Favorit für Fast-Food-Liebhaber.', '5', 'Beilagen', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/KjX4ss5F/Bild-2026-02-09-184036560-removebg-preview.png'), (3954, ' Vanille Eis', 'Ein klassisches Vanilleeis, das jeden perfekt ins Dessert-Rundenset integriert.', '4', 'Dessert', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/3mbnpjnL/Bild-2026-02-10-221057079-removebg-preview.png'), (3955, 'Blaubeer Eis', 'Ein erfrischendes und fruchtiges Blaubeer-Eis, das mit seinem süßen Geschmack den perfekten Abschluss für ein fast zu deftiges Fast-Food-Dinner bietet.', '4', 'Dessert', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/CKNG2Q9S/Bild-2026-02-10-221312816-removebg-preview.png'), (3956, 'Erdbeer Eis', 'Ein weiteres fruchtiges Eis, das die Frische von Erdbeeren einfängt. Der perfekte Abschluss für ein dekadentes Fast-Food-Mahl.
', '4', 'Dessert', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/xKkX0LZy/Bild-2026-02-10-221431656-removebg-preview.png'), (3957, 'Schokoladen Eis', 'Reichhaltig, cremig und genau richtig für alle, die ein schweres Dessert mögen.', '4', 'Dessert', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/1tzmBhcK/Bild-2026-02-10-221525273-removebg-preview.png'), (3958, 'Waldbeeren Eis', 'Für die, die es etwas fruchtiger mögen – ein leicht säuerliches Waldbeeren-Eis, das den Geschmack von den Straßen widerspiegelt.', '4', 'Dessert', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/gZq1fHVg/Bild-2026-02-10-221652072-removebg-preview.png'), (3959, 'Erdbeer-Limonade', 'Die erfrischende Erdbeer-Limonade für einen coolen, fruchtigen Touch. Genau das Richtige für die heißen Tage.', '4', 'Getränke', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3960, 'Kirsch-Limonade', 'Eine süße, fruchtige Kirsch-Limonade – genau das Richtige für alle, die etwas ganz Besonderes möchten.', '4', 'Getränke', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3961, 'Orangen-Limonade', 'Die spritzige und süße Orangen-Limonade – der fruchtige Klassiker für heiße Sommertage.', '4', 'Getränke', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3962, 'Rex Milchshake', 'Ein klassischer Rex Milchshake – dick, cremig und perfekt, um ihn als Drink zum Essen zu genießen.', '4', 'Getränke', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/DDN16RNk/Bild-2026-02-10-221807130-removebg-preview.png'), (3963, 'Rex-Limonade', 'Die Rexlimonade ist ein geheimnisvolles Getränk, dessen einzigartige Mischung wir nicht verraten. Du musst es selbst erschmecken – eine erfrischende Überraschung in jedem Schluck!', '4', 'Getränke', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://ibb.co/TxpkwWLw'), (3964, 'Wassermelonen-Limonade', 'Eine erfrischende und außergewöhnliche Limonade mit dem frischen Geschmack von Wassermelone – perfekt für alle, die etwas anderes suchen.', '4', 'Getränke', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3965, ' Bleeder Burger', 'Ein saftiger Burger mit doppeltem Fleisch, Käse und knusprigem Speck – der Klassiker unter den Fast-Food-Burgern. Perfekt für den hungrigen Teamstadt-Bürger, der es kräftig mag.', '22', 'Hauptgang', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3966, 'Crispy T-Rex Schenkel', 'Saftig, zart und knusprig – die Crispy T-Rex Schenkel sind der perfekte Genuss für alle, die es gerne würzig und knusprig mögen. Außen knusprig, innen saftig – einfach unwiderstehlich!', '20', 'Hauptgang', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3967, 'Fish & Chips', 'Klassisch britisch, aber immer beliebt – goldbraun frittierter Fisch, serviert mit knusprigen Pommes und einer frischen Zitrone. Dazu kommt eine würzige Tartarsauce zum Dippen. Ein Gericht, das niemals aus der Mode kommt!', '21', 'Hauptgang', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3968, 'Heart Stopper', 'Das größte, saftigste und vielleicht ungesundeste Burger-Gericht – der Name sagt alles. Wer hier zuschlägt, braucht einen kräftigen Magen.', '28', 'Hauptgang', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3969, 'Torpedo', 'Ein weiterer Burger – groß, fett und würzig, mit einer speziellen Sauce, die das Ganze zu einem echten Volltreffer macht. Für alle, die es richtig krachen lassen wollen.', '24', 'Hauptgang', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3970, 'Crispy Rex Menü', 'Hauptgang: Crispy T-Rex Schenkel – Zart, saftig und außen knusprig, der perfekte Genuss für alle, die es würzig und knusprig mögen.
Beilage: Pommes Frites Deluxe – Knusprige Pommes mit einer Auswahl an leckeren Dips wie Ketchup, Mayo und BBQ-Sauce.
Getränk: Rexlimonade oder Rex Milchshake – Deine Wahl zwischen einem erfrischenden, geheimnisvollen Getränk oder einem cremigen Rex-Milchshake.', '38', 'Menü', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3971, 'Dino Snack Menü', 'Hauptgang: Dino Nuggets – Saftig, goldbraun frittierte Dino Nuggets, ideal zum Dippen.
Beilage: Mozzarella-Sticks – Knusprig, goldbraun frittierte Mozzarella-Sticks, perfekt zum Dippen.
Getränk: Nach Wahl – Entscheide dich für Limonade oder einen cremigen Rex Milchshake.', '36', 'Menü', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3972, 'T-Rex Menü', 'Hauptgang: T-Rex Ribs – Zarte Rippchen, langsam gegart und mit rauchiger Barbecue-Sauce glasiert.
Beilage: Onion Rings – Klassische, goldbraun frittierte Zwiebelringe, die perfekt zu den Ribs passen.
Getränk: Nach Wahl – Wähle zwischen Limonade, oder einem erfrischenden Milchshake!', '46', 'Menü', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3973, 'Mini-Cheeseburger', 'Kleine, saftige Cheeseburger in Mini-Format. Ideal, um sie als Vorspeise zu genießen oder in geselliger Runde zu teilen.', '17', 'Vorspeise', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3974, 'Mozzarella-Sticks', 'Goldbraun frittierte Mozzarella-Sticks, die mit einer knusprigen Panade umhüllt sind. Perfekt zum Dippen in Marinara- oder BBQ-Sauce.', '19', 'Vorspeise', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/KjX4ss5F/Bild-2026-02-09-184036560-removebg-preview.png'), (3975, 'Pommes Frites Deluxe', 'Knusprige Pommes Frites, serviert mit einer Auswahl an leckeren Dips wie Ketchup, Mayo oder einer würzigen BBQ-Sauce. Das perfekte Einstiegsgericht, um den Fast Food-Vibe der 50er und 60er zu treffen.', '18', 'Vorspeise', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', 'https://i.ibb.co/dhzb9HZ/42994.png'), (3976, 'Reparatur', 'Die Reparatur Läuft Derzeit Über Speisekarte Bis Die werkstadt Seite Fertig ist ', '800', 'Werkstatt', '5.00', '2026-02-22 17:21:33.918056+00', '2026-02-22 17:21:33.918056+00', null);
