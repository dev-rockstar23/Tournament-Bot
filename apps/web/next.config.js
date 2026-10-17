/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // We run ESLint separately; don't fail the production build on lint warnings
    ignoreDuringBuilds: true,
  },
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
    
    return config;
  },
  
  distDir: '.next',
}

module.exports = nextConfig
