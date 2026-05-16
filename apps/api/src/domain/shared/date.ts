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
