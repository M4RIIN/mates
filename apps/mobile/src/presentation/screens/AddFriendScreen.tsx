import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { ListRow } from "@/presentation/components/ListRow";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useAddFriend, useSearchUser } from "@/presentation/hooks/useFriends";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { colors, spacing } from "@/shared/theme";

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
      <Text style={styles.title}>Ajouter un ami</Text>
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
        icon={<UserPlus size={18} color="#FFFFFF" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  result: {
    minHeight: 72,
    gap: spacing.sm
  },
  muted: {
    color: colors.muted
  }
});
