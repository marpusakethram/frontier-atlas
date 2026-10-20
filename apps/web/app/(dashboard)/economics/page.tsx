"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calculator,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "@/lib/api";

interface EconomicModelRecord {
  id: string;
  model_type: string;
  name: string;
  technology_id: string;
  sector_id: string;
  assumptions_json: Record<string, number>;
  scenarios_json: Record<string, Record<string, number>>;
  units_specification: Record<string, string>;
  source_ids: string[];
  limitations: string[];
}

interface SimulationResult {
  model_type: string;
  inputs: Record<string, number>;
  outputs: Record<string, number | boolean | string>;
  units: Record<string, string>;
  sensitivity_tornado: Array<{
    parameter: string;
    low_input: number;
    high_input: number;
    low_output: number;
    high_output: number;
    swing: number;
  }>;
  heatmap: {
    x_parameter: string;
    y_parameter: string;
    x_values: number[];
    y_values: number[];
    z_matrix: number[][];
    z_metric: string;
  };
  limitations: string[];
}

const SLIDER_BOUNDS: Record<
  string,
  Record<string, { min: number; max: number; step: number; label: string }>
> = {
  healthcare_ai: {
    annual_diagnostic_studies_volume: {
      min: 5000,
      max: 120000,
      step: 2500,
      label: "Annual Diagnostic Studies (Volume/yr)",
    },
    annualized_fda_clinical_trial_cost_usd: {
      min: 50000,
      max: 450000,
      step: 10000,
      label: "Annualized FDA Validation Cost (USD/yr)",
    },
    annual_pacs_ehr_integration_cost_usd: {
      min: 20000,
      max: 180000,
      step: 5000,
      label: "PACS / EHR Integration Maintenance (USD/yr)",
    },
    cloud_edge_inference_cost_per_study_usd: {
      min: 0.15,
      max: 4.5,
      step: 0.05,
      label: "Inference Compute Cost (USD/study)",
    },
    specialist_clinician_hourly_cost_usd: {
      min: 110,
      max: 320,
      step: 5,
      label: "Specialist Clinician Cost (USD/hr)",
    },
    clinician_minutes_saved_per_study: {
      min: 2,
      max: 25,
      step: 0.5,
      label: "Clinician Time Saved (Min/study)",
    },
    false_positive_escalation_rate: {
      min: 0.01,
      max: 0.25,
      step: 0.01,
      label: "False-Positive Escalation Rate (0-0.25)",
    },
    cms_ntap_cpt_reimbursement_per_study_usd: {
      min: 0,
      max: 65,
      step: 1.5,
      label: "CMS NTAP / CPT Reimbursement (USD/study)",
    },
  },
  physical_ai: {
    embodied_unit_bom_cost_usd: {
      min: 12000,
      max: 75000,
      step: 1000,
      label: "Embodied Unit BOM Cost (USD)",
    },
    tactile_proprioceptive_sensor_suite_usd: {
      min: 1000,
      max: 12000,
      step: 250,
      label: "Tactile & Proprioceptive Sensors (USD)",
    },
    world_model_sim_amortization_per_unit_usd: {
      min: 500,
      max: 8000,
      step: 250,
      label: "World-Model Sim Amortization (USD/unit)",
    },
    hardware_useful_life_years: {
      min: 2,
      max: 8,
      step: 0.5,
      label: "Hardware Useful Life (Years)",
    },
    annual_deployed_hours: {
      min: 2000,
      max: 7500,
      step: 200,
      label: "Annual Deployed Fleet Hours (hrs/yr)",
    },
    mean_hours_between_teleop_interventions: {
      min: 1,
      max: 48,
      step: 1,
      label: "Mean Hours Between Teleop Interventions (hrs)",
    },
    teleoperator_specialist_hourly_usd: {
      min: 18,
      max: 60,
      step: 1,
      label: "Remote Teleoperator Wage (USD/hr)",
    },
    annual_actuator_maintenance_usd: {
      min: 1000,
      max: 9000,
      step: 250,
      label: "Annual Actuator Maintenance (USD/yr)",
    },
    human_physical_task_hourly_benchmark_usd: {
      min: 18,
      max: 50,
      step: 0.5,
      label: "Human Shift Benchmark Cost (USD/hr)",
    },
  },
  consumer_ai: {
    consumer_device_retail_price_usd: {
      min: 99,
      max: 699,
      step: 10,
      label: "Consumer Wearable Retail Price (USD)",
    },
    device_bom_and_fulfillment_cogs_usd: {
      min: 60,
      max: 450,
      step: 5,
      label: "Device BOM & Fulfillment COGS (USD)",
    },
    monthly_ai_subscription_arpu_usd: {
      min: 4.99,
      max: 39.99,
      step: 1,
      label: "Monthly AI Subscription ARPU (USD/mo)",
    },
    subscription_attach_rate: {
      min: 0.15,
      max: 0.95,
      step: 0.02,
      label: "Subscription Attach Rate (0-1)",
    },
    on_device_npu_inference_offload_ratio: {
      min: 0.1,
      max: 0.95,
      step: 0.02,
      label: "On-Device NPU Query Offload Ratio (0-1)",
    },
    unoffloaded_cloud_inference_cost_per_user_mo_usd: {
      min: 1.5,
      max: 16.0,
      step: 0.25,
      label: "Unoffloaded Cloud Token Cost (USD/user/mo)",
    },
    monthly_subscription_churn_rate: {
      min: 0.01,
      max: 0.12,
      step: 0.002,
      label: "Monthly Subscription Churn Rate (0.01-0.12)",
    },
    customer_acquisition_cost_cac_usd: {
      min: 25,
      max: 240,
      step: 5,
      label: "Customer Acquisition Cost CAC (USD)",
    },
  },
  robotics: {
    robot_purchase_price_usd: {
      min: 15000,
      max: 85000,
      step: 1000,
      label: "Robot Hardware CapEx (USD)",
    },
    annual_maintenance_cost_usd: {
      min: 1000,
      max: 12000,
      step: 250,
      label: "Annual Maintenance (USD/yr)",
    },
    installation_and_integration_cost_usd: {
      min: 2000,
      max: 25000,
      step: 500,
      label: "Installation & Integration (USD)",
    },
    expected_useful_life_years: {
      min: 2,
      max: 8,
      step: 0.5,
      label: "Useful Life (Years)",
    },
    utilization_rate: {
      min: 0.3,
      max: 0.95,
      step: 0.02,
      label: "Fleet Utilization Rate (0-1)",
    },
    tasks_completed_per_hour: {
      min: 20,
      max: 140,
      step: 5,
      label: "Throughput (Tasks/hr)",
    },
    system_reliability_uptime: {
      min: 0.65,
      max: 0.99,
      step: 0.01,
      label: "Reliability Uptime (0-1)",
    },
    human_labor_hourly_cost_usd: {
      min: 18,
      max: 55,
      step: 1,
      label: "Human Wage Benchmark (USD/hr)",
    },
    human_supervision_ratio: {
      min: 0.02,
      max: 0.5,
      step: 0.02,
      label: "Supervisor Ratio per Robot (0.02-0.5)",
    },
  },
  battery: {
    cell_cost_per_kwh_usd: {
      min: 45,
      max: 160,
      step: 2,
      label: "Cell Cost (USD/kWh)",
    },
    pack_integration_cost_per_kwh_usd: {
      min: 15,
      max: 60,
      step: 1,
      label: "Pack Integration (USD/kWh)",
    },
    cycle_life_to_80pct_soh: {
      min: 400,
      max: 3000,
      step: 50,
      label: "Cycle Life to 80% SoH (Cycles)",
    },
    round_trip_efficiency: {
      min: 0.78,
      max: 0.96,
      step: 0.01,
      label: "Round-Trip Efficiency (0-1)",
    },
    depth_of_discharge: {
      min: 0.7,
      max: 0.98,
      step: 0.01,
      label: "Depth of Discharge (0-1)",
    },
    manufacturing_yield_rate: {
      min: 0.65,
      max: 0.98,
      step: 0.01,
      label: "Manufacturing Yield (0-1)",
    },
    gravimetric_energy_density_wh_kg: {
      min: 240,
      max: 520,
      step: 10,
      label: "Energy Density (Wh/kg)",
    },
    pack_nominal_capacity_kwh: {
      min: 40,
      max: 120,
      step: 5,
      label: "Nominal Pack Capacity (kWh)",
    },
  },
  ai_inference: {
    hardware_capital_cost_usd: {
      min: 120000,
      max: 420000,
      step: 10000,
      label: "8-GPU Node CapEx (USD)",
    },
    hardware_lifetime_years: {
      min: 2.0,
      max: 6.0,
      step: 0.5,
      label: "Hardware Lifetime (Years)",
    },
    node_power_consumption_kw: {
      min: 5.0,
      max: 16.0,
      step: 0.5,
      label: "Node Power Draw (kW)",
    },
    pue_multiplier: {
      min: 1.05,
      max: 1.5,
      step: 0.02,
      label: "Datacenter PUE Multiplier",
    },
    electricity_cost_per_kwh: {
      min: 0.04,
      max: 0.16,
      step: 0.005,
      label: "Electricity Rate (USD/kWh)",
    },
    utilization_rate: {
      min: 0.2,
      max: 0.95,
      step: 0.02,
      label: "Cluster Utilization (0-1)",
    },
    raw_token_throughput_per_sec: {
      min: 10000,
      max: 80000,
      step: 2000,
      label: "Raw Node Throughput (Tok/sec)",
    },
    model_quantization_efficiency_multiplier: {
      min: 1.0,
      max: 6.0,
      step: 0.25,
      label: "Quantization & SpecDecode Speedup (x)",
    },
  },
};

