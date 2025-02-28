'use client'

import * as Phaser from "phaser"
import { useEffect, useRef } from "react"

import MainScene from "./scenes/MainScene"
import { APP_WIDTH } from "@/lib/constants"
import { APP_HEIGHT } from "@/lib/constants"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: APP_WIDTH,
  height: APP_HEIGHT,
  backgroundColor: "#000000",
  parent: "phaser-game", // corresponds to id of containing div
  scene: [MainScene],
}

export const GameContainer = () => {
  const phaserGameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let game: Phaser.Game | null = null

    // Create the Phaser game instance
    game = new Phaser.Game({
      ...config,
      parent: phaserGameRef.current,
    })

    // Cleanup on unmount
    return () => {
      if (game) {
        game.destroy(true)
      }
    }
  })

  return (
    <div className="flex justify-center items-center py-8">
      <div id="phaser-game" ref={phaserGameRef} />
    </div>
  )
}
