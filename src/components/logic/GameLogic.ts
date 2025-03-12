import { shuffle } from "lodash"
import { Tube } from "../objects/Tube"
import * as Phaser from "phaser"
import { DebugManager } from "./DebugManager"

interface GameScene extends Phaser.Scene {
  isSolvable?: boolean
  debugManager?: DebugManager
}

interface GameState {
  solved: boolean
  solvable: boolean
}

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

interface PourAttempt {
  canPour: boolean
  segmentsToPour: number
}

// Add a new interface for tracking moves
interface Move {
  fromIndex: number;
  toIndex: number;
  color: number;
  count: number;
}

const MAX_BFS_STATES = 500000 // Increased from 100000 to allow for more thorough search

export class GameLogic {
  private tubes: Tube[] = []
  private selectedTubeIndex: number | null = null
  private events: Phaser.Events.EventEmitter
  private setupAttempts = 0
  // Add move history array to track moves
  private moveHistory: Move[] = []

  constructor(private scene: GameScene) {
    this.events = new Phaser.Events.EventEmitter()
  }

  /**
   * Set up the game with the provided tubes
   */
  setup(tubes: Tube[]): boolean {
    this.tubes = tubes
    return this.generateSolvablePuzzle()
  }

  /**
   * Generate a solvable puzzle
   */
  private generateSolvablePuzzle(): boolean {
    this.generateSolvablePuzzleFromSolvedState()
    this.events.emit("gameSetup")
    
    // Update the game state to ensure debug info is current
    this.updateGameState()
    
    return true
  }

  /**
   * Generate a solvable puzzle by starting from a solved state and applying random valid moves in reverse
   */
  private generateSolvablePuzzleFromSolvedState(): void {
    if (!this.validateTubes()) return

    const tubeCount = this.tubes.length
    const tubeHeight = this.tubes[0].maxHeight
    const colorCount = tubeCount - 1 // One tube will be empty
    
    // Maximum number of attempts to generate a solvable puzzle
    const maxAttempts = 5
    let attempts = 0
    let isSolvable = false
    
    while (!isSolvable && attempts < maxAttempts) {
      attempts++
      
      // 1. Start with a solved state: each color fills exactly one tube
      this.clearTubes()

      // Fill each tube with a single color (except for the last tube which remains empty)
      for (let i = 0; i < colorCount; i++) {
        const color = i
        this.tubes[i].colors = Array(tubeHeight).fill(color)
        this.tubes[i].draw()
      }

      // Last tube is empty
      this.tubes[colorCount].colors = []
      this.tubes[colorCount].draw()

      // 2. Apply random moves in reverse to shuffle the puzzle
      // Number of random moves determines difficulty
      const shuffleMoves = tubeHeight * tubeCount * 2 // Adjust for desired difficulty

      for (let move = 0; move < shuffleMoves; move++) {
        this.applyRandomReversePour()
      }
      
      // Verify that the generated puzzle is solvable
      isSolvable = this.isSolvable()
    }
    
    // If we couldn't generate a solvable puzzle after maxAttempts, 
    // create a simple solvable puzzle (almost solved state)
    if (!isSolvable) {
      console.warn("Could not generate a complex solvable puzzle after multiple attempts. Creating a simpler puzzle.")
      this.createSimpleSolvablePuzzle(tubeCount, tubeHeight, colorCount)
    }
  }
  
  /**
   * Create a simple solvable puzzle (almost solved state with just a few moves needed)
   */
  private createSimpleSolvablePuzzle(tubeCount: number, tubeHeight: number, colorCount: number): void {
    // Start with a solved state
    this.clearTubes()
    
    // Fill each tube with a single color (except for the last tube which remains empty)
    for (let i = 0; i < colorCount; i++) {
      const color = i
      this.tubes[i].colors = Array(tubeHeight).fill(color)
      this.tubes[i].draw()
    }
    
    // Last tube is empty
    this.tubes[colorCount].colors = []
    this.tubes[colorCount].draw()
    
    // Apply just a few random reverse pours to make it slightly challenging but definitely solvable
    const simpleMoves = Math.min(5, tubeHeight)
    
    for (let move = 0; move < simpleMoves; move++) {
      this.applyRandomReversePour()
    }
  }

