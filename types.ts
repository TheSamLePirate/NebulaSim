export interface Vector2D {
  x: number;
  y: number;
}

export interface Maneuver {
  id: string;
  type:
    | "burn"
    | "wait"
    | "rotate"
    | "sas"
    | "auto_circularize"
    | "auto_land"
    | "auto_transfer"
    | "auto_intercept"
    | "manual_node"
    | "wait_for_transfer"
    | "wait_for_altitude"
    | "burn_until_altitude"
    | "change_simulation_speed"
    | "stage"; // Type of action
  param?: number | string; // Extra data (degrees for rotate, mode for SAS)
  targetBodyId?: string; // For auto maneuvers that require a reference
  parentBodyId?: string; // For transfers that require a central body reference
  thrust: number; // Force strength (for burns)
  duration: number; // Seconds (for burns and waits)
  angleOffset: number; // Relative to current heading (0 = forward)
  startTime?: number; // timestamp
  progress: number; // 0 to 1
  status: "pending" | "active" | "completed";
  // Accurate deltaV tracking for auto maneuvers
  targetDeltaV?: number; // Target deltaV to achieve (for auto maneuvers)
  appliedDeltaV?: number; // Actual deltaV applied so far
  initialDeltaV?: number; // Initial deltaV required (for progress bars in closed-loop maneuvers)
  initialAltitude?: number; // Initial altitude when maneuver started (for progress bars)

  // Manual Maneuver Node Data
  deltaVPrograde?: number;
  deltaVNormal?: number; // (Not used in 2D physics usually, but good for completeness)
  deltaVRadial?: number;
  timeFromNow?: number; // Scheduled time (seconds from creation)
}

export type SASMode =
  | "off"
  | "prograde"
  | "retrograde"
  | "radial_out"
  | "radial_in";

export type ShipDesign = "rocket" | "multistage" | "station" | "satellite";

export interface ShipStage {
  mass: number; // Dry mass of this stage
  fuel: number; // Current fuel in this stage
  maxFuel: number; // Max fuel capacity of this stage
  thrust: number; // Thrust provided by this stage
  color?: string; // Optional override for visuals
}

export interface ShipStructure {
  design: ShipDesign;
  stages: ShipStage[];
  currentStageIndex: number; // 0 is the bottom-most stage (active), increments as stages detach
}

export interface Body {
  id: string;
  name: string;
  mass: number;
  radius: number;
  color: string;
  position: Vector2D;
  velocity: Vector2D;
  trail: Vector2D[];
  description: string;
  realMass?: string; // For display
  realDiameter?: string; // For display
  orbitPeriod?: string; // For display
  isStar?: boolean; // To apply glow effects

  // Rocket Specifics
  isRocket?: boolean;
  shipStructure?: ShipStructure;
  angle?: number; // Orientation in radians
  thrust?: Vector2D; // Current active thrust vector
  maneuvers?: Maneuver[];
  landedOnBodyId?: string; // ID of the body this rocket is resting on
  landingAngle?: number; // Fixed angle on surface (to prevent drift)
  sasMode?: SASMode; // Stability Assist System mode
  orbitReferenceId?: string; // Explicit parent body ID set by user/flight computer

  // Fuel System
  fuel?: number; // Current fuel amount
  maxFuel?: number; // Tank capacity
  dryMass?: number; // Mass without fuel
  stage?: number; // Current stage

  // Docking System
  dockingRelativePosition?: Vector2D; // Position relative to parent when docked
  dockingRelativeAngle?: number; // Angle relative to parent when docked

  // Surface Objects
  surfaceObjects?: SurfaceObject[];
}

export interface SurfaceObject {
  id: string;
  type: "mineral" | "artifact" | "technology" | "fuel" | "custom";
  name: string;
  color: string;
  mass: number;
  radius: number;
  angle: number; // Radians
  design?: string; // Icon or shape identifier
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1.0 to 0.0
  decay: number;
  color: string;
  size: number;
}

export interface RendezvousSolution {
  moduleId: string;
  name: string;
  color: string;
  point: Vector2D;
  timeToRendezvous: number;
  distance: number;
  deltaVPrograde: number;
  deltaVRadial: number;
  totalDeltaV: number;
}

export interface VisualConfig {
  // Toggles
  showGrid: boolean;
  showWaves: boolean;
  showGlow: boolean;
  showTrails: boolean;
  showStars: boolean;
  showNebula: boolean;
  showCenterOfMass: boolean;
  showEclipses: boolean;
  showMagneticFields: boolean;

