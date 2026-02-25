export type CreateShortLinkBody = {
  originalUrl?: string;
  expiresAt?: string | null;
};

export type CreateShortLinkSuccessResponse = {
  id: number;
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  shortPath: string;
  shortUrl: string;
};

export type CreateShortLinkErrorResponse = {
  error: string;
};

export type CreateShortLinkResponse =
  | CreateShortLinkSuccessResponse
  | CreateShortLinkErrorResponse;
