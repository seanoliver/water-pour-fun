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

    // Listen for move history changes to update the counter
    this.gameLogic.on("historyChange", (moveCount: unknown) => {
      this.updateMoveCounter(Number(moveCount))
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
  }

  // This method is called from GameLogic when the game is over
  gameOver(isWin: boolean) {
    const message = isWin ? "YOU WIN!" : "GAME OVER!"
    const color = isWin ? HEX_COLORS.GREEN : HEX_COLORS.RED
    const bgColor = isWin ? COLORS.DARK_GREEN : COLORS.MAROON

    // Create a modal background
    const modalBg = this.add.rectangle(
      APP_WIDTH / 2,
      APP_HEIGHT / 2,
      300,
      150,
      bgColor,
      0.9
    )
    .setOrigin(0.5)
    .setStrokeStyle(4, COLORS.WHITE)
    
    const messageText = this.add
      .text(APP_WIDTH / 2, APP_HEIGHT / 2, message, {
        fontSize: "32px",
        fontStyle: "bold",
        color: color,
        align: "center",
        stroke: HEX_COLORS.WHITE,
        strokeThickness: 2,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '0x000000',
          blur: 5,
          fill: true
        }
      })
      .setOrigin(0.5)

    // Add appear animation
    this.tweens.add({
      targets: [modalBg, messageText],
      scaleX: { from: 0, to: 1 },
      scaleY: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut'
    })
  }
}
