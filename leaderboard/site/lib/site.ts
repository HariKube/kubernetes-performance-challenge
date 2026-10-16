export const SITE_NAME = "Kubernetes Performance Challenge";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://kubernetes-performance-challenge.github.io").replace(/\/+$/, "");
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const REPO_URL = "https://github.com/HariKube/kubernetes-performance-challenge";

/** Prefix for plain <a href> to files in public/ (next/link adds basePath itself). */
export const withBase = (path: string) => `${BASE_PATH}${path}`;

export const runPath = (id: string) => `/runs/${id}/`;
