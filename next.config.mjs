/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor serves a static bundle from `out/` inside the native WebView —
  // no Node server on the phone. Everything runs client-side.
  output: "export",
  images: { unoptimized: true },
  // Home dir has its own lockfile; pin the root so Next doesn't infer it.
  outputFileTracingRoot: import.meta.dirname,

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // @anthropic-ai/sdk's credential chain imports `node:path`/`node:fs` for
      // OAuth profile loading. We always pass an explicit apiKey, so that code
      // path never runs — strip the `node:` scheme and stub the builtins so the
      // SDK can be bundled for the WebView.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        path: false,
        fs: false,
        os: false,
        crypto: false,
        stream: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
