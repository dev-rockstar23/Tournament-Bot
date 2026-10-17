/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
    unoptimized: true,
  },
  
  experimental: {
    serverComponentsExternalPackages: [
      'three',
      '@prisma/client',
      'prisma',
    ],
  },
  
  skipTrailingSlashRedirect: true,
  trailingSlash: false,
  reactStrictMode: false,
  
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules',
        '**/.git',
        '**/C:/Users/*/Application Data/**',
        '**/C:/Users/*/AppData/**',
      ],
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Resolve @esports/database to use the locally-generated Prisma client
    config.resolve.alias = {
      ...config.resolve.alias,
      '@esports/database': require('path').resolve(__dirname, '../../packages/database/src'),
    }
    
    return config;
  },
  
  distDir: '.next',
}

module.exports = nextConfig
