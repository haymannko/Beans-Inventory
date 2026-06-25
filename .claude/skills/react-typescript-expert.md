# react-typescript-expert

Expert guidance for building React applications with TypeScript.

## When to Use

Use this skill when building React components, hooks, state management, routing, forms, or styling in TypeScript projects. Applies to Next.js, Vite, CRA, or any React setup.

## Core Principles

- **Type everything.** Props, state, refs, event handlers, context — no `any` unless absolutely unavoidable.
- **Components are functions.** Prefer function components. Use `React.FC` sparingly; type the props object directly.
- **Colocate.** Keep related files together — component, styles, tests, types in the same directory.
- **Composition over inheritance.** Use children, render props, and hooks to share behavior.

## Component Patterns

```tsx
// Preferred: explicit props type, no React.FC
type UserCardProps = {
  user: User;
  onSelect: (userId: string) => void;
  isActive?: boolean;
};

export function UserCard({ user, onSelect, isActive = false }: UserCardProps) {
  return (
    <div className={isActive ? "card active" : "card"} onClick={() => onSelect(user.id)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}
```

## Children and Layout Components

```tsx
type CardProps = {
  title: string;
  children: React.ReactNode;
};

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
```

## Event Handlers

```tsx
function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" onChange={handleChange} />
    </form>
  );
}
```

## Hooks

### useState

```tsx
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);
```

### useRef

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

### Custom Hooks

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Usage
const debouncedQuery = useDebounced(searchTerm, 300);
```

## Context

```tsx
type AuthContextType = {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // ...
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Reducer Pattern

```tsx
type State = { items: Item[]; loading: boolean; error: string | null };

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: Item[] }
  | { type: "FETCH_ERROR"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { items: action.payload, loading: false, error: null };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
  }
}
```

## Generic Components

```tsx
type ListProps<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
};

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
```

## Forms

```tsx
function LoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={form.email} onChange={handleChange} />
      <input name="password" type="password" value={form.password} onChange={handleChange} />
      <button type="submit">Login</button>
    </form>
  );
}
```

## API Calls with Types

```typescript
type ApiResponse<T> = {
  data: T;
  error: string | null;
};

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Request failed");
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}

// Usage
const users = await fetchApi<User[]>("/api/users");
```

## Styling Approaches

### CSS Modules

```tsx
import styles from "./UserCard.module.css";

export function UserCard({ user }: { user: User }) {
  return <div className={styles.card}>{user.name}</div>;
}
```

### Tailwind + cn utility

```tsx
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({ variant, children }: { variant: "primary" | "ghost"; children: React.ReactNode }) {
  return (
    <button className={cn("px-4 py-2 rounded", variant === "primary" ? "bg-blue-600 text-white" : "bg-transparent")}>
      {children}
    </button>
  );
}
```

## Testing

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { UserCard } from "./UserCard";

test("calls onSelect when clicked", () => {
  const onSelect = vi.fn();
  const user = { id: "1", name: "Alice", email: "alice@example.com" };

  render(<UserCard user={user} onSelect={onSelect} />);
  fireEvent.click(screen.getByText("Alice"));

  expect(onSelect).toHaveBeenCalledWith("1");
});
```

## Project Structure

```
src/
├── components/         # Shared UI components
│   ├── ui/             # Primitives: Button, Input, Modal
│   └── layout/         # Layout shells: Header, Sidebar, PageWrapper
├── features/           # Feature modules
│   └── auth/
│       ├── components/
│       ├── hooks/
│       ├── api.ts
│       └── types.ts
├── hooks/              # Shared custom hooks
├── lib/                # Utilities, API client, constants
├── types/              # Global type definitions
└── app/                # Route-level components (Next.js: app/ or pages/)
```

## Anti-Patterns to Avoid

- **`any` in props or state** — use `unknown` if truly dynamic, then narrow.
- **Inline object/array literals in JSX** — causes re-renders. Memoize or extract.
- **Missing keys** or using array index as key for dynamic lists.
- **Massive components** — split into smaller, focused components.
- **Storing derived state** — compute it from existing state instead.
- **Using `useEffect` for events** — use event handlers, not effects, for user-initiated actions.
