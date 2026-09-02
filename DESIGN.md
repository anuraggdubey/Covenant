# Covenant Design System (v2: Dynamic Aesthetic)

## Overview
Covenant's UI is built to feel premium, living, and highly-engineered. Inspired by state-of-the-art Web3 interfaces like Auxia and Kimia, this design language prioritizes:
- **Fluidity**: Rich scroll animations, staggered reveals, and responsive micro-interactions (Framer Motion).
- **Depth**: Glassmorphism, subtle background glows, and radial gradients.
- **Utility**: Tailwind CSS is the core styling engine.

## Colors & Themes
We default to a deeply saturated dark mode.
- **Background**: Deep space blacks and very dark violet/blue tints (e.g. `bg-zinc-950`).
- **Accent**: Neon violet, cyan, and glowing emeralds. Gradients are highly encouraged for primary elements.
- **Surfaces**: Translucent panels with background blur (`backdrop-blur-md`, `bg-white/5`), defined by subtle 1px borders (`border-white/10`).

## Typography
- **Primary Font**: `Inter` for all UI text, headings, and body copy.
- **Data Font**: `ui-monospace` remains for cryptographic identifiers (hashes, nonces).
- Use tight tracking on large headings, and generous line-heights on body copy.

## Animations
- **Framer Motion** is used for all layout transitions and state changes.
- Elements should fade and slide in gracefully as they enter the viewport.
- Hover states should include micro-scaling (`scale-105`) and glow intensity changes.

## Development Stack
- **Tailwind CSS**: Core styling framework.
- **Framer Motion**: Animation library.
- **Lucide React**: Clean, modern iconography.
