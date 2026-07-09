import { useEffect, useState } from "react";
import { NoticeBanner } from "../components/NoticeBanner";
import { useNotice } from "../hooks/useNotice";
import { locationsApi, printersApi } from "../api/config";
import type { Location, Printer } from "../types/api";

const BAMBU_MODELS = ["A1 mini", "P1S", "P1P", "X1 Carbon", "Other"];
const LOCATION_TYPES = ["printer_ams", "printer_external_spool", "storage_box", "dry_box", "dryer", "room"];

export function Printers() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const { notice, notifySuccess, notifyError } = useNotice();

  const [newPrinter, setNewPrinter] = useState({ name: "", brand: "Bambu Lab", model: BAMBU_MODELS[0] });
  const [newLocation, setNewLocation] = useState({ name: "", location_type: LOCATION_TYPES[0], printer_id: "" });

  async function refresh() {
    try {
      const [p, l] = await Promise.all([printersApi.list(), locationsApi.list()]);
      setPrinters(p);
      setLocations(l);
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAddPrinter(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrinter.name.trim()) {
      notifyError("Printer name is required.");
      return;
    }
    try {
      await printersApi.create(newPrinter);
      setNewPrinter({ name: "", brand: "Bambu Lab", model: BAMBU_MODELS[0] });
      notifySuccess(`Printer "${newPrinter.name}" added.`);
      refresh();
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocation.name.trim()) {
      notifyError("Location name is required.");
      return;
    }
    try {
      await locationsApi.create({
        name: newLocation.name,
        location_type: newLocation.location_type,
        printer_id: newLocation.printer_id ? Number(newLocation.printer_id) : null,
      });
      setNewLocation({ name: "", location_type: LOCATION_TYPES[0], printer_id: "" });
      notifySuccess(`Location "${newLocation.name}" added.`);
      refresh();
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  async function handleDeletePrinter(id: number) {
    try {
      await printersApi.remove(id);
      notifySuccess("Printer deleted.");
      refresh();
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  async function handleDeleteLocation(id: number) {
    try {
      await locationsApi.remove(id);
      notifySuccess("Location deleted.");
      refresh();
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Printers & Locations</h2>
      <NoticeBanner notice={notice} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-label">Printers</div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Brand</th>
              <th>Model</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {printers.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.brand}</td>
                <td>{p.model}</td>
                <td>
                  <button onClick={() => handleDeletePrinter(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={handleAddPrinter} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            placeholder="Name (e.g. A1 mini #5)"
            value={newPrinter.name}
            onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
          />
          <input
            placeholder="Brand"
            value={newPrinter.brand}
            onChange={(e) => setNewPrinter({ ...newPrinter, brand: e.target.value })}
          />
          <select
            value={newPrinter.model}
            onChange={(e) => setNewPrinter({ ...newPrinter, model: e.target.value })}
          >
            {BAMBU_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button className="primary" type="submit">
            Add printer
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-label">Locations</div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Printer</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.location_type}</td>
                <td>{printers.find((p) => p.id === l.printer_id)?.name ?? "—"}</td>
                <td>
                  <button onClick={() => handleDeleteLocation(l.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={handleAddLocation} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            placeholder="Name (e.g. AMS Slot 2)"
            value={newLocation.name}
            onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
          />
          <select
            value={newLocation.location_type}
            onChange={(e) => setNewLocation({ ...newLocation, location_type: e.target.value })}
          >
            {LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={newLocation.printer_id}
            onChange={(e) => setNewLocation({ ...newLocation, printer_id: e.target.value })}
          >
            <option value="">No printer</option>
            {printers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="primary" type="submit">
            Add location
          </button>
        </form>
      </div>
    </div>
  );
}
