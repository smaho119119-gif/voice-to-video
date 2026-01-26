import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remotion packages need to be external for server-side rendering
  // They contain native binaries that are not compatible with Turbopack bundling
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/compositor-darwin-arm64",
    "@remotion/compositor-darwin-x64",
    "@remotion/compositor-linux-arm64-gnu",
    "@remotion/compositor-linux-arm64-musl",
    "@remotion/compositor-linux-x64-gnu",
    "@remotion/compositor-linux-x64-musl",
    "@remotion/compositor-win32-x64-msvc",
    "esbuild",
  ],
};

export default nextConfig;
