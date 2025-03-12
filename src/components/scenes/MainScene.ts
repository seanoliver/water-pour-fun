import * as Phaser from "phaser"
import { Tube } from "../objects/Tube"
import { GameLogic } from "../logic/GameLogic"
import { APP_WIDTH, APP_HEIGHT, DIFFICULTY, PADDING_BOX, COLORS, HEX_COLORS } from "@/lib/constants"
import { DebugManager } from "../logic/DebugManager"

export default class MainScene extends Phaser.Scene {
  private tubes: Tube[] = []
  private gameLogic!: GameLogic
  private resetButton?: Phaser.GameObjects.Text
  private undoButton?: Phaser.GameObjects.Text
  private moveCounter?: Phaser.GameObjects.Text
  private debugButton?: Phaser.GameObjects.Text
  private difficultyChooser?: Phaser.GameObjects.Text
  private controlPanel?: Phaser.GameObjects.Rectangle
  private gameTitle?: Phaser.GameObjects.Text
  private scoreDisplay?: Phaser.GameObjects.Text
  public debugManager = new DebugManager(this)
  
  public difficulty: keyof typeof DIFFICULTY = "MEDIUM"
  public score: number = 0
  public isSolvable: boolean = true

  constructor() {
    super("MainScene")
  }

  create() {
    // Add background
    this.createBackground()
    
    // Add game title
    this.createGameTitle()

    // Create game logic
    this.gameLogic = new GameLogic(this)

    // Create control panel
    this.createControlPanel()

    // Create tubes
    this.createTubes()

    // Setup game logic with tubes
    this.gameLogic.setup(this.tubes)

    // Add control buttons
    this.createControlButtons()

    // Add debug button
    this.createDebugButton()

    // Add score display
    this.createScoreDisplay()

    // Listen for move history changes to update the counter
    this.gameLogic.on("historyChange", (moveCount: unknown) => {
      this.updateMoveCounter(Number(moveCount))
    }, this)

    // Listen for score updates
    this.gameLogic.on("scoreUpdate", (score: unknown) => {
      this.updateScore(Number(score))
    }, this)

    // Listen for game solved event
    this.gameLogic.on("gameSolved", (finalScore: unknown) => {
      // Update the score with the final score (includes completion bonus)
      if (finalScore !== undefined) {
        this.updateScore(Number(finalScore))
      }
    }, this)
  }

  private createBackground() {
    // Create a gradient background
    const background = this.add.graphics()
    background.fillGradientStyle(
      COLORS.DARK_TURQUOISE,
      COLORS.DARK_TURQUOISE, 
      COLORS.TEAL,
      COLORS.TEAL,
      1
    )
    background.fillRect(0, 0, APP_WIDTH, APP_HEIGHT)
  }

  private createGameTitle() {
    this.gameTitle = this.add
      .text(APP_WIDTH / 2, 60, "WATER SORT PUZZLE", {
        fontSize: "36px",
        fontStyle: "bold",
        color: HEX_COLORS.WHITE,
        stroke: HEX_COLORS.DARK_VIOLET,
        strokeThickness: 6,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: HEX_COLORS.DARK_VIOLET,
          blur: 4,
          stroke: true,
          fill: true
        }
      })
      .setOrigin(0.5)
      .setAlpha(0)

