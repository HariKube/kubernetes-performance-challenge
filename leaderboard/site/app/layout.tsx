import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Nav from "../components/Nav";
import { getData } from "../lib/data";
import { formatDateTime } from "../lib/format";
import { BASE_PATH, REPO_URL, SITE_NAME, SITE_URL, withBase } from "../lib/site";
import "./globals.css";

const description =
  "Leaderboard of the Kubernetes Performance Challenge: run the standardized k6 benchmark against your own cluster and compare latency, throughput and stability.";

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}${BASE_PATH}/`),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description,
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description },
  twitter: { card: "summary", title: SITE_NAME, description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#171a20" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const data = getData();
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container">
            <a className="site-title" href={withBase("/")}>
              {SITE_NAME}
            </a>
            <Nav />
          </div>
        </header>
        <main id="main" className="container">
          {children}
        </main>
        <footer className="site-footer">
          <div className="container">
            Data from <a href={REPO_URL}>github.com/HariKube/kubernetes-performance-challenge</a> ·{" "}
            <a href={withBase("/leaderboard.json")}>leaderboard.json</a> · generated {formatDateTime(data.generatedAt)}
          </div>
        </footer>
      </body>
    </html>
  );
}
