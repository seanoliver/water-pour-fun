import * as Phaser from "phaser"
import { COLOR_PALETTE, COLORS } from "@/lib/constants"
import { PhaserGraphics } from "@/utils/phaser-graphics"

export class Tube {
  private graphics: Phaser.GameObjects.Graphics
  private glassReflection: Phaser.GameObjects.Graphics
  private tubeHighlight: Phaser.GameObjects.Graphics
  private tubeGlow?: Phaser.GameObjects.Sprite
  public colors: number[] = []
  private selected: boolean = false
  private hovered: boolean = false
  private readonly TUBE_WIDTH = 50
  private readonly TUBE_HEIGHT = 150
  private readonly TUBE_RADIUS = 12
  private readonly TUBE_BORDER_WIDTH = 3

  constructor(
    private scene: Phaser.Scene,
    public x: number,
    public y: number,
    public maxHeight: number
  ) {
    this.graphics = scene.add.graphics()
    this.glassReflection = scene.add.graphics()
    this.tubeHighlight = scene.add.graphics()
    this.setupGlow()
    this.setupInteractions()
    this.draw()
  }

  private setupGlow() {
    // Create a white circle sprite that we'll use as a glow effect
    const textureName = "tubeGlow"

    // Check if texture already exists
    if (!this.scene.textures.exists(textureName)) {
      const texture = this.scene.textures.createCanvas(textureName, 120, 220)
      if (texture) {
        const context = texture.getContext()
        const grd = context.createRadialGradient(60, 110, 10, 60, 110, 60)

        grd.addColorStop(0, "rgba(255, 255, 255, 0.8)")
        grd.addColorStop(1, "rgba(255, 255, 255, 0)")

        context.fillStyle = grd
        context.fillRect(0, 0, 120, 220)

        texture.refresh()
      }
    }

    this.tubeGlow = this.scene.add.sprite(this.x, this.y, textureName)
    this.tubeGlow.setAlpha(0)
    this.tubeGlow.setBlendMode(Phaser.BlendModes.SCREEN)
  }

  private simulatePour(toTube: Tube, color: number) {
    // Create a water drop sprite
    const drop = this.scene.add.graphics()
    drop.fillStyle(COLOR_PALETTE[color], 1)
    drop.fillCircle(0, 0, 12)
    drop.setPosition(this.x, this.y - 60)

    // Create a path for the drop to follow
    const path = new Phaser.Curves.Path(this.x, this.y - 60)
    path.cubicBezierTo(
      this.x,
      this.y - 30,
      toTube.x,
      toTube.y - 30,
      toTube.x,
      toTube.y - 60
    )

    // Animate the drop along the path
    const pourAnimation = this.scene.tweens.add({
      targets: drop,
      x: path.getPoints().map((p) => p.x),
      y: path.getPoints().map((p) => p.y),
      duration: 500,
      onComplete: () => {
        // Create a splash effect
        this.createSplashEffect(toTube.x, toTube.y - 60, color)
        drop.destroy()
      },
    })

    return pourAnimation
  }

  private createSplashEffect(x: number, y: number, color: number) {
    // Check if the tubeGlow texture exists (should have been created in setupGlow)
    if (!this.scene.textures.exists("tubeGlow")) {
      return
    }

    const particles = this.scene.add.particles(x, y, "tubeGlow", {
      speed: { min: 50, max: 150 },
      scale: { start: 0.2, end: 0 },
      quantity: 15,
      lifespan: 600,
      tint: COLOR_PALETTE[color],
      blendMode: Phaser.BlendModes.SCREEN,
    })

    // Stop emitting after a short time
    this.scene.time.delayedCall(100, () => {
      particles.stop()
      // Clean up particles after they fade out
      this.scene.time.delayedCall(600, () => {
        particles.destroy()
      })
    })
  }

  draw() {
    this.graphics.clear()
    this.glassReflection.clear()
    this.tubeHighlight.clear()

    // Draw shadow under the tube
    PhaserGraphics.setFillStyle(this.graphics, { color: 0x000000, alpha: 0.2 })
    PhaserGraphics.drawFilledEllipse(this.graphics, {
      centerX: this.x,
      centerY: this.y + 85,
      width: this.TUBE_WIDTH + 10,
      height: 20,
    })

    // Draw the tube glass with rounded ends
    this.drawTubeGlass()

    // Draw water color segments
    this.drawWaterSegments()

    // Add glass reflections
    this.drawGlassReflections()

    // Draw highlight or selection effect
    this.drawSelectionEffects()
  }

