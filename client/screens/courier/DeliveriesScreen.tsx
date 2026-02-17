import React, { useState } from "react";
import { StyleSheet, View, FlatList, RefreshControl, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { BorderRadius, Spacing, ORDER_STATUSES, TIME_WINDOWS, QUALITY_PREFERENCES } from "@/constants/theme";

interface Order {
  id: string;
  orderType: string;
  status: keyof typeof ORDER_STATUSES;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  createdAt: string;
  souqListText?: string | null;
  qualityPreference?: string | null;
  preferredTimeWindow?: string | null;
  notes?: string | null;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  indicativePrice: string;
  product?: {
    name: string;
    imageUrl?: string | null;
  };
}

type TabType = "available" | "myDeliveries";

/** ---- helpers fetch (pas de fichier API supplémentaire) ---- */
async function fetchJson(url: string, options?: RequestInit) {
  const r = await fetch(url, options);
  const text = await r.text().catch(() => "");
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!r.ok) throw new Error(data?.error || text || `HTTP ${r.status}`);
  return data;
}

async function fetchAvailableOrders(): Promise<any[]> {
  return fetchJson("/api/orders?action=available");
}

async function fetchCourierOrders(email: string): Promise<any[]> {
  return fetchJson(`/api/orders?role=courier&email=${encodeURIComponent(email)}`);
}

