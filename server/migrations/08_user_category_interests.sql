-- ============================================================
-- OPTIONAL MIGRATION: user_category_interests
-- Stores the category preferences selected during onboarding.
--
-- Currently the onboarding route accepts categoryIds but drops them
-- (noted in the route's docstring). Apply this migration and then
-- update server/src/app/api/v1/onboarding/complete/route.ts to
-- persist the rows (see onboarding_categories_fix.ts).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_category_interests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, category_id)
);

ALTER TABLE public.user_category_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_category_interests_select_own"
  ON public.user_category_interests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_category_interests_insert_own"
  ON public.user_category_interests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_category_interests_delete_own"
  ON public.user_category_interests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_category_interests_user
  ON public.user_category_interests(user_id);
