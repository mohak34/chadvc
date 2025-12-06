// Avatar utility functions for deterministic color assignment

const AVATAR_COLORS = [
  "bg-avatar-red",
  "bg-avatar-orange",
  "bg-avatar-yellow",
  "bg-avatar-green",
  "bg-avatar-teal",
  "bg-avatar-blue",
  "bg-avatar-purple",
  "bg-avatar-pink",
  "bg-avatar-indigo",
];

// Simple hash function for string to number
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get deterministic color class for a username
export function getAvatarColor(username: string): string {
  const hash = hashString(username.toLowerCase());
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Get first letter of username for avatar
export function getAvatarInitial(username: string): string {
  return username.charAt(0).toUpperCase();
}

// Check if two timestamps are more than 30 minutes apart
export function isMoreThan30MinutesApart(date1: Date, date2: Date): boolean {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes >= 30;
}
