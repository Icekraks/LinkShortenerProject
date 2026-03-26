import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { consumeEmailVerificationToken } from "@/lib/authVerification"

export const runtime = "nodejs"

const buildRedirectToLogin = (request: NextRequest, verified: boolean) => {
  const url = request.nextUrl.clone()
  url.pathname = "/account/login"
  url.search = ""
  url.searchParams.set("verified", verified ? "1" : "0")
  return url
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(buildRedirectToLogin(request, false))
  }

  try {
    const result = await consumeEmailVerificationToken(token)
    return NextResponse.redirect(buildRedirectToLogin(request, result.ok))
  } catch (error) {
    console.error("Failed to verify email", error)
    return NextResponse.redirect(buildRedirectToLogin(request, false))
  }
}
