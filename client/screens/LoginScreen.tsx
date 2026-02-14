import React, { useMemo, useState } from "react";
import { StyleSheet, View, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import emailjs from "@emailjs/browser";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";

type AuthMode = "login" | "register";
type UserType = "customer" | "courier";

/** ✅ Password input with show/hide (same style) */
type PasswordInputProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  theme: any;
};

function PasswordInput({ label, placeholder, value, onChangeText, theme }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const rightLabel = useMemo(() => (isVisible ? "Masquer" : "Afficher"), [isVisible]);

  return (
    <View style={pwdStyles.wrap}>
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
      />
      <Pressable onPress={() => setIsVisible((s) => !s)} style={pwdStyles.toggle} hitSlop={10}>
        <ThemedText type="link" style={{ color: theme.primary }}>
          {rightLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const pwdStyles = StyleSheet.create({
  wrap: { position: "relative" },
  toggle: {
    position: "absolute",
    right: 0,
    top: 34,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
});

export default function LoginScreen() {
  const [uiError, setUiError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { login, register, forgotPassword, resetPassword } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [userType, setUserType] = useState<UserType>("customer");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // reset password UI
  const [showReset, setShowReset] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async () => {
    setUiError(null);

    if (!email.trim()) {
      const msg = "Veuillez entrer votre email";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
      return;
    }

    if (!password.trim()) {
      const msg = "Veuillez entrer votre mot de passe";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
      return;
    }

    if (authMode === "register" && (!name.trim() || !phone.trim())) {
      const msg = "Veuillez remplir tous les champs";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (authMode === "login") {
        await login(cleanEmail, password, userType);
      } else {
        await register(cleanEmail, name.trim(), phone.trim(), password, userType);
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      let errorMessage = "Echec de connexion. Veuillez réessayer.";

      if (typeof error?.message === "string" && error.message.trim()) {
        try {
          const parsed = JSON.parse(error.message);
          errorMessage = parsed?.error ?? errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }

      if (error?.response?.data?.error) errorMessage = error.response.data.error;
      if (error?.error) errorMessage = error.error;

      if (Platform.OS === "web") setUiError(errorMessage);
      else Alert.alert("Connexion impossible", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setUiError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      const msg = "Email requis";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
      return;
    }
    if (!otp.trim()) {
      const msg = "Veuillez entrer le code OTP";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
      return;
    }
    if (!newPassword.trim()) {
      const msg = "Veuillez entrer le nouveau mot de passe";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
      return;
    }
    if (newPassword.trim().length < 6) {
      const msg = "Mot de passe trop court (min 6 caractères).";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
      return;
    }

    setIsLoading(true);
    try {
      const data = await resetPassword(cleanEmail, otp.trim(), newPassword.trim());
      const msg = (data as any)?.message ?? "Mot de passe mis à jour.";

      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Succès", msg);

      setShowReset(false);
      setOtp("");
      setNewPassword("");
      setPassword("");
    } catch (error: any) {
      const msg = error?.message || "Réinitialisation impossible.";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ✅ Forgot password (MVP)
   *  - Appelle l'API => récupère otp (MVP)
   *  - Envoie l'email via EmailJS dans le navigateur
   *  - N'affiche PAS l'otp à l'utilisateur
   */
  const handleForgotPassword = async () => {
    setUiError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      const msg = "Entrez votre email pour réinitialiser le mot de passe";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Info", msg);
      return;
    }

    setIsLoading(true);
    try {
      const data = await forgotPassword(cleanEmail);

      const msg = (data as any)?.message ?? "Si ce compte existe, un code a été envoyé par email.";

      // Afficher message neutre
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Info", msg);

      // ✅ Si otp existe (MVP), on envoie via EmailJS côté navigateur
      const otpFromApi = (data as any)?.otp as string | null | undefined;

      if (otpFromApi && Platform.OS === "web") {
        const serviceId =
          (process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID as string) || "Souqlink";
        const templateId =
          (process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID as string) || "template_68k1b0j";
        const publicKey =
          (process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY as string) || "oy8r9D4OmUf6Rln5F";

        await emailjs.send(
          serviceId,
          templateId,
          {
            to_email: cleanEmail,
            otp_code: otpFromApi,
            expires_in: (data as any)?.expiresInMinutes ?? 10,
            app_name: "SouqLink",
          },
          publicKey
        );
      } else {
        // Mobile / ou otp null => en prod tu brancheras un vrai email serveur
        // MVP: on continue quand même vers l'écran OTP
      }

      // afficher le formulaire OTP
      setShowReset(true);
      setOtp("");
      setNewPassword("");
    } catch (error: any) {
      const msg = error?.message || "Impossible d'envoyer le code.";
      if (Platform.OS === "web") setUiError(msg);
      else Alert.alert("Erreur", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login");
    setEmail("");
    setName("");
    setPhone("");
    setPassword("");
    setUiError(null);

    setShowReset(false);
    setOtp("");
    setNewPassword("");
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
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            contentFit="cover"
          />
        </View>
        <ThemedText type="h2" style={[styles.title, { color: theme.primary }]}>
          SouqLink
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {authMode === "login" ? "Connectez-vous à votre compte" : "Créez votre compte"}
        </ThemedText>
      </View>

      <View style={[styles.authToggle, { backgroundColor: theme.backgroundDefault }]}>
        <Pressable
          onPress={() => setAuthMode("login")}
          style={[styles.authToggleButton, authMode === "login" && { backgroundColor: theme.primary }]}
        >
          <ThemedText
            type="body"
            style={[styles.authToggleText, { color: authMode === "login" ? "#FFFFFF" : theme.text }]}
          >
            Connexion
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setAuthMode("register")}
          style={[styles.authToggleButton, authMode === "register" && { backgroundColor: theme.primary }]}
        >
          <ThemedText
            type="body"
            style={[styles.authToggleText, { color: authMode === "register" ? "#FFFFFF" : theme.text }]}
          >
            Inscription
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.userTypeSelector}>
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          {authMode === "register" ? "Je suis:" : "Me connecter en tant que:"}
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
            <ThemedText type="body" style={{ color: userType === "customer" ? "#FFFFFF" : theme.text, fontWeight: "600" }}>
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
            <ThemedText type="body" style={{ color: userType === "courier" ? "#FFFFFF" : theme.text, fontWeight: "600" }}>
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

        <PasswordInput
          label="Mot de passe"
          placeholder="Entrez votre mot de passe"
          value={password}
          onChangeText={setPassword}
          theme={theme}
        />

        {authMode === "login" ? (
          <Pressable onPress={handleForgotPassword} style={styles.forgotLink} hitSlop={10}>
            <ThemedText type="link" style={{ color: theme.primary }}>
              Mot de passe oublié ?
            </ThemedText>
          </Pressable>
        ) : null}

        {authMode === "login" && showReset ? (
          <View style={{ marginTop: Spacing.md }}>
            <Input
              label="Code OTP"
              placeholder="Entrez le code reçu par email"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              autoCapitalize="none"
            />

            <PasswordInput
              label="Nouveau mot de passe"
              placeholder="Entrez votre nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              theme={theme}
            />

            <Button onPress={handleResetPassword} disabled={isLoading} style={{ marginTop: Spacing.md }}>
              {isLoading ? "Chargement..." : "Valider le nouveau mot de passe"}
            </Button>
          </View>
        ) : null}

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

      {uiError ? (
        <View style={[styles.errorBox, { borderColor: "#EF4444" }]}>
          <ThemedText type="small" style={{ color: "#EF4444", textAlign: "center" }}>
            {uiError}
          </ThemedText>
        </View>
      ) : null}

      <Button onPress={handleSubmit} disabled={isLoading} style={styles.button}>
        {isLoading ? "Chargement..." : authMode === "login" ? "Se connecter" : "Créer mon compte"}
      </Button>

      <Pressable onPress={toggleAuthMode} style={styles.switchLink}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {authMode === "login" ? "Pas encore de compte? " : "Déjà un compte? "}
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
  errorBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  header: { alignItems: "center", marginBottom: Spacing["2xl"] },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  logo: { width: 88, height: 88 },
  title: { marginBottom: Spacing.xs },
  subtitle: { textAlign: "center" },

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
  authToggleText: { fontWeight: "600" },

  userTypeSelector: { marginBottom: Spacing.xl },
  label: { marginBottom: Spacing.sm, fontWeight: "500" },
  userTypeRow: { flexDirection: "row", gap: Spacing.md },
  userTypeButton: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },

  form: { marginBottom: Spacing.lg },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },

  button: { marginBottom: Spacing.lg },
  switchLink: { alignItems: "center", marginBottom: Spacing.xl },
  disclaimer: { textAlign: "center", paddingHorizontal: Spacing.lg },
});
