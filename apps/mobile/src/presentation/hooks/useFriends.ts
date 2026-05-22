import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddFriendRequest } from "@mates/shared";
import { useApiClient } from "./useApiClient";

export function useFriends() {
  const api = useApiClient();

  return useQuery({
    queryKey: ["friends"],
    queryFn: () => api.listFriends()
  });
}

export function useAddFriend() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddFriendRequest) => api.addFriend(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["friends"] });
      await queryClient.invalidateQueries({ queryKey: ["friends", "requests", "received"] });
      await queryClient.invalidateQueries({ queryKey: ["friends", "requests", "sent"] });
    }
  });
}

export function useReceivedFriendRequests() {
  const api = useApiClient();

  return useQuery({
    queryKey: ["friends", "requests", "received"],
    queryFn: () => api.listReceivedFriendRequests()
  });
}

export function useSentFriendRequests() {
  const api = useApiClient();

  return useQuery({
    queryKey: ["friends", "requests", "sent"],
    queryFn: () => api.listSentFriendRequests()
  });
}

export function useAcceptFriendRequest() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendshipId: string) => api.acceptFriendRequest(friendshipId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["friends"] });
      await queryClient.invalidateQueries({ queryKey: ["friends", "requests", "received"] });
      await queryClient.invalidateQueries({ queryKey: ["friends", "requests", "sent"] });
    }
  });
}

export function useSearchUser(publicTag: string) {
  const api = useApiClient();

  return useQuery({
    queryKey: ["users", "search", publicTag],
    enabled: publicTag.trim().length >= 7,
    queryFn: () => api.searchUser(publicTag.trim())
  });
}
