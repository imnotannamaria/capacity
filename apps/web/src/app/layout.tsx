import type { Metadata } from "next"
import { ApolloWrapper } from "@/components/apollo-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "capacity",
  description: "A small dispatch board: crews and trucks as columns, jobs draggable between them and between days.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ApolloWrapper>{children}</ApolloWrapper>
      </body>
    </html>
  )
}
