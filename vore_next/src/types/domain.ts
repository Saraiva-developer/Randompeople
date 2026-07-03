export type AccountType = "professional" | "common";

export type ProfileType =
  | "service_pro"
  | "food"
  | "shop"
  | "lodging"
  | "creator";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  slug: string;
  name: string;
  type: ProfileType;
  bio?: string | null;
  location?: string | null;
  isPublished: boolean;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  profileId?: string | null;
  contentType: "profile" | "photo" | "video" | "reel";
  contentUrl?: string | null;
  createdAt: string;
  expiresAt: string;
}
