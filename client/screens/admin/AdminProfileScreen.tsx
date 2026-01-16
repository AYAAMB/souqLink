import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, TextInput, Modal, Platform, ScrollView, FlatList, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface Courier {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export default function AdminProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [couriersModalVisible, setCouriersModalVisible] = useState(false);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");

  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const { data: couriers } = useQuery<any[]>({
    queryKey: ["/api/couriers"],
  });

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

  const pendingOrders = orders?.filter(o => o.status === "pending")?.length || 0;
  const activeProducts = products?.filter(p => p.isActive)?.length || 0;
  const totalCouriers = couriers?.length || 0;

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
              {user?.name?.charAt(0).toUpperCase() || "A"}
            </ThemedText>
          </View>
          <ThemedText type="h3" style={styles.name}>
            {user?.name}
          </ThemedText>
          <View style={[styles.roleBadge, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="shield" size={14} color={theme.primary} />
            <ThemedText type="small" style={[styles.roleText, { color: theme.primary }]}>
              Administrateur
            </ThemedText>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.statsTitle}>Tableau de bord</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.warning }}>
                {pendingOrders}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                En attente
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {activeProducts}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Produits actifs
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: theme.accent }}>
                {totalCouriers}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Livreurs
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
          <Pressable style={styles.menuItem} onPress={() => setCouriersModalVisible(true)}>
            <Feather name="users" size={20} color={theme.text} />
            <ThemedText type="body" style={styles.menuText}>
              Gérer les livreurs
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.menuItem} onPress={() => setReportsModalVisible(true)}>
            <Feather name="bar-chart-2" size={20} color={theme.text} />
            <ThemedText type="body" style={styles.menuText}>
              Rapports et analytics
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.menuItem} onPress={() => setSettingsModalVisible(true)}>
            <Feather name="settings" size={20} color={theme.text} />
            <ThemedText type="body" style={styles.menuText}>
              Paramètres de l'app
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <Button onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.error }]}>
          Déconnexion
        </Button>

        <ThemedText type="small" style={[styles.version, { color: theme.textSecondary }]}>
          SouqLink Admin v1.0.0
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
        visible={couriersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCouriersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Gérer les livreurs</ThemedText>
              <Pressable onPress={() => setCouriersModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {couriers && couriers.length > 0 ? (
              <FlatList
                data={couriers as Courier[]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.courierItem, { backgroundColor: theme.backgroundRoot }]}>
                    <View style={[styles.courierAvatar, { backgroundColor: theme.accent }]}>
                      <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                        {item.name?.charAt(0).toUpperCase() || "L"}
                      </ThemedText>
                    </View>
                    <View style={styles.courierInfo}>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>{item.name}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{item.email}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{item.phone || "Pas de téléphone"}</ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: theme.success + "20" }]}>
                      <ThemedText type="small" style={{ color: theme.success }}>Actif</ThemedText>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Feather name="users" size={48} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                  Aucun livreur enregistré
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={reportsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReportsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Rapports et analytics</ThemedText>
              <Pressable onPress={() => setReportsModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.reportCard, { backgroundColor: theme.backgroundRoot }]}>
                <View style={styles.reportHeader}>
                  <Feather name="shopping-cart" size={24} color={theme.primary} />
                  <ThemedText type="h4" style={{ marginLeft: Spacing.md }}>Commandes</ThemedText>
                </View>
                <View style={styles.reportStats}>
                  <View style={styles.reportStat}>
                    <ThemedText type="h2" style={{ color: theme.primary }}>{orders?.length || 0}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Total</ThemedText>
                  </View>
                  <View style={styles.reportStat}>
                    <ThemedText type="h2" style={{ color: theme.warning }}>{pendingOrders}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>En attente</ThemedText>
                  </View>
                  <View style={styles.reportStat}>
                    <ThemedText type="h2" style={{ color: theme.success }}>
                      {orders?.filter(o => o.status === "delivered")?.length || 0}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Livrées</ThemedText>
                  </View>
                </View>
              </View>

              <View style={[styles.reportCard, { backgroundColor: theme.backgroundRoot }]}>
                <View style={styles.reportHeader}>
                  <Feather name="package" size={24} color={theme.accent} />
                  <ThemedText type="h4" style={{ marginLeft: Spacing.md }}>Produits</ThemedText>
                </View>
                <View style={styles.reportStats}>
                  <View style={styles.reportStat}>
                    <ThemedText type="h2" style={{ color: theme.accent }}>{products?.length || 0}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Total</ThemedText>
                  </View>
                  <View style={styles.reportStat}>
                    <ThemedText type="h2" style={{ color: theme.success }}>{activeProducts}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Actifs</ThemedText>
                  </View>
                  <View style={styles.reportStat}>
                    <ThemedText type="h2" style={{ color: theme.textSecondary }}>
                      {(products?.length || 0) - activeProducts}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Inactifs</ThemedText>
                  </View>
                </View>
              </View>

              <View style={[styles.reportCard, { backgroundColor: theme.backgroundRoot }]}>
                <View style={styles.reportHeader}>
                  <Feather name="truck" size={24} color={theme.primary} />
                  <ThemedText type="h4" style={{ marginLeft: Spacing.md }}>Livreurs</ThemedText>
                </View>
                <View style={styles.reportStats}>
                  <View style={styles.reportStat}>
                    <ThemedText type="h2" style={{ color: theme.primary }}>{totalCouriers}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Total</ThemedText>
                  </View>
                </View>
              </View>

              <View style={[styles.reportCard, { backgroundColor: theme.backgroundRoot }]}>
                <View style={styles.reportHeader}>
                  <Feather name="dollar-sign" size={24} color={theme.success} />
                  <ThemedText type="h4" style={{ marginLeft: Spacing.md }}>Revenus</ThemedText>
                </View>
                <View style={styles.reportStats}>
                  <View style={styles.reportStat}>
                    <ThemedText type="h2" style={{ color: theme.success }}>
                      {orders?.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0} MAD
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Total des commandes</ThemedText>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Paramètres de l'app</ThemedText>
              <Pressable onPress={() => setSettingsModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.settingsSection, { backgroundColor: theme.backgroundRoot }]}>
                <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>Général</ThemedText>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Feather name="bell" size={20} color={theme.text} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.md }}>Notifications</ThemedText>
                  </View>
                  <Switch
                    value={true}
                    onValueChange={() => {}}
                    trackColor={{ false: theme.border, true: theme.primary }}
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Feather name="moon" size={20} color={theme.text} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.md }}>Mode sombre</ThemedText>
                  </View>
                  <Switch
                    value={false}
                    onValueChange={() => {}}
                    trackColor={{ false: theme.border, true: theme.primary }}
                  />
                </View>
              </View>

              <View style={[styles.settingsSection, { backgroundColor: theme.backgroundRoot }]}>
                <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>Livraison</ThemedText>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Feather name="map-pin" size={20} color={theme.text} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.md }}>Zone de livraison</ThemedText>
                  </View>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>Casablanca</ThemedText>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Feather name="clock" size={20} color={theme.text} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.md }}>Horaires</ThemedText>
                  </View>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>8h - 22h</ThemedText>
                </View>
              </View>

              <View style={[styles.settingsSection, { backgroundColor: theme.backgroundRoot }]}>
                <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>À propos</ThemedText>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Feather name="info" size={20} color={theme.text} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.md }}>Version</ThemedText>
                  </View>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>1.0.0</ThemedText>
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
  courierItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  courierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  courierInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  statusBadge: {
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
  reportCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  reportStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  reportStat: {
    alignItems: "center",
  },
  settingsSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
});
