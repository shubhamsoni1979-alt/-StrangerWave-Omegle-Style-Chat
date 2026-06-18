export const MAX_CHAT_MESSAGE_LENGTH = 500;

/** Client-side guard so obviously-empty/over-length input never reaches the socket. */
export function isSendableMessage(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_CHAT_MESSAGE_LENGTH;
}

export function formatClockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
