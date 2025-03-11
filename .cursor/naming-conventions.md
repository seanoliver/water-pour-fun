# Naming Conventions

This document outlines the naming conventions for the Water Pour Fun project to ensure consistency across the codebase.

## Files and Directories

### Components

- Component files: **PascalCase** with `.tsx` extension
  - Example: `GameContainer.tsx`, `WaterJug.tsx`
- Component directories: **PascalCase** 
  - Example: `Button/`, `Modal/`
- Component-specific utilities: **camelCase** with descriptive suffixes
  - Example: `buttonUtils.ts`, `modalHelpers.ts`

### Pages

- Page files: **camelCase** with `.tsx` extension in the App Router
  - Example: `page.tsx`, `layout.tsx`
- Route directories: **kebab-case** 
  - Example: `about-us/`, `game-rules/`

### Utilities and Hooks

- Utility files: **camelCase** with `.ts` extension
  - Example: `formatUtils.ts`, `mathHelpers.ts`
- Hook files: **camelCase** with `use` prefix and `.ts` extension
  - Example: `useGameState.ts`, `useWaterLevel.ts`

### Types and Interfaces

- Type definition files: **camelCase** with `.types.ts` extension
  - Example: `game.types.ts`, `water.types.ts`

## Code Elements

### Variables and Functions

- Variables: **camelCase**
  - Example: `waterLevel`, `jugCapacity`
- Functions: **camelCase** with verb prefixes
  - Example: `calculateVolume()`, `handleWaterPour()`
- Boolean variables: **camelCase** with `is`, `has`, or `should` prefixes
  - Example: `isGameOver`, `hasWater`, `shouldReset`

### Constants

- Constants: **UPPER_SNAKE_CASE**
  - Example: `MAX_WATER_LEVEL`, `DEFAULT_JUG_COUNT`
- Enum names: **PascalCase**
  - Example: `GameState`, `JugSize`
- Enum values: **UPPER_SNAKE_CASE**
  - Example: `GameState.GAME_OVER`, `JugSize.LARGE`

### Components and Classes

- React components: **PascalCase**
  - Example: `WaterJug`, `GameBoard`
- Class names: **PascalCase**
  - Example: `WaterSimulation`, `GameEngine`
- Interface names: **PascalCase** with `I` prefix or descriptive suffix
  - Example: `IWaterJug` or `WaterJugProps`
- Type names: **PascalCase**
  - Example: `GameState`, `WaterLevel`

### CSS Classes

- CSS class names: **kebab-case** or follow a methodology like BEM
  - Example: `water-jug`, `game-container`
  - BEM example: `water-jug__fill`, `game-container--active`

### Event Handlers

- Event handler props: **camelCase** with `on` prefix
  - Example: `onClick`, `onPour`
- Event handler functions: **camelCase** with `handle` prefix
  - Example: `handleClick`, `handlePour`

## Naming Principles

1. **Be descriptive**: Names should clearly indicate what the code element does or represents
2. **Be concise**: Avoid unnecessarily long names while maintaining clarity
3. **Be consistent**: Follow established patterns within the codebase
4. **Avoid abbreviations**: Unless they are widely understood (e.g., `id`, `url`, `http`)
5. **Use domain-specific terminology**: Align naming with the water pouring game domain
6. **Avoid generic names**: Like `data`, `value`, `item` without additional context

## Examples in Context

```typescript
// Component
export function WaterJug({ capacity, currentLevel, onPour }: WaterJugProps) {
  const isJugFull = currentLevel >= capacity;
  
  function handlePourClick() {
    if (!isJugFull) {
      onPour(JUG_POUR_AMOUNT);
    }
  }
  
  return (
    <div className="water-jug">
      {/* Component JSX */}
    </div>
  );
}

// Types
interface WaterJugProps {
  capacity: number;
  currentLevel: number;
  onPour: (amount: number) => void;
}

// Constants
const JUG_POUR_AMOUNT = 1;
const MAX_JUG_CAPACITY = 5;

// Enum
enum GameState {
  IDLE = 'idle',
  POURING = 'pouring',
  GAME_OVER = 'gameOver',
}
``` 