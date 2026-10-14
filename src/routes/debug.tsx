import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Terminal, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/debug")({
  component: GeminiDebugPage,
});

interface LogEntry {
  type: "info" | "success" | "error" | "warn";
  message: string;
  data?: any;
}

function GeminiDebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [workingModel, setWorkingModel] = useState<string | null>(null);

  const rawKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY;

  const addLog = (type: LogEntry["type"], message: string, data?: any) => {
    setLogs((prev) => [...prev, { type, message, data }]);
  };

  const runDiagnostics = async () => {
    setLogs([]);
    setIsRunning(true);
    setWorkingModel(null);

    addLog("info", "Starting Gemini API Key Diagnostics...");

    // 1. Verify Key presence and format
    if (!rawKey) {
      addLog("error", "VITE_GEMINI_API_KEY is not defined in your environment!");
      addLog("info", "Please make sure your .env file is in the root directory and contains: VITE_GEMINI_API_KEY=AQ.Ab8...");
      setIsRunning(false);
      return;
    }

    const keyMasked = `${rawKey.slice(0, 10)}...${rawKey.slice(-6)}`;
    addLog("info", `Detected Key: ${keyMasked} (Total length: ${rawKey.length})`);

    // 2. Query Google's ModelService (ListModels)
    addLog("info", "Querying Google ModelService: https://generativelanguage.googleapis.com/v1beta/models");
    let availableModels: string[] = [];

    try {
      const listRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        method: "GET",
        headers: {
          "x-goog-api-key": rawKey.trim(),
        },
      });

      addLog("info", `ListModels response status: ${listRes.status} ${listRes.statusText}`);
      const listData = await listRes.json();

      if (!listRes.ok) {
        addLog("error", `ListModels call failed with status ${listRes.status}`, listData);
      } else if (listData.models && Array.isArray(listData.models)) {
        availableModels = listData.models
          .map((m: any) => m.name.replace("models/", ""))
          .filter((name: string) => name.toLowerCase().includes("gemini"));

        addLog("success", `Found ${availableModels.length} Gemini models accessible by this key!`, availableModels);
      } else {
        addLog("warn", "Unexpected response from ListModels", listData);
      }
    } catch (err: any) {
      addLog("error", "Network error while calling ListModels endpoint", err.message);
    }

    // 3. Test generateContent
    const testList = availableModels.length > 0
      ? availableModels.slice(0, 5)
      : ["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro"];

    addLog("info", `Testing 'generateContent' against candidate models: ${testList.join(", ")}`);

    let foundSuccess = false;

    for (const modelName of testList) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

      try {
        addLog("info", `[Testing ${modelName}] Sending POST request...`);

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": rawKey.trim(),
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: "Hello! Reply with only: 'Gemini is online and working!'" }],
              },
            ],
          }),
        });

        const data = await res.json();

        if (res.ok) {
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          addLog("success", `SUCCESS with model [${modelName}]!`, reply);
          setWorkingModel(modelName);
          foundSuccess = true;
          break; // Stop testing once a working model is found
        } else {
          addLog("warn", `[${modelName}] Failed with code ${res.status}`, data.error?.message || data);
        }
      } catch (err: any) {
        addLog("error", `[${modelName}] Network fetch threw error`, err.message);
      }
    }

    if (!foundSuccess) {
      addLog("error", "All candidate models returned errors. Review the specific error details above.");
    }

    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-mono text-xs">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <Terminal className="h-5 w-5" /> Gemini API Diagnostics
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Live validation for <code>VITE_GEMINI_API_KEY</code>
            </p>
          </div>

          <button
            type="button"
            disabled={isRunning}
            onClick={runDiagnostics}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 text-xs transition cursor-pointer"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>Run Test</span>
          </button>
        </header>

        {workingModel && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-bold text-sm">Working Model Identified:</p>
              <p className="text-xs text-emerald-300">
                Set your endpoint model parameter to: <span className="underline font-bold">{workingModel}</span>
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span>Execution Console</span>
            <span>{logs.length} entries</span>
          </div>

          {logs.length === 0 ? (
            <p className="text-slate-500 py-8 text-center">
              Click &quot;Run Test&quot; above to inspect your API key and fetch the model roster.
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-lg border text-left leading-relaxed ${
                    log.type === "success"
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : log.type === "error"
                      ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                      : log.type === "warn"
                      ? "bg-amber-950/40 border-amber-500/30 text-amber-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {log.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />}
                    {log.type === "error" && <XCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-semibold">{log.message}</p>
                      {log.data && (
                        <pre className="mt-2 p-2 rounded bg-black/60 text-[11px] overflow-x-auto text-slate-400">
                          {typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GeminiDebugPage;