import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, UserRole } from "@/context/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";

type LoginMode = "customer" | "courier";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login } = useAuth();

  const [mode, setMode] = useState<LoginMode>("customer");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !name.trim() || !phone.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), name.trim(), phone.trim(), mode);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing["3xl"],
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <ThemedText type="h2" style={styles.title}>
          SouqLink
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Fresh groceries delivered to your door
        </ThemedText>
      </View>

      <View style={styles.modeSelector}>
        <Pressable
          onPress={() => setMode("customer")}
          style={[
            styles.modeButton,
            {
              backgroundColor: mode === "customer" ? theme.primary : theme.backgroundDefault,
            },
          ]}
        >
          <ThemedText
            type="body"
            style={[
              styles.modeText,
              { color: mode === "customer" ? "#FFFFFF" : theme.text },
            ]}
          >
            Customer
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setMode("courier")}
          style={[
            styles.modeButton,
            {
              backgroundColor: mode === "courier" ? theme.accent : theme.backgroundDefault,
            },
          ]}
        >
          <ThemedText
            type="body"
            style={[
              styles.modeText,
              { color: mode === "courier" ? "#FFFFFF" : theme.text },
            ]}
          >
            Courier
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Input
          label="Full Name"
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
        />
        <Input
          label="Phone Number"
          placeholder="Enter your phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      </View>

      <Button onPress={handleLogin} disabled={isLoading} style={styles.button}>
        {isLoading ? "Signing in..." : "Continue"}
      </Button>

      <ThemedText type="small" style={[styles.disclaimer, { color: theme.textSecondary }]}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </ThemedText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
  },
  modeSelector: {
    flexDirection: "row",
    marginBottom: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  modeText: {
    fontWeight: "600",
  },
  form: {
    marginBottom: Spacing.xl,
  },
  button: {
    marginBottom: Spacing.lg,
  },
  disclaimer: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
