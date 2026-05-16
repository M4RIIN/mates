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

export function getDefaultInvitationTime(now: Date = new Date()): string {
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  return `${nextHour.getHours().toString().padStart(2, "0")}:${nextHour
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}
