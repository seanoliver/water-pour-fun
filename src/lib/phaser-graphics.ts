import * as Phaser from "phaser"

/**
 * PhaserGraphics provides helper methods for Phaser's graphics operations
 * with named parameters for better readability.
 */
export class PhaserGraphics {
  /**
   * Helper method to draw an arc with named parameters for better readability
   */
  static drawArc(
    graphics: Phaser.GameObjects.Graphics,
    params: {
      centerX: number
      centerY: number
      radius: number
      startAngle: number
      endAngle: number
      anticlockwise: boolean
    }
  ) {
    graphics.arc(
      params.centerX,
      params.centerY,
      params.radius,
      params.startAngle,
      params.endAngle,
      params.anticlockwise
    )
  }

  /**
   * Helper method to draw a filled ellipse with named parameters for better readability
   */
  static drawFilledEllipse(
    graphics: Phaser.GameObjects.Graphics,
    params: {
      centerX: number
      centerY: number
      width: number
      height: number
    }
  ) {
    graphics.fillEllipse(
      params.centerX,
      params.centerY,
      params.width,
      params.height
    )
  }

  /**
   * Helper method to draw a filled circle with named parameters for better readability
   */
  static drawFilledCircle(
    graphics: Phaser.GameObjects.Graphics,
    params: {
      centerX: number
      centerY: number
      radius: number
    }
  ) {
    graphics.fillCircle(
      params.centerX,
      params.centerY,
      params.radius
    )
  }

  /**
   * Helper method to draw a filled rectangle with named parameters for better readability
   */
  static drawFilledRect(
    graphics: Phaser.GameObjects.Graphics,
    params: {
      x: number
      y: number
      width: number
      height: number
    }
  ) {
    graphics.fillRect(
      params.x,
      params.y,
      params.width,
      params.height
    )
  }

  /**
   * Helper method for moveTo with named parameters for better readability
   */
  static moveTo(
    graphics: Phaser.GameObjects.Graphics,
    params: {
      x: number
      y: number
    }
  ) {
    graphics.moveTo(params.x, params.y)
  }

  /**
   * Helper method for lineTo with named parameters for better readability
   */
  static lineTo(
    graphics: Phaser.GameObjects.Graphics,
    params: {
      x: number
      y: number
    }
  ) {
    graphics.lineTo(params.x, params.y)
  }

  /**
   * Helper method for beginPath
   */
  static beginPath(graphics: Phaser.GameObjects.Graphics) {
    graphics.beginPath()
  }

  /**
   * Helper method for closePath
   */
  static closePath(graphics: Phaser.GameObjects.Graphics) {
    graphics.closePath()
  }

  /**
   * Helper method for fillPath
   */
  static fillPath(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillPath()
  }

  /**
   * Helper method for fillStyle
   */
  static setFillStyle(
    graphics: Phaser.GameObjects.Graphics,
    params: {
      color: number
      alpha?: number
    }
  ) {
    graphics.fillStyle(params.color, params.alpha !== undefined ? params.alpha : 1)
  }
} 