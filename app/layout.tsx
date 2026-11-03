import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

// IBM Plex, self-hosted (SIL Open Font License, see app/fonts/OFL.txt).
const plexSans = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
})

const plexMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
})

const plexCondensed = localFont({
  variable: "--font-plex-condensed",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-sans-condensed-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-condensed-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
})

export const metadata: Metadata = {
  title: "Tranche Loss Simulator",
  description:
    "Model how losses on a GPU-backed financing flow through the capital stack, and how much a residual value guarantee absorbs.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} ${plexCondensed.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
