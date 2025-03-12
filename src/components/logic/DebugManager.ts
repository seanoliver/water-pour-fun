import { HEX_COLORS, PADDING_BOX, APP_WIDTH } from "@/lib/constants"
import MainScene from "../scenes/MainScene"

/**
 * Manages debug information display for the game
 * Provides a sleek, toggleable debug overlay with game state information
 */
export class DebugManager {
  private debugMode = false
  private debugPanel: Phaser.GameObjects.Container | null = null
  private debugText: Phaser.GameObjects.Text | null = null
  private debugBackground: Phaser.GameObjects.Rectangle | null = null

  constructor(private readonly game: MainScene) {}

  /**
   * Toggle debug mode on/off
   */
  public toggleDebugMode(): void {
    this.debugMode = !this.debugMode
    this.updateDebugDisplay()
  }

  /**
   * Check if debug mode is currently active
   */
  public isDebugMode(): boolean {
    return this.debugMode
  }

  /**
   * Update the debug display with the current game state
   * Call this whenever relevant game state changes
   */
  public updateSolvableState(): void {
    if (this.debugMode) {
      this.updateDebugDisplay()
    }
  }

  /**
   * Create or update the debug information display
   */
  private updateDebugDisplay(): void {
    // Clean up existing debug elements
    this.cleanupDebugElements()

    // Exit if debug mode is off
    if (!this.debugMode) return

    // Create debug container if it doesn't exist
    this.createDebugPanel()
  }

  /**
   * Remove all debug display elements
   */
  private cleanupDebugElements(): void {
    if (this.debugPanel) {
      this.debugPanel.destroy()
      this.debugPanel = null
      this.debugText = null
      this.debugBackground = null
    }
  }

  /**
   * Create the debug panel with styling and content
   */
  private createDebugPanel(): void {
    // Position in top-right corner with some margin
    const x = APP_WIDTH - 150
    const y = 80

    // Create container for all debug elements
    this.debugPanel = this.game.add.container(x, y)

    // Format debug information
    const debugInfo = [
      `DIFFICULTY: ${this.game.difficulty}`,
      `SCORE: ${this.game.score}`,
      `IS SOLVABLE: ${this.game.isSolvable}`,
    ].join("\n")

    // Create semi-transparent background
    this.debugBackground = this.game.add.rectangle(
      0,
      0,
      200,
      100,
      0x000000,
      0.7
    )

    // Add rounded corners and border
    this.debugBackground.setStrokeStyle(
      2,
      parseInt(HEX_COLORS.DARK_TURQUOISE.replace("#", "0x"))
    )
    this.debugBackground.setOrigin(0.5)

    // Create text with improved styling
    this.debugText = this.game.add.text(0, 0, debugInfo, {
      fontSize: "16px",
      fontFamily: "monospace",
      padding: PADDING_BOX,
      color: HEX_COLORS.WHITE,
      align: "left",
    })

    // Center text in background
    this.debugText.setOrigin(0.5)

    // Add elements to container
    this.debugPanel.add([this.debugBackground, this.debugText])

    // Add subtle animation
    this.game.tweens.add({
      targets: this.debugPanel,
      alpha: { from: 0, to: 1 },
      duration: 200,
      ease: "Power2",
    })
  }
}
