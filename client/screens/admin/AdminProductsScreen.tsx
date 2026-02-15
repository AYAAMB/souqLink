import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { getFullImageUrl } from "@/lib/image-utils";
import { BorderRadius, Spacing, PRODUCT_CATEGORIES } from "@/constants/theme";

interface Product {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  indicativePrice: string;
  isActive: boolean;
}

type ApiProduct = any;

const guessMimeType = (uri: string) => {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
};

const guessFileName = (uri: string) => {
  const part = uri.split("/").pop();
  if (part && part.includes(".")) return part;
  return `product_${Date.now()}.jpg`;
};

function normalizeProduct(row: ApiProduct): Product {
  return {
    id: String(row?.id),
    name: String(row?.name ?? ""),
    category: String(row?.category ?? ""),
    imageUrl: (row?.imageUrl ?? row?.image_url ?? null) as string | null,
    indicativePrice: String(row?.indicativePrice ?? row?.indicative_price ?? "0"),
    isActive: Boolean(row?.isActive ?? row?.is_active ?? false),
  };
}

function safeBaseUrl(): string {
  // Sur WEB, getApiUrl() peut être vide/incorrect => ERR_INVALID_URL
  if (Platform.OS === "web") {
    const candidate = (typeof getApiUrl === "function" ? getApiUrl() : "") as any;
    try {
      if (candidate) {
        // eslint-disable-next-line no-new
        new URL(candidate);
        return candidate;
      }
    } catch {}
    // fallback sûr : même origine (http://localhost:3000)
    return window.location.origin;
  }
  return getApiUrl();
}

