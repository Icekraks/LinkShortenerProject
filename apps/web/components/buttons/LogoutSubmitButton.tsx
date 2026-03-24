"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@ui/button"

const LogoutSubmitButton = () => {
  const { pending } = useFormStatus()

  return (
    <Button
      variant="outline"
      type="submit"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Logging out..." : "Logout"}
    </Button>
  )
}

export default LogoutSubmitButton