async function assignOrderToCourier(orderId: string, courierEmail: string) {
  return fetchJson(`/api/orders?action=assign&id=${encodeURIComponent(orderId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courierEmail }),
  });
}

export default function DeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("available");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});

  const handleOpenNavigation = (orderId: string) => {
    navigation.navigate("CourierNavigation", { orderId });
  };

  /** ✅ DISPONIBLES */
  const {
    data: availableOrders = [],
    isLoading: isLoadingAvailable,
    refetch: refetchAvailable,
    isRefetching: isRefetchingAvailable,
    error: errorAvailable,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders", "available"],
    queryFn: async () => {
      const rows = await fetchAvailableOrders();
      // mapping minimal si tes champs DB sont snake_case
      return rows.map((r: any) => ({
        id: r.id,
        orderType: r.order_type ?? r.orderType,
        status: (r.status ?? "received") as any,
        customerName: r.customer_name ?? r.customerName ?? "",
        customerPhone: r.customer_phone ?? r.customerPhone ?? "",
        deliveryAddress: r.delivery_address ?? r.deliveryAddress ?? "",
        createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
        souqListText: r.souq_list_text ?? r.souqListText ?? null,
        qualityPreference: r.quality_preference ?? r.qualityPreference ?? null,
        preferredTimeWindow: r.preferred_time_window ?? r.preferredTimeWindow ?? null,
        notes: r.notes ?? null,
      }));
    },
  });

  /** ✅ MES LIVRAISONS (ASSIGNÉES) */
  const {
    data: myOrders = [],
    isLoading: isLoadingMy,
    refetch: refetchMy,
    isRefetching: isRefetchingMy,
    error: errorMy,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders", "courier", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const rows = await fetchCourierOrders(user!.email!);
      return rows.map((r: any) => ({
        id: r.id,
        orderType: r.order_type ?? r.orderType,
        status: (r.status ?? "received") as any,
        customerName: r.customer_name ?? r.customerName ?? "",
        customerPhone: r.customer_phone ?? r.customerPhone ?? "",
        deliveryAddress: r.delivery_address ?? r.deliveryAddress ?? "",
        createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
        souqListText: r.souq_list_text ?? r.souqListText ?? null,
        qualityPreference: r.quality_preference ?? r.qualityPreference ?? null,
        preferredTimeWindow: r.preferred_time_window ?? r.preferredTimeWindow ?? null,
        notes: r.notes ?? null,
      }));
    },
  });

  /** ✅ CLAIM (ASSIGN) */
  const claimOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.email) throw new Error("courier email missing");
      return assignOrderToCourier(orderId, user.email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", "available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", "courier"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setActiveTab("myDeliveries");
    },
    onError: (error: any) => {
      const message = error?.message || "Cette commande n'est plus disponible.";
      Alert.alert("Erreur", message);
    },
  });

  /** ⚠️ UPDATE STATUS (si ton API PATCH existe déjà ailleurs)
   * Si tu n'as pas PATCH, dis-moi et je te fais un POST action=status.
   */
const updateStatusMutation = useMutation({
  mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
    return fetchJson(`/api/orders?action=status&id=${encodeURIComponent(orderId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        courierEmail: user?.email, // utile pour sécuriser
      }),
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders", "courier"] });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
  onError: () => {
    Alert.alert("Erreur", "Impossible de mettre à jour le statut.");
  },
});


 const fetchOrderItems = async (orderId: string) => {
  try {
    const items = await fetchJson(`/api/orders?action=items&id=${encodeURIComponent(orderId)}`);
    setOrderItems((prev) => ({ ...prev, [orderId]: items }));
  } catch (error) {
    console.error("Failed to fetch order items:", error);
  }
};


  const handleToggleExpand = (orderId: string, orderType: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      if (orderType === "supermarket" && !orderItems[orderId]) {
        fetchOrderItems(orderId);
      }
    }
  };

  const handleClaimOrder = (orderId: string) => {
    if (Platform.OS === "web") {
      claimOrderMutation.mutate(orderId);
    } else {
      Alert.alert(
        "Accepter la commande",
        "Voulez-vous accepter cette commande et commencer les courses ?",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Accepter", onPress: () => claimOrderMutation.mutate(orderId) },
        ]
      );
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "shopping":
        return "in_delivery";
      case "in_delivery":
        return "delivered";
      default:
        return null;
    }
  };

  const getStatusAction = (currentStatus: string) => {
    switch (currentStatus) {
      case "shopping":
        return "Commencer la livraison";
      case "in_delivery":
        return "Marquer comme livré";
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 60) return `il y a ${Math.max(diffMinutes, 0)} min`;
    if (diffMinutes < 1440) return `il y a ${Math.floor(diffMinutes / 60)}h`;
    return date.toLocaleDateString("fr-FR");
  };

  const renderAvailableOrder = ({ item }: { item: Order }) => {
    const isExpanded = expandedOrder === item.id;
    const items = orderItems[item.id] || [];

    return (
      <View style={[styles.orderCard, { backgroundColor: theme.backgroundDefault }]}>
        <Pressable onPress={() => handleToggleExpand(item.id, item.orderType)}>
          <View style={styles.orderHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.typeIcon,
                  { backgroundColor: item.orderType === "souq" ? theme.accent + "20" : theme.primary + "20" },
                ]}
              >
                <Feather
                  name={item.orderType === "souq" ? "shopping-bag" : "shopping-cart"}
                  size={16}
                  color={item.orderType === "souq" ? theme.accent : theme.primary}
                />
              </View>
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {formatTime(item.createdAt)}
                </ThemedText>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {item.orderType === "souq" ? "Commande Souq" : "Commande Supermarché"}
                </ThemedText>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.newBadge, { backgroundColor: theme.success + "20" }]}>
                <ThemedText type="small" style={{ color: theme.success, fontWeight: "600" }}>
                  Nouvelle
                </ThemedText>
              </View>
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
                style={{ marginLeft: Spacing.sm }}
              />
            </View>
          </View>
        </Pressable>

        {isExpanded ? (
          <View style={styles.orderDetails}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.detailSection}>
              <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                Client
              </ThemedText>
              <View style={styles.detailRow}>
                <Feather name="user" size={14} color={theme.text} />
                <ThemedText type="body" style={styles.detailText}>
                  {item.customerName}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <Feather name="map-pin" size={14} color={theme.text} />
                <ThemedText type="body" style={styles.detailText}>
                  {item.deliveryAddress}
                </ThemedText>
              </View>
            </View>

            {item.orderType === "souq" ? (
              <View style={styles.detailSection}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Liste de courses
                </ThemedText>
                <View style={[styles.listBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="body">{item.souqListText}</ThemedText>
                </View>
                {item.qualityPreference ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    Qualité:{" "}
                    {QUALITY_PREFERENCES.find((q) => q.id === item.qualityPreference)?.name || item.qualityPreference}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <View style={styles.detailSection}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Produits
                </ThemedText>
                {items.length > 0 ? (
                  items.map((orderItem) => (
                    <View key={orderItem.id} style={styles.productRow}>
                      <ThemedText type="body" style={{ flex: 1 }}>
                        {orderItem.product?.name || "Produit"}
                      </ThemedText>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        x{orderItem.quantity}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Chargement...
                  </ThemedText>
                )}
              </View>
            )}

            <Button
              onPress={() => handleClaimOrder(item.id)}
              disabled={claimOrderMutation.isPending}
              style={styles.actionButton}
            >
              {claimOrderMutation.isPending ? "Acceptation..." : "Accepter la commande"}
            </Button>
          </View>
        ) : null}
      </View>
    );
  };

  const renderMyOrder = ({ item }: { item: Order }) => {
    const isExpanded = expandedOrder === item.id;
    const nextStatus = getNextStatus(item.status);
    const actionLabel = getStatusAction(item.status);
    const items = orderItems[item.id] || [];

    return (
      <View style={[styles.orderCard, { backgroundColor: theme.backgroundDefault }]}>
        <Pressable onPress={() => handleToggleExpand(item.id, item.orderType)}>
          <View style={styles.orderHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.typeIcon,
                  { backgroundColor: item.orderType === "souq" ? theme.accent + "20" : theme.primary + "20" },
                ]}
              >
                <Feather
                  name={item.orderType === "souq" ? "shopping-bag" : "shopping-cart"}
                  size={16}
                  color={item.orderType === "souq" ? theme.accent : theme.primary}
                />
              </View>
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  #{item.id.slice(0, 8).toUpperCase()}
                </ThemedText>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {item.orderType === "souq" ? "Commande Souq" : "Commande Supermarché"}
                </ThemedText>
              </View>
            </View>
            <View style={styles.headerRight}>
              <StatusBadge status={item.status} />
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
                style={{ marginLeft: Spacing.sm }}
              />
            </View>
          </View>
        </Pressable>

        {isExpanded ? (
          <View style={styles.orderDetails}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.detailSection}>
              <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                Client
              </ThemedText>
              <View style={styles.detailRow}>
                <Feather name="user" size={14} color={theme.text} />
                <ThemedText type="body" style={styles.detailText}>
                  {item.customerName}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <Feather name="phone" size={14} color={theme.primary} />
                <ThemedText type="body" style={[styles.detailText, { color: theme.primary }]}>
                  {item.customerPhone}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <Feather name="map-pin" size={14} color={theme.text} />
                <ThemedText type="body" style={styles.detailText}>
                  {item.deliveryAddress}
                </ThemedText>
              </View>
            </View>

            {item.orderType === "souq" ? (
              <View style={styles.detailSection}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Liste de courses
                </ThemedText>
                <View style={[styles.listBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="body">{item.souqListText}</ThemedText>
                </View>
                {item.qualityPreference ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    Qualité:{" "}
                    {QUALITY_PREFERENCES.find((q) => q.id === item.qualityPreference)?.name || item.qualityPreference}
                  </ThemedText>
                ) : null}
                {item.preferredTimeWindow ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Créneau: {TIME_WINDOWS.find((t) => t.id === item.preferredTimeWindow)?.name || item.preferredTimeWindow}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <View style={styles.detailSection}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Produits
                </ThemedText>
                {items.length > 0 ? (
                  items.map((orderItem) => (
                    <View key={orderItem.id} style={styles.productRow}>
                      <ThemedText type="body" style={{ flex: 1 }}>
                        {orderItem.product?.name || "Produit"}
                      </ThemedText>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        x{orderItem.quantity}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Chargement...
                  </ThemedText>
                )}
              </View>
            )}

            {item.notes ? (
              <View style={styles.detailSection}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Notes
                </ThemedText>
                <ThemedText type="body">{item.notes}</ThemedText>
              </View>
            ) : null}

            {item.status !== "delivered" ? (
              <Pressable onPress={() => handleOpenNavigation(item.id)} style={[styles.navigationButton, { backgroundColor: theme.primary }]}>
                <Feather name="navigation" size={18} color="#FFFFFF" />
                <ThemedText style={styles.navigationButtonText}>Ouvrir la navigation</ThemedText>
              </Pressable>
            ) : null}

            {nextStatus && actionLabel ? (
              <Button
                onPress={() => updateStatusMutation.mutate({ orderId: item.id, status: nextStatus })}
                disabled={updateStatusMutation.isPending}
                style={styles.actionButton}
              >
                {updateStatusMutation.isPending ? "Mise à jour..." : actionLabel}
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const isLoading = activeTab === "available" ? isLoadingAvailable : isLoadingMy;
  const isRefetching = activeTab === "available" ? isRefetchingAvailable : isRefetchingMy;
  const orders = activeTab === "available" ? availableOrders : myOrders;
  const refetch = activeTab === "available" ? refetchAvailable : refetchMy;

  const hasError = activeTab === "available" ? !!errorAvailable : !!errorMy;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <LoadingSpinner message="Chargement des livraisons..." />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <EmptyState
          icon="alert-circle"
          title="Something went wrong"
          message="Failed to load deliveries. Please try again."
          actionLabel="Retry"
          onAction={refetch}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.tabsContainer, { paddingTop: headerHeight + Spacing.md, paddingHorizontal: Spacing.lg }]}>
        <Pressable
          style={[styles.tab, activeTab === "available" && [styles.activeTab, { borderBottomColor: theme.primary }]]}
          onPress={() => setActiveTab("available")}
        >
          <ThemedText type="body" style={[styles.tabText, { color: activeTab === "available" ? theme.primary : theme.textSecondary }]}>
            Disponibles
          </ThemedText>
          {availableOrders.length > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.badgeText}>{availableOrders.length}</ThemedText>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "myDeliveries" && [styles.activeTab, { borderBottomColor: theme.primary }]]}
          onPress={() => setActiveTab("myDeliveries")}
        >
          <ThemedText type="body" style={[styles.tabText, { color: activeTab === "myDeliveries" ? theme.primary : theme.textSecondary }]}>
            Mes livraisons
          </ThemedText>
          {myOrders.filter((o) => o.status !== "delivered").length > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <ThemedText style={styles.badgeText}>{myOrders.filter((o) => o.status !== "delivered").length}</ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={orders}
        renderItem={activeTab === "available" ? renderAvailableOrder : renderMyOrder}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon={activeTab === "available" ? "inbox" : "truck"}
            title={activeTab === "available" ? "Aucune commande disponible" : "Aucune livraison"}
            message={
              activeTab === "available"
                ? "Il n'y a pas de nouvelles commandes pour le moment. Rafraîchissez pour vérifier."
                : "Vous n'avez pas encore de livraisons assignées."
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    gap: Spacing.xs,
  },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontWeight: "600" },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  newBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },

  orderCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },

  orderDetails: { marginTop: Spacing.md },
  divider: { height: 1, marginBottom: Spacing.md },

  detailSection: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    fontSize: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  detailText: { marginLeft: Spacing.sm, flex: 1 },

  listBox: { padding: Spacing.md, borderRadius: BorderRadius.sm },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },

  actionButton: { marginTop: Spacing.sm },

  navigationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  navigationButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