export default function AdminProductsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("fruits_vegetables");
  const [price, setPrice] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ WEB file (vrai fichier local)
  const [webFile, setWebFile] = useState<File | null>(null);

  const baseUrl = safeBaseUrl();

  // ✅ WEB: picker fichier fiable (sans ref + sans input dans le Modal)
  const pickWebFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = () => {
      const f = input.files?.[0] ?? null;
      if (!f) return;

      setWebFile(f);
      const preview = URL.createObjectURL(f);
      setImageUri(preview);
    };

    input.click();
  };

  const {
    data: products = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const url = new URL("/api/products", baseUrl).href;
      const r = await fetch(url);
      const text = await r.text();
      if (!r.ok) throw new Error(text || "Failed to load products");
      const raw = JSON.parse(text);
      return Array.isArray(raw) ? raw.map(normalizeProduct) : [];
    },
  });

  // ✅ API unique: /api/products?id=...
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const url = new URL("/api/products", baseUrl);
      url.searchParams.set("id", id);

      const response = await fetch(url.href, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      const text = await response.text();
      if (!response.ok) throw new Error(text || "Failed to update product");
      return normalizeProduct(JSON.parse(text));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll access to add product images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri); // file://...
      setWebFile(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera access to take product photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri); // file://...
      setWebFile(null);
    }
  };

  const handleImagePick = () => {
    // ✅ WEB: always open local file selector
    if (Platform.OS === "web") {
      pickWebFile();
      return;
    }

    Alert.alert("Add Image", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setCategory(product.category);
      setPrice(product.indicativePrice);

      // ✅ en edit: URL affichable si elle existe
      setImageUri(product.imageUrl ? getFullImageUrl(product.imageUrl) : null);
      setWebFile(null);
    } else {
      setEditingProduct(null);
      setName("");
      setCategory("fruits_vegetables");
      setPrice("");
      setImageUri(null);
      setWebFile(null);
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    // cleanup preview blob URL (optionnel mais propre)
    if (Platform.OS === "web" && imageUri?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(imageUri);
      } catch {}
    }

    setModalVisible(false);
    setEditingProduct(null);
    setName("");
    setCategory("fruits_vegetables");
    setPrice("");
    setImageUri(null);
    setWebFile(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const urlObj = new URL("/api/products", baseUrl);
      if (editingProduct) urlObj.searchParams.set("id", editingProduct.id);

      const hasMobileLocal = !!(imageUri && imageUri.startsWith("file://"));
      const hasWebFile = Platform.OS === "web" && !!webFile;

      let response: Response;

      if (hasMobileLocal || hasWebFile) {
        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("category", category);
        formData.append("indicativePrice", price.trim());

        if (hasMobileLocal) {
          formData.append(
            "image",
            {
              uri: imageUri!,
              name: guessFileName(imageUri!),
              type: guessMimeType(imageUri!),
            } as any
          );
        } else if (hasWebFile && webFile) {
          formData.append("image", webFile, webFile.name);
        }

        response = await fetch(urlObj.href, {
          method: editingProduct ? "PATCH" : "POST",
          body: formData,
        });
      } else {
        response = await fetch(urlObj.href, {
          method: editingProduct ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            category,
            indicativePrice: price.trim(),
          }),
        });
      }

      const text = await response.text();
      if (!response.ok) throw new Error(text || "Failed to save product");

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      handleCloseModal();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const fullImageUrl = getFullImageUrl(item.imageUrl);

    return (
      <Pressable
        onPress={() => handleOpenModal(item)}
        style={[
          styles.productCard,
          { backgroundColor: theme.backgroundDefault, opacity: item.isActive ? 1 : 0.6 },
        ]}
      >
        <View style={[styles.productImage, { backgroundColor: theme.backgroundSecondary }]}>
          {fullImageUrl ? (
            <Image source={{ uri: fullImageUrl }} style={styles.image} contentFit="cover" />
          ) : (
            <Feather name="package" size={24} color={theme.textSecondary} />
          )}
        </View>

        <View style={styles.productContent}>
          <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "600" }}>
            {item.name}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {PRODUCT_CATEGORIES.find((c) => c.id === item.category)?.name || item.category}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {parseFloat(item.indicativePrice).toFixed(2)} MAD
          </ThemedText>
        </View>

        <Pressable
          onPressIn={(e) => (e as any).stopPropagation?.()}
          onPress={() => toggleActiveMutation.mutate({ id: item.id, isActive: !item.isActive })}
          style={[
            styles.toggleButton,
            { backgroundColor: item.isActive ? theme.success + "20" : theme.error + "20" },
          ]}
        >
          <Feather
            name={item.isActive ? "check-circle" : "x-circle"}
            size={20}
            color={item.isActive ? theme.success : theme.error}
          />
        </Pressable>
      </Pressable>
    );
  };

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
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 70,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        ListEmptyComponent={
          <EmptyState icon="package" title="No products yet" message="Add your first product to start building your catalog." />
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.fabContainer, { bottom: tabBarHeight + Spacing.lg }]}>
        <Pressable onPress={() => handleOpenModal()} style={[styles.fab, { backgroundColor: theme.primary }]}>
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">{editingProduct ? "Edit Product" : "Add Product"}</ThemedText>
              <Pressable onPress={handleCloseModal}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <KeyboardAwareScrollViewCompat style={styles.modalBody}>
              <Pressable onPress={handleImagePick} style={[styles.imagePicker, { backgroundColor: theme.backgroundDefault }]}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.pickedImage} contentFit="cover" />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Feather name="camera" size={32} color={theme.textSecondary} />
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                      Tap to add image
                    </ThemedText>
                  </View>
                )}
              </Pressable>

              <Input label="Product Name" placeholder="Enter product name" value={name} onChangeText={setName} />

              <ThemedText type="small" style={[styles.label, { color: theme.text }]}>
                Category
              </ThemedText>

              <View style={styles.categoryGrid}>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: category === cat.id ? theme.primary : theme.backgroundDefault,
                        borderColor: category === cat.id ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Feather name={cat.icon} size={16} color={category === cat.id ? "#FFFFFF" : theme.text} />
                    <ThemedText
                      type="small"
                      style={{ color: category === cat.id ? "#FFFFFF" : theme.text, marginLeft: Spacing.xs }}
                    >
                      {cat.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Indicative Price (MAD)"
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />

              <Button onPress={handleSubmit} disabled={isSubmitting} style={styles.submitButton}>
                {isSubmitting ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
              </Button>
            </KeyboardAwareScrollViewCompat>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  productContent: { flex: 1, marginLeft: Spacing.md },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  fabContainer: { position: "absolute", right: Spacing.lg },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  modalBody: { padding: Spacing.lg },

  imagePicker: {
    width: "100%",
    height: 150,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  pickedImage: { width: "100%", height: "100%" },
  imagePickerPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  label: { marginBottom: Spacing.xs, fontWeight: "500" },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },

  submitButton: { marginTop: Spacing.lg, marginBottom: Spacing.xl },
});
