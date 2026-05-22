import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Activity,
} from "react";
import Canvas from "./components/Canvas";
import Canvas3D from "./components/Canvas3D";
import Controls from "./components/Controls";
import RocketDataPanel from "./components/RocketDataPanel";
import ManualCreationPanel from "./components/ManualCreationPanel";
import InfoPanel from "./components/InfoPanel";
import BuilderPanel, { NewBodyData } from "./components/BuilderPanel";
import SettingsPanel from "./components/SettingsPanel";
import GravityObserverPanel from "./components/GravityObserverPanel";
import CoMInfoPanel from "./components/CoMInfoPanel";
import RocketPanel from "./components/RocketPanel";
import PredictionPanel from "./components/PredictionPanel";
import Assistant from "./components/Assistant";
import MusicPanel from "./components/MusicPanel";
import FlightComputerPanel from "./components/FlightComputerPanel";
import FlightComputerDashboard from "./components/FlightComputerDashboard";
import { MusicProvider } from "./contexts/MusicContext";
import {
  PRESETS,
  createBody,
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_PHYSICS_CONFIG,
} from "./constants";
import {
  updatePhysics,
  predictSystemTrajectories,
  reverseTime,
} from "./services/physicsEngineNew"; // Keep exports, but don't use updatePhysics here directly
import { useFlightComputerLogic } from "./hooks/useFlightComputerLogic";

import {
  resolveInput,
  resolveScalarInput,
  resolveBooleanInput,
  calculateTransferInfo,
} from "./services/orbitalMath";
import {
  Body,
  Vector2D,
  Particle,
  VisualConfig,
  PhysicsConfig,
  SimulationSaveData,
  SimulationState,
  Preset,
  FlightComputerModule,
  FlightComputerInput,
  ModuleGroup,
  FlightComputerModuleType,
  Maneuver,
  SurfaceObject,
  RocketSpawnConfig,
  RendezvousSolution,
  CoMData,
  AssistantActions,
  PhysicsResult,
} from "./types";
import {
  Terminal,
  Activity as ActivityIcon,
  MemoryStick,
  Trash2,
  Map as MapIcon,
} from "lucide-react";
import useIsMobile from "./hooks/useIsMobile";
import { useRocketSound } from "./hooks/useRocketSound";
import JargonMetre from "./components/JargonMetre";

import { SlideshowRef } from "./types";
import { Image, ArrowLeft, ArrowRight, PlayCircle } from "lucide-react";

import { PLACEHOLDER_IMAGES } from "./data/userImages";
import { FullPageSlideshow } from "./components/FullPageSlideshow";

import CameraViewer from "./components/CameraViewer";
import ManeuverGizmo from "./components/ManeuverGizmo";

import Parralaxe from "./components/Parralaxe";
import DebugPanel from "./components/DebugPanel";
import MinimapPanel from "./components/MinimapPanel";
import AsteroidOverlay from "./components/AsteroidOverlay";

import { puter } from "@heyputer/puter.js";

const MODULE_COLOR_PALETTE = [
  "#a855f7",
  "#22d3ee",
  "#f97316",
  "#10b981",
  "#f43f5e",
  "#facc15",
  "#6366f1",
  "#ef4444",
  "#06b6d4",
  "#fb923c",
];

const sanitizeHexColor = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : null;
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color =
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const getNextModuleColor = (
  existing: FlightComputerModule[],
  preferred?: string,
): string => {
  const provided = sanitizeHexColor(preferred);
  if (provided) return provided;
  const used = new Set(existing.map((m) => (m.color || "").toLowerCase()));
  const paletteChoice = MODULE_COLOR_PALETTE.find(
    (color) => !used.has(color.toLowerCase()),
  );
  if (paletteChoice) return paletteChoice;
  const hue = (existing.length * 47) % 360;
  return hslToHex(hue, 70, 55);
};

