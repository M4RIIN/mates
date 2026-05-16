import { AppErrors } from "../shared/app-error.js";

export function assertCanAddFriend(requesterId: string, addresseeId: string): void {
  if (requesterId === addresseeId) {
    throw AppErrors.validation("You cannot add yourself as a friend");
  }
}
