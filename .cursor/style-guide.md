# Code Style Guide

This document outlines the coding style guidelines for the Water Pour Fun project.

## General

- Use 2 spaces for indentation
- Avoid semicolons at the end of statements (in accordance with Prettier config)
- Keep line length under 80 characters when possible (maximum 100 characters)
- Use single quotes for strings in JavaScript/TypeScript
- Use double quotes for JSX attributes
- Add trailing commas for multi-line object literals and array literals
- Always include curly braces for control statements (if, else, for, while, etc.)
- Avoid unused variables and imports

## TypeScript

- Prefer `const` over `let` when variable values don't change
- Use `type` for complex types and `interface` for object shapes that will be extended
- Always define explicit return types for functions (except for React components with JSX return)
- Use type annotations for function parameters
- Leverage TypeScript's strong typing - avoid using `any` when possible
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators
- Use template literals over string concatenation
- Use arrow functions for callbacks and anonymous functions

## React Components

- Use functional components with hooks (not class components)
- Separate client components with 'use client' directive at the top
- Place imports in the following order:
  1. React and Next.js imports
  2. Third-party library imports
  3. Local component imports
  4. Utility/hook imports
  5. Type imports
  6. Style imports
- Use named exports for components (except for pages)
- Destructure props in component parameters
- Organize component functions in a logical manner:
  1. State declarations
  2. Effect hooks
  3. Event handlers
  4. Helper functions
  5. Return statement (JSX)
- Use dynamic imports for client-only components to prevent SSR issues

## CSS / Styling

- Use Tailwind CSS for styling components
- Prefer utility classes over custom CSS
- When custom CSS is necessary, use component-scoped CSS
- Follow a consistent class naming convention (e.g., BEM or similar)
- Prioritize responsive design using Tailwind's responsive utilities

## Comments

- Use comments to explain "why", not "what"
- Add JSDoc comments for functions and components that require explanation
- Keep comments up-to-date with code changes
- Use TODO, FIXME, and NOTE comments when appropriate (but resolve them promptly)

## File and Folder Structure

- Keep files focused on a single responsibility
- Group related files in directories
- Use consistent naming conventions (see naming-conventions.md)
- Organize code based on features rather than file types 