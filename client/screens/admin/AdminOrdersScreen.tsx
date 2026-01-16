import React, { useState } from "react";
import { StyleSheet, View, FlatList, RefreshControl, Pressable, Alert, Platform, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { BorderRadius, Spacing, ORDER_STATUSES, TIME_WINDOWS, QUALITY_PREFERENCES } from "@/constants/theme";

interface Order {
  id: string;
  orderType: string;
  status: keyof typeof ORDER_STATUSES;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  assignedCourierEmail: string | null;
  deliveryFee: string;
  finalTotal: string | null;
  notes: string | null;
  souqListText: string | null;
  qualityPreference: string | null;
  budgetEnabled: boolean | null;
  budgetMax: string | null;
  preferredTimeWindow: string | null;
  createdAt: string;
}

interface Courier {
  id: string;
  email: string;
  name: string;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  indicativePrice: string;
  product?: {
    name: string;
  };
}

export default function AdminOrdersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [finalTotal, setFinalTotal] = useState("");
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const { data: orders = [], isLoading, error, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: couriers = [] } = useQuery<Courier[]>({
    queryKey: ["/api/couriers"],
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: () => {
      Alert.alert("Error", "Failed to update order. Please try again.");
    },
  });

  const fetchOrderItems = async (orderId: string) => {
    try {
      const response = await apiRequest("GET", `/api/orders/${orderId}/items`, undefined);
      const items = await response.json();
      setOrderItems(items);
    } catch (error) {
      console.error("Failed to fetch order items:", error);
    }
  };

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setFinalTotal(order.finalTotal || "");
    setSelectedCourier(order.assignedCourierEmail);
    if (order.orderType === "supermarket") {
      fetchOrderItems(order.id);
    } else {
      setOrderItems([]);
    }
  };

  const handleCloseOrder = () => {
    setSelectedOrder(null);
    setOrderItems([]);
    setFinalTotal("");
    setSelectedCourier(null);
  };

  const handleAssignCourier = () => {
    if (!selectedOrder || !selectedCourier) return;
    updateOrderMutation.mutate({
      orderId: selectedOrder.id,
      data: { assignedCourierEmail: selectedCourier },
    });
  };

  const handleUpdateTotal = () => {
    if (!selectedOrder || !finalTotal.trim()) return;
    updateOrderMutation.mutate({
      orderId: selectedOrder.id,
      data: { finalTotal: finalTotal.trim() },
    });
  };

  const handleUpdateStatus = (status: string) => {
    if (!selectedOrder) return;
    updateOrderMutation.mutate({
      orderId: selectedOrder.id,
      data: { status },
    });
  };

  const filteredOrders = filterType
    ? orders.filter((o) => o.orderType === filterType)
    : orders;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <Pressable
      onPress={() => handleOpenOrder(item)}
      style={[styles.orderCard, { backgroundColor: theme.backgroundDefault }]}
    >
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
              {item.customerName}
            </ThemedText>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.orderMeta}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {formatDate(item.createdAt)}
        </ThemedText>
        {item.assignedCourierEmail ? (
          <View style={[styles.courierBadge, { backgroundColor: theme.success + "20" }]}>
            <Feather name="truck" size={12} color={theme.success} />
            <ThemedText type="small" style={{ color: theme.success, marginLeft: 4 }}>
              Assigned
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.courierBadge, { backgroundColor: theme.warning + "20" }]}>
            <Feather name="alert-circle" size={12} color={theme.warning} />
            <ThemedText type="small" style={{ color: theme.warning, marginLeft: 4 }}>
              Unassigned
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <LoadingSpinner message="Loading orders..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <EmptyState
          icon="alert-circle"
          title="Something went wrong"
          message="Failed to load orders. Please try again."
          actionLabel="Retry"
          onAction={refetch}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.filterContainer, { marginTop: headerHeight + Spacing.md }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            onPress={() => setFilterType(null)}
            style={[
              styles.filterChip,
              { backgroundColor: filterType === null ? theme.primary : theme.backgroundDefault },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: filterType === null ? "#FFFFFF" : theme.text, fontWeight: "600" }}
            >
              All ({orders.length})
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setFilterType("supermarket")}
            style={[
              styles.filterChip,
              { backgroundColor: filterType === "supermarket" ? theme.primary : theme.backgroundDefault },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: filterType === "supermarket" ? "#FFFFFF" : theme.text, fontWeight: "600" }}
            >
              Supermarket ({orders.filter((o) => o.orderType === "supermarket").length})
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setFilterType("souq")}
            style={[
              styles.filterChip,
              { backgroundColor: filterType === "souq" ? theme.accent : theme.backgroundDefault },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: filterType === "souq" ? "#FFFFFF" : theme.text, fontWeight: "600" }}
            >
              Souq ({orders.filter((o) => o.orderType === "souq").length})
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>

      <FlatList
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="inbox"
            title="No orders yet"
            message="Orders will appear here when customers place them."
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Order Details</ThemedText>
              <Pressable onPress={handleCloseOrder}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {selectedOrder ? (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.orderIdRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </ThemedText>
                  <StatusBadge status={selectedOrder.status} />
                </View>

                <View style={styles.section}>
                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Customer
                  </ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {selectedOrder.customerName}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {selectedOrder.customerEmail}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    {selectedOrder.customerPhone}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    {selectedOrder.deliveryAddress}
                  </ThemedText>
                </View>

                {selectedOrder.orderType === "souq" ? (
                  <View style={styles.section}>
                    <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      Shopping List
                    </ThemedText>
                    <View style={[styles.listBox, { backgroundColor: theme.backgroundDefault }]}>
                      <ThemedText type="body">{selectedOrder.souqListText}</ThemedText>
                    </View>
                    {selectedOrder.qualityPreference ? (
                      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                        Quality: {QUALITY_PREFERENCES.find((q) => q.id === selectedOrder.qualityPreference)?.name}
                      </ThemedText>
                    ) : null}
                    {selectedOrder.preferredTimeWindow ? (
                      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                        Time: {TIME_WINDOWS.find((t) => t.id === selectedOrder.preferredTimeWindow)?.name}
                      </ThemedText>
                    ) : null}
                    {selectedOrder.budgetEnabled && selectedOrder.budgetMax ? (
                      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                        Budget: {parseFloat(selectedOrder.budgetMax).toFixed(2)} MAD
                      </ThemedText>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.section}>
                    <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      Products
                    </ThemedText>
                    {orderItems.map((item) => (
                      <View key={item.id} style={styles.productRow}>
                        <ThemedText type="body" style={{ flex: 1 }}>
                          {item.product?.name || "Product"}
                        </ThemedText>
                        <ThemedText type="body" style={{ fontWeight: "600" }}>
                          x{item.quantity}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.md }}>
                          {parseFloat(item.indicativePrice).toFixed(2)} MAD
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.section}>
                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Assign Courier
                  </ThemedText>
                  {couriers.length > 0 ? (
                    <View style={styles.courierList}>
                      {couriers.map((courier) => (
                        <Pressable
                          key={courier.id}
                          onPress={() => setSelectedCourier(courier.email)}
                          style={[
                            styles.courierOption,
                            {
                              backgroundColor:
                                selectedCourier === courier.email ? theme.primary : theme.backgroundDefault,
                              borderColor: selectedCourier === courier.email ? theme.primary : theme.border,
                            },
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={{
                              color: selectedCourier === courier.email ? "#FFFFFF" : theme.text,
                              fontWeight: "500",
                            }}
                          >
                            {courier.name}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      No couriers available
                    </ThemedText>
                  )}
                  {selectedCourier !== selectedOrder.assignedCourierEmail ? (
                    <Button
                      onPress={handleAssignCourier}
                      disabled={updateOrderMutation.isPending}
                      style={styles.actionButton}
                    >
                      Assign Courier
                    </Button>
                  ) : null}
                </View>

                <View style={styles.section}>
                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Final Total (MAD)
                  </ThemedText>
                  <Input
                    placeholder="Enter final total from receipt"
                    value={finalTotal}
                    onChangeText={setFinalTotal}
                    keyboardType="decimal-pad"
                  />
                  <Button
                    onPress={handleUpdateTotal}
                    disabled={updateOrderMutation.isPending || !finalTotal.trim()}
                    style={styles.actionButton}
                  >
                    Update Total
                  </Button>
                </View>

                <View style={styles.section}>
                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Update Status
                  </ThemedText>
                  <View style={styles.statusOptions}>
                    {Object.entries(ORDER_STATUSES).map(([key, value]) => (
                      <Pressable
                        key={key}
                        onPress={() => handleUpdateStatus(key)}
                        style={[
                          styles.statusOption,
                          {
                            backgroundColor: selectedOrder.status === key ? value.color : theme.backgroundDefault,
                            borderColor: value.color,
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={{
                            color: selectedOrder.status === key ? "#FFFFFF" : value.color,
                            fontWeight: "600",
                          }}
                        >
                          {value.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
  },
  filterScroll: {
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  orderCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
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
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  orderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  courierBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalBody: {
    padding: Spacing.lg,
  },
  orderIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    fontSize: 12,
  },
  listBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  courierList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  courierOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  actionButton: {
    marginTop: Spacing.sm,
  },
  statusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statusOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
