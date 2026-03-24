"use client"
import { useForm } from "@tanstack/react-form-nextjs"
import { useState } from "react"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import SSOForm from "@components/forms/SSOForm"
import { useRouter } from "next/navigation"
// import ForgotPasswordForm from "@components/forms/ForgotPasswordForm"

const LoginForm = () => {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async (values) => {
      setSubmitError(null)

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values.value),
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || errorData.message || "An unknown error occurred")
        }
        router.replace("/account/dashboard")
        router.refresh()
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "An unknown error occurred")
      }
    },
  })

  return (
    <div className="flex flex-col items-center">
      <form
        className="flex w-full flex-col items-center gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field
          name="email"
          validators={{ onSubmit: ({ value }) => (value ? undefined : "Email is required") }}
        >
          {(field) => (
            <div className="w-full">
              <Label htmlFor="email" className="mb-2">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                aria-describedby={field.state.meta.errors.length > 0 ? "email_error" : undefined}
              />
              {field.state.meta.errors[0] ? (
                <p id="email_error" className="mt-2 text-sm text-destructive">
                  {String(field.state.meta.errors[0])}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>
        <form.Field
          name="password"
          validators={{ onSubmit: ({ value }) => (value ? undefined : "Password is required") }}
        >
          {(field) => (
            <div className="w-full">
              <Label htmlFor="password" className="mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                aria-describedby={field.state.meta.errors.length > 0 ? "password_error" : undefined}
              />
              {field.state.meta.errors[0] ? (
                <p id="password_error" className="mt-2 text-sm text-destructive">
                  {String(field.state.meta.errors[0])}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button className="w-full mt-4" type="submit" disabled={!canSubmit || isSubmitting}>
              Login
            </Button>
          )}
        </form.Subscribe>
      </form>

      <SSOForm />
      {/* <ForgotPasswordForm /> */}
      {submitError ? (
        <p className="mt-2 text-sm text-destructive" role="alert" aria-live="assertive">
          {submitError}
        </p>
      ) : null}
    </div>
  )
}

export default LoginForm
