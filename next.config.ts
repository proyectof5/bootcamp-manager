import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: 'export',

  // Trailing slash ensures paths like /login → /login/index.html
  trailingSlash: true,

  // GitHub Pages serves from /<repo-name>/ unless a custom domain is configured.
  // Set NEXT_PUBLIC_BASE_PATH in the GH Actions workflow to match the repo path.
  // Leave empty ('') when using a custom domain at root '/'.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Required for static export — Next.js Image Optimization needs a server.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
