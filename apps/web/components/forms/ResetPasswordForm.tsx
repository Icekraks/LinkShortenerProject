"use client"

import { useForm } from "@tanstack/react-form-nextjs"
import { useState } from "react"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import { InputGroupAddon, InputGroup, InputGroupInput } from "@ui/input-group"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"

const ResetPasswordForm = () => {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const router = useRouter()
  const [viewPassword, setViewPassword] = useState({
    password: false,
    confirmPassword: false,
  })
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async (values) => {
      setSubmitError(null)

      if (values.value.password !== values.value.confirmPassword) {
        setSubmitError("Passwords do not match")
        return
      }

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: values.value.email,
            password: values.value.password,
            token: new URLSearchParams(window.location.search).get("token"),
          }),
        })
        if (!response.ok) {
          const errorData = await response.json()

          throw new Error(errorData.error || "An unknown error occurred")
        }

        router.replace("/account/login")
        router.refresh()
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "An unknown error occurred")
      }
    },
  })
  return (
    <form
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
            <InputGroup>
              <InputGroupInput
                id="password"
                type={viewPassword.password ? "text" : "password"}
                placeholder="Enter your password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                aria-describedby={field.state.meta.errors.length > 0 ? "password_error" : undefined}
              />

              <InputGroupAddon align="inline-end" className="pr-0">
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  aria-label="Toggle Password Visibility"
                  onClick={() => setViewPassword((prev) => ({ ...prev, password: !prev.password }))}
                >
                  {viewPassword.password ? <EyeOff /> : <Eye />}
                </Button>
              </InputGroupAddon>
            </InputGroup>

            {field.state.meta.errors[0] ? (
              <p id="password_error" className="mt-2 text-sm text-destructive">
                {String(field.state.meta.errors[0])}
              </p>
            ) : null}
          </div>
        )}
      </form.Field>
      <form.Field
        name="confirmPassword"
        validators={{
          onSubmit: ({ value }) => (value ? undefined : "Confirm Password is required"),
        }}
      >
        {(field) => (
          <div className="w-full">
            <Label htmlFor="confirmPassword" className="mb-2">
              Confirm Password
            </Label>
            <InputGroup>
              <InputGroupInput
                id="confirmPassword"
                type={viewPassword.confirmPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                aria-describedby={
                  field.state.meta.errors.length > 0 ? "confirmPassword_error" : undefined
                }
              />

              <InputGroupAddon align="inline-end" className="pr-0">
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  aria-label="Toggle Confirm Password Visibility"
                  onClick={() =>
                    setViewPassword((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))
                  }
                >
                  {viewPassword.confirmPassword ? <EyeOff /> : <Eye />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
            {field.state.meta.errors[0] ? (
              <p id="confirmPassword_error" className="mt-2 text-sm text-destructive">
                {String(field.state.meta.errors[0])}
              </p>
            ) : null}
          </div>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button className="w-full mt-4" type="submit" disabled={!canSubmit || isSubmitting}>
            Register
          </Button>
        )}
      </form.Subscribe>
      {submitError ? (
        <p className="mt-2 text-sm text-destructive" role="alert" aria-live="assertive">
          {submitError}
        </p>
      ) : null}
    </form>
  )
}

export default ResetPasswordForm
