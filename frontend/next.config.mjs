/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PROD_API_URL: process.env.NEXT_PROD_API_URL,
    NEXT_PROD_TURNSTILE_SITE_KEY: process.env.NEXT_PROD_TURNSTILE_SITE_KEY,
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/notes",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
