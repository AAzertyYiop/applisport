const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const longDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatShortDate(iso: string): string {
  return dayFormatter.format(parseISODate(iso));
}

export function formatLongDate(iso: string): string {
  return longDayFormatter.format(parseISODate(iso));
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysAgo(days: number): string {
  return toISODate(addDays(new Date(), -days));
}

export function isWithinPeriod(isoDateTime: string, days?: number): boolean {
  if (!days) return true;
  const start = addDays(new Date(), -days);
  return new Date(isoDateTime) >= start;
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours} h ${mins}` : `${hours} h`;
}

export function paceFrom(distanceKm: number, durationMinutes: number): string {
  if (distanceKm <= 0 || durationMinutes <= 0) return "n/a";
  const minutesPerKm = durationMinutes / distanceKm;
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - minutes) * 60);
  return `${minutes}'${String(seconds).padStart(2, "0")}/km`;
}
