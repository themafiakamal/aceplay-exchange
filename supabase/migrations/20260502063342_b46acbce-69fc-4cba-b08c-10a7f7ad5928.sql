-- Make handle_new_user resilient: auto-suffix duplicate usernames and never fail signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  final_username text;
  suffix int := 0;
BEGIN
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  final_username := base_username;

  -- Resolve username collisions by appending a numeric suffix
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, phone, email, currency, referral_code)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'currency', 'BDT'),
    NEW.raw_user_meta_data->>'referral_code'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger actually exists on auth.users (it was missing — that's why signups failed and orphans were left)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up the orphaned profile from the failed signup attempt
DELETE FROM public.profiles
WHERE id = 'ac8d20f5-f6dd-40d5-aafb-84bc8e5c9f61'
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'ac8d20f5-f6dd-40d5-aafb-84bc8e5c9f61');