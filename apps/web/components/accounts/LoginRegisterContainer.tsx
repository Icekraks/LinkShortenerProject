import LoginForm from "@/components/forms/LoginForm"
import RegisterForm from "@/components/forms/RegisterForm"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import Link from "next/link"

type LoginRegisterContainerProps = {
  defaultTab: "login" | "register"
}

const LoginRegisterContainer = ({ defaultTab }: LoginRegisterContainerProps) => {
  return (
    <Tabs defaultValue={defaultTab} className={"mx-auto w-full md:w-3/4 md:max-w-187.5"}>
      <TabsList className="w-full mb-4">
        <TabsTrigger value="login" render={<Link href="/account/login/" />} nativeButton={false}>
          Login
        </TabsTrigger>
        <TabsTrigger
          value="register"
          render={<Link href="/account/register" />}
          nativeButton={false}
        >
          Register
        </TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <LoginForm />
      </TabsContent>
      <TabsContent value="register">
        <RegisterForm />
      </TabsContent>
    </Tabs>
  )
}

export default LoginRegisterContainer
