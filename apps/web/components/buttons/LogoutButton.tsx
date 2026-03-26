import { redirect } from "next/navigation"

import LogoutSubmitButton from "@/components/buttons/LogoutSubmitButton"
import { deleteActiveSession } from "@/lib/authSession"

const LogoutButton = () => {
  const logout = async () => {
    "use server"

    await deleteActiveSession()
    redirect("/")
  }

  return (
    <form action={logout}>
      <LogoutSubmitButton />
    </form>
  )
}

export default LogoutButton
