import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/graphql"

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: API_URL }),
  cache: new InMemoryCache(),
})
