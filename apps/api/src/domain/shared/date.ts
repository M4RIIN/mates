export function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function assertValidDate(value: Date): void {
  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid date");
  }
}

export function formatFrenchTime(value: Date): string {
  assertValidDate(value);

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris"
  }).format(value);
}

export function startOfLocalDay(value: Date): Date {
  assertValidDate(value);

  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfLocalDay(value: Date): Date {
  const end = startOfLocalDay(value);
  end.setDate(end.getDate() + 1);
  return end;
}
