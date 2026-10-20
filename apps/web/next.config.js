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
  
  // Disable webpack cache to avoid filesystem issues on Windows
  webpack: (config, { isServer, dev }) => {
    // Disable cache in production build
    if (!dev) {
      config.cache = false;
    }
    
    // Ignore system folders during build (Windows EPERM issue)
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules',
        '**/.git',
        '**/C:/Users/*/Application Data/**',
        '**/C:/Users/*/AppData/**',
        '**/C:/Users/*/Cookies/**',
        '**/C:/Users/*/Local Settings/**',
      ],
    };
    
    // Add IgnorePlugin to prevent scanning system directories
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^.*$/,
        contextRegExp: /C:\\Users\\[^\\]+\\(Application Data|AppData|Cookies|Local Settings)/,
      })
    );
    
    // Also ignore in module resolution - more aggressive
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.(js|ts|tsx)$/,
      exclude: [
        /node_modules/,
        /C:\\Users\\[^\\]+\\Application Data/,
        /C:\\Users\\[^\\]+\\AppData/,
        /C:\\Users\\[^\\]+\\Cookies/,
        /C:\\Users\\[^\\]+\\Local Settings/,
      ],
    });
    
    // Also add resolve.alias to prevent resolution issues
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['fs'] = false;
    config.resolve.alias['path'] = false;
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
  
  distDir: '.next',
}

module.exports = nextConfig
