-- Migration: seed achievements matching the checkers in
-- src/services/AchievementService.ts. The four hand-written slugs
-- (first_quest, streak_7, streak_30, quest_100) match exactly; the
-- remaining entries use the generic trigger_type-driven checkers
-- (quest_count_n, streak_n, level_n, habit_completions_n).

INSERT INTO public.achievements (slug, title, description, icon_name, rarity, xp_bonus, trigger_type, trigger_value, is_secret, sort_order) VALUES
('first_quest',  'First Steps',          'Complete your first quest.',                 'Footprints', 'common',    50,  'quest_count', '{"count": 1}',    false, 1),
('streak_7',     'Week Warrior',         'Maintain a 7-day streak.',                   'Flame',      'rare',      100, 'streak',      '{"days": 7}',     false, 2),
('streak_30',    'Iron Will',            'Maintain a 30-day streak.',                  'Flame',      'epic',      300, 'streak',      '{"days": 30}',    false, 3),
('quest_100',    'Centurion',            'Complete 100 quests.',                       'Trophy',     'epic',      300, 'quest_count', '{"count": 100}',  false, 4),

('quest_count_n_10',  'Getting Started',     'Complete 10 quests.',                   'CheckCircle','common',    50,  'quest_count', '{"count": 10}',   false, 5),
('quest_count_n_500', 'Legendary Grind',     'Complete 500 quests.',                  'Crown',      'legendary', 1000,'quest_count', '{"count": 500}',  false, 6),

('streak_n_3',   'Building Momentum',   'Maintain a 3-day streak.',                   'Flame',      'common',    25,  'streak',      '{"days": 3}',     false, 7),
('streak_n_100', 'Unbreakable',          'Maintain a 100-day streak.',                 'Flame',      'legendary', 1000,'streak',      '{"days": 100}',   false, 8),

('level_n_10',   'Double Digits',        'Reach level 10.',                            'Star',       'common',    100, 'level',       '{"level": 10}',   false, 9),
('level_n_25',   'Rising Hunter',        'Reach level 25.',                            'Star',       'rare',      200, 'level',       '{"level": 25}',   false, 10),
('level_n_50',   'Master Rank',          'Reach level 50.',                            'Star',       'epic',      500, 'level',       '{"level": 50}',   false, 11),
('level_n_100',  'National Hero',        'Reach level 100.',                           'Crown',      'legendary', 2000,'level',       '{"level": 100}',  true,  12),

('habit_completions_n_50',  'Habit Builder',  'Log 50 total habit completions.',      'CheckCircle','common',    75,  'habit',       '{"totalCompletions": 50}',  false, 13),
('habit_completions_n_365', 'Year of Growth', 'Log 365 total habit completions.',     'Calendar',   'legendary', 1000,'habit',       '{"totalCompletions": 365}', false, 14)
ON CONFLICT (slug) DO NOTHING;
