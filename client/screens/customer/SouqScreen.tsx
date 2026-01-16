import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { BorderRadius, Spacing, QUALITY_PREFERENCES, TIME_WINDOWS } from "@/constants/theme";

export default function SouqScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [shoppingList, setShoppingList] = useState("");
  const [qualityPreference, setQualityPreference] = useState("standard");
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budgetMax, setBudgetMax] = useState("");
  const [timeWindow, setTimeWindow] = useState("morning");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState("");

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShoppingList("");
      setAddress("");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Order Placed!",
        "Your souq order has been received. A shopper will get your items soon!",
        [{ text: "OK" }]
      );
    },
    onError: () => {
      Alert.alert("Error", "Failed to place order. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (!shoppingList.trim()) {
      Alert.alert("Error", "Please enter your shopping list");
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      Alert.alert("Error", "Please fill in all delivery details");
      return;
    }

    createOrderMutation.mutate({
      orderType: "souq",
      customerEmail: user?.email,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      deliveryAddress: address.trim(),
      souqListText: shoppingList.trim(),
      qualityPreference,
      budgetEnabled,
      budgetMax: budgetEnabled && budgetMax ? budgetMax : null,
      preferredTimeWindow: timeWindow,
    });
  };

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
      <View style={[styles.banner, { backgroundColor: theme.accent + "15" }]}>
        <ThemedText type="h4" style={{ color: theme.accent }}>
          Souq Shopping
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          Tell us what you need from the traditional market and we'll get it for you!
        </ThemedText>
      </View>

      <ThemedText type="small" style={[styles.disclaimer, { color: theme.textSecondary, backgroundColor: theme.backgroundDefault }]}>
        Souq prices vary daily. Final price = receipt.
      </ThemedText>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Shopping List
      </ThemedText>
      <Input
        placeholder="2kg tomatoes, 1kg potatoes, 1 chicken, fresh mint..."
        value={shoppingList}
        onChangeText={setShoppingList}
        multiline
        numberOfLines={5}
        style={{ height: 120, textAlignVertical: "top", paddingTop: Spacing.md }}
      />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Quality Preference
      </ThemedText>
      <View style={styles.optionRow}>
        {QUALITY_PREFERENCES.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setQualityPreference(option.id)}
            style={[
              styles.optionButton,
              {
                backgroundColor:
                  qualityPreference === option.id ? theme.primary : theme.backgroundDefault,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: qualityPreference === option.id ? "#FFFFFF" : theme.text,
                fontWeight: "600",
              }}
            >
              {option.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={[styles.switchRow, { backgroundColor: theme.backgroundDefault }]}>
        <View>
          <ThemedText type="body" style={{ fontWeight: "500" }}>
            Set Budget Limit
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            We'll try to stay within your budget
          </ThemedText>
        </View>
        <Switch
          value={budgetEnabled}
          onValueChange={setBudgetEnabled}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {budgetEnabled ? (
        <Input
          label="Maximum Budget (MAD)"
          placeholder="e.g., 200"
          value={budgetMax}
          onChangeText={setBudgetMax}
          keyboardType="numeric"
        />
      ) : null}

      <ThemedText type="h4" style={styles.sectionTitle}>
        Preferred Delivery Time
      </ThemedText>
      <View style={styles.timeOptions}>
        {TIME_WINDOWS.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setTimeWindow(option.id)}
            style={[
              styles.timeButton,
              {
                backgroundColor:
                  timeWindow === option.id ? theme.primary : theme.backgroundDefault,
                borderColor: timeWindow === option.id ? theme.primary : theme.border,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: timeWindow === option.id ? "#FFFFFF" : theme.text,
                fontWeight: "500",
              }}
            >
              {option.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>

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

      <Button
        onPress={handleSubmit}
        disabled={createOrderMutation.isPending}
        style={styles.submitButton}
      >
        {createOrderMutation.isPending ? "Placing Order..." : "Place Souq Order"}
      </Button>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  disclaimer: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  optionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  timeOptions: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  timeButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  submitButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
});
