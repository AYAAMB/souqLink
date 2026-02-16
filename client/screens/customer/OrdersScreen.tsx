import React from "react";
import { StyleSheet, View, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { OrderCard } from "@/components/OrderCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, ORDER_STATUSES } from "@/constants/theme";

interface Order {
  id: string;
  orderType: string;
  status: keyof typeof ORDER_STATUSES;
  customerName: string;
  deliveryAddress: string;
  createdAt: string;
  finalTotal: string | null;
}

// ✅ AJOUT: récupérer les commandes du customer via query params (route existante côté backend)
async function fetchMyOrders(email: string): Promise<Order[]> {
  const url = `/api/orders?role=customer&email=${encodeURIComponent(email)}`;
  const r = await fetch(url);

  const text = await r.text().catch(() => "");
  let rows: any = null;
  try {
    rows = text ? JSON.parse(text) : null;
  } catch {
    rows = null;
  }

  if (!r.ok) {
    throw new Error(rows?.error || text || `HTTP ${r.status}`);
  }

  // ✅ Mapping DB -> Front (snake_case -> camelCase)
  return (rows ?? []).map((o: any) => ({
    id: o.id,
    orderType: o.order_type ?? "",
    status: o.status,
    customerName: o.customer_name ?? "",
    deliveryAddress: o.delivery_address ?? "",
    createdAt: o.created_at ?? "",
    finalTotal: o.final_total != null ? String(o.final_total) : null,
  }));
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const email = user?.email;

  const { data: orders = [], isLoading, error, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ["/api/orders", "customer", email],
    enabled: !!email,
    queryFn: () => fetchMyOrders(email!),
  });

  const handleTrackOrder = (orderId: string) => {
    navigation.navigate("OrderTracking", { orderId });
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <OrderCard
      id={item.id}
      orderType={item.orderType}
      status={item.status}
      customerName={item.customerName}
      deliveryAddress={item.deliveryAddress}
      createdAt={item.createdAt}
      finalTotal={item.finalTotal}
      onPress={() => handleTrackOrder(item.id)}
      showTrackButton={item.status !== "delivered"}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <LoadingSpinner message="Loading your orders..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <EmptyState
          icon="alert-circle"
          title="Something went wrong"
          message={(error as any)?.message ?? "Failed to load orders. Please try again."}
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
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.primary}
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon="package"
          title="No orders yet"
          message="Your orders will appear here once you place one."
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
});
