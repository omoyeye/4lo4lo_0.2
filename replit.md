# Social Media Task Platform

## Overview

This is a full-stack social media task platform designed to enable users to earn points and rewards by completing social media tasks (e.g., likes, follows). The platform supports user authentication, admin management, a referral system, and promotional features. It aims to provide a robust and engaging experience for users while offering powerful tools for administrators to manage tasks and promotions. The project includes comprehensive PWA capabilities for an enhanced mobile experience and robust security features to protect user data and ensure system integrity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a modern full-stack architecture.

**Frontend:**
-   **Framework:** React with TypeScript
-   **Build System:** Vite
-   **UI:** Tailwind CSS with shadcn/ui components (built on Radix UI primitives)
-   **State Management:** React Query for server state, React Context for authentication
-   **Routing:** Wouter
-   **Animations:** Framer Motion
-   **PWA Features:** Full Progressive Web App support including custom install prompts, offline functionality, background sync, and update management.

**Backend:**
-   **Framework:** Express.js with TypeScript
-   **Database ORM:** Drizzle ORM
-   **Authentication:** Passport.js (local and Google OAuth strategies)
-   **Validation:** Zod schemas for type-safe API validation
-   **Architecture:** RESTful API with modular organization, emphasizing separate route handlers, storage, and business logic.
-   **Real-time:** WebSocket service for real-time notifications and task updates.

**Database:**
-   PostgreSQL with Drizzle ORM.
-   **Schema includes:** Users (points, levels, referrals), Tasks, User Tasks (completion tracking), Milestones, Referrals, Admins, a Promotion System, and a Classroom system (videos + completions).

**System Design Choices:**
-   **PWA Capabilities:** Advanced caching strategies (network-first for APIs, cache-first for assets), background sync for offline request queuing, automatic cache versioning, and update notifications.
-   **Security:** Server-side verification for admin access, PostgreSQL session store for production, standardized React Query keys for cache isolation, comprehensive Zod validation on all API routes, and robust WebSocket lifecycle management with auto-reconnection and cleanup.
-   **Performance:** Intelligent task allocator, dashboard caching system (reducing API response times significantly), and optimized client-side WebSocket management.

## External Dependencies

-   **@neondatabase/serverless**: PostgreSQL database connection.
-   **drizzle-orm**: Type-safe ORM.
-   **@tanstack/react-query**: Server state management and caching.
-   **passport**: Authentication middleware (including Google OAuth).
-   **@radix-ui/***: Accessible UI component primitives.
-   **framer-motion**: Animation library.
-   **drizzle-kit**: Database migration and schema management.
-   **esbuild**: Fast JavaScript bundler for server code.
-   **vite**: Modern build tool and development server.
-   **tailwindcss**: Utility-first CSS framework.