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
