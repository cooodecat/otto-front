# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Otto Frontend is a modern SvelteKit 5.0 application built with TypeScript, Tailwind CSS 4.0, and Vite 7.0. This is a cutting-edge web application utilizing the latest versions of the Svelte ecosystem for optimal developer experience and performance.

## Common Development Commands

### Development

```bash
pnpm dev              # Start development server with HMR
pnpm preview          # Preview production build locally
```

### Build & Production

```bash
pnpm build            # Build for production (Vercel deployment)
```

### Code Quality

```bash
pnpm format           # Format code with Prettier
pnpm lint             # Run ESLint + format check
pnpm check            # Run TypeScript type checking
pnpm check:watch      # Run type checking in watch mode
```

### Project Setup

```bash
pnpm prepare          # Sync SvelteKit project (run after git clone)
```

## Architecture & Code Structure

### Technology Stack

- **SvelteKit 2.22.0** with **Svelte 5.0** - Latest reactive framework
- **TypeScript 5.0** - Strict type checking enabled
- **Tailwind CSS 4.0** - Latest utility-first CSS framework with Vite integration
- **Vite 7.0** - Modern build tool with fast HMR
- **ESLint 9.x** - Flat configuration format (modern ESLint setup)
- **Vercel Adapter** - Optimized for Vercel deployment

### Project Structure

```
src/
├── app.css              # Global styles (Tailwind imports)
├── app.d.ts             # SvelteKit ambient type definitions
├── app.html             # HTML shell template
├── lib/                 # Shared utilities and components
│   ├── assets/         # Static assets (favicon, etc.)
│   └── index.ts        # Library exports
└── routes/             # File-based routing
    ├── +layout.svelte  # Root layout component
    └── +page.svelte    # Homepage
```

### SvelteKit Routing

- **File-based routing** with `+page.svelte` for pages
- **Layout system** using `+layout.svelte` files
- **Server-side rendering** (SSR) enabled by default
- **Path aliases** configured: `$lib` maps to `src/lib`

## Configuration Details

### TypeScript Configuration

- **Strict mode** enabled for maximum type safety
- **Module resolution**: bundler (optimal for Vite)
- **SvelteKit path mapping** for clean imports
- **No unchecked indexed access** for array safety

### ESLint Setup (Modern Flat Config)

- **ESLint 9.x flat configuration** (not legacy .eslintrc)
- **TypeScript-ESLint integration** with recommended rules
- **Svelte-specific linting** with @typescript-eslint/eslint-plugin-svelte
- **Prettier integration** to avoid conflicts

### Tailwind CSS 4.0 Integration

- **Vite plugin** integration (@tailwindcss/vite)
- **Forms plugin** for better form styling
- **PostCSS-free** setup (handled by Vite plugin)
- **Import in app.css**: `@import "tailwindcss";`

### Package Management

- **pnpm required** (engines-strict enforced)
- **Node.js version** managed via engines field
- **Vercel deployment** optimized

## Development Guidelines

### Component Development

- Use **Svelte 5.0 syntax** (runes, event handlers, etc.)
- Prefer **TypeScript** for all components
- Follow **SvelteKit conventions** for file naming
- Utilize **$lib** alias for internal imports

### Styling Approach

- **Tailwind CSS 4.0** for all styling
- **Utility-first** approach preferred
- **Component-scoped styles** when needed using `<style>` blocks
- **CSS custom properties** for theming if required

### Type Safety

- **Strict TypeScript** configuration enforced
- **Ambient types** in `app.d.ts` for SvelteKit integration
- **Type imports** from `@sveltejs/kit` for route data

## Build & Deployment

### Vercel Integration

- **@sveltejs/adapter-vercel** configured for optimal Vercel deployment
- **Automatic optimizations** including code splitting and tree shaking
- **SSR/SSG** capabilities available

### Performance Optimizations

- **Vite 7.0** for fast builds and HMR
- **SvelteKit's automatic** code splitting
- **Tree shaking** and dead code elimination
- **Modern JavaScript** output targets

## Environment Setup

### Required Tools

- **Node.js** (version specified in package.json engines)
- **pnpm** (enforced via engines-strict)

### Development Workflow

1. `pnpm install` - Install dependencies
2. `pnpm prepare` - Sync SvelteKit project
3. `pnpm dev` - Start development server
4. `pnpm check:watch` - Enable continuous type checking
5. `pnpm lint` before commits for code quality

This project represents a modern, type-safe SvelteKit application optimized for developer experience and production performance.

- to memorize 항상 최신의 sveltkit5 문법을 사용해주세요. 잘 모르겠다면 sveltkit5 검색을 통해서 사용하세요.
