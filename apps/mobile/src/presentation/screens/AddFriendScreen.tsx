import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useAddFriend, useSearchUser } from "@/presentation/hooks/useFriends";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function AddFriendScreen() {
  const [publicTag, setPublicTag] = useState("");
  const search = useSearchUser(publicTag);
  const addFriend = useAddFriend();

  async function submit() {
    try {
      await addFriend.mutateAsync({ publicTag: publicTag.trim() });
      router.back();
    } catch (error: unknown) {
      Alert.alert("Ajout impossible", getErrorMessage(error));
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="Nouveau contact" title="Ajouter un ami" subtitle="Recherche par identifiant public." tone="yellow" compact />
      <TextField label="Identifiant public" value={publicTag} onChangeText={setPublicTag} placeholder="pseudo#7647" />
      <View style={styles.result}>
        {search.data !== undefined && search.data !== null ? (
          <ListRow title={search.data.pseudo} subtitle={search.data.publicTag} />
        ) : null}
        {search.data === null ? <Text style={styles.muted}>Aucun utilisateur trouvé.</Text> : null}
      </View>
      <AppButton
        title="Ajouter"
        onPress={submit}
        loading={addFriend.isPending}
        disabled={publicTag.trim().length < 7}
        variant="success"
        icon={<UserPlus size={18} color={colors.ink} strokeWidth={3} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  result: {
    minHeight: 80,
    gap: spacing.sm,
    justifyContent: "center"
  },
  muted: {
    alignSelf: "flex-start",
    color: colors.text,
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.redSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 13,
    fontWeight: "900"
  }
});
