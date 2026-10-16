/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['three'],
  },
  webpack: (config, { isServer }) => {
    // Exclude system directories that cause permission issues
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules',
        '**/.git',
        '**/C:/Users/*/Application Data/**',
        '**/C:/Users/*/AppData/**',
      ],
    };
    return config;
  },
}
module.exports = nextConfig
