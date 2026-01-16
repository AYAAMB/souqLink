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

type AuthMode = "login" | "register";
type UserType = "customer" | "courier";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [userType, setUserType] = useState<UserType>("customer");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre email");
      return;
    }

    if (authMode === "register" && (!name.trim() || !phone.trim())) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);
    try {
      await login(
        email.trim().toLowerCase(),
        authMode === "register" ? name.trim() : email.split("@")[0],
        authMode === "register" ? phone.trim() : "",
        userType
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Erreur", "Echec de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login");
    setEmail("");
    setName("");
    setPhone("");
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
        <ThemedText type="h2" style={[styles.title, { color: theme.primary }]}>
          SouqLink
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {authMode === "login" 
            ? "Connectez-vous à votre compte" 
            : "Créez votre compte"}
        </ThemedText>
      </View>

      <View style={[styles.authToggle, { backgroundColor: theme.backgroundDefault }]}>
        <Pressable
          onPress={() => setAuthMode("login")}
          style={[
            styles.authToggleButton,
            authMode === "login" && { backgroundColor: theme.primary },
          ]}
        >
          <ThemedText
            type="body"
            style={[
              styles.authToggleText,
              { color: authMode === "login" ? "#FFFFFF" : theme.text },
            ]}
          >
            Connexion
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setAuthMode("register")}
          style={[
            styles.authToggleButton,
            authMode === "register" && { backgroundColor: theme.primary },
          ]}
        >
          <ThemedText
            type="body"
            style={[
              styles.authToggleText,
              { color: authMode === "register" ? "#FFFFFF" : theme.text },
            ]}
          >
            Inscription
          </ThemedText>
        </Pressable>
      </View>

      {authMode === "register" ? (
        <View style={styles.userTypeSelector}>
          <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
            Je suis:
          </ThemedText>
          <View style={styles.userTypeRow}>
            <Pressable
              onPress={() => setUserType("customer")}
              style={[
                styles.userTypeButton,
                {
                  backgroundColor: userType === "customer" ? theme.primary : theme.backgroundDefault,
                  borderColor: userType === "customer" ? theme.primary : theme.border,
                },
              ]}
            >
              <ThemedText
                type="body"
                style={{
                  color: userType === "customer" ? "#FFFFFF" : theme.text,
                  fontWeight: "600",
                }}
              >
                Client
              </ThemedText>
              <ThemedText
                type="small"
                style={{
                  color: userType === "customer" ? "rgba(255,255,255,0.8)" : theme.textSecondary,
                  marginTop: Spacing.xs,
                }}
              >
                Commander des courses
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setUserType("courier")}
              style={[
                styles.userTypeButton,
                {
                  backgroundColor: userType === "courier" ? theme.accent : theme.backgroundDefault,
                  borderColor: userType === "courier" ? theme.accent : theme.border,
                },
              ]}
            >
              <ThemedText
                type="body"
                style={{
                  color: userType === "courier" ? "#FFFFFF" : theme.text,
                  fontWeight: "600",
                }}
              >
                Livreur
              </ThemedText>
              <ThemedText
                type="small"
                style={{
                  color: userType === "courier" ? "rgba(255,255,255,0.8)" : theme.textSecondary,
                  marginTop: Spacing.xs,
                }}
              >
                Effectuer des livraisons
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="Entrez votre email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        
        {authMode === "register" ? (
          <>
            <Input
              label="Nom complet"
              placeholder="Entrez votre nom"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
            <Input
              label="Numéro de téléphone"
              placeholder="Entrez votre téléphone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </>
        ) : null}
      </View>

      <Button onPress={handleSubmit} disabled={isLoading} style={styles.button}>
        {isLoading 
          ? "Chargement..." 
          : authMode === "login" 
            ? "Se connecter" 
            : "Créer mon compte"}
      </Button>

      <Pressable onPress={toggleAuthMode} style={styles.switchLink}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {authMode === "login" 
            ? "Pas encore de compte? " 
            : "Déjà un compte? "}
          <ThemedText type="link" style={{ color: theme.primary }}>
            {authMode === "login" ? "S'inscrire" : "Se connecter"}
          </ThemedText>
        </ThemedText>
      </Pressable>

      <ThemedText type="small" style={[styles.disclaimer, { color: theme.textSecondary }]}>
        En continuant, vous acceptez nos Conditions d'Utilisation et Politique de Confidentialité
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
    marginBottom: Spacing["2xl"],
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
  authToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  authToggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
  },
  authToggleText: {
    fontWeight: "600",
  },
  userTypeSelector: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  userTypeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  userTypeButton: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  form: {
    marginBottom: Spacing.lg,
  },
  button: {
    marginBottom: Spacing.lg,
  },
  switchLink: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  disclaimer: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
});
