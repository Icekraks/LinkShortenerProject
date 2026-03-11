export type CreateShortLinkBody = {
  originalUrl?: string
  expiryHours?: number
}

export type CreateShortLinkSuccessResponse = {
  id: number
  shortCode: string
  originalUrl: string
  createdAt: string
  expiryHours: number
  expiresAt: string | null
  shortPath: string
  shortUrl: string
  qrCodeDataUrl?: string
}

export type CreateShortLinkErrorResponse = {
  error: string
  retryAfterSeconds?: number
}

export type CreateShortLinkResponse = CreateShortLinkSuccessResponse | CreateShortLinkErrorResponse
