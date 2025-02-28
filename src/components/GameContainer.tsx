'use client'

import { useEffect, useRef, useState } from "react"
import dynamic from 'next/dynamic'

import MainScene from "./scenes/MainScene"
import { APP_WIDTH } from "@/lib/constants"
import { APP_HEIGHT } from "@/lib/constants"

// Define base config without Phaser-specific types
const configBase = {
  width: APP_WIDTH,
  height: APP_HEIGHT,
  backgroundColor: "#000000",
  parent: "phaser-game", // corresponds to id of containing div
  scene: [MainScene],
}

export const GameContainer = () => {
  const phaserGameRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Set isClient to true when component mounts on client side
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Only initialize Phaser on the client side
    if (isClient) {
      // Dynamic import of Phaser
      import('phaser').then((PhaserModule) => {
        let game: Phaser.Game | null = null

        // Create the complete config with Phaser-specific properties
        const completeConfig = {
          ...configBase,
          type: PhaserModule.AUTO, // Use the correct Phaser.AUTO constant
          parent: phaserGameRef.current,
        }

        // Create the Phaser game instance with the correct constructor
        game = new PhaserModule.Game(completeConfig)

        // Cleanup on unmount
        return () => {
          if (game) {
            game.destroy(true)
          }
        }
      })
    }
  }, [isClient])

  return (
    <div className="flex justify-center items-center py-8">
      <div id="phaser-game" ref={phaserGameRef} />
    </div>
  )
}
