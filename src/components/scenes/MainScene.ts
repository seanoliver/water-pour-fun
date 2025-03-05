import * as Phaser from "phaser"
import { Tube } from "../objects/Tube"
import { GameLogic } from "../logic/GameLogic"
import { APP_WIDTH, DIFFICULTY, PADDING_BOX } from "@/lib/constants"
import { DebugManager } from "../logic/DebugManager"
export default class MainScene extends Phaser.Scene {
  private tubes: Tube[] = []
  private gameLogic!: GameLogic
  private resetButton?: Phaser.GameObjects.Text
  private debugButton?: Phaser.GameObjects.Text
  private difficultyChooser?: Phaser.GameObjects.Text
  private debugManager = new DebugManager(this)
  
  public difficulty: keyof typeof DIFFICULTY = "MEDIUM"
  public score: number = 0
  public isSolvable: boolean = true

  constructor() {
    super("MainScene")
  }

  create() {
    // Create game logic
    this.gameLogic = new GameLogic(this)

    // Create tubes
    this.createTubes()

    // Setup game logic with tubes
    this.gameLogic.setup(this.tubes)

    // Add reset button
    this.createResetButton()

    // Add debug button
    this.createDebugButton()
  }

  private createTubes() {
    const difficulty = DIFFICULTY[this.difficulty]
    const tubeCount = difficulty.TUBE_COUNT
    const tubeHeight = difficulty.TUBE_HEIGHT

    const tubeSpacing = APP_WIDTH / tubeCount

    const tubePositions = Array.from({ length: tubeCount }, (_, i) => ({
      x: 75 + i * tubeSpacing,
      y: 300,
    }))

    this.tubes = tubePositions.map((pos) => {
      const tube = new Tube(this, pos.x, pos.y, tubeHeight)

      // Add click handling
      tube.addClickListener((tube) => {
        this.gameLogic.handleTubeClick(tube)
      })

      return tube
    })
  }

  private createResetButton() {
    this.resetButton = this.add
      .text(400, 500, "RESET", {
        fontSize: "24px",
        backgroundColor: "#333",
        padding: PADDING_BOX,
        color: "#ffffff",
      })
      .setOrigin(0.5)

    this.resetButton
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.gameLogic.reset()
      })
      .on("pointerover", () => {
        this.resetButton?.setStyle({ backgroundColor: "#555" })
      })
      .on("pointerout", () => {
        this.resetButton?.setStyle({ backgroundColor: "#333" })
      })
  }

  private createDifficultyChooser() {
    this.difficultyChooser = this.add
      .text(300, 200, "DIFFICULTY", {
        fontSize: "24px",
        backgroundColor: "#333",
        padding: PADDING_BOX,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.difficultyChooser?.setText("DIFFICULTY")
      })
  }

  private createDebugButton() {
    this.debugButton = this.add
      .text(100, 575, `DEBUG MODE: ${this.debugManager.isDebugMode()}`, {
        fontSize: "14px",
        backgroundColor: "#333",
        padding: PADDING_BOX,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.debugManager.toggleDebugMode()
        this.debugButton?.setText(
          `DEBUG MODE: ${this.debugManager.isDebugMode()}`
        )
      })
  }

  // This method is called from GameLogic when the game is over
  gameOver(isWin: boolean) {
    const message = isWin ? "You Win!" : "Game Over!"
    const color = isWin ? "#00ff00" : "#ff0000"

    this.add
      .text(400, 200, message, {
        fontSize: "32px",
        color: color,
        backgroundColor: "#000000",
        padding: PADDING_BOX,
      })
      .setOrigin(0.5)

    // Disable tube interactions
    // We could later add a restart button here
  }
}