  /**
   * Apply a random valid reverse pour (moving liquid from one tube to another)
   */
  private applyRandomReversePour(): void {
    const tubeCount = this.tubes.length
    const validMoves: { fromIndex: number; toIndex: number; count: number }[] =
      []

    // Find all valid reverse pours
    for (let fromIndex = 0; fromIndex < tubeCount; fromIndex++) {
      const fromTube = this.tubes[fromIndex]

      // Skip if source tube is empty
      if (fromTube.isEmpty()) continue

      for (let toIndex = 0; toIndex < tubeCount; toIndex++) {
        if (fromIndex === toIndex) continue // Can't pour to the same tube

        const toTube = this.tubes[toIndex]
        const fromTopColor = fromTube.getTopColor()

        if (fromTopColor === null) continue

        // In a reverse pour, we're checking if this pour would have been valid in the forward direction
        // A pour is valid if the destination has space and either is empty or has matching top color
        if (toTube.colors.length < toTube.maxHeight) {
          // For a reverse pour, we only need to move one segment at a time
          // as we're constructing a path backwards
          validMoves.push({
            fromIndex,
            toIndex,
            count: 1, // Move just one segment at a time for reverse pours
          })
        }
      }
    }

    // If there are valid moves, pick one randomly and apply it
    if (validMoves.length > 0) {
      const randomMove =
        validMoves[Math.floor(Math.random() * validMoves.length)]
      const fromTube = this.tubes[randomMove.fromIndex]
      const toTube = this.tubes[randomMove.toIndex]
      const color = fromTube.getTopColor()

      if (color !== null) {
        fromTube.removeTopColors(randomMove.count)
        toTube.addColors(color, randomMove.count)
        fromTube.draw()
        toTube.draw()
      }
    }
  }

  /**
   * Reset the game state
   */
  reset(): boolean {
    this.clearSelection()
    this.generateSolvablePuzzleFromSolvedState()
    
    // Double-check that the generated puzzle is solvable
    if (!this.isSolvable()) {
      console.warn("Generated puzzle is not solvable after reset. Trying again with a simpler puzzle.")
      const tubeCount = this.tubes.length
      const tubeHeight = this.tubes[0].maxHeight
      const colorCount = tubeCount - 1
      this.createSimpleSolvablePuzzle(tubeCount, tubeHeight, colorCount)
    }
    
    // Clear move history when game is reset
    this.moveHistory = []
    // Notify about history change
    this.events.emit("historyChange", this.moveHistory.length)
    // Update the game state to ensure debug info is current
    this.updateGameState()
    return true
  }

  /**
   * Clear the current tube selection
   */
  private clearSelection(): void {
    if (this.selectedTubeIndex !== null) {
      this.tubes[this.selectedTubeIndex].setSelected(false)
      this.selectedTubeIndex = null
    }
  }

  /**
   * Mix colors in the tubes to create a new puzzle
   */
  private mixColors(): void {
    if (!this.validateTubes()) return

    const tubeCount = this.tubes.length
    const tubeHeight = this.tubes[0].maxHeight

    const colorGroups = this.generateColorGroups(tubeCount, tubeHeight)
    const mixedColors = shuffle(colorGroups.flat())

    this.clearTubes()
    this.distributeMixedColors(mixedColors, tubeCount, tubeHeight)
  }

  /**
   * Validates that tubes array is valid for the game
   */
  private validateTubes(): boolean {
    if (!this.tubes.length || !this.tubes[0]) {
      console.error("No tubes available for mixing colors")
      return false
    }
    return true
  }

  /**
   * Generate color groups for the puzzle
   */
  private generateColorGroups(
    tubeCount: number,
    tubeHeight: number
  ): number[][] {
    // Enough colors to fill all but one tube (empty tube)
    const colorCount = tubeCount - 1

    // Create arrays of each color, with tubeHeight instances of each
    return Array.from({ length: colorCount }, (_, i) =>
      Array.from({ length: tubeHeight }, () => i)
    )
  }

  /**
   * Clear all tubes of their colors
   */
  private clearTubes(): void {
    this.tubes.forEach((tube) => {
      tube.colors = []
    })
  }

