import React, { useState } from "react";
import { StyleSheet, View, FlatList, RefreshControl, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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

export default function DeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});

  const { data: orders = [], isLoading, error, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ["/api/orders", "courier", user?.email],
    enabled: !!user?.email,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: () => {
      Alert.alert("Error", "Failed to update status. Please try again.");
    },
  });

  const fetchOrderItems = async (orderId: string) => {
    try {
      const response = await apiRequest("GET", `/api/orders/${orderId}/items`, undefined);
      const items = await response.json();
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

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "received":
        return "shopping";
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
      case "received":
        return "Accept & Start Shopping";
      case "shopping":
        return "Start Delivery";
      case "in_delivery":
        return "Mark as Delivered";
      default:
        return null;
    }
  };

  const renderOrder = ({ item }: { item: Order }) => {
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
                  {item.orderType === "souq" ? "Souq Order" : "Supermarket Order"}
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
                Customer
              </ThemedText>
              <View style={styles.detailRow}>
                <Feather name="user" size={14} color={theme.text} />
                <ThemedText type="body" style={styles.detailText}>
                  {item.customerName}
                </ThemedText>
              </View>
              <Pressable style={styles.detailRow}>
                <Feather name="phone" size={14} color={theme.primary} />
                <ThemedText type="body" style={[styles.detailText, { color: theme.primary }]}>
                  {item.customerPhone}
                </ThemedText>
              </Pressable>
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
                  Shopping List
                </ThemedText>
                <View style={[styles.listBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="body">{item.souqListText}</ThemedText>
                </View>
                {item.qualityPreference ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    Quality: {QUALITY_PREFERENCES.find((q) => q.id === item.qualityPreference)?.name || item.qualityPreference}
                  </ThemedText>
                ) : null}
                {item.preferredTimeWindow ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Time: {TIME_WINDOWS.find((t) => t.id === item.preferredTimeWindow)?.name || item.preferredTimeWindow}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <View style={styles.detailSection}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  Products
                </ThemedText>
                {items.length > 0 ? (
                  items.map((orderItem) => (
                    <View key={orderItem.id} style={styles.productRow}>
                      <ThemedText type="body" style={{ flex: 1 }}>
                        {orderItem.product?.name || "Product"}
                      </ThemedText>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        x{orderItem.quantity}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Loading items...
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

            {nextStatus && actionLabel ? (
              <Button
                onPress={() => updateStatusMutation.mutate({ orderId: item.id, status: nextStatus })}
                disabled={updateStatusMutation.isPending}
                style={styles.actionButton}
              >
                {updateStatusMutation.isPending ? "Updating..." : actionLabel}
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <LoadingSpinner message="Loading deliveries..." />
      </View>
    );
  }

  if (error) {
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
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={orders}
      renderItem={renderOrder}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
      }
      ListEmptyComponent={
        <EmptyState
          icon="truck"
          title="No deliveries assigned"
          message="You don't have any deliveries assigned yet. Check back soon!"
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  orderDetails: {
    marginTop: Spacing.md,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.md,
  },
  detailSection: {
    marginBottom: Spacing.lg,
  },
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
  detailText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  listBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  actionButton: {
    marginTop: Spacing.sm,
  },
});
