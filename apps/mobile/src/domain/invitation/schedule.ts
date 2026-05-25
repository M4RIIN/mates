export function buildTodayScheduledAt(timeText: string, now: Date = new Date()): string {
  const match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(timeText.trim());
  if (match === null) {
    throw new Error("Utilise le format HH:mm");
  }

  const hour = Number.parseInt(match[1] ?? "0", 10);
  const minute = Number.parseInt(match[2] ?? "0", 10);
  const scheduledAt = new Date(now);
  scheduledAt.setHours(hour, minute, 0, 0);

  return scheduledAt.toISOString();
}

export function buildTodayScheduledAtFromParts(hourText: string, minuteText: string, now: Date = new Date()): string {
  const hour = Number.parseInt(hourText.trim(), 10);
  const minute = Number.parseInt(minuteText.trim(), 10);

  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    throw new Error("Entre une heure entre 0 et 23");
  }

  if (Number.isNaN(minute) || minute < 0 || minute > 59) {
    throw new Error("Entre des minutes entre 0 et 59");
  }

  const scheduledAt = new Date(now);
  scheduledAt.setHours(hour, minute, 0, 0);

  return scheduledAt.toISOString();
}

export function getDefaultInvitationTime(now: Date = new Date()): string {
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  return `${nextHour.getHours().toString().padStart(2, "0")}:${nextHour
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function getDefaultInvitationTimeParts(now: Date = new Date()): { hour: string; minute: string } {
  const [hour, minute] = getDefaultInvitationTime(now).split(":");

  return {
    hour: hour ?? "00",
    minute: minute ?? "00"
  };
}
