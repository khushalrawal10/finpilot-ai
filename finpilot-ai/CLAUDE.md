# CLAUDE.md — Architecture & System Design

## AI-Powered Personal Finance Assistant

> This document is the single source of truth for all architectural decisions, system design, data flows, and technical strategy. Every implementation decision should trace back to a section in this document.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [High-Level System Design](#2-high-level-system-design)
3. [Layer Responsibilities](#3-layer-responsibilities)
4. [Clean Architecture Boundaries](#4-clean-architecture-boundaries)
5. [Project Folder Structure](#5-project-folder-structure)
6. [Feature Modules](#6-feature-modules)
7. [State Management Strategy](#7-state-management-strategy)
8. [Navigation Strategy](#8-navigation-strategy)
9. [Data Flow](#9-data-flow)
10. [Authentication Flow](#10-authentication-flow)
11. [AI Chat Flow](#11-ai-chat-flow)
12. [Embedding Flow](#12-embedding-flow)
13. [Semantic Search Flow](#13-semantic-search-flow)
14. [Streaming Response Flow](#14-streaming-response-flow)
15. [Error Handling Strategy](#15-error-handling-strategy)
16. [Offline Strategy](#16-offline-strategy)
17. [Security Considerations](#17-security-considerations)
18. [Scalability Considerations](#18-scalability-considerations)
19. [Performance Considerations](#19-performance-considerations)
20. [Database Design](#20-database-design)
21. [AI Analysis](#21-ai-analysis)
22. [Fintech Considerations](#22-fintech-considerations)
23. [Architecture Diagrams](#23-architecture-diagrams)
24. [Deployment Strategy](#24-deployment-strategy)
25. [Development Roadmap](#25-development-roadmap)

---

## 1. Architecture Overview

### Pattern: Clean Architecture (Feature-First)

The application follows **Clean Architecture** with a **feature-first modular structure**. This means:

1. **Dependency Rule**: Dependencies point inward. Outer layers (UI, data) depend on inner layers (domain). Never the reverse.
2. **Feature Isolation**: Each feature (auth, transactions, ai_chat, analytics, profile) is a self-contained module with its own presentation, domain, and data layers.
3. **Shared Core**: Cross-cutting concerns (networking, DI, types, utilities) live in `core/` and `shared/`.

### Why Clean Architecture?

| Consideration | Reasoning |
|---------------|-----------|
| **Testability** | Domain logic is framework-independent → pure function unit tests with no mocking of React Native, Supabase, or navigation |
| **Maintainability** | Feature changes are scoped to a single module. Adding "Budgets" doesn't touch transactions or chat |
| **Team Scalability** | Different developers can work on different features without merge conflicts |
| **Backend Flexibility** | Repository pattern abstracts Supabase. If we migrate to a custom API, only data layer implementations change |
| **AI Pipeline Isolation** | The RAG pipeline (embedding, search, generation) is encapsulated in `ai_chat` feature, preventing AI concerns from leaking into transactions |

### Trade-offs

| Pro | Con |
|-----|-----|
| Strong separation of concerns | More files and boilerplate compared to a flat structure |
| Easy to test in isolation | Learning curve for developers unfamiliar with Clean Architecture |
| Framework-independent domain | Mapping between layers (entity → DTO → view model) adds code |
| Safe refactoring | Over-engineering risk for small features (e.g., profile) |

**Mitigation for boilerplate**: For simple features (profile, categories), layers can be collapsed — domain can be minimal or omitted entirely, with the presentation layer calling the data layer directly via a thin use case.

---

## 2. High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                                 │
│  ┌───────────┐  ┌───────────────┐  ┌────────────┐  ┌────────────┐  │
│  │   Auth     │  │ Transactions  │  │  AI Chat   │  │ Analytics  │  │
│  │  Feature   │  │   Feature     │  │  Feature   │  │  Feature   │  │
│  └─────┬─────┘  └──────┬────────┘  └─────┬──────┘  └─────┬──────┘  │
│        │               │                  │               │          │
│  ┌─────┴───────────────┴──────────────────┴───────────────┴──────┐  │
│  │                     CORE / SHARED LAYER                        │  │
│  │  Supabase Client · DI Container · Error Handler · Types       │  │
│  └───────────────────────────┬────────────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         SUPABASE PLATFORM                            │
│                                                                      │
│  ┌──────────────┐  ┌───────────────────┐  ┌───────────────────────┐ │
│  │   GoTrue     │  │  PostgREST        │  │   Edge Functions      │ │
│  │   (Auth)     │  │  (Auto REST API)  │  │   (Deno Runtime)      │ │
│  │              │  │                   │  │                       │ │
│  │  • Sign Up   │  │  • CRUD Endpoints │  │  • /chat  (SSE)       │ │
│  │  • Sign In   │  │  • RLS Enforced   │  │  • /embed (async)     │ │
│  │  • JWT Mgmt  │  │  • Filtering      │  │  • /classify (query)  │ │
│  └──────┬───────┘  └────────┬──────────┘  └──────────┬────────────┘ │
│         │                   │                        │              │
│  ┌──────┴───────────────────┴────────────────────────┴────────────┐ │
│  │                      PostgreSQL + pgvector                     │ │
│  │                                                                │ │
│  │  Tables: users, transactions, categories, chat_sessions,      │ │
│  │          chat_messages, transaction_embeddings, ai_cache       │ │
│  │                                                                │ │
│  │  Extensions: pgvector, pg_trgm, uuid-ossp                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL AI SERVICES                            │
│                                                                      │
│  ┌───────────────────────┐  ┌────────────────────────────────────┐  │
│  │  Embedding API        │  │  LLM Chat Completion API           │  │
│  │  (text-embedding-     │  │  (gpt-4o-mini or equivalent)       │  │
│  │   3-small, 1536 dim)  │  │  • Streaming responses             │  │
│  │  • Transaction text   │  │  • System prompt + context          │  │
│  │    → vector           │  │  • Temperature: 0.1 (factual)       │  │
│  └───────────────────────┘  └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| Mobile Client | UI rendering, local state, offline queue, navigation | React Native, TypeScript |
| GoTrue | Authentication, JWT issuance, token refresh | Supabase Auth |
| PostgREST | Auto-generated REST API from PostgreSQL schema | Supabase |
| Edge Functions | Custom server logic: AI chat, embedding, query classification | Deno (Supabase Edge Functions) |
| PostgreSQL | Persistent data storage, RLS enforcement, RPC functions | Supabase Postgres |
| pgvector | Vector similarity search for transaction embeddings | PostgreSQL extension |
| Embedding API | Convert transaction text to vector embeddings | OpenAI / equivalent |
| LLM API | Generate natural language answers from context | OpenAI / equivalent |

---

## 3. Layer Responsibilities

### 3.1 Presentation Layer
```
Responsibility: UI rendering, user input handling, view state management
Contains:       Screens, Components, Hooks, ViewModels (via hooks)
Depends on:     Domain Layer (use cases, entities)
Never:          Directly accesses Supabase, makes HTTP calls, or contains business logic
```

**Key Principles:**
- Screens are thin orchestrators — they compose components and call hooks.
- Custom hooks (`useTransactionList`, `useChatStream`) encapsulate presentation logic.
- React Query hooks manage server state; Zustand manages UI state.
- Components receive data via props or hooks, never via direct service calls.

### 3.2 Domain Layer
```
Responsibility: Business rules, entities, use case definitions, repository interfaces
Contains:       Entities, Use Cases, Repository Interfaces, Value Objects, Domain Errors
Depends on:     Nothing (innermost layer)
Never:          Imports from React Native, Supabase, or any framework
```

**Key Principles:**
- Entities are plain TypeScript classes/interfaces (e.g., `Transaction`, `ChatSession`).
- Use cases are single-purpose functions/classes (e.g., `CreateTransactionUseCase`, `SearchTransactionsUseCase`).
- Repository interfaces define data access contracts (`ITransactionRepository`).
- Domain layer is 100% unit-testable without mocks of external systems.

### 3.3 Data Layer
```
Responsibility: External system communication, data mapping, caching
Contains:       Repository Implementations, API Clients, DTOs, Mappers
Depends on:     Domain Layer (implements repository interfaces)
Never:          Contains business logic or UI logic
```

**Key Principles:**
- Repository implementations (`SupabaseTransactionRepository`) fulfill domain interfaces.
- DTOs map between database/API shapes and domain entities.
- Mappers handle transformation logic (e.g., `TransactionDTO → Transaction`).
- All Supabase interactions are encapsulated here.

---

## 4. Clean Architecture Boundaries

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│    PRESENTATION LAYER (Screens, Components, Hooks)       │
│    ┌──────────────────────────────────────────────────┐  │
│    │                                                  │  │
│    │    DOMAIN LAYER (Entities, Use Cases, Interfaces)│  │
│    │    ┌──────────────────────────────────────────┐  │  │
│    │    │                                          │  │  │
│    │    │    DATA LAYER (Repos, DTOs, Mappers)     │  │  │
│    │    │                                          │  │  │
│    │    └──────────────────────────────────────────┘  │  │
│    │                                                  │  │
│    └──────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘

Dependency Direction: OUTSIDE → INSIDE (Presentation → Domain ← Data)
```

### Boundary Rules

| Rule | Example |
|------|---------|
| Presentation depends on Domain | `TransactionScreen` calls `CreateTransactionUseCase` |
| Data depends on Domain | `SupabaseTransactionRepo` implements `ITransactionRepository` |
| Domain depends on nothing | `Transaction` entity has zero imports from RN or Supabase |
| Data never depends on Presentation | Repository never references a React component or hook |
| Presentation never depends on Data | Screen never imports `SupabaseTransactionRepo` directly |

### Crossing Boundaries via Dependency Injection

```
// Domain Layer — defines the contract
interface ITransactionRepository {
  getAll(userId: string, filters: TransactionFilters): Promise<Transaction[]>;
  create(transaction: CreateTransactionDTO): Promise<Transaction>;
}

// Data Layer — implements the contract
class SupabaseTransactionRepository implements ITransactionRepository {
  // Uses Supabase client internally
}

// DI Container — wires implementation to interface
const container = {
  transactionRepository: new SupabaseTransactionRepository(supabaseClient),
};

// Presentation Layer — consumes via DI
function useTransactions() {
  const repo = useContainer().transactionRepository; // ITransactionRepository
  return useQuery(['transactions'], () => repo.getAll(userId, filters));
}
```

> **Note**: The code above illustrates the *pattern*, not production code. No implementation code is being generated per project rules.

---

## 5. Project Folder Structure

```
src/
├── core/                              # Cross-cutting infrastructure
│   ├── config/                        # Environment, feature flags
│   │   ├── env.ts                     # Environment variable access
│   │   └── constants.ts              # App-wide constants
│   ├── di/                            # Dependency Injection container
│   │   ├── container.ts              # DI container definition
│   │   └── provider.tsx              # React Context provider for DI
│   ├── network/                       # HTTP client, interceptors
│   │   ├── supabase-client.ts        # Supabase client singleton
│   │   ├── api-error.ts             # Typed API error handling
│   │   └── sse-client.ts            # Server-Sent Events client
│   ├── storage/                       # Secure & async storage wrappers
│   │   ├── secure-storage.ts        # Keychain/Keystore wrapper
│   │   └── async-storage.ts         # AsyncStorage / MMKV wrapper
│   ├── types/                         # Global type definitions
│   │   ├── common.ts                # Shared types (Pagination, DateRange, etc.)
│   │   ├── api.ts                   # API response/error types
│   │   └── navigation.ts           # Route parameter types
│   └── utils/                         # Pure utility functions
│       ├── date.ts                   # Date formatting, timezone handling
│       ├── currency.ts              # Currency formatting, validation
│       ├── validation.ts            # Common Zod schemas
│       └── logger.ts               # Logging utility (dev vs. prod)
│
├── features/                          # Feature modules (self-contained)
│   ├── auth/                          # Authentication feature
│   │   ├── presentation/
│   │   │   ├── screens/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── RegisterScreen.tsx
│   │   │   │   └── ForgotPasswordScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── AuthForm.tsx
│   │   │   │   └── SocialLoginButton.tsx
│   │   │   └── hooks/
│   │   │       ├── useAuth.ts
│   │   │       └── useAuthForm.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── User.ts
│   │   │   ├── repositories/
│   │   │   │   └── IAuthRepository.ts
│   │   │   └── use-cases/
│   │   │       ├── LoginUseCase.ts
│   │   │       ├── RegisterUseCase.ts
│   │   │       └── LogoutUseCase.ts
│   │   ├── data/
│   │   │   ├── repositories/
│   │   │   │   └── SupabaseAuthRepository.ts
│   │   │   ├── dtos/
│   │   │   │   └── AuthDTO.ts
│   │   │   └── mappers/
│   │   │       └── UserMapper.ts
│   │   └── index.ts                  # Public API barrel export
│   │
│   ├── transactions/                  # Transaction management feature
│   │   ├── presentation/
│   │   │   ├── screens/
│   │   │   │   ├── TransactionListScreen.tsx
│   │   │   │   ├── TransactionDetailScreen.tsx
│   │   │   │   └── AddTransactionScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── TransactionCard.tsx
│   │   │   │   ├── TransactionForm.tsx
│   │   │   │   ├── TransactionFilters.tsx
│   │   │   │   ├── CategoryPicker.tsx
│   │   │   │   └── AmountInput.tsx
│   │   │   └── hooks/
│   │   │       ├── useTransactions.ts
│   │   │       ├── useTransactionForm.ts
│   │   │       ├── useTransactionFilters.ts
│   │   │       └── useCategories.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Transaction.ts
│   │   │   │   └── Category.ts
│   │   │   ├── repositories/
│   │   │   │   ├── ITransactionRepository.ts
│   │   │   │   └── ICategoryRepository.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── CreateTransactionUseCase.ts
│   │   │   │   ├── UpdateTransactionUseCase.ts
│   │   │   │   ├── DeleteTransactionUseCase.ts
│   │   │   │   ├── GetTransactionsUseCase.ts
│   │   │   │   └── GetCategoriesUseCase.ts
│   │   │   └── value-objects/
│   │   │       ├── Money.ts
│   │   │       └── TransactionType.ts
│   │   ├── data/
│   │   │   ├── repositories/
│   │   │   │   ├── SupabaseTransactionRepository.ts
│   │   │   │   └── SupabaseCategoryRepository.ts
│   │   │   ├── dtos/
│   │   │   │   ├── TransactionDTO.ts
│   │   │   │   └── CategoryDTO.ts
│   │   │   └── mappers/
│   │   │       ├── TransactionMapper.ts
│   │   │       └── CategoryMapper.ts
│   │   └── index.ts
│   │
│   ├── ai_chat/                       # AI chat feature
│   │   ├── presentation/
│   │   │   ├── screens/
│   │   │   │   ├── ChatScreen.tsx
│   │   │   │   └── ChatSessionListScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── ChatBubble.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── StreamingText.tsx
│   │   │   │   ├── SourceTransactionCard.tsx
│   │   │   │   ├── SuggestedQuestions.tsx
│   │   │   │   └── SessionListItem.tsx
│   │   │   └── hooks/
│   │   │       ├── useChatStream.ts
│   │   │       ├── useChatSessions.ts
│   │   │       ├── useChatMessages.ts
│   │   │       └── useStreamingResponse.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── ChatSession.ts
│   │   │   │   ├── ChatMessage.ts
│   │   │   │   └── AIResponse.ts
│   │   │   ├── repositories/
│   │   │   │   ├── IChatRepository.ts
│   │   │   │   └── IAIServiceRepository.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── SendMessageUseCase.ts
│   │   │   │   ├── CreateSessionUseCase.ts
│   │   │   │   ├── GetSessionsUseCase.ts
│   │   │   │   ├── DeleteSessionUseCase.ts
│   │   │   │   └── SearchTransactionsUseCase.ts
│   │   │   └── services/
│   │   │       ├── IQueryClassifier.ts
│   │   │       └── IContextBuilder.ts
│   │   ├── data/
│   │   │   ├── repositories/
│   │   │   │   ├── SupabaseChatRepository.ts
│   │   │   │   └── EdgeFunctionAIServiceRepository.ts
│   │   │   ├── dtos/
│   │   │   │   ├── ChatMessageDTO.ts
│   │   │   │   └── AIResponseDTO.ts
│   │   │   ├── mappers/
│   │   │   │   ├── ChatMessageMapper.ts
│   │   │   │   └── AIResponseMapper.ts
│   │   │   └── services/
│   │   │       ├── SSEStreamParser.ts
│   │   │       └── StreamTokenizer.ts
│   │   └── index.ts
│   │
│   ├── analytics/                     # Analytics & dashboards feature
│   │   ├── presentation/
│   │   │   ├── screens/
│   │   │   │   └── AnalyticsDashboardScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── SpendingChart.tsx
│   │   │   │   ├── CategoryBreakdown.tsx
│   │   │   │   ├── TrendChart.tsx
│   │   │   │   ├── SummaryCard.tsx
│   │   │   │   └── DateRangePicker.tsx
│   │   │   └── hooks/
│   │   │       ├── useAnalytics.ts
│   │   │       └── useChartData.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── SpendingSummary.ts
│   │   │   │   └── CategorySummary.ts
│   │   │   ├── repositories/
│   │   │   │   └── IAnalyticsRepository.ts
│   │   │   └── use-cases/
│   │   │       ├── GetMonthlySummaryUseCase.ts
│   │   │       └── GetCategoryBreakdownUseCase.ts
│   │   ├── data/
│   │   │   ├── repositories/
│   │   │   │   └── SupabaseAnalyticsRepository.ts
│   │   │   └── mappers/
│   │   │       └── AnalyticsMapper.ts
│   │   └── index.ts
│   │
│   └── profile/                       # User profile & settings feature
│       ├── presentation/
│       │   ├── screens/
│       │   │   ├── ProfileScreen.tsx
│       │   │   └── SettingsScreen.tsx
│       │   ├── components/
│       │   │   ├── ProfileHeader.tsx
│       │   │   ├── SettingsItem.tsx
│       │   │   └── CurrencySelector.tsx
│       │   └── hooks/
│       │       ├── useProfile.ts
│       │       └── useSettings.ts
│       ├── domain/
│       │   ├── entities/
│       │   │   └── UserProfile.ts
│       │   ├── repositories/
│       │   │   └── IProfileRepository.ts
│       │   └── use-cases/
│       │       ├── UpdateProfileUseCase.ts
│       │       └── DeleteAccountUseCase.ts
│       ├── data/
│       │   ├── repositories/
│       │   │   └── SupabaseProfileRepository.ts
│       │   └── mappers/
│       │       └── ProfileMapper.ts
│       └── index.ts
│
├── shared/                            # Shared UI components & utilities
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── TextInput.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorView.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Toast.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Divider.tsx
│   │   └── ScreenContainer.tsx
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useKeyboard.ts
│   │   ├── useNetworkStatus.ts
│   │   └── useRefreshControl.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── shadows.ts
│   │   └── index.ts
│   └── animations/
│       ├── fade.ts
│       ├── slide.ts
│       └── spring.ts
│
├── navigation/                        # Navigation configuration
│   ├── RootNavigator.tsx             # Top-level navigator
│   ├── AuthNavigator.tsx             # Auth stack (login, register, forgot)
│   ├── MainNavigator.tsx             # Bottom tab navigator
│   ├── TransactionNavigator.tsx      # Transaction stack
│   ├── ChatNavigator.tsx             # Chat stack
│   ├── types.ts                      # Route param types
│   └── linking.ts                    # Deep link configuration
│
├── App.tsx                            # Root component
└── index.ts                           # Entry point

supabase/                              # Supabase project (outside src/)
├── migrations/                        # Database migrations (versioned)
│   ├── 00001_create_users.sql
│   ├── 00002_create_categories.sql
│   ├── 00003_create_transactions.sql
│   ├── 00004_create_chat_tables.sql
│   ├── 00005_create_embeddings.sql
│   ├── 00006_create_ai_cache.sql
│   ├── 00007_enable_rls.sql
│   └── 00008_create_indexes.sql
├── functions/                         # Edge Functions
│   ├── chat/
│   │   └── index.ts                  # SSE streaming chat endpoint
│   ├── embed/
│   │   └── index.ts                  # Transaction embedding endpoint
│   ├── classify/
│   │   └── index.ts                  # Query classification endpoint
│   └── _shared/                      # Shared Edge Function utilities
│       ├── cors.ts
│       ├── auth.ts
│       ├── llm-client.ts
│       ├── embedding-client.ts
│       └── rate-limiter.ts
├── seed.sql                           # Seed data for development
└── config.toml                        # Supabase local config
```

### Structure Rationale

| Decision | Reasoning |
|----------|-----------|
| `core/` separate from `shared/` | `core/` = infrastructure (DI, networking, storage). `shared/` = reusable UI components. Different audiences: core is for data/domain, shared is for presentation |
| Feature-first over layer-first | Feature-first keeps related code together. Finding all transaction-related code is one directory, not scattered across `screens/`, `hooks/`, `services/` |
| `domain/services/` in ai_chat | Query classification and context building are domain-level abstractions with multiple possible implementations |
| `supabase/` at project root | Supabase CLI expects this structure. Edge Functions deploy from here. Migrations run from here |
| Barrel exports (`index.ts`) per feature | Controls the public API of each feature. Internal implementation details stay private |

---

## 6. Feature Modules

### 6.1 Auth Feature

| Layer | Contents | Responsibilities |
|-------|----------|-----------------|
| **Presentation** | LoginScreen, RegisterScreen, ForgotPasswordScreen, AuthForm, useAuth, useAuthForm | Render auth forms, handle input validation (Zod + React Hook Form), display errors, navigate on success |
| **Domain** | User entity, IAuthRepository, LoginUseCase, RegisterUseCase, LogoutUseCase | Define User shape, auth repository contract, orchestrate auth operations with validation |
| **Data** | SupabaseAuthRepository, AuthDTO, UserMapper | Call Supabase GoTrue methods, map auth responses to User entities, handle token storage |

**Dependencies**: `core/network` (Supabase client), `core/storage` (secure token storage)

### 6.2 Transactions Feature

| Layer | Contents | Responsibilities |
|-------|----------|-----------------|
| **Presentation** | TransactionListScreen, AddTransactionScreen, TransactionDetailScreen, TransactionCard, TransactionForm, CategoryPicker, useTransactions, useTransactionForm | Render transaction list (virtualized), forms with validation, filters, handle CRUD interactions |
| **Domain** | Transaction, Category, Money (value object), TransactionType, ITransactionRepository, ICategoryRepository, CreateTransaction/Update/Delete/Get use cases | Business rules (e.g., amount must be positive, date cannot be future), entity definitions, repository contracts |
| **Data** | SupabaseTransactionRepository, SupabaseCategoryRepository, TransactionDTO, CategoryDTO, mappers | Execute Supabase queries with filters/pagination, map DTOs to entities, handle optimistic update rollbacks |

**Dependencies**: `core/network`, triggers `ai_chat` embedding flow (via event/callback, not direct import)

### 6.3 AI Chat Feature

| Layer | Contents | Responsibilities |
|-------|----------|-----------------|
| **Presentation** | ChatScreen, ChatSessionListScreen, ChatBubble, ChatInput, StreamingText, SourceTransactionCard, SuggestedQuestions, useChatStream, useChatSessions | Render chat interface, stream tokens to UI, display source transactions, manage sessions |
| **Domain** | ChatSession, ChatMessage, AIResponse, IChatRepository, IAIServiceRepository, IQueryClassifier, IContextBuilder, SendMessage/CreateSession/GetSessions/SearchTransactions use cases | Chat session lifecycle, message ordering, query classification logic, context construction rules, token budget management |
| **Data** | SupabaseChatRepository, EdgeFunctionAIServiceRepository, SSEStreamParser, StreamTokenizer, DTOs, mappers | Persist chat sessions/messages to Supabase, call Edge Functions for AI responses, parse SSE streams, handle streaming errors |

**Dependencies**: `core/network` (Supabase client + SSE client), `transactions/domain` (Transaction entity for source display)

### 6.4 Analytics Feature

| Layer | Contents | Responsibilities |
|-------|----------|-----------------|
| **Presentation** | AnalyticsDashboardScreen, SpendingChart, CategoryBreakdown, TrendChart, SummaryCard, DateRangePicker, useAnalytics, useChartData | Render charts and summaries, handle date range selection, transform data for charting library |
| **Domain** | SpendingSummary, CategorySummary, IAnalyticsRepository, GetMonthlySummary/GetCategoryBreakdown use cases | Define analytics entity shapes, repository contract for aggregated data |
| **Data** | SupabaseAnalyticsRepository, AnalyticsMapper | Call Supabase RPC functions for server-side aggregations, map results to domain entities |

**Dependencies**: `core/network`, depends on `transactions/domain` entities for type consistency

### 6.5 Profile Feature

| Layer | Contents | Responsibilities |
|-------|----------|-----------------|
| **Presentation** | ProfileScreen, SettingsScreen, ProfileHeader, CurrencySelector, useProfile, useSettings | Render profile info, settings toggles (theme, currency, timezone), account deletion confirmation |
| **Domain** | UserProfile, IProfileRepository, UpdateProfile/DeleteAccount use cases | Profile entity, repository contract, account deletion orchestration (cascade) |
| **Data** | SupabaseProfileRepository, ProfileMapper | CRUD on user profile table, handle cascading deletes via Supabase RPC |

**Dependencies**: `core/network`, `core/storage` (preferences)

---

## 7. State Management Strategy

### Two-Store Architecture

The app uses a **dual state management** approach, each tool optimized for its category of state:

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION STATE                        │
│                                                             │
│  ┌───────────────────────┐  ┌─────────────────────────────┐│
│  │    ZUSTAND STORES     │  │    REACT QUERY CACHE        ││
│  │   (Client State)      │  │   (Server State)            ││
│  │                       │  │                             ││
│  │  • Auth status        │  │  • Transaction list          ││
│  │  • Active session ID  │  │  • Transaction detail        ││
│  │  • UI preferences     │  │  • Category list             ││
│  │  • Theme mode         │  │  • Chat sessions             ││
│  │  • Filter selections  │  │  • Chat messages             ││
│  │  • Modal visibility   │  │  • Analytics data            ││
│  │  • Offline queue      │  │  • User profile              ││
│  │  • Streaming state    │  │                             ││
│  │  • Draft form data    │  │  Features:                   ││
│  │                       │  │  • Automatic caching         ││
│  │  Features:            │  │  • Background refetch        ││
│  │  • Synchronous        │  │  • Optimistic updates        ││
│  │  • Persist middleware │  │  • Infinite query (pagination)││
│  │  • Slice pattern      │  │  • Mutation + invalidation   ││
│  └───────────────────────┘  └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Zustand Store Slices

| Store | Purpose | Persisted? |
|-------|---------|------------|
| `authStore` | Auth state (isAuthenticated, userId, token metadata) | Yes (secure storage) |
| `uiStore` | Theme preference, active tab, modal states | Yes (AsyncStorage) |
| `chatStore` | Active session ID, streaming state, draft message | No (ephemeral) |
| `filterStore` | Active transaction filters, date range, sort order | Yes (AsyncStorage) |
| `offlineStore` | Queued mutations for offline sync | Yes (AsyncStorage) |

### React Query Key Strategy

```
Query Key Structure: [feature, entity, ...params]

Examples:
  ['transactions', 'list', { userId, filters }]
  ['transactions', 'detail', transactionId]
  ['transactions', 'categories']
  ['chat', 'sessions', userId]
  ['chat', 'messages', sessionId]
  ['analytics', 'monthly', { month, year }]
  ['analytics', 'categories', { dateRange }]
  ['profile', userId]
```

### Invalidation Strategy

| Mutation | Invalidates |
|----------|-------------|
| Create Transaction | `['transactions', 'list']`, `['analytics']` |
| Update Transaction | `['transactions', 'list']`, `['transactions', 'detail', id]`, `['analytics']` |
| Delete Transaction | `['transactions', 'list']`, `['analytics']` |
| Send Chat Message | `['chat', 'messages', sessionId]` |
| Create Chat Session | `['chat', 'sessions']` |
| Update Profile | `['profile']` |

---

## 8. Navigation Strategy

### Navigator Hierarchy

```
RootNavigator (Stack)
├── AuthNavigator (Stack)              — Unauthenticated users
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── ForgotPasswordScreen
│
└── MainNavigator (Bottom Tabs)        — Authenticated users
    ├── Tab: Home
    │   └── TransactionNavigator (Stack)
    │       ├── TransactionListScreen
    │       ├── TransactionDetailScreen
    │       └── AddTransactionScreen (Modal)
    │
    ├── Tab: AI Chat
    │   └── ChatNavigator (Stack)
    │       ├── ChatSessionListScreen
    │       └── ChatScreen
    │
    ├── Tab: Analytics
    │   └── AnalyticsDashboardScreen
    │
    └── Tab: Profile
        ├── ProfileScreen
        └── SettingsScreen
```

### Navigation Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Auth vs. Main split | Conditional root rendering | No auth screens in back stack after login. Clean separation |
| Add Transaction as Modal | `presentation: 'modal'` | Quick add without losing list context. Swipe down to dismiss |
| Bottom Tabs for main sections | 4 tabs (Home, Chat, Analytics, Profile) | ≤ 5 tabs is the iOS/Android best practice. Direct access to all primary features |
| Deep linking support | Configured but not active for MVP | Architecture-ready for push notification navigation and URL sharing |

### Type-Safe Navigation

All route params are typed via a central `NavigationParamList` type:

```
type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

type TransactionStackParamList = {
  TransactionList: undefined;
  TransactionDetail: { transactionId: string };
  AddTransaction: { editId?: string }; // Optional: editing mode
};

type ChatStackParamList = {
  ChatSessionList: undefined;
  Chat: { sessionId: string };
};
```

---

## 9. Data Flow

### 9.1 Read Flow (Transaction List)

```
User opens TransactionListScreen
  → useTransactions() hook fires
    → React Query checks cache
      → MISS: calls getTransactionsUseCase.execute(filters)
        → use case calls ITransactionRepository.getAll(userId, filters)
          → SupabaseTransactionRepository queries Supabase PostgREST
            → SQL: SELECT * FROM transactions WHERE user_id = $1 AND ... ORDER BY ... LIMIT ...
              → PostgreSQL executes with RLS enforcing user_id match
                → Returns rows
              → Repository maps TransactionDTO[] → Transaction[]
            → Use case returns Transaction[]
          → React Query caches with key ['transactions', 'list', { filters }]
        → Hook returns { data, isLoading, error }
      → HIT: returns cached data immediately
    → Screen renders transaction list via FlatList/FlashList
```

### 9.2 Write Flow (Create Transaction)

```
User fills TransactionForm and taps "Save"
  → useTransactionForm() validates via Zod schema
    → VALID: calls createTransactionMutation.mutate(data)
      → React Query applies optimistic update to ['transactions', 'list'] cache
        → UI immediately shows new transaction in list
      → Calls createTransactionUseCase.execute(data)
        → Use case validates business rules (amount > 0, valid category, etc.)
          → Calls ITransactionRepository.create(dto)
            → SupabaseTransactionRepository INSERTs via Supabase
              → PostgreSQL inserts row, RLS validates user_id
                → Returns created row
              → Repository maps to Transaction entity
            → Use case returns Transaction
          → React Query invalidates ['transactions', 'list'], ['analytics']
        → On error: React Query rolls back optimistic update
    → INVALID: displays validation errors inline
```

### 9.3 AI Query Flow (Full RAG Pipeline)

```
User types "How much did I spend on food this month?" and sends
  → useChatStream() hook fires
    → Save user message to chat_messages (Supabase)
    → Call Edge Function /chat via SSE connection
      → Edge Function receives { message, sessionId, userId }
        → Step 1: CLASSIFY QUERY
          → Call /classify or inline classification
          → Determine: intent=aggregation, category=food, timeRange=currentMonth
        → Step 2: RETRIEVE CONTEXT
          → Generate embedding of user query (Embedding API)
          → Execute hybrid search:
            → SQL filter: user_id = $1 AND date >= startOfMonth AND date <= now
            → Vector similarity: ORDER BY embedding <=> query_embedding LIMIT 20
          → Retrieve top-K relevant transactions
        → Step 3: CONSTRUCT PROMPT
          → System prompt + conversation history (last N messages)
          → Inject retrieved transactions as structured context
          → Add user query
          → Ensure total tokens < context window limit
        → Step 4: GENERATE RESPONSE (STREAMING)
          → Call LLM API with stream=true
          → For each token chunk:
            → Write to SSE: `data: {"token": "You", "done": false}\n\n`
          → On completion:
            → Write: `data: {"token": "", "done": true, "sources": [...]}\n\n`
      → Client SSEStreamParser receives chunks
        → Updates chatStore.streamingText incrementally
        → StreamingText component re-renders with each token
      → On stream end:
        → Save assistant message to chat_messages (Supabase)
        → Display source transactions
        → Clear streaming state
```

---

## 10. Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Mobile   │         │ Supabase │         │  GoTrue  │         │ Postgres │
│  Client   │         │  Client  │         │  (Auth)  │         │          │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                     │                    │                    │
     │  1. signUp(email,   │                    │                    │
     │     password)       │                    │                    │
     │────────────────────>│  2. POST /auth/    │                    │
     │                     │     v1/signup      │                    │
     │                     │───────────────────>│  3. Hash password  │
     │                     │                    │     Create user     │
     │                     │                    │───────────────────>│
     │                     │                    │     INSERT INTO     │
     │                     │                    │     auth.users      │
     │                     │                    │<───────────────────│
     │                     │  4. Return JWT     │                    │
     │                     │     + refresh      │                    │
     │                     │<───────────────────│                    │
     │  5. Store tokens    │                    │                    │
     │     securely        │                    │                    │
     │<────────────────────│                    │                    │
     │                     │                    │                    │
     │  6. Update authStore│                    │                    │
     │     (Zustand)       │                    │                    │
     │                     │                    │                    │
     │  7. Navigate to     │                    │                    │
     │     MainNavigator   │                    │                    │
     │                     │                    │                    │

Token Refresh Flow:
     │                     │                    │                    │
     │  8. API call with   │                    │                    │
     │     expired token   │                    │                    │
     │────────────────────>│  9. 401 response   │                    │
     │                     │<───────────────────│                    │
     │                     │ 10. Auto-refresh   │                    │
     │                     │     with refresh   │                    │
     │                     │     token          │                    │
     │                     │───────────────────>│ 11. Validate       │
     │                     │                    │     Issue new JWT   │
     │                     │<───────────────────│                    │
     │                     │ 12. Retry original │                    │
     │                     │     request        │                    │
     │                     │───────────────────>│                    │
```

### Token Storage Strategy

| Token | Storage | Reasoning |
|-------|---------|-----------|
| Access Token (JWT) | Secure Storage (Keychain/Keystore) | Short-lived (1 hour default). Must be protected from extraction |
| Refresh Token | Secure Storage (Keychain/Keystore) | Long-lived. If compromised, attacker gets persistent access |
| User ID | Zustand store (memory) | Derived from JWT. Not sensitive alone. Needed for quick access |

### Session Management

- Supabase client automatically handles token refresh on API calls.
- `onAuthStateChange` listener updates Zustand auth store.
- On app foreground: verify session validity, refresh if needed.
- On logout: clear all stores, purge React Query cache, clear secure storage.

---

## 11. AI Chat Flow

### Message Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI CHAT MESSAGE FLOW                          │
│                                                                 │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐     │
│  │ USER │    │CLASSI│    │RETRIE│    │GENERA│    │DISPLA│     │
│  │INPUT │───>│ FY   │───>│ VE   │───>│ TE   │───>│ Y    │     │
│  │      │    │QUERY │    │CONTEX│    │RESPON│    │ANSWER│     │
│  └──────┘    └──────┘    └──────┘    └──────┘    └──────┘     │
│                                                                 │
│  User types   Determine   Embed query   Stream    Render        │
│  question     intent,     + pgvector    LLM      tokens        │
│               entities,   hybrid        response  + show        │
│               time range  search        via SSE   sources       │
└─────────────────────────────────────────────────────────────────┘
```

### Query Classification (Step 1)

The query classifier determines how to handle the user's question:

| Query Type | Example | Handling Strategy |
|-----------|---------|-------------------|
| **Aggregation** | "How much on food this month?" | SQL aggregation via RPC + LLM formatting |
| **Listing** | "Show my largest expenses" | SQL query + LLM summarization |
| **Semantic** | "What subscriptions am I paying for?" | Vector similarity search + LLM answer |
| **Comparison** | "Did I spend more in May or June?" | Dual SQL aggregation + LLM comparison |
| **General** | "What should I cut back on?" | Vector search for context + LLM analysis |
| **Clarification** | "What do you mean?" | Conversation history only, no retrieval |

**Trade-off**: Classification adds latency (~200ms) but dramatically improves answer quality by routing to the optimal retrieval strategy.

### Context Window Budget

```
Total Context Window: ~128,000 tokens (gpt-4o-mini)
Practical Limit:      ~16,000 tokens (cost/quality balance)

Allocation:
┌────────────────────────────────────────────┐
│ System Prompt                    ~500 tokens│
│ Conversation History (last 10)  ~3,000 tokens│
│ Retrieved Transactions (top 20) ~4,000 tokens│
│ User Query                       ~100 tokens│
│ Response Budget (max_tokens)    ~2,000 tokens│
│ Safety Buffer                    ~400 tokens│
├────────────────────────────────────────────┤
│ TOTAL                          ~10,000 tokens│
└────────────────────────────────────────────┘
```

---

## 12. Embedding Flow

### Transaction → Embedding Pipeline

```
Transaction Created/Updated
        │
        ▼
┌─────────────────────────┐
│ 1. Build Embedding Text │
│                         │
│ Template:               │
│ "{type} {amount}        │
│  {currency} on          │
│  {description} in       │
│  category {category}    │
│  on {date} {tags}"      │
│                         │
│ Example:                │
│ "Expense 45.00 USD on   │
│  Uber Eats delivery in  │
│  category Food on       │
│  2025-03-15 #delivery   │
│  #dinner"               │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 2. Call Embedding API   │
│                         │
│ POST /v1/embeddings     │
│ {                       │
│   model: "text-         │
│   embedding-3-small",   │
│   input: text           │
│ }                       │
│                         │
│ Returns: float[1536]    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 3. Store in pgvector    │
│                         │
│ INSERT INTO             │
│ transaction_embeddings  │
│ (transaction_id,        │
│  user_id,               │
│  embedding,             │
│  embedding_text,        │
│  model_version)         │
│ VALUES ($1, $2,         │
│  $3::vector, $4, $5)    │
└─────────────────────────┘
```

### Embedding Strategy Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| When to embed | Async after transaction create/update | Don't block the write path. User sees transaction immediately |
| What to embed | Concatenated natural language string | Richer semantic representation than separate field embeddings |
| Model | `text-embedding-3-small` (1536 dims) | Best cost/performance ratio. $0.02/1M tokens. Sufficient for transaction descriptions |
| Batch vs. single | Single embed per transaction, batch on import | Optimize for the common case (single add). Batch for migration/import |
| Update strategy | Delete old embedding, create new on transaction update | Simpler than in-place update. Embedding is immutable once generated |
| Storage | Separate `transaction_embeddings` table | Decouples embedding lifecycle from transaction lifecycle. Allows re-embedding without modifying transactions |

---

## 13. Semantic Search Flow

### Hybrid Search Pipeline

```
User Query: "How much did I spend on Uber recently?"
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Parse Query Metadata                             │
│                                                          │
│ Extract:                                                 │
│   • Time reference: "recently" → last 30 days            │
│   • Named entity: "Uber" (merchant/description keyword)  │
│   • Intent: aggregation (sum)                            │
│   • Category: inferred (Transport? Food? Both?)          │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 2: Generate Query Embedding                         │
│                                                          │
│ Input: "spending on Uber recently"                       │
│ Output: float[1536] vector                               │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 3: Hybrid Search (SQL + Vector)                     │
│                                                          │
│ SELECT t.*, te.embedding <=> $query_embedding AS distance│
│ FROM transactions t                                      │
│ JOIN transaction_embeddings te                           │
│   ON t.id = te.transaction_id                            │
│ WHERE t.user_id = $user_id                               │
│   AND t.created_at >= NOW() - INTERVAL '30 days'         │
│   AND t.is_deleted = false                               │
│ ORDER BY distance ASC                                    │
│ LIMIT 20;                                                │
│                                                          │
│ Hybrid approach:                                         │
│   SQL WHERE clause handles: user_id, date range, soft-del│
│   Vector ORDER BY handles: semantic relevance            │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ STEP 4: Post-Processing                                  │
│                                                          │
│ • Remove duplicates                                      │
│ • Apply relevance threshold (distance < 0.8)             │
│ • Sort by date (secondary sort)                          │
│ • Truncate to fit context window budget                   │
│ • Format as structured text for LLM prompt               │
└──────────────────────────────────────────────────────────┘
```

### pgvector Index Strategy

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| Index type | HNSW | Better recall than IVFFlat for datasets < 1M vectors. No need to rebuild on insert |
| Distance metric | Cosine (`<=>`) | Standard for normalized text embeddings. OpenAI embeddings are normalized |
| `m` (connections) | 16 (default) | Good balance of speed and recall for medium-sized datasets |
| `ef_construction` | 64 (default) | Higher values improve recall at cost of build time |
| Partitioning | By `user_id` | Each user's embeddings are independent. Partition pruning speeds up per-user queries |

**Scaling consideration**: At <100K vectors per user and <10K users, a single HNSW index with `user_id` filter is sufficient. Beyond that, consider partitioned indexes or a dedicated vector database.

---

## 14. Streaming Response Flow

### SSE (Server-Sent Events) Architecture

```
┌──────────┐                    ┌──────────────┐                ┌──────────┐
│  React   │                    │    Edge      │                │   LLM    │
│  Native  │                    │   Function   │                │   API    │
│  Client  │                    │   (/chat)    │                │          │
└────┬─────┘                    └──────┬───────┘                └────┬─────┘
     │                                 │                             │
     │  POST /chat                     │                             │
     │  { message, sessionId }         │                             │
     │  Accept: text/event-stream      │                             │
     │────────────────────────────────>│                             │
     │                                 │                             │
     │                                 │  Classify + Retrieve       │
     │                                 │  (internal processing)      │
     │                                 │                             │
     │                                 │  POST /v1/chat/completions  │
     │                                 │  { stream: true, ... }      │
     │                                 │────────────────────────────>│
     │                                 │                             │
     │  SSE: data: {"token":"Based"}   │  chunk: "Based"            │
     │<────────────────────────────────│<────────────────────────────│
     │                                 │                             │
     │  SSE: data: {"token":" on"}     │  chunk: " on"              │
     │<────────────────────────────────│<────────────────────────────│
     │                                 │                             │
     │  SSE: data: {"token":" your"}   │  chunk: " your"            │
     │<────────────────────────────────│<────────────────────────────│
     │                                 │                             │
     │        ... (N more chunks) ...  │                             │
     │                                 │                             │
     │  SSE: data: {"done":true,       │  chunk: [DONE]             │
     │        "sources":[...],         │                             │
     │        "usage":{...}}           │                             │
     │<────────────────────────────────│<────────────────────────────│
     │                                 │                             │
     │  Connection closes              │                             │
```

### Client-Side Stream Handling

```
SSE Event Received
      │
      ▼
┌─────────────────────────┐
│ Parse JSON from         │
│ "data:" line            │
│                         │
│ Handle special cases:   │
│  • "data: [DONE]"       │
│  • Connection error     │
│  • Timeout              │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Append token to         │
│ chatStore.streamingText │
│                         │
│ Batching strategy:      │
│ Accumulate 3-5 tokens   │
│ before setState to      │
│ reduce re-renders       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ StreamingText component │
│ renders incrementally   │
│                         │
│ • Cursor animation      │
│ • Auto-scroll to bottom │
│ • Markdown rendering    │
│   (progressive)         │
└─────────────────────────┘
```

### Streaming Trade-offs

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| SSE (chosen) | Simple, HTTP-based, works through CDNs/proxies | Unidirectional, no binary | ✅ Best fit for LLM streaming |
| WebSocket | Bidirectional, low overhead | Overkill for this use case, connection management complexity | ❌ |
| Long polling | Maximum compatibility | High latency, more server resources | ❌ |

### React Native SSE Considerations

- React Native does not natively support `EventSource`. Options:
  1. **`react-native-sse`** library (recommended) — lightweight, well-maintained.
  2. **`fetch` with `ReadableStream`** — supported in newer React Native versions (Hermes), but inconsistent across platforms.
  3. **`XMLHttpRequest` with `onprogress`** — works but requires manual SSE parsing.
- **Decision**: Use `react-native-sse` or a polyfill based on `fetch` with ReadableStream, with fallback to `XMLHttpRequest`.

---

## 15. Error Handling Strategy

### Error Type Hierarchy

```
AppError (base)
├── NetworkError
│   ├── TimeoutError
│   ├── OfflineError
│   └── ServerError (5xx)
├── AuthError
│   ├── InvalidCredentialsError
│   ├── TokenExpiredError
│   └── UnauthorizedError
├── ValidationError
│   ├── FormValidationError
│   └── BusinessRuleError
├── AIError
│   ├── StreamingError
│   ├── EmbeddingError
│   ├── RateLimitError
│   └── ContextOverflowError
└── DataError
    ├── NotFoundError
    ├── ConflictError
    └── PermissionDeniedError
```

### Error Handling by Layer

| Layer | Strategy | Example |
|-------|----------|---------|
| **Data** | Catch raw errors, map to typed AppError subclasses | Supabase 23503 → ConflictError; HTTP 429 → RateLimitError |
| **Domain** | Validate business rules, throw BusinessRuleError | Amount ≤ 0 → BusinessRuleError("Amount must be positive") |
| **Presentation** | Display user-friendly messages, offer retry actions | "Unable to load transactions. [Retry]" |
| **Global** | Error boundaries catch uncaught React errors | Fallback UI with "Report Issue" button |

### Error Recovery Patterns

| Scenario | Recovery |
|----------|----------|
| Network timeout on transaction list | Show cached data (React Query staleTime), display banner "Showing cached data" |
| LLM streaming failure mid-response | Show partial response + "Response interrupted. [Retry]" |
| Embedding generation failure | Queue for retry. Transaction is saved without embedding. Background job retries later |
| Auth token expired during chat | Auto-refresh via Supabase client. If refresh fails, redirect to login |
| Rate limit on AI endpoint | Show countdown timer. "You can ask another question in {N} seconds" |

### User-Facing Error Messages

- **Never expose technical details** (stack traces, SQL errors, API keys).
- **Always provide an action** (Retry, Go Back, Contact Support).
- **Tone**: Empathetic, concise. "Something went wrong" → "We couldn't load your transactions. Check your connection and try again."

---

## 16. Offline Strategy

### Approach: Online-First with Offline Write Queue

```
┌───────────────────────────────────────────────────────────┐
│                    OFFLINE STRATEGY                        │
│                                                           │
│  ┌─────────────────────────────┐  ┌────────────────────┐ │
│  │  READS (View Data)          │  │ WRITES (Mutations)  │ │
│  │                             │  │                     │ │
│  │  • React Query cache        │  │ • Offline queue     │ │
│  │    serves stale data        │  │   (Zustand persist) │ │
│  │  • staleTime: 5 minutes     │  │ • Queue mutations   │ │
│  │  • gcTime: 30 minutes       │  │   when offline      │ │
│  │  • Show "offline" banner    │  │ • Auto-sync when    │ │
│  │  • Disable refresh actions  │  │   online returns    │ │
│  │                             │  │ • Conflict resolve: │ │
│  │  AI Chat: UNAVAILABLE       │  │   last-write-wins   │ │
│  │  (requires network)         │  │                     │ │
│  └─────────────────────────────┘  └────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### What Works Offline

| Feature | Offline Capability |
|---------|--------------------|
| View transaction list | ✅ Cached data available |
| View transaction detail | ✅ If previously loaded |
| Add transaction | ✅ Queued, synced later |
| Edit transaction | ✅ Queued, synced later |
| Delete transaction | ✅ Queued, synced later |
| AI Chat | ❌ Requires network (LLM API) |
| Analytics | ✅ Cached data (may be stale) |
| Profile | ✅ Cached data |

### Offline Queue Design

```
Queue Entry = {
  id: uuid,
  type: 'CREATE' | 'UPDATE' | 'DELETE',
  entity: 'transaction',
  payload: { ... },
  createdAt: timestamp,
  retryCount: 0,
  status: 'PENDING' | 'SYNCING' | 'FAILED'
}

Sync Flow:
1. Network status changes to ONLINE
2. Read all PENDING queue entries, ordered by createdAt
3. For each entry:
   a. Set status = SYNCING
   b. Execute mutation against Supabase
   c. On success: remove from queue, invalidate React Query cache
   d. On failure: increment retryCount, set status = FAILED if retryCount > 3
4. Show sync status to user: "Syncing 3 transactions..."
```

### Trade-offs

| Approach Considered | Decision | Reasoning |
|-------|--------|-----------|
| Full offline-first (local SQLite + sync) | ❌ Rejected | Over-engineering for MVP. Adds conflict resolution complexity. Transaction data is not collaborative |
| Online-only (no offline) | ❌ Rejected | Poor mobile UX. Users expect to add transactions anywhere |
| Online-first + write queue (chosen) | ✅ Accepted | Pragmatic balance. Reads from cache, writes queued. Chat requires network anyway |

---

## 17. Security Considerations

### 17.1 Data Protection Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
│                                                             │
│  Layer 1: TRANSPORT        TLS 1.3 (Supabase enforced)     │
│  Layer 2: AUTHENTICATION   JWT via GoTrue + Secure Storage  │
│  Layer 3: AUTHORIZATION    Row Level Security (RLS)         │
│  Layer 4: DATA AT REST     Supabase encryption (AES-256)    │
│  Layer 5: CLIENT STORAGE   Keychain (iOS) / Keystore (AND)  │
│  Layer 6: INPUT VALIDATION Zod schemas (client + server)    │
│  Layer 7: OUTPUT SANITIZE  Sanitize LLM responses for XSS   │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 Row Level Security (RLS) Policies

| Table | Policy | SQL Logic |
|-------|--------|-----------|
| `transactions` | Users can only CRUD their own transactions | `auth.uid() = user_id` |
| `categories` | Users see default categories + their own custom | `is_default = true OR auth.uid() = user_id` |
| `chat_sessions` | Users can only access their own sessions | `auth.uid() = user_id` |
| `chat_messages` | Users can only access messages in their sessions | `EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND user_id = auth.uid())` |
| `transaction_embeddings` | Users can only access embeddings of their transactions | `auth.uid() = user_id` |
| `ai_context_cache` | Users can only access their own cache entries | `auth.uid() = user_id` |

### 17.3 API Key Security

| Key | Storage Location | Never In |
|-----|-----------------|----------|
| Supabase Anon Key | App bundle (public, safe due to RLS) | — |
| Supabase Service Role Key | Edge Function env vars only | Client code, git, logs |
| LLM API Key | Edge Function env vars only | Client code, git, logs |
| Embedding API Key | Edge Function env vars only | Client code, git, logs |

**Critical**: LLM and embedding API keys must **never** be in the React Native bundle. All AI calls go through Edge Functions which hold the keys server-side.

### 17.4 Prompt Injection Prevention

| Vector | Mitigation |
|--------|------------|
| User injects malicious instructions in transaction descriptions | Separate user content from system instructions in prompt. Use delimiters. Sanitize transaction text before embedding |
| User tries to extract system prompt via chat | System prompt instructs model to refuse meta-questions about its instructions |
| User attempts SQL injection via chat | All database queries are parameterized. RLS provides defense-in-depth |

### 17.5 Additional Security Measures

- **Rate Limiting**: Per-user rate limits on AI endpoints (e.g., 20 queries/hour).
- **Audit Logging**: Log all authentication events, data deletions, and AI queries (without PII in log messages).
- **Input Size Limits**: Max transaction description length (500 chars), max chat message length (2000 chars).
- **Session Timeout**: Auto-logout after 30 days of inactivity (configurable).
- **Certificate Pinning**: Pin Supabase TLS certificate in production builds.

---

## 18. Scalability Considerations

### Scaling Vectors

| Dimension | Current Design | Scale Trigger | Scale Strategy |
|-----------|---------------|---------------|----------------|
| **Users** | Single Supabase project | > 10K users | Supabase Pro/Enterprise, connection pooling (PgBouncer) |
| **Transactions** | Single table, user_id index | > 1M rows total | Table partitioning by user_id or date range |
| **Embeddings** | Single HNSW index | > 500K vectors | Partition index by user_id, or migrate to dedicated vector DB (Pinecone, Qdrant) |
| **AI Queries** | Single Edge Function | > 100 req/s | Multiple Edge Function instances (auto-scaled by Supabase), queue-based processing |
| **Chat Sessions** | All messages in one table | > 10M messages | Archive old sessions, time-based partitioning |

### Cost Scaling

| Component | Cost Driver | Optimization |
|-----------|-------------|-------------|
| LLM API | Tokens processed | Shorter context, cheaper models for simple queries, response caching |
| Embedding API | Tokens embedded | Batch embedding, only re-embed on meaningful description changes |
| Supabase | Connections, storage, bandwidth | Connection pooling, storage cleanup, pagination |
| pgvector | Index memory, query CPU | Dimensionality reduction (post-MVP), partial indexes |

---

## 19. Performance Considerations

### Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| App startup (cold) | < 2 seconds | Time to interactive on mid-range device |
| Screen transition | < 300ms | Navigation animation completion |
| Transaction list scroll | 60 FPS | Frame drop monitoring in FlashList |
| Transaction save | < 500ms | Perceived (optimistic update) |
| Chat first token | < 3 seconds | Time from send to first SSE event |
| Chat full response | < 15 seconds | Typical response completion |

### Optimization Techniques

| Area | Technique | Impact |
|------|-----------|--------|
| **List Rendering** | FlashList with `estimatedItemSize` | 5x performance vs. FlatList |
| **Re-renders** | `React.memo`, `useMemo`, `useCallback`, Zustand selectors | Prevent cascade re-renders on state changes |
| **Bundle Size** | Tree shaking, lazy imports, Hermes bytecode | Smaller download, faster parse |
| **Images** | Lazy loading, proper sizing, caching | Reduced memory, faster scroll |
| **Network** | React Query deduplication, request batching | Fewer API calls |
| **Streaming** | Token batching (accumulate 3-5 before setState) | Fewer re-renders during streaming |
| **Database** | Composite indexes, query optimization, pagination | Sub-100ms query times |
| **Embeddings** | Background generation, no UI blocking | Transaction save remains fast |

---

## 20. Database Design

### Entity-Relationship Overview

```
┌──────────┐       ┌──────────────┐       ┌──────────────────────┐
│  users   │       │  categories  │       │  transaction_        │
│          │1─────*│              │       │  embeddings          │
│ id (PK)  │       │ id (PK)      │       │                      │
│ email    │       │ name         │       │ id (PK)              │
│ ...      │       │ user_id (FK) │       │ transaction_id (FK)  │
└────┬─────┘       │ is_default   │       │ user_id (FK)         │
     │             └──────┬───────┘       │ embedding (vector)   │
     │                    │               │ embedding_text       │
     │1                   │               │ model_version        │
     │                    │               └──────────┬───────────┘
     │                    │                          │
     *                    │                          │1
┌────┴─────┐              │               ┌──────────┴───────────┐
│transact- │*────────────1│               │                      │
│  ions    │                              │                      │
│          │                              │                      │
│ id (PK)  │──────────────────────────────│   (1:1 via           │
│ user_id  │                              │    transaction_id)   │
│ category │                              │                      │
│ amount   │                              └──────────────────────┘
│ ...      │
└────┬─────┘
     │
     │(user_id)
     │
     │1
┌────┴──────────┐       ┌────────────────┐
│ chat_sessions │       │ chat_messages  │
│               │1─────*│                │
│ id (PK)       │       │ id (PK)        │
│ user_id (FK)  │       │ session_id (FK)│
│ title         │       │ role           │
│ ...           │       │ content        │
│               │       │ ...            │
└───────────────┘       └────────────────┘

┌──────────────────┐
│ ai_context_cache │
│                  │
│ id (PK)          │
│ user_id (FK)     │
│ query_hash       │
│ context          │
│ response         │
│ expires_at       │
└──────────────────┘
```

---

### 20.1 Users Table

**Purpose**: Extends Supabase's `auth.users` with application-specific profile data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, FK → auth.users.id | Matches Supabase auth user ID |
| `email` | TEXT | NOT NULL, UNIQUE | User's email address |
| `display_name` | TEXT | | User's display name |
| `default_currency` | CHAR(3) | NOT NULL, DEFAULT 'USD' | ISO 4217 currency code |
| `timezone` | TEXT | NOT NULL, DEFAULT 'UTC' | IANA timezone identifier |
| `avatar_url` | TEXT | | Profile image URL |
| `onboarding_completed` | BOOLEAN | DEFAULT false | Track onboarding status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last profile update |

**Relationships**: One-to-many with transactions, categories, chat_sessions, transaction_embeddings, ai_context_cache.

**Indexes**:
- `PK on id` (automatic)
- `UNIQUE on email` (automatic from constraint)

**Security**:
- RLS: `auth.uid() = id` for all operations.
- Cascading delete on account removal must clean up all related data.
- `email` should not be exposed in any public-facing API response.

---

### 20.2 Transactions Table

**Purpose**: Core financial data — every income and expense event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique transaction identifier |
| `user_id` | UUID | NOT NULL, FK → users.id, ON DELETE CASCADE | Owning user |
| `category_id` | UUID | FK → categories.id, ON DELETE SET NULL | Transaction category |
| `type` | TEXT | NOT NULL, CHECK IN ('income', 'expense') | Transaction direction |
| `amount` | NUMERIC(12,2) | NOT NULL, CHECK > 0 | Absolute amount (always positive) |
| `currency_code` | CHAR(3) | NOT NULL, DEFAULT 'USD' | ISO 4217 currency code |
| `description` | TEXT | NOT NULL | Merchant/description text |
| `notes` | TEXT | | Optional detailed notes |
| `tags` | TEXT[] | DEFAULT '{}' | Array of user-defined tags |
| `transaction_date` | DATE | NOT NULL | Date of transaction |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT false | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | | When soft-deleted |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification |

**Relationships**:
- Many-to-one with users (user_id).
- Many-to-one with categories (category_id).
- One-to-one with transaction_embeddings.

**Indexes**:
- `idx_transactions_user_date` — COMPOSITE on `(user_id, transaction_date DESC)` — Primary query pattern.
- `idx_transactions_user_category` — COMPOSITE on `(user_id, category_id)` — Category filtering.
- `idx_transactions_user_type` — COMPOSITE on `(user_id, type)` — Income vs. expense filtering.
- `idx_transactions_user_not_deleted` — PARTIAL on `(user_id) WHERE is_deleted = false` — Most queries exclude deleted records.
- `idx_transactions_description_trgm` — GIN trigram index on `description` — For text search/autocomplete.

**Security**:
- RLS: `auth.uid() = user_id` for all operations.
- `amount` stored as NUMERIC, never FLOAT, to prevent rounding errors.
- Soft delete preserves audit trail. Hard delete only via account deletion cascade.

**Design Decisions**:
- `amount` is always positive; `type` field indicates direction. This simplifies aggregation queries (`SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)`).
- `currency_code` per transaction (not just per user) future-proofs for multi-currency.
- `tags` as TEXT[] enables flexible categorization beyond the single category. Indexed via GIN for `@>` containment queries.

---

### 20.3 Categories Table

**Purpose**: Transaction categorization with system defaults and user customization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique category identifier |
| `user_id` | UUID | FK → users.id, ON DELETE CASCADE, NULLABLE | NULL for system defaults |
| `name` | TEXT | NOT NULL | Category display name |
| `icon` | TEXT | NOT NULL, DEFAULT 'default' | Icon identifier (emoji or icon name) |
| `color` | TEXT | NOT NULL, DEFAULT '#6B7280' | Hex color code |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | System-provided category flag |
| `sort_order` | INTEGER | DEFAULT 0 | Display order |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Relationships**: One-to-many with transactions.

**Indexes**:
- `idx_categories_user` — on `(user_id)` — Fetch user's custom categories.
- `idx_categories_default` — PARTIAL on `(id) WHERE is_default = true` — Fetch system defaults.
- `UNIQUE on (user_id, name)` — Prevent duplicate category names per user.

**Security**:
- RLS: `is_default = true OR auth.uid() = user_id` for SELECT.
- Only `user_id = auth.uid()` for INSERT/UPDATE/DELETE (can't modify system defaults).

**Design Decisions**:
- System defaults have `user_id = NULL` and `is_default = true`.
- Users can create custom categories but cannot modify system defaults.
- `ON DELETE SET NULL` on transactions.category_id preserves transaction data when a category is deleted.

---

### 20.4 Chat Sessions Table

**Purpose**: Group related chat messages into conversations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique session identifier |
| `user_id` | UUID | NOT NULL, FK → users.id, ON DELETE CASCADE | Owning user |
| `title` | TEXT | DEFAULT 'New Chat' | Session title (auto-generated or user-set) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether session is active |
| `message_count` | INTEGER | NOT NULL, DEFAULT 0 | Denormalized message count |
| `last_message_at` | TIMESTAMPTZ | | Timestamp of latest message |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Session creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update |

**Relationships**: One-to-many with chat_messages.

**Indexes**:
- `idx_chat_sessions_user_recent` — COMPOSITE on `(user_id, last_message_at DESC)` — Session list ordered by recency.
- `idx_chat_sessions_user_active` — PARTIAL on `(user_id) WHERE is_active = true` — Active sessions only.

**Security**:
- RLS: `auth.uid() = user_id` for all operations.

**Design Decisions**:
- `message_count` is denormalized for efficient session list display (avoids COUNT query per session).
- Updated via trigger on chat_messages INSERT.
- `title` auto-generated after first AI response using a lightweight LLM call (summarize first Q&A exchange). Cost: ~50 tokens per session creation.

---

### 20.5 Chat Messages Table

**Purpose**: Individual messages within a chat session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique message identifier |
| `session_id` | UUID | NOT NULL, FK → chat_sessions.id, ON DELETE CASCADE | Parent session |
| `role` | TEXT | NOT NULL, CHECK IN ('user', 'assistant', 'system') | Message sender role |
| `content` | TEXT | NOT NULL | Message text content |
| `source_transaction_ids` | UUID[] | DEFAULT '{}' | Transaction IDs cited in response |
| `token_count` | INTEGER | | Tokens used for this message |
| `model_used` | TEXT | | LLM model identifier |
| `latency_ms` | INTEGER | | Response generation time |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Message timestamp |

**Relationships**: Many-to-one with chat_sessions.

**Indexes**:
- `idx_chat_messages_session_order` — COMPOSITE on `(session_id, created_at ASC)` — Chronological message retrieval.
- `idx_chat_messages_session_id` — on `(session_id)` — FK lookup.

**Security**:
- RLS: via join to chat_sessions (`EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND user_id = auth.uid())`).
- `content` may contain sensitive financial information — same data protection as transactions.

**Design Decisions**:
- `source_transaction_ids` as UUID[] enables "show source transactions" feature without a join table.
- `token_count`, `model_used`, `latency_ms` enable cost tracking and performance monitoring.
- `role = 'system'` messages store system prompts/context for reproducibility (optional, can be omitted to save storage).

---

### 20.6 Transaction Embeddings Table

**Purpose**: Store vector embeddings of transactions for semantic search.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique embedding identifier |
| `transaction_id` | UUID | NOT NULL, FK → transactions.id, ON DELETE CASCADE, UNIQUE | Source transaction |
| `user_id` | UUID | NOT NULL, FK → users.id, ON DELETE CASCADE | Owning user (denormalized for RLS) |
| `embedding` | VECTOR(1536) | NOT NULL | Embedding vector |
| `embedding_text` | TEXT | NOT NULL | The text that was embedded (for debugging/re-embedding) |
| `model_version` | TEXT | NOT NULL | Embedding model identifier |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Embedding creation |

**Relationships**: One-to-one with transactions (via UNIQUE on transaction_id).

**Indexes**:
- `idx_embeddings_hnsw` — HNSW on `embedding vector_cosine_ops` — Similarity search.
- `idx_embeddings_user` — on `(user_id)` — Filter embeddings by user before vector search.
- `idx_embeddings_transaction` — UNIQUE on `(transaction_id)` — Lookup/replace on update.

**Security**:
- RLS: `auth.uid() = user_id` for all operations.
- `user_id` is denormalized (could be derived from transaction → user_id join) to enable efficient RLS without join.

**Design Decisions**:
- **Separate table** (not a column on transactions): Embedding lifecycle differs from transaction lifecycle. Embedding generation is async and may fail. Keeps the transactions table lean.
- `embedding_text` stored for debugging: verify what text produced a given vector. Also enables re-embedding with a new model version without re-computing the text.
- `model_version` enables migration: when switching embedding models, records with old model_version are flagged for re-embedding.
- `VECTOR(1536)` for `text-embedding-3-small`. If model changes, a migration updates the dimension.

---

### 20.7 AI Context Cache Table

**Purpose**: Cache AI query results to reduce LLM API costs for repeated/similar queries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique cache entry identifier |
| `user_id` | UUID | NOT NULL, FK → users.id, ON DELETE CASCADE | Owning user |
| `query_hash` | TEXT | NOT NULL | SHA-256 hash of normalized query + time context |
| `query_text` | TEXT | NOT NULL | Original query text |
| `query_embedding` | VECTOR(1536) | | Query embedding for similarity matching |
| `context_snapshot` | JSONB | NOT NULL | Retrieved transactions at query time |
| `response_text` | TEXT | NOT NULL | Cached LLM response |
| `source_transaction_ids` | UUID[] | DEFAULT '{}' | Transactions cited |
| `hit_count` | INTEGER | NOT NULL, DEFAULT 0 | Number of cache hits |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Cache expiration (invalidated on data change) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Cache entry creation |

**Relationships**: Many-to-one with users.

**Indexes**:
- `idx_ai_cache_lookup` — COMPOSITE on `(user_id, query_hash)` — Exact match lookup.
- `idx_ai_cache_expiry` — on `(expires_at)` — Cleanup expired entries.
- `idx_ai_cache_embedding` — HNSW on `query_embedding` — Semantic similarity cache matching (optional optimization).

**Security**:
- RLS: `auth.uid() = user_id` for all operations.

**Design Decisions**:
- **Exact match** via `query_hash`: identical queries get cached results instantly.
- **Semantic match** via `query_embedding` (optional): similar queries (cosine distance < 0.05) may reuse cached results. Higher cache hit rate but risk of stale/wrong answers.
- **Invalidation**: All cache entries for a user are invalidated when any transaction is created/updated/deleted. This is aggressive but ensures correctness for financial data.
- **TTL**: Default 1 hour, configurable. Short TTL balances freshness vs. cost savings.
- `context_snapshot` stores the transactions that were used — enables cache validity checking against current data.

---

## 21. AI Analysis

### 21.1 Transaction Ingestion Flow

```
1. User submits transaction via TransactionForm
2. Zod schema validates input (client-side)
3. Use case validates business rules
4. Repository INSERTs into transactions table
5. PostgreSQL trigger fires pg_notify('new_transaction', transaction_id)
6. Edge Function listener (or webhook) receives notification
7. Edge Function builds embedding text from transaction fields
8. Edge Function calls Embedding API
9. Edge Function INSERTs into transaction_embeddings
10. Edge Function invalidates user's ai_context_cache
```

**Alternative (Simpler for MVP)**: Skip pg_notify. After client receives create confirmation, make a second API call to `/embed` endpoint. Trade-off: simpler setup, but couples client to embedding lifecycle.

### 21.2 Embedding Generation Flow

See [Section 12: Embedding Flow](#12-embedding-flow) for the detailed pipeline.

**Batch Re-embedding Strategy**:
- When switching embedding models, a batch job re-embeds all transactions.
- Process: Query all transactions WHERE `model_version != current_version` in `transaction_embeddings`, or where no embedding exists.
- Batch size: 100 transactions per API call (if model supports batching).
- Rate limiting: Respect embedding API rate limits (e.g., 3000 RPM for OpenAI).
- Progress tracking: Update `model_version` per record on completion.

### 21.3 pgvector Storage Strategy

See [Section 13: Semantic Search Flow](#13-semantic-search-flow) for index strategy.

**Storage Calculation**:
- 1536 dimensions × 4 bytes/float = 6,144 bytes per vector ≈ 6 KB.
- 10,000 transactions per user × 6 KB = ~60 MB per user.
- 10,000 users × 60 MB = ~600 GB total.
- **Implication**: At scale, vector storage dominates Supabase storage costs. Consider dimensionality reduction (e.g., `text-embedding-3-small` with `dimensions` parameter set to 512) or archiving old embeddings.

### 21.4 Semantic Search Pipeline

See [Section 13](#13-semantic-search-flow) for the full pipeline diagram.

**Key Implementation Detail — RPC Function**:

```sql
-- Example RPC for hybrid search (design only, not implementation)
-- Function: search_transactions_semantic(query_embedding, user_id, date_from, date_to, limit)
-- Returns: transactions with similarity score
-- Strategy: SQL filters first, then vector ranking
```

### 21.5 Context Construction Pipeline

```
Input: Retrieved Transactions (top-K) + Conversation History + User Query

Step 1: FORMAT TRANSACTIONS
  For each transaction, create a structured line:
  "[{date}] {type}: {amount} {currency} — {description} (Category: {category})"

Step 2: ASSEMBLE CONTEXT
  System Prompt:
    "You are a personal finance assistant. Answer based ONLY on the
     provided transaction data. If the data is insufficient, say so.
     Never invent transactions. Cite specific amounts and dates."

  Transaction Context:
    "Here are the user's relevant transactions:\n{formatted_transactions}"

  Conversation History:
    Last N messages from the session (alternating user/assistant)

  User Query:
    Current question

Step 3: TOKEN BUDGET CHECK
  Count total tokens (system + context + history + query)
  If over budget:
    1. Reduce conversation history (remove oldest messages)
    2. Reduce retrieved transactions (remove lowest relevance)
    3. If still over: truncate transaction descriptions

Step 4: OUTPUT
  Assembled prompt ready for LLM API call
```

### 21.6 LLM Streaming Pipeline

See [Section 14: Streaming Response Flow](#14-streaming-response-flow) for the detailed architecture.

### 21.7 Conversation Memory Strategy

| Strategy | Scope | Implementation |
|----------|-------|----------------|
| **Full History** | Short sessions (< 10 messages) | Include all messages in context |
| **Sliding Window** | Medium sessions (10-30 messages) | Keep last 10 messages, oldest trimmed |
| **Summary + Window** | Long sessions (30+ messages) | Summarize older messages, keep last 5 verbatim. Post-MVP |
| **Session Isolation** | Cross-session | Each session is independent. No cross-session memory |

**Decision**: Sliding window of last 10 messages for MVP. Summary strategy in post-MVP.

**Token Budget for History**:
- Average message: 100-300 tokens.
- 10 messages: ~1,500–3,000 tokens.
- This fits within the ~16K practical token budget allocated in Section 11.

### 21.8 Cost Optimization Strategy

| Technique | Savings Estimate | Complexity | Priority |
|-----------|-----------------|------------|----------|
| **Model tiering** — Use gpt-4o-mini for simple queries, gpt-4o for complex | 60-80% | Medium | P0 |
| **Query classification** — Route aggregation queries to SQL instead of LLM | 30-50% on those queries | Medium | P0 |
| **Response caching** — Cache exact and semantically similar queries | 20-40% depending on hit rate | Low | P1 |
| **Context compression** — Shorter transaction format, fewer retrieved results | 10-20% | Low | P1 |
| **Token limits** — Set max_tokens for responses (e.g., 500 for simple queries) | 10-30% | Low | P0 |
| **Embedding batching** — Batch multiple transactions in one API call | 5-10% on embedding costs | Low | P2 |

**Cost Projection** (per 1,000 user queries, using gpt-4o-mini):
- Average input: ~4,000 tokens/query → $0.60/1K queries
- Average output: ~500 tokens/query → $0.30/1K queries
- Embedding per query: ~50 tokens → $0.001/1K queries
- **Total: ~$0.90 per 1,000 queries ≈ $0.0009 per query** ✅ Under $0.01 target

### 21.9 Failure Handling Strategy

| Failure | Detection | Recovery | User Experience |
|---------|-----------|----------|-----------------|
| Embedding API timeout | HTTP 408/504 | Retry 3x with exponential backoff. On persistent failure, mark transaction as "pending embedding" | Transaction saved successfully. "AI search will be available shortly" |
| Embedding API rate limit | HTTP 429 | Read `Retry-After` header. Queue and retry. Batch-mode with backoff | Transparent to user |
| LLM streaming failure (mid-stream) | SSE connection drop, HTTP error | Show partial response. Offer "Continue" or "Retry" button | "Response interrupted. [Continue] [Retry]" |
| LLM rate limit | HTTP 429 | Show cooldown timer. Fallback to cheaper model if available | "Too many questions. Try again in {N}s" |
| LLM content filter | HTTP 400 with filter flag | Log for monitoring. Return generic "I can't answer that" | "I can only help with finance-related questions" |
| pgvector search timeout | Query exceeds timeout | Fall back to keyword search (ILIKE). Log for index tuning | Transparent (slightly less relevant results) |
| Context window overflow | Token count exceeds limit | Progressive truncation: history → transactions → descriptions | Transparent (slightly less context) |
| All AI services down | Multiple failures | Disable chat input. Show maintenance message | "AI assistant is temporarily unavailable. Your transactions are safe" |

---

## 22. Fintech Considerations

### 22.1 Data Privacy

| Principle | Implementation |
|-----------|----------------|
| **Data Minimization** | Collect only what's needed. No bank account numbers, no SSN, no credit card numbers |
| **Purpose Limitation** | Transaction data used only for tracking and AI insights. No third-party sharing |
| **Storage Limitation** | Configurable data retention. Default: indefinite (user controls deletion) |
| **Transparency** | Privacy policy explains: what data is collected, how it's used, who processes it (LLM provider) |

### 22.2 Encryption

| Layer | Type | Detail |
|-------|------|--------|
| In Transit | TLS 1.3 | Enforced by Supabase. No cleartext HTTP |
| At Rest (Server) | AES-256 | Supabase encrypts PostgreSQL storage |
| At Rest (Client) | Platform Keychain/Keystore | Auth tokens, sensitive preferences |
| At Rest (Client, offline data) | SQLCipher or encrypted MMKV | Offline transaction queue |
| Backups | Encrypted | Supabase managed backups are encrypted |

### 22.3 Secure Storage

| Data | Storage Mechanism | Justification |
|------|-------------------|---------------|
| JWT Access Token | iOS Keychain / Android Keystore | Highest security for auth credentials |
| JWT Refresh Token | iOS Keychain / Android Keystore | Long-lived, must be protected |
| User Preferences | AsyncStorage / MMKV (non-sensitive) | Theme, sort order — not sensitive |
| Offline Transaction Queue | Encrypted MMKV | Contains financial data, must be encrypted at rest |
| API Keys | Never on client | All API keys are server-side only (Edge Functions) |

### 22.4 Authentication

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcrypt (handled by Supabase GoTrue) |
| Password Requirements | Min 8 chars, configurable complexity (GoTrue config) |
| Brute Force Protection | Rate limiting on auth endpoints (GoTrue built-in) |
| MFA | Post-MVP: TOTP via GoTrue MFA support |
| Session Management | JWT with 1-hour access token, 1-week refresh token (configurable) |
| Biometric Lock | Post-MVP: FaceID/TouchID to unlock app |

### 22.5 Rate Limiting

| Endpoint | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| Auth (login) | 5 attempts | per 15 minutes | Brute force prevention |
| Auth (register) | 3 attempts | per hour | Spam prevention |
| Transactions (create) | 60 | per minute | Abuse prevention |
| AI Chat | 20 queries | per hour | Cost control |
| Embedding | 100 | per minute | API cost protection |

**Implementation**: Rate limiting in Edge Functions using a token bucket stored in PostgreSQL or Redis (if available). For MVP, simple counter in PostgreSQL with sliding window.

### 22.6 Audit Logging

| Event | Logged Data | Storage |
|-------|-------------|---------|
| User Login | user_id, timestamp, IP (hashed), device type | audit_logs table |
| User Logout | user_id, timestamp | audit_logs table |
| Transaction Delete | user_id, transaction_id, timestamp | Soft delete + audit_logs |
| Account Deletion | user_id, timestamp, data types purged | audit_logs (retained 90 days) |
| AI Query | user_id, query_hash (not query text), timestamp, model, tokens used | chat_messages table |
| Failed Auth | email (hashed), timestamp, failure reason | audit_logs table |

**Important**: Audit logs must NOT contain PII in plaintext. Hash or anonymize sensitive fields.

### 22.7 Financial Data Protection

| Concern | Measure |
|---------|---------|
| Amount Precision | NUMERIC(12,2) — never FLOAT. Prevents 0.1 + 0.2 ≠ 0.3 issues |
| Rounding | ROUND(amount, 2) on all aggregations |
| Negative Prevention | CHECK(amount > 0) constraint. `type` field handles direction |
| Currency Integrity | ISO 4217 codes only. CHECK constraint on valid codes |
| Data Integrity | Foreign keys, NOT NULL constraints, CHECK constraints |
| Backup | Supabase daily automated backups (Pro plan). Point-in-time recovery |

### 22.8 GDPR Considerations

| Right | Implementation |
|-------|----------------|
| **Right to Access** | Export user data endpoint: all transactions, chat history, profile as JSON/CSV |
| **Right to Rectification** | Standard CRUD operations allow users to edit all their data |
| **Right to Erasure** | Account deletion cascades to all user data. Soft-deleted records are purged after 30 days, or immediately on account deletion |
| **Right to Portability** | Data export in machine-readable format (JSON, CSV) |
| **Right to Restrict Processing** | Users can disable AI features (no embedding, no chat) while retaining transaction tracking |
| **Data Processing Agreement** | Required with LLM provider (OpenAI DPA, or equivalent) |
| **Consent** | Clear consent for AI processing of financial data during onboarding |

**LLM Privacy Consideration**: Transaction data is sent to the LLM provider for answer generation. Users must be informed and consent to this. Use API endpoints (not consumer ChatGPT), where data is not used for model training (per OpenAI API data usage policy).

### 22.9 Multi-Currency Support

| Aspect | MVP Approach | Future Enhancement |
|--------|-------------|-------------------|
| Storage | `currency_code` per transaction | No change |
| Display | Format amount with currency symbol | Use `Intl.NumberFormat` with locale |
| Aggregation | Group by currency. No cross-currency sum | Exchange rate API (e.g., Open Exchange Rates) for conversion |
| Default | User sets default currency in profile | Auto-detect from device locale |
| AI Chat | Include currency in transaction context | AI handles multi-currency aggregation with conversion rates |

**Decision**: Store currency per transaction from day one (schema-ready). UI defaults to user's preferred currency. Cross-currency aggregation is post-MVP.

### 22.10 Timezone Handling

| Principle | Implementation |
|-----------|----------------|
| **Store in UTC** | All `TIMESTAMPTZ` columns store UTC. PostgreSQL handles this natively |
| **User Timezone** | Stored in `users.timezone` (IANA format, e.g., "America/New_York") |
| **Display in Local** | Client converts UTC → user's timezone for display |
| **Transaction Date** | `transaction_date` is DATE type (no timezone). Represents the calendar date the user intended |
| **Query Boundaries** | "This month" in AI queries uses user's timezone to determine month start/end |
| **Edge Functions** | Receive user's timezone in request headers or from user profile. Convert temporal references accordingly |

**Why DATE for transaction_date**: A transaction on "March 15" is "March 15" regardless of timezone. The user picked that date. Using TIMESTAMPTZ for the transaction date would cause it to shift across midnight boundaries depending on viewer timezone — confusing for financial records.

---

## 23. Architecture Diagrams

### 23.1 Architecture Diagram (Text Format)

```
╔══════════════════════════════════════════════════════════════════════════╗
║                           SYSTEM ARCHITECTURE                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ┌────────────────────────────────────────────────────────────────────┐  ║
║  │                      REACT NATIVE CLIENT                          │  ║
║  │                                                                    │  ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │  ║
║  │  │   Auth   │ │Transact- │ │ AI Chat  │ │Analytics │ │Profile │ │  ║
║  │  │ Feature  │ │  ions    │ │ Feature  │ │ Feature  │ │Feature │ │  ║
║  │  │          │ │ Feature  │ │          │ │          │ │        │ │  ║
║  │  │ P / D / D│ │ P / D / D│ │ P / D / D│ │ P / D / D│ │P /D /D│ │  ║
║  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘ │  ║
║  │       │             │            │             │            │      │  ║
║  │  ┌────┴─────────────┴────────────┴─────────────┴────────────┴───┐ │  ║
║  │  │              CORE (DI, Network, Storage, Types)              │ │  ║
║  │  └──────────────────────────┬───────────────────────────────────┘ │  ║
║  │  ┌──────────────────────────┴───────────────────────────────────┐ │  ║
║  │  │              SHARED (Components, Theme, Hooks)               │ │  ║
║  │  └──────────────────────────────────────────────────────────────┘ │  ║
║  │  ┌────────────────────────────────────────────────────────────┐   │  ║
║  │  │              NAVIGATION (Root, Auth, Main, Stacks)         │   │  ║
║  │  └────────────────────────────────────────────────────────────┘   │  ║
║  └──────────────────────────────┬─────────────────────────────────────┘  ║
║                                 │                                        ║
║                          HTTPS / SSE                                     ║
║                                 │                                        ║
║  ┌──────────────────────────────┴─────────────────────────────────────┐  ║
║  │                       SUPABASE PLATFORM                            │  ║
║  │                                                                    │  ║
║  │  ┌──────────┐  ┌──────────┐  ┌─────────────────────────────────┐ │  ║
║  │  │ GoTrue   │  │PostgREST │  │      Edge Functions             │ │  ║
║  │  │ (Auth)   │  │ (CRUD)   │  │                                 │ │  ║
║  │  │          │  │          │  │  /chat ──→ Classify ──→ Search  │ │  ║
║  │  │ JWT      │  │ RLS      │  │          ──→ Generate ──→ Stream│ │  ║
║  │  │ Refresh  │  │ Enforced │  │  /embed ──→ Text ──→ API ──→ DB│ │  ║
║  │  └────┬─────┘  └────┬─────┘  └──────────────┬─────────────────┘ │  ║
║  │       │             │                        │                    │  ║
║  │  ┌────┴─────────────┴────────────────────────┴────────────────┐  │  ║
║  │  │                  PostgreSQL + pgvector                      │  │  ║
║  │  │                                                            │  │  ║
║  │  │  users │ transactions │ categories │ chat_sessions         │  │  ║
║  │  │  chat_messages │ transaction_embeddings │ ai_context_cache │  │  ║
║  │  └────────────────────────────────────────────────────────────┘  │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                 │                                        ║
║                            HTTPS                                         ║
║                                 │                                        ║
║  ┌──────────────────────────────┴─────────────────────────────────────┐  ║
║  │                     EXTERNAL AI SERVICES                           │  ║
║  │                                                                    │  ║
║  │  ┌─────────────────────┐   ┌────────────────────────────────────┐ │  ║
║  │  │  Embedding API      │   │  LLM Chat Completion API           │ │  ║
║  │  │  (1536-dim vectors) │   │  (Streaming responses)             │ │  ║
║  │  └─────────────────────┘   └────────────────────────────────────┘ │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  P = Presentation Layer  │  D = Domain Layer  │  D = Data Layer          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 23.2 Database Relationship Diagram (Text Format)

```
╔══════════════════════════════════════════════════════════════════╗
║                  DATABASE ENTITY RELATIONSHIPS                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌──────────────────┐                                           ║
║  │     auth.users    │  (Supabase managed)                      ║
║  │     ──────────    │                                           ║
║  │  id          (PK) │                                           ║
║  │  email            │                                           ║
║  └────────┬──────────┘                                           ║
║           │ 1:1 (FK)                                             ║
║           ▼                                                      ║
║  ┌──────────────────┐                                           ║
║  │      users        │                                           ║
║  │      ─────        │                                           ║
║  │  id          (PK) │◄─────────────────────────────────────┐   ║
║  │  email            │                                       │   ║
║  │  display_name     │                                       │   ║
║  │  default_currency │                                       │   ║
║  │  timezone         │                                       │   ║
║  └──┬──┬──┬──┬───────┘                                       │   ║
║     │  │  │  │                                               │   ║
║     │  │  │  │ 1:N                                           │   ║
║     │  │  │  └──────────────────────────┐                    │   ║
║     │  │  │                             ▼                    │   ║
║     │  │  │                    ┌──────────────────┐          │   ║
║     │  │  │                    │  ai_context_cache │          │   ║
║     │  │  │                    │  ───────────────  │          │   ║
║     │  │  │                    │  id          (PK) │          │   ║
║     │  │  │                    │  user_id     (FK) │──────────┘   ║
║     │  │  │                    │  query_hash       │              ║
║     │  │  │                    │  query_embedding  │              ║
║     │  │  │                    │  response_text    │              ║
║     │  │  │                    │  expires_at       │              ║
║     │  │  │                    └──────────────────┘              ║
║     │  │  │                                                      ║
║     │  │  │ 1:N                                                  ║
║     │  │  └───────────┐                                          ║
║     │  │              ▼                                          ║
║     │  │     ┌──────────────────┐     ┌────────────────────┐    ║
║     │  │     │  chat_sessions    │ 1:N │   chat_messages     │    ║
║     │  │     │  ─────────────   │────▶│   ─────────────     │    ║
║     │  │     │  id         (PK) │     │   id           (PK) │    ║
║     │  │     │  user_id    (FK) │     │   session_id   (FK) │    ║
║     │  │     │  title           │     │   role               │    ║
║     │  │     │  message_count   │     │   content            │    ║
║     │  │     │  last_message_at │     │   source_txn_ids     │    ║
║     │  │     └──────────────────┘     │   token_count        │    ║
║     │  │                              └────────────────────┘    ║
║     │  │ 1:N                                                     ║
║     │  └──────────┐                                              ║
║     │             ▼                                              ║
║     │    ┌──────────────────┐                                    ║
║     │    │   categories      │                                    ║
║     │    │   ──────────      │                                    ║
║     │    │   id         (PK) │◄──────────────┐                   ║
║     │    │   user_id    (FK) │               │                   ║
║     │    │   name            │               │ N:1               ║
║     │    │   icon            │               │                   ║
║     │    │   color           │               │                   ║
║     │    │   is_default      │               │                   ║
║     │    └──────────────────┘               │                   ║
║     │                                        │                   ║
║     │ 1:N                                    │                   ║
║     └──────────┐                             │                   ║
║                ▼                             │                   ║
║       ┌──────────────────┐                   │                   ║
║       │   transactions    │──────────────────┘                   ║
║       │   ────────────    │                                      ║
║       │   id         (PK) │◄──────────────┐                     ║
║       │   user_id    (FK) │               │                     ║
║       │   category_id(FK) │               │ 1:1                 ║
║       │   type            │               │                     ║
║       │   amount          │               │                     ║
║       │   currency_code   │               │                     ║
║       │   description     │               │                     ║
║       │   transaction_date│      ┌────────┴──────────────┐      ║
║       │   tags            │      │ transaction_embeddings │      ║
║       │   is_deleted      │      │ ─────────────────────  │      ║
║       └──────────────────┘      │ id               (PK) │      ║
║                                  │ transaction_id   (FK) │      ║
║                                  │ user_id          (FK) │      ║
║                                  │ embedding (vec 1536)  │      ║
║                                  │ embedding_text        │      ║
║                                  │ model_version         │      ║
║                                  └───────────────────────┘      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### 23.3 AI Request Flow Diagram (Text Format)

```
╔══════════════════════════════════════════════════════════════════╗
║                     AI REQUEST FLOW                              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  USER: "How much did I spend on food this month?"                ║
║           │                                                      ║
║           ▼                                                      ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  1. CLIENT: Save user message to DB         │                  ║
║  │     POST chat_messages { role: 'user', ... }│                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │                                          ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  2. CLIENT: Open SSE connection to          │                  ║
║  │     Edge Function /chat                     │                  ║
║  │     POST { message, sessionId, userId }     │                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │                                          ║
║           ════════════╪══════════════════════                    ║
║           ║  EDGE FUNCTION (Server-Side)  ║                      ║
║           ════════════╪══════════════════════                    ║
║                       │                                          ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  3. CLASSIFY QUERY                          │                  ║
║  │                                             │                  ║
║  │  Input:  "How much...food...this month?"    │                  ║
║  │  Output: {                                  │                  ║
║  │    intent: "aggregation",                   │                  ║
║  │    category: "Food",                        │                  ║
║  │    timeRange: {                             │                  ║
║  │      start: "2025-06-01",                   │                  ║
║  │      end: "2025-06-30"                      │                  ║
║  │    },                                       │                  ║
║  │    aggregation: "sum"                       │                  ║
║  │  }                                          │                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │                                          ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  4. CHECK CACHE                             │                  ║
║  │                                             │                  ║
║  │  Query: SELECT * FROM ai_context_cache      │                  ║
║  │         WHERE user_id = $1                  │                  ║
║  │         AND query_hash = SHA256($query)     │                  ║
║  │         AND expires_at > NOW()              │                  ║
║  │                                             │                  ║
║  │  HIT? → Return cached response → Skip to 8 │                  ║
║  │  MISS? → Continue to step 5                 │                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │ (Cache MISS)                             ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  5. EMBED QUERY                             │                  ║
║  │                                             │                  ║
║  │  Call Embedding API:                        │                  ║
║  │  Input: "spending on food this month"       │                  ║
║  │  Output: float[1536]                        │                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │                                          ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  6. HYBRID SEARCH (SQL + Vector)            │                  ║
║  │                                             │                  ║
║  │  SELECT t.*, distance                       │                  ║
║  │  FROM transactions t                        │                  ║
║  │  JOIN transaction_embeddings te             │                  ║
║  │    ON t.id = te.transaction_id              │                  ║
║  │  WHERE t.user_id = $user_id                 │                  ║
║  │    AND t.transaction_date                   │                  ║
║  │        BETWEEN '2025-06-01' AND '2025-06-30'│                  ║
║  │    AND t.is_deleted = false                  │                  ║
║  │  ORDER BY te.embedding <=> $query_emb       │                  ║
║  │  LIMIT 20                                   │                  ║
║  │                                             │                  ║
║  │  Result: 12 food-related transactions       │                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │                                          ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  7. CONSTRUCT PROMPT                        │                  ║
║  │                                             │                  ║
║  │  System: "You are a finance assistant..."   │                  ║
║  │  Context: [12 formatted transactions]       │                  ║
║  │  History: [last 10 messages in session]     │                  ║
║  │  Query: "How much did I spend on food..."   │                  ║
║  │                                             │                  ║
║  │  Total: ~3,500 tokens                       │                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │                                          ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  8. STREAM LLM RESPONSE                    │                  ║
║  │                                             │                  ║
║  │  Call LLM API (stream: true)                │                  ║
║  │                                             │                  ║
║  │  Token 1: "Based"    → SSE → Client         │                  ║
║  │  Token 2: " on"      → SSE → Client         │                  ║
║  │  Token 3: " your"    → SSE → Client         │                  ║
║  │  ...                                        │                  ║
║  │  Token N: "."         → SSE → Client         │                  ║
║  │  [DONE] + sources     → SSE → Client         │                  ║
║  │                                             │                  ║
║  │  Response: "Based on your transactions,     │                  ║
║  │  you spent $342.50 on food this month       │                  ║
║  │  across 12 transactions. Your largest was   │                  ║
║  │  $78.00 at Restaurant XYZ on June 8th."     │                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │                                          ║
║           ════════════╪══════════════════════                    ║
║                       │                                          ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  9. CLIENT: Save assistant message to DB    │                  ║
║  │     POST chat_messages {                    │                  ║
║  │       role: 'assistant',                    │                  ║
║  │       content: full_response,               │                  ║
║  │       source_transaction_ids: [...]         │                  ║
║  │     }                                       │                  ║
║  └────────────────────┬───────────────────────┘                  ║
║                       │                                          ║
║                       ▼                                          ║
║  ┌────────────────────────────────────────────┐                  ║
║  │  10. CLIENT: Update UI                      │                  ║
║  │                                             │                  ║
║  │  • Show complete response in chat bubble    │                  ║
║  │  • Display source transactions (expandable) │                  ║
║  │  • Show suggested follow-up questions       │                  ║
║  │  • Cache response in ai_context_cache       │                  ║
║  └────────────────────────────────────────────┘                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 24. Deployment Strategy

### Environments

| Environment | Purpose | Supabase Project | AI Config |
|-------------|---------|-----------------|-----------|
| **Local** | Development | `supabase start` (local Docker) | Mock AI or dev API key with low limits |
| **Staging** | QA, UAT, demo | Separate Supabase project | Dev AI API key, same models as prod |
| **Production** | Live users | Dedicated Supabase project (Pro plan) | Production AI API key, monitoring enabled |

### CI/CD Pipeline

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Push   │───▶│  Lint   │───▶│  Test    │───▶│  Build   │───▶│  Deploy  │
│  to PR  │    │  + Type │    │  (Jest)  │    │  (EAS)   │    │  (Store/ │
│         │    │  Check  │    │          │    │          │    │   OTA)   │
└─────────┘    └─────────┘    └──────────┘    └──────────┘    └──────────┘
                                                   │
                                              ┌────┴─────┐
                                              │ Supabase │
                                              │ Deploy   │
                                              │ (migrate │
                                              │ + funcs) │
                                              └──────────┘
```

| Step | Tool | Trigger |
|------|------|---------|
| Lint + Type Check | ESLint, TypeScript `tsc --noEmit` | Every PR |
| Unit Tests | Jest | Every PR |
| E2E Tests | Detox/Maestro | Nightly or pre-release |
| Mobile Build | Expo EAS Build | On merge to `main` (staging), on tag (production) |
| Supabase Migration | `supabase db push` | On merge to `main` |
| Edge Function Deploy | `supabase functions deploy` | On merge to `main` |
| OTA Update | Expo Updates | For JS-only changes in production |
| App Store Submit | EAS Submit | Manual trigger for releases |

### Release Strategy

| Type | Mechanism | Review Required | Use Case |
|------|-----------|----------------|----------|
| **JS-only hotfix** | OTA (Expo Updates) | No app store review | Bug fix in React/JS code |
| **Feature release** | Full build + store submit | App store review (1-3 days) | New features, native changes |
| **Database migration** | Supabase CLI | N/A (automated) | Schema changes |
| **Edge Function update** | Supabase CLI deploy | N/A | AI pipeline changes |

---

## 25. Development Roadmap

### Development Phases

| Phase | Duration | Focus | Deliverables |
|-------|----------|-------|-------------|
| **Phase 0: Foundation** | 1 week | Project setup, tooling, CI/CD | Bare RN project, Supabase project, CI pipeline, folder structure, DI container |
| **Phase 1: Core Features** | 3 weeks | Auth + Transactions + Categories | Login/register, CRUD transactions, category management, basic list/detail screens |
| **Phase 2: AI Chat** | 3 weeks | RAG pipeline, chat UI, streaming | Edge Functions, embedding pipeline, semantic search, chat interface, streaming display |
| **Phase 3: Analytics** | 1 week | Dashboard, charts, summaries | Monthly summaries, category breakdowns, trend charts |
| **Phase 4: Polish** | 2 weeks | UX, performance, error handling, testing | Animations, offline queue, error states, unit tests, integration tests |
| **Phase 5: Production** | 1 week | Security hardening, deployment | Certificate pinning, rate limiting, production Supabase, app store submission |

### Milestone Plan

| Milestone | Target | Criteria |
|-----------|--------|----------|
| **M0: Project Skeleton** | Week 1 end | RN app runs on simulator, Supabase local running, folder structure created, navigation shell working |
| **M1: Auth Complete** | Week 2 end | Login, register, logout, password reset, secure token storage, RLS verified |
| **M2: Transactions MVP** | Week 4 end | CRUD transactions, category selection, filtered list, pagination, optimistic updates |
| **M3: AI Chat MVP** | Week 7 end | Send question, receive streaming answer grounded in transactions, session management |
| **M4: Full Feature Set** | Week 8 end | Analytics dashboard, profile settings, error handling for all flows |
| **M5: Production Ready** | Week 10 end | Testing complete, security audit passed, deployed to staging, performance targets met |
| **M6: Launch** | Week 11 | App store submission, production deployment, monitoring active |

### Suggested Sprint Breakdown

#### Sprint 1 (Week 1–2): Foundation + Auth

| Task | Estimate | Priority |
|------|----------|----------|
| Initialize React Native project (Expo or bare) | 0.5 day | P0 |
| Configure TypeScript strict mode, ESLint, Prettier | 0.5 day | P0 |
| Set up Supabase project (local + remote) | 0.5 day | P0 |
| Create folder structure (all feature shells) | 0.5 day | P0 |
| Implement DI container and provider | 1 day | P0 |
| Create shared component library (Button, Input, Card) | 1 day | P0 |
| Design system (colors, typography, spacing) | 0.5 day | P0 |
| Navigation shell (Root, Auth, Main navigators) | 1 day | P0 |
| Database migration: users table | 0.5 day | P0 |
| Supabase Auth integration (login, register, logout) | 2 days | P0 |
| Secure token storage (Keychain/Keystore) | 0.5 day | P0 |
| Auth screens (Login, Register, ForgotPassword) | 1.5 days | P0 |
| RLS policies for users table | 0.5 day | P0 |
| CI pipeline (lint + type check + test) | 0.5 day | P1 |

#### Sprint 2 (Week 3–4): Transaction Management

| Task | Estimate | Priority |
|------|----------|----------|
| Database migration: categories, transactions tables | 1 day | P0 |
| RLS policies for categories, transactions | 0.5 day | P0 |
| Seed default categories | 0.5 day | P0 |
| Transaction repository (Supabase implementation) | 1.5 days | P0 |
| Category repository (Supabase implementation) | 0.5 day | P0 |
| Transaction use cases (Create, Read, Update, Delete) | 1 day | P0 |
| Transaction list screen (FlashList, pagination) | 2 days | P0 |
| Add transaction screen (form, validation, category picker) | 2 days | P0 |
| Transaction detail screen | 0.5 day | P0 |
| Edit transaction flow | 0.5 day | P0 |
| Delete transaction (soft delete + confirmation) | 0.5 day | P0 |
| Transaction filters (date range, category, type) | 1 day | P1 |
| Optimistic updates for create/update/delete | 0.5 day | P1 |
| React Query cache strategy and invalidation | 0.5 day | P0 |

#### Sprint 3 (Week 5–6): AI Pipeline (Backend)

| Task | Estimate | Priority |
|------|----------|----------|
| Database migration: embeddings, chat tables, cache table | 1 day | P0 |
| RLS policies for chat and embedding tables | 0.5 day | P0 |
| Edge Function: /embed (transaction → embedding) | 2 days | P0 |
| Embedding trigger on transaction create/update | 1 day | P0 |
| pgvector HNSW index creation | 0.5 day | P0 |
| Edge Function: /classify (query classification) | 1 day | P0 |
| RPC function: hybrid semantic search | 2 days | P0 |
| Edge Function: /chat (SSE streaming) | 2 days | P0 |
| System prompt engineering and testing | 1 day | P0 |
| Context construction logic (token budgeting) | 1 day | P0 |
| Rate limiting middleware for Edge Functions | 0.5 day | P1 |
| AI context cache implementation | 0.5 day | P1 |

#### Sprint 4 (Week 7–8): AI Chat UI + Analytics

| Task | Estimate | Priority |
|------|----------|----------|
| SSE client for React Native | 1 day | P0 |
| Chat session list screen | 1 day | P0 |
| Chat screen (messages, input, auto-scroll) | 2 days | P0 |
| Streaming text component (token-by-token render) | 1.5 days | P0 |
| Source transaction cards (expandable) | 1 day | P1 |
| Suggested follow-up questions | 0.5 day | P1 |
| Chat error handling (retry, partial response) | 1 day | P0 |
| Analytics RPC functions (monthly summary, category breakdown) | 1 day | P1 |
| Analytics dashboard screen with charts | 2 days | P1 |
| Profile screen and settings | 1 day | P1 |

#### Sprint 5 (Week 9–10): Polish + Production

| Task | Estimate | Priority |
|------|----------|----------|
| Offline transaction queue (Zustand persist) | 1.5 days | P2 |
| Network status banner | 0.5 day | P2 |
| Error boundaries for all features | 0.5 day | P1 |
| Loading states and empty states for all screens | 1 day | P1 |
| Animations (chat bubble appear, list transitions) | 1 day | P1 |
| Unit tests: domain layer (all use cases) | 2 days | P1 |
| Unit tests: data layer (repository mapping) | 1 day | P1 |
| Component tests: critical screens | 1 day | P1 |
| Security hardening (cert pinning, input limits) | 1 day | P0 |
| Performance profiling and optimization | 1 day | P1 |
| Production Supabase setup (Pro plan, env config) | 0.5 day | P0 |
| App store metadata and screenshots | 0.5 day | P2 |
| Staging deployment and QA | 1 day | P0 |
| Production deployment | 0.5 day | P0 |

### Definition of Done for MVP

The MVP is considered complete when ALL of the following criteria are met:

**Functional Completeness**:
- [ ] User can sign up, log in, log out, and reset password.
- [ ] User can create, read, update, and soft-delete transactions.
- [ ] User can select from default categories and create custom categories.
- [ ] User can open a chat session and ask natural language questions about their finances.
- [ ] AI responds with streaming text grounded in actual transaction data.
- [ ] AI responses cite source transactions that can be viewed.
- [ ] User can view a monthly spending summary and category breakdown.
- [ ] User can view and edit their profile (display name, default currency, timezone).

**Non-Functional Requirements**:
- [ ] All database tables have RLS policies that pass security review.
- [ ] Auth tokens are stored in platform secure storage (Keychain/Keystore).
- [ ] No API keys are exposed in the client bundle.
- [ ] Chat first-token latency is < 3 seconds (on stable connection).
- [ ] Transaction list scrolls at 60 FPS with 500+ items.
- [ ] Transaction CRUD operations complete in < 500ms (perceived).
- [ ] App startup (cold) is < 2 seconds on mid-range device.

**Code Quality**:
- [ ] TypeScript strict mode with zero type errors.
- [ ] ESLint passes with zero warnings.
- [ ] ≥ 80% unit test coverage on domain and data layers.
- [ ] All critical user journeys have at least one integration test.
- [ ] Clean Architecture boundaries are respected (no layer violations).

**Deployment**:
- [ ] CI pipeline runs lint, type check, and tests on every PR.
- [ ] App builds successfully for both iOS and Android.
- [ ] Supabase migrations apply cleanly to staging environment.
- [ ] Edge Functions deploy and respond correctly on staging.
- [ ] Staging environment mirrors production configuration.

### Risks That May Affect TL Verification and Live Demo

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 1 | **LLM API downtime during demo** | Low | Critical | Have a fallback mock response ready. Pre-record a demo video as backup |
| 2 | **Embedding API rate limit during bulk demo data creation** | Medium | High | Pre-embed demo transactions before the demo. Use a dedicated API key with higher limits |
| 3 | **Supabase cold start on Edge Functions** | Medium | Medium | Warm up Edge Functions 5 minutes before demo. First request is always slowest |
| 4 | **LLM hallucination in live demo** | Medium | High | Use low temperature (0.1). Test demo queries beforehand. Have a set of "known good" queries |
| 5 | **React Native build fails on reviewer's machine** | Low | High | Provide pre-built APK/IPA. Include detailed setup instructions. Use Expo Go for quick testing |
| 6 | **Network latency during demo** | Medium | Medium | Run demo on reliable Wi-Fi. Consider running Supabase locally for demo |
| 7 | **pgvector index not built** | Low | High | Include index creation in migration. Verify with EXPLAIN ANALYZE before demo |
| 8 | **Demo data doesn't produce meaningful AI responses** | Medium | High | Prepare a rich demo dataset with diverse transactions spanning multiple months and categories |
| 9 | **Auth flow issues (JWT expiry during demo)** | Low | Medium | Set long token expiry for demo environment. Log in fresh before demo starts |
| 10 | **Streaming visually breaks on specific device** | Low | Medium | Test on multiple devices/simulators before demo. Have fallback non-streaming mode |

**Recommended Demo Preparation Checklist**:
1. Pre-populate 100+ diverse transactions across 6+ months.
2. Ensure all transactions are embedded (verify embedding count matches transaction count).
3. Test these specific demo queries and verify correct answers:
   - "How much did I spend on food this month?" (aggregation)
   - "What subscriptions am I paying for?" (semantic search)
   - "Show my largest expenses in May" (listing + temporal)
   - "How much did I spend on Uber recently?" (entity + temporal)
4. Warm up Edge Functions 5 minutes before demo.
5. Have a screen recording of a successful run as backup.
6. Test on the exact device that will be used for the demo.

---

*Document Version: 1.0*
*Last Updated: June 2025*
*Author: Architecture Team*
