import * as SQLite from "expo-sqlite";

export interface MetadataDefinition {
  id: number;
  slug: string;
  label: string;
  icon?: string;
}

export interface MetadataValue {
  id: number;
  defId: number;
  slug: string;
  label: string;
  color?: string;
  icon?: string;
}

export interface KnowledgeItem {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lifecyclePhases: string[];
  domainAreas: string[];
  createdAt: string;
  updatedAt: string;
  links: string[];
  images: string[];
  metadata?: Record<string, string[]>; // SectionSlug -> ValueSlugs[]
}

export interface CreateItemInput {
  title: string;
  content: string;
  category: string;
  tags: string[];
  lifecyclePhases: string[];
  domainAreas: string[];
  links?: string[];
  images?: string[];
  customMetadata?: Record<string, string[]>;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("devvault_v2.db");
  }
  return db;
}

async function runMigration(db: SQLite.SQLiteDatabase) {
  const tableCheck = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'");
  if (tableCheck.length === 0) return;

  const hasPhases = (await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='lifecycle_phases'")).length > 0;
  const hasDomains = (await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='domain_areas'")).length > 0;

  console.log("Starting metadata migration to dynamic engine...");

  // 1. Core definitions
  await db.runAsync("INSERT OR IGNORE INTO metadata_definitions (slug, label, icon) VALUES ('category', 'Category', 'folder')");
  await db.runAsync("INSERT OR IGNORE INTO metadata_definitions (slug, label, icon) VALUES ('lifecycle', 'Lifecycle Phase', 'git-branch')");
  await db.runAsync("INSERT OR IGNORE INTO metadata_definitions (slug, label, icon) VALUES ('domain', 'Domain Area', 'globe')");

  const defs = await db.getAllAsync<{ id: number; slug: string }>("SELECT id, slug FROM metadata_definitions");
  const defMap: Record<string, number> = defs.reduce((acc, d) => ({ ...acc, [d.slug]: d.id }), {});

  // 2. Values
  const oldCats = await db.getAllAsync<{ slug: string; label: string; icon: string }>("SELECT * FROM categories");
  for (const c of oldCats) {
    await db.runAsync("INSERT OR IGNORE INTO metadata_values (def_id, slug, label, icon) VALUES (?, ?, ?, ?)", [defMap.category, c.slug, c.label, c.icon ?? null]);
  }

  if (hasPhases) {
    const oldPhases = await db.getAllAsync<{ slug: string; label: string }>("SELECT * FROM lifecycle_phases");
    for (const p of oldPhases) {
      await db.runAsync("INSERT OR IGNORE INTO metadata_values (def_id, slug, label) VALUES (?, ?, ?)", [defMap.lifecycle, p.slug, p.label]);
    }
  }

  if (hasDomains) {
    const oldDomains = await db.getAllAsync<{ slug: string; label: string }>("SELECT * FROM domain_areas");
    for (const d of oldDomains) {
      await db.runAsync("INSERT OR IGNORE INTO metadata_values (def_id, slug, label) VALUES (?, ?, ?)", [defMap.domain, d.slug, d.label]);
    }
  }

  // 3. Junction mapping
  const items = await db.getAllAsync<{ id: number; category: string; lifecyclePhases: string; domainAreas: string }>("SELECT id, category, lifecyclePhases, domainAreas FROM knowledge_items");
  for (const item of items) {
    // Category mapping
    const valObj = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE def_id = ? AND slug = ?", [defMap.category, item.category]);
    if (valObj) {
      await db.runAsync("INSERT OR IGNORE INTO item_metadata (item_id, val_id) VALUES (?, ?)", [item.id, valObj.id]);
    }

    // Phases mapping
    try {
      const phases = JSON.parse(item.lifecyclePhases || "[]");
      for (const pSlug of phases) {
        const v = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE def_id = ? AND slug = ?", [defMap.lifecycle, pSlug]);
        if (v) await db.runAsync("INSERT OR IGNORE INTO item_metadata (item_id, val_id) VALUES (?, ?)", [item.id, v.id]);
      }
    } catch (e) {}

    // Domains mapping
    try {
      const domains = JSON.parse(item.domainAreas || "[]");
      for (const dSlug of domains) {
        const v = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE def_id = ? AND slug = ?", [defMap.domain, dSlug]);
        if (v) await db.runAsync("INSERT OR IGNORE INTO item_metadata (item_id, val_id) VALUES (?, ?)", [item.id, v.id]);
      }
    } catch (e) {}
  }

  // Clean up
  await db.execAsync("DROP TABLE IF EXISTS categories");
  await db.execAsync("DROP TABLE IF EXISTS lifecycle_phases");
  await db.execAsync("DROP TABLE IF EXISTS domain_areas");
  console.log("Metadata engine migration complete!");
}

export async function initDatabase(): Promise<void> {
  const database = await getDb();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS metadata_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS metadata_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      def_id INTEGER NOT NULL,
      slug TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      UNIQUE(def_id, slug),
      FOREIGN KEY(def_id) REFERENCES metadata_definitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_metadata (
      item_id INTEGER NOT NULL,
      val_id INTEGER NOT NULL,
      PRIMARY KEY(item_id, val_id),
      FOREIGN KEY(item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
      FOREIGN KEY(val_id) REFERENCES metadata_values(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      category   TEXT    NOT NULL,
      tags       TEXT    NOT NULL,
      lifecyclePhases TEXT DEFAULT '[]',
      domainAreas TEXT DEFAULT '[]',
      links      TEXT    DEFAULT '[]',
      images     TEXT    DEFAULT '[]',
      createdAt  TEXT    NOT NULL,
      updatedAt  TEXT    NOT NULL
    );

    -- Ensure columns exist for older databases
    -- Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS directly in some versions, 
    -- so we use a robust approach by just trying to add them and catching errors or checking first.
  `);

  // Safely add missing columns if they don't exist
  let tableInfo = await database.getAllAsync<any>("PRAGMA table_info(knowledge_items)");
  let existingCols = tableInfo.map((col: any) => col.name);

  // Migration: Try RENAME COLUMN first (SQLite 3.25+)
  if (existingCols.includes('created_at') && !existingCols.includes('createdAt')) {
    try {
      await database.execAsync("ALTER TABLE knowledge_items RENAME COLUMN created_at TO createdAt;");
      console.log("Migrated legacy created_at to createdAt via RENAME");
    } catch (e) {
      console.log("RENAME COLUMN not supported, will use table rebuild.");
    }
  }
  if (existingCols.includes('updated_at') && !existingCols.includes('updatedAt')) {
    try {
      await database.execAsync("ALTER TABLE knowledge_items RENAME COLUMN updated_at TO updatedAt;");
      console.log("Migrated legacy updated_at to updatedAt via RENAME");
    } catch (e) {
      console.log("RENAME COLUMN not supported, will use table rebuild.");
    }
  }

  // Re-check columns after rename attempts
  tableInfo = await database.getAllAsync<any>("PRAGMA table_info(knowledge_items)");
  existingCols = tableInfo.map((col: any) => col.name);

  // Fallback: If legacy columns still exist, rebuild the table (works on all SQLite versions)
  const hasLegacyCreatedAt = existingCols.includes('created_at');
  const hasLegacyUpdatedAt = existingCols.includes('updated_at');

  if (hasLegacyCreatedAt || hasLegacyUpdatedAt) {
    console.log("Performing full table rebuild to migrate legacy timestamp columns...");
    try {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS knowledge_items_new (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          title           TEXT    NOT NULL,
          content         TEXT    NOT NULL,
          category        TEXT    NOT NULL DEFAULT 'other',
          tags            TEXT    NOT NULL DEFAULT '[]',
          lifecyclePhases TEXT    DEFAULT '[]',
          domainAreas     TEXT    DEFAULT '[]',
          links           TEXT    DEFAULT '[]',
          images          TEXT    DEFAULT '[]',
          createdAt       TEXT    NOT NULL DEFAULT '2024-01-01T00:00:00Z',
          updatedAt       TEXT    NOT NULL DEFAULT '2024-01-01T00:00:00Z'
        );

        INSERT INTO knowledge_items_new
          (id, title, content, category, tags, lifecyclePhases, domainAreas, links, images, createdAt, updatedAt)
        SELECT
          id,
          title,
          content,
          COALESCE(category, 'other'),
          COALESCE(tags, '[]'),
          COALESCE(lifecyclePhases, '[]'),
          COALESCE(domainAreas, '[]'),
          COALESCE(links, '[]'),
          COALESCE(images, '[]'),
          COALESCE(${hasLegacyCreatedAt ? 'created_at' : 'createdAt'}, '2024-01-01T00:00:00Z'),
          COALESCE(${hasLegacyUpdatedAt ? 'updated_at' : 'updatedAt'}, '2024-01-01T00:00:00Z')
        FROM knowledge_items;

        DROP TABLE knowledge_items;
        ALTER TABLE knowledge_items_new RENAME TO knowledge_items;
      `);
      // Refresh column list after rebuild
      tableInfo = await database.getAllAsync<any>("PRAGMA table_info(knowledge_items)");
      existingCols = tableInfo.map((col: any) => col.name);
      console.log("Table rebuild complete. Legacy timestamps migrated.");
    } catch (e) {
      console.error("Table rebuild failed:", e);
    }
  }

  const requiredCols = [
    { name: 'lifecyclePhases', type: "TEXT DEFAULT '[]'" },
    { name: 'domainAreas', type: "TEXT DEFAULT '[]'" },
    { name: 'links', type: "TEXT DEFAULT '[]'" },
    { name: 'images', type: "TEXT DEFAULT '[]'" },
  ];

  for (const col of requiredCols) {
    if (!existingCols.includes(col.name)) {
      try {
        await database.execAsync(`ALTER TABLE knowledge_items ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Successfully added missing column: ${col.name}`);
      } catch (e) {
        console.error(`Error adding column ${col.name}:`, e);
      }
    }
  }

  await runMigration(database);
  await seedDatabase();
}

async function getItemMetadata(db: SQLite.SQLiteDatabase, itemId: number): Promise<Record<string, string[]>> {
  const meta = await db.getAllAsync<{ def_slug: string, val_slug: string }>(`
    SELECT d.slug as def_slug, v.slug as val_slug 
    FROM item_metadata im
    JOIN metadata_values v ON im.val_id = v.id
    JOIN metadata_definitions d ON v.def_id = d.id
    WHERE im.item_id = ?
  `, [itemId]);
  
  const result: Record<string, string[]> = {};
  for (const row of meta) {
    if (!result[row.def_slug]) result[row.def_slug] = [];
    result[row.def_slug].push(row.val_slug);
  }
  return result;
}

export async function getAllItems(): Promise<KnowledgeItem[]> {
  const db = await getDb();
  const items = await db.getAllAsync<any>("SELECT * FROM knowledge_items ORDER BY updatedAt DESC");
  
  const results: KnowledgeItem[] = [];
  for (const item of items) {
    const metadata = await getItemMetadata(db, item.id);
    results.push({
      ...item,
      tags: JSON.parse(item.tags || "[]"),
      links: JSON.parse(item.links || "[]"),
      images: JSON.parse(item.images || "[]"),
      lifecyclePhases: metadata.lifecycle || [],
      domainAreas: metadata.domain || [],
      metadata
    });
  }
  return results;
}

export async function createItem(input: CreateItemInput): Promise<KnowledgeItem> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  const result = await db.runAsync(
    "INSERT INTO knowledge_items (title, content, category, tags, lifecyclePhases, domainAreas, links, images, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      input.title,
      input.content,
      input.category,
      JSON.stringify(input.tags || []),
      JSON.stringify(input.lifecyclePhases || []),
      JSON.stringify(input.domainAreas || []),
      JSON.stringify(input.links || []),
      JSON.stringify(input.images || []),
      now,
      now,
    ]
  );

  const id = result.lastInsertRowId;

  // Save metadata to junction table
  if (input.category) {
    const val = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE slug = ? AND def_id = (SELECT id FROM metadata_definitions WHERE slug = 'category')", [input.category]);
    if (val) await db.runAsync("INSERT INTO item_metadata (item_id, val_id) VALUES (?, ?)", [id, val.id]);
  }

  for (const p of input.lifecyclePhases || []) {
    const val = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE slug = ? AND def_id = (SELECT id FROM metadata_definitions WHERE slug = 'lifecycle')", [p]);
    if (val) await db.runAsync("INSERT INTO item_metadata (item_id, val_id) VALUES (?, ?)", [id, val.id]);
  }

  for (const d of input.domainAreas || []) {
    const val = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE slug = ? AND def_id = (SELECT id FROM metadata_definitions WHERE slug = 'domain')", [d]);
    if (val) await db.runAsync("INSERT INTO item_metadata (item_id, val_id) VALUES (?, ?)", [id, val.id]);
  }

  if (input.customMetadata) {
    for (const [defSlug, valSlugs] of Object.entries(input.customMetadata)) {
      if (defSlug === 'category' || defSlug === 'lifecycle' || defSlug === 'domain') continue;
      for (const vSlug of valSlugs) {
        const val = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE slug = ? AND def_id = (SELECT id FROM metadata_definitions WHERE slug = ?)", [vSlug, defSlug]);
        if (val) await db.runAsync("INSERT INTO item_metadata (item_id, val_id) VALUES (?, ?)", [id, val.id]);
      }
    }
  }

  return {
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
    lifecyclePhases: input.lifecyclePhases || [],
    domainAreas: input.domainAreas || [],
    links: input.links || [],
  } as KnowledgeItem;
}

