/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: Disable ALL static generation
  output: 'standalone',
  
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
    unoptimized: true, // Disable image optimization for faster builds
  },
  
  experimental: {
    serverComponentsExternalPackages: ['three'],
  },
  
  // Disable static optimization
  skipTrailingSlashRedirect: true,
  trailingSlash: false,
  
  // Force runtime rendering
  reactStrictMode: false,
  
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
    
    // Disable static page optimization
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
  
  // Disable static export completely
  distDir: '.next',
}

module.exports = nextConfig
