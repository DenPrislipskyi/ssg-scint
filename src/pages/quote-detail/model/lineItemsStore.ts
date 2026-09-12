import { create } from 'zustand';

import type { LineId } from '@/entities/quote/model/types';

interface LineItemsUiState {
  /** Рядок під клавіатурним фокусом. */
  focusedLineId: LineId | null;
  /** Рядок із розгорнутим комбобоксом пошуку по каталогу. */
  comboboxLineId: LineId | null;
  /** Рядок із відкритим дропдауном постачальників. */
  supplierDropdownLineId: LineId | null;
  /** Рядок із розгорнутими деталями. */
  expandedLineId: LineId | null;

  catalogQuery: string;
  supplierQuery: string;
  /** Підсвічений елемент у комбобоксі (для ↑/↓ і Enter). */
  highlightedIndex: number;

  focus: (lineId: LineId | null) => void;
  openCombobox: (lineId: LineId | null) => void;
  openSupplierDropdown: (lineId: LineId | null) => void;
  toggleExpanded: (lineId: LineId) => void;
  expand: (lineId: LineId) => void;
  setCatalogQuery: (query: string) => void;
  setSupplierQuery: (query: string) => void;
  setHighlightedIndex: (index: number) => void;
  closeOverlays: () => void;
}

/** Ефемерний UI-стан таблиці Line Items. Нічого доменного тут не зберігається. */
export const useLineItemsStore = create<LineItemsUiState>((set) => ({
  focusedLineId: null,
  comboboxLineId: null,
  supplierDropdownLineId: null,
  expandedLineId: null,
  catalogQuery: '',
  supplierQuery: '',
  highlightedIndex: 0,

  focus: (focusedLineId) => set({ focusedLineId }),
  openCombobox: (comboboxLineId) =>
    set({
      comboboxLineId,
      supplierDropdownLineId: null,
      catalogQuery: '',
      highlightedIndex: 0,
      ...(comboboxLineId ? { focusedLineId: comboboxLineId } : {}),
    }),
  openSupplierDropdown: (supplierDropdownLineId) =>
    set({
      supplierDropdownLineId,
      comboboxLineId: null,
      supplierQuery: '',
      ...(supplierDropdownLineId ? { focusedLineId: supplierDropdownLineId } : {}),
    }),
  toggleExpanded: (lineId) =>
    set((state) => ({
      expandedLineId: state.expandedLineId === lineId ? null : lineId,
      focusedLineId: lineId,
    })),
  expand: (lineId) => set({ expandedLineId: lineId, focusedLineId: lineId }),
  setCatalogQuery: (catalogQuery) => set({ catalogQuery, highlightedIndex: 0 }),
  setSupplierQuery: (supplierQuery) => set({ supplierQuery }),
  setHighlightedIndex: (highlightedIndex) => set({ highlightedIndex }),
  closeOverlays: () => set({ comboboxLineId: null, supplierDropdownLineId: null }),
}));