export async function updateItem(id: number, input: CreateItemInput): Promise<KnowledgeItem> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  await db.runAsync(
    "UPDATE knowledge_items SET title = ?, content = ?, category = ?, tags = ?, lifecyclePhases = ?, domainAreas = ?, links = ?, images = ?, updatedAt = ? WHERE id = ?",
    [
      input.title,
      input.content,
      input.category,
      JSON.stringify(input.tags || []),
      JSON.stringify(input.lifecyclePhases || []),
      JSON.stringify(input.domainAreas || []),
      JSON.stringify(input.links || []),
      JSON.stringify(input.images || []),
      now,
      id
    ]
  );

  // Refresh metadata relations: delete old, insert new
  await db.runAsync("DELETE FROM item_metadata WHERE item_id = ?", [id]);

  if (input.category) {
    const val = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE slug = ? AND def_id = (SELECT id FROM metadata_definitions WHERE slug = 'category')", [input.category]);
    if (val) await db.runAsync("INSERT INTO item_metadata (item_id, val_id) VALUES (?, ?)", [id, val.id]);
  }

  for (const p of input.lifecyclePhases || []) {
    const val = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE slug = ? AND def_id = (SELECT id FROM metadata_definitions WHERE slug = 'lifecycle')", [p]);
    if (val) await db.runAsync("INSERT INTO item_metadata (item_id, val_id) VALUES (?, ?)", [id, val.id]);
  }

  for (const d of input.domainAreas || []) {
    const val = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE slug = ? AND def_id = (SELECT id FROM metadata_definitions WHERE slug = 'domain')", [d]);
    if (val) await db.runAsync("INSERT INTO item_metadata (item_id, val_id) VALUES (?, ?)", [id, val.id]);
  }

  if (input.customMetadata) {
    for (const [defSlug, valSlugs] of Object.entries(input.customMetadata)) {
      if (defSlug === 'category' || defSlug === 'lifecycle' || defSlug === 'domain') continue;
      for (const vSlug of valSlugs) {
        const val = await db.getFirstAsync<{ id: number }>("SELECT id FROM metadata_values WHERE slug = ? AND def_id = (SELECT id FROM metadata_definitions WHERE slug = ?)", [vSlug, defSlug]);
        if (val) await db.runAsync("INSERT INTO item_metadata (item_id, val_id) VALUES (?, ?)", [id, val.id]);
      }
    }
  }

  return {
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
    lifecyclePhases: input.lifecyclePhases || [],
    domainAreas: input.domainAreas || [],
    links: input.links || [],
  } as KnowledgeItem;
}

