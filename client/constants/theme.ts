import { Platform } from "react-native";

// SouqLink brand colors
const primaryGreen = "#10B981"; // Emerald green - fresh produce
const primaryGreenLight = "#34D399";
const primaryGreenDark = "#059669";
const accentOrange = "#F97316"; // Warm orange - souq/market feel
const accentOrangeDark = "#EA580C";

const tintColorLight = primaryGreen;
const tintColorDark = primaryGreenLight;

export const Colors = {
  light: {
    text: "#1F2937",
    textSecondary: "#6B7280",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColorLight,
    link: primaryGreen,
    primary: primaryGreen,
    primaryLight: primaryGreenLight,
    primaryDark: primaryGreenDark,
    accent: accentOrange,
    accentDark: accentOrangeDark,
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F9FAFB",
    backgroundSecondary: "#F3F4F6",
    backgroundTertiary: "#E5E7EB",
    border: "#E5E7EB",
    borderLight: "#F3F4F6",
    cardShadow: "rgba(0, 0, 0, 0.05)",
  },
  dark: {
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColorDark,
    link: primaryGreenLight,
    primary: primaryGreenLight,
    primaryLight: primaryGreen,
    primaryDark: primaryGreenDark,
    accent: accentOrange,
    accentDark: accentOrangeDark,
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    backgroundRoot: "#111827",
    backgroundDefault: "#1F2937",
    backgroundSecondary: "#374151",
    backgroundTertiary: "#4B5563",
    border: "#374151",
    borderLight: "#1F2937",
    cardShadow: "rgba(0, 0, 0, 0.3)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 52,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Categories for products
export const PRODUCT_CATEGORIES = [
  { id: "fruits_vegetables", name: "Fruits & Vegetables", icon: "shopping-bag" },
  { id: "dairy", name: "Dairy", icon: "droplet" },
  { id: "grocery", name: "Grocery", icon: "package" },
  { id: "drinks", name: "Drinks", icon: "coffee" },
  { id: "cleaning", name: "Cleaning", icon: "wind" },
] as const;

// Order statuses
export const ORDER_STATUSES = {
  received: { label: "Received", color: "#6B7280" },
  shopping: { label: "Shopping", color: "#F59E0B" },
  in_delivery: { label: "In Delivery", color: "#3B82F6" },
  delivered: { label: "Delivered", color: "#10B981" },
} as const;

// Quality preferences
export const QUALITY_PREFERENCES = [
  { id: "standard", name: "Standard" },
  { id: "best_quality", name: "Best Quality" },
] as const;

// Time windows
export const TIME_WINDOWS = [
  { id: "morning", name: "Morning (8AM - 12PM)" },
  { id: "afternoon", name: "Afternoon (12PM - 5PM)" },
  { id: "evening", name: "Evening (5PM - 9PM)" },
] as const;
