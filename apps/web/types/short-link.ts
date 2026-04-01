export type CreateShortLinkBody = {
  originalUrl?: string
  expiryHours?: number
  customShortCode?: string
}

export type CreateShortLinkSuccessResponse = {
  id: number
  shortCode: string
  originalUrl: string
  createdAt: string
  expiryHours: number | null
  expiresAt: string | null
  shortPath: string
  shortUrl: string
  qrCodeDataUrl?: string
  isPermanent?: boolean
}

export type CreateShortLinkErrorResponse = {
  error: string
  retryAfterSeconds?: number
}

export type CreateShortLinkResponse = CreateShortLinkSuccessResponse | CreateShortLinkErrorResponse
