import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getLeads, addLead, updateLead } from "@/lib/supabase";
import { Lead } from "@/lib/supabase";

/**
 * Hook to fetch all leads with React Query
 */
export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: getLeads,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to add a new lead
 */
export function useAddLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) =>
      addLead(lead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

/**
 * Hook to update a lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      updates,
    }: {
      leadId: string;
      updates: Partial<Lead>;
    }) => updateLead(leadId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

/**
 * Hook to subscribe to real-time lead updates
 */
export function useLeadSubscription() {
  const queryClient = useQueryClient();

  // Subscribe to changes and update cache
  supabase
    .from("leads")
    .on("*", () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    })
    .subscribe();
}
