import AsyncStorage from "@react-native-async-storage/async-storage";

export type Category =
  | "tips"
  | "terms"
  | "tutorials"
  | "tools"
  | "frameworks"
  | "other";

export type LifecyclePhase =
  | "plan"
  | "design"
  | "implement"
  | "test"
  | "publish";

export type DomainArea =
  | "security"
  | "ai"
  | "mobile"
  | "desktop"
  | "web"
  | "backend"
  | "devops"
  | "database";

export interface KnowledgeItem {
  id: number;
  title: string;
  content: string;
  category: Category;
  tags: string[];
  lifecyclePhases: LifecyclePhase[];
  domainAreas: DomainArea[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateItemInput {
  title: string;
  content: string;
  category: Category;
  tags: string[];
  lifecyclePhases: LifecyclePhase[];
  domainAreas: DomainArea[];
}

const STORAGE_KEY = "devvault_items_v2";
const COUNTER_KEY = "devvault_counter_v2";

async function getAll(): Promise<KnowledgeItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

async function saveAll(items: KnowledgeItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function nextId(): Promise<number> {
  const raw = await AsyncStorage.getItem(COUNTER_KEY);
  const next = (raw ? parseInt(raw) : 0) + 1;
  await AsyncStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

export async function initDatabase(): Promise<void> {}

export async function getAllItems(): Promise<KnowledgeItem[]> {
  const items = await getAll();
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getItemsByCategory(
  category: Category
): Promise<KnowledgeItem[]> {
  const items = await getAllItems();
  return items.filter((item) => item.category === category);
}

export async function searchItems(query: string): Promise<KnowledgeItem[]> {
  const items = await getAllItems();
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export async function getItemById(id: number): Promise<KnowledgeItem | null> {
  const items = await getAll();
  return items.find((item) => item.id === id) ?? null;
}

export async function createItem(
  input: CreateItemInput
): Promise<KnowledgeItem> {
  const items = await getAll();
  const id = await nextId();
  const now = Date.now();
  const item: KnowledgeItem = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  items.push(item);
  await saveAll(items);
  return item;
}

export async function updateItem(
  id: number,
  input: CreateItemInput
): Promise<KnowledgeItem> {
  const items = await getAll();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error("Item not found");
  const updated: KnowledgeItem = {
    ...items[idx],
    ...input,
    updatedAt: Date.now(),
  };
  items[idx] = updated;
  await saveAll(items);
  return updated;
}

export async function deleteItem(id: number): Promise<void> {
  const items = await getAll();
  await saveAll(items.filter((item) => item.id !== id));
}

export async function seedDatabase(): Promise<void> {
  const existing = await getAll();
  if (existing.length > 0) return;

  const now = Date.now();
  const seeds: CreateItemInput[] = [
    {
      title: "Big O Notation Cheat Sheet",
      content:
        "## Big O Complexity\n\nUnderstanding algorithmic complexity is fundamental:\n\n- **O(1)** — Constant time. Array access, hash map lookup.\n- **O(log n)** — Logarithmic. Binary search, balanced BST ops.\n- **O(n)** — Linear. Single loop over data.\n- **O(n log n)** — Linearithmic. Merge sort, heap sort.\n- **O(n²)** — Quadratic. Nested loops, bubble sort.\n\n## Space Complexity\n\nAlways consider both time and space. Recursive calls add to the call stack (O(n) space for depth n).",
      category: "tips",
      tags: ["algorithms", "complexity", "performance"],
      lifecyclePhases: ["implement"],
      domainAreas: ["backend", "mobile"],
    },
    {
      title: "SOLID Principles",
      content:
        "## SOLID Design Principles\n\n**S** — Single Responsibility: A class should have one reason to change.\n\n**O** — Open/Closed: Open for extension, closed for modification.\n\n**L** — Liskov Substitution: Subtypes must be substitutable for their base types.\n\n**I** — Interface Segregation: Clients shouldn't depend on interfaces they don't use.\n\n**D** — Dependency Inversion: Depend on abstractions, not concretions.",
      category: "terms",
      tags: ["OOP", "design", "architecture"],
      lifecyclePhases: ["design", "implement"],
      domainAreas: ["backend", "desktop"],
    },
    {
      title: "React Native Performance Tips",
      content:
        "## Optimize Your RN App\n\n1. **Avoid anonymous functions in render** — they create new refs on every render\n2. **Use `React.memo`** for components that receive the same props frequently\n3. **FlatList over ScrollView** for long lists — virtualization is key\n4. **InteractionManager** — defer heavy work until animations complete\n5. **Hermes engine** — enabled by default, gives faster startup",
      category: "tips",
      tags: ["react-native", "performance", "optimization"],
      lifecyclePhases: ["implement", "test"],
      domainAreas: ["mobile"],
    },
    {
      title: "JWT — JSON Web Tokens",
      content:
        "## What is JWT?\n\nJWT is a compact, URL-safe means of representing claims between two parties.\n\n## Structure\n\n`header.payload.signature`\n\n- **Header**: Algorithm & token type\n- **Payload**: Claims — user data, expiration, issuer\n- **Signature**: HMAC-SHA256 of header.payload with secret\n\n## Key Points\n\n- JWTs are **signed, not encrypted**\n- Store in **httpOnly cookies**, not localStorage\n- Use short expiry + refresh tokens",
      category: "terms",
      tags: ["authentication", "security", "tokens"],
      lifecyclePhases: ["design", "implement"],
      domainAreas: ["security", "backend", "web"],
    },
    {
      title: "CS50 — Harvard's Intro to CS",
      content:
        "## CS50 by Harvard\n\n**Link**: https://cs50.harvard.edu/x/\n\nOne of the best free courses for learning computer science fundamentals.\n\n## What you'll learn\n\n- C, Python, SQL, JavaScript\n- Algorithms and data structures\n- Web development with Flask\n- Memory management\n\n**Difficulty**: Beginner → Intermediate",
      category: "tutorials",
      tags: ["learning", "cs-fundamentals", "harvard"],
      lifecyclePhases: ["plan"],
      domainAreas: ["backend", "web"],
    },
    {
      title: "Raycast — Power User Launcher",
      content:
        "## Raycast\n\n**Link**: https://raycast.com\n\nA blazing fast, extensible launcher for macOS.\n\n## Key Features\n\n- App launcher, file search, calculator\n- GitHub integration\n- Clipboard history manager\n- Window management\n- AI assistant built-in\n- Extension store with 1000+ extensions\n\n**Platform**: macOS only | **Price**: Free (Pro plan available)",
      category: "tools",
      tags: ["productivity", "macOS", "launcher"],
      lifecyclePhases: ["implement"],
      domainAreas: ["desktop"],
    },
    {
      title: "TypeScript — Static Typing for JS",
      content:
        "## TypeScript\n\nTypeScript adds optional static typing to JavaScript.\n\n## Quick Tips\n\n```typescript\n// Use `as const` for literal types\nconst ROLES = ['admin', 'user', 'guest'] as const;\ntype Role = typeof ROLES[number];\n\n// Utility types\ntype ReadOnly = Readonly<User>;\ntype Optional = Partial<User>;\n```",
      category: "frameworks",
      tags: ["typescript", "javascript", "static-typing"],
      lifecyclePhases: ["implement", "test"],
      domainAreas: ["web", "backend", "mobile"],
    },
    {
      title: "SQL Injection Prevention",
      content:
        "## SQL Injection\n\nOne of the most dangerous web vulnerabilities (OWASP Top 10).\n\n## Prevention\n\n### Parameterized Queries (BEST)\n```typescript\nconst user = await db.query(\n  'SELECT * FROM users WHERE email = $1',\n  [userInput]\n);\n```\n\n### ORMs with built-in protection\n- Prisma, Drizzle, Sequelize all use parameterized queries internally",
      category: "tips",
      tags: ["security", "sql", "OWASP"],
      lifecyclePhases: ["implement", "test"],
      domainAreas: ["security", "backend", "database"],
    },
    {
      title: "Prompt Engineering Basics",
      content:
        "## Effective Prompt Engineering\n\n### Core Techniques\n\n1. **Be Specific** — Include language, constraints, output format\n2. **Provide Context** — Background helps the model\n3. **Few-Shot Examples** — Show 2-3 input→output examples\n4. **Chain of Thought** — Ask to 'think step by step'\n5. **Role Prompting** — 'Act as a senior security engineer...'\n\n### Useful Patterns\n\n- Use XML tags or triple backticks to separate sections\n- Iteration is key — refine based on outputs",
      category: "tips",
      tags: ["AI", "LLM", "prompt-engineering"],
      lifecyclePhases: ["implement"],
      domainAreas: ["ai"],
    },
    {
      title: "Docker Fundamentals",
      content:
        "## Docker\n\nA platform for building, shipping, and running applications in containers.\n\n## Essential Commands\n\n```bash\ndocker build -t myapp .\ndocker run -p 3000:3000 myapp\ndocker ps\ndocker logs <container_id>\ndocker compose up --build\n```\n\n## Best Practices\n\n- Use `.dockerignore` to exclude node_modules\n- Multi-stage builds to reduce image size\n- Never run as root",
      category: "tools",
      tags: ["docker", "containers", "devops"],
      lifecyclePhases: ["publish", "test"],
      domainAreas: ["devops", "backend"],
    },
    {
      title: "Developer Workflow Checklists",
      content:
        "## Personal Dev Checklists\n\nA collection of quick-reference checklists for common engineering tasks.\n\n### Code Review Checklist\n- [ ] Code is readable without comments\n- [ ] Edge cases handled\n- [ ] No hardcoded secrets or credentials\n- [ ] Error states covered\n- [ ] Tests updated/added\n\n### PR Checklist\n- [ ] Branch is up to date with main\n- [ ] CI passes locally\n- [ ] Changeset/changelog entry added\n- [ ] Screenshots for UI changes\n\n### Release Checklist\n- [ ] Version bumped\n- [ ] Migrations ran\n- [ ] Feature flags enabled/disabled\n- [ ] Rollback plan documented\n- [ ] Monitoring alerts confirmed",
      category: "other",
      tags: ["checklists", "workflow", "process"],
      lifecyclePhases: ["design", "implement", "test", "publish"],
      domainAreas: ["backend", "web", "mobile"],
    },
  ];

  let counter = 1;
  const items: KnowledgeItem[] = seeds.map((seed) => ({
    id: counter++,
    ...seed,
    createdAt: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
    updatedAt: now,
  }));

  await saveAll(items);
  await AsyncStorage.setItem(COUNTER_KEY, String(counter));
}
