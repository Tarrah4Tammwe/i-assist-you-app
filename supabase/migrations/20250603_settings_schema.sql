-- Settings screens schema migration
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/luyknuzzctygtyhefliv/sql

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name          text,
  ADD COLUMN IF NOT EXISTS pronouns              text,
  ADD COLUMN IF NOT EXISTS avatar_color          text DEFAULT '#d4a853',
  ADD COLUMN IF NOT EXISTS assistant_name        text DEFAULT 'Nova',
  ADD COLUMN IF NOT EXISTS assistant_personality text DEFAULT 'nova',
  ADD COLUMN IF NOT EXISTS wake_time             text DEFAULT '07:30',
  ADD COLUMN IF NOT EXISTS wind_down_time        text DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS transition_buffer     int  DEFAULT 10,
  ADD COLUMN IF NOT EXISTS get_ready_mins        int  DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_plan_blocks       int  DEFAULT 10,
  ADD COLUMN IF NOT EXISTS referral_code         text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by           text;

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  label text NOT NULL, type text CHECK (type IN ('home','work','other')) DEFAULT 'other',
  address text NOT NULL, created_at timestamptz DEFAULT now()
);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locations_own" ON locations;
CREATE POLICY "locations_own" ON locations USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS kit_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL, created_at timestamptz DEFAULT now()
);
ALTER TABLE kit_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kit_lists_own" ON kit_lists;
CREATE POLICY "kit_lists_own" ON kit_lists USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS kit_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_list_id uuid REFERENCES kit_lists(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL, active boolean DEFAULT true, sort_order int DEFAULT 0, created_at timestamptz DEFAULT now()
);
ALTER TABLE kit_list_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kit_items_own" ON kit_list_items;
CREATE POLICY "kit_items_own" ON kit_list_items
  USING (EXISTS (SELECT 1 FROM kit_lists k WHERE k.id=kit_list_id AND k.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM kit_lists k WHERE k.id=kit_list_id AND k.user_id=auth.uid()));

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users NOT NULL, referred_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(), reward_given boolean DEFAULT false
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_own" ON referrals;
CREATE POLICY "referrals_own" ON referrals USING (auth.uid()=referrer_id);