  /**
   * Distribute mixed colors to tubes
   */
  private distributeMixedColors(
    mixedColors: number[],
    tubeCount: number,
    tubeHeight: number
  ): void {
    // Assign new colors to tubes
    for (let i = 0; i < tubeCount - 1; i++) {
      const tubeColors = mixedColors.splice(0, tubeHeight)
      this.tubes[i].colors = tubeColors
      this.tubes[i].draw()
    }

    // Ensure the last tube is empty
    this.tubes[tubeCount - 1].colors = []
    this.tubes[tubeCount - 1].draw()
  }

  /**
   * Handle a tube click event
   */
  handleTubeClick(tube: Tube): void {
    const tubeIndex = this.findTubeIndex(tube)
    if (tubeIndex === -1) return

    if (this.selectedTubeIndex === null) {
      this.handleFirstTubeClick(tube, tubeIndex)
    } else {
      this.handleSecondTubeClick(tubeIndex)
    }

    this.updateGameState()
  }

  /**
   * Find the index of a tube in the tubes array
   */
  private findTubeIndex(tube: Tube): number {
    const tubeIndex = this.tubes.indexOf(tube)

    if (tubeIndex === -1) {
      console.error("Clicked tube not found in tubes array")
    }

    return tubeIndex
  }

  /**
   * Handle the first tube click (selection)
   */
  private handleFirstTubeClick(tube: Tube, tubeIndex: number): void {
    // First click: select the tube if not empty
    if (!tube.isEmpty()) {
      this.selectedTubeIndex = tubeIndex
      tube.setSelected(true)
    }
  }

  /**
   * Handle the second tube click (pour attempt)
   */
  private handleSecondTubeClick(tubeIndex: number): void {
    if (this.selectedTubeIndex === null) return

    // Second click: attempt to pour if not the same tube
    if (this.selectedTubeIndex !== tubeIndex) {
      const success = this.pour(this.selectedTubeIndex, tubeIndex)
      if (success) {
        this.events.emit("pourCompleted", {
          fromIndex: this.selectedTubeIndex,
          toIndex: tubeIndex,
        })
      }
    }

    // Clear selection
    this.clearSelection()
  }

  /**
   * Update the game state and emit appropriate events
   */
  private updateGameState(): void {
    const gameState = this.checkGameState()

    // Update the scene's solvability status
    if (this.scene.isSolvable !== undefined) {
      this.scene.isSolvable = gameState.solvable

      // Update debug display if available
      if (this.scene.debugManager) {
        this.scene.debugManager.updateSolvableState()
      }
    }

    // Emit events based on game state
    if (gameState.solved) {
      this.events.emit("gameSolved")
    } else if (!gameState.solvable) {
      this.events.emit("gameNotSolvable")
    }
  }

  /**
   * Pour liquid from one tube to another
   * Returns true if pour was successful
   */
  private pour(fromIndex: number, toIndex: number): boolean {
    const fromTube = this.tubes[fromIndex]
    const toTube = this.tubes[toIndex]

    const pourAttempt = this.calculatePourAttempt(fromTube, toTube)

    if (!pourAttempt.canPour) return false

    // Calculate how many segments we can actually pour (limited by available space)
    const topFromColor = fromTube.getTopColor()
    if (topFromColor === null) return false

    const spaceAvailable = toTube.maxHeight - toTube.colors.length
    const segmentsToActuallyPour = Math.min(
      pourAttempt.segmentsToPour,
      spaceAvailable
    )

    // Trigger the visual pour animation if available
    if (typeof fromTube.pourTo === 'function') {
      fromTube.pourTo(toTube)
    }

    // Execute the pour
    this.executePour(fromTube, toTube, topFromColor, segmentsToActuallyPour)
    return true
  }

  /**
   * Calculate if a pour attempt is valid and how many segments can be poured
   */
  private calculatePourAttempt(fromTube: Tube, toTube: Tube): PourAttempt {
    if (fromTube.isEmpty()) {
      return { canPour: false, segmentsToPour: 0 }
    }

    const topFromColor = fromTube.getTopColor()
    if (topFromColor === null) {
      return { canPour: false, segmentsToPour: 0 }
    }

    const segmentsToPour = fromTube.getConsecutiveTopColors()
    const toTopColor = toTube.getTopColor()
    const spaceAvailable = toTube.maxHeight - toTube.colors.length

    // Can only pour if destination has enough space and color matches or is empty
    const canPour =
      spaceAvailable > 0 && (toTopColor === null || toTopColor === topFromColor)

    return { canPour, segmentsToPour }
  }

