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
  score: number
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

// Add a new interface for scoring metrics
interface ScoreMetrics {
  moveCount: number;
  optimalMoveCount: number | null;
  completedTubes: number;
  totalTubes: number;
  startTime: number;
  currentTime: number;
}

const MAX_BFS_STATES = 500000 // Increased from 100000 to allow for more thorough search

export class GameLogic {
  private tubes: Tube[] = []
  private selectedTubeIndex: number | null = null
  private events: Phaser.Events.EventEmitter
  private setupAttempts = 0
  // Add move history array to track moves
  private moveHistory: Move[] = []
  // Add scoring metrics
  private scoreMetrics: ScoreMetrics = {
    moveCount: 0,
    optimalMoveCount: null,
    completedTubes: 0,
    totalTubes: 0,
    startTime: 0,
    currentTime: 0
  }
  // Add current score
  private currentScore: number = 0

  constructor(private scene: GameScene) {
    this.events = new Phaser.Events.EventEmitter()
  }

  /**
   * Set up the game with the provided tubes
   */
  setup(tubes: Tube[]): boolean {
    this.tubes = tubes
    // Initialize scoring metrics
    this.scoreMetrics = {
      moveCount: 0,
      optimalMoveCount: null,
      completedTubes: 0,
      totalTubes: tubes.length,
      startTime: Date.now(),
      currentTime: Date.now()
    }
    this.currentScore = 0
    const result = this.generateSolvablePuzzle()
    
    // Estimate optimal move count after generating puzzle
    this.estimateOptimalMoveCount()
    
    return result
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
    
    // Reset scoring metrics
    this.scoreMetrics = {
      moveCount: 0,
      optimalMoveCount: this.scoreMetrics.optimalMoveCount, // Keep the optimal estimate
      completedTubes: 0,
      totalTubes: this.tubes.length,
      startTime: Date.now(),
      currentTime: Date.now()
    }
    
    this.currentScore = 0;
    this.updateGameState();
    
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
    
    // Calculate score
    const score = this.calculateScore();
    
    // Update the scene's score property if it exists
    if ('score' in this.scene) {
      this.scene.score = score;
    }
    
    // Emit score update event
    this.events.emit("scoreUpdate", score);
    
    // Update debug info
    if (this.scene.debugManager) {
      this.scene.debugManager.updateDebugInfo({
        isSolved: gameState.solved,
        isSolvable: gameState.solvable,
        moveCount: this.moveHistory.length,
        score: score,
        optimalMoveEstimate: this.scoreMetrics.optimalMoveCount,
        completedTubes: this.scoreMetrics.completedTubes,
        totalTubes: this.scoreMetrics.totalTubes
      })
    }

    // Handle game state changes
    if (gameState.solved) {
      // Calculate final score with a completion bonus
      const finalScore = Math.round(score * 1.2); // 20% bonus for completing the puzzle
      
      // Update the scene's score
      if ('score' in this.scene) {
        this.scene.score = finalScore;
      }
      
      // Emit final score update
      this.events.emit("scoreUpdate", finalScore);
      
      // Emit game solved event with the final score
      this.events.emit("gameSolved", finalScore);
      
      // Call the game over method on the scene if it exists
      if ('gameOver' in this.scene && typeof this.scene.gameOver === 'function') {
        this.scene.gameOver(true);
      }
    } else if (!gameState.solvable) {
      // Emit game not solvable event
      this.events.emit("gameNotSolvable");
      
      // Call the game over method on the scene if it exists
      if ('gameOver' in this.scene && typeof this.scene.gameOver === 'function') {
        this.scene.gameOver(false);
      }
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
    
    // After successful pour, update the score
    this.updateGameState();
    
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
   * Execute a pour from one tube to another
   */
  private executePour(
    fromTube: Tube,
    toTube: Tube,
    color: number,
    count: number
  ): void {
    // Remove colors from source tube
    fromTube.removeTopColors(count)

    // Add colors to destination tube
    toTube.addColors(color, count)

    // Redraw tubes
    fromTube.draw()
    toTube.draw()

    // Animate the pour
    fromTube.pourTo(toTube)

    // Add to move history
    this.moveHistory.push({
      fromIndex: this.tubes.indexOf(fromTube),
      toIndex: this.tubes.indexOf(toTube),
      color,
      count,
    })

    // Update move count in score metrics
    this.scoreMetrics.moveCount = this.moveHistory.length;

    // Emit history change event
    this.events.emit("historyChange", this.moveHistory.length)

    // Check if the game is solved
    if (this.isSolved()) {
      this.events.emit("gameSolved")
    }
  }

  /**
   * Check the current game state
   */
  checkGameState(): GameState {
    const solved = this.isSolved()
    const solvable = this.isSolvable()
    const score = this.calculateScore()
    
    return {
      solved,
      solvable,
      score
    }
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

  /**
   * Undo the last move
   */
  undo(): boolean {
    if (this.moveHistory.length === 0) {
      return false
    }

    // Get the last move
    const lastMove = this.moveHistory.pop()
    if (!lastMove) return false

    // Get the tubes involved in the last move
    const fromTube = this.tubes[lastMove.toIndex]
    const toTube = this.tubes[lastMove.fromIndex]

    // Remove colors from the destination tube of the original move
    fromTube.removeTopColors(lastMove.count)

    // Add colors back to the source tube of the original move
    toTube.addColors(lastMove.color, lastMove.count)

    // Redraw tubes
    fromTube.draw()
    toTube.draw()

    // Update move count in score metrics
    this.scoreMetrics.moveCount = this.moveHistory.length;

    // Emit history change event
    this.events.emit("historyChange", this.moveHistory.length)

    // Update game state
    this.updateGameState()

    return true
  }
  
  // Get the number of moves made
  getMoveCount(): number {
    return this.moveHistory.length;
  }

  /**
   * Estimate the optimal number of moves to solve the puzzle
   * This is a heuristic based on the number of color segments that need to be moved
   */
  private estimateOptimalMoveCount(): void {
    // Count the number of color segments that need to be moved
    let segmentsToMove = 0;
    const colorCounts: Record<number, number> = {};
    
    // Count colors in each tube
    for (const tube of this.tubes) {
      let lastColor: number | null = null;
      
      for (let i = tube.colors.length - 1; i >= 0; i--) {
        const color = tube.colors[i];
        
        // Initialize color count if not exists
        if (colorCounts[color] === undefined) {
          colorCounts[color] = 0;
        }
        colorCounts[color]++;
        
        // If color changes, we have a new segment
        if (lastColor !== null && lastColor !== color) {
          segmentsToMove++;
        }
        
        lastColor = color;
      }
    }
    
    // Minimum moves is at least the number of segments minus the number of colors
    // (since each color needs to be in one tube)
    const colorCount = Object.keys(colorCounts).length;
    
    // Heuristic: Each color needs to be consolidated, which takes at least
    // (segments - colors) moves, plus some overhead for moving between tubes
    this.scoreMetrics.optimalMoveCount = Math.max(segmentsToMove - colorCount, colorCount);
  }

  /**
   * Calculate the current score based on various metrics
   */
  private calculateScore(): number {
    // Update current time
    this.scoreMetrics.currentTime = Date.now();
    
    // Count completed tubes
    this.scoreMetrics.completedTubes = this.tubes.filter(tube => tube.isCompleted()).length;
    
    // Base score starts at 1000
    let score = 1000;
    
    // Deduct points for excess moves if we have an optimal estimate
    if (this.scoreMetrics.optimalMoveCount !== null) {
      const moveEfficiency = Math.max(0, 1 - (this.scoreMetrics.moveCount - this.scoreMetrics.optimalMoveCount) / 
                                     (this.scoreMetrics.optimalMoveCount * 2));
      score *= moveEfficiency;
    } else {
      // If we don't have an optimal estimate, use a simpler formula
      const moveDeduction = Math.min(500, this.scoreMetrics.moveCount * 5);
      score -= moveDeduction;
    }
    
    // Add points for completed tubes
    const completionBonus = (this.scoreMetrics.completedTubes / this.scoreMetrics.totalTubes) * 500;
    score += completionBonus;
    
    // Time factor (gentle penalty for taking longer)
    const timeElapsedSeconds = (this.scoreMetrics.currentTime - this.scoreMetrics.startTime) / 1000;
    const timeFactor = Math.max(0.5, 1 - (timeElapsedSeconds / 300)); // 5 minutes to reach 50% penalty
    score *= timeFactor;
    
    // Ensure score is never negative
    score = Math.max(0, Math.round(score));
    
    // Update current score
    this.currentScore = score;
    
    return score;
  }

  /**
   * Get the current score
   */
  getScore(): number {
    return this.currentScore;
  }

  /**
   * Get the scoring metrics
   */
  getScoringMetrics(): ScoreMetrics {
    return { ...this.scoreMetrics };
  }
}
