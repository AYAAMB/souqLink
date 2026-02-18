import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, TextInput, Modal, Platform, ScrollView, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const response = await apiRequest("PUT", `/api/users?id=${encodeURIComponent(user?.id || "")}`, data);

      return response.json();
    },
    onSuccess: () => {
      refreshUser?.();
      setEditModalVisible(false);
      if (Platform.OS !== "web") {
        Alert.alert("Succès", "Profil mis à jour avec succès");
      }
    },
    onError: () => {
      if (Platform.OS !== "web") {
        Alert.alert("Erreur", "Impossible de mettre à jour le profil");
      }
    },
  });

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
    } else {
      Alert.alert(
        "Déconnexion",
        "Êtes-vous sûr de vouloir vous déconnecter ?",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Déconnexion", style: "destructive", onPress: logout },
        ]
      );
    }
  };

  const handleEditProfile = () => {
    setEditName(user?.name || "");
    setEditPhone(user?.phone || "");
    setEditModalVisible(true);
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      if (Platform.OS !== "web") {
        Alert.alert("Erreur", "Le nom est requis");
      }
      return;
    }
    updateProfileMutation.mutate({ name: editName.trim(), phone: editPhone.trim() });
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "customer": return "Client";
      case "courier": return "Livreur";
      case "admin": return "Administrateur";
      default: return role;
    }
  };

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText type="h2" style={{ color: "#FFFFFF" }}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </ThemedText>
          </View>
          <ThemedText type="h3" style={styles.name}>
            {user?.name}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {user?.email}
          </ThemedText>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.infoRow}>
            <Feather name="phone" size={20} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.infoText}>
              {user?.phone || "Non renseigné"}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Feather name="user" size={20} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.infoText}>
              {getRoleName(user?.role || "customer")}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable style={styles.menuItem} onPress={handleEditProfile}>
            <Feather name="edit-2" size={20} color={theme.text} />
            <ThemedText type="body" style={styles.menuText}>
              Modifier le profil
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.menuItem} onPress={() => setHelpModalVisible(true)}>
            <Feather name="help-circle" size={20} color={theme.text} />
            <ThemedText type="body" style={styles.menuText}>
              Aide et support
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.menuItem} onPress={() => setTermsModalVisible(true)}>
            <Feather name="file-text" size={20} color={theme.text} />
            <ThemedText type="body" style={styles.menuText}>
              Conditions d'utilisation
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.menuItem} onPress={() => setPrivacyModalVisible(true)}>
            <Feather name="shield" size={20} color={theme.text} />
            <ThemedText type="body" style={styles.menuText}>
              Politique de confidentialité
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <Button onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.error }]}>
          Déconnexion
        </Button>

        <ThemedText type="small" style={[styles.version, { color: theme.textSecondary }]}>
          SouqLink v1.0.0
        </ThemedText>
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Modifier le profil</ThemedText>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Nom</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Votre nom"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Téléphone</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Votre numéro de téléphone"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                onPress={() => setEditModalVisible(false)}
                style={[styles.cancelButton, { backgroundColor: theme.border }]}
              >
                Annuler
              </Button>
              <Button
                onPress={handleSaveProfile}
                style={{ flex: 1, marginLeft: Spacing.md }}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={helpModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Aide et support</ThemedText>
              <Pressable onPress={() => setHelpModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.helpSection, { backgroundColor: theme.backgroundRoot }]}>
                <Feather name="phone" size={24} color={theme.primary} />
                <View style={styles.helpContent}>
                  <ThemedText type="h4">Contactez-nous</ThemedText>
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Notre équipe est disponible 7j/7
                  </ThemedText>
                  <Pressable 
                    style={[styles.helpButton, { backgroundColor: theme.primary }]}
                    onPress={() => Linking.openURL("tel:+212690201336")}
                  >
                    <ThemedText type="body" style={{ color: "#FFFFFF" }}>Appeler le support</ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.helpSection, { backgroundColor: theme.backgroundRoot }]}>
                <Feather name="mail" size={24} color={theme.accent} />
                <View style={styles.helpContent}>
                  <ThemedText type="h4">Email</ThemedText>
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    souqlink01@gmail.com
                  </ThemedText>
                  <Pressable 
                    style={[styles.helpButton, { backgroundColor: theme.accent }]}
                    onPress={() => Linking.openURL("mailto:souqlink01@gmail.com")}
                  >
                    <ThemedText type="body" style={{ color: "#FFFFFF" }}>Envoyer un email</ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={{ marginTop: Spacing.lg }}>
                <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Questions fréquentes</ThemedText>
                
                <View style={[styles.faqItem, { backgroundColor: theme.backgroundRoot }]}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Comment passer une commande ?</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Parcourez les produits, ajoutez-les au panier et validez votre commande avec votre adresse de livraison.
                  </ThemedText>
                </View>

                <View style={[styles.faqItem, { backgroundColor: theme.backgroundRoot }]}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Comment suivre ma commande ?</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Dans l'onglet "Commandes", vous pouvez voir le statut de toutes vos commandes en temps réel.
                  </ThemedText>
                </View>

                <View style={[styles.faqItem, { backgroundColor: theme.backgroundRoot }]}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Quels sont les délais de livraison ?</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Les livraisons sont généralement effectuées dans les 24 à 48 heures suivant la validation de votre commande.
                  </ThemedText>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={termsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Conditions d'utilisation</ThemedText>
              <Pressable onPress={() => setTermsModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>1. Acceptation des conditions</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                En utilisant l'application SouqLink, vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>2. Description du service</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                SouqLink est une plateforme de livraison permettant aux utilisateurs de commander des produits auprès de supermarchés et souqs locaux, et de se faire livrer à domicile.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>3. Compte utilisateur</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Vous êtes responsable de la confidentialité de votre compte et de votre mot de passe. Vous acceptez de nous informer immédiatement de toute utilisation non autorisée de votre compte.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>4. Commandes et paiements</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Toutes les commandes sont soumises à disponibilité. Les prix affichés sont en dirhams marocains (MAD) et peuvent être modifiés sans préavis.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>5. Livraison</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Nous nous efforçons de respecter les délais de livraison indiqués, mais ceux-ci peuvent varier en fonction de la disponibilité des livreurs et des conditions de circulation.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>6. Contact</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Pour toute question concernant ces conditions, contactez-nous à souqlink01@gmail.com
              </ThemedText>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Politique de confidentialité</ThemedText>
              <Pressable onPress={() => setPrivacyModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>1. Collecte des données</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Nous collectons les informations que vous nous fournissez directement, notamment votre nom, adresse email, numéro de téléphone et adresse de livraison.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>2. Utilisation des données</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Vos données sont utilisées pour traiter vos commandes, améliorer notre service et vous contacter concernant vos commandes.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>3. Protection des données</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Nous mettons en oeuvre des mesures de sécurité appropriées pour protéger vos données personnelles contre tout accès non autorisé.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>4. Partage des données</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Nous ne vendons pas vos données personnelles. Nous pouvons partager vos informations avec les livreurs uniquement pour effectuer les livraisons.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>5. Vos droits</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Vous avez le droit d'accéder, de modifier ou de supprimer vos données personnelles. Contactez-nous à souqlink01@gmail.com pour exercer ces droits.
              </ThemedText>

              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>6. Cookies</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Nous utilisons des cookies pour améliorer votre expérience sur l'application et analyser l'utilisation de notre service.
              </ThemedText>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  name: {
    marginBottom: Spacing.xs,
  },
  infoCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  menuCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  logoutButton: {
    marginBottom: Spacing.lg,
  },
  version: {
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  modalContentFull: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
    maxHeight: "80%",
  },
  helpSection: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  helpContent: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  helpButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    alignItems: "center",
  },
  faqItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
});
