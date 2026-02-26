import type { NextConfig } from "next"
import path from "node:path"

if (!process.env.HASHIDS_SALT) {
  throw new Error("Missing HASHIDS_SALT environment variable")
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
}

export default nextConfig