const App: React.FC = () => {
  // --- State ---
  const isMobile = useIsMobile();
  const [showUI, setShowUI] = useState(false);
  const defaultPreset = PRESETS.find((p) => p.id === "blank") || PRESETS[0];

  const [showCameraViewer, setShowCameraViewer] = useState(false);

  const [nbColumns, setNbColumns] = useState(4);
  const [nbRows, setNbRows] = useState(12);
  const [gap, setGap] = useState(0);

  const [currentPresetId, setCurrentPresetId] = useState(defaultPreset.id);
  const [importedPreset, setImportedPreset] = useState<Preset | null>(null);

  const [importedPresets, setImportedPresets] = useState<Preset[]>([]);

  const availablePresets = useMemo(() => {
    return importedPresets.length > 0
      ? [...PRESETS, ...importedPresets]
      : PRESETS;
  }, [importedPresets]);

  const [bodies, setBodies] = useState<Body[]>(defaultPreset.bodies);

  // Enable Rocket Sound
  const { audioState, resumeAudio } = useRocketSound(bodies);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isRunning, setIsRunning] = useState(true); // Default to false
  const [speed, setSpeed] = useState(1.0);
  const [scale, setScale] = useState(defaultPreset.defaultScale);
  const [offset, setOffset] = useState<Vector2D>({ x: 0, y: 0 });
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [followingBodyId, setFollowingBodyId] = useState<string | null>(null);
  const [followingCoM, setFollowingCoM] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState(false);
  const [showAsteroidDensity, setShowAsteroidDensity] =
    useState<boolean>(false);
  const [showAsteroid, setShowAsteroid] = useState<boolean>(false);

  // Observer Mode
  const [showObserver, setShowObserver] = useState(false);
  const [observerBodyIds, setObserverBodyIds] = useState<{
    a: string | null;
    b: string | null;
  }>({ a: null, b: null });

  // Global Prediction State
  const [isPredictionEnabled, setIsPredictionEnabled] = useState(false);
  const [predictionBodyIds, setPredictionBodyIds] = useState<string[]>([]);
  const [predictionSteps, setPredictionSteps] = useState(500);

  // Rocket System Mode
  const [showRocketPanel, setShowRocketPanel] = useState(false);
  const [isRocketSpawning, setIsRocketSpawning] = useState(false);

  // Rocket Spawn Configuration
  const [rocketSpawnConfig, setRocketSpawnConfig] = useState<RocketSpawnConfig>(
    {
      name: "Explorer 1",
      mass: 0.0001, // Reduced mass for realism
      radius: 0.2,
      color: "#f97316",
      design: "rocket",
    },
  );

  const [rocketTargetBodyId, setRocketTargetBodyId] = useState<string>("");
  const [rocketParentBodyId, setRocketParentBodyId] = useState<string>("");

  // Visualization toggles for performance
  const [showTransferWindow, setShowTransferWindow] = useState(true);
  const [showTheoreticalOrbit, setShowTheoreticalOrbit] = useState(true);

  // Rendezvous point visualization (legacy from RocketPanel)
  const [rendezvousPoint, setRendezvousPoint] = useState<Vector2D | null>(null);

  // Rendezvous points from Flight Computer modules
  const [rendezvousPoints, setRendezvousPoints] = useState<
    RendezvousSolution[]
  >([]);

  // Manual Creation Mode State
  const [isCreationMode, setIsCreationMode] = useState(false);
  const [creationCandidate, setCreationCandidate] = useState<Body | null>(null);
  const [predictionPaths, setPredictionPaths] = useState<
    { id: string; color: string; points: Vector2D[] }[]
  >([]);
  const [predictionNodePositions, setPredictionNodePositions] = useState<
    { maneuverId: string; position: Vector2D }[]
  >([]);

  const [visualConfig, setVisualConfig] = useState<VisualConfig>(
    DEFAULT_VISUAL_CONFIG,
  );
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>(
    DEFAULT_PHYSICS_CONFIG,
  );
  const [currentCoMData, setCurrentCoMData] = useState<CoMData | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [fps, setFps] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    percent: number;
  } | null>(null);
  const [use3D, setUse3D] = useState(false);

  const bodiesRef = useRef(bodies);
  const particlesRef = useRef(particles);
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const followingBodyIdRef = useRef(followingBodyId);
  const followingCoMRef = useRef(followingCoM);

  // Crucial Refs for smooth zooming
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);

  const physicsConfigRef = useRef(physicsConfig);
  const visualConfigRef = useRef(visualConfig);
  const lastRefinedCoMRef = useRef<Vector2D | null>(null);

  // Accurate Simulation Time Tracking for Recorder
  const simulationTimeRef = useRef(0);

  // FPS Tracking
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);

  // Throttle prediction calculations to avoid memory leaks
  const lastPredictionTimeRef = useRef(0);
  const PREDICTION_UPDATE_INTERVAL = 20; // Update predictions every 500ms to reduce memory pressure

  // Prediction Worker
  const predictionWorkerRef = useRef<Worker | null>(null);
  const isWorkerBusyRef = useRef(false);

  // Physics Worker
  const physicsWorkerRef = useRef<Worker | null>(null);
  const isPhysicsWorkerBusyRef = useRef(false);
  const accumulatedPhysicsTimeRef = useRef(0);
  const timeSentToWorkerRef = useRef(0);
  const sentBodyIdsRef = useRef<Set<string>>(new Set());

  // Worker Job ID
  const workerJobIdRef = useRef(0);
  const lastBodyUpdateTimesRef = useRef<Map<string, number>>(new Map());

  // Refs for Prediction Logic (to access fresh state inside animate loop)
  // Refs for Prediction Logic (to access fresh state inside animate loop)
  const selectedBodyIdRef = useRef(selectedBodyId);
  const isCreationModeRef = useRef(isCreationMode);
  const creationCandidateRef = useRef(creationCandidate);
  const predictionStepsRef = useRef(predictionSteps);
  const isPredictionEnabledRef = useRef(isPredictionEnabled);
  const predictionBodyIdsRef = useRef(predictionBodyIds);
  const rocketTargetBodyIdRef = useRef(rocketTargetBodyId);
  const rocketParentBodyIdRef = useRef(rocketParentBodyId);

  const slideshowRef = useRef<SlideshowRef>(null);
  const [showImageSlideShow, setShowImageSlideShow] = useState(false);
  const [showParralaxe, setShowParralaxe] = useState(false);

  // Example handlers calling the exposed component API
  const handleNext = () => slideshowRef.current?.next();
  const handlePrev = () => slideshowRef.current?.prev();
  const handleJumpToForest = () => slideshowRef.current?.showImage("forest-4");
  const handleJumpToImage = (imageId: string) =>
    slideshowRef.current?.showImage(imageId);

  type importedPreset = {
    name: string;
    preset: SimulationSaveData;
  };

  type importedComputerModule = {
    name: string;
    module: string;
  };

  const [presetsToImport, setPresetsToImport] = useState<importedPreset[]>([]);
  const [computerModulesToImport, setComputerModulesToImport] = useState<
    importedComputerModule[]
  >([]);

  //tapi in 192.168.1.100:3009/api/presets that return [{name:<filename sans .json>, preset:<content of the file>}]
  useEffect(() => {
    const fetchFiles = async () => {
      const presets = await fetch(
        "http://macbook-pro-de-olivier.local:3009/api/presets",
      ).then((res) => res.json());
      setPresetsToImport(JSON.parse(presets) as importedPreset[]);
      const computerModules = await fetch(
        "http://macbook-pro-de-olivier.local:3009/api/flightComputerModules",
      ).then((res) => res.json());
      setComputerModulesToImport(
        JSON.parse(computerModules) as importedComputerModule[],
      );
    };
    fetchFiles();
  }, []);

  //import the presets.
  useEffect(() => {
    const importPresets = () => {
      //forEach preset, call handleImportState
      presetsToImport.forEach((preset) => {
        handleImportStateFromJsonAsPreset(preset.preset, preset.name);
      });
    };
    importPresets();
  }, [presetsToImport]);

  //import the computer modules.
  useEffect(() => {
    const importComputerModules = () => {
      //forEach computer module, call handleImportState
      computerModulesToImport.forEach((computerModule) => {
        handleImportGroupFromJson(computerModule.module);
      });
    };
    importComputerModules();
  }, [computerModulesToImport]);

  const timeReverseStateRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    initialSpeed: number;
    phase: "decelerate" | "accelerate";
  }>({
    active: false,
    startTime: 0,
    duration: 4,
    initialSpeed: 1,
    phase: "decelerate",
  });

  // Flight Computer State
  const [flightComputerModules, setFlightComputerModules] = useState<
    FlightComputerModule[]
  >([]);
  const [moduleGroups, setModuleGroups] = useState<ModuleGroup[]>([]);

  const handleAddModule = (
    type: FlightComputerModuleType,
    inputs?: Record<string, FlightComputerInput>,
  ) => {
    const assignedColor = getNextModuleColor(flightComputerModules);
    const newModule: FlightComputerModule = {
      id: `fc_mod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      isEnabled: true,
      primaryBodyId: selectedBodyId || bodies[0]?.id || "",
      referenceBodyId:
        bodies.find(
          (b) =>
            b.mass >
            (bodies.find((s) => s.id === (selectedBodyId || bodies[0]?.id))
              ?.mass || 0),
        )?.id ||
        bodies[0]?.id ||
        "",
      color: assignedColor,
      inputs: inputs || {}, // Initialize empty inputs or use provided
      groupId: null, // Start ungrouped
    };

    if (type === "marker") {
      newModule.markerShape = "ring";
      newModule.markerTitle = "Marker";
      newModule.markerDescription = "";
      newModule.markerColor = assignedColor;
      newModule.markerVisible = true;
      newModule.markerPulse = false;
    }

    if (type === "thrust_burst") {
      newModule.thrustBurstMode = "impulse";
      newModule.thrustBurstDuration = 1;
      newModule.thrustBurstDeltaVPrograde = 0;
      newModule.thrustBurstDeltaVRadial = 0;
      newModule.thrustBurstCompleted = true;
    }
    if (type === "maneuver_executor") {
      newModule.maneuverExecutorType = "burn";
      newModule.maneuverExecutorThrust = 0.01;
      newModule.maneuverExecutorDuration = 2;
      newModule.maneuverExecutorAngleDeg = 0;
      newModule.maneuverExecutorDeltaVPrograde = 0;
      newModule.maneuverExecutorDeltaVRadial = 0;
      newModule.maneuverExecutorAltitudeDirection = "ascending";
      newModule.maneuverExecutorStatus = "idle";
      newModule.maneuverExecutorProgress = 0;
    }
    setFlightComputerModules((prev) => [...prev, newModule]);
  };

  const handleRemoveModule = (id: string) => {
    setFlightComputerModules((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateModule = (
    id: string,
    updates: Partial<FlightComputerModule>,
  ) => {
    setFlightComputerModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    );
  };

  const handleToggleModule = (id: string) => {
    setFlightComputerModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isEnabled: !m.isEnabled } : m)),
    );
  };

  // Module Group Management
  const handleAddGroup = () => {
    const newGroup: ModuleGroup = {
      id: `fc_group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: "New Group",
      color: "#10b981", // Default green
      isCollapsed: false,
      parentGroupId: null, // Start as top-level
    };
    setModuleGroups((prev) => [...prev, newGroup]);
  };

  const handleRemoveGroup = (groupId: string) => {
    // Ungroup all modules in this group
    setFlightComputerModules((prev) =>
      prev.map((m) => (m.groupId === groupId ? { ...m, groupId: null } : m)),
    );
    // Unparent all child groups
    setModuleGroups((prev) =>
      prev
        .map((g) =>
          g.parentGroupId === groupId ? { ...g, parentGroupId: null } : g,
        )
        .filter((g) => g.id !== groupId),
    );
  };

  const handleUpdateGroup = (
    groupId: string,
    updates: Partial<ModuleGroup>,
  ) => {
    setModuleGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
    );
  };

  const handleMoveModuleToGroup = (
    moduleId: string,
    groupId: string | null,
  ) => {
    setFlightComputerModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, groupId } : m)),
    );
  };

  const handleMoveGroupToGroup = (
    groupId: string,
    parentGroupId: string | null,
  ) => {
    // Prevent circular references
    const wouldCreateCycle = (
      childId: string,
      potentialParentId: string | null,
    ): boolean => {
      if (!potentialParentId) return false;
      if (childId === potentialParentId) return true;

      const parent = moduleGroups.find((g) => g.id === potentialParentId);
      if (!parent || !parent.parentGroupId) return false;

      return wouldCreateCycle(childId, parent.parentGroupId);
    };

    if (!wouldCreateCycle(groupId, parentGroupId)) {
      setModuleGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, parentGroupId } : g)),
      );
    }
  };

  useEffect(() => {
    const used = new Set<string>();
    let changed = false;
    const updated = flightComputerModules.map((module, index) => {
      let color = sanitizeHexColor(module.color);
      if (!color || used.has(color.toLowerCase())) {
        const paletteChoice = MODULE_COLOR_PALETTE.find(
          (c) => !used.has(c.toLowerCase()),
        );
        color = paletteChoice || hslToHex((index * 47) % 360, 70, 55);
        if (color !== module.color) {
          changed = true;
        }
      }
      used.add(color.toLowerCase());
      if (color !== module.color) {
        return { ...module, color };
      }
      return module;
    });
    if (changed) {
      setFlightComputerModules(updated);
    }
  }, [flightComputerModules, setFlightComputerModules]);

  const handleExportGroup = (groupId: string) => {
    const group = moduleGroups.find((g) => g.id === groupId);
    if (!group) return;

    // Recursively collect all child groups
    const collectChildGroups = (parentId: string): ModuleGroup[] => {
      const children = moduleGroups.filter((g) => g.parentGroupId === parentId);
      return [
        ...children,
        ...children.flatMap((c) => collectChildGroups(c.id)),
      ];
    };

    const allGroupIds = [
      groupId,
      ...collectChildGroups(groupId).map((g) => g.id),
    ];
    const groupsToExport = moduleGroups.filter((g) =>
      allGroupIds.includes(g.id),
    );
    const modulesToExport = flightComputerModules.filter((m) =>
      allGroupIds.includes(m.groupId || ""),
    );

    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      rootGroup: group,
      groups: groupsToExport,
      modules: modulesToExport,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${group.name.replace(/[^a-z0-9]/gi, "_")}_group.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportGroupFromJson = async (textData: string) => {
    const data = textData as any;
    console.log(data);

    // Generate new IDs to avoid conflicts
    const idMap = new Map<string, string>();
    const timestamp = Date.now();

    const groups = data?.groups as ModuleGroup[];
    const modules = data?.modules as FlightComputerModule[];

    const randomId = () => Math.floor(Math.random() * 1000000).toString();

    // Map old IDs to new IDs
    groups.forEach((g: ModuleGroup, idx: number) => {
      idMap.set(g.id, `fc_group_${timestamp}_${idx}_${randomId()}`);
    });
    modules.forEach((m: FlightComputerModule, idx: number) => {
      idMap.set(m.id, `fc_module_${timestamp}_${idx}_${randomId()}`);
    });

    // Update groups with new IDs
    const newGroups: ModuleGroup[] = groups.map((g: ModuleGroup) => ({
      ...g,
      id: idMap.get(g.id)!,
      parentGroupId: g.parentGroupId
        ? idMap.get(g.parentGroupId) || null
        : null,
      displayOutput: g.displayOutput
        ? {
            ...g.displayOutput,
            moduleId:
              idMap.get(g.displayOutput.moduleId) || g.displayOutput.moduleId,
          }
        : undefined,
    }));

    // Update modules with new IDs
    const newModules: FlightComputerModule[] = data.modules.map(
      (m: FlightComputerModule) => {
        const newModule = {
          ...m,
          id: idMap.get(m.id)!,
          groupId: m.groupId ? idMap.get(m.groupId) || null : null,
        };

        // Update input references in modules
        if (m.inputs) {
          const newInputs: Record<string, FlightComputerInput> = {};
          Object.entries(m.inputs).forEach(([key, input]) => {
            // Check if this is a module reference (value format: "moduleId:outputKey")
            if (input.type === "module_output") {
              const [moduleId, outputKey] = input.value.split(":");
              if (outputKey) {
                // This is a module reference
                const newModuleId = idMap.get(moduleId) || moduleId;
                newInputs[key] = {
                  ...input,
                  value: `${newModuleId}:${outputKey}`,
                };
              } else {
                newInputs[key] = input;
              }
            } else {
              newInputs[key] = input;
            }
          });
          newModule.inputs = newInputs;
        }

        return newModule;
      },
    );

    // Add to existing state (don't clear)
    setModuleGroups((prev) => [...prev, ...newGroups]);
    setFlightComputerModules((prev) => [...prev, ...newModules]);
  };

  const handleImportGroup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Generate new IDs to avoid conflicts
        const idMap = new Map<string, string>();
        const timestamp = Date.now();

        // Map old IDs to new IDs
        data.groups.forEach((g: ModuleGroup, idx: number) => {
          idMap.set(g.id, `fc_group_${timestamp}_${idx}`);
        });
        data.modules.forEach((m: FlightComputerModule, idx: number) => {
          idMap.set(m.id, `fc_module_${timestamp}_${idx}`);
        });

        // Update groups with new IDs
        const newGroups: ModuleGroup[] = data.groups.map((g: ModuleGroup) => ({
          ...g,
          id: idMap.get(g.id)!,
          parentGroupId: g.parentGroupId
            ? idMap.get(g.parentGroupId) || null
            : null,
          displayOutput: g.displayOutput
            ? {
                ...g.displayOutput,
                moduleId:
                  idMap.get(g.displayOutput.moduleId) ||
                  g.displayOutput.moduleId,
              }
            : undefined,
        }));

        // Update modules with new IDs
        const newModules: FlightComputerModule[] = data.modules.map(
          (m: FlightComputerModule) => {
            const newModule = {
              ...m,
              id: idMap.get(m.id)!,
              groupId: m.groupId ? idMap.get(m.groupId) || null : null,
            };

            // Update input references in modules
            if (m.inputs) {
              const newInputs: Record<string, FlightComputerInput> = {};
              Object.entries(m.inputs).forEach(([key, input]) => {
                // Check if this is a module reference (value format: "moduleId:outputKey")
                if (input.type === "module_output") {
                  const [moduleId, outputKey] = input.value.split(":");
                  if (outputKey) {
                    // This is a module reference
                    const newModuleId = idMap.get(moduleId) || moduleId;
                    newInputs[key] = {
                      ...input,
                      value: `${newModuleId}:${outputKey}`,
                    };
                  } else {
                    newInputs[key] = input;
                  }
                } else {
                  newInputs[key] = input;
                }
              });
              newModule.inputs = newInputs;
            }

            return newModule;
          },
        );

        // Add to existing state (don't clear)
        setModuleGroups((prev) => [...prev, ...newGroups]);
        setFlightComputerModules((prev) => [...prev, ...newModules]);
      } catch (error) {
        console.error("Failed to import group:", error);
        alert("Failed to import group. Please check the file format.");
      }
    };
    input.click();
  };

  const importGroupFromData = (data: any) => {
    // Generate new IDs to avoid conflicts
    const idMap = new Map<string, string>();
    const timestamp = Date.now();

    // Map old IDs to new IDs
    data.groups.forEach((g: ModuleGroup, idx: number) => {
      idMap.set(g.id, `fc_group_${timestamp}_${idx}`);
    });
    data.modules.forEach((m: FlightComputerModule, idx: number) => {
      idMap.set(m.id, `fc_module_${timestamp}_${idx}`);
    });

    // Update groups with new IDs
    const newGroups: ModuleGroup[] = data.groups.map((g: ModuleGroup) => ({
      ...g,
      id: idMap.get(g.id)!,
      parentGroupId: g.parentGroupId
        ? idMap.get(g.parentGroupId) || null
        : null,
      displayOutput: g.displayOutput
        ? {
            ...g.displayOutput,
            moduleId:
              idMap.get(g.displayOutput.moduleId) || g.displayOutput.moduleId,
          }
        : undefined,
    }));

    // Update modules with new IDs
    const newModules: FlightComputerModule[] = data.modules.map(
      (m: FlightComputerModule) => {
        const newModule = {
          ...m,
          id: idMap.get(m.id)!,
          groupId: m.groupId ? idMap.get(m.groupId) || null : null,
        };

        // Update input references in modules
        if (m.inputs) {
          const newInputs: Record<string, FlightComputerInput> = {};
          Object.entries(m.inputs).forEach(([key, input]) => {
            // Check if this is a module reference (value format: "moduleId:outputKey")
            if (input.type === "module_output") {
              const [moduleId, outputKey] = input.value.split(":");
              if (outputKey) {
                // This is a module reference
                const newModuleId = idMap.get(moduleId) || moduleId;
                newInputs[key] = {
                  ...input,
                  value: `${newModuleId}:${outputKey}`,
                };
              } else {
                newInputs[key] = input;
              }
            } else {
              newInputs[key] = input;
            }
          });
          newModule.inputs = newInputs;
        }

        return newModule;
      },
    );

    // Add to existing state (don't clear)
    setModuleGroups((prev) => [...prev, ...newGroups]);
    setFlightComputerModules((prev) => [...prev, ...newModules]);
  };

  const handlePuterExportGroup = async (groupId: string) => {
    // @ts-ignore
    if (typeof puter === "undefined") {
      alert("Puter is not available");
      return;
    }

    const group = moduleGroups.find((g) => g.id === groupId);
    if (!group) return;

    // Recursively collect all child groups
    const collectChildGroups = (parentId: string): ModuleGroup[] => {
      const children = moduleGroups.filter((g) => g.parentGroupId === parentId);
      return [
        ...children,
        ...children.flatMap((c) => collectChildGroups(c.id)),
      ];
    };

    const allGroupIds = [
      groupId,
      ...collectChildGroups(groupId).map((g) => g.id),
    ];
    const groupsToExport = moduleGroups.filter((g) =>
      allGroupIds.includes(g.id),
    );
    const modulesToExport = flightComputerModules.filter((m) =>
      allGroupIds.includes(m.groupId || ""),
    );

    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      rootGroup: group,
      groups: groupsToExport,
      modules: modulesToExport,
    };

    try {
      // @ts-ignore
      const file = await puter.ui.showSaveFilePicker(
        JSON.stringify(exportData, null, 2),
        `${group.name.replace(/[^a-z0-9]/gi, "_")}_group.json`,
      );
      if (file) {
        // @ts-ignore
        await puter.fs.write(file.path, JSON.stringify(exportData, null, 2));
        alert("Group saved to Puter successfully!");
      }
    } catch (error) {
      console.error("Failed to save to Puter:", error);
      alert("Failed to save to Puter");
    }
  };

  const handlePuterImportGroup = async () => {
    // @ts-ignore
    if (typeof puter === "undefined") {
      alert("Puter is not available");
      return;
    }

    try {
      // @ts-ignore
      const file = await puter.ui.showOpenFilePicker();
      if (file) {
        // @ts-ignore
        const content = await puter.fs.read(file.path);

        let textContent: string;
        if (typeof content === "string") {
          textContent = content;
        } else {
          // Blob
          textContent = await (content as Blob).text();
        }

        const data = JSON.parse(textContent);

        importGroupFromData(data);
        alert("Group imported from Puter successfully!");
      }
    } catch (error) {
      console.error("Failed to import from Puter:", error);
      alert("Failed to import from Puter");
    }
  };
  const flightComputerModulesRef = useRef(flightComputerModules);
  useEffect(() => {
    flightComputerModulesRef.current = flightComputerModules;
  }, [flightComputerModules]);

  const rendezvousSolutionMapRef = useRef<Record<string, RendezvousSolution>>(
    {},
  );
  useEffect(() => {
    const map: Record<string, RendezvousSolution> = {};
    rendezvousPoints.forEach((point) => {
      map[point.moduleId] = point;
    });
    rendezvousSolutionMapRef.current = map;
  }, [rendezvousPoints]);

  const maneuverExecutorTriggerStateRef = useRef<
    Map<string, { queue: boolean; execute: boolean }>
  >(new Map());
  const thrustBurstTriggerStateRef = useRef<Map<string, boolean>>(new Map());
  const thrustBurstRuntimeRef = useRef<
    Map<
      string,
      {
        remainingTime: number;
        totalDuration: number;
        perSecondVector: Vector2D;
        forceVector: Vector2D;
        deltaVector: Vector2D;
        rocketId: string;
        elapsed: number;
      }
    >
  >(new Map());

  useEffect(() => {
    const activeIds = new Set(flightComputerModules.map((m) => m.id));
    Array.from(maneuverExecutorTriggerStateRef.current.keys()).forEach((id) => {
      if (!activeIds.has(id)) {
        maneuverExecutorTriggerStateRef.current.delete(id);
      }
    });
    Array.from(thrustBurstRuntimeRef.current.keys()).forEach((id) => {
      if (!activeIds.has(id)) {
        thrustBurstRuntimeRef.current.delete(id);
      }
    });
    Array.from(thrustBurstTriggerStateRef.current.keys()).forEach((id) => {
      if (!activeIds.has(id)) {
        thrustBurstTriggerStateRef.current.delete(id);
      }
    });
  }, [flightComputerModules]);

  const setThrustBurstCompletion = useCallback(
    (moduleId: string, completed: boolean) => {
      setFlightComputerModules((prev) => {
        let changed = false;
        const next = prev.map((m) => {
          if (m.id === moduleId) {
            const current = m.thrustBurstCompleted ?? true;
            if (current !== completed) {
              changed = true;
              return { ...m, thrustBurstCompleted: completed };
            }
          }
          return m;
        });
        return changed ? next : prev;
      });
    },
    [],
  );

  const applyManeuverExecutorModules = useCallback(
    (bodiesSnapshot: Body[]) => {
      const modules = flightComputerModulesRef.current;
      if (!modules.length) return bodiesSnapshot;

      const moduleUpdates: Record<string, Partial<FlightComputerModule>> = {};
      const queueUpdate = (
        module: FlightComputerModule,
        patch: Partial<FlightComputerModule>,
      ) => {
        const existing = moduleUpdates[module.id] || {};
        let changed = false;
        Object.entries(patch).forEach(([key, value]) => {
          if (
            (module as any)[key] !== value ||
            existing[key as keyof FlightComputerModule] !== value
          ) {
            (existing as any)[key] = value;
            changed = true;
          }
        });
        if (changed) {
          moduleUpdates[module.id] = existing;
        }
      };

      const gConst = physicsConfigRef.current.gravitationalConstant;
      const rendezvousMap = rendezvousSolutionMapRef.current;

      const buildManeuverFromModule = (
        module: FlightComputerModule,
      ): Maneuver | null => {
        const type = module.maneuverExecutorType || "burn";
        const maneuversId = `fc_exec_${module.id}_${Date.now()}`;
        const base: Maneuver = {
          id: maneuversId,
          type: type as Maneuver["type"],
          thrust: 0,
          duration: 0,
          angleOffset: 0,
          progress: 0,
          status: "pending",
        };

        switch (type) {
          case "burn":
            base.thrust = module.maneuverExecutorThrust ?? 0;
            base.duration = module.maneuverExecutorDuration ?? 0;
            base.angleOffset =
              ((module.maneuverExecutorAngleDeg ?? 0) * Math.PI) / 180;
            return base;
          case "wait":
            base.duration = module.maneuverExecutorDuration ?? 0;
            return base;
          case "rotate":
            base.param = Number(module.maneuverExecutorParam ?? 0);
            return base;
          case "sas":
            base.param = (module.maneuverExecutorParam as string) || "prograde";
            base.parentBodyId =
              module.maneuverExecutorParentBodyId || module.referenceBodyId;
            return base;
          case "auto_circularize":
          case "auto_land":
            base.targetBodyId =
              module.maneuverExecutorTargetBodyId || module.targetBodyId;
            return base.targetBodyId ? base : null;
          case "auto_transfer":
          case "wait_for_transfer":
          case "auto_intercept":
            base.targetBodyId =
              module.maneuverExecutorTargetBodyId || module.targetBodyId;
            base.parentBodyId =
              module.maneuverExecutorParentBodyId || module.referenceBodyId;
            if (!base.targetBodyId || !base.parentBodyId) return null;
            if (type === "wait_for_transfer") {
              base.param = Number(module.maneuverExecutorParam ?? 1);
            }
            if (type === "auto_intercept") {
              base.param = Number(module.maneuverExecutorParam ?? 30);
            }
            return base;
          case "wait_for_altitude":
            const altitude = Number(module.maneuverExecutorParam ?? 0);
            if (!altitude) return null;
            base.param = `${altitude}:${module.maneuverExecutorAltitudeDirection || "ascending"}`;
            base.parentBodyId =
              module.maneuverExecutorParentBodyId || module.referenceBodyId;
            return base.parentBodyId ? base : null;
          case "burn_until_altitude":
            const targetAlt = Number(module.maneuverExecutorParam ?? 0);
            if (!targetAlt) return null;
            base.param = targetAlt;
            base.parentBodyId =
              module.maneuverExecutorParentBodyId || module.referenceBodyId;
            base.thrust = module.maneuverExecutorThrust ?? 0;
            base.angleOffset =
              ((module.maneuverExecutorAngleDeg ?? 0) * Math.PI) / 180;
            return base.parentBodyId ? base : null;
          case "manual_node":
            base.timeFromNow = module.maneuverExecutorDuration ?? 0;
            base.deltaVPrograde = module.maneuverExecutorDeltaVPrograde ?? 0;
            base.deltaVRadial = module.maneuverExecutorDeltaVRadial ?? 0;
            base.parentBodyId =
              module.maneuverExecutorParentBodyId || module.referenceBodyId;
            return base;
          case "change_simulation_speed":
            base.param = Number(module.maneuverExecutorParam ?? 1);
            return base;
          case "stage":
            // No parameters needed — separation is automatic via system event
            return base;
          default:
            return base;
        }
      };

      modules.forEach((module) => {
        if (module.type !== "maneuver_executor") {
          return;
        }

        const state = maneuverExecutorTriggerStateRef.current.get(
          module.id,
        ) || { queue: false, execute: false };

        if (!module.isEnabled) {
          if (
            module.maneuverExecutorStatus !== "idle" ||
            module.maneuverExecutorProgress
          ) {
            queueUpdate(module, {
              maneuverExecutorStatus: "idle",
              maneuverExecutorProgress: 0,
              maneuverExecutorActiveManeuverId: undefined,
            });
          }
          maneuverExecutorTriggerStateRef.current.set(module.id, {
            queue: false,
            execute: false,
          });
          return;
        }

        const rocketInput =
          module.inputs?.primary ||
          (module.primaryBodyId
            ? { type: "body", value: module.primaryBodyId }
            : undefined);
        const rocketEntity = resolveInput(
          rocketInput,
          bodiesSnapshot,
          modules,
          gConst,
          rendezvousMap,
        );
        if (!rocketEntity || !("id" in rocketEntity)) {
          queueUpdate(module, {
            maneuverExecutorStatus: "idle",
            maneuverExecutorProgress: 0,
            maneuverExecutorActiveManeuverId: undefined,
          });
          maneuverExecutorTriggerStateRef.current.set(module.id, {
            queue: false,
            execute: false,
          });
          return;
        }

        const rocketIndex = bodiesSnapshot.findIndex(
          (b) => b.id === rocketEntity.id,
        );
        if (rocketIndex === -1) {
          queueUpdate(module, {
            maneuverExecutorStatus: "idle",
            maneuverExecutorProgress: 0,
            maneuverExecutorActiveManeuverId: undefined,
          });
          maneuverExecutorTriggerStateRef.current.set(module.id, {
            queue: false,
            execute: false,
          });
          return;
        }

        const rocket = bodiesSnapshot[rocketIndex];
        if (!rocket.isRocket) {
          queueUpdate(module, {
            maneuverExecutorStatus: "idle",
            maneuverExecutorProgress: 0,
            maneuverExecutorActiveManeuverId: undefined,
          });
          maneuverExecutorTriggerStateRef.current.set(module.id, {
            queue: false,
            execute: false,
          });
          return;
        }

        const queueSignal =
          resolveBooleanInput(
            module.inputs?.queueTrigger,
            bodiesSnapshot,
            modules,
            gConst,
            rendezvousMap,
          ) ?? false;
        const executeSignal =
          resolveBooleanInput(
            module.inputs?.executeTrigger,
            bodiesSnapshot,
            modules,
            gConst,
            rendezvousMap,
          ) ?? false;
        const queueRising = queueSignal && !state.queue;
        const executeRising = executeSignal && !state.execute;
        maneuverExecutorTriggerStateRef.current.set(module.id, {
          queue: queueSignal,
          execute: executeSignal,
        });

        const enqueueManeuver = (updateLastRequestId?: number) => {
          const newManeuver = buildManeuverFromModule(module);
          if (newManeuver) {
            rocket.maneuvers = rocket.maneuvers
              ? [...rocket.maneuvers, newManeuver]
              : [newManeuver];
            queueUpdate(module, {
              maneuverExecutorActiveManeuverId: newManeuver.id,
              maneuverExecutorStatus: "queued",
              maneuverExecutorProgress: 0,
              ...(updateLastRequestId
                ? { maneuverExecutorLastRequestId: updateLastRequestId }
                : {}),
            });
            // TAG TIMESTAMP for Selective Merge (Prevent Worker Overwrite)
            if (lastBodyUpdateTimesRef.current) {
              lastBodyUpdateTimesRef.current.set(rocket.id, Date.now());
            }
            return true;
          } else {
            queueUpdate(module, {
              maneuverExecutorStatus: "idle",
              maneuverExecutorProgress: 0,
              ...(updateLastRequestId
                ? { maneuverExecutorLastRequestId: updateLastRequestId }
                : {}),
            });
            return false;
          }
        };

        const executeMissionPlan = () => {
          if (
            rocket.maneuvers &&
            rocket.maneuvers.some((m) => m.status === "pending")
          ) {
            rocket.maneuvers = rocket.maneuvers.map((m) =>
              m.status === "pending" ? { ...m, status: "active" as const } : m,
            );
            // TAG TIMESTAMP for Selective Merge
            if (lastBodyUpdateTimesRef.current) {
              lastBodyUpdateTimesRef.current.set(rocket.id, Date.now());
            }
          }
        };

        if (module.isEnabled && queueRising) {
          enqueueManeuver();
        }

        if (module.isEnabled && executeRising) {
          executeMissionPlan();
        }

        const requestId = module.maneuverExecutorRequestId;
        const lastRequest = module.maneuverExecutorLastRequestId;
        if (module.isEnabled && requestId && requestId !== lastRequest) {
          if (enqueueManeuver(requestId)) {
            executeMissionPlan();
          }
        }

        const activeId = module.maneuverExecutorActiveManeuverId;
        if (activeId && rocket.maneuvers) {
          const maneuver = rocket.maneuvers.find((m) => m.id === activeId);
          if (maneuver) {
            const status =
              maneuver.status === "completed"
                ? "completed"
                : maneuver.status === "active"
                  ? "running"
                  : "queued";
            const progress = maneuver.progress || 0;
            const patch: Partial<FlightComputerModule> = {};
            if (module.maneuverExecutorStatus !== status)
              patch.maneuverExecutorStatus = status;
            if ((module.maneuverExecutorProgress ?? 0) !== progress)
              patch.maneuverExecutorProgress = progress;
            if (maneuver.status === "completed") {
              patch.maneuverExecutorActiveManeuverId = undefined;
            }
            if (Object.keys(patch).length) queueUpdate(module, patch);
          } else if (module.maneuverExecutorStatus !== "idle") {
            queueUpdate(module, {
              maneuverExecutorStatus: "idle",
              maneuverExecutorProgress: 0,
              maneuverExecutorActiveManeuverId: undefined,
            });
          }
        }
      });

      const updateIds = Object.keys(moduleUpdates);
      if (updateIds.length) {
        setFlightComputerModules((prev) =>
          prev.map((m) =>
            moduleUpdates[m.id] ? { ...m, ...moduleUpdates[m.id] } : m,
          ),
        );
      }

      return bodiesSnapshot;
    },
    [setFlightComputerModules],
  );

  const applyThrustBurstModules = useCallback(
    (bodiesSnapshot: Body[], dt: number) => {
      const modules = flightComputerModulesRef.current;
      if (!modules.length) return bodiesSnapshot;

      const gConst = physicsConfigRef.current.gravitationalConstant;
      const rendezvousMap = rendezvousSolutionMapRef.current;

      const normalizeVector = (vec: Vector2D): Vector2D | null => {
        const mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
        if (mag < 1e-8) return null;
        return { x: vec.x / mag, y: vec.y / mag };
      };

      const getReferenceBody = (
        module: FlightComputerModule,
        rocket: Body,
      ): Body | null => {
        const referenceInput =
          module.inputs?.reference ||
          (module.referenceBodyId
            ? { type: "body", value: module.referenceBodyId }
            : undefined);
        if (referenceInput) {
          const referenceEntity = resolveInput(
            referenceInput,
            bodiesSnapshot,
            modules,
            gConst,
            rendezvousMap,
          );
          if (referenceEntity && "mass" in referenceEntity) {
            return referenceEntity as Body;
          }
        }
        if (rocket.orbitReferenceId) {
          const ref = bodiesSnapshot.find(
            (b) => b.id === rocket.orbitReferenceId,
          );
          if (ref) return ref;
        }
        return null;
      };

      const stopBurst = (moduleId: string, rocket?: Body) => {
        thrustBurstRuntimeRef.current.delete(moduleId);
        if (rocket) {
          rocket.thrust = { x: 0, y: 0 };
        }
        setThrustBurstCompletion(moduleId, true);
      };

      modules.forEach((module) => {
        if (module.type !== "thrust_burst") return;

        const runtime = thrustBurstRuntimeRef.current.get(module.id);

        if (!module.isEnabled) {
          if (runtime) {
            const targetRocket = bodiesSnapshot.find(
              (b) => b.id === runtime.rocketId,
            );
            stopBurst(module.id, targetRocket || undefined);
          } else if (module.thrustBurstCompleted === false) {
            setThrustBurstCompletion(module.id, true);
          }
          return;
        }

        const rocketInput =
          module.inputs?.primary ||
          (module.primaryBodyId
            ? { type: "body", value: module.primaryBodyId }
            : undefined);
        if (!rocketInput) return;

        const rocketEntity = resolveInput(
          rocketInput,
          bodiesSnapshot,
          modules,
          gConst,
          rendezvousMap,
        );
        if (!rocketEntity || !("id" in rocketEntity)) return;

        const rocketIndex = bodiesSnapshot.findIndex(
          (b) => b.id === rocketEntity.id,
        );
        if (rocketIndex === -1) {
          if (runtime) {
            stopBurst(module.id);
          }
          return;
        }

        const rocket = bodiesSnapshot[rocketIndex];
        if (!rocket.isRocket) {
          if (runtime) {
            stopBurst(module.id, rocket);
          }
          return;
        }

        const progradeScalar = resolveScalarInput(
          module.inputs?.deltaVPrograde,
          bodiesSnapshot,
          modules,
          gConst,
          rendezvousMap,
        );
        const radialScalar = resolveScalarInput(
          module.inputs?.deltaVRadial,
          bodiesSnapshot,
          modules,
          gConst,
          rendezvousMap,
        );
        const durationScalar = resolveScalarInput(
          module.inputs?.duration,
          bodiesSnapshot,
          modules,
          gConst,
          rendezvousMap,
        );
        const triggerValue = resolveBooleanInput(
          module.inputs?.trigger,
          bodiesSnapshot,
          modules,
          gConst,
          rendezvousMap,
        );

        const deltaVPrograde =
          progradeScalar ?? module.thrustBurstDeltaVPrograde ?? 0;
        const deltaVRadial =
          radialScalar ?? module.thrustBurstDeltaVRadial ?? 0;
        const plannedDuration =
          durationScalar ?? module.thrustBurstDuration ?? 1;
        const mode = module.thrustBurstMode || "impulse";

        const startSignal = triggerValue ?? false;
        const previousSignal =
          thrustBurstTriggerStateRef.current.get(module.id) || false;
        const risingEdge = startSignal && !previousSignal;
        thrustBurstTriggerStateRef.current.set(module.id, startSignal);

        const resolveBasis = () => {
          const reference = getReferenceBody(module, rocket);
          let radial: Vector2D | null = reference
            ? normalizeVector({
                x: rocket.position.x - reference.position.x,
                y: rocket.position.y - reference.position.y,
              })
            : null;

          const speed = Math.sqrt(
            rocket.velocity.x * rocket.velocity.x +
              rocket.velocity.y * rocket.velocity.y,
          );
          let prograde: Vector2D | null = null;

          if (speed > 0.0001) {
            prograde = {
              x: rocket.velocity.x / speed,
              y: rocket.velocity.y / speed,
            };
          }

          if (!radial) {
            if (rocket.angle !== undefined) {
              radial = { x: Math.cos(rocket.angle), y: Math.sin(rocket.angle) };
              prograde = { x: -radial.y, y: radial.x };
            } else if (prograde) {
              radial = { x: -prograde.y, y: prograde.x };
            } else {
              prograde = { x: 1, y: 0 };
              radial = { x: 0, y: 1 };
            }
          } else if (!prograde) {
            prograde = { x: -radial.y, y: radial.x };
          }

          const finalPrograde = normalizeVector(prograde) || { x: 1, y: 0 };
          const finalRadial = normalizeVector(radial) || {
            x: -finalPrograde.y,
            y: finalPrograde.x,
          };
          return { prograde: finalPrograde, radial: finalRadial };
        };

        if (risingEdge) {
          const magnitudeCheck =
            Math.abs(deltaVPrograde) + Math.abs(deltaVRadial);
          if (magnitudeCheck < 1e-6) {
            stopBurst(module.id, rocket);
          } else {
            const { prograde, radial } = resolveBasis();
            const deltaVector = {
              x: prograde.x * deltaVPrograde + radial.x * deltaVRadial,
              y: prograde.y * deltaVPrograde + radial.y * deltaVRadial,
            };

            if (mode === "impulse" || plannedDuration <= 0) {
              setThrustBurstCompletion(module.id, false);
              rocket.velocity = {
                x: rocket.velocity.x + deltaVector.x,
                y: rocket.velocity.y + deltaVector.y,
              };
              stopBurst(module.id, rocket);
            } else {
              const totalDuration = Math.max(plannedDuration, 0.01);
              const perSecondVector = {
                x: deltaVector.x / totalDuration,
                y: deltaVector.y / totalDuration,
              };
              const forceVector = {
                x: perSecondVector.x * rocket.mass,
                y: perSecondVector.y * rocket.mass,
              };

              thrustBurstRuntimeRef.current.set(module.id, {
                remainingTime: totalDuration,
                totalDuration,
                perSecondVector,
                forceVector,
                deltaVector,
                rocketId: rocket.id,
                elapsed: 0,
              });
              setThrustBurstCompletion(module.id, false);
            }
          }
        }

        const activeRuntime = thrustBurstRuntimeRef.current.get(module.id);
        if (activeRuntime) {
          if (activeRuntime.rocketId !== rocket.id) {
            stopBurst(module.id, rocket);
          } else {
            if (activeRuntime.remainingTime > 0) {
              rocket.thrust = { ...activeRuntime.forceVector };
              const step = Math.min(dt, activeRuntime.remainingTime);
              activeRuntime.remainingTime = Math.max(
                0,
                activeRuntime.remainingTime - step,
              );
              activeRuntime.elapsed += step;
            }
            if (activeRuntime.remainingTime <= 0) {
              const delivered = {
                x: activeRuntime.perSecondVector.x * activeRuntime.elapsed,
                y: activeRuntime.perSecondVector.y * activeRuntime.elapsed,
              };
              const correction = {
                x: activeRuntime.deltaVector.x - delivered.x,
                y: activeRuntime.deltaVector.y - delivered.y,
              };
              rocket.velocity = {
                x: rocket.velocity.x + correction.x,
                y: rocket.velocity.y + correction.y,
              };
              rocket.thrust = { x: 0, y: 0 };
              stopBurst(module.id);
            }
          }
        } else if (!startSignal && module.thrustBurstCompleted === false) {
          rocket.thrust = { x: 0, y: 0 };
          setThrustBurstCompletion(module.id, true);
        }
      });

      return bodiesSnapshot;
    },
    [setThrustBurstCompletion],
  );

  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);
  useEffect(() => {
    followingBodyIdRef.current = followingBodyId;
  }, [followingBodyId]);
  useEffect(() => {
    followingCoMRef.current = followingCoM;
  }, [followingCoM]);

  // Sync refs with state, but careful about race conditions if state update lags
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    physicsConfigRef.current = physicsConfig;
  }, [physicsConfig]);
  useEffect(() => {
    visualConfigRef.current = visualConfig;
  }, [visualConfig]);

  // Initialize Prediction Worker
  useEffect(() => {
    predictionWorkerRef.current = new Worker(
      new URL("./services/predictionWorker.ts", import.meta.url),
      { type: "module" },
    );

    predictionWorkerRef.current.onmessage = (
      e: MessageEvent<{
        paths: { id: string; color: string; points: Vector2D[] }[];
        maneuverNodes: { maneuverId: string; position: Vector2D }[];
      }>,
    ) => {
      setPredictionPaths(e.data.paths);
      if (e.data.maneuverNodes) {
        setPredictionNodePositions(e.data.maneuverNodes);
      }
      isWorkerBusyRef.current = false;
    };

    return () => {
      predictionWorkerRef.current?.terminate();
    };
  }, []);

  // Initialize Physics Worker
  useEffect(() => {
    physicsWorkerRef.current = new Worker(
      new URL("./services/physicsWorker.ts", import.meta.url),
      { type: "module" },
    );

    physicsWorkerRef.current.onmessage = (e: MessageEvent<PhysicsResult>) => {
      const {
        bodies: newBodies,
        newParticles: newExplosions,
        systemEvents,
        jobId,
      } = e.data;

      // Job ID Check: Discard results from old jobs (Reset/Reverse happened)
      if (jobId !== undefined && jobId !== workerJobIdRef.current) {
        isPhysicsWorkerBusyRef.current = false;
        return;
      }

      // SELECTIVE MERGE: Integrate Worker Physics with Main Thread Inputs
      // Because the Worker processes a "snapshot" of state, it might overwrite
      // recent user inputs (Rocket Controls) that happened on the Main Thread
      // while the worker was busy. We prioritize FRESH user inputs.
      const mergedBodies = newBodies.map((workerBody) => {
        const localBody = bodiesRef.current.find((b) => b.id === workerBody.id);
        if (!localBody) return workerBody;

        // --- TRAIL UPDATE (Main Thread) ---
        // Since we stripped trails from the worker, we must update them here.
        const currentTrail = localBody.trail; // Mutable Reference

        // Add new point (from worker's final position)
        // Limit to 50% rate to match previous behavior if desired, or simpler 100%
        if (Math.random() > 0.5) {
          currentTrail.push({
            x: workerBody.position.x,
            y: workerBody.position.y,
          });

          const limit = visualConfigRef.current.trailLength;
          if (currentTrail.length > limit) {
            const excess = currentTrail.length - limit;
            if (excess > 1) {
              currentTrail.splice(0, excess);
            } else {
              currentTrail.shift();
            }
          }
        }

        const lastInputTime =
          lastBodyUpdateTimesRef.current.get(workerBody.id) || 0;
        // If user input < 100ms ago, assume it's fresher than worker result
        const isFreshInput = Date.now() - lastInputTime < 100;
        const isDocked =
          workerBody.landedOnBodyId &&
          workerBody.landedOnBodyId.includes("rocket_");

        if (localBody.isRocket && isFreshInput && !isDocked) {
          return {
            ...workerBody,
            // Keep LOCAL User Inputs
            thrust: localBody.thrust,
            angle: localBody.angle,
            sasMode: localBody.sasMode || workerBody.sasMode,
            // Keep Structure Changes (Mass, Radius, Structure)
            mass: localBody.mass,
            radius: localBody.radius,
            shipStructure: localBody.shipStructure,
            // Keep Worker Physics
            position: workerBody.position,
            velocity: workerBody.velocity,
            fuel: workerBody.fuel,
            // Merge Maneuvers
            maneuvers: localBody.maneuvers,
            // RESTORE TRAIL
            trail: currentTrail,
          };
        }

        if (localBody.isRocket && isFreshInput && isDocked) {
          return {
            ...workerBody,
            // Keep LOCAL Thrust/Maneuvers to allow Undocking
            thrust: localBody.thrust,
            maneuvers: localBody.maneuvers,
            // Keep Structure Changes
            mass: localBody.mass,
            radius: localBody.radius,
            shipStructure: localBody.shipStructure,
            // Trust Worker for Transform
            angle: workerBody.angle,
            position: workerBody.position,
            velocity: workerBody.velocity,
            fuel: workerBody.fuel,
            sasMode: localBody.sasMode || workerBody.sasMode,
            // RESTORE TRAIL
            trail: currentTrail,
          };
        }

        return {
          ...workerBody,
          trail: currentTrail,
        };
      });

      // Append any NEW bodies from local state that are missing from worker state
      // (e.g. newly spawned debris or rockets not yet simulated)
      // BUT: Do NOT append bodies that were SENT to worker but are missing from result (Destroyed)
      const workerBodyIds = new Set(newBodies.map((b) => b.id));
      const sentBodyIds = sentBodyIdsRef.current;

      const missingBodies = bodiesRef.current.filter((b) => {
        const inWorker = workerBodyIds.has(b.id);
        if (inWorker) return false; // Already handled in mergedBodies

        const wasSent = sentBodyIds.has(b.id);
        if (wasSent) {
          // It was sent, but not returned -> DESTROYED/MERGED in worker.
          // Do NOT keep it.
          return false;
        }

        // It was NOT sent -> NEWLY SPAWNED locally. Keep it.
        return true;
      });

      const finalBodies = [...mergedBodies, ...missingBodies];

      // Apply updates
      bodiesRef.current = finalBodies;
      setBodies(finalBodies);

      if (newExplosions && newExplosions.length > 0) {
        // DIRECTLY UPDATE REF for immediate rendering in loop
        particlesRef.current = [...particlesRef.current, ...newExplosions];
        if (particlesRef.current.length > 10000) {
          particlesRef.current = particlesRef.current.slice(-10000);
        }

        // Also update state for React re-renders (less frequent usually)
        setParticles(particlesRef.current);
      }

      // Handle System Events (e.g. Speed Change from Flight Computer)
      if (systemEvents) {
        systemEvents.forEach((event) => {
          if (event.type === "set_speed" && typeof event.value === "number") {
            setSpeed(event.value);
          } else if (event.type === "stage_rocket" && event.rocketId) {
            handleStageRocket(event.rocketId);
          }
        });
      }

      isPhysicsWorkerBusyRef.current = false;
      timeSentToWorkerRef.current = 0; // Worker finished, so pending time is 0 (relative to new state)
    };

    return () => {
      physicsWorkerRef.current?.terminate();
    };
  }, []);

  // Sync Prediction Refs
  // Sync Prediction Refs
  useEffect(() => {
    selectedBodyIdRef.current = selectedBodyId;
  }, [selectedBodyId]);
  useEffect(() => {
    isCreationModeRef.current = isCreationMode;
  }, [isCreationMode]);
  useEffect(() => {
    creationCandidateRef.current = creationCandidate;
  }, [creationCandidate]);
  useEffect(() => {
    predictionStepsRef.current = predictionSteps;
  }, [predictionSteps]);
  useEffect(() => {
    isPredictionEnabledRef.current = isPredictionEnabled;
  }, [isPredictionEnabled]);
  useEffect(() => {
    predictionBodyIdsRef.current = predictionBodyIds;
  }, [predictionBodyIds]);
  useEffect(() => {
    rocketTargetBodyIdRef.current = rocketTargetBodyId;
  }, [rocketTargetBodyId]);
  useEffect(() => {
    rocketParentBodyIdRef.current = rocketParentBodyId;
  }, [rocketParentBodyId]);

  // START of Rendezvous Calculation Effect
  const lastRendezvousUpdateRef = useRef(0);
  const rendezvousStateRef = useRef({
    flightComputerModules,
    predictionPaths,
    predictionSteps,
    physicsConfig,
    isPredictionEnabled,
    bodies,
  });

  // Sync Ref
  useEffect(() => {
    rendezvousStateRef.current = {
      flightComputerModules,
      predictionPaths,
      predictionSteps,
      physicsConfig,
      isPredictionEnabled,
      bodies,
    };
  });

  useEffect(() => {
    const updateRendezvous = () => {
      const now = Date.now();
      // THROTTLE: Only run every 100ms
      if (now - lastRendezvousUpdateRef.current < 100) return;
      lastRendezvousUpdateRef.current = now;

      const {
        flightComputerModules,
        predictionPaths,
        predictionSteps,
        physicsConfig,
        isPredictionEnabled,
        bodies,
      } = rendezvousStateRef.current;

      // Filter for active rendezvous modules (checking both new inputs and legacy targetBodyId)
      const activeRendezvousModules = flightComputerModules.filter(
        (m) =>
          m.type === "rendezvous_tracker" &&
          m.isEnabled &&
          (m.inputs?.target || m.targetBodyId),
      );

      if (
        activeRendezvousModules.length === 0 ||
        !predictionPaths ||
        predictionPaths.length === 0
      ) {
        setRendezvousPoints([]);
        return;
      }

      const newRendezvousPoints: RendezvousSolution[] = [];

      for (const module of activeRendezvousModules) {
        // Resolve Inputs
        const rocketInput =
          module.inputs?.primary ||
          (module.primaryBodyId
            ? { type: "body", value: module.primaryBodyId }
            : undefined);
        const targetInput =
          module.inputs?.target ||
          (module.targetBodyId
            ? { type: "body", value: module.targetBodyId }
            : undefined);

        const rocketEntity = resolveInput(
          rocketInput,
          bodies,
          flightComputerModules,
          physicsConfig.gravitationalConstant,
        );
        const targetEntity = resolveInput(
          targetInput,
          bodies,
          flightComputerModules,
          physicsConfig.gravitationalConstant,
        );

        if (!rocketEntity || !targetEntity) continue;

        // Determine Rocket Path
        let rocketPath = null;
        let rocketBody = null;

        if ("mass" in rocketEntity) {
          // It's a Body
          rocketBody = rocketEntity;
          rocketPath = predictionPaths.find((p) => p.id === rocketEntity.id);
        } else {
          // Rocket must be a body for now to have a path (unless we support point-to-point which is trivial)
          continue;
        }

        if (!rocketPath || rocketPath.points.length === 0) continue;

        // Determine Target Path or Point
        let targetPath = null;
        let targetStaticPoint: Vector2D | null = null;
        let targetBody: Body | null = null;

        if ("mass" in targetEntity) {
          // Target is a Body
          targetBody = targetEntity;
          targetPath = isPredictionEnabled
            ? predictionPaths.find((p) => p.id === targetEntity.id)
            : null;
        } else {
          // Target is a Point (Vector2D)
          targetStaticPoint = targetEntity;
        }

        const maxDist = module.maxDistance || 10;
        const totalDuration = predictionSteps * physicsConfig.timeStep;
        const dtPerPoint = totalDuration / rocketPath.points.length;

        // Find first rendezvous point
        for (let i = 0; i < rocketPath.points.length; i++) {
          const rocketPos = rocketPath.points[i];

          let targetPos = { x: 0, y: 0 };
          let targetVel = { x: 0, y: 0 };

          if (targetStaticPoint) {
            targetPos = targetStaticPoint;
            targetVel = { x: 0, y: 0 }; // Static point has 0 velocity
          } else if (targetPath && targetPath.points[i]) {
            targetPos = targetPath.points[i];
            // Velocity will be calculated later
          } else if (targetBody) {
            // Fallback to current position if no path (or path shorter)
            // Ideally we should project it, but for now use current
            targetPos = targetBody.position;
            targetVel = targetBody.velocity;
          }

          const dx = rocketPos.x - targetPos.x;
          const dy = rocketPos.y - targetPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= maxDist) {
            // Calculate velocities at rendezvous point (numerical derivative)
            let rocketVel = { x: 0, y: 0 };

            if (i > 0 && i < rocketPath.points.length - 1) {
              // Central difference for velocity
              const dt = dtPerPoint;
              const prevRocket = rocketPath.points[i - 1];
              const nextRocket = rocketPath.points[i + 1];
              rocketVel = {
                x: (nextRocket.x - prevRocket.x) / (2 * dt),
                y: (nextRocket.y - prevRocket.y) / (2 * dt),
              };

              if (!targetStaticPoint) {
                if (
                  targetPath &&
                  targetPath.points[i - 1] &&
                  targetPath.points[i + 1]
                ) {
                  const prevTarget = targetPath.points[i - 1];
                  const nextTarget = targetPath.points[i + 1];
                  targetVel = {
                    x: (nextTarget.x - prevTarget.x) / (2 * dt),
                    y: (nextTarget.y - prevTarget.y) / (2 * dt),
                  };
                } else if (targetBody) {
                  targetVel = targetBody.velocity;
                }
              }
            } else if (rocketBody) {
              // Use current velocities for edge cases
              rocketVel = rocketBody.velocity;
              if (targetBody) targetVel = targetBody.velocity;
            }

            // Relative velocity (ship to target)
            const dvx = targetVel.x - rocketVel.x;
            const dvy = targetVel.y - rocketVel.y;

            // Calculate prograde and radial components from rocket's perspective
            const rocketSpeed = Math.sqrt(
              rocketVel.x * rocketVel.x + rocketVel.y * rocketVel.y,
            );

            let deltaVPrograde = 0;
            let deltaVRadial = 0;

            if (rocketSpeed > 0.001) {
              const progX = rocketVel.x / rocketSpeed;
              const progY = rocketVel.y / rocketSpeed;
              const radX = -progY;
              const radY = progX;

              deltaVPrograde = dvx * progX + dvy * progY;
              deltaVRadial = dvx * radX + dvy * radY;
            } else {
              deltaVPrograde = Math.sqrt(dvx * dvx + dvy * dvy);
              deltaVRadial = 0;
            }

            const totalDeltaV = Math.sqrt(
              deltaVPrograde * deltaVPrograde + deltaVRadial * deltaVRadial,
            );

            newRendezvousPoints.push({
              point: rocketPos,
              name: module.name || "Rendezvous",
              color: module.color,
              moduleId: module.id,
              timeToRendezvous: i * dtPerPoint,
              distance: distance,
              deltaVPrograde: deltaVPrograde,
              deltaVRadial: deltaVRadial,
              totalDeltaV: totalDeltaV,
            });
            break; // Only show first rendezvous per module
          }
        }
      }

      setRendezvousPoints(newRendezvousPoints);
    };

    // Check frequently, but update logic throttles it
    const interval = setInterval(updateRendezvous, 20);
    return () => clearInterval(interval);
  }, []); // Run once, interval handles dependencies via Ref

  useEffect(() => {
    if (bodies.length === 0) {
      lastRefinedCoMRef.current = null;
    }
  }, [bodies.length]);

  // --- Window Resize ---
  useEffect(() => {
    const handleResize = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Memory Monitoring ---
  useEffect(() => {
    const updateMemory = () => {
      if ("memory" in performance && (performance as any).memory) {
        const mem = (performance as any).memory;
        const used = mem.usedJSHeapSize / (1024 * 1024); // MB
        const total = mem.jsHeapSizeLimit / (1024 * 1024); // MB
        const percent = (used / total) * 100;
        setMemoryUsage({ used, total, percent });
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // --- Animation Loop ---
  const lastFrameTimeRef = useRef(0);
  const TARGET_FPS = 120;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  const animate = useCallback(
    (time: number) => {
      // FPS CAP LOGIC
      const elapsed = time - lastFrameTimeRef.current;

      if (elapsed < FRAME_INTERVAL) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      // Adjust for next frame, keeping sync
      lastFrameTimeRef.current = time - (elapsed % FRAME_INTERVAL);

      // Calculate FPS
      frameCountRef.current++;
      if (time - lastFpsTimeRef.current >= 1000) {
        setFps(
          Math.round(
            (frameCountRef.current * 1000) / (time - lastFpsTimeRef.current),
          ),
        );
        frameCountRef.current = 0;
        lastFpsTimeRef.current = time;
      }

      // Time Reverse Logic
      if (timeReverseStateRef.current.active) {
        const { startTime, duration, initialSpeed, phase } =
          timeReverseStateRef.current;
        const elapsed = (time - startTime) / 1000; // seconds
        const halfDuration = duration / 2;

        if (phase === "decelerate") {
          const progress = Math.min(1, elapsed / halfDuration);
          // Ease out cubic
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          // Actually linear is requested: "slow down time for 2 sec"
          // Let's stick to linear for simplicity as requested "transition on 4 secondes"
          const newSpeed = initialSpeed * (1 - progress);
          setSpeed(newSpeed);

          if (progress >= 1) {
            // Switch to accelerate
            timeReverseStateRef.current.phase = "accelerate";
            timeReverseStateRef.current.startTime = time; // Reset start time for next phase

            // Reverse Physics
            const reversedBodies = reverseTime(bodiesRef.current);
            bodiesRef.current = reversedBodies;
            setBodies(reversedBodies);
            workerJobIdRef.current++; // Invalidate pending physics jobs so they don't overwrite reverse
          }
        } else if (phase === "accelerate") {
          const progress = Math.min(1, elapsed / halfDuration);
          const newSpeed = initialSpeed * progress;
          setSpeed(newSpeed);

          if (progress >= 1) {
            timeReverseStateRef.current.active = false;
            setSpeed(initialSpeed);
          }
        }
      }

      if (lastTimeRef.current !== undefined && isRunning) {
        const dt = physicsConfigRef.current.timeStep * speed;
        simulationTimeRef.current += dt;

        // --- PHYSICS WORKER LOGIC ---
        // If worker is free, send the accumulated time and current state
        accumulatedPhysicsTimeRef.current += dt;

        // Only send if we have accrued enough time to matter (or just always send if free?)
        // To be perfectly 1:1 with time, we send whatever 'dt' we have.
        // But if worker is slow, 'accumulatedPhysicsTimeRef' will grow.
        // When worker returns, we send the new large chunk.

        if (!isPhysicsWorkerBusyRef.current && physicsWorkerRef.current) {
          const timeToSimulate = accumulatedPhysicsTimeRef.current;
          timeSentToWorkerRef.current = timeToSimulate; // Track what we sent
          accumulatedPhysicsTimeRef.current = 0; // Reset accumulator

          isPhysicsWorkerBusyRef.current = true;

          // Prepare bodies state for simulation
          // We need to inject Thrust/Maneuver logic BEFORE sending to worker?
          // Wait - The original code applied Flight Computer logic INSIDE updatePhysics loop (sub-stepping).
          // So we must rely on the worker to do that.
          // HOWEVER: The Flight Computer logic (applyManeuverExecutorModules) was modifying bodies BEFORE updatePhysics call in legacy code.
          // Let's look at legacy animate loop:
          // 1. applyManeuverExecutorModules(bodiesForSimulation)
          // 2. applyThrustBurstModules(bodiesForSimulation, dt)
          // 3. updatePhysics(...)

          // If we move updatePhysics to worker, we must decide:
          // Option A: Move Flight Computer Logic to Worker too. (Cleanest for performance)
          // Option B: Run Flight Computer on Main Thread, then send to Worker. (Easier refactor now)

          // The original plan said "Move entire updatePhysics".
          // But applyManeuverExecutorModules is called OUTSIDE updatePhysics in App.tsx.
          // Let's keep Flight Computer on Main Thread for now to avoid moving all module state refs to worker.
          // This means the Flight Computer updates (Thrust setting) happen once per FRAME (main thread),
          // and are then constant for the duration of the physics sub-steps in the worker.
          // This is acceptable for most cases, though slightly less precise for rapid-fire auto-circularize corrections.
          // Given the complexity of moving Flight Computer State (refs, maps) to worker, Option B is safer.

          // 1. Updates from Flight Computer (Main Thread)
          const bodiesForSimulation = bodiesRef.current.map((body) => ({
            ...body,
            trail: [], // OPTIMIZATION: Send empty trails to worker
            position: { ...body.position },
            velocity: { ...body.velocity },
            thrust: body.thrust ? { ...body.thrust } : undefined,
          }));

          applyManeuverExecutorModules(bodiesForSimulation);
          applyThrustBurstModules(bodiesForSimulation, timeToSimulate);

          // 2. Send to Worker
          const sentBodyIds = new Set(bodiesForSimulation.map((b) => b.id));
          sentBodyIdsRef.current = sentBodyIds;

          physicsWorkerRef.current.postMessage({
            bodies: bodiesForSimulation,
            dt: timeToSimulate,
            gConst: physicsConfigRef.current.gravitationalConstant,
            // We still send the length so worker *could* enforce it if it was generating them,
            // but we disabled it there. Keeping for API compat is fine.
            trailLength: visualConfigRef.current.trailLength,
            collisions: physicsConfigRef.current.collisions,
            jobId: workerJobIdRef.current,
          });
        } else {
          // If worker is busy, we just accumulate time.
          // The physics will "catch up" in big jumps if main thread is faster than worker (likely not the case),
          // or more likely, the simulation will run in bursts if worker is slower.
          // But UI remains smooth.
        }

        // CLIENT-SIDE EXTRAPOLATION:
        // While waiting for the worker (which might run at e.g. 20fps or be busy),
        // we visually extrapolate the position of bodies to maintain 60fps smoothness.
        // We use the last known velocity to predict the position at the current time.
        // When the worker returns, it provides the "authoritative" position, which corrects drift.

        let nextBodies = bodiesRef.current;
        if (!timeReverseStateRef.current.active) {
          const extrapolationTime =
            accumulatedPhysicsTimeRef.current + timeSentToWorkerRef.current;

          nextBodies = bodiesRef.current.map((b) => {
            // Only extrapolate if we have velocity
            if (!b.velocity) return b;

            return {
              ...b,
              position: {
                x: b.position.x + b.velocity.x * extrapolationTime,
                y: b.position.y + b.velocity.y * extrapolationTime,
              },
            };
          });

          // Update Ref and State for rendering
          // Note: We intentionally drift 'bodiesRef' here.
          // The worker is calculating based on 'accumulatedPhysicsTime', so it will catch up.
          // The selective merge in onmessage ensures we don't snap back manual inputs.
          // CORRECTION: We DO NOT update bodiesRef.current with extrapolated data.
          // bodiesRef.current must remain the AUTHORITATIVE state returned by worker.
          // We only update the visual state (setBodies).
          // bodiesRef.current = nextBodies; // <--- REMOVED
          setBodies(nextBodies);
        } else {
          // In time reverse, we rely on the logic above (lines 1188-1224)
          // or just render the current static frame if widely paused.
          // Ideally reverse logic handles setBodies itself.
          setBodies(nextBodies);
        }

        // Clean up references to destroyed bodies
        const bodyIds = new Set(nextBodies.map((b) => b.id));

        // If selected body was destroyed, deselect it
        if (
          selectedBodyIdRef.current &&
          !bodyIds.has(selectedBodyIdRef.current)
        ) {
          setSelectedBodyId(null);
          selectedBodyIdRef.current = null;
        }

        // If following body was destroyed, stop following
        if (
          followingBodyIdRef.current &&
          !bodyIds.has(followingBodyIdRef.current)
        ) {
          setFollowingBodyId(null);
          followingBodyIdRef.current = null;
        }

        // Clean up prediction body IDs
        if (predictionBodyIdsRef.current.length > 0) {
          const validPredictionIds = predictionBodyIdsRef.current.filter((id) =>
            bodyIds.has(id),
          );
          if (
            validPredictionIds.length !== predictionBodyIdsRef.current.length
          ) {
            setPredictionBodyIds(validPredictionIds);
            predictionBodyIdsRef.current = validPredictionIds;
          }
        }

        // Clean up target/parent references
        if (
          rocketTargetBodyIdRef.current &&
          !bodyIds.has(rocketTargetBodyIdRef.current)
        ) {
          setRocketTargetBodyId("");
          rocketTargetBodyIdRef.current = "";
        }
        if (
          rocketParentBodyIdRef.current &&
          !bodyIds.has(rocketParentBodyIdRef.current)
        ) {
          setRocketParentBodyId("");
          rocketParentBodyIdRef.current = "";
        }

        let nextParticles = particlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            life: p.life - p.decay * speed,
          }))
          .filter((p) => p.life > 0);

        // Hard limit on particles to prevent memory issues
        const MAX_PARTICLES = 10000;
        if (nextParticles.length > MAX_PARTICLES) {
          nextParticles = nextParticles.slice(-MAX_PARTICLES);
        }

        // bodiesRef.current = nextBodies; // DO NOT UPDATE REF WITH EXTRAPOLATION
        particlesRef.current = nextParticles;
        setBodies(nextBodies);
        setParticles(nextParticles);

        // --- PREDICTION TRAILS (Throttled to prevent memory leaks) ---
        const shouldUpdatePredictions =
          time - lastPredictionTimeRef.current >= PREDICTION_UPDATE_INTERVAL;

        if (
          shouldUpdatePredictions &&
          !isWorkerBusyRef.current &&
          predictionWorkerRef.current
        ) {
          lastPredictionTimeRef.current = time;

          if (isCreationModeRef.current && creationCandidateRef.current) {
            const allBodies = [...nextBodies, creationCandidateRef.current];
            isWorkerBusyRef.current = true;
            predictionWorkerRef.current.postMessage({
              bodies: allBodies,
              steps: predictionStepsRef.current,
              timeStep: physicsConfigRef.current.timeStep,
              gravitationalConstant:
                physicsConfigRef.current.gravitationalConstant,
              predictionBodyIds: [creationCandidateRef.current.id],
            });
          } else if (
            isPredictionEnabledRef.current &&
            predictionBodyIdsRef.current.length > 0
          ) {
            isWorkerBusyRef.current = true;
            predictionWorkerRef.current.postMessage({
              bodies: nextBodies,
              steps: predictionStepsRef.current,
              timeStep: physicsConfigRef.current.timeStep,
              gravitationalConstant:
                physicsConfigRef.current.gravitationalConstant,
              predictionBodyIds: predictionBodyIdsRef.current,
            });
          }
        }

        const calcCoM =
          followingCoMRef.current || visualConfigRef.current.showCenterOfMass;

        if (calcCoM) {
          const threshold = visualConfigRef.current.centerOfMassThreshold;

          let tMass = 0,
            tX = 0,
            tY = 0;
          for (const b of nextBodies) {
            tMass += b.mass;
            tX += b.mass * b.position.x;
            tY += b.mass * b.position.y;
          }

          if (tMass > 0) {
            const realX = tX / tMass;
            const realY = tY / tMass;
            const realCoM = { x: realX, y: realY };

            const anchorX = lastRefinedCoMRef.current
              ? lastRefinedCoMRef.current.x
              : realX;
            const anchorY = lastRefinedCoMRef.current
              ? lastRefinedCoMRef.current.y
              : realY;

            let fMass = 0,
              fX = 0,
              fY = 0;
            const included: Body[] = [];
            const excluded: Body[] = [];

            for (const b of nextBodies) {
              const dx = b.position.x - anchorX;
              const dy = b.position.y - anchorY;
              const distSq = dx * dx + dy * dy;

              if (distSq <= threshold * threshold) {
                included.push(b);
                fMass += b.mass;
                fX += b.mass * b.position.x;
                fY += b.mass * b.position.y;
              } else {
                excluded.push(b);
              }
            }

            let refinedCoM = { x: anchorX, y: anchorY };
            if (fMass > 0) {
              refinedCoM = { x: fX / fMass, y: fY / fMass };
              lastRefinedCoMRef.current = refinedCoM;
            }

            setCurrentCoMData({
              realCoM,
              refinedCoM,
              included,
              excluded,
            });

            if (followingCoMRef.current) {
              const currentScale = scaleRef.current;
              setOffset({
                x: -refinedCoM.x * currentScale,
                y: -refinedCoM.y * currentScale,
              });
            }
          } else {
            setCurrentCoMData(null);
          }
        }

        if (followingBodyIdRef.current) {
          const targetBody = nextBodies.find(
            (b) => b.id === followingBodyIdRef.current,
          );
          if (targetBody) {
            const currentScale = scaleRef.current;
            setOffset({
              x: -targetBody.position.x * currentScale,
              y: -targetBody.position.y * currentScale,
            });
          }
        }
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [applyManeuverExecutorModules, applyThrustBurstModules, isRunning, speed],
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const handlePan = (dx: number, dy: number) => {
    setFollowingBodyId(null);
    setFollowingCoM(false);
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleZoom = (factor: number, mouseX?: number, mouseY?: number) => {
    const currentScale = scaleRef.current;
    const currentOffset = offsetRef.current;

    const nextScale = Math.max(
      0.0001,
      Math.min(10000.0, currentScale * factor),
    );

    if (Math.abs(nextScale - currentScale) < 0.000001) return;

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    // Use mouse position if available, otherwise center of screen
    const mx = mouseX ?? cx;
    const my = mouseY ?? cy;

    // Calculate the world coordinates of the point under the mouse/center
    const worldX = (mx - cx - currentOffset.x) / currentScale;
    const worldY = (my - cy - currentOffset.y) / currentScale;

    // Calculate new offset such that worldX, worldY projects back to mx, my
    const newOffsetX = mx - cx - worldX * nextScale;
    const newOffsetY = my - cy - worldY * nextScale;

    const newOffset = { x: newOffsetX, y: newOffsetY };

    // Update refs immediately for rapid inputs
    scaleRef.current = nextScale;
    offsetRef.current = newOffset;

    setScale(nextScale);
    setOffset(newOffset);
  };

  const handleSelectBody = (id: string | null) => {
    if (!isCreationMode && !isRocketSpawning) {
      setSelectedBodyId(id);
    }
  };

  const handleToggleFollow = (id: string) => {
    setFollowingCoM(false);
    if (followingBodyId === id) {
      setFollowingBodyId(null);
    } else {
      setFollowingBodyId(id);
      const body = bodies.find((b) => b.id === id);
      if (body) {
        setOffset({
          x: -body.position.x * scale,
          y: -body.position.y * scale,
        });
      }
    }
  };

  const handleToggleFollowCoM = () => {
    setFollowingBodyId(null);
    setFollowingCoM((prev) => {
      const next = !prev;
      if (!next) {
        lastRefinedCoMRef.current = null;
      }
      return next;
    });
  };

  const handleDeleteBody = (id: string) => {
    const nextBodies = bodiesRef.current.filter((b) => b.id !== id);
    bodiesRef.current = nextBodies;
    setBodies(nextBodies);

    if (selectedBodyId === id) setSelectedBodyId(null);
    if (followingBodyId === id) setFollowingBodyId(null);
    if (observerBodyIds.a === id)
      setObserverBodyIds((prev) => ({ ...prev, a: null }));
    if (observerBodyIds.b === id)
      setObserverBodyIds((prev) => ({ ...prev, b: null }));
  };

  const handleMakeStar = (id: string) => {
    const nextBodies = bodiesRef.current.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          isStar: true,
          mass: Math.max(b.mass, 2000),
          radius: Math.max(b.radius, 25),
          color: b.color === "#FDB813" ? b.color : "#FDB813",
          description: b.description + " (Ignited into a Star)",
        };
      }
      return b;
    });
    bodiesRef.current = nextBodies;
    setBodies(nextBodies);
  };

  const handlePlaceObject = (bodyId: string, object: SurfaceObject) => {
    const nextBodies = bodiesRef.current.map((b) => {
      if (b.id === bodyId) {
        return {
          ...b,
          surfaceObjects: [...(b.surfaceObjects || []), object],
        };
      }
      return b;
    });
    bodiesRef.current = nextBodies;
    setBodies(nextBodies);
  };

  const handleReset = () => {
    const preset =
      availablePresets.find((p) => p.id === currentPresetId) ||
      availablePresets[0];
    const freshBodies = JSON.parse(JSON.stringify(preset.bodies));
    console.log(preset);

    setIsRunning(false);
    workerJobIdRef.current++; // Invalidate pending physics jobs
    bodiesRef.current = freshBodies;
    particlesRef.current = [];
    setBodies(freshBodies);
    setParticles([]);
    setScale(preset.camera?.scale || 1.0);
    setOffset(preset.camera?.offset || { x: 0, y: 0 });
    setFollowingBodyId(preset.followBodyId || null);
    setFollowingCoM(preset.followCenterOfMass || false);
    lastRefinedCoMRef.current = null;
    setObserverBodyIds({ a: null, b: null });
    setPredictionPaths([]);
    simulationTimeRef.current = 0; // Reset simulation clock
    setTimeout(() => setIsRunning(true), 100);
  };

  const handleResetSettings = () => {
    setVisualConfig(DEFAULT_VISUAL_CONFIG);
    setPhysicsConfig(DEFAULT_PHYSICS_CONFIG);
  };

  const handleExportState = () => {
    const bodiesWithoutTrails = bodies.map((b) => ({
      ...b,
      trail: [],
    }));

    const data: SimulationSaveData = {
      version: 1,
      timestamp: Date.now(),
      bodies: bodiesWithoutTrails,
      visualConfig: visualConfig,
      physicsConfig: physicsConfig,
      camera: {
        scale: scale,
        offset: offset,
      },
      flightComputerModules: flightComputerModules,
      moduleGroups: moduleGroups,
      followBodyId: followingBodyId,
      followCenterOfMass: followingCoM,
    };

    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nebula-orbit-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Failed to export simulation state.");
    }
  };

  const handleImportStateFromJsonAsPreset = (
    saveDate: SimulationSaveData,
    name: string,
  ) => {
    const data: SimulationSaveData = saveDate;
    console.log("imported_preset_" + name);
    const preset: Preset = {
      id: "imported_preset_" + name,
      name: name,
      bodies: data.bodies,
      defaultScale: data.camera?.scale || 1.0,
      description: "Imported preset from JSON",
      flightComputerModules: data.flightComputerModules || [],
      moduleGroups: data.moduleGroups || [],
      camera: data.camera || { scale: 1.0, offset: { x: 0, y: 0 } },
      followBodyId: data.followBodyId || null,
      followCenterOfMass: data.followCenterOfMass || false,
      speed: data.speed || 1.0,
      visualConfig: data.visualConfig || DEFAULT_VISUAL_CONFIG,
      physicsConfig: data.physicsConfig || DEFAULT_PHYSICS_CONFIG,
    };
    availablePresets.push(preset);
    //setCurrentPresetId(preset.id);
  };

  const handleImportState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    if (!fileName.endsWith(".json")) {
      alert("Invalid file format. Please select a JSON file.");
      return;
    }

    const presetName = fileName.replace(".json", "");
    const presetId = "imported_save_" + fileName.replace(".json", "");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(
          event.target?.result as string,
        ) as SimulationSaveData;
        if (!data.bodies || !data.visualConfig || !data.physicsConfig) {
          alert("Invalid save file format. Missing required fields.");
          return;
        }
        setIsRunning(false);

        const loadedBodies = data.bodies.map((b) => ({
          ...b,
          trail: [],
        }));

        const newPreset: Preset = {
          id: presetId,
          name: presetName,
          bodies: loadedBodies,
          defaultScale: data.camera?.scale || 1.0,
          description: `Imported state from ${new Date(data.timestamp).toLocaleString()}`,
          flightComputerModules: data.flightComputerModules || [],
          moduleGroups: data.moduleGroups || [],
          camera: data.camera || { scale: 1.0, offset: { x: 0, y: 0 } },
          followBodyId: data.followBodyId || null,
          followCenterOfMass: data.followCenterOfMass || false,
          speed: data.speed || 1.0,
        };

        setImportedPreset(newPreset);
        setImportedPresets([...importedPresets, newPreset]);
        setCurrentPresetId(presetId);

        setBodies(loadedBodies);
        bodiesRef.current = loadedBodies;
        setVisualConfig(data.visualConfig);
        setPhysicsConfig(data.physicsConfig);

        setScale(data.camera?.scale || 1.0);
        setOffset(data.camera?.offset || { x: 0, y: 0 });

        setParticles([]);
        particlesRef.current = [];
        setSelectedBodyId(null);
        setFollowingBodyId(data.followBodyId || null);
        setFollowingCoM(data.followCenterOfMass || true);
        lastRefinedCoMRef.current = null;
        setObserverBodyIds({ a: null, b: null });
        setPredictionPaths([]);
        simulationTimeRef.current = 0; // Reset clock for imported state

        setFlightComputerModules(data.flightComputerModules || []);
        setModuleGroups(data.moduleGroups || []);

        setTimeout(() => setIsRunning(true), 100);
        //alert("Simulation loaded successfully!");
      } catch (err) {
        console.error("Import error", err);
        alert("Failed to load file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePuterLoad = async () => {
    try {
      const file = await puter.ui.showOpenFilePicker();
      if (!file) return;

      // Cast to any to handle specific FSItem type
      const selectedFile = (Array.isArray(file) ? file[0] : file) as any;

      const fileName = selectedFile.name;
      if (!fileName.endsWith(".json")) {
        alert("Invalid file format. Please select a JSON file.");
        return;
      }

      const content = await puter.fs.read(selectedFile.path);
      let textContent: string;
      if (typeof content === "string") {
        textContent = content;
      } else {
        // Blob
        textContent = await (content as Blob).text();
      }

      const data = JSON.parse(textContent) as SimulationSaveData;

      if (!data.bodies || !data.visualConfig || !data.physicsConfig) {
        alert("Invalid save file format. Missing required fields.");
        return;
      }

      const presetName = fileName.replace(".json", "");
      const presetId = "imported_save_" + fileName.replace(".json", "");

      setIsRunning(false);

      const loadedBodies = data.bodies.map((b) => ({
        ...b,
        trail: [],
      }));

      const newPreset: Preset = {
        id: presetId,
        name: presetName,
        bodies: loadedBodies,
        defaultScale: data.camera?.scale || 1.0,
        description: `Imported state from ${new Date(data.timestamp).toLocaleString()}`,
        flightComputerModules: data.flightComputerModules || [],
        moduleGroups: data.moduleGroups || [],
        camera: data.camera || { scale: 1.0, offset: { x: 0, y: 0 } },
        followBodyId: data.followBodyId || null,
        followCenterOfMass: data.followCenterOfMass || false,
        speed: data.speed || 1.0,
        visualConfig: data.visualConfig || DEFAULT_VISUAL_CONFIG,
        physicsConfig: data.physicsConfig || DEFAULT_PHYSICS_CONFIG,
      };

      setImportedPreset(newPreset);
      setImportedPresets([...importedPresets, newPreset]);
      setCurrentPresetId(presetId);

      setBodies(loadedBodies);
      bodiesRef.current = loadedBodies;
      setVisualConfig(data.visualConfig);
      setPhysicsConfig(data.physicsConfig);

      setScale(data.camera?.scale || 1.0);
      setOffset(data.camera?.offset || { x: 0, y: 0 });

      setParticles([]);
      particlesRef.current = [];
      setSelectedBodyId(null);
      setFollowingBodyId(data.followBodyId || null);
      setFollowingCoM(data.followCenterOfMass || true);
      lastRefinedCoMRef.current = null;
      setObserverBodyIds({ a: null, b: null });
      setPredictionPaths([]);
      simulationTimeRef.current = 0; // Reset clock for imported state

      setFlightComputerModules(data.flightComputerModules || []);
      setModuleGroups(data.moduleGroups || []);

      setTimeout(() => setIsRunning(true), 100);
      alert(`Loaded ${selectedFile.name}`);
    } catch (error) {
      console.error("Puter load failed:", error);
      alert("Failed to load file from Puter.");
    }
  };

  const handlePuterSave = async () => {
    const bodiesWithoutTrails = bodies.map((b) => ({
      ...b,
      trail: [],
    }));

    const data: SimulationSaveData = {
      version: 1,
      timestamp: Date.now(),
      bodies: bodiesWithoutTrails,
      visualConfig: visualConfig,
      physicsConfig: physicsConfig,
      camera: {
        scale: scale,
        offset: offset,
      },
      flightComputerModules: flightComputerModules,
      moduleGroups: moduleGroups,
      followBodyId: followingBodyId,
      followCenterOfMass: followingCoM,
    };

    try {
      const jsonString = JSON.stringify(data, null, 2);
      // Default filename with date
      const defaultName = `nebula-orbit-save-${new Date().toISOString().slice(0, 10)}.json`;

      const file = await puter.ui.showSaveFilePicker(jsonString, defaultName);
      if (file) {
        // Puter handles the write, we just get the file object back or success.
        // Actually showSaveFilePicker writes it?
        // Docs say: puter.ui.showSaveFilePicker(data, defaultFileName).then(async (file)=>{...})
        // It seems it writes the data to the chosen location and returns the file metadata.
        // Cast to any to handle specific FSItem type
        const savedFile = (Array.isArray(file) ? file[0] : file) as any;
        alert(`Saved successfully to ${savedFile.name}`);
      }
    } catch (error) {
      console.error("Puter save failed:", error);
      // Only alert if it's not a cancellation (assuming cancellation throws or returns null? Docs: "In case of an error... reject")
      // If user cancels, it might be an error or just null. Let's log it.
    }
  };

  const handlePresetChange = (id: string) => {
    console.log("handlePresetChange", id);
    const preset = availablePresets.find((p) => p.id === id);
    if (preset) {
      setCurrentPresetId(id);
      const freshBodies = JSON.parse(JSON.stringify(preset.bodies));
      setIsRunning(false);
      workerJobIdRef.current++; // Invalidate pending physics jobs
      setBodies(freshBodies);
      setParticles([]);
      bodiesRef.current = freshBodies;
      particlesRef.current = [];
      setScale(preset.camera?.scale || 1.0);
      setOffset(preset.camera?.offset || { x: 0, y: 0 });
      setSelectedBodyId(null);
      setFollowingBodyId(preset.followBodyId || null);
      setFollowingCoM(preset.followCenterOfMass || false);
      lastRefinedCoMRef.current = null;
      setObserverBodyIds({ a: null, b: null });
      setPredictionPaths([]);
      //add flightcomputer module and preset modules if not empty and not undefined and not null
      const mergedModules =
        preset.flightComputerModules && preset.flightComputerModules.length > 0
          ? preset.flightComputerModules.concat(flightComputerModules)
          : flightComputerModules;
      const mergedModuleGroups =
        preset.moduleGroups && preset.moduleGroups.length > 0
          ? preset.moduleGroups.concat(moduleGroups)
          : moduleGroups;
      setFlightComputerModules(mergedModules);
      setModuleGroups(mergedModuleGroups);
      setSpeed(preset.speed || 1.0);
      setVisualConfig(preset.visualConfig || DEFAULT_VISUAL_CONFIG);
      setPhysicsConfig(preset.physicsConfig || DEFAULT_PHYSICS_CONFIG);
      simulationTimeRef.current = 0; // Reset clock for preset
      if (id !== "imported_save") {
        setPhysicsConfig({
          gravitationalConstant: 0.5,
          collisions: true,
          timeStep: 0.008,
          timeReverseDuration: 4.0,
        });
      }
      setTimeout(() => setIsRunning(true), 1000);
    }
  };

  const handleAddBody = (data: NewBodyData) => {
    const newBody = createBody(
      `custom_${Date.now()}`,
      data.name,
      data.mass,
      data.radius,
      data.color,
      data.distance,
      data.velocity,
      "A user-created celestial object.",
      `${data.mass} units`,
      `${data.radius * 2} units`,
    );

    const updated = [...bodiesRef.current, newBody];
    bodiesRef.current = updated;
    setBodies(updated);
  };

  const toggleCreationMode = () => {
    if (isCreationMode) {
      setIsCreationMode(false);
      setCreationCandidate(null);
      setPredictionPaths([]);
      setIsRunning(true);
    } else {
      setIsCreationMode(true);
      setIsRunning(false);
    }
  };

  const updateRocket = (id: string, updates: Partial<Body>) => {
    // Timestamp tracking for manual inputs allows selective merge in worker callback
    if (lastBodyUpdateTimesRef.current) {
      lastBodyUpdateTimesRef.current.set(id, Date.now());
    }

    // Use REF as source of truth, not state (which might be extrapolated)
    const updated = bodiesRef.current.map((b) =>
      b.id === id ? { ...b, ...updates } : b,
    );

    bodiesRef.current = updated;
    setBodies(updated);
  };

  const handleTimeReverse = () => {
    if (timeReverseStateRef.current.active) return;

    timeReverseStateRef.current = {
      active: true,
      startTime: performance.now(),
      duration: physicsConfigRef.current.timeReverseDuration || 4.0,
      initialSpeed: speed,
      phase: "decelerate",
    };
  };

  const handleStageRocket = (rocketId: string) => {
    const rocket = bodiesRef.current.find((b) => b.id === rocketId);
    if (!rocket || !rocket.shipStructure) return;

    const struct = rocket.shipStructure;
    if (struct.currentStageIndex >= struct.stages.length - 1) return; // No more stages

    const currentStage = struct.stages[struct.currentStageIndex];
    const nextStageIndex = struct.currentStageIndex + 1;

    // 1. Create Debris (Spent Stage)
    const debrisId = `debris_${Date.now()}`;
    const angle = rocket.angle || 0;
    const offset = rocket.radius * 2.5;

    // Position slightly behind to avoid immediate clipping if collisions active
    const debrisPos = {
      x: rocket.position.x - Math.cos(angle) * offset,
      y: rocket.position.y - Math.sin(angle) * offset,
    };

    const debris: Body = createBody(
      debrisId,
      `${rocket.name} Stage ${struct.currentStageIndex + 1}`,
      currentStage.mass || 100,
      rocket.radius, // Keep original radius for debris
      currentStage.color || "#555555",
      0,
      0,
      "Spent rocket stage",
    );
    debris.position = debrisPos;
    debris.velocity = { ...rocket.velocity };
    debris.angle = angle;
    debris.isRocket = true; // Render as a rocket part
    debris.thrust = { ...rocket.thrust }; // Keep thrusting!
    debris.fuel = currentStage.fuel || 0;
    debris.maxFuel = currentStage.maxFuel || 1;
    debris.shipStructure = {
      design: "multistage",
      stages: [currentStage], // It is a single stage now
      currentStageIndex: 0,
    };

    // 2. Update Rocket Structure
    const updatedStructure = {
      ...struct,
      currentStageIndex: nextStageIndex,
    };

    // Recalculate Totals for Rocket
    let newTotalMass = 0;
    let newTotalFuel = 0;
    for (let i = nextStageIndex; i < struct.stages.length; i++) {
      const s = struct.stages[i];
      newTotalMass += s.mass || 0;
      newTotalFuel += s.fuel || 0;
    }

    const updatedRocket: Body = {
      ...rocket,
      shipStructure: updatedStructure,
      mass: newTotalMass,
      fuel: newTotalFuel,
      maxFuel: newTotalFuel,
      radius: rocket.radius * 0.85, // Reduce size for the next stage
    };

    const updatedBodies = bodiesRef.current.map((b) =>
      b.id === rocketId ? updatedRocket : b,
    );
    const finalBodies = [...updatedBodies, debris];

    // Update timestamps to prevent overwrites by old worker messages
    const now = Date.now();
    lastBodyUpdateTimesRef.current.set(rocketId, now);
    lastBodyUpdateTimesRef.current.set(debrisId, now);

    bodiesRef.current = finalBodies;
    setBodies(finalBodies);
  };

  const handleSpawnRocket = (parentBodyName?: string) => {
    let spawnPos = { x: 0, y: 0 };
    let spawnVel = { x: 0, y: 0 };
    let angle = 0;
    let parentBody = null;

    if (parentBodyName) {
      parentBody = bodiesRef.current.find((b) =>
        b.name.toLowerCase().includes(parentBodyName.toLowerCase()),
      );
    }

    if (parentBody) {
      const spawnDist = parentBody.radius + rocketSpawnConfig.radius;
      spawnPos = {
        x: parentBody.position.x,
        y: parentBody.position.y - spawnDist,
      };
      spawnVel = { ...parentBody.velocity };
      angle = -Math.PI / 2;
    } else {
      spawnPos = { x: 50, y: 50 };
    }

    const newRocket = createBody(
      `rocket_${Date.now()}`,
      rocketSpawnConfig.name,
      rocketSpawnConfig.mass,
      rocketSpawnConfig.radius,
      rocketSpawnConfig.color,
      0,
      0,
      "A maneuverable spacecraft.",
    );
    newRocket.position = spawnPos;
    newRocket.velocity = spawnVel;
    newRocket.isRocket = true;
    newRocket.angle = angle;
    newRocket.thrust = { x: 0, y: 0 };
    newRocket.maneuvers = [];
    newRocket.landedOnBodyId = parentBody?.id;

    // Ship Structure Logic
    if (rocketSpawnConfig.design === "multistage") {
      const stages = [];
      const stageCount = rocketSpawnConfig.stages || 3;
      const stageConfigs = rocketSpawnConfig.stageConfigs || [];

      // Dynamic Stage Generation
      // Booster (0) -> ... -> Payload (stageCount-1)
      for (let i = 0; i < stageCount; i++) {
        const isPayload = i === stageCount - 1;
        // Scale factor: 1.0 at booster, decreasing to 0.5 at payload
        const scale = 1.0 - (i / (stageCount - 1)) * 0.5;

        // Use custom config if available, otherwise auto-scale
        const customConfig = stageConfigs[i];
        const fuel = customConfig
          ? customConfig.fuel
          : isPayload
            ? 500
            : 5000 * scale;
        const thrust = customConfig
          ? customConfig.thrust
          : isPayload
            ? 0.2
            : 1.0 * scale;

        stages.push({
          mass: rocketSpawnConfig.mass * (isPayload ? 0.5 : 2 * scale),
          fuel: fuel,
          maxFuel: fuel,
          thrust: thrust,
          color: isPayload
            ? rocketSpawnConfig.color
            : i % 2 === 0
              ? "#333333"
              : "#666666",
        });
      }

      newRocket.shipStructure = {
        design: "multistage",
        stages: stages,
        currentStageIndex: 0,
      };

      // Sum mass/fuel
      let totalMass = 0;
      let totalFuel = 0;
      stages.forEach((s) => {
        totalMass += s.mass;
        totalFuel += s.fuel;
      });
      newRocket.mass = totalMass;
      newRocket.fuel = totalFuel;
      newRocket.maxFuel = totalFuel;
    } else {
      // Default Single Stage Rocket / Station / Satellite
      const customFuel =
        rocketSpawnConfig.fuel !== undefined ? rocketSpawnConfig.fuel : 100;
      const customThrust =
        rocketSpawnConfig.thrust !== undefined ? rocketSpawnConfig.thrust : 1;

      newRocket.fuel = customFuel;
      newRocket.maxFuel = customFuel;
      newRocket.dryMass = rocketSpawnConfig.mass;

      newRocket.shipStructure = {
        design: rocketSpawnConfig.design,
        stages: [
          {
            mass: rocketSpawnConfig.mass,
            fuel: customFuel,
            maxFuel: customFuel,
            thrust: customThrust,
            color: rocketSpawnConfig.color,
          },
        ],
        currentStageIndex: 0,
      };
    }

    const updated = [...bodiesRef.current, newRocket];
    setBodies(updated);
    bodiesRef.current = updated;
    setSelectedBodyId(newRocket.id);
    setShowRocketPanel(true);
    return newRocket.id;
  };

  const handleCanvasClick = (screenX: number, screenY: number) => {
    const cx = dimensions.width / 2 + offset.x;
    const cy = dimensions.height / 2 + offset.y;
    const worldX = (screenX - cx) / scale;
    const worldY = (screenY - cy) / scale;

    if (showRocketPanel && isRocketSpawning) {
      let spawnPos = { x: worldX, y: worldY };
      let spawnVel = { x: 0, y: 0 };
      let nearestDist = Infinity;
      let parentBody: Body | null = null;

      for (const b of bodies) {
        const dx = worldX - b.position.x;
        const dy = worldY - b.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.radius * 2) {
          if (dist < nearestDist) {
            nearestDist = dist;
            parentBody = b;
          }
        }
      }

      if (parentBody) {
        const angle = Math.atan2(
          worldY - parentBody.position.y,
          worldX - parentBody.position.x,
        );
        const spawnDist = parentBody.radius + rocketSpawnConfig.radius;
        spawnPos = {
          x: parentBody.position.x + Math.cos(angle) * spawnDist,
          y: parentBody.position.y + Math.sin(angle) * spawnDist,
        };
        spawnVel = { ...parentBody.velocity };
      }

      const newRocket = createBody(
        `rocket_${Date.now()}`,
        rocketSpawnConfig.name,
        rocketSpawnConfig.mass,
        rocketSpawnConfig.radius,
        rocketSpawnConfig.color,
        0,
        0,
        "A maneuverable spacecraft.",
      );

      newRocket.position = spawnPos;
      newRocket.velocity = spawnVel;
      newRocket.isRocket = true;
      newRocket.angle = parentBody
        ? Math.atan2(
            worldY - parentBody.position.y,
            worldX - parentBody.position.x,
          )
        : 0;
      newRocket.thrust = { x: 0, y: 0 };
      newRocket.maneuvers = [];
      if (parentBody) newRocket.landedOnBodyId = parentBody.id;

      // Ship Structure Logic
      if (rocketSpawnConfig.design === "multistage") {
        const stages = [];
        const stageCount = rocketSpawnConfig.stages || 3;
        const stageConfigs = rocketSpawnConfig.stageConfigs || [];

        // Dynamic Stage Generation
        for (let i = 0; i < stageCount; i++) {
          const isPayload = i === stageCount - 1;
          const scale = 1.0 - (i / (stageCount - 1)) * 0.5;

          // Use custom config if available, otherwise auto-scale
          const customConfig = stageConfigs[i];
          const fuel = customConfig
            ? customConfig.fuel
            : isPayload
              ? 500
              : 5000 * scale;
          const thrust = customConfig
            ? customConfig.thrust
            : isPayload
              ? 0.2
              : 1.0 * scale;

          stages.push({
            mass: rocketSpawnConfig.mass * (isPayload ? 0.5 : 2 * scale),
            fuel: fuel,
            maxFuel: fuel,
            thrust: thrust,
            color: isPayload
              ? rocketSpawnConfig.color
              : i % 2 === 0
                ? "#333333"
                : "#666666",
          });
        }

        newRocket.shipStructure = {
          design: "multistage",
          stages: stages,
          currentStageIndex: 0,
        };

        let totalMass = 0;
        let totalFuel = 0;
        stages.forEach((s) => {
          totalMass += s.mass;
          totalFuel += s.fuel;
        });
        newRocket.mass = totalMass;
        newRocket.fuel = totalFuel;
        newRocket.maxFuel = totalFuel;
      } else {
        // Default Single Stage Rocket / Station / Satellite
        const customFuel =
          rocketSpawnConfig.fuel !== undefined ? rocketSpawnConfig.fuel : 100;
        const customThrust =
          rocketSpawnConfig.thrust !== undefined ? rocketSpawnConfig.thrust : 1;

        newRocket.fuel = customFuel;
        newRocket.maxFuel = customFuel;
        newRocket.dryMass = rocketSpawnConfig.mass;

        newRocket.shipStructure = {
          design: rocketSpawnConfig.design,
          stages: [
            {
              mass: rocketSpawnConfig.mass,
              fuel: customFuel,
              maxFuel: customFuel,
              thrust: customThrust,
              color: rocketSpawnConfig.color,
            },
          ],
          currentStageIndex: 0,
        };
      }

      setBodies((prev) => [...prev, newRocket]);
      bodiesRef.current = [...bodiesRef.current, newRocket];
      setSelectedBodyId(newRocket.id);
      setIsRocketSpawning(false);
      return;
    }

    if (isCreationMode) {
      if (creationCandidate) {
        setCreationCandidate((prev) =>
          prev
            ? {
                ...prev,
                position: { x: worldX, y: worldY },
              }
            : null,
        );
      } else {
        const newCandidate = createBody(
          `manual_${Date.now()}`,
          "New Body",
          20,
          8,
          "#4ECDC4",
          0,
          0,
          "Manually placed body",
        );
        newCandidate.position = { x: worldX, y: worldY };
        newCandidate.velocity = { x: 0, y: 0 };
        setCreationCandidate(newCandidate);

        // Calculate initial prediction
        const allBodies = [...bodies, newCandidate];
        const newPaths = predictSystemTrajectories(
          allBodies,
          predictionSteps,
          physicsConfig.timeStep,
          physicsConfig.gravitationalConstant,
          [newCandidate.id],
        );
        setPredictionPaths(newPaths);
      }
    }
  };

  //a function to be used from outside to create a body and spawn it
  // provide in args (name, mass, radius, color, position, velocity, description)
  const createAndSpawnBody = (
    name: string,
    mass: number,
    radius: number,
    color: string,
    position: { x: number; y: number },
    velocity: { x: number; y: number },
    description: string,
  ) => {
    const bodyid = `manual_${Date.now()}`;
    const newBody = createBody(
      bodyid,
      name,
      mass,
      radius,
      color,
      position.x,
      position.y,
      description,
    );
    newBody.velocity = velocity;
    newBody.position = { x: position.x, y: position.y };
    setBodies((prev) => [...prev, newBody]);
    bodiesRef.current = [...bodiesRef.current, newBody];
  };

  //test create and spawn body
  const testCreateAndSpawnBody = () => {
    createAndSpawnBody(
      "Test Body",
      20,
      8,
      "#4ECDC4",
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      "Test body",
    );
  };

  const handleUpdateCandidate = (updates: Partial<Body>) => {
    if (!creationCandidate) return;
    const updated = { ...creationCandidate, ...updates };
    setCreationCandidate(updated);

    // Recalculate prediction for the updated candidate
    const allBodies = [...bodies, updated];
    const newPaths = predictSystemTrajectories(
      allBodies,
      predictionSteps,
      physicsConfig.timeStep,
      physicsConfig.gravitationalConstant,
      [updated.id],
    );
    setPredictionPaths(newPaths);
  };

  const handleSpawnManual = () => {
    if (creationCandidate) {
      setBodies((prev) => [...prev, creationCandidate]);
      bodiesRef.current = [...bodiesRef.current, creationCandidate];
      setCreationCandidate(null);
    }
  };

  const assistantActions: AssistantActions = {
    spawnBody: (name, mass, distance, velocity, color) => {
      handleAddBody({
        name,
        mass,
        distance,
        velocity,
        color,
        radius: Math.max(4, Math.log(mass) * 3),
      });
      return `Created body '${name}' successfully.`;
    },
    spawnBodyComplex: (
      name,
      mass,
      radius,
      color,
      position,
      velocity,
      isStar,
    ) => {
      const newBody = createBody(
        `complex_${Date.now()}`,
        name,
        mass,
        radius,
        color,
        0,
        0,
        "A body created with precise position and velocity vectors.",
      );
      newBody.position = { x: position.x, y: position.y };
      newBody.velocity = { x: velocity.x, y: velocity.y };
      if (isStar) {
        newBody.isStar = true;
      }
      const updated = [...bodiesRef.current, newBody];
      bodiesRef.current = updated;
      setBodies(updated);
      return `Created body '${name}' at position (${position.x}, ${position.y}) with velocity (${velocity.x}, ${velocity.y})${isStar ? " as a star" : ""}.`;
    },
    deleteBody: (name) => {
      const body = bodiesRef.current.find((b) =>
        b.name.toLowerCase().includes(name.toLowerCase()),
      );
      if (body) {
        handleDeleteBody(body.id);
        return `Deleted ${body.name} from the simulation.`;
      }
      return `Could not find body named '${name}' to delete.`;
    },
    makeStar: (name) => {
      const body = bodiesRef.current.find((b) =>
        b.name.toLowerCase().includes(name.toLowerCase()),
      );
      if (body) {
        handleMakeStar(body.id);
        return `Ignited ${body.name} into a star!`;
      }
      return `Could not find body named '${name}'.`;
    },
    setSimulationState: (run, spd) => {
      if (run !== undefined) setIsRunning(run);
      if (spd !== undefined) setSpeed(spd);
      return `Simulation state updated. Running: ${run ?? isRunning}, Speed: ${spd ?? speed}`;
    },
    changePreset: (presetId) => {
      const preset = availablePresets.find((p) => p.id === presetId);
      if (preset) {
        handlePresetChange(presetId);
        return `Loaded preset: ${preset.name}`;
      }
      return `Preset '${presetId}' not found.`;
    },
    selectBody: (bodyName) => {
      const body = bodiesRef.current.find((b) =>
        b.name.toLowerCase().includes(bodyName.toLowerCase()),
      );
      if (body) {
        setSelectedBodyId(body.id);
        return `Selected ${body.name}`;
      }
      return `Could not find body named '${bodyName}'.`;
    },
    followBody: (bodyName) => {
      const body = bodiesRef.current.find((b) =>
        b.name.toLowerCase().includes(bodyName.toLowerCase()),
      );
      if (body) {
        handleToggleFollow(body.id);
        setFollowingBodyId(body.id);
        setSelectedBodyId(body.id);
        return `Camera locked on ${body.name}.`;
      }
      return `Could not find body named '${bodyName}'.`;
    },
    followCenterOfMass: () => {
      handleToggleFollowCoM();
      return followingCoM
        ? "Stopped following Center of Mass."
        : "Camera locked on the system's Center of Mass.";
    },
    configureVisuals: (config) => {
      setVisualConfig((prev) => ({ ...prev, ...config }));
      return "Visual settings updated.";
    },
    configurePhysics: (config) => {
      setPhysicsConfig((prev) => ({ ...prev, ...config }));
      return "Physics constants updated.";
    },
    setCamera: (zoom, reset) => {
      if (reset) {
        setOffset({ x: 0, y: 0 });
        setFollowingBodyId(null);
        setFollowingCoM(false);
        setScale(
          availablePresets.find((p) => p.id === currentPresetId)
            ?.defaultScale || 1,
        );
        return "Camera reset to default.";
      }
      if (zoom) {
        setScale(Math.max(0.05, Math.min(10.0, zoom)));
        return `Zoom set to ${zoom}.`;
      }
      return "No camera changes made.";
    },
    spawnRocket: (parentBodyName) => {
      handleSpawnRocket(parentBodyName);
      return `Rocket spawned${parentBodyName ? ` on ${parentBodyName}` : " in space"}. Panel opened.`;
    },
    controlRocket: (rocketName, action, value) => {
      const rocket = bodiesRef.current.find(
        (b) =>
          b.isRocket && b.name.toLowerCase().includes(rocketName.toLowerCase()),
      );
      if (!rocket) return `Rocket '${rocketName}' not found.`;

      if (action === "rotate") {
        const delta = ((value || 0) * Math.PI) / 180;
        updateRocket(rocket.id, { angle: (rocket.angle || 0) + delta });
        return `Rotated ${rocket.name} by ${value} degrees.`;
      } else if (action === "thrust") {
        const power = value !== undefined ? value : 0.05;
        const angle = rocket.angle || 0;
        updateRocket(rocket.id, {
          thrust: { x: Math.cos(angle) * power, y: Math.sin(angle) * power },
        });
        return `Main engines engaged on ${rocket.name} at ${power}N.`;
      } else if (action === "stop") {
        updateRocket(rocket.id, { thrust: { x: 0, y: 0 } });
        return `Engines cut on ${rocket.name}.`;
      }
      return "Unknown action.";
    },
    programAdvancedFlightPlan: (rocketName, maneuvers) => {
      const rocket = bodiesRef.current.find(
        (b) =>
          b.isRocket && b.name.toLowerCase().includes(rocketName.toLowerCase()),
      );
      if (!rocket) return `Rocket '${rocketName}' not found.`;

      const newManeuvers: Maneuver[] = maneuvers.map((m: any, idx: number) => {
        const maneuver: Maneuver = {
          id: `m_${Date.now()}_${idx}`,
          type: m.type,
          thrust: m.thrust || 0,
          duration: m.duration || 0,
          angleOffset: m.angleOffset ? (m.angleOffset * Math.PI) / 180 : 0,
          progress: 0,
          status: "pending",
        };

        // Map specific parameters
        if (m.type === "rotate") {
          maneuver.param = m.rotationAngle;
        } else if (m.type === "sas") {
          maneuver.param = m.sasMode;
        } else if (m.type === "wait_for_transfer") {
          maneuver.param = m.phaseAngleError || 1.0;
        } else if (m.type === "wait_for_altitude") {
          maneuver.param = `${m.targetAltitude}:${m.altitudeDirection || "ascending"}`;
        } else if (m.type === "burn_until_altitude") {
          maneuver.param = m.targetAltitude;
        } else if (m.type === "change_simulation_speed") {
          maneuver.param = m.simulationSpeed;
        }

        // Map body references
        if (m.targetBodyName) {
          const target = bodiesRef.current.find(
            (b) => b.name.toLowerCase() === m.targetBodyName.toLowerCase(),
          );
          if (target) maneuver.targetBodyId = target.id;
        }
        if (m.parentBodyName) {
          const parent = bodiesRef.current.find(
            (b) => b.name.toLowerCase() === m.parentBodyName.toLowerCase(),
          );
          if (parent) maneuver.parentBodyId = parent.id;
        }

        return maneuver;
      });

      updateRocket(rocket.id, { maneuvers: newManeuvers });
      return `Flight plan with ${newManeuvers.length} maneuvers programmed for ${rocket.name}.`;
    },
    executeManeuverPlan: (rocketName) => {
      const rocket = bodiesRef.current.find(
        (b) =>
          b.isRocket && b.name.toLowerCase().includes(rocketName.toLowerCase()),
      );
      if (!rocket) return `Rocket '${rocketName}' not found.`;

      if (
        !rocket.maneuvers ||
        rocket.maneuvers.filter((m) => m.status === "pending").length === 0
      ) {
        return `No pending maneuvers found for ${rocket.name}. Program a flight plan first.`;
      }

      const updated = rocket.maneuvers.map((m) => {
        if (m.status === "pending") return { ...m, status: "active" as const };
        return m;
      });
      updateRocket(rocket.id, { maneuvers: updated });
      return `Flight plan execution started for ${rocket.name}.`;
    },
    getRocketTelemetry: (rocketName, targetBodyName) => {
      const rocket = bodiesRef.current.find(
        (b) =>
          b.isRocket && b.name.toLowerCase().includes(rocketName.toLowerCase()),
      );
      if (!rocket) return `Rocket '${rocketName}' not found.`;

      const speed = Math.sqrt(
        rocket.velocity.x ** 2 + rocket.velocity.y ** 2,
      ).toFixed(2);
      let result = `Rocket: ${rocket.name}\nSpeed: ${speed} units/s\nHeading: ${(((rocket.angle || 0) * 180) / Math.PI).toFixed(1)}°\nFuel: ${rocket.fuel?.toFixed(1)}/${rocket.maxFuel}`;

      if (targetBodyName) {
        const target = bodiesRef.current.find((b) =>
          b.name.toLowerCase().includes(targetBodyName.toLowerCase()),
        );
        if (target) {
          const dx = target.position.x - rocket.position.x;
          const dy = target.position.y - rocket.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const dvx = rocket.velocity.x - target.velocity.x;
          const dvy = rocket.velocity.y - target.velocity.y;
          const dv = Math.sqrt(dvx * dvx + dvy * dvy);

          result += `\nTarget: ${target.name}\nDistance: ${dist.toFixed(1)} units\nDelta V: ${dv.toFixed(2)} units/s`;
        } else {
          result += `\nTarget body '${targetBodyName}' not found.`;
        }
      }

      return result;
    },
    addManualNode: (rocketName, timeFromNow, deltaVPrograde, deltaVRadial) => {
      const rocket = bodiesRef.current.find(
        (b) =>
          b.isRocket && b.name.toLowerCase().includes(rocketName.toLowerCase()),
      );
      if (!rocket) return `Rocket '${rocketName}' not found.`;

      const newNode: Maneuver = {
        id: `node_${Date.now()}`,
        type: "manual_node",
        thrust: 0,
        duration: 0,
        angleOffset: 0,
        progress: 0,
        status: "pending",
        deltaVPrograde: deltaVPrograde,
        deltaVRadial: deltaVRadial,
        timeFromNow: timeFromNow,
      };

      const updatedManeuvers = [...(rocket.maneuvers || []), newNode];
      updateRocket(rocket.id, { maneuvers: updatedManeuvers });

      const totalDeltaV = Math.sqrt(
        deltaVPrograde ** 2 + deltaVRadial ** 2,
      ).toFixed(1);
      return `Manual node added to ${rocket.name}: T+${timeFromNow}s, ΔV=${totalDeltaV}m/s (P:${deltaVPrograde.toFixed(1)}, R:${deltaVRadial.toFixed(1)})`;
    },
    getRocketFlightPlan: (rocketName) => {
      const rocket = bodiesRef.current.find(
        (b) =>
          b.isRocket && b.name.toLowerCase().includes(rocketName.toLowerCase()),
      );
      if (!rocket) return `Rocket '${rocketName}' not found.`;

      if (!rocket.maneuvers || rocket.maneuvers.length === 0) {
        return JSON.stringify(
          {
            rocket: rocket.name,
            missionStatus: "NO_FLIGHT_PLAN",
            totalManeuvers: 0,
            maneuvers: [],
          },
          null,
          2,
        );
      }

      const pendingCount = rocket.maneuvers.filter(
        (m) => m.status === "pending",
      ).length;
      const activeCount = rocket.maneuvers.filter(
        (m) => m.status === "active",
      ).length;
      const completedCount = rocket.maneuvers.filter(
        (m) => m.status === "completed",
      ).length;

      let missionStatus = "PLANNED"; // All pending
      if (activeCount > 0) missionStatus = "EXECUTING";
      else if (completedCount === rocket.maneuvers.length)
        missionStatus = "COMPLETED";
      else if (completedCount > 0 && pendingCount > 0)
        missionStatus = "IN_PROGRESS";

      const maneuversData = rocket.maneuvers.map((m, index) => {
        const maneuverData: any = {
          step: index + 1,
          id: m.id,
          type: m.type,
          status: m.status,
          progress: m.progress,
        };

        // Add type-specific parameters
        if (m.type === "burn" || m.type === "wait") {
          maneuverData.duration = m.duration;
          if (m.type === "burn") {
            maneuverData.thrust = m.thrust;
            maneuverData.angleOffset =
              ((m.angleOffset * 180) / Math.PI).toFixed(1) + "°";
          }
        }

        if (m.type === "rotate") {
          maneuverData.rotationAngle = m.param + "°";
        }

        if (m.type === "sas") {
          maneuverData.sasMode = m.param;
        }

        if (m.type === "manual_node") {
          maneuverData.timeFromNow = m.timeFromNow;
          maneuverData.deltaVPrograde = m.deltaVPrograde;
          maneuverData.deltaVRadial = m.deltaVRadial;
          maneuverData.totalDeltaV = Math.sqrt(
            (m.deltaVPrograde || 0) ** 2 + (m.deltaVRadial || 0) ** 2,
          );
        }

        if (m.type === "change_simulation_speed") {
          maneuverData.simulationSpeed = m.param + "x";
        }

        if (
          m.type === "wait_for_transfer" ||
          m.type === "wait_for_altitude" ||
          m.type === "burn_until_altitude"
        ) {
          maneuverData.targetParameter = m.param;
          if (m.type === "wait_for_altitude") {
            maneuverData.altitudeDirection = m.param;
          }
        }

        if (m.targetBodyId) {
          const targetBody = bodiesRef.current.find(
            (b) => b.id === m.targetBodyId,
          );
          maneuverData.targetBody = targetBody?.name || "Unknown";
        }

        if (m.parentBodyId) {
          const parentBody = bodiesRef.current.find(
            (b) => b.id === m.parentBodyId,
          );
          maneuverData.referenceBody = parentBody?.name || "Unknown";
        }

        // Add progress info for active maneuvers
        if (m.status === "active") {
          maneuverData.percentComplete = (m.progress * 100).toFixed(1) + "%";
          if (m.targetDeltaV && m.appliedDeltaV) {
            maneuverData.deltaVApplied =
              m.appliedDeltaV.toFixed(1) +
              "/" +
              m.targetDeltaV.toFixed(1) +
              " m/s";
          }
        }

        return maneuverData;
      });

      return JSON.stringify(
        {
          rocket: rocket.name,
          missionStatus: missionStatus,
          totalManeuvers: rocket.maneuvers.length,
          pending: pendingCount,
          active: activeCount,
          completed: completedCount,
          currentFuel: rocket.fuel?.toFixed(1),
          maxFuel: rocket.maxFuel,
          maneuvers: maneuversData,
        },
        null,
        2,
      );
    },
    addFlightComputerModule: (
      moduleType,
      rocketName,
      referenceBodyName,
      targetBodyName,
      customName,
      color,
      groupName,
      configuration,
    ) => {
      const rocket = bodiesRef.current.find(
        (b) =>
          b.isRocket && b.name.toLowerCase().includes(rocketName.toLowerCase()),
      );
      if (!rocket) {
        // Fallback: search for any body
        const body = bodiesRef.current.find((b) =>
          b.name.toLowerCase().includes(rocketName.toLowerCase()),
        );
        if (!body) return `Subject body '${rocketName}' not found.`;
      }

      const subjectId = rocket
        ? rocket.id
        : bodiesRef.current.find((b) =>
            b.name.toLowerCase().includes(rocketName.toLowerCase()),
          )?.id || "";

      let refBodyId = "";
      if (referenceBodyName) {
        const refBody = bodiesRef.current.find((b) =>
          b.name.toLowerCase().includes(referenceBodyName.toLowerCase()),
        );
        if (refBody) refBodyId = refBody.id;
      }

      let targetBodyId: string | undefined = undefined;
      if (targetBodyName) {
        const targetBody = bodiesRef.current.find((b) =>
          b.name.toLowerCase().includes(targetBodyName.toLowerCase()),
        );
        if (targetBody) targetBodyId = targetBody.id;
      }

      let groupId: string | null = null;
      if (groupName) {
        const group = moduleGroups.find(
          (g) => g.name.toLowerCase() === groupName.toLowerCase(),
        );
        if (group) groupId = group.id;
      }

      let config: any = {};
      if (configuration) {
        try {
          config = JSON.parse(configuration);
        } catch (e) {
          console.error("Failed to parse module configuration JSON", e);
        }
      }

      const assignedColor = getNextModuleColor(flightComputerModules, color);
      const newModule: FlightComputerModule = {
        id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: moduleType,
        isEnabled: true,
        primaryBodyId: subjectId,
        referenceBodyId: refBodyId || subjectId, // Default ref to self if missing? Or maybe let it be empty/same.
        targetBodyId: targetBodyId,
        color: assignedColor,
        name: customName || `${moduleType.replace("_", " ")}`,
        maxDistance: config.maxDistance || 10,
        groupId: groupId,
        inputs: {}, // Initialize empty
        ...config, // Merge generic config
      };

      // Module-specific defaults if not in config
      if (newModule.type === "marker") {
        if (!newModule.markerShape) newModule.markerShape = "ring";
        if (!newModule.markerTitle)
          newModule.markerTitle = customName || "Marker";
        newModule.markerVisible = true;
      }

      if (newModule.type === "thrust_burst") {
        if (!newModule.thrustBurstMode) newModule.thrustBurstMode = "impulse";
        if (newModule.thrustBurstCompleted === undefined)
          newModule.thrustBurstCompleted = true;
      }

      // Lagrange Calculator uses 'body' and 'reference' inputs
      if (newModule.type === "lagrange_calculator") {
        // Set up inputs using 'body' for the smaller body and 'reference' for the larger body
        if (subjectId && !newModule.inputs?.body) {
          newModule.inputs = {
            ...newModule.inputs,
            body: { type: "body", value: subjectId },
          };
        }
        if (refBodyId && !newModule.inputs?.reference) {
          newModule.inputs = {
            ...newModule.inputs,
            reference: { type: "body", value: refBodyId },
          };
        }
      }

      setFlightComputerModules((prev) => [...prev, newModule]);

      // Return full module data as JSON so AI can use the ID for wiring
      return JSON.stringify(
        {
          success: true,
          message: `Flight Computer module '${newModule.name}' added (${moduleType}) for ${rocketName}`,
          module: {
            id: newModule.id,
            type: newModule.type,
            name: newModule.name,
            isEnabled: newModule.isEnabled,
            color: newModule.color,
            primaryBodyId: newModule.primaryBodyId,
            referenceBodyId: newModule.referenceBodyId,
            targetBodyId: newModule.targetBodyId,
            groupId: newModule.groupId,
            inputs: newModule.inputs,
            // Include any module-specific config that was set
            ...(newModule.type === "marker" && {
              markerShape: newModule.markerShape,
              markerTitle: newModule.markerTitle,
              markerVisible: newModule.markerVisible,
            }),
            ...(newModule.type === "thrust_burst" && {
              thrustBurstMode: newModule.thrustBurstMode,
              thrustBurstCompleted: newModule.thrustBurstCompleted,
            }),
            ...(newModule.type === "logic_gate" && {
              logicOperator: newModule.logicOperator,
            }),
            ...(newModule.type === "maths" && {
              mathOperator: newModule.mathOperator,
              mathValueA: newModule.mathValueA,
              mathValueB: newModule.mathValueB,
            }),
            ...(newModule.type === "notify" && {
              comparisonOperator: newModule.comparisonOperator,
              comparisonValue: newModule.comparisonValue,
              notifyMessage: newModule.notifyMessage,
            }),
            ...(newModule.type === "slider" && {
              sliderMin: newModule.sliderMin,
              sliderMax: newModule.sliderMax,
              sliderValue: newModule.sliderValue,
            }),
            ...(newModule.type === "custom_script" && {
              customScriptCode: newModule.customScriptCode,
              customScriptOutputType: newModule.customScriptOutputType,
              customScriptMode: newModule.customScriptMode,
            }),
            ...(newModule.type === "lagrange_calculator" && {
              lagrangeL1: newModule.lagrangeL1,
              lagrangeL2: newModule.lagrangeL2,
              lagrangeL3: newModule.lagrangeL3,
              lagrangeL4: newModule.lagrangeL4,
              lagrangeL5: newModule.lagrangeL5,
            }),
          },
        },
        null,
        2,
      );
    },

    removeFlightComputerModule: (moduleName) => {
      const module = flightComputerModules.find((m) =>
        m.name?.toLowerCase().includes(moduleName.toLowerCase()),
      );
      if (!module) return `Flight Computer module '${moduleName}' not found.`;

      setFlightComputerModules((prev) =>
        prev.filter((m) => m.id !== module.id),
      );
      return `Removed Flight Computer module '${module.name}'.`;
    },

    createModuleGroup: (name, color, parentGroupName) => {
      let parentGroupId: string | null = null;
      if (parentGroupName) {
        const parent = moduleGroups.find(
          (g) => g.name.toLowerCase() === parentGroupName.toLowerCase(),
        );
        if (parent) parentGroupId = parent.id;
        else return `Parent group '${parentGroupName}' not found.`;
      }

      const newGroup: ModuleGroup = {
        id: `fc_group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: name,
        color: color || "#10b981",
        isCollapsed: false,
        parentGroupId: parentGroupId,
      };

      setModuleGroups((prev) => [...prev, newGroup]);
      return `Group '${name}' created.`;
    },

    getFlightComputerData: () => {
      if (flightComputerModules.length === 0) {
        return "No active Flight Computer modules.";
      }

      const modulesData = [];

      for (const module of flightComputerModules) {
        const rocket = bodiesRef.current.find(
          (b) => b.id === module.primaryBodyId,
        );
        const ref = bodiesRef.current.find(
          (b) => b.id === module.referenceBodyId,
        );
        const target = module.targetBodyId
          ? bodiesRef.current.find((b) => b.id === module.targetBodyId)
          : null;
        const group = module.groupId
          ? moduleGroups.find((g) => g.id === module.groupId)
          : null;

        const moduleData: any = {
          name: module.name || module.type,
          type: module.type,
          enabled: module.isEnabled,
          subject: rocket?.name || "Unknown",
          group: group?.name || null,
          // Generic state dump
          ...module,
        };

        // Cleanup heavy objects to avoid bloat
        delete moduleData.inputs;
        delete moduleData.systemMonitorStats;

        // Add resolved scalar output for Logic/Sensors
        if (
          [
            "logic_gate",
            "notify",
            "compare",
            "maths",
            "change_detector",
            "edge_detector",
            "timer",
            "sequencer",
          ].includes(module.type)
        ) {
          // Attempt to resolve the 'result' or 'triggered' signal
          // This is tricky because we don't have easy access to the resolved output map here without re-running resolution logic.
          // However, many modules store their last state in properties like 'notifyTriggered', 'edgeTriggered'.
          // For others, we might rely on 'customScriptLastResult'.
          // For now, dumping the module properties as done above covers most internal state.
        }

        // Explicit calculations for physics modules
        if (module.type === "orbit_info" && rocket && ref) {
          const dx = rocket.position.x - ref.position.x;
          const dy = rocket.position.y - ref.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const altitude = dist - ref.radius;

          const dvx = rocket.velocity.x - ref.velocity.x;
          const dvy = rocket.velocity.y - ref.velocity.y;
          const vSq = dvx * dvx + dvy * dvy;

          const mu = physicsConfig.gravitationalConstant * ref.mass;
          const E = vSq / 2 - mu / dist;

          moduleData.orbitalData = {
            altitude: altitude,
            isBound: E < 0,
          };

          if (E < 0) {
            const a = -mu / (2 * E);
            const eccentricity = Math.sqrt(
              Math.max(0, 1 + (2 * E * (dx * dvy - dy * dvx) ** 2) / (mu * mu)),
            ); // simplified h^2 calc? No wait, h is angular momentum
            // Correct calc:
            const h = dx * dvy - dy * dvx;
            // eccentricity already correct in stored code?
            const periapsis = a * (1 - eccentricity) - ref.radius;
            const apoapsis = a * (1 + eccentricity) - ref.radius;
            const period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);

            moduleData.orbitalData.periapsis = periapsis;
            moduleData.orbitalData.apoapsis = apoapsis;
            moduleData.orbitalData.period = period;
            moduleData.orbitalData.eccentricity = eccentricity;
          }
        }

        if (module.type === "transfer_window" && rocket && ref && target) {
          const transferWindowData = calculateTransferInfo(
            rocket,
            ref,
            target,
            physicsConfig.gravitationalConstant,
          );
          moduleData.transferData = {
            ready: transferWindowData.error < 5.0, // rough check
            error: transferWindowData.error,
            currentPhase: transferWindowData.currentPhase,
            requiredPhase: transferWindowData.requiredPhase,
          };
        }

        // Add rendezvous data if available
        const rdvData = rendezvousPoints.find(
          (rdv) => rdv.moduleId === module.id,
        );
        if (module.type === "rendezvous_tracker" && rdvData) {
          moduleData.rendezvousData = {
            found: true,
            timeToRendezvous: rdvData.timeToRendezvous,
            distance: rdvData.distance,
            totalDeltaV: rdvData.totalDeltaV,
          };
        }

        modulesData.push(moduleData);
      }

      return JSON.stringify(
        {
          totalModules: flightComputerModules.length,
          modules: modulesData,
        },
        null,
        2,
      );
    },
    updateFlightComputerModule: (moduleName, configuration) => {
      const module = flightComputerModules.find((m) =>
        m.name?.toLowerCase().includes(moduleName.toLowerCase()),
      );
      if (!module) return `Flight Computer module '${moduleName}' not found.`;

      let config: any = {};
      try {
        config = JSON.parse(configuration);
      } catch (e) {
        return `Failed to parse configuration JSON: ${e}`;
      }

      setFlightComputerModules((prev) =>
        prev.map((m) => {
          if (m.id === module.id) {
            // Deep merge for dashboardConfig to avoid wiping out other properties if only one is updated
            const newDashboardConfig = config.dashboardConfig
              ? {
                  ...(m.dashboardConfig || { x: 0, y: 0 }),
                  ...config.dashboardConfig,
                }
              : m.dashboardConfig;
            const newInputs = config.inputs
              ? { ...(m.inputs || {}), ...config.inputs }
              : m.inputs;

            // Remove nested objects from top-level spread to avoid overwriting with incomplete objects if not handled above
            // Actually, simple spread ...config will overwrite dashboardConfig if it exists in config.
            // So we must manually assign the merged versions AFTER spread.

            return {
              ...m,
              ...config,
              dashboardConfig: newDashboardConfig,
              inputs: newInputs,
            };
          }
          return m;
        }),
      );

      return `Flight Computer module '${module.name}' updated with new configuration.`;
    },
    toggleFlightComputerModule: (moduleName, enabled) => {
      const module = flightComputerModules.find((m) =>
        m.name?.toLowerCase().includes(moduleName.toLowerCase()),
      );
      if (!module) return `Flight Computer module '${moduleName}' not found.`;

      setFlightComputerModules((prev) =>
        prev.map((m) =>
          m.id === module.id ? { ...m, isEnabled: enabled } : m,
        ),
      );

      return `Flight Computer module '${module.name}' ${enabled ? "enabled" : "disabled"}.`;
    },
  };

  // EXPOSED FLIGHT COMPUTER LOGIC (Lifted from FlightComputerPanel)
  const { rendezvousSolutionMap, followModuleTriggerStateRef, game } =
    useFlightComputerLogic(
      flightComputerModules,
      bodies,
      physicsConfig,
      rendezvousPoints,
      handleUpdateModule,
      handleAddModule,
      handleRemoveModule,
      handleToggleModule,
      fps,
      simulationTimeRef.current,
      scaleRef.current,
      (id) => {
        if (id) {
          handleToggleFollow(id);
        } else {
          setFollowingBodyId(null);
        }
      },
      updateRocket,
      handlePresetChange,
      setSpeed,
      setIsRunning,
      isRunning,
      speed,
      handleReset,
      handleTimeReverse,
      (factor) => handleZoom(factor),
      nbColumns,
      nbRows,
      gap,
      setNbColumns,
      setNbRows,
      setGap,
      handleUpdateCandidate,
      handleSpawnManual,
      setCreationCandidate,
      createAndSpawnBody,
      setShowImageSlideShow,
      handleNext, // nextImage
      handlePrev, // prevImage
      handleJumpToImage,
      setShowCameraViewer,
      setShowParralaxe,
      handleStageRocket,
    );

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {use3D ? (
        <Canvas3D
          bodies={bodies}
          particles={particles}
          width={dimensions.width}
          height={dimensions.height}
          scale={scale}
          offset={offset}
          onPan={handlePan}
          onZoom={handleZoom}
          onSelectBody={handleSelectBody}
          selectedBodyId={selectedBodyId}
          visualConfig={visualConfig}
          physicsConfig={physicsConfig}
          isCreationMode={isCreationMode}
          creationCandidate={creationCandidate}
          predictionPaths={predictionPaths}
          onCanvasClick={handleCanvasClick}
          isRocketMode={showRocketPanel}
          isRocketSpawning={isRocketSpawning}
          rocketTargetBodyId={rocketTargetBodyId}
          observerBodyIds={observerBodyIds}
          coMData={currentCoMData}
          showTransferWindow={showTransferWindow}
          showTheoreticalOrbit={showTheoreticalOrbit}
          followingBodyId={followingBodyId}
          followingCoM={followingCoM}
          flightComputerModules={flightComputerModules}
          rendezvousPoint={rendezvousPoint}
          rendezvousPoints={rendezvousPoints}
        />
      ) : (
        <>
          <Canvas
            bodiesRef={bodiesRef}
            particlesRef={particlesRef}
            width={dimensions.width}
            height={dimensions.height}
            scale={scale}
            offset={offset}
            onPan={handlePan}
            onZoom={handleZoom}
            onSelectBody={handleSelectBody}
            selectedBodyId={selectedBodyId}
            visualConfig={visualConfig}
            physicsConfig={physicsConfig}
            isCreationMode={isCreationMode}
            creationCandidate={creationCandidate}
            predictionPaths={predictionPaths}
            onCanvasClick={handleCanvasClick}
            isRocketMode={showRocketPanel}
            isRocketSpawning={isRocketSpawning}
            rocketTargetBodyId={rocketTargetBodyId}
            observerBodyIds={observerBodyIds}
            coMData={currentCoMData}
            showTransferWindow={showTransferWindow}
            showTheoreticalOrbit={showTheoreticalOrbit}
            flightComputerModules={flightComputerModules}
            rendezvousPoint={rendezvousPoint}
            rendezvousPoints={rendezvousPoints}
          />
          {showAsteroid && (
            <AsteroidOverlay
              width={dimensions.width}
              height={dimensions.height}
              scale={scale}
              offset={offset}
              bodies={bodies}
              physicsConfig={physicsConfig}
              simulationSpeed={speed}
              showDensity={showAsteroidDensity}
            />
          )}
        </>
      )}

      <div className="fixed bottom-0 left-0 z-[60] pointer-events-auto ">
        <button
          className="bg-slate-900/90 border border-slate-700 text-green-400 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm space-y-2"
          onClick={() => setShowUI(!showUI)}
        >
          Toggle UI
        </button>
      </div>

      <FlightComputerDashboard
        modules={flightComputerModules}
        bodies={bodies}
        physicsConfig={physicsConfig}
        rendezvousPoints={rendezvousPoints}
        onUpdateModule={handleUpdateModule}
        onToggleModule={handleToggleModule}
        showUI={showUI}
        nbColumns={nbColumns}
        nbRows={nbRows}
        gap={gap}
      />

      <FlightComputerPanel
        modules={flightComputerModules}
        groups={moduleGroups}
        bodies={bodies}
        physicsConfig={physicsConfig}
        onAddModule={handleAddModule}
        onRemoveModule={handleRemoveModule}
        onUpdateModule={handleUpdateModule}
        onToggleModule={handleToggleModule}
        onAddGroup={handleAddGroup}
        onRemoveGroup={handleRemoveGroup}
        onUpdateGroup={handleUpdateGroup}
        onMoveModuleToGroup={handleMoveModuleToGroup}
        onMoveGroupToGroup={handleMoveGroupToGroup}
        onExportGroup={handleExportGroup}
        onImportGroup={handleImportGroup}
        rendezvousPoints={rendezvousPoints}
        onSetFollowingBody={(id) => {
          if (id) {
            handleToggleFollow(id);
          } else {
            setFollowingBodyId(null);
          }
        }}
        fps={fps}
        simulationTime={simulationTimeRef.current}
        scale={scaleRef.current}
        showUI={showUI}
        updateRocket={updateRocket}
        handlePresetChange={handlePresetChange}
        setSpeed={setSpeed}
        setIsRunning={setIsRunning}
        isRunning={isRunning}
        speed={speed}
        onReset={handleReset}
        onTimeReverse={handleTimeReverse}
        onZoom={(factor) => handleZoom(factor)}
        nbColumns={nbColumns}
        nbRows={nbRows}
        gap={gap}
        setNbColumns={setNbColumns}
        setNbRows={setNbRows}
        setGap={setGap}
        handleUpdateCandidate={handleUpdateCandidate}
        handleSpawnManual={handleSpawnManual}
        setCreationCandidate={setCreationCandidate}
        createAndSpawnBody={createAndSpawnBody}
        setShowImageSlideShow={setShowImageSlideShow}
        nextImage={handleNext}
        prevImage={handlePrev}
        handleJumpToImage={handleJumpToImage}
        setShowCameraViewer={setShowCameraViewer}
        setShowParralaxe={setShowParralaxe}
        handleStageRocket={handleStageRocket}
        onPuterExportGroup={handlePuterExportGroup}
        onPuterImportGroup={handlePuterImportGroup}
        rendezvousSolutionMap={rendezvousSolutionMap}
        followModuleTriggerStateRef={followModuleTriggerStateRef}
      />

      <Activity mode={showUI ? "visible" : "hidden"}>
        <>
          {/* DEBUG PANEL */}
          {true && (
            <div
              className={`fixed ${isMobile ? "top-0 right-0" : "bottom-0 right-0"} z-[60] pointer-events-auto font-mono text-xs`}
            >
              <div className="bg-slate-900/90 border border-slate-700 text-green-400 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm space-y-2">
                {/* Time and FPS Row */}
                <div className="flex items-center gap-3 ">
                  <Terminal size={12} />
                  <div className="font-bold">
                    {(() => {
                      const totalSeconds = Math.floor(
                        simulationTimeRef.current,
                      );
                      const years = Math.floor(
                        totalSeconds / (365.25 * 24 * 3600),
                      );
                      const months = Math.floor(
                        (totalSeconds % (365.25 * 24 * 3600)) /
                          (30.44 * 24 * 3600),
                      );
                      const days = Math.floor(
                        (totalSeconds % (30.44 * 24 * 3600)) / (24 * 3600),
                      );
                      const hours = Math.floor(
                        (totalSeconds % (24 * 3600)) / 3600,
                      );
                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                      let seconds = totalSeconds % 60;

                      const parts = [];
                      if (years > 0) parts.push(`${years}y`);
                      if (months > 0)
                        parts.push(
                          months < 10 ? `0${months}mo` : `${months}mo`,
                        );
                      if (days > 0)
                        parts.push(days < 10 ? `0${days}d` : `${days}d`);
                      if (hours > 0)
                        parts.push(hours < 10 ? `0${hours}h` : `${hours}h`);
                      if (minutes > 0)
                        parts.push(
                          minutes < 10 ? `0${minutes}m` : `${minutes}m`,
                        );
                      else if (parts.length > 0) parts.push("00m");
                      if (seconds > 0)
                        parts.push(
                          seconds < 10 ? `0${seconds}s` : `${seconds}s`,
                        );
                      else if (parts.length > 0) parts.push("00s");

                      return parts.length > 0
                        ? parts.join(" ")
                        : `${totalSeconds.toFixed(1)}s`;
                    })()}
                  </div>
                  <div className="w-px h-3 bg-slate-700 mx-1 " />
                  <div className={fps < 30 ? "text-red-400" : "text-green-400"}>
                    {fps.toFixed(0)} FPS
                  </div>
                </div>

                {/* Extended Debug Info (Desktop Only) */}
                {!isMobile && (
                  <>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-400">
                      {memoryUsage && (
                        <div className="col-span-2 flex items-center gap-1 mt-0 pt-0 border-t border-slate-700/30">
                          <MemoryStick size={10} />
                          <span>
                            {memoryUsage.used.toFixed(0)}MB /{" "}
                            {memoryUsage.total.toFixed(0)}MB (
                            {memoryUsage.percent.toFixed(0)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Flight Computer Panel */}

          {/* Assistant */}
          {showAssistant && (
            <Assistant
              selectedBodyName={
                selectedBodyId
                  ? bodies.find((b) => b.id === selectedBodyId)?.name || null
                  : null
              }
              actions={assistantActions}
              bodies={bodies}
            />
          )}

          {/* NEW ROCKET HUD */}
          {!isMobile &&
            showRocketPanel &&
            (() => {
              const allRockets = bodies.filter((b) => b.isRocket);
              const selectedRocket = selectedBodyId
                ? bodies.find((b) => b.id === selectedBodyId && b.isRocket)
                : null;

              // If a rocket is selected, show only that one
              if (selectedRocket) {
                return (
                  <RocketDataPanel
                    rocket={selectedRocket}
                    bodies={bodies}
                    physicsConfig={physicsConfig}
                    parentBodyId={rocketParentBodyId}
                    targetBodyId={rocketTargetBodyId}
                    predictionPaths={predictionPaths}
                    predictionSteps={predictionSteps}
                    predictSystem={isPredictionEnabled}
                    onUpdateRocket={updateRocket}
                    onSelectRocket={setSelectedBodyId}
                    index={0}
                  />
                );
              }

              // Otherwise, show all rockets
              return (
                <>
                  {allRockets.map((rocket, index) => (
                    <RocketDataPanel
                      key={rocket.id}
                      rocket={rocket}
                      bodies={bodies}
                      physicsConfig={physicsConfig}
                      parentBodyId={rocket.orbitReferenceId}
                      targetBodyId={rocketTargetBodyId}
                      predictionPaths={predictionPaths}
                      predictionSteps={predictionSteps}
                      predictSystem={isPredictionEnabled}
                      onUpdateRocket={updateRocket}
                      onSelectRocket={setSelectedBodyId}
                      index={index}
                    />
                  ))}
                </>
              );
            })()}

          {/* Global Prediction Panel */}
          <PredictionPanel
            bodies={bodies}
            isEnabled={isPredictionEnabled}
            onToggleEnabled={setIsPredictionEnabled}
            predictionSteps={predictionSteps}
            onStepsChange={setPredictionSteps}
            selectedBodyIds={predictionBodyIds}
            onToggleBody={(id) => {
              setPredictionBodyIds((prev) =>
                prev.includes(id)
                  ? prev.filter((bId) => bId !== id)
                  : [...prev, id],
              );
            }}
            followingBodyId={followingBodyId}
            onFollowBody={handleToggleFollow}
          />

          {showRocketPanel && (
            <RocketPanel
              onClose={() => setShowRocketPanel(false)}
              onSpawnToggle={() => setIsRocketSpawning(!isRocketSpawning)}
              isSpawning={isRocketSpawning}
              spawnConfig={rocketSpawnConfig}
              onUpdateSpawnConfig={setRocketSpawnConfig}
              selectedRocket={
                bodies.find((b) => b.id === selectedBodyId && b.isRocket) ||
                null
              }
              onUpdateRocket={updateRocket}
              isFollowing={followingBodyId === selectedBodyId}
              onToggleFollow={() =>
                selectedBodyId && handleToggleFollow(selectedBodyId)
              }
              bodies={bodies}
              physicsConfig={physicsConfig}
              targetBodyId={rocketTargetBodyId}
              onTargetChange={setRocketTargetBodyId}
              speed={speed}
              onSpeedChange={setSpeed}
              onUpdatePhysicsConfig={(c) =>
                setPhysicsConfig((prev) => ({ ...prev, ...c }))
              }
              getSimulationTime={() => simulationTimeRef.current}
              parentBodyId={rocketParentBodyId}
              onParentChange={setRocketParentBodyId}
              showTransferWindow={showTransferWindow}
              onToggleTransferWindow={() =>
                setShowTransferWindow(!showTransferWindow)
              }
              showTheoreticalOrbit={showTheoreticalOrbit}
              onToggleTheoreticalOrbit={() =>
                setShowTheoreticalOrbit(!showTheoreticalOrbit)
              }
              predictionPaths={predictionPaths}
              predictionSteps={predictionSteps}
              predictSystem={isPredictionEnabled}
              onRendezvousPointChange={setRendezvousPoint}
              onSelectRocket={setSelectedBodyId}
              onStage={handleStageRocket}
            />
          )}

          {selectedBodyId &&
            !isCreationMode &&
            !isRocketSpawning &&
            !showRocketPanel && (
              <InfoPanel
                body={bodies.find((b) => b.id === selectedBodyId) || null}
                onClose={() => setSelectedBodyId(null)}
                allBodies={bodies}
                isFollowing={followingBodyId === selectedBodyId}
                onToggleFollow={() =>
                  selectedBodyId && handleToggleFollow(selectedBodyId)
                }
                onDelete={handleDeleteBody}
                onMakeStar={handleMakeStar}
                onPlaceObject={handlePlaceObject}
              />
            )}

          {showBuilder && (
            <BuilderPanel
              onClose={() => setShowBuilder(false)}
              onAddBody={handleAddBody}
            />
          )}

          {isCreationMode && creationCandidate && (
            <ManualCreationPanel
              candidate={creationCandidate}
              predictionSteps={predictionSteps}
              onUpdate={handleUpdateCandidate}
              onStepsChange={setPredictionSteps}
              onSpawn={handleSpawnManual}
              onCancel={() => {
                setIsCreationMode(false);
                setCreationCandidate(null);
              }}
            />
          )}

          {showSettings && (
            <SettingsPanel
              visualConfig={visualConfig}
              setVisualConfig={setVisualConfig}
              physicsConfig={physicsConfig}
              setPhysicsConfig={setPhysicsConfig}
              onClose={() => setShowSettings(false)}
              onReset={() => {
                setVisualConfig(DEFAULT_VISUAL_CONFIG);
                setPhysicsConfig(DEFAULT_PHYSICS_CONFIG);
              }}
              onExport={handleExportState}
              onImport={handleImportState}
              onPuterSave={handlePuterSave}
              onPuterLoad={handlePuterLoad}
              use3D={use3D}
              setUse3D={setUse3D}
              audioState={audioState}
              onEnableAudio={resumeAudio}
              showMusicPanel={showMusicPanel}
              setShowMusicPanel={setShowMusicPanel}
              showDebugPanel={showDebugPanel}
              setShowDebugPanel={setShowDebugPanel}
              showMinimap={showMinimap}
              setShowMinimap={setShowMinimap}
              showAsteroidDensity={showAsteroidDensity}
              setShowAsteroidDensity={setShowAsteroidDensity}
              showAsteroid={showAsteroid}
              setShowAsteroid={setShowAsteroid}
            />
          )}

          {showObserver && (
            <GravityObserverPanel
              bodies={bodies}
              bodyIdA={observerBodyIds.a}
              bodyIdB={observerBodyIds.b}
              onSelectA={(id) =>
                setObserverBodyIds((prev) => ({ ...prev, a: id }))
              }
              onSelectB={(id) =>
                setObserverBodyIds((prev) => ({ ...prev, b: id }))
              }
              onClose={() => setShowObserver(false)}
              gConstant={physicsConfig.gravitationalConstant}
            />
          )}

          {currentCoMData && visualConfig.showCenterOfMass && (
            <CoMInfoPanel
              coMData={currentCoMData}
              threshold={visualConfig.centerOfMassThreshold}
              onThresholdChange={(v) =>
                setVisualConfig((prev) => ({
                  ...prev,
                  centerOfMassThreshold: v,
                }))
              }
            />
          )}

          {false && (
            <div className="fixed top-0 right-0 bottom-0 left-0 z-[80] pointer-events-none">
              <JargonMetre />
            </div>
          )}

          {/* DEBUG PANEL */}
          {showDebugPanel && (
            <DebugPanel
              bodies={bodies}
              particles={particles}
              simulationTime={simulationTimeRef.current}
              scale={scale}
              speed={speed}
              fps={fps}
              physicsConfig={physicsConfig}
              flightComputerModules={flightComputerModules}
              assistantActions={assistantActions}
              game={game}
            />
          )}

          {showMinimap && (
            <MinimapPanel
              bodies={bodies}
              flightComputerModules={flightComputerModules}
              predictionPaths={predictionPaths}
              physicsConfig={physicsConfig}
              onClose={() => setShowMinimap(false)}
            />
          )}

          <Controls
            isRunning={isRunning}
            onTogglePlay={() => setIsRunning(!isRunning)}
            onReset={handleReset}
            onTimeReverse={handleTimeReverse}
            speed={speed}
            onSpeedChange={setSpeed}
            onZoom={(factor) => handleZoom(factor)} // Passed wrapped
            onOpenBuilder={() => setShowBuilder(true)}
            onOpenSettings={() => setShowSettings(true)}
            presets={availablePresets}
            currentPresetId={currentPresetId}
            onSelectPreset={handlePresetChange}
            showGrid={visualConfig.showGrid}
            onToggleGrid={() =>
              setVisualConfig((prev) => ({ ...prev, showGrid: !prev.showGrid }))
            }
            showAssistant={showAssistant}
            onToggleAssistant={() => setShowAssistant(!showAssistant)}
            isCreationMode={isCreationMode}
            onToggleCreationMode={toggleCreationMode}
            showObserver={showObserver}
            onToggleObserver={() => setShowObserver(!showObserver)}
            isFollowingCoM={followingCoM}
            onToggleFollowCoM={handleToggleFollowCoM}
            showCenterOfMass={visualConfig.showCenterOfMass}
            onToggleShowCoM={() =>
              setVisualConfig((prev) => ({
                ...prev,
                showCenterOfMass: !prev.showCenterOfMass,
              }))
            }
            showRocketPanel={showRocketPanel}
            onToggleRocketPanel={() => setShowRocketPanel(!showRocketPanel)}
          />
          {/* Music Panel */}
          {showMusicPanel && (
            <MusicPanel
              apiKey={localStorage.getItem("gemini_api_key") || ""}
              onClose={() => setShowMusicPanel(false)}
            />
          )}
        </>
      </Activity>

      {/* <Activity mode={showImageSlideShow ? 'visible' : 'hidden'}>

                <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-screen bg-gray-900 overflow-hidden font-sans z-[100]">

                    <div className="fixed top-0 left-0 right-0 bottom-0">
                        <FullPageSlideshow
                            ref={slideshowRef}
                            images={PLACEHOLDER_IMAGES}
                            className="h-full w-full"
                        />
                    </div>
                </div>
            </Activity> */}

      <Activity mode={showCameraViewer ? "visible" : "hidden"}>
        <CameraViewer />
      </Activity>

      {/* Maneuver Gizmo Layers */}
      {predictionNodePositions.map((node) => {
        // Find the maneuver and rocket
        let foundManeuver: Maneuver | undefined;
        let foundRocket: Body | undefined;

        for (const body of bodies) {
          if (body.maneuvers) {
            const m = body.maneuvers.find((mn) => mn.id === node.maneuverId);
            if (m) {
              foundManeuver = m;
              foundRocket = body;
              break;
            }
          }
        }

        if (!foundManeuver || !foundRocket) return null;

        // Convert World to Screen
        const screenX =
          node.position.x * scale + offset.x + dimensions.width / 2;
        const screenY =
          node.position.y * scale + offset.y + dimensions.height / 2;

        return (
          <ManeuverGizmo
            key={node.maneuverId}
            maneuver={foundManeuver}
            screenPosition={{ x: screenX, y: screenY }}
            zoom={scale}
            onUpdate={(updates) => {
              if (foundRocket && foundManeuver) {
                const newManeuvers = foundRocket.maneuvers?.map((m) =>
                  m.id === foundManeuver?.id ? { ...m, ...updates } : m,
                );
                updateRocket(foundRocket.id, { maneuvers: newManeuvers });
              }
            }}
            onDelete={() => {
              if (foundRocket && foundManeuver) {
                const newManeuvers = foundRocket.maneuvers?.filter(
                  (m) => m.id !== foundManeuver?.id,
                );
                updateRocket(foundRocket.id, { maneuvers: newManeuvers });
              }
            }}
          />
        );
      })}

      <Activity mode={showParralaxe ? "visible" : "hidden"}>
        <Parralaxe />
      </Activity>
    </div>
  );
};

export default App;
