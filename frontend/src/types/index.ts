/**
 * SafeScout MINE-ENERGY - TypeScript Type Definitions
 */

export interface RoverStatus {
  online: boolean;
  mode: string;
  emergency_stop: boolean;
  battery_voltage_v: number;
  battery_current_a: number;
  battery_percentage: number;
  temperature_mcu_c: number;
  wifi_rssi_dbm: number;
  watchdog_ok: boolean;
  rover_x: number;
  rover_y: number;
  rover_heading_deg: number;
  speed_ms: number;
}

export interface EnvironmentalSensors {
  mq2_raw_adc: number;
  mq2_ppm_combustible: number;
  mq2_calibrated: boolean;
  mq8_raw_adc: number;
  mq8_ppm_hydrogen: number;
  mq8_calibrated: boolean;
  dht11_temp_c: number;
  dht11_humidity_pct: number;
  gas_alarm_state: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface VentilationSensors {
  sdp31_diff_pressure_pa: number;
  airway_temp_c: number;
  calculated_air_velocity_ms: number;
  pitot_clogged_warning: boolean;
}

export interface AcousticSensors {
  ultrasonic_40khz_raw: number;
  ultrasonic_db_spl: number;
  suspected_leak: boolean;
  peak_frequency_hz: number;
}

export interface PipelineSensors {
  compressed_air_pressure_bar: number;
  water_pipeline_pressure_bar: number;
  water_flow_rate_lmin: number;
  water_cumulative_liters: number;
  water_temp_c: number;
}

export interface NavigationSensors {
  hc_sr04_distance_cm: number;
  left_wheel_ticks?: number;
  right_wheel_ticks?: number;
  estimated_speed_ms?: number;
}

export interface AlarmsState {
  estop_active: boolean;
  combustible_gas_critical: boolean;
  hydrogen_gas_critical: boolean;
  air_leak_detected: boolean;
  water_leak_detected: boolean;
  relay_beacon_active: boolean;
}

export interface RoverTelemetry {
  version: string;
  device_id: string;
  is_simulated?: boolean;
  simulation_badge?: string;
  timestamp: number;
  heartbeat: number;
  status: RoverStatus;
  environmental: EnvironmentalSensors;
  ventilation: VentilationSensors;
  acoustic_ultrasonic: AcousticSensors;
  pipelines: PipelineSensors;
  navigation_sensors: NavigationSensors;
  alarms: AlarmsState;
}

export interface LidarPoint {
  angle_deg: number;
  distance_m: number;
  intensity: number;
  x: number;
  y: number;
}

export interface LidarScan {
  timestamp: number;
  sensor: string;
  is_simulated?: boolean;
  speed_rpm: number;
  point_count: number;
  points: LidarPoint[];
  robot_pose?: {
    x: number;
    y: number;
    heading_deg: number;
  };
}

export interface InspectionMarker {
  id: number;
  code: string;
  x: number;
  y: number;
  fault: string;
  severity: string;
}

export interface OccupancyGridMap {
  resolution_m: number;
  width: number;
  height: number;
  robot_pose: {
    x: number;
    y: number;
    heading_deg: number;
  };
  trajectory: [number, number][];
  inspection_markers: InspectionMarker[];
  timestamp: number;
}

export interface InspectionItem {
  id: number;
  inspection_code: string;
  timestamp: string;
  site_name: string;
  zone_name: string;
  equipment_id: string;
  location_x: number;
  location_y: number;
  heading_deg: number;
  snapshot_path?: string;
  fault_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detection_method: string;
  confidence_score: number;
  measured_values: Record<string, any>;
  estimated_power_loss_kw: number;
  estimated_energy_loss_kwh_day: number;
  potential_annual_saving_kwh: number;
  annual_financial_saving_inr: number;
  maintenance_priority: string;
  confirmation_status: 'SUSPECTED' | 'CONFIRMED' | 'REJECTED';
  repair_status: 'PENDING' | 'IN_PROGRESS' | 'REPAIRED' | 'VERIFIED';
  verified_saving_kwh: number;
  operator_remarks: string;
  repaired_at?: string;
}

export interface EnergySummary {
  suspected_compressed_air_leaks: number;
  suspected_water_leaks: number;
  ventilation_status: string;
  estimated_avoidable_electricity_kwh_day: number;
  estimated_annual_savings_inr: number;
  potential_annual_kwh: number;
  water_wastage_liters_day: number;
  verified_achieved_savings_kwh: number;
  high_priority_actions: {
    id: number;
    code: string;
    equipment: string;
    zone: string;
    fault: string;
    priority: string;
    power_loss_kw: number;
    potential_annual_inr: number;
    status: string;
  }[];
  total_active_inspections: number;
}

export interface SystemSettings {
  esp32_port: string;
  esp32_baud: number;
  ld19_port: string;
  ld19_baud: number;
  camera_stream_url: string;
  simulation_mode: boolean;
  electricity_tariff_inr: number;
  water_tariff_inr: number;
  compressor_kw_cfm: number;
  pump_kwh_m3: number;
}

