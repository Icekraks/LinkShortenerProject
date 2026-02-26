"use client";
import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form-nextjs";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@ui/input-group";
import { Button } from "@ui/button";
import type { CreateShortLinkResponse, CreateShortLinkSuccessResponse } from "@/types/short-link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/select";
import { Label } from "@ui/label";
import { Input } from "@ui/input";
import { cn } from "@/lib/utils";

const validateUrl = (value: string) => {
  const raw = value.trim();

  if (!raw) {
    return "URL is required";
  }

  try {
    const parsed = new URL(raw);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "URL must start with http:// or https://";
    }
  } catch {
    return "Enter a valid URL";
  }

  return undefined;
};

const expiryOptions = [
  { value: 1, label: "1 hour" },
  { value: 4, label: "4 hours" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
];

const getExpiryLabel = (value: number) => {
  return expiryOptions.find((option) => option.value === value)?.label ?? `${value} hours`;
};

const isCreateShortLinkSuccessResponse = (
  data: CreateShortLinkResponse | null,
): data is CreateShortLinkSuccessResponse => {
  return Boolean(data && "shortUrl" in data && "shortCode" in data);
};

const LinkShortenerForm = () => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<CreateShortLinkSuccessResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  const form = useForm({
    defaultValues: {
      url: "",
      expiryHours: 24,
    },
    onSubmit: async (values) => {
      setSubmitError(null);
      setCreatedLink(null);
      setCopied(false);
      const normalizedUrl = new URL(values.value.url.trim()).toString();

      const response = await fetch("/api/generate-shortlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: normalizedUrl,
          expiryHours: values.value.expiryHours,
        }),
      });

      const data = (await response.json().catch(() => null)) as CreateShortLinkResponse | null;

      if (!response.ok) {
        const errorMessage = data && "error" in data ? data.error : "Failed to create short link";
        setSubmitError(errorMessage);
        return;
      }

      if (!isCreateShortLinkSuccessResponse(data)) {
        setSubmitError("API handler returned an invalid response");
        return;
      }

      setCreatedLink(data);
      setSuccessMessage("Short link created successfully");
      form.reset();
    },
  });

  const handleCopy = async () => {
    if (!createdLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdLink.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setSubmitError("Unable to copy link to clipboard");
    }
  };

  const resetForm = () => {
    setSubmitError(null);
    setCreatedLink(null);
    setCopied(false);
    setSuccessMessage(null);
    form.reset();
  };

  return !createdLink ? (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit(e);
      }}
    >
      <div className="flex flex-col md:flex-row items-center mt-2 gap-4">
        <form.Field
          name="url"
          validators={{
            onSubmit: ({ value }) => validateUrl(value),
          }}
        >
          {(field) => (
            <div className="w-full">
              <Label htmlFor="url" className="mb-1">
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
              <Label htmlFor="expiryHours" className="mb-1">
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
    <div className="mt-3 space-y-2" role="status" aria-live="polite" aria-atomic="true">
      <InputGroup>
        <InputGroupInput value={createdLink.shortUrl} readOnly aria-label="Generated short URL" />
        <InputGroupAddon align="inline-end" className="pr-0">
          <Button
            type="button"
            onClick={handleCopy}
            aria-label="Copy generated short URL"
            className={cn("", copied && "bg-emerald-600 hover:bg-emerald-700")}
          >
            {copied ? "Copied" : "Copy Shortened URL"}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <Button type="button" onClick={resetForm} aria-label="Reset form">
        Generate a New Short Link
      </Button>
      {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
      {copied ? <p className="sr-only">Generated short URL copied to clipboard</p> : null}
    </div>
  );
};

export default LinkShortenerForm;
