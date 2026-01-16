import React, { useState } from "react";
import { StyleSheet, View, FlatList, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useCart, CartItem } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { BorderRadius, Spacing } from "@/constants/theme";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { items, updateQuantity, removeItem, clearCart, subtotal, deliveryFee, total } = useCart();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      clearCart();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Order Placed!",
        "Your order has been received. We'll start shopping for you soon!",
        [{ text: "OK" }]
      );
    },
    onError: () => {
      Alert.alert("Error", "Failed to place order. Please try again.");
    },
  });

  const handleCheckout = () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    createOrderMutation.mutate({
      orderType: "supermarket",
      customerEmail: user?.email,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      deliveryAddress: address.trim(),
      notes: notes.trim() || null,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        indicativePrice: item.indicativePrice,
      })),
    });
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={[styles.cartItem, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.itemImage, { backgroundColor: theme.backgroundSecondary }]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <Feather name="package" size={24} color={theme.textSecondary} />
        )}
      </View>
      <View style={styles.itemContent}>
        <ThemedText type="body" numberOfLines={2} style={{ fontWeight: "500" }}>
          {item.name}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
          {parseFloat(item.indicativePrice).toFixed(2)} MAD
        </ThemedText>
      </View>
      <View style={styles.quantityControls}>
        <Pressable
          onPress={() => updateQuantity(item.productId, item.quantity - 1)}
          style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather name="minus" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="body" style={styles.quantity}>
          {item.quantity}
        </ThemedText>
        <Pressable
          onPress={() => updateQuantity(item.productId, item.quantity + 1)}
          style={[styles.quantityButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <EmptyState
          icon="shopping-cart"
          title="Your cart is empty"
          message="Add some products from the shop to get started!"
          actionLabel="Start Shopping"
          onAction={() => navigation.navigate("ShopTab" as never)}
        />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <ThemedText type="h4" style={styles.sectionTitle}>
        Cart Items
      </ThemedText>
      {items.map((item) => (
        <View key={item.productId}>
          {renderCartItem({ item })}
        </View>
      ))}

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Delivery Details
      </ThemedText>
      <Input
        label="Full Name"
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />
      <Input
        label="Phone Number"
        placeholder="Enter your phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Input
        label="Delivery Address"
        placeholder="Enter your full address"
        value={address}
        onChangeText={setAddress}
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: "top", paddingTop: Spacing.md }}
      />
      <Input
        label="Notes (Optional)"
        placeholder="Any special instructions..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={2}
        style={{ height: 60, textAlignVertical: "top", paddingTop: Spacing.md }}
      />

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={[styles.summaryContainer, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.summaryRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Subtotal
          </ThemedText>
          <ThemedText type="body">{subtotal.toFixed(2)} MAD</ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Delivery Fee
          </ThemedText>
          <ThemedText type="body">{deliveryFee.toFixed(2)} MAD</ThemedText>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <ThemedText type="h4">Total</ThemedText>
          <ThemedText type="h4" style={{ color: theme.primary }}>
            {total.toFixed(2)} MAD
          </ThemedText>
        </View>
      </View>

      <ThemedText type="small" style={[styles.disclaimer, { color: theme.textSecondary }]}>
        Cash on delivery only. Final price will be based on store receipt.
      </ThemedText>

      <Button
        onPress={handleCheckout}
        disabled={createOrderMutation.isPending}
        style={styles.checkoutButton}
      >
        {createOrderMutation.isPending ? "Placing Order..." : "Place Order"}
      </Button>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  itemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    marginHorizontal: Spacing.sm,
    fontWeight: "600",
    minWidth: 20,
    textAlign: "center",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xl,
  },
  summaryContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginBottom: 0,
  },
  disclaimer: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  checkoutButton: {
    marginBottom: Spacing.lg,
  },
});
