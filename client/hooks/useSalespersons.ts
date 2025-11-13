import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSalespersons, addSalesperson } from "@/lib/supabase";
import { Salesperson } from "@/lib/supabase";

/**
 * Hook to fetch all salespersons with React Query
 */
export function useSalespersons() {
  return useQuery({
    queryKey: ["salespersons"],
    queryFn: getSalespersons,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to add a new salesperson
 */
export function useAddSalesperson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      salesperson: Omit<Salesperson, "id" | "createdAt" | "updatedAt">,
    ) => addSalesperson(salesperson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salespersons"] });
    },
  });
}
