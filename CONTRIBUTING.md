# Contributing to Open Quran Reader

Thank you for your interest in contributing! This project follows **Test-Driven Development (TDD)** practices to ensure code quality and reliability.

## Prerequisites

- [Bun](https://bun.sh/) installed
- Gemini API key (for AI features)

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd open-quran-reader-2

# Install dependencies
bun install

# Set up environment
cp .env.local.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Run the development server
bun run dev
```

## Development Workflow (TDD)

This project **requires** Test-Driven Development. Follow these steps for all changes:

### 1. Write Tests First

Before writing any implementation code, create tests that describe the expected behavior:

```bash
# For new services, create tests in:
__tests__/unit/services/yourService.test.ts

# For new components, create tests in:
__tests__/unit/components/YourComponent.test.tsx

# For new user flows, create E2E tests in:
__tests__/e2e/yourFlow.spec.ts
```

### 2. Verify Tests Fail

Run the gates command to confirm your tests fail (as expected, since the feature doesn't exist yet):

```bash
bun run gates
```

### 3. Implement the Feature

Write the minimum code necessary to make the tests pass.

### 4. Run Gates

Ensure all quality checks pass:

```bash
bun run gates
```

This runs:

1. **TypeScript type checking** - No type errors allowed
2. **ESLint linting** - Code style and best practices
3. **Prettier formatting** - Consistent code formatting
4. **Unit tests** - 80% coverage required
5. **E2E tests** - User flow verification

### 5. Commit

Pre-commit hooks will automatically run lint-staged to verify your changes.

## Quality Gates

The `gates` command is the **required quality bar** for all changes. No PR will be merged if gates fail.

### Coverage Requirements

- **80% minimum** for branches, functions, lines, and statements
- Coverage reports are generated in `coverage/`

### Test Commands

| Command                   | Description                       |
| ------------------------- | --------------------------------- |
| `bun run gates`           | Run ALL quality checks (required) |
| `bun run test`            | Run all tests                     |
| `bun run test:unit`       | Run unit tests with coverage      |
| `bun run test:unit:watch` | Run unit tests in watch mode      |
| `bun run test:e2e`        | Run E2E tests                     |
| `bun run test:e2e:ui`     | Run E2E tests with Playwright UI  |

### Other Commands

| Command                | Description                  |
| ---------------------- | ---------------------------- |
| `bun run lint`         | Check for linting issues     |
| `bun run lint:fix`     | Auto-fix linting issues      |
| `bun run format`       | Format code with Prettier    |
| `bun run format:check` | Check formatting             |
| `bun run typecheck`    | Run TypeScript type checking |

## Project Structure

```
open-quran-reader-2/
├── components/           # React UI components
├── services/             # Business logic and API services
├── __tests__/
│   ├── unit/
│   │   ├── services/     # Unit tests for services
│   │   └── components/   # Unit tests for components
│   ├── e2e/              # Playwright E2E tests
│   └── setup.ts          # Test setup and mocks
├── docs/                 # Design decisions and architectural docs
├── types.ts              # Shared TypeScript interfaces
├── App.tsx               # Main application component
└── index.tsx             # Application entry point
```

## Writing Tests

### Unit Tests (Vitest)

```typescript
import { describe, it, expect, vi } from "vitest";

describe("YourService", () => {
  it("should do something", () => {
    // Arrange
    const input = "test";

    // Act
    const result = yourFunction(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

### Component Tests (Testing Library)

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { YourComponent } from "@/components/YourComponent";

describe("YourComponent", () => {
  it("should render correctly", () => {
    render(<YourComponent />);
    expect(screen.getByText("Expected Text")).toBeDefined();
  });

  it("should handle click events", () => {
    const onClick = vi.fn();
    render(<YourComponent onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Your Feature", () => {
  test("should work correctly", async ({ page }) => {
    await page.goto("/");
    await page.click('button[data-testid="your-button"]');
    await expect(page.locator(".result")).toBeVisible();
  });
});
```

## Commit Guidelines

- Use conventional commit messages
- Keep commits focused and atomic
- Reference issues when applicable

Examples:

```
Add user authentication feature
Fix verse highlighting on mobile
Refactor audio player component
Update translation service tests
```

## Pull Request Process

1. Ensure `bun run gates` passes locally
2. Create a PR with a clear description
3. Reference any related issues
4. Wait for code review
5. Address feedback if any
6. Merge once approved

## Code Style

- TypeScript with strict typing
- Functional React components with hooks
- Tailwind CSS for styling (inline classes)
- ESLint and Prettier for consistency

## Questions?

If you have questions or need help, please open an issue or discussion.
