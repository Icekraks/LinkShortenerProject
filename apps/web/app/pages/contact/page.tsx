import GreetingComponent from "@/components/GreetingComponent"

export default function Contact() {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col py-32 px-16">
        <h1 className="text-xl font-bold mb-4">Contact Us</h1>
        <GreetingComponent />
        <p className="mt-4 text-center">
          If you have any questions or feedback, feel free to reach out to us through the following
          channels:
        </p>
        <ul className="ml-6 list-disc list-inside mt-2">
          <li>
            Github:{" "}
            <a href="https://github.com/Icekraks" className="text-blue-500 hover:underline">
              https://github.com/Icekraks
            </a>
          </li>
        </ul>
      </main>
    </div>
  )
}