  // Numeric Settings
  gridSpacing: number; // Default 100
  gridOpacity: number; // Default 0.25
  waveSpeedMultiplier: number; // Default 1.0
  glowIntensity: number; // Default 1.0
  trailLength: number; // Default 150
  centerOfMassThreshold: number; // Default 2000. Bodies further than this from origin are excluded from CoM

  // Starfield & Nebula Settings
  starDensity: number; // Default 800
  starTwinkleSpeed: number; // Default 2.0
  nebulaCloudCount: number; // Default 15
  nebulaOpacity: number; // Default 0.2
}

export interface PhysicsConfig {
  gravitationalConstant: number; // Default 0.5
  collisions: boolean; // Default true
  timeStep: number; // Default 0.5
  timeReverseDuration: number; // Default 4.0
}

export interface SimulationSaveData {
  version: number;
  timestamp: number;
  bodies: Body[];
  visualConfig: VisualConfig;
  physicsConfig: PhysicsConfig;
  camera: {
    scale: number;
    offset: Vector2D;
  };
  flightComputerModules?: FlightComputerModule[];
  moduleGroups?: ModuleGroup[];
  followBodyId?: string;
  followCenterOfMass?: boolean;
  speed?: number;
}

export interface SimulationState {
  bodies: Body[];
  scale: number; // Simulation units per pixel (wait, no, pixels per unit)
  offset: Vector2D; // Camera offset
  isRunning: boolean;
  speed: number; // Simulation speed multiplier
  selectedBodyId: string | null;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  isLoading?: boolean;
}

export interface Preset {
  id: string;
  name: string;
  bodies: Body[];
  defaultScale: number;
  description: string;
  flightComputerModules?: FlightComputerModule[];
  moduleGroups?: ModuleGroup[];
  camera?: {
    scale: number;
    offset: Vector2D;
  };
  followBodyId?: string;
  followCenterOfMass?: boolean;
  speed?: number;
  visualConfig?: VisualConfig;
  physicsConfig?: PhysicsConfig;
}

export interface SystemEvent {
  type: "set_speed" | "stage_rocket";
  value?: number;
  rocketId?: string;
}

export interface PhysicsResult {
  bodies: Body[];
  newParticles: Particle[];
  systemEvents: SystemEvent[];
  jobId?: number;
}

export interface CoMData {
  realCoM: Vector2D;
  refinedCoM: Vector2D;
  included: Body[];
  excluded: Body[];
}

export interface AssistantActions {
  spawnBody: (
    name: string,
    mass: number,
    distance: number,
    velocity: number,
    color: string,
  ) => string;
  spawnBodyComplex: (
    name: string,
    mass: number,
    radius: number,
    color: string,
    position: Vector2D,
    velocity: Vector2D,
    isStar?: boolean,
  ) => string;
  deleteBody: (name: string) => string;
  makeStar: (name: string) => string;
  setSimulationState: (isRunning?: boolean, speed?: number) => string;
  changePreset: (presetId: string) => string;
  selectBody: (bodyName: string) => string;
  followBody: (bodyName: string) => string;
  followCenterOfMass: () => string;
  configureVisuals: (config: Partial<VisualConfig>) => string;
  configurePhysics: (config: Partial<PhysicsConfig>) => string;
  setCamera: (zoom?: number, reset?: boolean) => string;

  // Rocket Actions
  spawnRocket: (parentBodyName?: string) => string;
  controlRocket: (
    rocketName: string,
    action: "rotate" | "thrust" | "stop",
    value?: number,
  ) => string;
  programAdvancedFlightPlan: (rocketName: string, maneuvers: any[]) => string;
  executeManeuverPlan: (rocketName: string) => string;
  getRocketTelemetry: (rocketName: string, targetBodyName?: string) => string;
  addManualNode: (
    rocketName: string,
    timeFromNow: number,
    deltaVPrograde: number,
    deltaVRadial: number,
  ) => string;
  getRocketFlightPlan: (rocketName: string) => string;

  // Flight Computer Actions
  addFlightComputerModule: (
    moduleType: FlightComputerModuleType,
    rocketName: string,
    referenceBodyName?: string,
    targetBodyName?: string,
    customName?: string,
    color?: string,
    groupName?: string,
    configuration?: string,
  ) => string;
  removeFlightComputerModule: (moduleName: string) => string;
  getFlightComputerData: () => string;
  toggleFlightComputerModule: (moduleName: string, enabled: boolean) => string;
  updateFlightComputerModule: (
    moduleName: string,
    configuration: string,
  ) => string;
  createModuleGroup: (
    name: string,
    color?: string,
    parentGroupName?: string,
  ) => string;
}

