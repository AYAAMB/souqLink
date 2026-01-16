import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, TextInput, Modal, Platform, ScrollView, FlatList, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface Order {
  id: string;
  orderType: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  deliveryAddress: string;
}

export default function CourierProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout, refreshUser } = useAuth();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");

  const { data: stats } = useQuery<{
    totalDeliveries: number;
    completedDeliveries: number;
    totalEarnings: number;
    averageRating: number;
  }>({
    queryKey: [`/api/couriers/stats/${user?.email}`],
    enabled: !!user?.email,
  });

  const { data: deliveryHistory = [] } = useQuery<Order[]>({
    queryKey: [`/api/orders/courier/${user?.email}`],
    enabled: !!user?.email && historyModalVisible,
  });

  const completedDeliveries = deliveryHistory.filter(o => o.status === "delivered");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, data);
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
      Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Déconnexion", style: "destructive", onPress: logout },
      ]);
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
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <ThemedText type="h2" style={{ color: "#FFFFFF" }}>
              {user?.name?.charAt(0).toUpperCase() || "C"}
            </ThemedText>
          </View>
          <ThemedText type="h3" style={styles.name}>
            {user?.name}
          </ThemedText>
          <View style={[styles.roleBadge, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="truck" size={14} color={theme.accent} />
            <ThemedText type="small" style={[styles.roleText, { color: theme.accent }]}>
              Livreur
            </ThemedText>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.statsTitle}>Mes statistiques</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {stats?.completedDeliveries || 0}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Livraisons
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.accent }}>
                {stats?.totalEarnings || 0} MAD
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Gains totaux
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="star" size={18} color="#FFD700" />
                <ThemedText type="h2" style={{ marginLeft: Spacing.xs }}>
                  {stats?.averageRating?.toFixed(1) || "N/A"}
                </ThemedText>
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Note moyenne
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.infoRow}>
            <Feather name="mail" size={20} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.infoText}>
              {user?.email}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Feather name="phone" size={20} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.infoText}>
              {user?.phone || "Non renseigné"}
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
          <Pressable style={styles.menuItem} onPress={() => setHistoryModalVisible(true)}>
            <Feather name="clock" size={20} color={theme.text} />
            <ThemedText type="body" style={styles.menuText}>
              Historique des livraisons
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
        </View>

        <Button onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.error }]}>
          Déconnexion
        </Button>

        <ThemedText type="small" style={[styles.version, { color: theme.textSecondary }]}>
          SouqLink Livreur v1.0.0
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
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Historique des livraisons</ThemedText>
              <Pressable onPress={() => setHistoryModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {completedDeliveries.length > 0 ? (
              <FlatList
                data={completedDeliveries}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.historyItem, { backgroundColor: theme.backgroundRoot }]}>
                    <View style={styles.historyHeader}>
                      <View style={[styles.orderTypeBadge, { backgroundColor: item.orderType === "souq" ? theme.accent + "20" : theme.primary + "20" }]}>
                        <Feather 
                          name={item.orderType === "souq" ? "shopping-bag" : "shopping-cart"} 
                          size={14} 
                          color={item.orderType === "souq" ? theme.accent : theme.primary} 
                        />
                        <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: item.orderType === "souq" ? theme.accent : theme.primary }}>
                          {item.orderType === "souq" ? "Souq" : "Supermarché"}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                      </ThemedText>
                    </View>
                    <ThemedText type="body" numberOfLines={1} style={{ marginTop: Spacing.sm }}>
                      {item.deliveryAddress}
                    </ThemedText>
                    <ThemedText type="body" style={{ color: theme.primary, marginTop: Spacing.xs }}>
                      {item.totalAmount} MAD
                    </ThemedText>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Feather name="package" size={48} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                  Aucune livraison effectuée pour le moment
                </ThemedText>
              </View>
            )}
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
                    onPress={() => Linking.openURL("tel:+212600000000")}
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
                    support@souqlink.ma
                  </ThemedText>
                  <Pressable 
                    style={[styles.helpButton, { backgroundColor: theme.accent }]}
                    onPress={() => Linking.openURL("mailto:support@souqlink.ma")}
                  >
                    <ThemedText type="body" style={{ color: "#FFFFFF" }}>Envoyer un email</ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.helpSection, { backgroundColor: theme.backgroundRoot }]}>
                <Feather name="message-circle" size={24} color={theme.primary} />
                <View style={styles.helpContent}>
                  <ThemedText type="h4">FAQ</ThemedText>
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Consultez nos questions fréquentes
                  </ThemedText>
                </View>
              </View>

              <View style={{ marginTop: Spacing.lg }}>
                <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Questions fréquentes</ThemedText>
                
                <View style={[styles.faqItem, { backgroundColor: theme.backgroundRoot }]}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Comment accepter une livraison ?</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Dans l'onglet "Livraisons", vous verrez les commandes disponibles. Appuyez sur "Accepter" pour prendre en charge une livraison.
                  </ThemedText>
                </View>

                <View style={[styles.faqItem, { backgroundColor: theme.backgroundRoot }]}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Comment voir mes gains ?</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Vos gains totaux sont affichés dans la section "Mes statistiques" de votre profil.
                  </ThemedText>
                </View>

                <View style={[styles.faqItem, { backgroundColor: theme.backgroundRoot }]}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Comment utiliser la navigation ?</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Après avoir accepté une livraison, appuyez sur "Naviguer" pour ouvrir l'itinéraire vers l'adresse de livraison.
                  </ThemedText>
                </View>
              </View>
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
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    marginLeft: Spacing.xs,
    fontWeight: "600",
  },
  statsCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statsTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
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
  historyItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
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
