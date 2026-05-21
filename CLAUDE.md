@AGENTS.md

# Project Constitution

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Server Components by default

---

# Core Rules

## General

- Always use TypeScript.
- Never use `any`.
- Prefer functional components.
- Prefer async/await over promise chains.
- Keep components small and composable.
- Avoid unnecessary abstractions.

---

# App Router Rules

## Components

- Use Server Components by default.
- Only add `"use client"` when:
  - state is needed
  - browser APIs are needed
  - event handlers are needed

## Data Fetching

- Fetch data inside Server Components when possible.
- Avoid client-side fetching unless interactive.
- Use Route Handlers for backend endpoints.

---

# Folder Structure

Use this structure:

app/
components/
lib/
hooks/
types/
services/
styles/

Rules:
- Shared UI goes in `components`
- API utilities go in `lib`
- Business logic goes in `services`
- Reusable hooks go in `hooks`

---

# Styling Rules

- Use Tailwind utility classes.
- Avoid inline styles.
- Prefer reusable UI primitives.
- Keep classNames readable.

Example order:
- layout
- spacing
- typography
- colors
- effects

---

# TypeScript Rules

- Use explicit types for props.
- Export reusable types from `types/`.
- Prefer interfaces for object contracts.
- Use discriminated unions when useful.

Never:
- use `any`
- ignore TypeScript errors
- disable strict mode

---

# Component Rules

## Preferred Pattern

- One component per file
- Named exports preferred
- Keep files under ~200 lines when possible

## Avoid

- deeply nested JSX
- prop drilling across many layers
- duplicated UI logic

---

# State Management

Preferred order:
1. Server state
2. URL state
3. React state
4. Global state only if necessary

Use:
- `useState`
- `useReducer`
- Context sparingly

Do not introduce Redux unless explicitly requested.

---

# Forms

- Prefer server actions when possible.
- Use Zod for validation.
- Keep validation shared between client/server.

---

# Performance

- Optimize images using Next Image.
- Avoid unnecessary client components.
- Lazy load heavy UI.
- Avoid large dependency installs.

---

# Accessibility

- All buttons must have accessible labels.
- Inputs must have labels.
- Use semantic HTML.
- Ensure keyboard navigation works.

---

# Code Generation Rules

When generating code:
- produce complete working files
- avoid placeholders
- avoid pseudo-code
- explain important decisions briefly
- keep implementations simple and production-ready

---

# UI Philosophy

- Clean
- Minimal
- Modern
- Good spacing
- Subtle animations only

Prefer:
- rounded-xl
- soft shadows
- neutral color palettes

---

# Error Handling

- Handle loading states
- Handle empty states
- Handle API failures gracefully

Never leave unhandled async errors.

---

# Security

- Never expose secrets in client code.
- Validate all external input.
- Sanitize user-generated content.

---

# Dependency Policy

Before adding a dependency:
- explain why it is needed
- prefer lightweight libraries
- avoid abandoned packages

---

# Testing

Prefer:
- Vitest
- React Testing Library

Test:
- business logic
- critical UI behavior
- edge cases

---

# Git Rules

Commit style:
- feat:
- fix:
- refactor:
- chore:
- docs:

Keep commits focused and small.

---

# Final Principle

Prefer clarity over cleverness.
Prefer maintainability over abstraction.
Prefer simple solutions first.