  private drawTubeGlass() {
    const x = this.x
    const y = this.y
    const width = this.TUBE_WIDTH
    const height = this.TUBE_HEIGHT
    const radius = this.TUBE_RADIUS

    // Border color based on state
    let borderColor = COLORS.MEDIUM_TURQUOISE
    let borderWidth = this.TUBE_BORDER_WIDTH
    let borderAlpha = 0.7

    if (this.selected) {
      borderColor = COLORS.CYAN
      borderWidth = this.TUBE_BORDER_WIDTH + 1
      borderAlpha = 1
    } else if (this.hovered) {
      borderColor = COLORS.BRIGHT_ORANGE
      borderAlpha = 0.9
    }

    // Draw tube background (glass effect)
    PhaserGraphics.setFillStyle(this.graphics, {
      color: COLORS.WHITE,
      alpha: 0.15,
    })
    this.drawRoundedTube(x, y, width, height, radius)
    PhaserGraphics.fillPath(this.graphics)

    // Draw tube border
    this.graphics.lineStyle(borderWidth, borderColor, borderAlpha)
    this.drawRoundedTube(x, y, width, height, radius)
    this.graphics.strokePath()
  }

  private drawRoundedTube(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    const halfWidth = width / 2

    // Create a rounded rectangle path for the tube
    PhaserGraphics.beginPath(this.graphics)

    // Top-left rounded corner
    PhaserGraphics.moveTo(this.graphics, {
      x: x - halfWidth + radius,
      y: y - height / 2,
    })

    // Top edge
    PhaserGraphics.lineTo(this.graphics, {
      x: x + halfWidth - radius,
      y: y - height / 2,
    })

    // Top-right rounded corner
    PhaserGraphics.drawArc(this.graphics, {
      centerX: x + halfWidth - radius,
      centerY: y - height / 2 + radius,
      radius,
      startAngle: -Math.PI / 2, // -90 degrees
      endAngle: 0, // 0 degrees
      anticlockwise: false,
    })

    // Right edge
    PhaserGraphics.lineTo(this.graphics, {
      x: x + halfWidth,
      y: y + height / 2 - radius,
    })

    // Bottom-right rounded corner
    PhaserGraphics.drawArc(this.graphics, {
      centerX: x + halfWidth - radius,
      centerY: y + height / 2 - radius,
      radius,
      startAngle: 0, // 0 degrees
      endAngle: Math.PI / 2, // 90 degrees
      anticlockwise: false,
    })

    // Bottom rounded edge (half circle)
    PhaserGraphics.drawArc(this.graphics, {
      centerX: x,
      centerY: y + height / 2 - radius,
      radius: halfWidth,
      startAngle: 0, // 0 degrees
      endAngle: Math.PI, // 180 degrees
      anticlockwise: false,
    })

    // Bottom-left rounded corner
    PhaserGraphics.drawArc(this.graphics, {
      centerX: x - halfWidth + radius,
      centerY: y + height / 2 - radius,
      radius,
      startAngle: Math.PI / 2, // 90 degrees
      endAngle: Math.PI, // 180 degrees
      anticlockwise: false,
    })

    // Left edge
    PhaserGraphics.lineTo(this.graphics, {
      x: x - halfWidth,
      y: y - height / 2 + radius,
    })

    // Top-left rounded corner
    PhaserGraphics.drawArc(this.graphics, {
      centerX: x - halfWidth + radius,
      centerY: y - height / 2 + radius,
      radius,
      startAngle: Math.PI, // 180 degrees
      endAngle: (3 * Math.PI) / 2, // 270 degrees
      anticlockwise: false,
    })

    PhaserGraphics.closePath(this.graphics)
  }