  /**
   * Execute the pour operation between tubes
   */
  private executePour(
    fromTube: Tube,
    toTube: Tube,
    color: number,
    count: number
  ): void {
    fromTube.removeTopColors(count)
    toTube.addColors(color, count)
    
    // Record this move in the history
    const fromIndex = this.findTubeIndex(fromTube);
    const toIndex = this.findTubeIndex(toTube);
    
    this.moveHistory.push({
      fromIndex,
      toIndex,
      color,
      count
    });
    
    // Notify about history change
    this.events.emit("historyChange", this.moveHistory.length)
    
    this.updateGameState()
  }

  /**
   * Check the current game state
   */
  checkGameState(): GameState {
    if (this.isSolved()) {
      this.events.emit("gameSolved")
      return { solved: true, solvable: true }
    } else if (!this.isSolvable()) {
      this.events.emit("gameNotSolvable")
      return { solved: false, solvable: false }
    }

    return { solved: false, solvable: true }
  }

  /**
   * Check if the game is solved
   */
  isSolved(): boolean {
    // Game is solved if all tubes are either empty or contain the same color up to the max height
    return this.tubes.every((tube) => tube.isCompleted())
  }

  /**
   * Check if the current game state is solvable
   * Uses a breadth-first search to explore possible game states
   */
  isSolvable(): boolean {
    if (!this.tubes.length) return false

    // Convert the actual tubes to minimal tubes
    const tubeMaxHeight = this.tubes[0].maxHeight
    const initialTubes = this.tubes.map((tube) =>
      this.createMinimalTube(tube.colors, tubeMaxHeight)
    )

    // Check for quick exit conditions
    if (this.isAlreadySolved(initialTubes)) return true
    if (!this.hasValidColorCounts(initialTubes, tubeMaxHeight)) return false

    // Perform BFS to check solvability
    return this.performSolvabilityBFS(initialTubes, tubeMaxHeight)
  }

  /**
   * Check if the state is already solved
   */
  private isAlreadySolved(tubes: MinimalTube[]): boolean {
    return tubes.every((tube) => tube.isCompleted())
  }

  /**
   * Check if all colors have the correct counts
   */
  private hasValidColorCounts(
    tubes: MinimalTube[],
    tubeMaxHeight: number
  ): boolean {
    const colorCounts: Record<number, number> = {}

    tubes.forEach((tube) => {
      tube.colors.forEach((color) => {
        colorCounts[color] = (colorCounts[color] || 0) + 1
      })
    })

    // Each color should appear exactly tubeMaxHeight times for the puzzle to be solvable
    for (const color in colorCounts) {
      if (colorCounts[color] !== tubeMaxHeight && colorCounts[color] > 0) {
        return false
      }
    }

    return true
  }

  /**
   * Perform a breadth-first search to check if the puzzle is solvable
   */
  private performSolvabilityBFS(
    initialTubes: MinimalTube[],
    tubeMaxHeight: number
  ): boolean {
    // Helper functions
    const getStateHash = this.createStateHashFunction()
    const initialHash = getStateHash(initialTubes)

    // Set up the BFS
    const queue: { tubes: MinimalTube[]; moveCount: number }[] = []
    const visited = new Set<string>([initialHash])

    queue.push({ tubes: initialTubes, moveCount: 0 })

    while (queue.length > 0) {
      const { tubes, moveCount } = queue.shift()!
      const newStates = this.generateNextStates(tubes, tubeMaxHeight)

      for (const { newTubes, hash } of newStates) {
        // Check if this new state is solved
        if (this.isAlreadySolved(newTubes)) {
          return true
        }

        if (!visited.has(hash)) {
          visited.add(hash)
          queue.push({
            tubes: newTubes,
            moveCount: moveCount + 1,
          })

          // Limit the search space to prevent excessive memory usage
          if (visited.size > MAX_BFS_STATES) {
            console.warn(
              `Search space too large (${visited.size} states), stopping BFS`
            )
            // Return false instead of assuming it's solvable
            // This will cause the puzzle generation to try again
            return false
          }
        }
      }
    }

    // If we've explored all reachable states and found no solution
    return false
  }

