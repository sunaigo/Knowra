import type { NextConfig } from 'next';
// 仅类型声明，避免 require('webpack') 报错
type Configuration = any;
type RuleSetRule = any;

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  output: 'standalone',
  webpack (config: Configuration) {
    const fileLoaderRule = config.module?.rules?.find((rule: RuleSetRule) =>
      typeof rule === 'object' && rule !== null && 'test' in rule && rule.test instanceof RegExp && rule.test.test('.svg')
    ) as RuleSetRule | undefined;

    if (fileLoaderRule && config.module && Array.isArray(config.module.rules)) {
      config.module.rules.push(
        {
          ...fileLoaderRule,
          test: /\.svg$/i,
          resourceQuery: /url/, // *.svg?url
        },
        {
          test: /\.svg$/i,
          issuer: fileLoaderRule.issuer,
          resourceQuery: { not: [...((fileLoaderRule.resourceQuery as any)?.not ?? []), /url/] }, // exclude if *.svg?url
          use: ['@svgr/webpack'],
        },
      );
      fileLoaderRule.exclude = /\.svg$/i;
    }

    return config;
  },
};

export default nextConfig;
