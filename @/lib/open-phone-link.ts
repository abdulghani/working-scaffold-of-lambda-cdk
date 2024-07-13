export function openPhoneLink(phoneNumber: string, template?: string) {
  if (!phoneNumber) {
    return;
  }
  const encoded = template ? encodeURIComponent(template) : "";
  window.open(
    `https://wa.me/${phoneNumber}${encoded ? `?text=${encoded}` : ""}`,
    "_blank"
  );
}