export interface RocketSpawnConfig {
  name: string;
  mass: number;
  radius: number;
  color: string;
  design: ShipDesign;
  stages?: number; // Number of stages for multi-stage rockets
  fuel?: number; // Initial fuel
  thrust?: number; // Thrust power
  stageConfigs?: { fuel: number; thrust: number; mass?: number }[];
}

export type MarkerShape = "ring" | "diamond" | "square" | "triangle" | "pin";

export type FlightComputerModuleType =
  | "orbit_info"
  | "transfer_window"
  | "trajectory_prediction"
  | "circularize_guide"
  | "rendezvous_tracker"
  | "track_distance"
  | "track_velocity"
  | "body_info"
  | "body_by"
  | "notify"
  | "logic_gate"
  | "beep"
  | "thrust_burst"
  | "maneuver_executor"
  | "button"
  | "selector"
  | "follow"
  | "maths"
  | "custom_script"
  | "marker"
  | "keyboard"
  | "slider"
  | "music_controller"
  | "horizontal_bar"
  | "edge_detector"
  | "change_detector"
  | "wait"
  | "line_drawer"
  | "circle_drawer"
  | "system_monitor"
  | "lagrange_calculator";

export type FlightComputerInputType =
  | "body"
  | "module_output"
  | "vector"
  | "string";

export interface FlightComputerInput {
  type: FlightComputerInputType;
  value: string; // ID for body, "moduleId:outputKey" for module output, or JSON string for vector
  label?: string; // Display name
}

export type AltitudeDirection = "ascending" | "descending";

export type ComparisonOperator = ">" | "<" | "=" | ">=" | "<=";
export type LogicOperator =
  | "AND"
  | "OR"
  | "NOR"
  | "NAND"
  | "XOR"
  | "XNOR"
  | "NOT";
export type BeepTriggerMode = "rising" | "falling" | "continuous";

export interface FlightComputerModule {
  id: string;
  type: FlightComputerModuleType;
  isEnabled: boolean;

  // New Generic Input System
  inputs?: Record<string, FlightComputerInput>;

  // Legacy fields (kept for backward compatibility during migration)
  primaryBodyId?: string;
  referenceBodyId?: string;
  targetBodyId?: string;

  // System Monitor Stats
  systemMonitorStats?: {
    globalTotalMs: number;
    modules: {
      id: string;
      name: string;
      type: string;
      lastMs: number;
      averageMs: number;
      lastDrawMs: number;
      averageDrawMs: number;
      accumulatedLogicMs: number; // Sum over the interval
      accumulatedDrawMs: number; // Sum over the interval
      percentOfTotal: number;
    }[];
  };

  color: string;
  name?: string;
  maxDistance?: number;

  // Notify Module Config
  comparisonOperator?: ComparisonOperator;
  comparisonValue?: number;
  notifyTriggered?: boolean; // State to track if notification is active
  notifyMessage?: string;

  // Logic Gate Config
  logicOperator?: LogicOperator;

  // Beep Module Config
  beepTriggerMode?: BeepTriggerMode;
  beepPitch?: number; // Hz (default 800)
  beepRate?: number; // Beeps per second (default 2)
  beepSoundType?: "beep" | "speak"; // Default 'beep'
  beepSpeakText?: string; // Text to speak

  // Thrust Burst Module Config
  thrustBurstMode?: "impulse" | "force";
  thrustBurstDuration?: number;
  thrustBurstDeltaVPrograde?: number;
  thrustBurstDeltaVRadial?: number;
  thrustBurstCompleted?: boolean;
  thrustBurstActive?: boolean;

  // Maneuver Executor Config
  maneuverExecutorType?: Maneuver["type"];
  maneuverExecutorParam?: number | string;
  maneuverExecutorThrust?: number;
  maneuverExecutorDuration?: number;
  maneuverExecutorAngleDeg?: number;
  maneuverExecutorTargetBodyId?: string;
  maneuverExecutorParentBodyId?: string;
  maneuverExecutorDeltaVPrograde?: number;
  maneuverExecutorDeltaVRadial?: number;
  maneuverExecutorAltitudeDirection?: AltitudeDirection;
  maneuverExecutorRequestId?: number;
  maneuverExecutorLastRequestId?: number;
  maneuverExecutorActiveManeuverId?: string;
  maneuverExecutorStatus?: "idle" | "queued" | "running" | "completed";
  maneuverExecutorProgress?: number;

  // Grouping (cosmetic only)
  groupId?: string | null; // ID of the group this module belongs to, null = ungrouped

  // Button Module Config
  buttonState?: boolean;

