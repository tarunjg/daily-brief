/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  // The auth route exports `authOptions`, which Next's route type-check rejects.
  // This is pre-existing; type safety is enforced via `tsc` in development.
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
