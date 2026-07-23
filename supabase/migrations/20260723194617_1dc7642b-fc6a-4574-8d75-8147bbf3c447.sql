
-- =========================================================
-- Enums
-- =========================================================
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.workout_category AS ENUM ('strength', 'cardio', 'hiit', 'yoga', 'mobility', 'full_body');
CREATE TYPE public.equipment_type AS ENUM ('none', 'home', 'gym');
CREATE TYPE public.activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE public.meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- =========================================================
-- Profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  height_cm NUMERIC,
  starting_weight_kg NUMERIC,
  current_weight_kg NUMERIC,
  goal_weight_kg NUMERIC,
  activity_level public.activity_level DEFAULT 'moderate',
  daily_calorie_goal INTEGER DEFAULT 2000,
  daily_water_goal_l NUMERIC DEFAULT 2.5,
  daily_workout_goal INTEGER DEFAULT 1,
  streak_count INTEGER DEFAULT 0,
  last_activity_date DATE,
  coach_questions_today INTEGER DEFAULT 0,
  coach_questions_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Workouts + exercises (public catalog)
-- =========================================================
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category public.workout_category NOT NULL DEFAULT 'full_body',
  difficulty public.difficulty_level NOT NULL DEFAULT 'beginner',
  equipment public.equipment_type NOT NULL DEFAULT 'none',
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  estimated_calories INTEGER DEFAULT 200,
  muscle_groups TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  video_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workouts TO anon, authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads workouts" ON public.workouts FOR SELECT USING (true);

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10',
  rest_seconds INTEGER DEFAULT 60,
  instructions TEXT,
  order_index INTEGER DEFAULT 0
);
GRANT SELECT ON public.exercises TO anon, authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads exercises" ON public.exercises FOR SELECT USING (true);

-- Workout sessions (user)
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  calories_burned INTEGER,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workout_id)
);
GRANT SELECT, INSERT, DELETE ON public.workout_favorites TO authenticated;
GRANT ALL ON public.workout_favorites TO service_role;
ALTER TABLE public.workout_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own favorites" ON public.workout_favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Nutrition
-- =========================================================
CREATE TABLE public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type public.meal_type DEFAULT 'snack',
  name TEXT NOT NULL,
  calories INTEGER DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  fiber_g NUMERIC DEFAULT 0,
  servings NUMERIC DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_logs TO authenticated;
GRANT ALL ON public.food_logs TO service_role;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own food logs" ON public.food_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_ml INTEGER NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own water logs" ON public.water_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own weight logs" ON public.weight_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Recipes
-- =========================================================
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_minutes INTEGER DEFAULT 10,
  cook_minutes INTEGER DEFAULT 20,
  servings INTEGER DEFAULT 2,
  calories_per_serving INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  fiber_g NUMERIC,
  dietary_tags TEXT[] DEFAULT '{}',
  ingredients JSONB DEFAULT '[]'::jsonb,
  instructions JSONB DEFAULT '[]'::jsonb,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipes TO anon, authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads recipes" ON public.recipes FOR SELECT USING (true);

CREATE TABLE public.recipe_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);
GRANT SELECT, INSERT, DELETE ON public.recipe_favorites TO authenticated;
GRANT ALL ON public.recipe_favorites TO service_role;
ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own recipe favorites" ON public.recipe_favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Community
-- =========================================================
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organizer TEXT,
  location TEXT,
  meeting_day TEXT,
  meeting_time TEXT,
  cover_image_url TEXT,
  whatsapp_url TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.communities TO anon, authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads communities" ON public.communities FOR SELECT USING (true);

CREATE TABLE public.community_members (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own memberships insert/delete" ON public.community_members FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Coach messages
-- =========================================================
CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own coach messages" ON public.coach_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Daily quotes & tips
-- =========================================================
CREATE TABLE public.daily_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  author TEXT
);
GRANT SELECT ON public.daily_quotes TO anon, authenticated;
GRANT ALL ON public.daily_quotes TO service_role;
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads quotes" ON public.daily_quotes FOR SELECT USING (true);

CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT DEFAULT 'general'
);
GRANT SELECT ON public.tips TO anon, authenticated;
GRANT ALL ON public.tips TO service_role;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads tips" ON public.tips FOR SELECT USING (true);

