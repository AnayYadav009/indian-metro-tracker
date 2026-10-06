import { create } from "zustand";
import type { Status, SegmentProperties, StationProperties } from "@/types/schema";

export type SelectedFeature =
  | { type: "segment"; data: SegmentProperties }
  | { type: "station"; data: StationProperties };

export interface HoveredFeature {
  type: "segment" | "station";
  id: string;
  name: string;
  status: Status;
  color?: string;
  x: number;
  y: number;
}

export interface MetroStoreState {
  // Filter state
  selectedCityId: string | null;
  selectedStatuses: Status[];
  selectedPhases: string[];
  searchQuery: string;

  // Interaction & selection state
  selectedFeature: SelectedFeature | null;
  hoveredFeature: HoveredFeature | null;

  // Filter actions
  setSelectedCity: (cityId: string | null) => void;
  toggleStatus: (status: Status) => void;
  setStatuses: (statuses: Status[]) => void;
  togglePhase: (phase: string) => void;
  setPhases: (phases: string[]) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  // Selection actions
  setSelectedFeature: (feature: SelectedFeature | null) => void;
  clearSelectedFeature: () => void;
  setHoveredFeature: (hovered: HoveredFeature | null) => void;
}

const DEFAULT_STATUSES: Status[] = ["operational", "construction", "planned"];

export const useMetroStore = create<MetroStoreState>((set) => ({
  selectedCityId: null,
  selectedStatuses: DEFAULT_STATUSES,
  selectedPhases: [],
  searchQuery: "",
  selectedFeature: null,
  hoveredFeature: null,

  setSelectedCity: (cityId) =>
    set({
      selectedCityId: cityId,
      // Reset selected phases when changing city because phases are city-specific
      selectedPhases: [],
    }),

  toggleStatus: (status) =>
    set((state) => {
      const exists = state.selectedStatuses.includes(status);
      if (exists) {
        // Don't remove if it's the only one active to avoid empty map confusion
        if (state.selectedStatuses.length === 1) {
          return state;
        }
        return {
          selectedStatuses: state.selectedStatuses.filter((s) => s !== status),
        };
      }
      return { selectedStatuses: [...state.selectedStatuses, status] };
    }),

  setStatuses: (statuses) => set({ selectedStatuses: statuses }),

  togglePhase: (phase) =>
    set((state) => {
      const exists = state.selectedPhases.includes(phase);
      if (exists) {
        return {
          selectedPhases: state.selectedPhases.filter((p) => p !== phase),
        };
      }
      return { selectedPhases: [...state.selectedPhases, phase] };
    }),

  setPhases: (phases) => set({ selectedPhases: phases }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  resetFilters: () =>
    set({
      selectedCityId: null,
      selectedStatuses: DEFAULT_STATUSES,
      selectedPhases: [],
      searchQuery: "",
    }),

  setSelectedFeature: (feature) => set({ selectedFeature: feature }),

  clearSelectedFeature: () => set({ selectedFeature: null }),

  setHoveredFeature: (hovered) =>
    set((state) => {
      if (!state.hoveredFeature && !hovered) return state;
      if (state.hoveredFeature?.id === hovered?.id) return state;
      return { hoveredFeature: hovered };
    }),
}));
