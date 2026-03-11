"use client"
import { useCallback, useState } from "react"
import { useForm } from "@tanstack/react-form-nextjs"
import { Button } from "@ui/button"
import type { CreateShortLinkResponse, CreateShortLinkSuccessResponse } from "@/types/short-link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select"
import { Label } from "@ui/label"
import { Input } from "@ui/input"
import { toast } from "sonner"
import LinkShortenerSuccess from "@components/forms/LinkShortenerSuccess"

const validateUrl = (value: string) => {
  const raw = value.trim()

  if (!raw) {
    return "URL is required"
  }

  try {
    const parsed = new URL(raw)

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "URL must start with http:// or https://"
    }
  } catch {
    return "Enter a valid URL"
  }

  return undefined
}

const expiryOptions = [
  { value: 1, label: "1 hour" },
  { value: 4, label: "4 hours" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
]

const getExpiryLabel = (value: number) => {
  return expiryOptions.find((option) => option.value === value)?.label ?? `${value} hours`
}

const isDataUrl = (value: string) => value.startsWith("data:")

const isCreateShortLinkSuccessResponse = (
  data: CreateShortLinkResponse | null,
): data is CreateShortLinkSuccessResponse => {
  if (!data || !("shortUrl" in data) || !("shortCode" in data)) {
    return false
  }

  const qrCodeDataUrl = "qrCodeDataUrl" in data ? data.qrCodeDataUrl : undefined

  return Boolean(
    typeof data.shortUrl === "string" &&
    typeof data.shortCode === "string" &&
    (qrCodeDataUrl === undefined ||
      (typeof qrCodeDataUrl === "string" && isDataUrl(qrCodeDataUrl))),
  )
}

const LinkShortenerForm = () => {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<CreateShortLinkSuccessResponse | null>(null)

  const form = useForm({
    defaultValues: {
      url: "",
      expiryHours: 24,
    },
    onSubmit: async (values) => {
      setSubmitError(null)
      setCreatedLink(null)
      const normalizedUrl = new URL(values.value.url.trim()).toString()

      const response = await fetch("/api/generate-shortlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: normalizedUrl,
          expiryHours: values.value.expiryHours,
        }),
      })

      const data = (await response.json().catch(() => null)) as CreateShortLinkResponse | null

      if (!response.ok) {
        const errorMessage = data && "error" in data ? data.error : "Failed to create short link"
        setSubmitError(errorMessage)
        toast.error(errorMessage)
        return
      }

      if (!isCreateShortLinkSuccessResponse(data)) {
        setSubmitError("API handler returned an invalid response")
        toast.error("API handler returned an invalid response")
        return
      }

      setCreatedLink(data)
      toast.success("Short link created successfully")
      form.reset()
    },
  })

  const resetForm = useCallback(() => {
    setSubmitError(null)
    setCreatedLink(null)
    form.reset()
  }, [form])

  return !createdLink ? (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit(e)
      }}
    >
      <p className="text-muted-foreground text-sm mb-4">
        Enter the URL you want to shorten and select the expiry time. Once submitted, your shortened
        URL will be generated.
      </p>
      <div className="flex flex-col md:flex-row items-center mt-2 gap-4">
        <form.Field
          name="url"
          validators={{
            onSubmit: ({ value }) => validateUrl(value),
          }}
        >
          {(field) => (
            <div className="w-full">
              <Label htmlFor="url" className="mb-2">
                Long URL
              </Label>
              <Input
                type="url"
                placeholder="Enter URL"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                required
              />
              {field.state.meta.errors[0] ? (
                <p className="mt-2 text-sm text-destructive">
                  {String(field.state.meta.errors[0])}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="expiryHours">
          {(field) => (
            <div className="w-full">
              <Label htmlFor="expiryHours" className="mb-2">
                Expiry Time
              </Label>
              <Select
                value={field.state.value.toString()}
                onValueChange={(value) => field.handleChange(Number(value))}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{getExpiryLabel(field.state.value)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {expiryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button className="w-full mt-4" type="submit" disabled={!canSubmit || isSubmitting}>
            Shorten URL
          </Button>
        )}
      </form.Subscribe>
      {submitError ? (
        <p className="mt-2 text-sm text-destructive" role="alert" aria-live="assertive">
          {submitError}
        </p>
      ) : null}
    </form>
  ) : (
    <LinkShortenerSuccess createdLink={createdLink} resetForm={resetForm} />
  )
}

export default LinkShortenerForm
