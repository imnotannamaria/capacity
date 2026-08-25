import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ApolloWrapper } from "@/components/apollo-provider"
import { Toaster } from "@/components/entrepta/toast"
import "./globals.css"

// Display face — characterful grotesque for the wordmark and headings.
// Only the weights actually used ship: 500 (t-heading-md) and 600 (wordmark,
// display, t-heading-lg).
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["500", "600"],
  display: "swap",
})

// Body — warm, legible sans. 400 (base) and 500 (medium) are all it renders.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500"],
  display: "swap",
})

// Data — mono with tabular figures for times, ids, and counts. 400 + 500.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Capacity — dispatch board",
    template: "%s · Capacity",
  },
  description:
    "A live dispatch board: crews and trucks as lanes, jobs draggable between them and across days, with the server as the source of truth on every conflict.",
  applicationName: "Capacity",
  keywords: ["dispatch", "scheduling", "crews", "moving company", "drag and drop"],
  authors: [{ name: "Anna Maria" }],
  openGraph: {
    title: "Capacity — dispatch board",
    description:
      "Crews and trucks as lanes, jobs draggable between them and across days. Optimistic on drop, honest on conflict.",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
  colorScheme: "dark light",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}>
        {/* Re-apply the saved theme before hydration so there's no flash of
            the wrong mode. Dark is the default (no attribute needed). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('mode');if(m==='light'||m==='dark'){document.documentElement.dataset.mode=m}}catch(e){}",
          }}
        />
        <ApolloWrapper>{children}</ApolloWrapper>
        <Toaster position="bottom-right" />
        <Analytics />
      </body>
    </html>
  )
}
