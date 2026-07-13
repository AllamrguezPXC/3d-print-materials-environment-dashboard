import { useState } from "react";
import { Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoticeBanner } from "@/components/NoticeBanner";
import { SensorForm, type SensorFormValues } from "@/components/SensorForm";
import { useNotice } from "@/hooks/useNotice";
import { useLocations } from "@/hooks/resources/locations";
import { usePrinters } from "@/hooks/resources/printers";
import {
  useCreateSensor,
  useRemoveSensor,
  useSensors,
  useTestReadSensor,
} from "@/hooks/resources/sensors";
import { describeSensorLocation } from "@/lib/sensorLocation";
import type { SensorTestReadResult } from "@/types/api";

const EMPTY_SENSOR: SensorFormValues = {
  name: "",
  model: "",
  serial_number: "",
  sensor_type: "mock",
  port: "",
  location_id: "",
};

export function Sensors() {
  const { data: sensors = [] } = useSensors();
  const { data: locations = [] } = useLocations();
  const { data: printers = [] } = usePrinters();
  const { notice, notifySuccess, notifyError } = useNotice();

  const createSensor = useCreateSensor();
  const removeSensor = useRemoveSensor();
  const testRead = useTestReadSensor();

  const [newSensor, setNewSensor] = useState(EMPTY_SENSOR);
  const [testResults, setTestResults] = useState<Record<number, SensorTestReadResult>>({});

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
        is_active: true,
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
    removeSensor.mutate(id, {
      onSuccess: () => notifySuccess("Sensor deleted."),
      onError: (err) => notifyError(err.message),
    });
  }

  function handleTestRead(id: number) {
    testRead.mutate(id, {
      onSuccess: (result) => setTestResults((prev) => ({ ...prev, [id]: result })),
      onError: (err) => notifyError(err.message),
    });
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
                      {(() => {
                        const location = locations.find((l) => l.id === s.location_id);
                        return location ? describeSensorLocation(location, printers) : "—";
                      })()}
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
                              {result.temperature_c?.toFixed(1)}°C / {result.relative_humidity_percent?.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-destructive">{result.error}</span>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                        Delete
                      </Button>
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
    </div>
  );
}
