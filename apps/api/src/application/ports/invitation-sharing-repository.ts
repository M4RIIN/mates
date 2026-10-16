export type ShareLinkRecord = { invitationId: string; token: string; showAddress: boolean; revokedAt: Date | null };
export type GuestResponseRecord = { id: string; invitationId: string; name: string; responseStatus: "yes" | "no"; respondedAt: Date };
export type GuestResponseInput = { token: string; guestKeyHash: string; analyticsBrowserIdHash?: string; name: string; status: "yes" | "no"; now: Date };
export interface InvitationSharingRepository {
  findLink(invitationId: string): Promise<ShareLinkRecord | null>;
  findByToken(token: string): Promise<ShareLinkRecord | null>;
  enable(invitationId: string, token: string, showAddress: boolean): Promise<ShareLinkRecord>;
  revoke(invitationId: string): Promise<void>;
  findResponse(invitationId: string, guestKeyHash: string): Promise<GuestResponseRecord | null>;
  respond(input: GuestResponseInput): Promise<GuestResponseRecord>;
}
