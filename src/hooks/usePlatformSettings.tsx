import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type PlatformSettings = Tables<"platform_settings">;

export function usePlatformSettings() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["platform_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (patch: TablesUpdate<"platform_settings">) => {
      if (!query.data?.id) throw new Error("Configurações ainda não carregadas");
      const { error } = await supabase
        .from("platform_settings")
        .update(patch)
        .eq("id", query.data.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform_settings"] }),
  });

  return { settings: query.data, isLoading: query.isLoading, save: mutation.mutateAsync, isSaving: mutation.isPending };
}