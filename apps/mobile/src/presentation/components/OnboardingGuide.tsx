import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, Check, Hash, Inbox, MapPin, Send, Sparkles, UserPlus, Users } from "lucide-react-native";
import type { CurrentUserDto } from "@mates/shared";
import { AppButton } from "./AppButton";
import { useCompleteOnboarding } from "@/presentation/hooks/useOnboarding";
import { borders, colors, radii, spacing } from "@/shared/theme";

const steps = [
  {
    title: "Moins de messages.\nPlus de moments.",
    body: "Un café, un verre, un match ? Mates te permet de proposer un rendez-vous pour aujourd’hui et de voir qui te rejoint.",
    hint: "Un lieu + une heure + tes amis. C’est tout.",
    location: "Bienvenue dans Mates", icon: Sparkles, color: colors.yellow
  },
  {
    title: "Ton tag,\nton point de rencontre.",
    body: "Chaque compte a un identifiant unique. Partage le tien avec tes amis pour qu’ils puissent te retrouver, même si vous avez le même pseudo.",
    hint: "Tu retrouveras toujours ton tag dans Profil.",
    location: "Bouton Profil en haut de l’écran", icon: Hash, color: colors.blueSoft
  },
  {
    title: "Commence\npar ton crew.",
    body: "Dans Amis, appuie sur Ajouter un ami. Saisis son tag complet, puis envoie la demande. Vous pourrez vous inviter dès qu’il l’aura acceptée.",
    hint: "Tes demandes reçues et en attente sont dans Amis.",
    location: "Amis → Ajouter un ami", icon: UserPlus, color: colors.yellowSoft
  },
  {
    title: "Les bonnes personnes,\ndans le bon groupe.",
    body: "Dans Amis, ouvre Mes groupes, donne un nom à ton groupe et sélectionne au moins un ami actif. Retrouve-le ensuite dans Choisir mes invités pour sélectionner ses membres.",
    hint: "Tu peux modifier les membres en ouvrant le groupe.",
    location: "Amis → Mes groupes", icon: Users, color: colors.blueSoft
  },
  {
    title: "Lance le plan.\nOn se retrouve là-bas.",
    body: "Dans Proposer, choisis un lieu et une heure aujourd’hui. Ouvre Choisir mes invités, coche tes amis ou choisis un groupe, puis valide. Tous mes amis reste un choix explicite. Vérifie les noms avant d’envoyer.",
    hint: "Glisse la protection, puis maintiens le bouton pour envoyer.",
    location: "Proposer → Invités → Valider", icon: Send, color: colors.redSoft
  },
  {
    title: "Un oui, un non.\nEt tout le monde sait.",
    body: "Dans Sorties, À répondre affiche les invitations qui attendent ta réponse. Tu peux accepter, refuser ou préciser ton retard. Organisées te permet de suivre tes propres rendez-vous.",
    hint: "Tu es prêt. Le prochain bon moment commence avec toi.",
    location: "Sorties → À répondre / Organisées", icon: Inbox, color: colors.yellow
  }
] as const;

