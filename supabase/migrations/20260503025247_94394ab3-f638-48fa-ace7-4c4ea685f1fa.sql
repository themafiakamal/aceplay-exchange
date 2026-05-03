-- Fix: grant execute on has_role so RLS policies can evaluate
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Grant admin role to the current primary owner accounts
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE email IN ('thumahkamal@gmail.com','themafiakamal@gmail.com','mdkamalhossen@rex9.user','kamal@rex9.user')
ON CONFLICT DO NOTHING;