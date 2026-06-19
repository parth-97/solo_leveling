-- Migration: seed quest_templates so /api/v1/quests/daily (generate_daily_quests)
-- has rows to select from. Without this, generate_daily_quests returns 0 rows
-- and GET /quests/daily would always be empty.
--
-- Categories referenced here are the system categories seeded by
-- 01_schema_and_tables.sql (fitness, learning, mindfulness, health,
-- career, skills, social, finance).

INSERT INTO public.quest_templates (category_id, title, description, difficulty, xp_reward, min_level, max_level, weight)
SELECT c.id, t.title, t.description, t.difficulty::quest_difficulty, t.xp_reward, t.min_level, t.max_level::INT, t.weight
FROM (VALUES
  -- Fitness
  ('fitness',     'Morning Workout',        'Complete a 20-minute workout session.',            'normal',    50,  1,   NULL, 100),
  ('fitness',     'Take a Walk',             'Go for a 15-minute walk outside.',                  'easy',      25,  1,   NULL, 120),
  ('fitness',     'Stretch Session',         'Spend 10 minutes stretching.',                      'easy',      20,  1,   NULL, 100),
  ('fitness',     'Push-Up Challenge',       'Do 3 sets of push-ups to failure.',                 'hard',       80,  5,   NULL, 60),
  ('fitness',     'Run 5K',                  'Complete a 5km run.',                               'elite',     150, 10,  NULL, 30),

  -- Learning
  ('learning',    'Read 20 Pages',           'Read at least 20 pages of a book.',                 'easy',      25,  1,   NULL, 110),
  ('learning',    'Learn Something New',     'Spend 30 minutes learning a new skill or topic.',   'normal',    50,  1,   NULL, 100),
  ('learning',    'Watch an Educational Video','Watch a documentary or educational video.',       'easy',      20,  1,   NULL, 90),
  ('learning',    'Practice a Language',     'Spend 15 minutes on language practice.',            'normal',    45,  1,   NULL, 80),
  ('learning',    'Deep Work Session',       'Complete a 90-minute focused study session.',       'hard',       90,  8,   NULL, 40),

  -- Mindfulness
  ('mindfulness', 'Meditate',                'Meditate for 10 minutes.',                          'easy',      25,  1,   NULL, 100),
  ('mindfulness', 'Gratitude Journal',       'Write down 3 things you are grateful for.',         'easy',      20,  1,   NULL, 110),
  ('mindfulness', 'Digital Detox Hour',      'Spend 1 hour with no screens.',                      'normal',    50,  1,   NULL, 70),
  ('mindfulness', 'Breathing Exercise',      'Complete a 5-minute breathing exercise.',           'easy',      20,  1,   NULL, 100),

  -- Health
  ('health',      'Drink 8 Glasses of Water','Stay hydrated throughout the day.',                 'easy',      20,  1,   NULL, 120),
  ('health',      'Eat a Healthy Meal',      'Prepare and eat a nutritious meal.',                'easy',      25,  1,   NULL, 100),
  ('health',      'Sleep 8 Hours',           'Get a full 8 hours of sleep.',                       'normal',    40,  1,   NULL, 90),
  ('health',      'No Junk Food Day',        'Avoid processed/junk food for the whole day.',       'hard',       70,  5,   NULL, 50),

  -- Career
  ('career',      'Plan Tomorrow',           'Write out your top 3 priorities for tomorrow.',     'easy',      20,  1,   NULL, 100),
  ('career',      'Inbox Zero',              'Clear your email inbox to zero.',                   'normal',    45,  1,   NULL, 70),
  ('career',      'Networking',              'Reach out to one professional contact.',            'normal',    50,  3,   NULL, 50),
  ('career',      'Skill Building',          'Spend 30 minutes improving a work-related skill.',  'hard',       80,  5,   NULL, 50),

  -- Skills
  ('skills',      'Practice an Instrument',  'Practice a musical instrument for 20 minutes.',     'normal',    50,  1,   NULL, 60),
  ('skills',      'Creative Project',        'Spend 30 minutes on a creative project.',           'normal',    50,  1,   NULL, 70),
  ('skills',      'Code Practice',           'Solve a coding problem or build something small.',  'hard',       85,  3,   NULL, 60),

  -- Social
  ('social',      'Call a Friend',           'Have a meaningful conversation with a friend.',     'easy',      30,  1,   NULL, 90),
  ('social',      'Help Someone',            'Do something kind for someone else today.',        'normal',    45,  1,   NULL, 80),
  ('social',      'Family Time',             'Spend quality time with family.',                   'easy',      35,  1,   NULL, 90),

  -- Finance
  ('finance',     'Track Spending',          'Log all your expenses for the day.',                'easy',      25,  1,   NULL, 90),
  ('finance',     'No-Spend Day',            'Go a full day without any non-essential purchases.', 'hard',      75,  5,   NULL, 50),
  ('finance',     'Review Budget',           'Review your budget and savings progress.',          'normal',    40,  1,   NULL, 70),

  -- Bonus / high-level
  ('fitness',     'Hunter''s Trial',         'A grueling full-body workout for the dedicated.',   'legendary', 250, 20,  NULL, 15),
  ('learning',    'Master Class',            'Complete an in-depth lesson or course module.',     'legendary', 250, 20,  NULL, 15)
) AS t(category_slug, title, description, difficulty, xp_reward, min_level, max_level, weight)
JOIN public.categories c ON c.slug = t.category_slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.quest_templates qt WHERE qt.title = t.title
);
