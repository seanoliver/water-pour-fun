import { shuffle } from "lodash"
import { Tube } from "../objects/Tube"
import * as Phaser from "phaser"
import { DebugManager } from "./DebugManager"

// Define an interface for our game scene that includes the properties we need
interface GameScene extends Phaser.Scene {
  isSolvable?: boolean
  debugManager?: DebugManager
}

export class GameLogic {
  private tubes: Tube[] = []
  private selectedTubeIndex: number | null = null

  constructor(private scene: GameScene) {}

  setup(tubes: Tube[]) {
    this.tubes = tubes
    this.mixColors()
    if (!this.isSolvable()) {
      console.log("🔴 [Setup] Game is not solvable, resetting")
      this.setup(tubes)
    }
  }

  reset() {
    this.selectedTubeIndex = null
    this.tubes.forEach((tube) => tube.setSelected(false))
    this.mixColors()
    if (!this.isSolvable()) {
      console.log("🔴 [Reset] Game is not solvable, resetting")
      this.setup(this.tubes)
    }
  }

  mixColors() {
    const tubeCount = this.tubes.length
    // Enough colors to fill all but one tube
    const colorCount = tubeCount - 1

    const orderedColors = Array.from({ length: colorCount }, (_, i) =>
      Array.from({ length: this.tubes[0].maxHeight }, () => i)
    )

    const mixedColors = shuffle(orderedColors.flat())

    // Clear existing colors
    this.tubes.forEach((tube) => {
      tube.colors = []
    })

    // Assign new colors
    this.tubes.forEach((tube) => {
      const tubeColors = mixedColors.splice(0, this.tubes[0].maxHeight)
      tube.colors = tubeColors
      tube.draw()
    })
  }

  handleTubeClick(tube: Tube) {
    const tubeIndex = this.tubes.indexOf(tube)

    if (this.selectedTubeIndex === null) {
      // First click: select the tube
      this.selectedTubeIndex = tubeIndex
      tube.setSelected(true)
    } else {
      // Second click: attempt to pour
      if (this.selectedTubeIndex !== tubeIndex) {
        this.pour(this.selectedTubeIndex, tubeIndex)
      }

      // Clear selection
      this.tubes[this.selectedTubeIndex].setSelected(false)
      this.selectedTubeIndex = null
    }

    // Check if game is over and update debug status
    const gameState = this.checkGameState()

    // Update the solvability status on the scene
    if (this.scene.isSolvable !== undefined) {
      this.scene.isSolvable = gameState.solvable

      // If scene has a debug manager, refresh the debug display
      if (this.scene.debugManager) {
        this.scene.debugManager.showDebugInfo()
      }
    }
  }

  private pour(fromIndex: number, toIndex: number) {
    const fromTube = this.tubes[fromIndex]
    const toTube = this.tubes[toIndex]

    if (fromTube.isEmpty()) return // nothing to pour

    const topFromColor = fromTube.getTopColor() as number
    const segmentsToPour = fromTube.getConsecutiveTopColors()

    // Check if we can pour into destination tube
    const toTopColor = toTube.getTopColor()

    // Can only pour if destination has enough space and color matches or is empty
    const spaceAvailable = this.tubes[0].maxHeight - toTube.colors.length

    const canPour =
      spaceAvailable > 0 && (toTopColor === null || toTopColor === topFromColor)

    if (canPour) {
      // Calculate how many segments we can actually pour (limited by available space)
      const segmentsToActuallyPour = Math.min(segmentsToPour, spaceAvailable)

      // Remove segments from source tube
      fromTube.removeTopColors(segmentsToActuallyPour)

      // Add segments to destination tube
      toTube.addColors(topFromColor, segmentsToActuallyPour)
    }
  }

  checkGameState() {
    const isSolvedState = this.isSolved()
    const isSolvableState = this.isSolvable()

    if (isSolvedState) {
      // Player has won
      console.log("Puzzle solved! 🎉")
      // Could trigger victory animation or message here
      return { solved: true, solvable: true }
    } else if (!isSolvableState) {
      // Game is in an unsolvable state
      console.log("Puzzle is no longer solvable! 😞")
      // Could trigger message to player or reset option
      return { solved: false, solvable: false }
    }

    // Game is still in progress
    return { solved: false, solvable: true }
  }

