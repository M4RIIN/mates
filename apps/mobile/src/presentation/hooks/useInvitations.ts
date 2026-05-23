import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateInvitationRequest, RespondToInvitationRequest } from "@mates/shared";
import { useApiClient } from "./useApiClient";

export function useCreatedInvitations() {
  const api = useApiClient();

  return useQuery({
    queryKey: ["invitations", "created"],
    queryFn: () => api.listCreatedInvitations()
  });
}

export function useActiveCreatedInvitation() {
  const api = useApiClient();

  return useQuery({
    queryKey: ["invitations", "created", "active"],
    queryFn: () => api.getActiveCreatedInvitation()
  });
}

export function useReceivedInvitations() {
  const api = useApiClient();

  return useQuery({
    queryKey: ["invitations", "received"],
    queryFn: () => api.listReceivedInvitations()
  });
}

export function useInvitationDetails(id: string | undefined) {
  const api = useApiClient();

  return useQuery({
    queryKey: ["invitations", id],
    enabled: id !== undefined,
    queryFn: () => api.getInvitation(id ?? "")
  });
}

export function useCreateInvitation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvitationRequest) => api.createInvitation(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invitations", "created"] }),
        queryClient.invalidateQueries({ queryKey: ["invitations", "created", "active"] }),
        queryClient.invalidateQueries({ queryKey: ["invitations", "received"] })
      ]);
    }
  });
}

export function useRespondToInvitation(id: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RespondToInvitationRequest) => api.respondToInvitation(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invitations", id] }),
        queryClient.invalidateQueries({ queryKey: ["invitations", "created", "active"] }),
        queryClient.invalidateQueries({ queryKey: ["invitations", "received"] }),
        queryClient.invalidateQueries({ queryKey: ["invitations", "created"] })
      ]);
    }
  });
}

export function useCancelInvitation(id: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.cancelInvitation(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invitations", id] }),
        queryClient.invalidateQueries({ queryKey: ["invitations", "created"] }),
        queryClient.invalidateQueries({ queryKey: ["invitations", "created", "active"] }),
        queryClient.invalidateQueries({ queryKey: ["invitations", "received"] })
      ]);
    }
  });
}
