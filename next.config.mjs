/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor serves a static bundle from `out/` inside the native WebView —
  // no Node server on the phone. Everything runs client-side.
  output: "export",
  images: { unoptimized: true },
  // Home dir has its own lockfile; pin the root so Next doesn't infer it.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
