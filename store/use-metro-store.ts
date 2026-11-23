import { create } from "zustand";
import type {
  Status,
  SegmentProperties,
  StationProperties,
} from "@/types/schema";

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
  showStations: boolean;

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
  toggleStations: () => void;

  // Timeline state
  selectedYear: number | null;
  isPlayingTimeline: boolean;
  includeFuture: boolean;

  // Selection actions
  setSelectedFeature: (feature: SelectedFeature | null) => void;
  clearSelectedFeature: () => void;
  setHoveredFeature: (hovered: HoveredFeature | null) => void;

  // Timeline actions
  setSelectedYear: (year: number | null) => void;
  setIsPlayingTimeline: (isPlaying: boolean) => void;
  togglePlayTimeline: () => void;
  setIncludeFuture: (include: boolean) => void;
}

const DEFAULT_STATUSES: Status[] = ["operational", "construction", "planned"];

export const useMetroStore = create<MetroStoreState>((set) => ({
  selectedCityId: null,
  selectedStatuses: DEFAULT_STATUSES,
  selectedPhases: [],
  searchQuery: "",
  showStations: true,
  selectedFeature: null,
  hoveredFeature: null,
  selectedYear: null,
  isPlayingTimeline: false,
  includeFuture: true,

  setSelectedCity: (cityId) =>
    set((state) => ({
      selectedCityId: cityId,
      selectedPhases: [],
      ...(cityId !== null &&
      state.selectedFeature &&
      state.selectedFeature.data.city_id !== cityId
        ? { selectedFeature: null }
        : {}),
    })),

  toggleStatus: (status) =>
    set((state) => {
      const { selectedStatuses } = state;
      const isSelected = selectedStatuses.includes(status);
      // Keep at least one status active.
      if (isSelected && selectedStatuses.length === 1) return state;
      return {
        selectedStatuses: isSelected
          ? selectedStatuses.filter((selected) => selected !== status)
          : [...selectedStatuses, status],
      };
    }),

  setStatuses: (statuses) => set({ selectedStatuses: statuses }),

  togglePhase: (phase) =>
    set(({ selectedPhases }) => ({
      selectedPhases: selectedPhases.includes(phase)
        ? selectedPhases.filter((selected) => selected !== phase)
        : [...selectedPhases, phase],
    })),

  setPhases: (phases) => set({ selectedPhases: phases }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  resetFilters: () =>
    set({
      selectedCityId: null,
      selectedStatuses: DEFAULT_STATUSES,
      selectedPhases: [],
      searchQuery: "",
      selectedYear: null,
      isPlayingTimeline: false,
    }),

  toggleStations: () =>
    set((state) => {
      const showStations = !state.showStations;
      return {
        showStations,
        ...(showStations || state.selectedFeature?.type !== "station"
          ? {}
          : { selectedFeature: null }),
      };
    }),

  setSelectedFeature: (feature) => set({ selectedFeature: feature }),

  clearSelectedFeature: () => set({ selectedFeature: null }),

  setHoveredFeature: (hovered) =>
    set((state) => {
      const current = state.hoveredFeature;
      if (
        current?.type === hovered?.type &&
        current?.id === hovered?.id &&
        current?.name === hovered?.name &&
        current?.status === hovered?.status &&
        current?.color === hovered?.color &&
        current?.x === hovered?.x &&
        current?.y === hovered?.y
      ) {
        return state;
      }
      return { hoveredFeature: hovered };
    }),

  setSelectedYear: (year) => set({ selectedYear: year }),

  setIsPlayingTimeline: (isPlaying) => set({ isPlayingTimeline: isPlaying }),

  togglePlayTimeline: () =>
    set((state) => ({ isPlayingTimeline: !state.isPlayingTimeline })),

  setIncludeFuture: (include) => set({ includeFuture: include }),
}));