export async function deleteItem(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM knowledge_items WHERE id = ?", [id]);
}

export async function getAllMetadataDefinitions(): Promise<MetadataDefinition[]> {
  const db = await getDb();
  return db.getAllAsync<MetadataDefinition>("SELECT * FROM metadata_definitions ORDER BY id ASC");
}

export async function getMetadataValues(defId: number): Promise<MetadataValue[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>("SELECT * FROM metadata_values WHERE def_id = ? ORDER BY id ASC", [defId]);
  return rows.map(r => ({ ...r, defId: r.def_id }));
}

export async function addMetadataDefinition(slug: string, label: string, icon?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT INTO metadata_definitions (slug, label, icon) VALUES (?, ?, ?)", [slug, label, icon ?? null]);
}

export async function updateMetadataDefinition(id: number, label: string, icon?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE metadata_definitions SET label = ?, icon = ? WHERE id = ?", [label, icon ?? null, id]);
}

export async function addMetadataValue(defId: number, slug: string, label: string, color?: string, icon?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT INTO metadata_values (def_id, slug, label, color, icon) VALUES (?, ?, ?, ?, ?)", [defId, slug, label, color ?? null, icon ?? null]);
}

export async function updateMetadataValue(id: number, label: string, color?: string, icon?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE metadata_values SET label = ?, color = ?, icon = ? WHERE id = ?", [label, color ?? null, icon ?? null, id]);
}

