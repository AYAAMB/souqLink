import React, { useState } from "react";
import { StyleSheet, View, FlatList, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ProductCard } from "@/components/ProductCard";
import { CategoryChip } from "@/components/CategoryChip";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, PRODUCT_CATEGORIES } from "@/constants/theme";

interface Product {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  indicativePrice: string;
  isActive: boolean;
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products = [], isLoading, error, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products/active"],
  });

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      id={item.id}
      name={item.name}
      indicativePrice={item.indicativePrice}
      imageUrl={item.imageUrl}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="small" style={[styles.disclaimer, { color: theme.textSecondary, backgroundColor: theme.backgroundDefault }]}>
        Prices may vary. Final price is based on store receipt.
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <CategoryChip
          id="all"
          name="All"
          icon="grid"
          isSelected={selectedCategory === null}
          onPress={() => setSelectedCategory(null)}
        />
        {PRODUCT_CATEGORIES.map((category) => (
          <CategoryChip
            key={category.id}
            id={category.id}
            name={category.name}
            icon={category.icon}
            isSelected={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <LoadingSpinner message="Loading products..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight }]}>
        <EmptyState
          icon="alert-circle"
          title="Something went wrong"
          message="Failed to load products. Please try again."
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
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={filteredProducts}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={
        <EmptyState
          icon="shopping-bag"
          title="No products available"
          message={selectedCategory ? "No products in this category yet." : "No products available yet. Check back soon!"}
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
  header: {
    marginBottom: Spacing.lg,
  },
  disclaimer: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  categoriesContainer: {
    paddingVertical: Spacing.xs,
  },
});
