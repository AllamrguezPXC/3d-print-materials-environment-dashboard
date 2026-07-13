import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Alerts } from "./pages/Alerts";
import { Dashboard } from "./pages/Dashboard";
import { Drying } from "./pages/Drying";
import { History } from "./pages/History";
import { Materials } from "./pages/Materials";
import { PrinterDetail } from "./pages/PrinterDetail";
import { Printers } from "./pages/Printers";
import { Sensors } from "./pages/Sensors";
import { Settings } from "./pages/Settings";
import { Spools } from "./pages/Spools";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="printers" element={<Printers />} />
          <Route path="printers/:id" element={<PrinterDetail />} />
          <Route path="materials" element={<Materials />} />
          <Route path="spools" element={<Spools />} />
          <Route path="sensors" element={<Sensors />} />
          <Route path="drying" element={<Drying />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
