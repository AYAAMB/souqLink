import { getApiUrl } from "@/lib/query-client";

/**
 * Converts a relative image URL to a full URL
 * Needed for mobile apps to load images from the server
 */
export function getFullImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  
  // If it's a relative URL, prepend the API base URL
  const baseUrl = getApiUrl();
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  // Ensure the image URL starts with /
  const cleanImageUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  
  return `${cleanBaseUrl}${cleanImageUrl}`;
}