export async function deleteMetadata(type: "def" | "val", id: number): Promise<void> {
  const db = await getDb();
  if (type === "def") {
    await db.runAsync("DELETE FROM metadata_definitions WHERE id = ?", [id]);
  } else {
    await db.runAsync("DELETE FROM metadata_values WHERE id = ?", [id]);
  }
}

export async function seedDatabase(): Promise<void> {
  const db = await getDb();
  
  // Basic defs
  await db.runAsync("INSERT OR IGNORE INTO metadata_definitions (slug, label, icon) VALUES ('category', 'Category', 'folder')");
  await db.runAsync("INSERT OR IGNORE INTO metadata_definitions (slug, label, icon) VALUES ('lifecycle', 'Lifecycle Phase', 'git-branch')");
  await db.runAsync("INSERT OR IGNORE INTO metadata_definitions (slug, label, icon) VALUES ('domain', 'Domain Area', 'globe')");

  const defs = await db.getAllAsync<{ id: number; slug: string }>("SELECT id, slug FROM metadata_definitions");
  const defMap: Record<string, number> = defs.reduce((acc, d) => ({ ...acc, [d.slug]: d.id }), {});

  // Seed default values if empty
  const valCount: { count: number } | null = await db.getFirstAsync("SELECT COUNT(*) as count FROM metadata_values");
  if (valCount && valCount.count === 0) {
    // Categories
    const cats = [
      { slug: "tips", label: "Tip", icon: "zap" },
      { slug: "terms", label: "Term", icon: "book-open" },
      { slug: "tutorials", label: "Tutorial", icon: "play-circle" },
      { slug: "tools", label: "Tool", icon: "tool" },
      { slug: "frameworks", label: "Framework", icon: "code" },
      { slug: "other", label: "Other", icon: "file-text" },
    ];
    for (const c of cats) {
      await db.runAsync("INSERT INTO metadata_values (def_id, slug, label, icon) VALUES (?, ?, ?, ?)", [defMap.category, c.slug, c.label, c.icon ?? null]);
    }

    // Phases
    const phases = ["Plan", "Design", "Implement", "Test", "Publish"];
    for (const p of phases) {
      await db.runAsync("INSERT INTO metadata_values (def_id, slug, label) VALUES (?, ?, ?)", [defMap.lifecycle, p.toLowerCase(), p]);
    }

    // Domains
    const domains = ["Security", "AI", "Mobile", "Desktop", "Web", "Backend", "DevOps", "Database"];
    for (const d of domains) {
      await db.runAsync("INSERT INTO metadata_values (def_id, slug, label) VALUES (?, ?, ?)", [defMap.domain, d.toLowerCase(), d]);
    }
  }
}

