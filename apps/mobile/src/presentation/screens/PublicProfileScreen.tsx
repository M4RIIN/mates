import { useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { validProfileTag, nativeProfileLink } from "@/domain/profile-links";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { useAddFriend, useFriends, useReceivedFriendRequests, useSearchUser, useSentFriendRequests } from "@/presentation/hooks/useFriends";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { LoginScreen } from "./LoginScreen";
import { colors, spacing } from "@/shared/theme";
import type { PublicUserDto } from "@mates/shared";

export function PublicProfileScreen({ tag: parameter }: { tag: unknown }) {
  const tag = validProfileTag(parameter);
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hasHydrated);
  const search = useSearchUser(tag ?? "");
  const [signingIn, setSigningIn] = useState(false);
  const [openError, setOpenError] = useState(false);

  // The profile URL remains the destination throughout login and registration.
  if (tag && signingIn && hydrated && !token) {
    return <LoginScreen returnTo={{ pathname: "/u/[tag]", params: { tag } }} />;
  }

  return <Screen>
    <PageHeader title="Profil partagé" eyebrow="Mates" subtitle="Retrouve tes proches pour organiser vos prochaines sorties." tone="blue" compact />
    {!tag ? <Text accessibilityRole="alert" style={styles.body}>Ce lien de profil est invalide.</Text> : null}
    {tag && (search.isLoading || !hydrated) ? <ActivityIndicator accessibilityLabel="Chargement du profil" color={colors.primary} /> : null}
    {tag && search.isError ? <><Text accessibilityRole="alert" style={styles.body}>Impossible de charger ce profil.</Text><AppButton title="Réessayer" onPress={() => { void search.refetch(); }} /></> : null}
    {tag && search.data === null ? <Text style={styles.body}>Ce profil est introuvable. Vérifie l’identifiant auprès de ton ami.</Text> : null}
    {tag && search.data && hydrated && !search.isError ? <>
      <Text accessibilityRole="header" style={styles.name}>{search.data.pseudo}</Text>
      <Text selectable style={styles.body}>{search.data.publicTag}</Text>
      {token ? <FriendRequestAction key={tag} profile={search.data} /> : <>
        <Text style={styles.body}>Connecte-toi ou crée ton compte pour envoyer une demande d’amitié à cette personne.</Text>
        <AppButton title="Se connecter ou s’inscrire" onPress={() => setSigningIn(true)} />
      </>}
      {Platform.OS === "web" ? <>
        <AppButton title="Ouvrir dans l’application" variant="secondary" onPress={() => { setOpenError(false); void Linking.openURL(nativeProfileLink(tag)).catch(() => setOpenError(true)); }} />
        <Text style={styles.body}>{openError ? "L’ouverture a échoué. Continue ici dans ton navigateur." : "L’application doit être installée. Tu peux aussi continuer ici."}</Text>
      </> : null}
    </> : null}
  </Screen>;
}

function FriendRequestAction({ profile }: { profile: PublicUserDto }) {
  const me = useAuthStore((state) => state.user);
  const friends = useFriends();
  const sent = useSentFriendRequests();
  const received = useReceivedFriendRequests();
  const mutation = useAddFriend();
  const sending = useRef(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const own = me?.id === profile.id;
  const alreadyFriends = friends.data?.some((friend) => friend.id === profile.id);
  const outgoing = sent.data?.some((request) => request.addressee.id === profile.id && request.status === "pending");
  const incoming = received.data?.some((request) => request.requester.id === profile.id && request.status === "pending");
  const failed = friends.isError || sent.isError || received.isError;
  const loading = friends.isFetching || sent.isFetching || received.isFetching;
  async function send() {
    if (sending.current || own || alreadyFriends || outgoing || incoming || done || loading || failed) return;
    sending.current = true;
    setError(null);
    try {
      await mutation.mutateAsync({ publicTag: profile.publicTag });
      setDone(true);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      sending.current = false;
    }
  }
  if (own) return <><Text style={styles.body}>C’est ton profil.</Text><AppButton title="Voir mon profil" onPress={() => router.push("/profile")} /></>;
  if (done || outgoing) return <Text accessibilityLiveRegion="polite" style={styles.body}>Demande envoyée. Cette personne doit l’accepter pour devenir ton amie.</Text>;
  if (alreadyFriends || incoming) return <><Text style={styles.body}>{alreadyFriends ? "Vous êtes déjà amis." : "Cette personne t’a déjà envoyé une demande. Retrouve-la dans Amis pour y répondre."}</Text><AppButton title="Voir dans Amis" onPress={() => router.push("/friends")} /></>;
  return <View style={styles.actions}>
    <Text style={styles.body}>La demande ne devient une amitié qu’après acceptation.</Text>
    {loading ? <Text style={styles.body}>Vérification des demandes…</Text> : null}
    {failed ? <><Text accessibilityRole="alert" style={styles.body}>Impossible de vérifier tes amis et demandes.</Text><AppButton title="Réessayer" variant="secondary" onPress={() => { void friends.refetch(); void sent.refetch(); void received.refetch(); }} /></> : null}
    {error ? <Text accessibilityRole="alert" style={styles.body}>{error}</Text> : null}
    <AppButton title="Envoyer une demande d’amitié" onPress={send} loading={mutation.isPending} disabled={loading || failed} />
  </View>;
}

const styles = StyleSheet.create({
  name: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  actions: { gap: spacing.sm }
});
