"""Deterministic Technology Economics Engine (Phase 9).

Implements first-principles unit-economic and commercialization threshold models for:
1. Robotics Commercialization Model
2. Battery Lifecycle Cost Model (explicitly labeled as pack-level approximate $/kWh_delivered, not full-system LCOE)
3. AI Inference Unit Economics Model ($ / 1M tokens)

Also computes deterministic 1-way Tornado sensitivities, 2-variable sensitivity heatmaps,
and utilization/scale break-even curves.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any


def _d(val: float | int | str | Decimal) -> Decimal:
    return Decimal(str(val))


def _r(val: Decimal, places: str = "0.0001") -> float:
    return float(val.quantize(Decimal(places), rounding=ROUND_HALF_UP))


def calculate_robotics_economics(assumptions: dict[str, float]) -> dict[str, Any]:
    """Calculate Robotics workcell unit economics using Decimal currency arithmetic."""
    purchase = _d(assumptions.get("robot_purchase_price_usd", 38000.0))
    install = _d(assumptions.get("installation_integration_cost_usd", 12000.0))
    life_yrs = max(_d(assumptions.get("useful_life_years", 5.0)), _d("0.5"))
    maint = _d(assumptions.get("annual_maintenance_cost_usd", 3600.0))
    power_kw = _d(assumptions.get("power_consumption_kw", 1.4))
    elec_rate = _d(assumptions.get("electricity_cost_per_kwh", 0.11))
    op_hours = _d(assumptions.get("operating_hours_per_year", 6000.0))
    utilization = max(min(_d(assumptions.get("utilization_rate", 0.78)), _d("1.0")), _d("0.05"))
    raw_cycles_hr = max(_d(assumptions.get("raw_cycles_per_hour", 420.0)), _d("1.0"))
    task_success = max(min(_d(assumptions.get("successful_task_rate", 0.914)), _d("1.0")), _d("0.05"))
    sup_hourly = _d(assumptions.get("operator_supervision_cost_per_hour_usd", 36.0))
    robots_per_sup = max(_d(assumptions.get("robots_per_supervisor", 12.0)), _d("1.0"))
    human_hourly = _d(assumptions.get("human_labor_cost_per_hour_usd", 28.50))
    human_throughput_hr = max(_d(assumptions.get("human_task_throughput_per_hour", 380.0)), _d("1.0"))

    total_capex = purchase + install
    annualized_capex = total_capex / life_yrs

    active_hours = op_hours * utilization
    annual_energy_cost = active_hours * power_kw * elec_rate
    annual_supervision_cost = active_hours * (sup_hourly / robots_per_sup)
    annual_opex = maint + annual_energy_cost + annual_supervision_cost
    total_annual_cost = annualized_capex + annual_opex

    successful_tasks_per_year = active_hours * raw_cycles_hr * task_success
    cost_per_task = (
        total_annual_cost / successful_tasks_per_year
        if successful_tasks_per_year > 0
        else _d("999.0")
    )
    human_cost_per_task = human_hourly / human_throughput_hr

    unit_savings_pct = (
        ((human_cost_per_task - cost_per_task) / human_cost_per_task) * _d("100.0")
        if human_cost_per_task > 0
        else _d("0.0")
    )

    # Break-even utilization where robot cost_per_task == human_cost_per_task
    # Fixed annual cost = annualized_capex + maint
    # Variable hourly margin = (raw_cycles_hr * task_success * human_cost_per_task) - (power_kw*elec_rate + sup_hourly/robots_per_sup)
    fixed_annual = annualized_capex + maint
    variable_hourly_cost = (power_kw * elec_rate) + (sup_hourly / robots_per_sup)
    hourly_value_generated = raw_cycles_hr * task_success * human_cost_per_task
    net_hourly_contribution = hourly_value_generated - variable_hourly_cost

    if net_hourly_contribution > 0 and op_hours > 0:
        be_hours = fixed_annual / net_hourly_contribution
        break_even_util = min(max(be_hours / op_hours, _d("0.0")), _d("1.0"))
    else:
        break_even_util = _d("1.0")

    # Task success sensitivity curve (from 60% to 99%)
    success_curve = []
    for sr_int in (60, 70, 80, 85, 90, 95, 99):
        sr_dec = _d(sr_int) / _d(100)
        tasks_sr = active_hours * raw_cycles_hr * sr_dec
        c_sr = total_annual_cost / tasks_sr if tasks_sr > 0 else _d(0)
        success_curve.append(
            {
                "task_success_pct": sr_int,
                "cost_per_successful_task_usd": _r(c_sr, "0.0001"),
                "human_baseline_usd": _r(human_cost_per_task, "0.0001"),
            }
        )

    return {
        "model_type": "robotics",
        "primary_metric_key": "cost_per_successful_task_usd",
        "primary_metric_label": "Cost per Successful Task (USD)",
        "primary_metric_unit": "USD/task",
        "outputs": {
            "total_installed_capex_usd": _r(total_capex, "0.01"),
            "annualized_capital_cost_usd": _r(annualized_capex, "0.01"),
            "annual_energy_cost_usd": _r(annual_energy_cost, "0.01"),
            "annual_supervision_cost_usd": _r(annual_supervision_cost, "0.01"),
            "annual_operating_cost_usd": _r(annual_opex, "0.01"),
            "total_annual_cost_usd": _r(total_annual_cost, "0.01"),
            "successful_tasks_per_year": int(successful_tasks_per_year),
            "cost_per_successful_task_usd": _r(cost_per_task, "0.0001"),
            "human_alternative_cost_per_task_usd": _r(human_cost_per_task, "0.0001"),
            "unit_cost_savings_pct": _r(unit_savings_pct, "0.01"),
            "break_even_utilization": _r(break_even_util, "0.001"),
            "commercially_viable": float(cost_per_task) < float(human_cost_per_task),
        },
        "curves": success_curve,
        "limitations": [
            "Simplified task-level unit economics model; excludes facility floor-space lease modifications and upstream conveyor civil works.",
            "Assumes failed picks are recovered via supervisor teleop or retry without destroying high-value workpieces.",
        ],
    }


def calculate_battery_economics(assumptions: dict[str, float]) -> dict[str, Any]:
    """Calculate Battery pack lifecycle economics (explicitly distinct from full utility LCOE)."""
    cell_cost = _d(assumptions.get("cell_cost_per_kwh_usd", 108.0))
    pack_integ = _d(assumptions.get("pack_integration_cost_per_kwh_usd", 28.0))
    capacity_kwh = max(_d(assumptions.get("nominal_pack_capacity_kwh", 100.0)), _d("1.0"))
    dod = max(min(_d(assumptions.get("usable_depth_of_discharge", 0.88)), _d("1.0")), _d("0.1"))
    cycles = max(_d(assumptions.get("cycle_life_to_80pct_soh", 900.0)), _d("50.0"))
    rte = max(min(_d(assumptions.get("round_trip_efficiency", 0.91)), _d("1.0")), _d("0.5"))
    maint_pct = _d(assumptions.get("annual_maintenance_pct_of_capex", 0.015))
    discount_rate = _d(assumptions.get("financing_discount_rate", 0.08))
    years = max(_d(assumptions.get("project_years", 8.0)), _d("1.0"))
    deg_factor = max(min(_d(assumptions.get("degradation_capacity_factor", 0.90)), _d("1.0")), _d("0.5"))

    pack_cost_per_kwh = cell_cost + pack_integ
    total_capex = pack_cost_per_kwh * capacity_kwh

    # Financing + maintenance lifecycle cost approximation
    annual_maint = total_capex * maint_pct
    financing_overhead = total_capex * (discount_rate * (years / _d("2.0"))) * _d("0.35")
    lifecycle_cost = total_capex + (annual_maint * years) + financing_overhead

    # Delivered energy over cycle life
    lifetime_delivered_kwh = capacity_kwh * dod * cycles * deg_factor * rte
    cost_per_delivered_kwh = (
        lifecycle_cost / lifetime_delivered_kwh if lifetime_delivered_kwh > 0 else _d("999.0")
    )

    # Degradation / cycle-life curve
    cycle_curve = []
    for cyc in (400, 600, 800, 900, 1100, 1400, 1800):
        deliv = capacity_kwh * dod * _d(cyc) * deg_factor * rte
        cpk = lifecycle_cost / deliv if deliv > 0 else _d(0)
        cycle_curve.append(
            {
                "cycle_life": cyc,
                "approx_cost_per_delivered_kwh_usd": _r(cpk, "0.0001"),
                "nmc811_graphite_reference_usd": 0.145,
                "lfp_stationary_reference_usd": 0.068,
            }
        )

    return {
        "model_type": "battery",
        "primary_metric_key": "approx_cost_per_delivered_kwh_usd",
        "primary_metric_label": "Approx. Pack Cost per Delivered kWh (USD)",
        "primary_metric_unit": "USD/kWh_delivered",
        "outputs": {
            "pack_cost_per_kwh_usd": _r(pack_cost_per_kwh, "0.01"),
            "total_pack_capex_usd": _r(total_capex, "0.01"),
            "lifecycle_cost_usd": _r(lifecycle_cost, "0.01"),
            "lifetime_delivered_energy_kwh": _r(lifetime_delivered_kwh, "0.1"),
            "approx_cost_per_delivered_kwh_usd": _r(cost_per_delivered_kwh, "0.0001"),
            "comparative_graphite_nmc_usd_per_kwh": 0.145,
            "comparative_lfp_stationary_usd_per_kwh": 0.068,
            "ev_parity_achieved": float(cost_per_delivered_kwh) <= 0.145,
        },
        "curves": cycle_curve,
        "limitations": [
            "Simplified pack-level lifecycle cost per delivered kWh metric; excludes wholesale charging electricity cost, inverter/transformer BOS, and interconnection civil engineering. Do not mislabel as an authoritative utility-scale full-system LCOE.",
        ],
    }


def calculate_inference_economics(assumptions: dict[str, float]) -> dict[str, Any]:
    """Calculate AI Inference cost per million tokens using Decimal arithmetic."""
    hw_capex = _d(assumptions.get("hardware_capital_cost_usd", 265000.0))
    hw_life = max(_d(assumptions.get("hardware_lifetime_years", 3.5)), _d("1.0"))
    power_kw = _d(assumptions.get("node_power_consumption_kw", 10.2))
    pue = max(_d(assumptions.get("pue_multiplier", 1.22)), _d("1.0"))
    elec_rate = _d(assumptions.get("electricity_cost_per_kwh", 0.075))
    utilization = max(min(_d(assumptions.get("utilization_rate", 0.58)), _d("1.0")), _d("0.05"))
    throughput_sec = max(_d(assumptions.get("raw_token_throughput_per_sec", 36000.0)), _d("10.0"))
    overhead_yr = _d(assumptions.get("serving_network_overhead_usd_per_year", 14000.0))
    maint_yr = _d(assumptions.get("annual_maintenance_usd", 9500.0))
    eff_mult = max(_d(assumptions.get("model_quantization_efficiency_multiplier", 3.25)), _d("0.2"))

    annualized_hw = hw_capex / hw_life
    hours_per_year = _d("8760.0")
    active_power_factor = _d("0.35") + (_d("0.65") * utilization)
    annual_power_cost = hours_per_year * power_kw * pue * elec_rate * active_power_factor

    total_annual_cost = annualized_hw + annual_power_cost + overhead_yr + maint_yr

    seconds_per_year = _d("31536000.0")
    effective_tok_per_sec = throughput_sec * eff_mult
    total_tokens_year = seconds_per_year * utilization * effective_tok_per_sec
    millions_tokens_year = total_tokens_year / _d("1000000.0")

    cost_per_1m = (
        total_annual_cost / millions_tokens_year if millions_tokens_year > 0 else _d("999.0")
    )

    # Break-even utilization at a target commercial API price of $0.08 / 1M tokens
    target_price_per_1m = _d("0.080")
    tokens_1m_at_100pct = (seconds_per_year * effective_tok_per_sec) / _d("1000000.0")
    rev_at_100pct = tokens_1m_at_100pct * target_price_per_1m
    be_util = min(max(total_annual_cost / rev_at_100pct, _d("0.0")), _d("1.0")) if rev_at_100pct > 0 else _d("1.0")

    util_curve = []
    for u_pct in (20, 35, 50, 58, 70, 85, 95):
        u_dec = _d(u_pct) / _d(100)
        p_cost = hours_per_year * power_kw * pue * elec_rate * (_d("0.35") + _d("0.65") * u_dec)
        tot_c = annualized_hw + p_cost + overhead_yr + maint_yr
        m_tok = (seconds_per_year * u_dec * effective_tok_per_sec) / _d("1000000.0")
        c_1m = tot_c / m_tok if m_tok > 0 else _d(0)
        util_curve.append(
            {
                "utilization_pct": u_pct,
                "cost_per_million_tokens_usd": _r(c_1m, "0.0001"),
                "agentic_viability_threshold_usd": 0.050,
            }
        )

    return {
        "model_type": "ai_inference",
        "primary_metric_key": "cost_per_million_tokens_usd",
        "primary_metric_label": "Cost per 1M Tokens (USD)",
        "primary_metric_unit": "USD / 1M tokens",
        "outputs": {
            "annualized_hardware_cost_usd": _r(annualized_hw, "0.01"),
            "annual_power_cost_usd": _r(annual_power_cost, "0.01"),
            "total_annual_operating_cost_usd": _r(total_annual_cost, "0.01"),
            "effective_token_throughput_per_sec": _r(effective_tok_per_sec, "0.1"),
            "effective_tokens_per_year_millions": _r(millions_tokens_year, "0.1"),
            "cost_per_million_tokens_usd": _r(cost_per_1m, "0.0001"),
            "break_even_utilization_at_0_08_usd": _r(be_util, "0.001"),
            "sub_0_05_agentic_threshold_met": float(cost_per_1m) <= 0.050,
        },
        "curves": util_curve,
        "limitations": [
            "Models 8-GPU node inference serving TCO; excludes frontier model pre-training R&D amortization and WAN egress charges.",
        ],
    }


def calculate_healthcare_ai_economics(assumptions: dict[str, float]) -> dict[str, Any]:
    """Calculate Clinical AI Diagnostics & Hospital Workflow unit economics using Decimal arithmetic."""
    annual_studies = max(_d(assumptions.get("annual_diagnostic_studies_volume", 45000.0)), _d("100.0"))
    fda_validation_amort_yr = _d(assumptions.get("annualized_fda_clinical_trial_cost_usd", 180000.0))
    pacs_integration_yr = _d(assumptions.get("annual_pacs_ehr_integration_cost_usd", 65000.0))
    inference_cost_per_study = _d(assumptions.get("cloud_edge_inference_cost_per_study_usd", 0.85))
    clinician_hourly_usd = _d(assumptions.get("specialist_clinician_hourly_cost_usd", 195.0))
    minutes_saved_per_study = _d(assumptions.get("clinician_minutes_saved_per_study", 11.5))
    false_pos_rate = max(min(_d(assumptions.get("false_positive_escalation_rate", 0.06)), _d("0.50")), _d("0.0"))
    reimbursement_per_study = _d(assumptions.get("cms_ntap_cpt_reimbursement_per_study_usd", 18.50))

    fixed_annual_cost = fda_validation_amort_yr + pacs_integration_yr
    gross_time_saved_usd_per_study = (minutes_saved_per_study / _d("60.0")) * clinician_hourly_usd
    false_pos_penalty_usd_per_study = false_pos_rate * (_d("8.0") / _d("60.0")) * clinician_hourly_usd
    net_clinical_labor_savings_per_study = gross_time_saved_usd_per_study - false_pos_penalty_usd_per_study

    total_annual_platform_cost = fixed_annual_cost + (annual_studies * inference_cost_per_study)
    cost_per_study = total_annual_platform_cost / annual_studies
    gross_value_per_study = net_clinical_labor_savings_per_study + reimbursement_per_study
    net_hospital_benefit_per_study = gross_value_per_study - cost_per_study

    unit_Contribution = gross_value_per_study - inference_cost_per_study
    break_even_studies = (
        int(fixed_annual_cost / unit_Contribution) if unit_Contribution > 0 else 999999
    )

    vol_curve = []
    for vol in (10000, 20000, 30000, 45000, 65000, 90000):
        c_s = (fixed_annual_cost + (_d(vol) * inference_cost_per_study)) / _d(vol)
        vol_curve.append(
            {
                "annual_studies": vol,
                "platform_cost_per_study_usd": _r(c_s, "0.01"),
                "gross_clinical_value_per_study_usd": _r(gross_value_per_study, "0.01"),
            }
        )

    return {
        "model_type": "healthcare_ai",
        "primary_metric_key": "platform_cost_per_study_usd",
        "primary_metric_label": "All-In Platform Cost per Diagnostic Study (USD)",
        "primary_metric_unit": "USD/study",
        "outputs": {
            "fixed_annual_regulatory_and_ehr_cost_usd": _r(fixed_annual_cost, "0.01"),
            "total_annual_platform_cost_usd": _r(total_annual_platform_cost, "0.01"),
            "platform_cost_per_study_usd": _r(cost_per_study, "0.01"),
            "net_clinician_labor_savings_per_study_usd": _r(net_clinical_labor_savings_per_study, "0.01"),
            "gross_hospital_value_per_study_usd": _r(gross_value_per_study, "0.01"),
            "net_hospital_margin_per_study_usd": _r(net_hospital_benefit_per_study, "0.01"),
            "break_even_annual_study_volume": break_even_studies,
            "clinically_and_economically_viable": float(net_hospital_benefit_per_study) > 0,
            "commercially_viable": float(net_hospital_benefit_per_study) > 0,
        },
        "curves": vol_curve,
        "limitations": [
            "Models hospital/IDN deployment unit economics; excludes medical malpractice insurance adjustments and multi-site prospective RCT recruitment delays.",
        ],
    }


def calculate_physical_ai_economics(assumptions: dict[str, float]) -> dict[str, Any]:
    """Calculate Embodied Physical AI & World-Model Fleet unit economics using Decimal arithmetic."""
    embodied_bom_usd = _d(assumptions.get("embodied_unit_bom_cost_usd", 29500.0))
    tactile_sensor_suite_usd = _d(assumptions.get("tactile_proprioceptive_sensor_suite_usd", 4200.0))
    sim_compute_amort_usd = _d(assumptions.get("world_model_sim_amortization_per_unit_usd", 2800.0))
    useful_life_yrs = max(_d(assumptions.get("hardware_useful_life_years", 4.5)), _d("1.0"))
    annual_active_hours = max(_d(assumptions.get("annual_deployed_hours", 5400.0)), _d("500.0"))
    mean_hours_between_interventions = max(_d(assumptions.get("mean_hours_between_teleop_interventions", 14.0)), _d("0.5"))
    teleop_specialist_hourly_usd = _d(assumptions.get("teleoperator_specialist_hourly_usd", 34.0))
    annual_actuator_maint_usd = _d(assumptions.get("annual_actuator_maintenance_usd", 3100.0))
    human_equivalent_hourly_usd = _d(assumptions.get("human_physical_task_hourly_benchmark_usd", 29.50))

    total_unit_capex = embodied_bom_usd + tactile_sensor_suite_usd + sim_compute_amort_usd
    annualized_capex = total_unit_capex / useful_life_yrs

    # Each intervention takes ~15 minutes (0.25 hr) of remote teleop + fleet monitoring overhead
    interventions_per_year = annual_active_hours / mean_hours_between_interventions
    teleop_hours_per_year = (interventions_per_year * _d("0.25")) + (annual_active_hours * _d("0.04"))
    annual_teleop_cost = teleop_hours_per_year * teleop_specialist_hourly_usd

    total_annual_fleet_unit_cost = annualized_capex + annual_actuator_maint_usd + annual_teleop_cost
    effective_hourly_cost = total_annual_fleet_unit_cost / annual_active_hours
    hourly_savings_pct = (
        ((human_equivalent_hourly_usd - effective_hourly_cost) / human_equivalent_hourly_usd) * _d("100.0")
        if human_equivalent_hourly_usd > 0
        else _d("0.0")
    )

    autonomy_curve = []
    for mhbi in (2, 5, 10, 14, 24, 48):
        int_yr = annual_active_hours / _d(mhbi)
        t_hrs = (int_yr * _d("0.25")) + (annual_active_hours * _d("0.04"))
        c_hr = (annualized_capex + annual_actuator_maint_usd + (t_hrs * teleop_specialist_hourly_usd)) / annual_active_hours
        autonomy_curve.append(
            {
                "mean_hours_between_interventions": mhbi,
                "effective_autonomous_hourly_cost_usd": _r(c_hr, "0.01"),
                "human_shift_benchmark_usd": _r(human_equivalent_hourly_usd, "0.01"),
            }
        )

    return {
        "model_type": "physical_ai",
        "primary_metric_key": "effective_autonomous_hourly_cost_usd",
        "primary_metric_label": "Effective Autonomous Hourly Cost (USD/hr)",
        "primary_metric_unit": "USD/hr",
        "outputs": {
            "total_embodied_unit_capex_usd": _r(total_unit_capex, "0.01"),
            "annualized_unit_capex_usd": _r(annualized_capex, "0.01"),
            "annual_teleoperation_and_recovery_cost_usd": _r(annual_teleop_cost, "0.01"),
            "total_annual_unit_cost_usd": _r(total_annual_fleet_unit_cost, "0.01"),
            "effective_autonomous_hourly_cost_usd": _r(effective_hourly_cost, "0.02"),
            "human_shift_benchmark_hourly_usd": _r(human_equivalent_hourly_usd, "0.02"),
            "hourly_cost_savings_vs_human_pct": _r(hourly_savings_pct, "0.1"),
            "sub_10_usd_physical_ai_threshold_met": float(effective_hourly_cost) <= 10.0,
            "commercially_viable": float(effective_hourly_cost) <= 10.0,
        },
        "curves": autonomy_curve,
        "limitations": [
            "Models embodied fleet unit economics including world-model sim amortization and remote teleop recovery; excludes wireless factory 5G/Wi-Fi-7 spectrum upgrades.",
        ],
    }


def calculate_consumer_ai_economics(assumptions: dict[str, float]) -> dict[str, Any]:
    """Calculate Everything Consumer AI Hardware + Ambient Subscription LTV/CAC economics."""
    retail_hw_price = _d(assumptions.get("consumer_device_retail_price_usd", 299.0))
    hw_bom_cogs = _d(assumptions.get("device_bom_and_fulfillment_cogs_usd", 184.0))
    monthly_sub_arpu = _d(assumptions.get("monthly_ai_subscription_arpu_usd", 14.99))
    sub_attach_rate = max(min(_d(assumptions.get("subscription_attach_rate", 0.68)), _d("1.0")), _d("0.05"))
    on_device_offload_ratio = max(min(_d(assumptions.get("on_device_npu_inference_offload_ratio", 0.76)), _d("0.98")), _d("0.0"))
    cloud_cost_per_unoffloaded_user_mo = _d(assumptions.get("unoffloaded_cloud_inference_cost_per_user_mo_usd", 6.80))
    monthly_churn_rate = max(min(_d(assumptions.get("monthly_subscription_churn_rate", 0.032)), _d("0.50")), _d("0.005"))
    cac_usd = max(_d(assumptions.get("customer_acquisition_cost_cac_usd", 95.0)), _d("5.0"))

    hw_gross_margin_usd = retail_hw_price - hw_bom_cogs
    effective_monthly_cloud_cost = cloud_cost_per_unoffloaded_user_mo * (_d("1.0") - on_device_offload_ratio)
    monthly_sub_gross_margin_usd = (monthly_sub_arpu - effective_monthly_cloud_cost) * sub_attach_rate

    avg_customer_lifetime_months = _d("1.0") / monthly_churn_rate
    lifetime_subscription_gross_profit = monthly_sub_gross_margin_usd * avg_customer_lifetime_months
    total_customer_ltv_gross_profit = hw_gross_margin_usd + lifetime_subscription_gross_profit

    ltv_to_cac_ratio = total_customer_ltv_gross_profit / cac_usd
    net_cac_after_hw = max(cac_usd - hw_gross_margin_usd, _d("0.0"))
    cac_payback_months = (
        net_cac_after_hw / monthly_sub_gross_margin_usd if monthly_sub_gross_margin_usd > 0 else _d("99.9")
    )

    offload_curve = []
    for off_pct in (20, 40, 60, 76, 85, 95):
        off_dec = _d(off_pct) / _d("100.0")
        c_mo = cloud_cost_per_unoffloaded_user_mo * (_d("1.0") - off_dec)
        sub_gm = (monthly_sub_arpu - c_mo) * sub_attach_rate
        ltv_gp = hw_gross_margin_usd + (sub_gm * avg_customer_lifetime_months)
        offload_curve.append(
            {
                "on_device_npu_offload_pct": off_pct,
                "ltv_to_cac_ratio": _r(ltv_gp / cac_usd, "0.01"),
                "institutional_benchmark_ratio": 3.0,
            }
        )

    return {
        "model_type": "consumer_ai",
        "primary_metric_key": "ltv_to_cac_ratio",
        "primary_metric_label": "Consumer Blended LTV / CAC Ratio",
        "primary_metric_unit": "x (LTV/CAC)",
        "outputs": {
            "hardware_upfront_gross_profit_usd": _r(hw_gross_margin_usd, "0.01"),
            "monthly_cloud_inference_cost_per_user_usd": _r(effective_monthly_cloud_cost, "0.02"),
            "monthly_subscription_gross_profit_per_unit_usd": _r(monthly_sub_gross_margin_usd, "0.02"),
            "expected_retention_lifetime_months": _r(avg_customer_lifetime_months, "0.1"),
            "blended_customer_ltv_gross_profit_usd": _r(total_customer_ltv_gross_profit, "0.01"),
            "ltv_to_cac_ratio": _r(ltv_to_cac_ratio, "0.02"),
            "cac_payback_months": _r(cac_payback_months, "0.1"),
            "venture_scale_unit_economics": float(ltv_to_cac_ratio) >= 3.0,
            "commercially_viable": float(ltv_to_cac_ratio) >= 3.0,
        },
        "curves": offload_curve,
        "limitations": [
            "Models blended consumer AI hardware + subscription cohort economics; excludes retail channel return rates and app-store payment processing fees.",
        ],
    }


def dispatch_economic_model(model_type: str, assumptions: dict[str, float]) -> dict[str, Any]:
    if model_type == "robotics":
        return calculate_robotics_economics(assumptions)
    if model_type in {"battery", "battery_storage"}:
        return calculate_battery_economics(assumptions)
    if model_type == "ai_inference":
        return calculate_inference_economics(assumptions)
    if model_type == "healthcare_ai":
        return calculate_healthcare_ai_economics(assumptions)
    if model_type == "physical_ai":
        return calculate_physical_ai_economics(assumptions)
    if model_type == "consumer_ai":
        return calculate_consumer_ai_economics(assumptions)
    raise ValueError(f"Unsupported economic model_type: {model_type}")


def compute_sensitivity_analysis(
    model_type: str,
    assumptions: dict[str, float],
    variation_pct: float = 0.20,
    x_param: str | None = None,
    y_param: str | None = None,
) -> dict[str, Any]:
    """Compute deterministic 1-way Tornado chart and 2-variable sensitivity heatmap (Phase 9.5)."""
    base_res = dispatch_economic_model(model_type, assumptions)
    metric_key = base_res["primary_metric_key"]
    base_value = float(base_res["outputs"][metric_key])

    # 1. Tornado chart (1-way perturbation of each assumption by -variation_pct and +variation_pct)
    tornado: list[dict[str, Any]] = []
    for param, val in assumptions.items():
        if val == 0:
            continue
        low_assump = dict(assumptions)
        high_assump = dict(assumptions)
        low_assump[param] = float(val) * (1.0 - variation_pct)
        high_assump[param] = float(val) * (1.0 + variation_pct)

        low_out = float(dispatch_economic_model(model_type, low_assump)["outputs"][metric_key])
        high_out = float(dispatch_economic_model(model_type, high_assump)["outputs"][metric_key])
        swing = abs(high_out - low_out)

        tornado.append(
            {
                "parameter": param,
                "base_input": round(float(val), 4),
                "low_input": round(low_assump[param], 4),
                "high_input": round(high_assump[param], 4),
                "output_at_low_input": round(low_out, 4),
                "output_at_high_input": round(high_out, 4),
                "delta_low": round(low_out - base_value, 4),
                "delta_high": round(high_out - base_value, 4),
                "absolute_swing": round(swing, 4),
            }
        )

    tornado.sort(key=lambda x: x["absolute_swing"], reverse=True)

    # 2. Two-variable 5x5 sensitivity heatmap
    default_pairs = {
        "robotics": ("utilization_rate", "successful_task_rate"),
        "battery": ("cell_cost_per_kwh_usd", "cycle_life_to_80pct_soh"),
        "battery_storage": ("cell_cost_per_kwh_usd", "cycle_life_to_80pct_soh"),
        "ai_inference": ("utilization_rate", "model_quantization_efficiency_multiplier"),
        "healthcare_ai": ("annual_diagnostic_studies_volume", "clinician_minutes_saved_per_study"),
        "physical_ai": ("embodied_unit_bom_cost_usd", "mean_hours_between_teleop_interventions"),
        "consumer_ai": ("on_device_npu_inference_offload_ratio", "monthly_subscription_churn_rate"),
    }
    keys = list(assumptions.keys())
    p_x, p_y = default_pairs.get(model_type, (keys[0], keys[-1]))
    if p_x not in assumptions:
        p_x = keys[0]
    if p_y not in assumptions:
        p_y = keys[1] if len(keys) > 1 else keys[0]
    if x_param and x_param in assumptions:
        p_x = x_param
    if y_param and y_param in assumptions:
        p_y = y_param

    multipliers = [0.80, 0.90, 1.00, 1.10, 1.20]
    x_vals = [round(float(assumptions[p_x]) * m, 4) for m in multipliers]
    y_vals = [round(float(assumptions[p_y]) * m, 4) for m in multipliers]

    heatmap_grid: list[dict[str, Any]] = []
    for xv in x_vals:
        for yv in y_vals:
            pert = dict(assumptions)
            pert[p_x] = xv
            pert[p_y] = yv
            cell_val = float(dispatch_economic_model(model_type, pert)["outputs"][metric_key])
            heatmap_grid.append(
                {
                    "x_param": p_x,
                    "y_param": p_y,
                    "x_value": xv,
                    "y_value": yv,
                    "metric_value": round(cell_val, 4),
                }
            )

    return {
        "model_type": model_type,
        "primary_metric_key": metric_key,
        "primary_metric_label": base_res["primary_metric_label"],
        "primary_metric_unit": base_res["primary_metric_unit"],
        "base_value": round(base_value, 4),
        "variation_pct": variation_pct,
        "tornado": tornado,
        "heatmap": {
            "x_param": p_x,
            "y_param": p_y,
            "x_values": x_vals,
            "y_values": y_vals,
            "cells": heatmap_grid,
        },
    }
