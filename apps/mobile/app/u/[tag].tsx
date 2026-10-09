import { useLocalSearchParams } from "expo-router";
import { PublicProfileScreen } from "@/presentation/screens/PublicProfileScreen";

export default function PublicProfileRoute() {
  const { tag } = useLocalSearchParams<{ tag?: string | string[] }>();
  return <PublicProfileScreen tag={tag} />;
}