    // Add a fade-in animation for the title
    this.tweens.add({
      targets: this.gameTitle,
      alpha: 1,
      y: 70,
      duration: 800,
      ease: 'Power2'
    })
  }

  private createControlPanel() {
    // Create a panel for the controls at the bottom
    this.controlPanel = this.add.rectangle(
      APP_WIDTH / 2,
      APP_HEIGHT - 80,
      APP_WIDTH - 100,
      100,
      COLORS.DARK_OLIVE_GREEN,
      0.8
    )
    .setOrigin(0.5)
    .setStrokeStyle(2, COLORS.WHITE)
    .setInteractive()

    // Add a subtle animation to the panel
    this.tweens.add({
      targets: this.controlPanel,
      y: APP_HEIGHT - 75,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  private createTubes() {
    const difficulty = DIFFICULTY[this.difficulty]
    const tubeCount = difficulty.TUBE_COUNT
    const tubeHeight = difficulty.TUBE_HEIGHT

    // Calculate positions to center the tubes
    const totalWidth = (tubeCount - 1) * 70
    const startX = (APP_WIDTH - totalWidth) / 2

    const tubePositions = Array.from({ length: tubeCount }, (_, i) => ({
      x: startX + i * 70,
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

  private createControlButtons() {
    // Calculate positions for buttons to be evenly spaced
    const panelWidth = (this.controlPanel?.width || APP_WIDTH - 100) - 80
    const buttonCount = 3 // Reset, Undo, Move Counter
    const buttonSpacing = panelWidth / buttonCount
    const startX = (APP_WIDTH / 2) - (panelWidth / 2) + buttonSpacing / 2
    const buttonY = APP_HEIGHT - 75

    // Add reset button
    this.resetButton = this.add
      .text(startX, buttonY, "RESET", {
        fontSize: "24px",
        backgroundColor: HEX_COLORS.MAROON,
        padding: PADDING_BOX,
        color: HEX_COLORS.WHITE,
        align: "center",
      })
      .setOrigin(0.5)

    this.resetButton
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.gameLogic.reset()
        this.createButtonPressEffect(this.resetButton!)
      })
      .on("pointerover", () => {
        this.resetButton?.setStyle({ backgroundColor: HEX_COLORS.CRIMSON })
      })
      .on("pointerout", () => {
        this.resetButton?.setStyle({ backgroundColor: HEX_COLORS.MAROON })
      })

    // Add undo button
    this.undoButton = this.add
      .text(startX + buttonSpacing, buttonY, "UNDO", {
        fontSize: "24px",
        backgroundColor: HEX_COLORS.DARK_GREEN,
        padding: PADDING_BOX,
        color: HEX_COLORS.WHITE,
        align: "center",
      })
      .setOrigin(0.5)

    this.undoButton
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        const success = this.gameLogic.undo()
        if (success) {
          this.createButtonPressEffect(this.undoButton!)
        }
      })
      .on("pointerover", () => {
        this.undoButton?.setStyle({ backgroundColor: HEX_COLORS.GREEN })
      })
      .on("pointerout", () => {
        this.undoButton?.setStyle({ backgroundColor: HEX_COLORS.DARK_GREEN })
      })

    // Add move counter
    this.moveCounter = this.add
      .text(startX + buttonSpacing * 2, buttonY, "MOVES: 0", {
        fontSize: "24px",
        backgroundColor: HEX_COLORS.DARK_VIOLET,
        padding: PADDING_BOX,
        color: HEX_COLORS.WHITE,
        align: "center",
      })
      .setOrigin(0.5)
  }

  private createButtonPressEffect(button: Phaser.GameObjects.Text) {
    this.tweens.add({
      targets: button,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 100,
      yoyo: true,
      ease: 'Power1'
    })
  }

  private updateMoveCounter(moveCount: number) {
    if (this.moveCounter) {
      this.moveCounter.setText(`MOVES: ${moveCount}`)
    }
  }

  private createDebugButton() {
    this.debugButton = this.add
      .text(APP_WIDTH - 100, APP_HEIGHT - 25, `DEBUG: ${this.debugManager.isDebugMode()}`, {
        fontSize: "14px",
        backgroundColor: HEX_COLORS.OLIVE,
        padding: {
          left: 10,
          right: 10,
          top: 5,
          bottom: 5,
        },
        color: HEX_COLORS.WHITE,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.debugManager.toggleDebugMode()
        this.debugButton?.setText(
          `DEBUG: ${this.debugManager.isDebugMode()}`
        )
        this.createButtonPressEffect(this.debugButton!)
      })
      .on("pointerover", () => {
        this.debugButton?.setStyle({ backgroundColor: HEX_COLORS.KHAKI })
      })
      .on("pointerout", () => {
        this.debugButton?.setStyle({ backgroundColor: HEX_COLORS.OLIVE })
      })
  }

  private createDifficultyChooser() {
    this.difficultyChooser = this.add
      .text(120, APP_HEIGHT - 25, this.difficulty, {
        fontSize: "16px",
        backgroundColor: HEX_COLORS.INDIGO,
        padding: {
          left: 10,
          right: 10,
          top: 5,
          bottom: 5,
        },
        color: HEX_COLORS.WHITE,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.cycleDifficulty()
      })
  }

  private cycleDifficulty() {
    const difficulties: (keyof typeof DIFFICULTY)[] = ["EASY", "MEDIUM", "HARD"]
    const currentIndex = difficulties.indexOf(this.difficulty)
    const nextIndex = (currentIndex + 1) % difficulties.length
    this.difficulty = difficulties[nextIndex]
    this.difficultyChooser?.setText(this.difficulty)
    
    // Reset the game with the new difficulty
    if (this.gameLogic) {
      this.gameLogic.reset()
    }
    
    // Update debug display if in debug mode
    this.debugManager.updateSolvableState()
  }

  /**
   * Create a score display that shows the player's current score
   */
  private createScoreDisplay() {
    // Position the score display at the top of the screen
    const x = APP_WIDTH / 2
    const y = 130

    // Create the score display with a nice style
    this.scoreDisplay = this.add
      .text(x, y, "SCORE: 0", {
        fontSize: "28px",
        fontStyle: "bold",
        color: HEX_COLORS.WHITE,
        stroke: HEX_COLORS.DARK_GREEN,
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: HEX_COLORS.DARK_GREEN,
          blur: 3,
          stroke: true,
          fill: true
        }
      })
      .setOrigin(0.5)
      .setAlpha(0)

    // Add a fade-in animation for the score
    this.tweens.add({
      targets: this.scoreDisplay,
      alpha: 1,
      y: 125,
      duration: 800,
      ease: 'Power2',
      delay: 200
    })
  }

  /**
   * Update the score display with the current score
   */
  private updateScore(score: number) {
    if (this.scoreDisplay) {
      // Update the score value
      this.score = score
      this.scoreDisplay.setText(`SCORE: ${score}`)

      // Add a pulse animation when the score changes
      this.tweens.add({
        targets: this.scoreDisplay,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        yoyo: true,
        ease: 'Power1'
      })
    }
  }

  /**
   * Handle game over state
   */
  gameOver(isWin: boolean) {
    // Create a semi-transparent overlay
    const overlay = this.add.rectangle(
      APP_WIDTH / 2,
      APP_HEIGHT / 2,
      APP_WIDTH,
      APP_HEIGHT,
      0x000000,
      0.7
    )

    // Create game over text
    const gameOverText = this.add.text(
      APP_WIDTH / 2,
      APP_HEIGHT / 2 - 50,
      isWin ? "PUZZLE SOLVED!" : "GAME OVER",
      {
        fontSize: "48px",
        fontStyle: "bold",
        color: HEX_COLORS.WHITE,
        stroke: isWin ? HEX_COLORS.DARK_GREEN : HEX_COLORS.MAROON,
        strokeThickness: 6,
      }
    )
    gameOverText.setOrigin(0.5)

    // Add final score text
    const finalScoreText = this.add.text(
      APP_WIDTH / 2,
      APP_HEIGHT / 2 + 20,
      `FINAL SCORE: ${this.score}`,
      {
        fontSize: "36px",
        fontStyle: "bold",
        color: HEX_COLORS.WHITE,
        stroke: HEX_COLORS.DARK_VIOLET,
        strokeThickness: 4,
      }
    )
    finalScoreText.setOrigin(0.5)

    // Add play again button
    const playAgainButton = this.add.text(
      APP_WIDTH / 2,
      APP_HEIGHT / 2 + 100,
      "PLAY AGAIN",
      {
        fontSize: "32px",
        backgroundColor: HEX_COLORS.DARK_GREEN,
        padding: PADDING_BOX,
        color: HEX_COLORS.WHITE,
      }
    )
    playAgainButton.setOrigin(0.5)
    playAgainButton.setInteractive({ useHandCursor: true })
    playAgainButton.on("pointerdown", () => {
      // Remove game over elements
      overlay.destroy()
      gameOverText.destroy()
      finalScoreText.destroy()
      playAgainButton.destroy()

      // Reset the game
      this.gameLogic.reset()
    })

    // Add entrance animations
    this.tweens.add({
      targets: [overlay, gameOverText, finalScoreText, playAgainButton],
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: "Power2",
    })
  }
}
