"use client"

import { useQuery } from "@apollo/client/react"
import { useState } from "react"
import { Skeleton } from "@/components/entrepta/skeleton"
import { BOARD_QUERY, type BoardQueryData, type BoardQueryVariables } from "../data/queries"
import { DayTabs } from "./DayTabs"

export function Board({ dates }: { dates: string[] }) {
  const [activeDate, setActiveDate] = useState(dates[0])

  const { data, loading, error } = useQuery<BoardQueryData, BoardQueryVariables>(BOARD_QUERY, {
    variables: { dates },
  })

  if (loading) {
    return (
      <div role="status" aria-label="Loading board" className="flex flex-col gap-2 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="p-4 font-mono text-[13px] text-[var(--status-error-fg)]">
        Could not load the board: {error.message}
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <DayTabs
      dates={dates}
      crews={data.board.crews}
      jobs={data.board.jobs}
      activeDate={activeDate}
      onActiveDateChange={setActiveDate}
    />
  )
}
