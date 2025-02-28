'use client'

import dynamic from 'next/dynamic'

// Dynamically load GameContainer with no SSR to prevent "window is not defined" errors
const GameContainerClient = dynamic(
  () => import('./GameContainer').then(mod => mod.GameContainer),
  { ssr: false }
)

export function GameContainerWrapper() {
  return <GameContainerClient />
}

