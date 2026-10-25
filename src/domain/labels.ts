const SERVICE_LABELS: Record<string, string> = {
  branch: 'Branch',
  atm: 'ATM',
  cash_deposit: 'Cash deposits',
  smart_id: 'Smart ID',
  business_banking: 'Business banking',
};

/** The API's label, then a known one, then the code turned into words. */
export function optionLabel(
  id: string,
  fromApi?: readonly { id: string; label: string }[],
): string {
  const match = fromApi?.find((option) => option.id === id);
  if (match) return match.label;
  if (SERVICE_LABELS[id]) return SERVICE_LABELS[id];
  const words = id.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