export async function clearAllVaultData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM item_metadata");
    await db.execAsync("DELETE FROM metadata_values");
    await db.execAsync("DELETE FROM metadata_definitions");
    await db.execAsync("DELETE FROM knowledge_items");
    // SQLite resets rowids automatically if tables are truncated this way
  });
}

export async function exportVaultData(): Promise<string> {
  const db = await getDb();
  const items = await db.getAllAsync<any>("SELECT * FROM knowledge_items");
  const definitions = await db.getAllAsync<any>("SELECT * FROM metadata_definitions");
  const values = await db.getAllAsync<any>("SELECT * FROM metadata_values");
  const itemMetadata = await db.getAllAsync<any>("SELECT * FROM item_metadata");

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    definitions,
    values,
    itemMetadata
  };
  
  return JSON.stringify(data, null, 2);
}

export async function importVaultData(jsonStr: string): Promise<void> {
  const db = await getDb();
  const data = JSON.parse(jsonStr);
  
  if (!data.items || !data.definitions || !data.values) {
    throw new Error("Invalid Vault Data Format");
  }

  await db.withTransactionAsync(async () => {
    // 1. Wipe everything
    await db.execAsync("DELETE FROM item_metadata");
    await db.execAsync("DELETE FROM metadata_values");
    await db.execAsync("DELETE FROM metadata_definitions");
    await db.execAsync("DELETE FROM knowledge_items");

    // 2. Import Definitions & map IDs
    const defIdMap: Record<number, number> = {};
    for (const def of data.definitions) {
      const res = await db.runAsync(
        "INSERT INTO metadata_definitions (slug, label, icon) VALUES (?, ?, ?)",
        [def.slug, def.label, def.icon]
      );
      defIdMap[def.id] = res.lastInsertRowId;
    }

    // 3. Import Values & map IDs
    const valIdMap: Record<number, number> = {};
    for (const val of data.values) {
      const newDefId = defIdMap[val.def_id];
      if (!newDefId) continue;
      const res = await db.runAsync(
        "INSERT INTO metadata_values (def_id, slug, label, color, icon) VALUES (?, ?, ?, ?, ?)",
        [newDefId, val.slug, val.label, val.color, val.icon]
      );
      valIdMap[val.id] = res.lastInsertRowId;
    }

    // 4. Import Items & map IDs
    const itemIdMap: Record<number, number> = {};
    for (const item of data.items) {
      const res = await db.runAsync(
        "INSERT INTO knowledge_items (title, content, category, tags, lifecyclePhases, domainAreas, links, images, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [item.title, item.content, item.category, item.tags, item.lifecyclePhases, item.domainAreas, item.links, item.images, item.createdAt, item.updatedAt]
      );
      itemIdMap[item.id] = res.lastInsertRowId;
    }

    // 5. Import Junction Mapping
    if (data.itemMetadata) {
      for (const im of data.itemMetadata) {
        const newItemId = itemIdMap[im.item_id];
        const newValId = valIdMap[im.val_id];
        if (newItemId && newValId) {
          await db.runAsync(
            "INSERT OR IGNORE INTO item_metadata (item_id, val_id) VALUES (?, ?)",
            [newItemId, newValId]
          );
        }
      }
    }
  });
}
