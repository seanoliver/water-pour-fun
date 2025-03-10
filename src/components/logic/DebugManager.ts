import { PADDING_BOX } from "@/lib/constants"
import MainScene from "../scenes/MainScene"

export class DebugManager {
  private debugMode: boolean = false
  private game: MainScene
  private debugText: Phaser.GameObjects.Text | null = null

  constructor(game: MainScene) {
    this.game = game
    this.debugMode = false
  }

  toggleDebugMode() {
    this.debugMode = !this.debugMode
    this.showDebugInfo()
  }

  isDebugMode() {
    return this.debugMode
  }

  showDebugInfo() {
    // Clear previous debug text if it exists
    if (this.debugText) {
      this.debugText.destroy();
      this.debugText = null;
    }

    // Don't show anything if debug mode is off
    if (!this.debugMode) return;

    const debugInfo = `
    DIFFICULTY: ${this.game.difficulty}
    SCORE: ${this.game.score}
    IS SOLVABLE: ${this.game.isSolvable}
    `

    this.debugText = this.game.add.text(100, 50, debugInfo, {
      fontSize: "14px",
      backgroundColor: "#800000",
      padding: PADDING_BOX,
      color: "#ffffff",
    }).setOrigin(0.5);
  }
}