  /**
   * Generate all possible next states from the current state
   */
  private generateNextStates(
    tubes: MinimalTube[],
    tubeMaxHeight: number
  ): { newTubes: MinimalTube[]; hash: string }[] {
    const result: { newTubes: MinimalTube[]; hash: string }[] = []
    const getStateHash = this.createStateHashFunction()
    const cloneTubeState = this.createCloneStateFunction()

    for (let fromIndex = 0; fromIndex < tubes.length; fromIndex++) {
      const fromTube = tubes[fromIndex]

      // Skip if source tube is empty or already completed
      if (fromTube.isEmpty() || fromTube.isCompleted()) continue

      const topFromColor = fromTube.getTopColor()
      if (topFromColor === null) continue

      const segmentsToPour = fromTube.getConsecutiveTopColors()

      for (let toIndex = 0; toIndex < tubes.length; toIndex++) {
        if (fromIndex === toIndex) continue // Can't pour to the same tube

        const toTube = tubes[toIndex]

        // Skip if destination tube is full or already completed
        if (toTube.colors.length === toTube.maxHeight || toTube.isCompleted())
          continue

        // Check if we can pour into destination tube
        const toTopColor = toTube.getTopColor()
        const spaceAvailable = toTube.maxHeight - toTube.colors.length

        // Optimization: don't pour if it would just fill an empty tube with a partial color sequence
        if (
          toTube.isEmpty() &&
          segmentsToPour < tubeMaxHeight &&
          fromTube.colors.length > segmentsToPour
        ) {
          continue
        }

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
          newTubes[toIndex].addColors(topFromColor, segmentsToActuallyPour)

          // Add to results
          result.push({
            newTubes,
            hash: getStateHash(newTubes),
          })
        }
      }
    }

    return result
  }

  /**
   * Creates a function for generating state hashes
   */
  private createStateHashFunction() {
    return (tubes: MinimalTube[]): string => {
      return tubes.map((tube) => tube.colors.join(",")).join("|")
    }
  }

  /**
   * Creates a function for cloning tube states
   */
  private createCloneStateFunction() {
    return (tubes: MinimalTube[]): MinimalTube[] => {
      return tubes.map((tube) =>
        this.createMinimalTube(tube.colors, tube.maxHeight)
      )
    }
  }

  /**
   * Creates a minimal tube for solvability calculations
   */
  private createMinimalTube(colors: number[], maxHeight: number): MinimalTube {
    return {
      colors: [...colors],
      maxHeight,
      isEmpty(): boolean {
        return this.colors.length === 0
      },
      isCompleted(): boolean {
        return (
          this.isEmpty() ||
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

  /**
   * Add an event listener
   */
  on(
    event: string,
    fn: (...args: unknown[]) => void,
    context?: unknown
  ): Phaser.Events.EventEmitter {
    return this.events.on(event, fn, context)
  }

  /**
   * Remove an event listener
   */
  off(
    event: string,
    fn?: (...args: unknown[]) => void,
    context?: unknown
  ): Phaser.Events.EventEmitter {
    return this.events.off(event, fn, context)
  }

  // Add a method to undo the last move
  undo(): boolean {
    if (this.moveHistory.length === 0) {
      return false; // No moves to undo
    }
    
    // Get the last move
    const lastMove = this.moveHistory.pop();
    
    if (!lastMove) {
      return false;
    }
    
    // Clear any selection
    this.clearSelection();
    
    // Perform the reverse operation
    const fromTube = this.tubes[lastMove.toIndex];   // Note: these are reversed
    const toTube = this.tubes[lastMove.fromIndex];   // for undoing
    
    // Remove the colors from the destination tube
    fromTube.removeTopColors(lastMove.count);
    
    // Add the colors back to the source tube
    toTube.addColors(lastMove.color, lastMove.count);
    
    // Notify about history change
    this.events.emit("historyChange", this.moveHistory.length)
    
    // Update game state after undoing
    this.updateGameState();
    
    return true;
  }
  
  // Get the number of moves made
  getMoveCount(): number {
    return this.moveHistory.length;
  }
}
