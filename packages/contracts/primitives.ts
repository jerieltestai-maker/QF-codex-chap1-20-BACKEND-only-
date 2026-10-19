export function sgdCents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('SGD amount must have at most two decimal places');
  const [whole, fraction = ''] = value.split('.');
  const cents = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount exceeds safe integer range');
  return Number(cents);
}
export function dateOnly(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value + 'T00:00:00Z')) ||
      new Date(value + 'T00:00:00Z').toISOString().slice(0,10) !== value) throw new Error('Invalid date-only value');
  return value;
}
export function utcInstant(value: string): string {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error('An explicit timezone is required');
  return new Date(value).toISOString();
}
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) {super(message);}
}
export function requiredText(value: string): string {
  const text = value.trim();
  if (!text) throw new AppError(422, 'FIELD_VALIDATION', 'A nonblank value is required');
  return text;
}
