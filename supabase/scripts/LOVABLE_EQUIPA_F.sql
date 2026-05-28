GRANT EXECUTE ON FUNCTION public.user_manages_store_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_team_at_store(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_team_member_to_store(uuid, public.app_role, uuid, uuid) TO authenticated;

SELECT 'F OK — Parte 1 terminada' AS passo;
