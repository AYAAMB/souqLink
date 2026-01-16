import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useCart } from "@/context/CartContext";
import { BorderRadius, Spacing } from "@/constants/theme";

interface ProductCardProps {
  id: string;
  name: string;
  indicativePrice: string;
  imageUrl?: string | null;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ProductCard({ id, name, indicativePrice, imageUrl }: ProductCardProps) {
  const { theme } = useTheme();
  const { addItem, removeItem, getItemQuantity, updateQuantity } = useCart();
  const scale = useSharedValue(1);
  const quantity = getItemQuantity(id);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleAdd = () => {
    addItem({
      productId: id,
      name,
      indicativePrice,
      imageUrl,
    });
  };

  const handleIncrement = () => {
    updateQuantity(id, quantity + 1);
  };

  const handleDecrement = () => {
    updateQuantity(id, quantity - 1);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={[styles.imageContainer, { backgroundColor: theme.backgroundSecondary }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <Feather name="package" size={32} color={theme.textSecondary} />
        )}
      </View>
      <View style={styles.content}>
        <ThemedText type="body" numberOfLines={2} style={styles.name}>
          {name}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
          {parseFloat(indicativePrice).toFixed(2)} MAD
        </ThemedText>
      </View>
      <View style={styles.actions}>
        {quantity > 0 ? (
          <View style={styles.quantityControls}>
            <Pressable
              onPress={handleDecrement}
              style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <ThemedText type="body" style={styles.quantity}>
              {quantity}
            </ThemedText>
            <Pressable
              onPress={handleIncrement}
              style={[styles.quantityButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleAdd}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  actions: {
    marginLeft: Spacing.md,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    marginHorizontal: Spacing.md,
    fontWeight: "600",
    minWidth: 20,
    textAlign: "center",
  },
});