  // Selector Module Config
  selectorBodyId?: string;
  mathOperator?: "add" | "subtract" | "multiply" | "divide";
  mathValueA?: number;
  mathValueB?: number;
  bodyByMode?: "id" | "name";
  bodyByValue?: string;

  // Custom Script Module Config
  customScriptCode?: string;
  customScriptOutputType?: "scalar" | "boolean" | "string" | "vector" | "body";
  customScriptInputsCount?: number;
  customScriptLastResult?: any; // Store the result of the last execution
  customScriptLogs?: string[]; // Store last few logs
  customScriptMode?: "sync" | "async";
  customScriptAsyncState?: boolean; // true = finished/ready, false = pending/running
  customScriptManualTrigger?: number; // Timestamp of last manual trigger
  customScriptContinuousRun?: boolean; // Run every frame

  // Marker Module Config
  markerShape?: MarkerShape;
  markerTitle?: string;
  markerDescription?: string;
  markerColor?: string;
  markerVisible?: boolean;
  markerPulse?: boolean;

  // Keyboard Module Config
  keyboardKey?: string;
  keyboardState?: boolean;
  keyboardAutodetect?: boolean;
  keyboardListenMode?: "specific" | "any";

  // Slider Module Config
  sliderMin?: number; // Minimum value (default 0)
  sliderMax?: number; // Maximum value (default 100)
  sliderStep?: number; // Step size (default 1)
  sliderValue?: number; // Current value

  // Horizontal Bar Module Config
  barMin?: number;
  barMax?: number;
  barColorLow?: string;
  barColorMid?: string;
  barColorHigh?: string;

  // Music Controller
  musicPlaying?: boolean;
  musicVolume?: number;
  musicPromptText0?: string;
  musicPromptWeight0?: number;
  musicPromptText1?: string;
  musicPromptWeight1?: number;
  musicPromptText2?: string;
  musicPromptWeight2?: number;
  musicPromptText3?: string;
  musicPromptWeight3?: number;
  musicReverbMix?: number;
  musicLowpassCutoff?: number;

  // Edge Detector Module Config
  edgeMode?: "rising" | "falling";
  edgeLastState?: boolean;
  edgeTriggered?: boolean;

  // Change Detector Module Config
  changeLastValue?: string | number | boolean;
  changeTriggered?: boolean;

  // Wait Module Config
  waitStartTime?: number; // Timestamp of when wait started
  waitDuration?: number; // Configured duration in ms
  waitActive?: boolean; // Internal state to track if we are currently waiting
  waitTriggered?: boolean; // Output state (true after wait finished)
  waitRemainingTime?: number; // ms
  waitLastStartSignal?: boolean; // Edge detection for start signal
  waitMode?: "simulation" | "realtime";

  // Line Drawer Module Config
  lineColor?: string;
  lineThickness?: number;
  lineHitColor?: string;
  lineShowAfterHit?: boolean;
  lineActivateRaycast?: boolean;

  // Circle Drawer Module Config
  circleRadius?: number;
  circleColor?: string;
  circleDistanceSensing?: boolean;
  circleActivate?: boolean;
  circleDetectedColor?: string;

  // Lagrange Calculator Module Config
  lagrangeL1?: Vector2D;
  lagrangeL2?: Vector2D;
  lagrangeL3?: Vector2D;
  lagrangeL4?: Vector2D;
  lagrangeL5?: Vector2D;

  // Dashboard Configuration
  dashboardConfig?: {
    x: number;
    y: number;
    showTitle?: boolean;
    customLabel?: string;
    displayOutput?: {
      key: string;
      label: string;
    };
  };
}

export interface ModuleGroup {
  id: string;
  name: string;
  color: string;
  isCollapsed: boolean;
  parentGroupId?: string | null; // ID of parent group, null = top-level
  displayOutput?: {
    moduleId: string;
    outputKey: string;
  };
}

export interface JargonAnalysis {
  score: number; // 0.0 to 1.0
  reasoning: string;
  jargonWords: string[];
}

export enum ConnectionStatus {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR",
}

export interface SlideImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
  alt?: string;
}

export interface SlideshowRef {
  next: () => void;
  prev: () => void;
  showImage: (id: string) => void;
}

export interface SlideshowProps {
  images: SlideImage[];
  initialId?: string;
  className?: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface WebcamState {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  permissionDenied: boolean;
}

export enum Month {
  January = "JANUARY",
  July = "JULY",
}

export interface SimulationState {
  orbitRadius: number; // in meters (simulated AU)
  starDistance: number; // in meters
  currentMonth: Month;
  isMeasuring: boolean;
  showMath: boolean;
}

export interface StarPosition {
  x: number;
  y: number;
  size: number;
  opacity: number;
}
