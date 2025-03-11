# Project Architecture

This document outlines the architectural patterns and design principles for the Water Pour Fun project.

## Project Structure

```
water-pour-fun/
├── src/
│   ├── app/                 # Next.js App Router pages and layouts
│   ├── components/          # Reusable UI components
│   │   ├── logic/           # Game logic components
│   │   ├── objects/         # Game object components
│   │   └── scenes/          # Game scene components
│   └── lib/                 # Utility functions, hooks, and types
├── public/                  # Static assets
└── [configuration files]    # Next.js, TypeScript, ESLint, etc.
```

## Architectural Principles

### 1. Component-Based Architecture

- Build the UI using composable, reusable React components
- Each component should have a single responsibility
- Components should be designed for reusability when appropriate
- Avoid deeply nested component hierarchies

### 2. Server/Client Component Separation

- Leverage Next.js App Router's server and client components
- Use 'use client' directive for interactive components
- Keep server components when possible for better performance
- Use dynamic imports for client-only components to prevent SSR issues

### 3. Phaser Game Architecture

- Organize game code in a modular, object-oriented manner
- Separate game logic from rendering concerns
- Use the Phaser scene system for different game states
- Encapsulate game objects in their own classes

### 4. State Management

- Use React's built-in state management (useState, useReducer, Context API) for UI state
- Consider using a state management library only if complexity increases
- Keep state as close as possible to where it's used
- Avoid prop drilling with context where appropriate

### 5. Data Flow

- Follow unidirectional data flow patterns
- Props flow down, events/callbacks flow up
- Use custom hooks to encapsulate stateful logic
- Separate data fetching from rendering

### 6. Separation of Concerns

- Separate business logic from presentation
- Extract reusable logic into custom hooks
- Create utility functions for common operations
- Use TypeScript interfaces and types to define data structures

### 7. Error Handling

- Implement proper error boundaries
- Handle and log errors appropriately
- Provide meaningful error messages to users
- Implement fallback UI for error states

## Design Patterns

### Container/Presentation Pattern

- Separate container components (with logic/state) from presentation components (UI only)
- Example: `GameContainerWrapper` as a container, with pure presentation components

### Custom Hooks

- Extract reusable stateful logic into custom hooks
- Keep hooks focused on a specific concern
- Follow the naming convention `use[Feature]`

### Object-Oriented Programming (OOP)

- Use class-based components for game objects and scenes
- Implement inheritance for specialized game elements
- Encapsulate state and behavior within classes
- Use composition over inheritance when appropriate

### Factory Pattern

- Use factory functions to create complex objects
- Encapsulate object creation logic

## Performance Considerations

- Memoize expensive calculations with useMemo/useCallback
- Use virtualization for long lists if needed
- Optimize images and assets
- Implement code splitting with dynamic imports
- Consider lazy loading for non-critical components 