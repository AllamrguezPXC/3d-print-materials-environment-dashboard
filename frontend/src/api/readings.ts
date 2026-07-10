import { api } from "./client";
import type { CurrentReadingsResponse, ReadingsHistoryResponse } from "../types/api";

export function getCurrentReading(): Promise<CurrentReadingsResponse> {
  return api.get<CurrentReadingsResponse>("/readings/current");
}

export function captureReading(): Promise<unknown> {
  return api.post("/readings");
}

export interface HistoryParams {
  from: string;
  to: string;
  sensorId?: number;
  locationId?: number;
  aggregate?: "none" | "hour";
}

export function getReadingsHistory(params: HistoryParams): Promise<ReadingsHistoryResponse> {
  const query = new URLSearchParams({ from: params.from, to: params.to });
  if (params.sensorId !== undefined) query.set("sensor_id", String(params.sensorId));
  if (params.locationId !== undefined) query.set("location_id", String(params.locationId));
  if (params.aggregate) query.set("aggregate", params.aggregate);
  return api.get<ReadingsHistoryResponse>(`/readings?${query.toString()}`);
}
