import { useLocalSearchParams } from "expo-router";

export function useRouteId(): string | undefined {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = params.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
}