  private drawWaterSegments() {
    if (this.colors.length === 0) return

    
    const segmentHeight = this.TUBE_HEIGHT / (this.maxHeight + 1)
    const halfWidth = this.TUBE_WIDTH / 2 - 3 // Slightly smaller than tube

    // Calculate the bottom position of the tube's inner area
    const bottomY = this.y + this.TUBE_HEIGHT / 2 - this.TUBE_RADIUS

    // Draw each color segment
    this.colors.forEach((colorIndex, index) => {
      const color = COLOR_PALETTE[colorIndex]
      const isTopSegment = index === this.colors.length - 1
      const isBottomSegment = index === 0
      const segmentY = bottomY - index * segmentHeight - segmentHeight / 2

      // Rounded bottom segment
      if (isBottomSegment) {
        PhaserGraphics.setFillStyle(this.graphics, { color })

        // Create a path for the bottom segment with rounded bottom
        PhaserGraphics.beginPath(this.graphics)

        // Start at the left side of the segment
        const topY = segmentY - segmentHeight / 2
        PhaserGraphics.moveTo(this.graphics, { x: this.x - halfWidth, y: topY })

        // Draw to the right side
        PhaserGraphics.lineTo(this.graphics, { x: this.x + halfWidth, y: topY })

        // Draw down the right side
        PhaserGraphics.lineTo(this.graphics, {
          x: this.x + halfWidth,
          y: bottomY,
        })

        // Draw the bottom curve - a half-circle that fills the tube bottom
        PhaserGraphics.drawArc(this.graphics, {
          centerX: this.x,
          centerY: bottomY,
          radius: halfWidth,
          startAngle: 0,
          endAngle: Math.PI,
          anticlockwise: false,
        })

        // Complete the path back to the starting point
        PhaserGraphics.lineTo(this.graphics, { x: this.x - halfWidth, y: topY })
        PhaserGraphics.closePath(this.graphics)
        PhaserGraphics.fillPath(this.graphics)

        // Add a subtle highlight at the bottom to give depth
        PhaserGraphics.setFillStyle(this.graphics, {
          color: 0xffffff,
          alpha: 0.1,
        })
        PhaserGraphics.drawFilledEllipse(this.graphics, {
          centerX: this.x,
          centerY: bottomY - 2,
          width: halfWidth * 0.5,
          height: 3,
        })
      }
      // For the top segment, add a subtle wave effect
      else if (isTopSegment) {
        PhaserGraphics.setFillStyle(this.graphics, { color })

        // Create a wavy top for the liquid
        PhaserGraphics.beginPath(this.graphics)
        PhaserGraphics.moveTo(this.graphics, {
          x: this.x - halfWidth,
          y: segmentY + segmentHeight / 2,
        })

        // Bottom edge
        PhaserGraphics.lineTo(this.graphics, {
          x: this.x + halfWidth,
          y: segmentY + segmentHeight / 2,
        })

        // Right edge
        PhaserGraphics.lineTo(this.graphics, {
          x: this.x + halfWidth,
          y: segmentY - segmentHeight / 2,
        })

        // Top wavy edge - more subtle wave
        const waveHeight = 1.5
        const segments = 6

        for (let i = 0; i <= segments; i++) {
          const pointX = this.x + halfWidth - 2 * halfWidth * (i / segments)
          // Use a more natural wave function
          const pointY =
            segmentY -
            segmentHeight / 2 +
            Math.sin((i / segments) * Math.PI) * waveHeight

          PhaserGraphics.lineTo(this.graphics, { x: pointX, y: pointY })
        }

        // Left edge
        PhaserGraphics.lineTo(this.graphics, {
          x: this.x - halfWidth,
          y: segmentY + segmentHeight / 2,
        })
        PhaserGraphics.closePath(this.graphics)
        PhaserGraphics.fillPath(this.graphics)

        // Add highlight on top of liquid - more subtle
        PhaserGraphics.setFillStyle(this.graphics, {
          color: 0xffffff,
          alpha: 0.2,
        })
        PhaserGraphics.drawFilledEllipse(this.graphics, {
          centerX: this.x,
          centerY: segmentY - segmentHeight / 2 + 1,
          width: halfWidth * 0.8,
          height: 3,
        })
      }
      // For middle segments, ensure they connect smoothly
      else {
        PhaserGraphics.setFillStyle(this.graphics, { color })
        PhaserGraphics.drawFilledRect(this.graphics, {
          x: this.x - halfWidth,
          y: segmentY - segmentHeight / 2,
          width: halfWidth * 2,
          height: segmentHeight + 1, // Add 1 pixel overlap to avoid gaps
        })
      }
    })

    // Ensure water doesn't visually overflow the tube
    // We'll use a simpler approach by constraining the top segment's position
    if (this.colors.length > 0) {
      const maxY = this.y - this.TUBE_HEIGHT / 2 + this.TUBE_RADIUS + 2
      const topIndex = this.colors.length - 1
      const topSegmentY = bottomY - topIndex * segmentHeight - segmentHeight / 2

      // If the top segment would overflow, redraw it with constrained height
      if (topSegmentY - segmentHeight / 2 < maxY) {
        const topColor = this.colors[topIndex]

        // Clear the potentially overflowing segment
        PhaserGraphics.setFillStyle(this.graphics, { color: 0, alpha: 0 }) // Transparent
        PhaserGraphics.drawFilledRect(this.graphics, {
          x: this.x - halfWidth - 1,
          y: maxY - 5,
          width: halfWidth * 2 + 2,
          height: 10,
        })

        // Redraw the top segment with proper constraints
        PhaserGraphics.setFillStyle(this.graphics, {
          color: COLOR_PALETTE[topColor],
        })

        // Calculate the visible portion height
        const visibleHeight = Math.max(
          0,
          topSegmentY + segmentHeight / 2 - maxY
        )

        if (visibleHeight > 0) {
          // Draw a properly constrained top segment
          PhaserGraphics.drawFilledRect(this.graphics, {
            x: this.x - halfWidth,
            y: maxY,
            width: halfWidth * 2,
            height: visibleHeight,
          })

          // Add a subtle wave effect at the top
          PhaserGraphics.setFillStyle(this.graphics, {
            color: COLOR_PALETTE[topColor],
          })
          PhaserGraphics.beginPath(this.graphics)

          // Draw a gentle curve at the top
          PhaserGraphics.moveTo(this.graphics, {
            x: this.x - halfWidth,
            y: maxY,
          })

          const curvePoints = 5
          for (let i = 0; i <= curvePoints; i++) {
            const pointX =
              this.x - halfWidth + 2 * halfWidth * (i / curvePoints)
            const pointY = maxY - Math.sin((i / curvePoints) * Math.PI) * 1.5
            PhaserGraphics.lineTo(this.graphics, { x: pointX, y: pointY })
          }

          PhaserGraphics.lineTo(this.graphics, {
            x: this.x + halfWidth,
            y: maxY,
          })
          PhaserGraphics.closePath(this.graphics)
          PhaserGraphics.fillPath(this.graphics)

          // Add a subtle highlight
          PhaserGraphics.setFillStyle(this.graphics, {
            color: 0xffffff,
            alpha: 0.15,
          })
          PhaserGraphics.drawFilledEllipse(this.graphics, {
            centerX: this.x,
            centerY: maxY - 1,
            width: halfWidth * 0.7,
            height: 2,
          })
        }
      }
    }
  }

