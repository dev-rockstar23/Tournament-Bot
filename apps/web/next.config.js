/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for dynamic pages
  output: 'standalone',
  
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
  },
  
  experimental: {
    serverComponentsExternalPackages: ['three'],
  },
  
  // Skip build-time static generation for error pages and dynamic routes
  // These pages require runtime data and authentication
  skipTrailingSlashRedirect: true,
  
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
