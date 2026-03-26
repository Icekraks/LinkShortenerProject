"use client"
import { Dialog, DialogTrigger, DialogContent } from "@ui/dialog"
import { Button } from "@ui/button"
import { useForm } from "@tanstack/react-form-nextjs"
import { Input } from "@ui/input"
import { Label } from "@ui/label"

const ForgotPasswordForm = () => {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async (values) => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
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
        alert(
          "If an account with that email exists, you will receive password reset instructions shortly.",
        )
      } catch (error) {
        alert(error instanceof Error ? error.message : "An unknown error occurred")
      }
    },
  })
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="link" />}>Forgot Password?</DialogTrigger>
      <DialogContent>
        <h2 className="text-lg font-semibold mb-4">Forgot Password</h2>
        <p className="mb-4">
          Please enter your email address to receive password reset instructions.
        </p>
        <form onSubmit={form.handleSubmit}>
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
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button className="w-full mt-4" type="submit" disabled={!canSubmit || isSubmitting}>
                Send Reset Instructions
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ForgotPasswordForm