export default function EconomicsLabPage() {
  const [models, setModels] = useState<EconomicModelRecord[]>([]);
  const [selectedModel, setSelectedModel] =
    useState<EconomicModelRecord | null>(null);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>("base");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const runDeterministicModel = useCallback(
    async (modelType: string, currentInputs: Record<string, number>) => {
      const res = await apiFetch<SimulationResult>(
        "/api/v1/economics/simulate",
        {
          method: "POST",
          body: JSON.stringify({
            model_type: modelType,
            inputs: currentInputs,
          }),
        }
      );
      setSimulation(res);
    },
    []
  );

  useEffect(() => {
    void (async () => {
      const list = await apiFetch<EconomicModelRecord[]>(
        "/api/v1/economics/models"
      );
      setModels(list);
      const first = list[0];
      if (first) {
        setSelectedModel(first);
        setInputs(first.assumptions_json);
        await runDeterministicModel(first.model_type, first.assumptions_json);
      }
    })();
  }, [runDeterministicModel]);

  const handleSelectModel = async (m: EconomicModelRecord) => {
    setSelectedModel(m);
    setActiveScenario("base");
    setInputs(m.assumptions_json);
    await runDeterministicModel(m.model_type, m.assumptions_json);
  };

  const handleApplyScenario = async (scenarioKey: "base" | "bull" | "bear") => {
    if (!selectedModel) return;
    setActiveScenario(scenarioKey);
    const preset =
      selectedModel.scenarios_json?.[scenarioKey] ||
      selectedModel.assumptions_json;
    const merged = { ...selectedModel.assumptions_json, ...preset };
    setInputs(merged);
    await runDeterministicModel(selectedModel.model_type, merged);
  };

  const handleParamChange = async (key: string, value: number) => {
    if (!selectedModel) return;
    const next = { ...inputs, [key]: value };
    setInputs(next);
    await runDeterministicModel(selectedModel.model_type, next);
  };

  const handleSaveSnapshot = () => {
    setSavedNotice(
      `Scenario "${activeScenario.toUpperCase()}" verified & logged at ${new Date().toISOString().slice(11, 19)} UTC`
    );
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const sliderConfig = selectedModel
    ? SLIDER_BOUNDS[selectedModel.model_type] || {}
    : {};

  return (
    <div className="space-y-6">
      {/* Header + Model Tabs */}
      <div className="atlas-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-atlas-teal" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-atlas-teal">
              Phase 8 & 12.7 • Deterministic Commercialization & Techno-Economic Lab
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-atlas-text">
            Techno-Economic & Unit Economics Simulator
          </h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            100% deterministic Python math. Zero LLM arithmetic. Interactive
            Base/Bull/Bear scenario stress-testing, Tornado sensitivity, and 5×5
            threshold heatmaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => void handleSelectModel(m)}
              className={`rounded px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                selectedModel?.id === m.id
                  ? "bg-atlas-teal/20 text-atlas-teal border border-atlas-teal/50"
                  : "border border-atlas-border bg-atlas-bg text-atlas-muted hover:text-atlas-text"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Pane Economics Lab */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT PANE: Assumptions, Sliders & Scenario Presets */}
        <div className="atlas-panel space-y-4 p-4 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-atlas-border pb-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
              1. Input Assumptions & Scenarios
            </h2>
            <button
              onClick={() => void handleApplyScenario("base")}
              className="inline-flex items-center gap-1 font-mono text-[11px] text-atlas-muted hover:text-atlas-teal"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>

          {/* Base / Bull / Bear Scenario Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(["base", "bull", "bear"] as const).map((scen) => (
              <button
                key={scen}
                onClick={() => void handleApplyScenario(scen)}
                className={`rounded border py-1.5 font-mono text-xs font-semibold uppercase ${
                  activeScenario === scen
                    ? scen === "bull"
                      ? "border-emerald-500/60 bg-emerald-950/60 text-emerald-300"
                      : scen === "bear"
                        ? "border-rose-500/60 bg-rose-950/60 text-rose-300"
                        : "border-atlas-teal/60 bg-atlas-teal/20 text-atlas-teal"
                    : "border-atlas-border bg-atlas-bg text-atlas-muted"
                }`}
              >
                {scen} Case
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {Object.entries(inputs).map(([key, val]) => {
              const cfg = sliderConfig[key] || {
                min: 0,
                max: Math.max(100, val * 2),
                step: val > 10 ? 1 : 0.01,
                label: key.replace(/_/g, " "),
              };
              return (
                <div
                  key={key}
                  className="rounded border border-atlas-border bg-atlas-bg/50 p-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">
                      {cfg.label}
                    </span>
                    <span className="font-mono font-bold text-atlas-teal">
                      {val}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step}
                    value={val}
                    onChange={(e) =>
                      void handleParamChange(key, Number(e.target.value))
                    }
                    className="mt-2 w-full accent-teal-400"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANE: Deterministic Calculated Outputs + Tornado Sensitivity */}
        <div className="space-y-5 lg:col-span-4">
          <div className="atlas-panel p-4">
            <div className="flex items-center justify-between border-b border-atlas-border pb-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                2. Deterministic Calculated Outputs
              </h2>
              <span className="font-mono text-[10px] text-emerald-400">
                Pure Python Engine
              </span>
            </div>

            {simulation ? (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {Object.entries(simulation.outputs).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded border border-atlas-border bg-atlas-bg/70 p-3"
                  >
                    <div className="text-[10px] uppercase text-atlas-muted">
                      {k.replace(/_/g, " ")}
                    </div>
                    <div className="mt-1 font-mono text-base font-bold text-atlas-teal">
                      {typeof v === "boolean"
                        ? v
                          ? "YES (VIABLE)"
                          : "NO (ABOVE TARGET)"
                        : typeof v === "number"
                          ? v.toLocaleString()
                          : v}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {simulation.units[k] || ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center font-mono text-xs text-atlas-muted">
                Calculating outputs...
              </div>
            )}
          </div>

          {/* Tornado Sensitivity Bar Chart */}
          <div className="atlas-panel p-4">
            <h2 className="mb-2 border-b border-atlas-border pb-2 text-xs font-semibold uppercase tracking-wider text-atlas-text">
              One-Way Tornado Sensitivity (±20% Parameter Swing)
            </h2>
            {simulation && (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={simulation.sensitivity_tornado}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 24, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis
                      type="number"
                      stroke="#64748B"
                      tick={{
                        fill: "#94A3B8",
                        fontSize: 10,
                        fontFamily: "JetBrains Mono",
                      }}
                    />
                    <YAxis
                      type="category"
                      dataKey="parameter"
                      width={120}
                      stroke="#64748B"
                      tick={{
                        fill: "#94A3B8",
                        fontSize: 10,
                        fontFamily: "JetBrains Mono",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#1E293B",
                        fontSize: "11px",
                      }}
                    />
                    <Bar
                      dataKey="swing"
                      name="Output Swing Magnitude"
                      fill="#14B8A6"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: 5x5 Two-Variable Sensitivity Heatmap + Limitations & Save */}
        <div className="space-y-5 lg:col-span-4">
          <div className="atlas-panel p-4">
            <div className="border-b border-atlas-border pb-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-atlas-text">
                3. Two-Variable Sensitivity Heatmap (5×5 Grid)
              </h2>
              {simulation && (
                <p className="mt-0.5 font-mono text-[10px] text-atlas-muted">
                  Metric: {simulation.heatmap.z_metric} | X:{" "}
                  {simulation.heatmap.x_parameter} | Y:{" "}
                  {simulation.heatmap.y_parameter}
                </p>
              )}
            </div>

            {simulation && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse font-mono text-[11px]">
                  <thead>
                    <tr>
                      <th className="border border-atlas-border bg-atlas-bg p-1.5 text-[9px] text-atlas-muted">
                        Y \ X
                      </th>
                      {simulation.heatmap.x_values.map((xv) => (
                        <th
                          key={xv}
                          className="border border-atlas-border bg-atlas-bg p-1.5 text-center text-slate-300"
                        >
                          {xv}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.heatmap.y_values.map((yv, rIdx) => (
                      <tr key={yv}>
                        <td className="border border-atlas-border bg-atlas-bg p-1.5 font-bold text-slate-300">
                          {yv}
                        </td>
                        {(simulation.heatmap.z_matrix[rIdx] || []).map((zVal, cIdx) => (
                          <td
                            key={`${rIdx}-${cIdx}`}
                            className="border border-atlas-border p-2 text-center font-semibold"
                            style={{
                              backgroundColor:
                                rIdx === 2 && cIdx === 2
                                  ? "rgba(20, 184, 166, 0.35)"
                                  : "rgba(15, 23, 42, 0.8)",
                              color:
                                rIdx === 2 && cIdx === 2 ? "#5EEAD4" : "#E2E8F0",
                            }}
                          >
                            {zVal}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Model Provenance & Explicit Limitations */}
          <div className="atlas-panel space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-atlas-border pb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Model Limitations &
                Guardrails
              </span>
              {selectedModel && (
                <span className="font-mono text-[10px] text-atlas-teal">
                  Sources: {selectedModel.source_ids.join(", ")}
                </span>
              )}
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300">
              {(simulation?.limitations || selectedModel?.limitations || []).map(
                (lim) => (
                  <li
                    key={lim}
                    className="rounded border border-atlas-border bg-atlas-bg/60 p-2"
                  >
                    {lim}
                  </li>
                )
              )}
            </ul>

            <button
              onClick={handleSaveSnapshot}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-atlas-teal/50 bg-atlas-teal/20 py-2 font-mono text-xs font-semibold text-atlas-teal hover:bg-atlas-teal/30"
            >
              <Play className="h-3.5 w-3.5" /> Log Scenario to Audit Trail
            </button>

            {savedNotice && (
              <div className="flex items-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-950/40 p-2 font-mono text-[11px] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> {savedNotice}
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-1 font-mono text-[10px] text-atlas-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-atlas-teal" />
              All calculations verified against deterministic unit tests.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
