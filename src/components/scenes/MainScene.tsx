import * as Phaser from "phaser"

interface Tube {
  x: number
  y: number
  colors: number[]
  graphics?: Phaser.GameObjects.Graphics
}

export default class MainScene extends Phaser.Scene {
  private tubes: Tube[] = []

  constructor() {
    super("MainScene")
  }

  create() {
    // Three simple tubes for demonstration purposes
    // TODO: Add support for layers, more tubes, etc.
    this.tubes = [
      { x: 200, y: 300, colors: [0, 1, 1] },
      { x: 400, y: 300, colors: [2, 2] },
      { x: 600, y: 300, colors: [1, 2] },
    ]

    // Draw the tubes
    this.tubes.forEach((tube, index) => {
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
    })
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

    const topFromColor = fromTube.colors[fromTube.colors.length - 1]
    const toTopColor = toTube.colors[toTube.colors.length - 1] ?? null

    if (toTube.colors.length < 4 &&  (toTopColor === null || toTopColor === topFromColor)) {
      fromTube.colors.pop()
      toTube.colors.push(topFromColor)
    }

    // Redraw both tubes

    this.drawTube(fromTube)
    this.drawTube(toTube)
  }
}