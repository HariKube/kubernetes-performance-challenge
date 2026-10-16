import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The site is served from the domain root (kubernetes-performance-challenge.github.io).
// Set BASE_PATH (e.g. "/kubernetes-performance-challenge") only for a project page.
const basePath = process.env.BASE_PATH ?? "";

// leaderboard/ (parent folder): the site imports shared types from ../src.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