  private drawGlassReflections() {
    const halfWidth = this.TUBE_WIDTH / 2

    // Add glass reflection effect
    this.glassReflection.clear()
    PhaserGraphics.setFillStyle(this.glassReflection, {
      color: COLORS.WHITE,
      alpha: 0.3,
    })

    // Add thin vertical reflection
    PhaserGraphics.drawFilledRect(this.glassReflection, {
      x: this.x + halfWidth * 0.5,
      y: this.y - this.TUBE_HEIGHT / 2 + 10,
      width: 2,
      height: this.TUBE_HEIGHT - 20,
    })

    // Add thin highlight across the top curved area
    PhaserGraphics.setFillStyle(this.glassReflection, {
      color: COLORS.WHITE,
      alpha: 0.4,
    })

    // Draw small circular highlights near the corners
    PhaserGraphics.drawFilledCircle(this.glassReflection, {
      centerX: this.x - halfWidth * 0.6,
      centerY: this.y - this.TUBE_HEIGHT / 2 + 10,
      radius: 3,
    })

    PhaserGraphics.drawFilledCircle(this.glassReflection, {
      centerX: this.x + halfWidth * 0.2,
      centerY: this.y - this.TUBE_HEIGHT / 2 + 8,
      radius: 2,
    })
  }

  private drawSelectionEffects() {
    if (this.selected || this.hovered) {
      if (this.tubeGlow) {
        const glowAlpha = this.selected ? 0.5 : this.hovered ? 0.3 : 0
        const glowColor = this.selected ? COLORS.CYAN : COLORS.BRIGHT_ORANGE

        this.tubeGlow.setAlpha(glowAlpha)
        this.tubeGlow.setTint(glowColor)
      }

      this.tubeHighlight.clear()
    } else if (this.tubeGlow) {
      this.tubeGlow.setAlpha(0)
    }
  }

  setupInteractions() {
    const hitArea = new Phaser.Geom.Rectangle(
      this.x - this.TUBE_WIDTH / 2 - 5,
      this.y - this.TUBE_HEIGHT / 2 - 5,
      this.TUBE_WIDTH + 10,
      this.TUBE_HEIGHT + 10
    )

    this.graphics
      .setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on("pointerover", this.onPointerOver, this)
      .on("pointerout", this.onPointerOut, this)
  }

  onPointerOver() {
    this.hovered = true
    this.draw()

    this.scene.tweens.add({
      targets: [
        this.graphics,
        this.glassReflection,
        this.tubeHighlight,
        this.tubeGlow,
      ],
      y: { from: 0, to: -5 },
      duration: 200,
      ease: "Back.easeOut",
    })
  }

  onPointerOut() {
    this.hovered = false
    this.draw()

    this.scene.tweens.add({
      targets: [
        this.graphics,
        this.glassReflection,
        this.tubeHighlight,
        this.tubeGlow,
      ],
      y: { from: -5, to: 0 },
      duration: 200,
      ease: "Sine.easeOut",
    })
  }

  setSelected(selected: boolean) {
    this.selected = selected
    this.draw()
  }

  // TODO: Implement this
  addClickListener(callback: (tube: Tube) => void) {
    this.graphics.on("pointerdown", () => {
      callback(this)
    })
  }

  pourTo(targetTube: Tube) {
    if (this.colors.length > 0 && targetTube) {
      const color = this.getTopColor()
      if (color !== null) {
        this.simulatePour(targetTube, color)
      }
    }
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
   */
  isCompleted(): boolean {
    if (this.colors.length !== this.maxHeight) return false
    const firstColor = this.colors[0]
    return this.colors.every((color) => color === firstColor)
  }
}
