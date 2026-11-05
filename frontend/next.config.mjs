/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PROD_API_URL: process.env.NEXT_PROD_API_URL,
    NEXT_PROD_TURNSTILE_SITE_KEY: process.env.NEXT_PROD_TURNSTILE_SITE_KEY
  },
};

export default nextConfig;
