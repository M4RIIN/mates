export type GoogleIdentity = {
  subject: string;
  email: string | null;
  name: string | null;
  pictureUrl: string | null;
};

export interface GoogleIdentityVerifier {
  verifyIdToken(idToken: string): Promise<GoogleIdentity>;
}