-- =========================================================
-- Seed data
-- =========================================================
INSERT INTO public.daily_quotes (text, author) VALUES
('Your health is your best partner.', 'NutriFit'),
('The body achieves what the mind believes.', 'Napoleon Hill'),
('Take care of your body. It''s the only place you have to live.', 'Jim Rohn'),
('Small steps every day lead to big changes.', 'Anonymous'),
('Strength does not come from the body. It comes from the will.', 'Gandhi');

INSERT INTO public.tips (text, category) VALUES
('Drink a glass of water right after waking up to kickstart your metabolism.', 'hydration'),
('Aim for at least 25g of protein per meal to support muscle recovery.', 'nutrition'),
('A 10-minute walk after each meal helps regulate blood sugar.', 'activity'),
('Sleep 7-9 hours nightly — recovery is when your gains happen.', 'recovery'),
('Meal prep on Sunday to stay consistent with nutrition during the week.', 'nutrition');

-- Workouts
INSERT INTO public.workouts (id, title, description, category, difficulty, equipment, duration_minutes, estimated_calories, muscle_groups, video_url) VALUES
('11111111-1111-1111-1111-111111111111','Full Body Blast','A quick full-body circuit you can do anywhere.','full_body','beginner','none',20,180,ARRAY['legs','core','arms'],'https://www.w3schools.com/html/mov_bbb.mp4'),
('22222222-2222-2222-2222-222222222222','HIIT Fat Burner','High-intensity intervals to torch calories fast.','hiit','intermediate','none',25,320,ARRAY['full body'],'https://www.w3schools.com/html/mov_bbb.mp4'),
('33333333-3333-3333-3333-333333333333','Upper Body Strength','Build a stronger chest, back, and arms.','strength','intermediate','gym',45,380,ARRAY['chest','back','arms'],'https://www.w3schools.com/html/mov_bbb.mp4'),
('44444444-4444-4444-4444-444444444444','Morning Yoga Flow','Gentle mobility flow to start your day energized.','yoga','beginner','none',15,90,ARRAY['full body'],'https://www.w3schools.com/html/mov_bbb.mp4'),
('55555555-5555-5555-5555-555555555555','Leg Day Crusher','Squats, lunges, and glute work for serious leg gains.','strength','advanced','gym',50,450,ARRAY['legs','glutes'],'https://www.w3schools.com/html/mov_bbb.mp4');

INSERT INTO public.exercises (workout_id, name, sets, reps, rest_seconds, order_index) VALUES
('11111111-1111-1111-1111-111111111111','Bodyweight Squats',3,'15',45,1),
('11111111-1111-1111-1111-111111111111','Push-ups',3,'10',45,2),
('11111111-1111-1111-1111-111111111111','Plank',3,'30 sec',45,3),
('11111111-1111-1111-1111-111111111111','Jumping Jacks',3,'30',30,4),
('22222222-2222-2222-2222-222222222222','Burpees',4,'12',30,1),
('22222222-2222-2222-2222-222222222222','Mountain Climbers',4,'40',30,2),
('22222222-2222-2222-2222-222222222222','High Knees',4,'40',30,3),
('33333333-3333-3333-3333-333333333333','Bench Press',4,'8',90,1),
('33333333-3333-3333-3333-333333333333','Bent-over Rows',4,'10',90,2),
('33333333-3333-3333-3333-333333333333','Overhead Press',3,'10',75,3),
('44444444-4444-4444-4444-444444444444','Cat-Cow',2,'10',30,1),
('44444444-4444-4444-4444-444444444444','Downward Dog',3,'45 sec',30,2),
('44444444-4444-4444-4444-444444444444','Warrior II',2,'30 sec each',30,3),
('55555555-5555-5555-5555-555555555555','Back Squats',5,'8',120,1),
('55555555-5555-5555-5555-555555555555','Romanian Deadlifts',4,'10',90,2),
('55555555-5555-5555-5555-555555555555','Walking Lunges',3,'12 each',75,3),
('55555555-5555-5555-5555-555555555555','Glute Bridges',3,'15',60,4);

