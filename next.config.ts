import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
let repo = "";
if (isGithubActions && process.env.GITHUB_REPOSITORY) {
  repo = process.env.GITHUB_REPOSITORY.split("/")[1] || "";
}

const nextConfig: NextConfig = {
  output: "export",
  basePath: repo ? `/${repo}` : undefined,
  assetPrefix: repo ? `/${repo}/` : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
