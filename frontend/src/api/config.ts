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
  create: (body: Partial<Sensor>) => api.post<Sensor>("/sensors", body),
  update: (id: number, body: Partial<Sensor>) => api.patch<Sensor>(`/sensors/${id}`, body),
  remove: (id: number) => api.delete(`/sensors/${id}`),
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
