export type UserRecord = {
  id: string;
  pseudo: string;
  publicTag: string;
  passwordHash: string | null;
  googleSub: string | null;
  createdAt: Date;
};

export type PublicUserRecord = {
  id: string;
  pseudo: string;
  publicTag: string;
};

export type CreateUserInput = {
  pseudo: string;
  publicTag: string;
  passwordHash?: string | null;
  googleSub?: string | null;
};

export interface UserRepository {
  create(input: CreateUserInput): Promise<UserRecord>;
  findById(id: string): Promise<UserRecord | null>;
  findByPublicTag(publicTag: string): Promise<UserRecord | null>;
  findByGoogleSub(googleSub: string): Promise<UserRecord | null>;
  existsByPublicTag(publicTag: string): Promise<boolean>;
  listByIds(ids: string[]): Promise<PublicUserRecord[]>;
}
