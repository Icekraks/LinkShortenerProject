const DEFAULT_BLACKLISTED_SHORT_CODES = [
  "admin",
  "api",
  "www",
  "root",
  "support",
  "help",
  "about",
  "contact",
  "login",
  "signup",
  "register",
  "dashboard",
  "user",
  "users",
  "account",
  "accounts",
]

const parseEnvironmentBlacklist = (value: string | undefined) => {
  if (!value) {
    return []
  }

  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

const BLACKLISTED_SHORT_CODES = new Set([
  ...DEFAULT_BLACKLISTED_SHORT_CODES,
  ...parseEnvironmentBlacklist(process.env.SHORT_CODE_BLACKLIST),
])

export const isBlacklistedShortCode = (shortCode: string) =>
  BLACKLISTED_SHORT_CODES.has(shortCode.toLowerCase())