  isSolvable() {
    // TODO: Put the minimal tube logic somewhere else
    // Define a minimal tube-like structure that doesn't render
    interface MinimalTube {
      colors: number[]
      maxHeight: number
      isEmpty(): boolean
      isCompleted(): boolean
      getTopColor(): number | null
      getConsecutiveTopColors(): number
      removeTopColors(count: number): void
      addColors(color: number, count: number): void
    }

    // Create a minimal tube that doesn't render anything
    const createMinimalTube = (
      colors: number[],
      maxHeight: number
    ): MinimalTube => {
      return {
        colors: [...colors],
        maxHeight,
        isEmpty(): boolean {
          return this.colors.length === 0
        },
        isCompleted(): boolean {
          return (
            this.colors.length === 0 ||
            (this.colors.length === this.maxHeight &&
              this.colors.every((color) => color === this.colors[0]))
          )
        },
        getTopColor(): number | null {
          return this.colors.length > 0
            ? this.colors[this.colors.length - 1]
            : null
        },
        getConsecutiveTopColors(): number {
          if (this.isEmpty()) return 0

          const topColor = this.getTopColor()
          let count = 0

          for (let i = this.colors.length - 1; i >= 0; i--) {
            if (this.colors[i] === topColor) {
              count++
            } else {
              break
            }
          }

          return count
        },
        removeTopColors(count: number): void {
          this.colors.splice(this.colors.length - count, count)
        },
        addColors(color: number, count: number): void {
          for (let i = 0; i < count; i++) {
            this.colors.push(color)
          }
        },
      }
    }

    // Helper function to create a string representation of a game state
    const getStateHash = (tubes: MinimalTube[]): string => {
      return tubes.map((tube) => tube.colors.join(",")).join("|")
    }

    // Helper function to clone the current state of tubes
    const cloneTubeState = (tubes: MinimalTube[]): MinimalTube[] => {
      return tubes.map((tube) => createMinimalTube(tube.colors, tube.maxHeight))
    }

    // Helper function to check if a state is solved
    const isStateSolved = (tubes: MinimalTube[]): boolean => {
      return tubes.every((tube) => tube.isEmpty() || tube.isCompleted())
    }

    // Convert the actual tubes to minimal tubes
    const tubeMaxHeight = this.tubes[0].maxHeight
    const initialTubes = this.tubes.map((tube) =>
      createMinimalTube(tube.colors, tubeMaxHeight)
    )

    // Set up the BFS
    const queue: { tubes: MinimalTube[]; moves: string[] }[] = []
    const visited = new Set<string>()

    // Start with the current state
    const initialHash = getStateHash(initialTubes)

    queue.push({ tubes: initialTubes, moves: [] })
    visited.add(initialHash)

    while (queue.length > 0) {
      const { tubes, moves } = queue.shift()!

      // Check if this state is already solved
      if (isStateSolved(tubes)) {
        return true
      }

      // Generate all possible next states by trying all possible pours
      for (let fromIndex = 0; fromIndex < tubes.length; fromIndex++) {
        for (let toIndex = 0; toIndex < tubes.length; toIndex++) {
          if (fromIndex === toIndex) continue // Can't pour to the same tube

          const fromTube = tubes[fromIndex]
          const toTube = tubes[toIndex]

          // Skip if source tube is empty
          if (fromTube.isEmpty()) continue

          // Get the top color and count of consecutive top colors
          const topFromColor = fromTube.getTopColor()
          const segmentsToPour = fromTube.getConsecutiveTopColors()

          // Check if we can pour into destination tube
          const toTopColor = toTube.getTopColor()

          // Space available in the destination tube
          const spaceAvailable = toTube.maxHeight - toTube.colors.length

          // Can only pour if destination has enough space and color matches or is empty
          const canPour =
            spaceAvailable > 0 &&
            (toTopColor === null || toTopColor === topFromColor)

          if (canPour) {
            // Calculate how many segments we can actually pour
            const segmentsToActuallyPour = Math.min(
              segmentsToPour,
              spaceAvailable
            )

            // Create a new state by cloning current tubes
            const newTubes = cloneTubeState(tubes)

            // Perform the pour operation
            newTubes[fromIndex].removeTopColors(segmentsToActuallyPour)
            newTubes[toIndex].addColors(
              topFromColor as number,
              segmentsToActuallyPour
            )

            // Convert to hash to check if we've seen this state before
            const newStateHash = getStateHash(newTubes)

            if (!visited.has(newStateHash)) {
              visited.add(newStateHash)
              queue.push({
                tubes: newTubes,
                moves: [
                  ...moves,
                  `Pour ${segmentsToActuallyPour} from tube ${fromIndex} to tube ${toIndex}`,
                ],
              })

              // Optional: limit the search space to prevent excessive memory usage
              if (visited.size > 100000) {
                console.warn("Search space too large, stopping BFS")
                return true // Assume it's solvable rather than continuing indefinitely
              }
            }
          }
        }
      }
    }

    // If we've explored all reachable states and found no solution
    return false
  }

  // TODO: Implement this
  isSolved() {
    // Game is solved if all tubes are either empty or contain the same color
    return this.tubes.every((tube) => tube.isCompleted())
  }
}
