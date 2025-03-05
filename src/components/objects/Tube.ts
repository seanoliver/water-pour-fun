import * as Phaser from "phaser"
import { COLOR_PALETTE } from "../../lib/constants"
export class Tube {
  private graphics: Phaser.GameObjects.Graphics
  public colors: number[] = []
  private selected: boolean = false

  constructor(
    private scene: Phaser.Scene,
    public x: number,
    public y: number,
    public maxHeight: number
  ) {
    this.graphics = scene.add.graphics()
    this.maxHeight = maxHeight
    this.setupInteractions()
    this.draw()
  }

  draw() {
    this.graphics.clear()

    // Draw the outline with different style for selected tube
    if (this.selected) {
      this.graphics.lineStyle(4, 0x00ffff, 1)
    } else {
      this.graphics.lineStyle(2, 0x123456, 1)
    }

    this.graphics.strokeRect(this.x - 25, this.y - 75, 50, 150)

    // Draw water color segments
    let topY = this.y + 75 // bottom of the tube
    const segmentHeight = 150 / this.maxHeight

    this.colors.forEach((colorIndex) => {
      const color = COLOR_PALETTE[colorIndex]

      this.graphics.fillStyle(color)
      this.graphics.fillRect(
        this.x - 23,
        topY - segmentHeight,
        46,
        segmentHeight
      )
      topY -= segmentHeight
    })
  }

  setupInteractions() {
    this.graphics.setInteractive(
      new Phaser.Geom.Rectangle(this.x - 25, this.y - 75, 50, 150),
      Phaser.Geom.Rectangle.Contains
    )
  }

  setSelected(selected: boolean) {
    this.selected = selected
    this.draw()
  }

  addClickListener(callback: (tube: Tube) => void) {
    this.graphics.on("pointerdown", () => {
      callback(this)
    })
  }

  isEmpty(): boolean {
    return this.colors.length === 0
  }

  isFull(): boolean {
    return this.colors.length >= this.maxHeight
  }

  getTopColor(): number | null {
    return this.colors.length > 0 ? this.colors[this.colors.length - 1] : null
  }

  getConsecutiveTopColors(): number {
    if (this.isEmpty()) return 0

    const topColor = this.getTopColor()
    let count = 1

    for (let i = this.colors.length - 2; i >= 0; i--) {
      if (this.colors[i] === topColor) {
        count++
      } else {
        break
      }
    }

    return count
  }

  removeTopColors(count: number) {
    for (let i = 0; i < count; i++) {
      if (!this.isEmpty()) {
        this.colors.pop()
      }
    }
    this.draw()
  }

  addColors(color: number, count: number) {
    for (let i = 0; i < count; i++) {
      if (!this.isFull()) {
        this.colors.push(color)
      }
    }
    this.draw()
  }

  /**
   * Returns true if a given tube is completed, i.e. the tube is full 
   * and all colors are the same
   * @returns boolean
   */
  isCompleted(): boolean {
    if (this.colors.length !== this.maxHeight) return false

    // All colors must be the same
    const firstColor = this.colors[0]
    return this.colors.every((color) => color === firstColor)
  }
}
