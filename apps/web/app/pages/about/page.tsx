export default function About() {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16">
        <h1 className="text-xl font-bold">About Snipr</h1>

        <p>
          Snipr is a minimal URL shortener built as a full-stack engineering project. Its goal is
          not growth hacking or feature bloat — it is deliberate systems design.
        </p>

        <hr className="divider" />

        <h2 className="text-lg font-semibold">Why Build a URL Shortener?</h2>
        <p>
          On the surface, shortening a link looks trivial. Underneath, it touches core distributed
          systems concepts:
        </p>

        <ul className="list-disc list-inside">
          <li>Deterministic ID generation and encoding strategies</li>
          <li>Collision avoidance and database indexing</li>
          <li>Redirect latency optimization</li>
          <li>Caching layers and hot key mitigation</li>
          <li>Abuse prevention and rate limiting</li>
          <li>Data modeling for analytics and observability</li>
        </ul>

        <p>Snipr exists to explore these problems hands-on.</p>

        <hr className="divider" />

        <h2 className="text-lg font-semibold">Current Focus</h2>
        <ul className="list-disc list-inside">
          <li>Clean routing and redirect handling</li>
          <li>Base62-encoded identifier strategy</li>
          <li>Simple and predictable API design</li>
        </ul>

        <hr className="divider" />

        <h2 className="text-lg font-semibold">What This Project Represents</h2>
        <p>
          Snipr is a bit of an expirement to build out a full stack project with a focus on
          simplicity and clarity. It is not meant to be a production-ready URL shortener, but rather
          a learning exercise in building a clean and maintainable codebase that touches on
          important systems design concepts.
        </p>

        <hr className="divider" />

        <h2 className="text-lg font-semibold">Roadmap</h2>
        <ul className="list-disc list-inside">
          <li>Custom domain support</li>
          <li>Link expiration policies</li>
          <li>Lightweight analytics (privacy-conscious)</li>
          <li>API rate limiting and abuse detection</li>
          <li>Horizontal scalability experiments</li>
        </ul>

        <p className="text-muted">
          Snipr is an evolving systems laboratory — built to learn deeply, implement cleanly, and
          ship thoughtfully.
        </p>
      </main>
    </div>
  );
}
