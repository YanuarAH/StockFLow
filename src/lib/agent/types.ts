export interface MatchedStockItem {
  rawName: string;
  matchedProductId: string | null;
  matchedProductName: string;
  matchedSku: string;
  unit: string;
  inferredCategory: string;
  confidence: number; // 0 - 100
  qty: number;
  unitCost: number;
  previousCost: number;
  currentStock: number;
}

export interface CustomExcelPayload {
  filename: string;
  title: string;
  description: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface AnomalyItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPrice: number;
  soldLast14Days: number;
  dailyBurnRate: number;
  daysUntilStockout: number | null;
  recommendedRestockQty: number;
  estimatedRestockCost: number;
  status: "CRITICAL" | "WARNING" | "ANOMALY_NEGATIVE_MARGIN" | "SAFE";
  reason: string;
}

export interface ChatTurn {
  role: "user" | "agent";
  text: string;
}

export interface AgentResult {
  reply: string;
  toolUsed?: string;
  stockInDraft?: MatchedStockItem[];
  excelPayload?: CustomExcelPayload;
  anomalies?: AnomalyItem[];
  suggestions?: string[];
}

export interface AgentResponse extends AgentResult {
  engine: "gemini" | "lokal";
}

export interface ProductSnapshot {
  id: string;
  sku: string;
  name: string;
  categoryName?: string;
  unit: string;
  stock: number;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  sold14d: number;
  sold30d: number;
  profit30d: number;
}

export interface PeriodTotals {
  revenue: number;
  profit: number;
  txCount: number;
}

export interface StoreSnapshot {
  storeName: string;
  today: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
  products: ProductSnapshot[];
  categories?: string[];
}

