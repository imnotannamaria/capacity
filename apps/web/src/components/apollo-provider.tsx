"use client"

import { ApolloProvider } from "@apollo/client/react"
import type { ReactNode } from "react"
import { apolloClient } from "@/lib/apollo-client"

export function ApolloWrapper({ children }: { children: ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
}
