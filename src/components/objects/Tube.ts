import * as Phaser from "phaser"
import { COLOR_PALETTE, COLORS } from "../../lib/constants"

export class Tube {
  private graphics: Phaser.GameObjects.Graphics
  private glassReflection: Phaser.GameObjects.Graphics
  private tubeHighlight: Phaser.GameObjects.Graphics
  private tubeGlow?: Phaser.GameObjects.Sprite
  public colors: number[] = []
  private selected: boolean = false
  private hovered: boolean = false
  private pourAnimation?: Phaser.Tweens.Tween
  private shakeAnimation?: Phaser.Tweens.Tween
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
    
    // Add a subtle idle animation
    // this.addIdleAnimation()
  }

  private setupGlow() {
    // Create a white circle sprite that we'll use as a glow effect
    const textureName = 'tubeGlow'
    
    // Check if texture already exists
    if (!this.scene.textures.exists(textureName)) {
      const texture = this.scene.textures.createCanvas(textureName, 120, 220)
      if (texture) {
        const context = texture.getContext()
        const grd = context.createRadialGradient(60, 110, 10, 60, 110, 60)
        
        grd.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
        grd.addColorStop(1, 'rgba(255, 255, 255, 0)')
        
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
      this.x, this.y - 30,
      toTube.x, toTube.y - 30,
      toTube.x, toTube.y - 60
    )

    // Animate the drop along the path
    const pourAnimation = this.scene.tweens.add({
      targets: drop,
      x: path.getPoints().map(p => p.x),
      y: path.getPoints().map(p => p.y),
      duration: 500,
      onComplete: () => {
        // Create a splash effect
        this.createSplashEffect(toTube.x, toTube.y - 60, color)
        drop.destroy()
      }
    })
    
    return pourAnimation
  }

  private createSplashEffect(x: number, y: number, color: number) {
    // Check if the tubeGlow texture exists (should have been created in setupGlow)
    if (!this.scene.textures.exists('tubeGlow')) {
      return
    }
    
    const particles = this.scene.add.particles(x, y, 'tubeGlow', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.2, end: 0 },
      quantity: 15,
      lifespan: 600,
      tint: COLOR_PALETTE[color],
      blendMode: Phaser.BlendModes.SCREEN
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
    this.graphics.fillStyle(0x000000, 0.2)
    this.graphics.fillEllipse(this.x, this.y + 85, this.TUBE_WIDTH + 10, 20)

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
    this.graphics.fillStyle(COLORS.WHITE, 0.15)
    this.drawRoundedTube(x, y, width, height, radius)
    this.graphics.fillPath()
    
    // Draw tube border
    this.graphics.lineStyle(borderWidth, borderColor, borderAlpha)
    this.drawRoundedTube(x, y, width, height, radius)
    this.graphics.strokePath()
  }

  private drawRoundedTube(x: number, y: number, width: number, height: number, radius: number) {
    const halfWidth = width / 2
    
    // Create a rounded rectangle path for the tube
    this.graphics.beginPath()
    
    // Top-left rounded corner
    this.graphics.moveTo(x - halfWidth + radius, y - height / 2)
    
    // Top edge
    this.graphics.lineTo(x + halfWidth - radius, y - height / 2)
    
    // Top-right rounded corner
    this.graphics.arc(
      x + halfWidth - radius, 
      y - height / 2 + radius, 
      radius, 
      -Math.PI / 2, 
      0, 
      false
    )
    
    // Right edge
    this.graphics.lineTo(x + halfWidth, y + height / 2 - radius)
    
    // Bottom-right rounded corner
    this.graphics.arc(
      x + halfWidth - radius, 
      y + height / 2 - radius, 
      radius, 
      0, 
      Math.PI / 2, 
      false
    )
    
    // Bottom rounded edge (half circle)
    this.graphics.arc(
      x, 
      y + height / 2 - radius, 
      halfWidth, 
      0, 
      Math.PI, 
      false
    )
    
    // Bottom-left rounded corner
    this.graphics.arc(
      x - halfWidth + radius, 
      y + height / 2 - radius, 
      radius, 
      Math.PI / 2, 
      Math.PI, 
      false
    )
    
    // Left edge
    this.graphics.lineTo(x - halfWidth, y - height / 2 + radius)
    
    // Top-left rounded corner
    this.graphics.arc(
      x - halfWidth + radius, 
      y - height / 2 + radius, 
      radius, 
      Math.PI, 
      3 * Math.PI / 2, 
      false
    )
    
    this.graphics.closePath()
  }

  private drawWaterSegments() {
    if (this.colors.length === 0) return
    
    const segmentHeight = this.TUBE_HEIGHT / this.maxHeight
    const halfWidth = this.TUBE_WIDTH / 2 - 3 // Slightly smaller than tube
    
    // Calculate the bottom position of the tube's inner area
    const bottomY = this.y + this.TUBE_HEIGHT / 2 - this.TUBE_RADIUS

    // Draw each color segment
    this.colors.forEach((colorIndex, index) => {
      const color = COLOR_PALETTE[colorIndex]
      const isTopSegment = index === this.colors.length - 1
      const isBottomSegment = index === 0
      const segmentY = bottomY - (index * segmentHeight) - segmentHeight / 2
      
      // For the bottom segment, draw a rounded bottom
      if (isBottomSegment) {
        this.graphics.fillStyle(color, 1)
        
        // Create a path for the bottom segment with rounded bottom
        this.graphics.beginPath()
        this.graphics.moveTo(this.x - halfWidth, segmentY + segmentHeight / 2)
        this.graphics.lineTo(this.x + halfWidth, segmentY + segmentHeight / 2)
        this.graphics.lineTo(this.x + halfWidth, segmentY - segmentHeight / 2 + 5)
        
        // Bottom arc
        this.graphics.arc(
          this.x, 
          segmentY - segmentHeight / 2 + 5, 
          halfWidth, 
          0, 
          Math.PI, 
          true
        )
        
        this.graphics.lineTo(this.x - halfWidth, segmentY + segmentHeight / 2)
        this.graphics.closePath()
        this.graphics.fillPath()
      } 
      // For the top segment, add a slight wave effect
      else if (isTopSegment) {
        this.graphics.fillStyle(color, 1)
        
        // Create a wavy top for the liquid
        this.graphics.beginPath()
        this.graphics.moveTo(this.x - halfWidth, segmentY + segmentHeight / 2)
        
        // Bottom edge
        this.graphics.lineTo(this.x + halfWidth, segmentY + segmentHeight / 2)
        
        // Right edge
        this.graphics.lineTo(this.x + halfWidth, segmentY - segmentHeight / 2)
        
        // Top wavy edge
        const waveHeight = 3
        const segments = 5
        
        for (let i = 0; i <= segments; i++) {
          const pointX = this.x + halfWidth - (2 * halfWidth * (i / segments))
          const pointY = segmentY - segmentHeight / 2 + 
                         Math.sin(i / segments * Math.PI) * waveHeight
          
          this.graphics.lineTo(pointX, pointY)
        }
        
        // Left edge
        this.graphics.lineTo(this.x - halfWidth, segmentY + segmentHeight / 2)
        this.graphics.closePath()
        this.graphics.fillPath()
        
        // Add highlight on top of liquid
        this.graphics.fillStyle(0xffffff, 0.3)
        this.graphics.fillEllipse(
          this.x, 
          segmentY - segmentHeight / 2 + 2, 
          halfWidth * 1.2, 
          6
        )
      } 
      // For middle segments, draw a simple rectangle
      else {
        this.graphics.fillStyle(color, 1)
        this.graphics.fillRect(
          this.x - halfWidth, 
          segmentY - segmentHeight / 2, 
          halfWidth * 2, 
          segmentHeight
        )
      }
    })
  }

  private drawGlassReflections() {
    const halfWidth = this.TUBE_WIDTH / 2
    
    // Add glass reflection effect
    this.glassReflection.clear()
    this.glassReflection.fillStyle(COLORS.WHITE, 0.3)
    
    // Add thin vertical reflection
    this.glassReflection.fillRect(
      this.x + halfWidth * 0.5, 
      this.y - this.TUBE_HEIGHT / 2 + 10, 
      2, 
      this.TUBE_HEIGHT - 20
    )
    
    // Add thin highlight across the top curved area
    this.glassReflection.fillStyle(COLORS.WHITE, 0.4)
    
    // Draw small circular highlights near the corners
    this.glassReflection.fillCircle(
      this.x - halfWidth * 0.6, 
      this.y - this.TUBE_HEIGHT / 2 + 10, 
      3
    )
    
    this.glassReflection.fillCircle(
      this.x + halfWidth * 0.2, 
      this.y - this.TUBE_HEIGHT / 2 + 8, 
      2
    )
  }

  private drawSelectionEffects() {
    if (this.selected || this.hovered) {
      // Update glow effect
      if (this.tubeGlow) {
        const glowAlpha = this.selected ? 0.5 : (this.hovered ? 0.3 : 0)
        const glowColor = this.selected ? COLORS.CYAN : COLORS.BRIGHT_ORANGE
        
        this.tubeGlow.setAlpha(glowAlpha)
        this.tubeGlow.setTint(glowColor)
      }
      
      // Draw highlight on the edge
      this.tubeHighlight.clear()
      if (this.selected) {
        const highlight = this.selected ? COLORS.CYAN : COLORS.BRIGHT_ORANGE
        const highlightAlpha = this.selected ? 0.8 : 0.5
        
        this.tubeHighlight.lineStyle(2, highlight, highlightAlpha)
        this.tubeHighlight.strokeRect(
          this.x - this.TUBE_WIDTH / 2 - 4, 
          this.y - this.TUBE_HEIGHT / 2 - 4, 
          this.TUBE_WIDTH + 8, 
          this.TUBE_HEIGHT + 4
        )
      }
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
    
    this.graphics.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerover', this.onPointerOver, this)
      .on('pointerout', this.onPointerOut, this)
  }

  onPointerOver() {
    this.hovered = true
    this.draw()
    
    this.scene.tweens.add({
      targets: [this.graphics, this.glassReflection, this.tubeHighlight, this.tubeGlow],
      y: '-=5',
      duration: 200,
      ease: 'Back.easeOut'
    })
  }

  onPointerOut() {
    this.hovered = false
    this.draw()
    
    this.scene.tweens.add({
      targets: [this.graphics, this.glassReflection, this.tubeHighlight, this.tubeGlow],
      y: '+=5',
      duration: 200,
      ease: 'Sine.easeOut'
    })
  }

  setSelected(selected: boolean) {
    this.selected = selected
    this.draw()
    
    // Add selection animation
    if (selected) {
      // Play a "wiggle" animation to indicate selection
      const tweens = [
        { angle: -3, duration: 100, ease: 'Sine.easeInOut' },
        { angle: 3, duration: 100, ease: 'Sine.easeInOut' },
        { angle: -2, duration: 100, ease: 'Sine.easeInOut' },
        { angle: 2, duration: 100, ease: 'Sine.easeInOut' },
        { angle: 0, duration: 100, ease: 'Sine.easeInOut' }
      ];
      
      // Chain multiple tweens for a wiggle effect
      const currentTargets = [this.graphics, this.glassReflection, this.tubeHighlight, this.tubeGlow];
      
      tweens.forEach((tween, index) => {
        this.shakeAnimation = this.scene.tweens.add({
          targets: currentTargets,
          angle: tween.angle,
          duration: tween.duration,
          ease: tween.ease,
          delay: index * tween.duration
        });
      });
    } else {
      // Stop any ongoing shake animation
      if (this.shakeAnimation && this.shakeAnimation.isPlaying()) {
        this.shakeAnimation.stop()
      }
      
      // Reset angle to 0
      this.graphics.setAngle(0)
      this.glassReflection.setAngle(0)
      this.tubeHighlight.setAngle(0)
      if (this.tubeGlow) this.tubeGlow.setAngle(0)
    }
  }

  addClickListener(callback: (tube: Tube) => void) {
    this.graphics.on("pointerdown", () => {
      // Add a "click" animation
      this.scene.tweens.add({
        targets: [this.graphics, this.glassReflection, this.tubeHighlight, this.tubeGlow],
        scaleX: { from: 0.95, to: 1 },
        scaleY: { from: 0.95, to: 1 },
        duration: 150,
        ease: 'Back.easeOut'
      })
      
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
