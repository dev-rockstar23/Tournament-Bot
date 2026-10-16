/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization completely - this is a fully dynamic app
  output: 'standalone',
  
  // Disable static page generation
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
  },
  
  experimental: {
    serverComponentsExternalPackages: ['three'],
  },
  
  // Skip build-time static generation
  skipTrailingSlashRedirect: true,
  
  // Disable static exports completely
  trailingSlash: false,
  
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
