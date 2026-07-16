import { useState } from "react";
import { Copy, Pencil, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditSensorModal } from "@/components/EditSensorModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoticeBanner } from "@/components/NoticeBanner";
import { SensorForm, type SensorFormValues } from "@/components/SensorForm";
import { useNotice } from "@/hooks/useNotice";
import { useLocations } from "@/hooks/resources/locations";
import { usePrinters } from "@/hooks/resources/printers";
import {
  useArchiveSensor,
  useCreateSensor,
  useDuplicateSensor,
  useSensors,
  useTestReadSensor,
  useUpdateSensor,
} from "@/hooks/resources/sensors";
import { buildLocationOptions } from "@/lib/sensorLocation";
import { formatHumidity, formatTemperature } from "@/lib/format";
import type { Sensor, SensorTestReadResult } from "@/types/api";

const EMPTY_SENSOR: SensorFormValues = {
  name: "",
  model: "",
  serial_number: "",
  sensor_type: "mock",
  port: "",
  location_id: "",
  is_active: true,
};

const NO_LOCATION = "none";

export function Sensors() {
  const { data: sensors = [] } = useSensors();
  const { data: locations = [] } = useLocations();
  const { data: printers = [] } = usePrinters();
  const { notice, notifySuccess, notifyError } = useNotice();

  const createSensor = useCreateSensor();
  const archiveSensor = useArchiveSensor();
  const duplicateSensor = useDuplicateSensor();
  const updateSensor = useUpdateSensor();
  const testRead = useTestReadSensor();
  const locationOptions = buildLocationOptions(locations, printers);

  const [newSensor, setNewSensor] = useState(EMPTY_SENSOR);
  const [testResults, setTestResults] = useState<Record<number, SensorTestReadResult>>({});

  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [sensorDraft, setSensorDraft] = useState<SensorFormValues>(EMPTY_SENSOR);

  function handleAddSensor(e: React.FormEvent) {
    e.preventDefault();
    if (!newSensor.name.trim() || !newSensor.serial_number.trim()) {
      notifyError("Name and serial number are required.");
      return;
    }
    createSensor.mutate(
      {
        name: newSensor.name,
        model: newSensor.model,
        serial_number: newSensor.serial_number,
        sensor_type: newSensor.sensor_type,
        port: newSensor.port || null,
        is_active: newSensor.is_active,
        location_id: newSensor.location_id ? Number(newSensor.location_id) : null,
      },
      {
        onSuccess: () => {
          notifySuccess(`Sensor "${newSensor.name}" added.`);
          setNewSensor(EMPTY_SENSOR);
        },
        onError: (err) => notifyError(err.message),
      },
    );
  }

  function handleDelete(id: number) {
    archiveSensor.mutate(id, {
      onSuccess: () => notifySuccess("Sensor deleted."),
      onError: (err) => notifyError(err.message),
    });
  }

  function handleDuplicate(id: number) {
    duplicateSensor.mutate(id, {
      onSuccess: () => notifySuccess("Sensor duplicated."),
      onError: (err) => notifyError(err.message),
    });
  }

  function handleTestRead(id: number) {
    testRead.mutate(id, {
      onSuccess: (result) => setTestResults((prev) => ({ ...prev, [id]: result })),
      onError: (err) => notifyError(err.message),
    });
  }

  function handleLocationChange(id: number, value: string) {
    updateSensor.mutate(
      { id, body: { location_id: value === NO_LOCATION ? null : Number(value) } },
      { onError: (err) => notifyError(err.message) },
    );
  }

  function openEdit(sensor: Sensor) {
    setEditingSensor(sensor);
    setSensorDraft({
      name: sensor.name,
      model: sensor.model,
      serial_number: sensor.serial_number,
      sensor_type: sensor.sensor_type,
      port: sensor.port ?? "",
      location_id: sensor.location_id ? String(sensor.location_id) : "",
      is_active: sensor.is_active,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSensor || !sensorDraft.name.trim() || !sensorDraft.serial_number.trim()) {
      notifyError("Name and serial number are required.");
      return;
    }
    updateSensor.mutate(
      {
        id: editingSensor.id,
        body: {
          name: sensorDraft.name,
          model: sensorDraft.model,
          serial_number: sensorDraft.serial_number,
          sensor_type: sensorDraft.sensor_type,
          port: sensorDraft.port || null,
          is_active: sensorDraft.is_active,
          location_id: sensorDraft.location_id ? Number(sensorDraft.location_id) : null,
        },
      },
      {
        onSuccess: () => {
          notifySuccess(`Sensor "${sensorDraft.name}" updated.`);
          setEditingSensor(null);
        },
        onError: (err) => notifyError(err.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-heading font-semibold">Sensors</h1>
      <NoticeBanner notice={notice} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="size-4 text-muted-foreground" />
            Configured sensors
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Test read</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sensors.map((s) => {
                const result = testResults[s.id];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.serial_number}</TableCell>
                    <TableCell>{s.sensor_type}</TableCell>
                    <TableCell>{s.port ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={s.location_id ? String(s.location_id) : NO_LOCATION}
                        onValueChange={(value) => handleLocationChange(s.id, value)}
                      >
                        <SelectTrigger size="sm" className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_LOCATION}>No location</SelectItem>
                          {locationOptions.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.is_active ? "ok" : "unknown"} label={s.is_active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestRead(s.id)}
                          disabled={testRead.isPending}
                        >
                          Test
                        </Button>
                        {result &&
                          (result.success ? (
                            <span className="text-xs text-ok">
                              {formatTemperature(result.temperature_c)} / {formatHumidity(result.relative_humidity_percent)}
                            </span>
                          ) : (
                            <span className="text-xs text-destructive">{result.error}</span>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDuplicate(s.id)}>
                          <Copy className="size-3.5" />
                          Duplicate
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <SensorForm
            value={newSensor}
            onChange={setNewSensor}
            onSubmit={handleAddSensor}
            locations={locations}
            printers={printers}
            submitting={createSensor.isPending}
          />
        </CardContent>
      </Card>

      {editingSensor && (
        <EditSensorModal
          open
          onOpenChange={(open) => !open && setEditingSensor(null)}
          value={sensorDraft}
          onChange={setSensorDraft}
          onSubmit={handleEditSubmit}
          locations={locations}
          printers={printers}
          submitting={updateSensor.isPending}
        />
      )}
    </div>
  );
}
