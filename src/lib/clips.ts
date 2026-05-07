export function isLinkOrPath(text: string) {
  const value = text.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  if (/^[a-zA-Z]:\\/.test(value) || value.startsWith("\\\\")) return true;
  if (value.includes(".") && !value.includes(" ") && value.length > 4) {
    const ext = value.split(".").pop()?.toLowerCase();
    return !!ext && ext.length >= 2 && ext.length <= 4;
  }
  return false;
}
