import {
  FlightComputerModule,
  FlightComputerInput,
  Maneuver,
  MarkerShape,
  Body,
  PhysicsConfig,
  RendezvousSolution,
  FlightComputerModuleType,
} from "../../types";
import { resolveBooleanInput } from "../../services/orbitalMath";
import {
  Activity,
  ArrowRightLeft,
  Calculator,
  Crosshair,
  Eye,
  Info,
  MapPin,
  MousePointer2,
  Move,
  Play,
  Radar,
  Radio,
  Rocket,
  Ruler,
  Speaker,
  Terminal,
  Zap,
  Keyboard,
  Sliders,
  Music,
  CreditCard,
  Timer,
  Pencil,
  Cpu,
  Circle,
  Orbit,
} from "lucide-react";

export const MODULE_ICONS: Record<FlightComputerModuleType, React.ElementType> =
  {
    orbit_info: Info,
    transfer_window: Rocket,
    trajectory_prediction: Activity, // Not used?
    circularize_guide: Activity, // Not used?
    rendezvous_tracker: Crosshair,
    track_distance: Ruler,
    track_velocity: Activity,
    notify: Radio,
    logic_gate: Activity,
    beep: Speaker,
    thrust_burst: Zap,
    maneuver_executor: Play,
    button: MousePointer2,
    selector: MousePointer2,
    follow: Eye,
    maths: Calculator,
    body_info: Info,
    body_by: Radar,
    custom_script: Terminal,
    marker: MapPin,
    keyboard: Keyboard,
    slider: Sliders,
    music_controller: Music,
    horizontal_bar: CreditCard,
    edge_detector: Activity,
    change_detector: ArrowRightLeft,
    wait: Timer,
    line_drawer: Pencil,
    circle_drawer: Circle,
    system_monitor: Cpu,
    lagrange_calculator: Orbit,
  };

export const MANEUVER_TYPE_OPTIONS: {
  value: Maneuver["type"];
  label: string;
}[] = [
  { value: "burn", label: "Burn (Thrust)" },
  { value: "wait", label: "Wait / Coast" },
  { value: "rotate", label: "Rotate" },
  { value: "sas", label: "SAS Mode" },
  { value: "auto_circularize", label: "Auto Circularize" },
  { value: "auto_transfer", label: "Auto Transfer" },
  { value: "auto_intercept", label: "Auto Intercept" },
  { value: "auto_land", label: "Auto Land" },
  { value: "manual_node", label: "Manual Node" },
  { value: "wait_for_transfer", label: "Wait For Transfer" },
  { value: "wait_for_altitude", label: "Wait For Altitude" },
  { value: "burn_until_altitude", label: "Burn Until Altitude" },
  { value: "change_simulation_speed", label: "Change Sim Speed" },
  { value: "stage", label: "Stage Separation" },
];

export const MARKER_SHAPE_OPTIONS: { value: MarkerShape; label: string }[] = [
  { value: "ring", label: "Ring" },
  { value: "diamond", label: "Diamond" },
  { value: "square", label: "Square" },
  { value: "triangle", label: "Triangle" },
  { value: "pin", label: "Pin" },
];

export const getInput = (
  module: FlightComputerModule,
  key: string,
): FlightComputerInput | undefined => {
  if (module.inputs && module.inputs[key]) {
    return module.inputs[key];
  }
  // Fallback to legacy fields
  if (key === "primary" && module.primaryBodyId)
    return { type: "body", value: module.primaryBodyId };
  if (key === "reference" && module.referenceBodyId)
    return { type: "body", value: module.referenceBodyId };
  if (key === "target" && module.targetBodyId)
    return { type: "body", value: module.targetBodyId };
  return undefined;
};

export const getUpdateForInput = (
  module: FlightComputerModule,
  key: string,
  input: FlightComputerInput | undefined,
): Partial<FlightComputerModule> => {
  const newInputs = { ...(module.inputs || {}) };
  if (input === undefined) {
    delete newInputs[key];
  } else {
    newInputs[key] = input;
  }

  // Also update legacy fields for backward compatibility where possible
  const legacyUpdates: any = {};
  if (input && input.type === "body") {
    if (key === "primary") legacyUpdates.primaryBodyId = input.value;
    if (key === "reference") legacyUpdates.referenceBodyId = input.value;
    if (key === "target") legacyUpdates.targetBodyId = input.value;
  } else if (input === undefined) {
    if (key === "primary") legacyUpdates.primaryBodyId = undefined;
    if (key === "reference") legacyUpdates.referenceBodyId = undefined;
    if (key === "target") legacyUpdates.targetBodyId = undefined;
  }

  return { inputs: newInputs, ...legacyUpdates };
};

export const formatTime = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "---";

  const seconds = Math.floor(totalSeconds);
  const years = Math.floor(seconds / (365.25 * 24 * 3600));
  const months = Math.floor(
    (seconds % (365.25 * 24 * 3600)) / (30.44 * 24 * 3600),
  );
  const days = Math.floor((seconds % (30.44 * 24 * 3600)) / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(months < 10 ? `0${months}mo` : `${months}mo`);
  if (days > 0) parts.push(days < 10 ? `0${days}d` : `${days}d`);
  if (hours > 0) parts.push(hours < 10 ? `0${hours}h` : `${hours}h`);
  if (minutes > 0) parts.push(minutes < 10 ? `0${minutes}m` : `${minutes}m`);
  else if (parts.length > 0) parts.push("00m");
  if (secs > 0) parts.push(secs < 10 ? `0${secs}s` : `${secs}s`);
  else if (parts.length > 0) parts.push("00s");

  return parts.length > 0 ? parts.join(" ") : `${totalSeconds.toFixed(1)}s`;
};

export const formatRendezvousTime = (seconds: number) => {
  const totalSec = Math.floor(seconds);
  const years = Math.floor(totalSec / (365.25 * 24 * 3600));
  const remainingAfterYears = totalSec % (365.25 * 24 * 3600);
  const months = Math.floor(remainingAfterYears / (30.44 * 24 * 3600));
  const remainingAfterMonths = remainingAfterYears % (30.44 * 24 * 3600);
  const days = Math.floor(remainingAfterMonths / (24 * 3600));
  const remainingAfterDays = remainingAfterMonths % (24 * 3600);
  const hours = Math.floor(remainingAfterDays / 3600);
  const minutes = Math.floor((remainingAfterDays % 3600) / 60);
  const secs = Math.floor(remainingAfterDays % 60);

  const timeParts = [];
  if (years > 0) timeParts.push(`${years}y`);
  if (months > 0) timeParts.push(`${months}m`);
  if (days > 0) timeParts.push(`${days}d`);
  if (hours > 0) timeParts.push(`${hours}h`);
  if (minutes > 0) timeParts.push(`${minutes}m`);
  if (secs > 0 && timeParts.length === 0) timeParts.push(`${secs}s`);

  return timeParts.length > 0 ? timeParts.join(" ") : "0s";
};

export const isModuleActive = (
  module: FlightComputerModule,
  bodies: Body[],
  modules: FlightComputerModule[],
  physicsConfig: PhysicsConfig,
  rendezvousSolutionMap: Record<string, RendezvousSolution>,
): boolean => {
  if (!module.isEnabled) return false;
  const activateInput = module.inputs?.activate;
  if (!activateInput) return true;
  const activeSignal = resolveBooleanInput(
    activateInput,
    bodies,
    modules,
    physicsConfig.gravitationalConstant,
    rendezvousSolutionMap,
  );
  return activeSignal ?? true;
};

export const interpolateColor = (
  color1: string,
  color2: string,
  factor: number,
): string => {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};
