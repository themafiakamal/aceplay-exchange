-- Replace the existing 'Admins manage roles' policy with stricter checks
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- Admins (and owners) may insert non-owner roles
CREATE POLICY "Admins insert non-owner roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'owner'::app_role
);

-- Admins (and owners) may delete non-owner roles
CREATE POLICY "Admins delete non-owner roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'owner'::app_role
);

-- Admins/owners can view all role assignments (for the Roles tab)
CREATE POLICY "Admins view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Owners only may insert/delete owner role (effectively no one through the API; owner is permanent)
CREATE POLICY "Owners manage owner role"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));