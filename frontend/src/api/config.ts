import { api } from "./client";
import type {
  DryingRecommendation,
  DryingSessionCreate,
  DryingSessionRead,
  DryingSessionUpdate,
  FilamentSpool,
  Location,
  MaterialProfile,
  Printer,
  Sensor,
  SpoolAssignment,
} from "../types/api";

export const materialsApi = {
  list: () => api.get<MaterialProfile[]>("/materials"),
  create: (body: Partial<MaterialProfile>) => api.post<MaterialProfile>("/materials", body),
  update: (id: number, body: Partial<MaterialProfile>) =>
    api.patch<MaterialProfile>(`/materials/${id}`, body),
  remove: (id: number) => api.delete(`/materials/${id}`),
};

export const printersApi = {
  list: () => api.get<Printer[]>("/printers"),
  create: (body: Partial<Printer>) => api.post<Printer>("/printers", body),
  update: (id: number, body: Partial<Printer>) => api.patch<Printer>(`/printers/${id}`, body),
  remove: (id: number) => api.delete(`/printers/${id}`),
};

export const locationsApi = {
  list: () => api.get<Location[]>("/locations"),
  create: (body: Partial<Location>) => api.post<Location>("/locations", body),
  update: (id: number, body: Partial<Location>) => api.patch<Location>(`/locations/${id}`, body),
  remove: (id: number) => api.delete(`/locations/${id}`),
};

export const spoolsApi = {
  list: () => api.get<FilamentSpool[]>("/spools"),
  create: (body: Partial<FilamentSpool>) => api.post<FilamentSpool>("/spools", body),
  update: (id: number, body: Partial<FilamentSpool>) =>
    api.patch<FilamentSpool>(`/spools/${id}`, body),
  remove: (id: number) => api.delete(`/spools/${id}`),
};

export const assignmentsApi = {
  list: () => api.get<SpoolAssignment[]>("/assignments"),
  create: (body: Partial<SpoolAssignment>) => api.post<SpoolAssignment>("/assignments", body),
  update: (id: number, body: Partial<SpoolAssignment>) =>
    api.patch<SpoolAssignment>(`/assignments/${id}`, body),
  remove: (id: number) => api.delete(`/assignments/${id}`),
};

export const sensorsApi = {
  list: () => api.get<Sensor[]>("/sensors"),
};

export const dryingApi = {
  recommendations: () => api.get<DryingRecommendation[]>("/drying/recommendations"),
  sessions: {
    list: (params?: { spoolId?: number; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.spoolId !== undefined) query.set("spool_id", String(params.spoolId));
      if (params?.status) query.set("status", params.status);
      const qs = query.toString();
      return api.get<DryingSessionRead[]>(`/drying/sessions${qs ? `?${qs}` : ""}`);
    },
    create: (body: DryingSessionCreate) => api.post<DryingSessionRead>("/drying/sessions", body),
    update: (id: number, body: DryingSessionUpdate) =>
      api.patch<DryingSessionRead>(`/drying/sessions/${id}`, body),
  },
};
