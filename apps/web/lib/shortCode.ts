import Hashids from "hashids"

const hashids = new Hashids(process.env.HASHIDS_SALT, 4, "0123456789abcdefghijklmnopqrstuvwxyz")

export function encodeLinkIdToShortCode(id: number): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error("Invalid link id for short code generation")
  }

  const shortCode = hashids.encode(id)

  if (!shortCode) {
    throw new Error("Failed to generate short code")
  }

  return shortCode
}
