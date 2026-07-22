export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${normalized}`;
}

export function telUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits.startsWith("57") ? digits : `57${digits}`}` : "";
}

export function mailtoUrl(email: string): string {
  return email.trim() ? `mailto:${email.trim()}` : "";
}
