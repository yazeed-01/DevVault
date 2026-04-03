import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  MetadataDefinition,
  MetadataValue,
  CreateItemInput,
  KnowledgeItem,
  createItem,
  deleteItem,
  getAllItems,
  getAllMetadataDefinitions,
  getMetadataValues,
  addMetadataDefinition,
  updateMetadataDefinition,
  addMetadataValue as dbAddMetadataValue,
  updateMetadataValue as dbUpdateMetadataValue,
  deleteMetadata as dbDeleteMetadata,
  initDatabase,
  seedDatabase,
  updateItem as dbUpdateItem,
  exportVaultData,
  importVaultData as dbImportVaultData,
  clearAllVaultData as dbClearAllVaultData,
} from "@/lib/database";

interface VaultContextValue {
  items: KnowledgeItem[];
  definitions: MetadataDefinition[];
  metadataValues: Record<string, MetadataValue[]>; // defSlug -> values
  loading: boolean;
  initialized: boolean;
  refresh: () => Promise<void>;
  addItem: (input: CreateItemInput) => Promise<KnowledgeItem>;
  editItem: (id: number, input: CreateItemInput) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  search: (query: string) => Promise<KnowledgeItem[]>;
  
  // Dynamic Metadata CRUD
  addDefinition: (label: string, icon?: string) => Promise<void>;
  updateDefinition: (id: number, label: string, icon?: string) => Promise<void>;
  removeDefinition: (id: number) => Promise<void>;
  
  addValue: (defId: number, label: string, color?: string, icon?: string) => Promise<void>;
  updateValue: (id: number, label: string, color?: string, icon?: string) => Promise<void>;
  removeValue: (id: number) => Promise<void>;

  // Data Management
  exportData: () => Promise<string>;
  importData: (jsonStr: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [definitions, setDefinitions] = useState<MetadataDefinition[]>([]);
  const [metadataValues, setMetadataValues] = useState<Record<string, MetadataValue[]>>({});
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const refresh = useCallback(async () => {
    const allItems = await getAllItems();
    const allDefs = await getAllMetadataDefinitions();
    
    const valuesMap: Record<string, MetadataValue[]> = {};
    for (const def of allDefs) {
      const values = await getMetadataValues(def.id);
      valuesMap[def.slug] = values;
    }
    
    setItems(allItems);
    setDefinitions(allDefs);
    setMetadataValues(valuesMap);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await seedDatabase();
        await refresh();
        setInitialized(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const addItem = useCallback(
    async (input: CreateItemInput) => {
      const item = await createItem(input);
      await refresh();
      return item;
    },
    [refresh]
  );

  const editItem = useCallback(
    async (id: number, input: CreateItemInput) => {
      await dbUpdateItem(id, input);
      await refresh();
    },
    [refresh]
  );

  const search = useCallback(
    async (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return items;
      return items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    },
    [items]
  );

  const removeItem = useCallback(
    async (id: number) => {
      await deleteItem(id);
      await refresh();
    },
    [refresh]
  );

  const addDefinition = useCallback(async (label: string, icon?: string) => {
    const slug = label.toLowerCase().replace(/\s+/g, '-');
    await addMetadataDefinition(slug, label, icon);
    await refresh();
  }, [refresh]);

  const updateDefinition = useCallback(async (id: number, label: string, icon?: string) => {
    await updateMetadataDefinition(id, label, icon);
    await refresh();
  }, [refresh]);

  const removeDefinition = useCallback(async (id: number) => {
    await dbDeleteMetadata("def", id);
    await refresh();
  }, [refresh]);

  const addValue = useCallback(async (defId: number, label: string, color?: string, icon?: string) => {
    const slug = label.toLowerCase().replace(/\s+/g, '-');
    await dbAddMetadataValue(defId, slug, label, color, icon);
    await refresh();
  }, [refresh]);

  const updateValue = useCallback(async (id: number, label: string, color?: string, icon?: string) => {
    await dbUpdateMetadataValue(id, label, color, icon);
    await refresh();
  }, [refresh]);

  const removeValue = useCallback(async (id: number) => {
    await dbDeleteMetadata("val", id);
    await refresh();
  }, [refresh]);

  const exportData = useCallback(async () => {
    return await exportVaultData();
  }, []);

  const importData = useCallback(async (jsonStr: string) => {
    await dbImportVaultData(jsonStr);
    await refresh();
  }, [refresh]);

  const clearAllData = useCallback(async () => {
    await dbClearAllVaultData();
    await refresh();
  }, [refresh]);

  return (
    <VaultContext.Provider
      value={{
        items,
        definitions,
        metadataValues,
        loading,
        initialized,
        refresh,
        addItem,
        editItem,
        removeItem,
        search,
        addDefinition,
        updateDefinition,
        removeDefinition,
        addValue,
        updateValue,
        removeValue,
        exportData,
        importData,
        clearAllData,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