-- Recipes
INSERT INTO public.recipes (title, description, prep_minutes, cook_minutes, servings, calories_per_serving, protein_g, carbs_g, fat_g, fiber_g, dietary_tags, ingredients, instructions) VALUES
('Protein Power Oats','Creamy oats loaded with protein and berries.',5,5,1,420,32,55,10,8,ARRAY['vegetarian','high-protein'],
 '[{"item":"Rolled oats","amount":"60g"},{"item":"Whey protein","amount":"1 scoop"},{"item":"Almond milk","amount":"250ml"},{"item":"Mixed berries","amount":"100g"},{"item":"Honey","amount":"1 tsp"}]'::jsonb,
 '["Combine oats and almond milk in a pot.","Simmer for 5 min stirring occasionally.","Off heat, stir in protein powder.","Top with berries and honey."]'::jsonb),
('Grilled Chicken Bowl','Lean chicken with rice, avocado, and veggies.',10,20,2,560,42,55,18,7,ARRAY['high-protein','gluten-free'],
 '[{"item":"Chicken breast","amount":"300g"},{"item":"Brown rice","amount":"200g cooked"},{"item":"Avocado","amount":"1"},{"item":"Cherry tomatoes","amount":"150g"},{"item":"Olive oil","amount":"1 tbsp"}]'::jsonb,
 '["Season and grill chicken 6-8 min per side.","Slice avocado and halve tomatoes.","Assemble bowls with rice base, sliced chicken, and veggies.","Drizzle with olive oil."]'::jsonb),
('Green Smoothie','Spinach, banana, and peanut butter energy boost.',5,0,1,310,18,38,10,6,ARRAY['vegetarian','vegan-optional'],
 '[{"item":"Spinach","amount":"1 handful"},{"item":"Banana","amount":"1"},{"item":"Peanut butter","amount":"1 tbsp"},{"item":"Oat milk","amount":"250ml"},{"item":"Protein powder","amount":"1 scoop (optional)"}]'::jsonb,
 '["Add everything to a blender.","Blend until smooth.","Serve immediately."]'::jsonb),
('Salmon & Sweet Potato','Omega-3 rich salmon with roasted sweet potato.',10,25,2,540,38,45,20,6,ARRAY['gluten-free','pescatarian'],
 '[{"item":"Salmon fillet","amount":"2 x 150g"},{"item":"Sweet potato","amount":"2 medium"},{"item":"Broccoli","amount":"200g"},{"item":"Lemon","amount":"1"},{"item":"Olive oil","amount":"1 tbsp"}]'::jsonb,
 '["Preheat oven to 200C.","Cube sweet potato, toss in oil, roast 20 min.","Add salmon and broccoli, roast another 12 min.","Squeeze lemon over before serving."]'::jsonb),
('Overnight Chia Pudding','Prep-ahead pudding with chia, oats, and berries.',5,0,1,340,14,42,12,12,ARRAY['vegetarian','high-fiber'],
 '[{"item":"Chia seeds","amount":"3 tbsp"},{"item":"Rolled oats","amount":"30g"},{"item":"Almond milk","amount":"200ml"},{"item":"Maple syrup","amount":"1 tsp"},{"item":"Berries","amount":"80g"}]'::jsonb,
 '["Mix all ingredients (except berries) in a jar.","Refrigerate overnight.","Top with berries and enjoy."]'::jsonb);

-- Communities
INSERT INTO public.communities (name, description, organizer, location, meeting_day, meeting_time, whatsapp_url) VALUES
('UJ Runners','Weekly run around campus — all levels welcome.','Sipho M.','University of Johannesburg','Saturday','06:00','https://chat.whatsapp.com/example-uj'),
('Sandton Yoga Circle','Sunrise yoga in the park.','Amara K.','Sandton Central Park','Sunday','07:00','https://chat.whatsapp.com/example-yoga'),
('Iron Sisters JHB','Women''s strength training meetup.','Thandi P.','Rosebank Virgin Active','Wednesday','18:30','https://chat.whatsapp.com/example-iron'),
('Cape Town Cyclists','Weekend group rides along the coast.','Jason V.','Sea Point Promenade','Saturday','06:30','https://chat.whatsapp.com/example-cycle');
