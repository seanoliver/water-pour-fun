import * as Phaser from "phaser"
import { shuffle } from "lodash"

interface Tube {
  x: number
  y: number
  colors: number[]
  graphics?: Phaser.GameObjects.Graphics
}

export default class MainScene extends Phaser.Scene {
  private tubes: Tube[] = []
  private tubeHeight = 4
  private resetButton?: Phaser.GameObjects.Text

  constructor() {
    super("MainScene")
  }

  create() {
    // Three simple tubes for demonstration purposes

    // TODO: Support dynamically spacing the tubes based on tube count and board width
    // TODO: Support dynamic tube heights
    
    this.tubes = [
      { x: 100, y: 300, colors: [] },
      { x: 300, y: 300, colors: [] },
      { x: 500, y: 300, colors: [] },
      { x: 700, y: 300, colors: [] },
    ]

    this.setupTubes()
    
    // Add reset button
    this.resetButton = this.add.text(400, 500, 'RESET', { 
      fontSize: '24px',
      backgroundColor: '#333',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.resetButton.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.resetGame();
      })
      .on('pointerover', () => {
        this.resetButton?.setStyle({ backgroundColor: '#555' });
      })
      .on('pointerout', () => {
        this.resetButton?.setStyle({ backgroundColor: '#333' });
      });
  }

  private setupTubes() {
    const mixedColors = this.mixColors()

    // Clear existing colors
    this.tubes.forEach(tube => {
      tube.colors = [];
    });

    // Assign new colors
    this.tubes.forEach((tube) => {
      tube.colors = mixedColors.splice(0, this.tubeHeight)
    })

    // Draw the tubes
    this.tubes.forEach((tube, index) => {
      // If graphics already exist, just redraw
      if (tube.graphics) {
        this.drawTube(tube);
      } else {
        // First time setup
        tube.graphics = this.add.graphics()
        this.drawTube(tube)

        // Enable input: we detect clicks for "pouring"
        tube.graphics.setInteractive(
          new Phaser.Geom.Rectangle(tube.x - 25, tube.y - 75, 50, 150),
          Phaser.Geom.Rectangle.Contains,
        )

        tube.graphics.on("pointerdown", () => {
          this.handleTubeClick(index)
        })
      }
    })
  }

  private resetGame() {
    // Clear selection if any
    this.selectedTubeIndex = null;
    
    // Setup tubes with new colors
    this.setupTubes();
  }

  private drawTube(tube: Tube) {
    if (!tube.graphics) return

    const { graphics, x, y, colors } = tube
    graphics.clear()

    // Determine if this is the selected tube
    const isSelected = this.tubes.indexOf(tube) === this.selectedTubeIndex
    
    // Draw the outline with different style for selected tube
    if (isSelected) {
      // Highlight with thicker, brighter outline for selected tube
      graphics.lineStyle(4, 0x00ffff, 1)
    } else {
      // Normal outline for unselected tubes
      graphics.lineStyle(2, 0x123456, 1)
    }
    
    graphics.strokeRect(x - 25, y - 75, 50, 150)

    // Draw water color segments
    let topY = y + 75 // bottom of the tube
    const segmentHeight = 150 / 4 // enough space for up to 4 segments (TODO: don't hardcode this)

    colors.forEach((colorIndex) => {
      const colorPalette = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]
      const color = colorPalette[colorIndex] || 0x999999

      graphics.fillStyle(color)
      graphics.fillRect(x - 23, topY - segmentHeight, 46, segmentHeight)
      topY -= segmentHeight
    })
  }

  private selectedTubeIndex: number | null = null

  private handleTubeClick(tubeIndex: number) {
    if (this.selectedTubeIndex === null) {
      // First click: select the tube
      this.selectedTubeIndex = tubeIndex
      // Redraw all tubes to show selection
      this.tubes.forEach(tube => this.drawTube(tube))
    } else {
      // Second click: attempt to pour
      if (this.selectedTubeIndex !== tubeIndex) {
        this.pour(this.selectedTubeIndex, tubeIndex)
      }

      // Clear selection
      this.selectedTubeIndex = null
      // Redraw all tubes to clear selection highlight
      this.tubes.forEach(tube => this.drawTube(tube))
    }
  }
  
  private pour(fromIndex: number, toIndex: number) {
    const fromTube = this.tubes[fromIndex]
    const toTube = this.tubes[toIndex]

    if (!fromTube.colors.length) return // nothing to pour

    // Find how many consecutive same-color segments are at the top of the source tube
    const topFromColor = fromTube.colors[fromTube.colors.length - 1]
    let segmentsToPour = 1

    // Count consecutive matching colors from the top down
    for (let i = fromTube.colors.length - 2; i >= 0; i--) {
      if (fromTube.colors[i] === topFromColor) {
        segmentsToPour++
      } else {
        break
      }
    }

    // Check if we can pour into destination tube
    const toTopColor = toTube.colors[toTube.colors.length - 1] ?? null
    
    // Can only pour if destination has enough space and color matches or is empty
    const spaceAvailable = 4 - toTube.colors.length
    const canPour = spaceAvailable > 0 && (toTopColor === null || toTopColor === topFromColor)
    
    if (canPour) {
      // Calculate how many segments we can actually pour (limited by available space)
      const segmentsToActuallyPour = Math.min(segmentsToPour, spaceAvailable)
      
      // Remove segments from source tube
      for (let i = 0; i < segmentsToActuallyPour; i++) {
        fromTube.colors.pop()
      }
      
      // Add segments to destination tube
      for (let i = 0; i < segmentsToActuallyPour; i++) {
        toTube.colors.push(topFromColor)
      }
    }

    // Redraw both tubes
    this.drawTube(fromTube)
    this.drawTube(toTube)
  }

  private mixColors () {
    const tubeCount = this.tubes.length
    const colorCount = tubeCount - 1

    const orderedColors = Array.from({ length: colorCount }, (_, i) =>
      Array.from({ length: this.tubeHeight }, () => i)
    )

    const mixedColors = shuffle(orderedColors.flat())

    return mixedColors
  }
}