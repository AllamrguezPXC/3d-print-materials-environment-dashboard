import { api } from "./client";
import type {
  AlertOut,
  AlertResolveResponse,
  DryingRecommendation,
  DryingSessionCreate,
  DryingSessionRead,
  DryingSessionUpdate,
  FilamentSpool,
  Location,
  MaterialProfile,
  Printer,
  Sensor,
  SensorPortInfo,
  SensorTestReadResult,
  SpoolAssignment,
} from "../types/api";

export const materialsApi = {
  list: (params?: { deletedOnly?: boolean }) =>
    api.get<MaterialProfile[]>(`/materials${params?.deletedOnly ? "?deleted_only=true" : ""}`),
  create: (body: Partial<MaterialProfile>) => api.post<MaterialProfile>("/materials", body),
  update: (id: number, body: Partial<MaterialProfile>) =>
    api.patch<MaterialProfile>(`/materials/${id}`, body),
  remove: (id: number) => api.delete(`/materials/${id}`),
  archive: (id: number) => api.post<MaterialProfile>(`/materials/${id}/archive`),
  restore: (id: number) => api.post<MaterialProfile>(`/materials/${id}/restore`),
  duplicate: (id: number) => api.post<MaterialProfile>(`/materials/${id}/duplicate`),
};

export const printersApi = {
  list: (params?: { deletedOnly?: boolean }) =>
    api.get<Printer[]>(`/printers${params?.deletedOnly ? "?deleted_only=true" : ""}`),
  create: (body: Partial<Printer>) => api.post<Printer>("/printers", body),
  update: (id: number, body: Partial<Printer>) => api.patch<Printer>(`/printers/${id}`, body),
  remove: (id: number) => api.delete(`/printers/${id}`),
  archive: (id: number) => api.post<Printer>(`/printers/${id}/archive`),
  restore: (id: number) => api.post<Printer>(`/printers/${id}/restore`),
  duplicate: (id: number) => api.post<Printer>(`/printers/${id}/duplicate`),
};

export const locationsApi = {
  list: (params?: { deletedOnly?: boolean }) =>
    api.get<Location[]>(`/locations${params?.deletedOnly ? "?deleted_only=true" : ""}`),
  create: (body: Partial<Location>) => api.post<Location>("/locations", body),
  update: (id: number, body: Partial<Location>) => api.patch<Location>(`/locations/${id}`, body),
  remove: (id: number) => api.delete(`/locations/${id}`),
  archive: (id: number) => api.post<Location>(`/locations/${id}/archive`),
  restore: (id: number) => api.post<Location>(`/locations/${id}/restore`),
  duplicate: (id: number) => api.post<Location>(`/locations/${id}/duplicate`),
};

export const spoolsApi = {
  list: (params?: { deletedOnly?: boolean }) =>
    api.get<FilamentSpool[]>(`/spools${params?.deletedOnly ? "?deleted_only=true" : ""}`),
  create: (body: Partial<FilamentSpool>) => api.post<FilamentSpool>("/spools", body),
  update: (id: number, body: Partial<FilamentSpool>) =>
    api.patch<FilamentSpool>(`/spools/${id}`, body),
  remove: (id: number) => api.delete(`/spools/${id}`),
  archive: (id: number) => api.post<FilamentSpool>(`/spools/${id}/archive`),
  restore: (id: number) => api.post<FilamentSpool>(`/spools/${id}/restore`),
  duplicate: (id: number) => api.post<FilamentSpool>(`/spools/${id}/duplicate`),
};

export const assignmentsApi = {
  list: () => api.get<SpoolAssignment[]>("/assignments"),
  create: (body: Partial<SpoolAssignment>) => api.post<SpoolAssignment>("/assignments", body),
  update: (id: number, body: Partial<SpoolAssignment>) =>
    api.patch<SpoolAssignment>(`/assignments/${id}`, body),
  remove: (id: number) => api.delete(`/assignments/${id}`),
};

export const sensorsApi = {
  list: (params?: { deletedOnly?: boolean }) =>
    api.get<Sensor[]>(`/sensors${params?.deletedOnly ? "?deleted_only=true" : ""}`),
  create: (body: Partial<Sensor>) => api.post<Sensor>("/sensors", body),
  update: (id: number, body: Partial<Sensor>) => api.patch<Sensor>(`/sensors/${id}`, body),
  remove: (id: number) => api.delete(`/sensors/${id}`),
  archive: (id: number) => api.post<Sensor>(`/sensors/${id}/archive`),
  restore: (id: number) => api.post<Sensor>(`/sensors/${id}/restore`),
  duplicate: (id: number) => api.post<Sensor>(`/sensors/${id}/duplicate`),
  ports: () => api.get<SensorPortInfo[]>("/sensors/ports"),
  testRead: (id: number) => api.post<SensorTestReadResult>(`/sensors/${id}/test-read`),
};

export const alertsApi = {
  list: (params?: { isActive?: boolean; severity?: string; locationId?: number }) => {
    const query = new URLSearchParams();
    if (params?.isActive !== undefined) query.set("is_active", String(params.isActive));
    if (params?.severity) query.set("severity", params.severity);
    if (params?.locationId !== undefined) query.set("location_id", String(params.locationId));
    const qs = query.toString();
    return api.get<AlertOut[]>(`/alerts${qs ? `?${qs}` : ""}`);
  },
  resolve: (id: number) => api.patch<AlertResolveResponse>(`/alerts/${id}/resolve`, {}),
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