export function OnboardingGuide({ user }: { user: CurrentUserDto }) {
  const [index, setIndex] = useState(0);
  const complete = useCompleteOnboarding();
  const step = steps[index] ?? steps[0];
  const Icon = step.icon;
  const isLast = index === steps.length - 1;

  function finish() {
    if (!complete.isPending) complete.mutate();
  }

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={finish}>
      <SafeAreaView style={styles.scrim}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Sparkles size={14} color={colors.ink} />
              <Text style={styles.eyebrow}>LE PETIT GUIDE</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Passer le guide" disabled={complete.isPending} onPress={finish} hitSlop={8}>
              <Text style={styles.skip}>Passer</Text>
            </Pressable>
          </View>
          <ScrollView key={index} contentContainerStyle={styles.content}>
            <View style={[styles.preview, { backgroundColor: step.color }]}>
              <View style={styles.iconSticker}><Icon size={30} color={colors.ink} strokeWidth={2.5} /></View>
              {index === 1 ? (
                <View style={styles.previewCopy}>
                  <Text style={styles.exampleLabel}>TON IDENTIFIANT PUBLIC</Text>
                  <Text selectable style={styles.tag}>{user.publicTag}</Text>
                </View>
              ) : (
                <View style={styles.previewCopy}>
                  <Text style={styles.exampleLabel}>{index === 0 ? "LE PLAN EST SIMPLE" : "EXEMPLE"}</Text>
                  <Text style={styles.previewTitle}>{[
                    "Un café avec tes amis", "", "lea#1234", "Le crew du vendredi", "Un café · Aujourd’hui, 18:30", "Léa vient · Sam a 10 min de retard"
                  ][index]}</Text>
                  <View style={styles.previewCaption}>
                    {index === 0 || index === 4 ? <MapPin size={13} color={colors.ink} /> : <Check size={13} color={colors.ink} />}
                    <Text style={styles.previewSubtitle}>{[
                      "Un lieu. Une heure. On y va.", "", "Demande envoyée → Acceptée", "Tes amis actifs, réunis", "Diffusion : le crew du vendredi", "Les réponses sont au même endroit"
                    ][index]}</Text>
                  </View>
                </View>
              )}
            </View>
            <Text style={styles.title} accessibilityRole="header">{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            <View style={styles.location}><Text style={styles.locationText}>{step.location}</Text></View>
            <Text style={styles.hint}>{step.hint}</Text>
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.progressRow}>
              <View style={styles.dots} accessibilityLabel={`Étape ${index + 1} sur ${steps.length}`}>
                {steps.map((_, position) => <View key={position} style={[styles.dot, position === index ? styles.activeDot : null]} />)}
              </View>
              <Text style={styles.counter}>{index + 1} / {steps.length}</Text>
            </View>
            {complete.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>Le guide n’a pas pu être enregistré. Vérifie ta connexion, puis réessaie.</Text>
            ) : null}
            <View style={styles.actions}>
              {index > 0 ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Étape précédente" disabled={complete.isPending} onPress={() => setIndex(index - 1)} style={styles.back}>
                  <ArrowLeft size={21} color={colors.ink} />
                </Pressable>
              ) : null}
              <View style={styles.next}>
                <AppButton title={isLast ? "C’est parti !" : index === 0 ? "Montre-moi" : "Suivant"}
                  onPress={isLast ? finish : () => setIndex(index + 1)} loading={complete.isPending}
                  icon={isLast ? <Check size={18} color={colors.white} /> : <ArrowRight size={18} color={colors.white} />} />
              </View>
            </View>
            {complete.isError && !isLast ? (
              <Pressable accessibilityRole="button" onPress={finish}><Text style={styles.retry}>Réessayer de fermer le guide</Text></Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(7, 26, 45, 0.5)", justifyContent: "center", alignItems: "center", padding: spacing.md },
  card: { width: "100%", maxWidth: 440, maxHeight: "95%", backgroundColor: colors.surface, borderWidth: borders.heavy, borderColor: colors.ink, borderRadius: 20, shadowColor: colors.ink, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 0, elevation: 12, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, gap: spacing.sm },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.yellow, borderWidth: 1.5, borderColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  eyebrow: { fontSize: 11, fontWeight: "900", color: colors.ink, letterSpacing: 0.8 },
  skip: { fontSize: 13, fontWeight: "700", color: colors.muted, padding: spacing.xs },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  preview: { minHeight: 116, borderWidth: borders.regular, borderColor: colors.ink, borderRadius: radii.md, flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm },
  iconSticker: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.surface, borderWidth: borders.regular, borderColor: colors.ink, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] },
  previewCopy: { flex: 1, gap: 6 },
  exampleLabel: { color: colors.ink, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  previewTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  tag: { color: colors.primary, fontSize: 20, fontWeight: "900" },
  previewCaption: { flexDirection: "row", alignItems: "center", gap: 4 },
  previewSubtitle: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: "600" },
  title: { fontSize: 29, lineHeight: 34, fontWeight: "900", color: colors.ink, letterSpacing: -0.8 },
  body: { color: colors.text, fontSize: 15, lineHeight: 23 },
  location: { alignSelf: "flex-start", backgroundColor: colors.navyWash, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  locationText: { fontSize: 12, fontWeight: "800", color: colors.ink },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  footer: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: radii.pill, backgroundColor: colors.hairline },
  activeDot: { width: 24, backgroundColor: colors.primary },
  counter: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  back: { width: 56, height: 56, borderWidth: borders.regular, borderColor: colors.ink, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  next: { flex: 1 },
  error: { fontSize: 13, lineHeight: 19, color: colors.red },
  retry: { textAlign: "center", fontSize: 13, fontWeight: "700", color: colors.primary }
});
