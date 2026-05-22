import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Rocket,
  Crosshair,
  Anchor,
  Gauge,
  Compass,
  Fuel,
  X,
  RotateCcw,
  RotateCw,
  ArrowUp,
  Zap,
  Ban,
  Eye,
  Globe,
  CircleDot,
  RefreshCw,
  ArrowDownToLine,
  TrendingUp,
  Clock,
  Sliders,
  Settings,
  Radio,
  ArrowRightLeft,
  ChevronDown,
} from "lucide-react";
import {
  Body,
  Maneuver,
  SASMode,
  PhysicsConfig,
  Vector2D,
  RocketSpawnConfig,
  ShipDesign,
} from "../types";
import useIsMobile from "../hooks/useIsMobile";
import MissionTabDesktop from "./MissionTabDesktop";
import MissionTabMobile from "./MissionTabMobile";
import type { MissionTabProps } from "./RocketMissionTab.types";

interface RocketPanelProps {
  onClose: () => void;
  onSpawnToggle: () => void;
  isSpawning: boolean;
  spawnConfig: RocketSpawnConfig;
  onUpdateSpawnConfig: (config: RocketSpawnConfig) => void;
  selectedRocket: Body | null;
  onUpdateRocket: (id: string, updates: Partial<Body>) => void;
  isFollowing: boolean;
  onToggleFollow: () => void;

  bodies: Body[];
  physicsConfig: PhysicsConfig;
  targetBodyId: string;
  onTargetChange: (id: string) => void;
  speed: number;
  onSpeedChange: (val: number) => void;
  onUpdatePhysicsConfig: (config: Partial<PhysicsConfig>) => void;
  getSimulationTime: () => number;
  parentBodyId?: string;
  onParentChange?: (id: string) => void;
  showTransferWindow: boolean;
  onToggleTransferWindow: () => void;
  showTheoreticalOrbit: boolean;
  onToggleTheoreticalOrbit: () => void;

  // Prediction Data
  predictionPaths?: { id: string; color: string; points: Vector2D[] }[];
  predictionSteps?: number;
  predictSystem?: boolean;

  // Rendezvous Visualization
  onRendezvousPointChange?: (point: Vector2D | null) => void;
  onSelectRocket?: (id: string) => void;
  onStage?: (id: string) => void;
}

const ROCKET_COLORS = [
  "#f97316",
  "#22d3ee",
  "#ffffff",
  "#ef4444",
  "#94a3b8",
  "#a855f7",
  "#eab308",
];

const RocketPanel: React.FC<RocketPanelProps> = ({
  onClose,
  onSpawnToggle,
  isSpawning,
  spawnConfig,
  onUpdateSpawnConfig,
  selectedRocket,
  onUpdateRocket,
  isFollowing,
  onToggleFollow,

  bodies,
  physicsConfig,
  targetBodyId,
  onTargetChange,
  speed,
  onSpeedChange,
  onUpdatePhysicsConfig,
  getSimulationTime,
  parentBodyId,
  onParentChange,
  showTransferWindow,
  onToggleTransferWindow,
  showTheoreticalOrbit,
  onToggleTheoreticalOrbit,

  predictionPaths,
  predictionSteps,
  predictSystem,

  onRendezvousPointChange,
  onSelectRocket,
  onStage,
}) => {
  const [activeTab, setActiveTab] = useState<"flight" | "mission" | "config">(
    "flight",
  );

  // Burst/Maneuver Config
  const [maneuverType, setManeuverType] = useState<Maneuver["type"]>("burn");
  const [thrustPower, setThrustPower] = useState(0.01);
  const [burstDuration, setBurstDuration] = useState(2.0);
  const [burstAngle, setBurstAngle] = useState(0);
  const [maneuverParam, setManeuverParam] = useState<string>(""); // Generic param (angle, altitude, etc.)
  const [maneuverTargetId, setManeuverTargetId] = useState<string>(""); // Target body for auto maneuvers
  const [maneuverParentId, setManeuverParentId] = useState<string>(""); // Parent body for transfers
  const [altitudeDirection, setAltitudeDirection] = useState<
    "ascending" | "descending"
  >("ascending"); // Direction for altitude waits
  const [notification, setNotification] = useState<string | null>(null);

  // Manual Node Params
  const [nodeTime, setNodeTime] = useState<number>(60);
  const [dvPrograde, setDvPrograde] = useState<number>(0);
  const [dvRadial, setDvRadial] = useState<number>(0);

  const [editingManeuverId, setEditingManeuverId] = useState<string | null>(
    null,
  );

  // Quick Action Body Selections (independent from maneuver queue)
  const [sasReferenceBodyId, setSasReferenceBodyId] = useState<string>(""); // SAS reference
  const [circularizeBodyId, setCircularizeBodyId] = useState<string>(""); // Circularize reference
  const [landBodyId, setLandBodyId] = useState<string>(""); // Land target
  const [transferTargetBodyId, setTransferTargetBodyId] = useState<string>(""); // Transfer target
  const [transferParentBodyId, setTransferParentBodyId] = useState<string>(""); // Transfer parent

  // Manual Control
  const [manualThrusting, setManualThrusting] = useState(false);
  const [manualThrustPower, setManualThrustPower] = useState(0.003);

  // Rendezvous Calculator
  const [rendezvousTargetId, setRendezvousTargetId] = useState<string>("");
  const [rendezvousDistance, setRendezvousDistance] = useState<number>(10);

  // Recorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordedManeuvers, setRecordedManeuvers] = useState<Maneuver[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null,
  );
  const burnStartTimeRef = useRef<number | null>(null);
  const lastActionTimeRef = useRef<number | null>(null);

  // Sync Edit State from Rocket to Local when Selection Changes
  useEffect(() => {
    if (editingManeuverId && selectedRocket?.maneuvers) {
      const m = selectedRocket.maneuvers.find(
        (x) => x.id === editingManeuverId,
      );
      if (m && m.type === "manual_node") {
        // Only set initial values when starting to edit
        setNodeTime(m.timeFromNow || 0);
        setDvPrograde(m.deltaVPrograde || 0);
        setDvRadial(m.deltaVRadial || 0);
        setManeuverType(m.type);
      }
    }
  }, [editingManeuverId]);

  // Live Update from Local to Rocket (Realtime Editing) - debounced
  useEffect(() => {
    if (!editingManeuverId || !selectedRocket?.maneuvers) return;

    const m = selectedRocket.maneuvers.find((x) => x.id === editingManeuverId);
    if (!m || m.type !== "manual_node") return;

    // Check if values actually changed
    if (
      Math.abs((m.timeFromNow || 0) - nodeTime) < 0.01 &&
      Math.abs((m.deltaVPrograde || 0) - dvPrograde) < 0.01 &&
      Math.abs((m.deltaVRadial || 0) - dvRadial) < 0.01
    ) {
      return;
    }

    // Debounce updates to prevent flickering
    const timer = setTimeout(() => {
      const updatedManeuvers = selectedRocket.maneuvers!.map((x) => {
        if (x.id === editingManeuverId) {
          return {
            ...x,
            timeFromNow: nodeTime,
            deltaVPrograde: dvPrograde,
            deltaVRadial: dvRadial,
          };
        }
        return x;
      });
      onUpdateRocket(selectedRocket.id, { maneuvers: updatedManeuvers });
    }, 50); // 50ms debounce

    return () => clearTimeout(timer);
  }, [nodeTime, dvPrograde, dvRadial]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- MANEUVER LOGIC ---
  const handleParentChange = (newParentId: string) => {
    //if neParentId is == to selectedRocket.orbitReferenceId, return
    if (newParentId === selectedRocket?.orbitReferenceId) return;

    //if neParentId is == to targetBodyId
    if (newParentId === targetBodyId) return;

    if (onParentChange) onParentChange(newParentId);
    if (selectedRocket) {
      onUpdateRocket(selectedRocket.id, { orbitReferenceId: newParentId });
    }
  };

  const handleAddManeuver = () => {
    if (!selectedRocket) return;

    let newManeuver: Maneuver = {
      id: `m_${Date.now()}`,
      type: maneuverType,
      thrust: 0,
      duration: 0,
      angleOffset: 0,
      progress: 0,
      status: "pending",
    };

    // Configure based on type
    switch (maneuverType) {
      case "burn":
        newManeuver.thrust = thrustPower;
        newManeuver.duration = burstDuration;
        newManeuver.angleOffset = (burstAngle * Math.PI) / 180;
        break;
      case "wait":
        newManeuver.duration = burstDuration;
        break;
      case "rotate":
        newManeuver.param = Number(maneuverParam); // Angle in degrees
        break;
      case "sas":
        newManeuver.param = maneuverParam as string; // SAS Mode
        newManeuver.parentBodyId = maneuverParentId; // Reference body for orientation
        break;
      case "auto_land":
      case "auto_transfer":
      case "auto_circularize":
      case "auto_intercept":
        newManeuver.targetBodyId = maneuverTargetId;
        newManeuver.parentBodyId = maneuverParentId;
        if (maneuverType === "auto_intercept") {
          newManeuver.param = Number(maneuverParam) || 30;
        }
        break;
      case "wait_for_transfer":
        newManeuver.targetBodyId = maneuverTargetId;
        newManeuver.parentBodyId = maneuverParentId;
        newManeuver.param = Number(maneuverParam) || 1.0; // Error margin in degrees
        break;
      case "wait_for_altitude":
        newManeuver.param = `${Number(maneuverParam)}:${altitudeDirection}`; // Altitude:direction
        newManeuver.parentBodyId = maneuverParentId; // Reference body
        break;
      case "burn_until_altitude":
        newManeuver.param = Number(maneuverParam); // Target altitude in km
        newManeuver.parentBodyId = maneuverParentId; // Reference body
        newManeuver.thrust = thrustPower; // Thrust power
        newManeuver.angleOffset = (burstAngle * Math.PI) / 180; // Angle in radians
        break;
      case "change_simulation_speed":
        newManeuver.param = Number(maneuverParam) || 1.0;
        break;
      case "manual_node":
        newManeuver.timeFromNow = nodeTime;
        newManeuver.deltaVPrograde = dvPrograde;
        newManeuver.deltaVRadial = dvRadial;
        if (maneuverParentId) newManeuver.parentBodyId = maneuverParentId;
        break;
    }

    const updatedManeuvers = selectedRocket.maneuvers
      ? [...selectedRocket.maneuvers, newManeuver]
      : [newManeuver];
    onUpdateRocket(selectedRocket.id, { maneuvers: updatedManeuvers });

    if (maneuverType === "manual_node") {
      setEditingManeuverId(newManeuver.id);
    }

    showNotification(`${maneuverType.toUpperCase()} Maneuver added`);
  };

  const handleUpdateManeuver = (mId: string, updates: Partial<Maneuver>) => {
    if (!selectedRocket || !selectedRocket.maneuvers) return;
    const updated = selectedRocket.maneuvers.map((m) => {
      if (m.id === mId) {
        return { ...m, ...updates };
      }
      return m;
    });
    onUpdateRocket(selectedRocket.id, { maneuvers: updated });
  };

  const handleRemoveManeuver = (mId: string) => {
    if (!selectedRocket || !selectedRocket.maneuvers) return;
    const updated = selectedRocket.maneuvers.filter((m) => m.id !== mId);
    onUpdateRocket(selectedRocket.id, { maneuvers: updated });
  };

  const handleLaunchPending = () => {
    if (!selectedRocket || !selectedRocket.maneuvers) return;
    const updated = selectedRocket.maneuvers.map((m) => {
      if (m.status === "pending") return { ...m, status: "active" as const };
      return m;
    });
    onUpdateRocket(selectedRocket.id, { maneuvers: updated });
    showNotification("Executing Plan...");
  };

  const recordGapAndAction = (
    type:
      | "burn"
      | "rotate"
      | "sas"
      | "auto_circularize"
      | "auto_land"
      | "auto_transfer"
      | "change_simulation_speed"
      | "stage",
    param: number | string | undefined,
    thrust: number = 0,
    duration: number = 0,
    angleOffset: number = 0,
    targetId?: string,
    parentId?: string,
  ) => {
    if (!isRecording) return;
    const now = getSimulationTime();

    if (lastActionTimeRef.current !== null) {
      const coastSimDuration = now - lastActionTimeRef.current;
      if (coastSimDuration > 0.0001) {
        setRecordedManeuvers((prev) => [
          ...prev,
          {
            id: `rec_coast_${Date.now()}`,
            type: "wait",
            thrust: 0,
            duration: coastSimDuration,
            angleOffset: 0,
            progress: 0,
            status: "pending",
          },
        ]);
      }
    }
    setRecordedManeuvers((prev) => [
      ...prev,
      {
        id: `rec_act_${Date.now()}_${Math.random()}`,
        type: type,
        param: param,
        thrust: thrust,
        duration: duration,
        angleOffset: angleOffset,
        targetBodyId: targetId,
        parentBodyId: parentId,
        progress: 0,
        status: "pending",
      },
    ]);
    lastActionTimeRef.current = now;
  };

  const handleRotate = (deltaDeg: number) => {
    if (!selectedRocket) return;
    onUpdateRocket(selectedRocket.id, {
      angle: (selectedRocket.angle || 0) + (deltaDeg * Math.PI) / 180,
      sasMode: "off",
    });
    recordGapAndAction("sas", "off");
    recordGapAndAction("rotate", deltaDeg);
  };

  const handleManualThrustStart = () => {
    if (!selectedRocket) return;
    setManualThrusting(true);
    const angle = selectedRocket.angle || 0;
    onUpdateRocket(selectedRocket.id, {
      thrust: {
        x: Math.cos(angle) * manualThrustPower,
        y: Math.sin(angle) * manualThrustPower,
      },
    });

    if (isRecording) {
      const now = getSimulationTime();
      burnStartTimeRef.current = now;
      if (lastActionTimeRef.current !== null) {
        const coastSimDuration = now - lastActionTimeRef.current;
        if (coastSimDuration > 0.0001) {
          setRecordedManeuvers((prev) => [
            ...prev,
            {
              id: `rec_coast_${Date.now()}`,
              type: "wait",
              thrust: 0,
              duration: coastSimDuration,
              angleOffset: 0,
              progress: 0,
              status: "pending",
            },
          ]);
        }
      }
    }
  };

  const handleManualThrustEnd = () => {
    if (!selectedRocket) return;
    setManualThrusting(false);
    onUpdateRocket(selectedRocket.id, { thrust: { x: 0, y: 0 } });

    if (isRecording && burnStartTimeRef.current !== null) {
      const now = getSimulationTime();
      const burnSimDuration = now - burnStartTimeRef.current;
      if (burnSimDuration > 0.0001) {
        setRecordedManeuvers((prev) => [
          ...prev,
          {
            id: `rec_burn_${Date.now()}`,
            type: "burn",
            thrust: manualThrustPower,
            duration: burnSimDuration,
            angleOffset: 0,
            progress: 0,
            status: "pending",
          },
        ]);
      }
      lastActionTimeRef.current = now;
      burnStartTimeRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      lastActionTimeRef.current = null;
      burnStartTimeRef.current = null;
    } else {
      const now = getSimulationTime();
      setIsRecording(true);
      setRecordedManeuvers([]);
      setRecordingStartTime(now);
      lastActionTimeRef.current = now;
    }
  };

  const loadRecordedToFlightPlan = () => {
    if (!selectedRocket || recordedManeuvers.length === 0) return;
    const now = getSimulationTime();
    let planToLoad = [...recordedManeuvers];
    if (recordingStartTime !== null && now < recordingStartTime) {
      const waitTime = recordingStartTime - now;
      planToLoad = [
        {
          id: `sync_wait_${Date.now()}`,
          type: "wait",
          thrust: 0,
          duration: waitTime,
          angleOffset: 0,
          progress: 0,
          status: "pending",
        },
        ...planToLoad,
      ];
      showNotification(`Synced: Waiting ${waitTime.toFixed(1)}s`);
    }
    const existing = selectedRocket.maneuvers || [];
    const newPlan = planToLoad.map((m) => ({
      ...m,
      id: `plan_${Math.random()}`,
      status: "pending" as const,
    }));
    onUpdateRocket(selectedRocket.id, { maneuvers: [...existing, ...newPlan] });
    showNotification("Recording Loaded to Flight Plan");
  };

  const handleExportFlightPlan = () => {
    if (recordedManeuvers.length === 0) return;
    const exportData = {
      startTime: recordingStartTime,
      maneuvers: recordedManeuvers,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flight-plan-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Flight plan exported");
  };

  const handleImportFlightPlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const maneuvers = Array.isArray(json) ? json : json.maneuvers;
        if (maneuvers) {
          setRecordedManeuvers(
            maneuvers.map((m: any) => ({
              ...m,
              id: `imported_${Date.now()}_${Math.random()}`,
              status: "pending",
            })),
          );
          setRecordingStartTime(json.startTime || null);
          showNotification("Flight plan imported");
        }
      } catch (err) {
        console.error(err);
        showNotification("Import failed");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const setSAS = (mode: SASMode) => {
    if (!selectedRocket) return;
    onUpdateRocket(selectedRocket.id, { sasMode: mode });
    recordGapAndAction("sas", mode);
  };

  const triggerAutoManeuver = (
    type: any,
    targetId: string,
    parentId?: string,
  ) => {
    if (!selectedRocket) return;
    const newManeuver: Maneuver = {
      id: `m_auto_${Date.now()}`,
      type: type,
      targetBodyId: targetId,
      parentBodyId: parentId,
      thrust: 0,
      duration: 0,
      angleOffset: 0,
      progress: 0,
      status: "active",
    };
    const existing =
      selectedRocket.maneuvers?.filter((m) => !m.id.startsWith("m_auto_")) ||
      [];
    onUpdateRocket(selectedRocket.id, {
      maneuvers: [...existing, newManeuver],
    });
    recordGapAndAction(type, undefined, 0, 0, 0, targetId, parentId);
  };

  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(true);

  // Refs for keyboard controls to avoid dependency cycles/re-renders
  const selectedRocketRef = useRef(selectedRocket);
  const manualThrustPowerRef = useRef(manualThrustPower);
  const manualThrustingRef = useRef(manualThrusting);
  const circularizeBodyIdRef = useRef(circularizeBodyId);
  const landBodyIdRef = useRef(landBodyId);
  const transferTargetBodyIdRef = useRef(transferTargetBodyId);
  const transferParentBodyIdRef = useRef(transferParentBodyId);

  // Handlers ref to ensure we call the latest version of functions (which close over fresh state)
  const handlersRef = useRef({
    handleManualThrustStart,
    handleManualThrustEnd,
    handleRotate,
    setSAS,
    triggerAutoManeuver,
    onSpeedChange,
    setManualThrustPower,
  });

  useEffect(() => {
    selectedRocketRef.current = selectedRocket;
  }, [selectedRocket]);
  useEffect(() => {
    manualThrustPowerRef.current = manualThrustPower;
  }, [manualThrustPower]);
  useEffect(() => {
    manualThrustingRef.current = manualThrusting;
  }, [manualThrusting]);
  useEffect(() => {
    circularizeBodyIdRef.current = circularizeBodyId;
  }, [circularizeBodyId]);
  useEffect(() => {
    landBodyIdRef.current = landBodyId;
  }, [landBodyId]);
  useEffect(() => {
    transferTargetBodyIdRef.current = transferTargetBodyId;
  }, [transferTargetBodyId]);
  useEffect(() => {
    transferParentBodyIdRef.current = transferParentBodyId;
  }, [transferParentBodyId]);

  useEffect(() => {
    handlersRef.current = {
      handleManualThrustStart,
      handleManualThrustEnd,
      handleRotate,
      setSAS,
      triggerAutoManeuver,
      onSpeedChange,
      setManualThrustPower,
    };
  }); // Update on every render

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      if (!selectedRocketRef.current) return;

      const handlers = handlersRef.current;

      switch (e.key) {
        case " ": // Space - Ignition
          e.preventDefault();
          if (!manualThrustingRef.current) {
            handlers.handleManualThrustStart();
          }
          break;
        case "ArrowLeft": // Rotate Left
          e.preventDefault();
          handlers.handleRotate(-5);
          break;
        case "ArrowRight": // Rotate Right
          e.preventDefault();
          handlers.handleRotate(5);
          break;
        case "ArrowUp": // Increase Force
          e.preventDefault();
          handlers.setManualThrustPower((p) => Math.min(p + 0.0001, 0.05));
          break;
        case "ArrowDown": // Decrease Force
          e.preventDefault();
          handlers.setManualThrustPower((p) => Math.max(p - 0.0001, 0.0001));
          break;
        case "Shift": // Circularize
          e.preventDefault();
          if (circularizeBodyIdRef.current) {
            handlers.triggerAutoManeuver(
              "auto_circularize",
              circularizeBodyIdRef.current,
            );
          }
          break;
        case "Backspace": // Auto Land
          e.preventDefault();
          if (landBodyIdRef.current) {
            handlers.triggerAutoManeuver("auto_land", landBodyIdRef.current);
          }
          break;
        case "Enter": // Transfer
          e.preventDefault();
          if (
            transferTargetBodyIdRef.current &&
            transferParentBodyIdRef.current
          ) {
            handlers.triggerAutoManeuver(
              "auto_transfer",
              transferTargetBodyIdRef.current,
              transferParentBodyIdRef.current,
            );
          }
          break;
        case ";": // Prograde
          handlers.setSAS("prograde");
          break;
        case ":": // Retrograde
          handlers.setSAS("retrograde");
          break;
        case "=": // Radial Out
          handlers.setSAS("radial_out");
          break;
        case ",": // Radial Out
          handlers.setSAS("off");
          break;
        case "j": // 0.1x
          handlers.onSpeedChange(0.1);
          break;
        case "k": // 1x
          handlers.onSpeedChange(1);
          break;
        case "l": // 10x
          handlers.onSpeedChange(10);
          break;
        case "m": // 100x
          handlers.onSpeedChange(100);
          break;
        case "ù": // 1000x
          handlers.onSpeedChange(1000);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;

      if (e.key === " ") {
        e.preventDefault();
        handlersRef.current.handleManualThrustEnd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []); // Empty dependency array to attach once

  // Helper function to format time
  const formatTime = (totalSeconds: number): string => {
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

  // THROTTLED TELEMETRY CALCULATION
  // We use a Ref to access the latest state inside the interval without re-triggering the effect
  const stateRef = useRef({
    selectedRocket,
    bodies,
    physicsConfig,
    parentBodyId,
    targetBodyId,
    predictionPaths,
    predictionSteps,
    predictSystem,
  });

  useEffect(() => {
    stateRef.current = {
      selectedRocket,
      bodies,
      physicsConfig,
      parentBodyId,
      targetBodyId,
      predictionPaths,
      predictionSteps,
      predictSystem,
    };
  });

  const [telemetry, setTelemetry] = useState<any>(null);

  useEffect(() => {
    const calculateTelemetry = () => {
      const {
        selectedRocket,
        bodies,
        physicsConfig,
        parentBodyId,
        targetBodyId,
        predictionPaths,
        predictionSteps,
        predictSystem,
      } = stateRef.current;

      if (!selectedRocket) return null;

      const speed = Math.sqrt(
        selectedRocket.velocity.x ** 2 + selectedRocket.velocity.y ** 2,
      );
      const heading = ((selectedRocket.angle || 0) * 180) / Math.PI;

      let altitude = 0;
      let fuelPercent = 0;
      let apoapsis = -1;
      let periapsis = -1;
      let period = 0;

      if (selectedRocket.fuel && selectedRocket.maxFuel) {
        fuelPercent = (selectedRocket.fuel / selectedRocket.maxFuel) * 100;
      }

      // Orbital parameters
      if (parentBodyId) {
        const parent = bodies.find((b) => b.id === parentBodyId);
        if (parent) {
          const dx = selectedRocket.position.x - parent.position.x;
          const dy = selectedRocket.position.y - parent.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          altitude = dist - parent.radius;

          const dvx = selectedRocket.velocity.x - parent.velocity.x;
          const dvy = selectedRocket.velocity.y - parent.velocity.y;
          const vSq = dvx * dvx + dvy * dvy;

          const mu = physicsConfig.gravitationalConstant * parent.mass;
          const E = vSq / 2 - mu / dist;

          if (E < 0) {
            const a = -mu / (2 * E);
            const h = dx * dvy - dy * dvx;
            const eccentricity = Math.sqrt(1 + (2 * E * h * h) / (mu * mu));
            periapsis = a * (1 - eccentricity) - parent.radius;
            apoapsis = a * (1 + eccentricity) - parent.radius;
            period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
          }
        }
      }

      // Target data
      let targetDist = 0;
      let targetName = "";
      let targetDeltaV = 0;
      if (targetBodyId) {
        const target = bodies.find((b) => b.id === targetBodyId);
        if (target) {
          targetName = target.name;
          const dx = target.position.x - selectedRocket.position.x;
          const dy = target.position.y - selectedRocket.position.y;
          targetDist = Math.sqrt(dx * dx + dy * dy);

          const dvx = selectedRocket.velocity.x - target.velocity.x;
          const dvy = selectedRocket.velocity.y - target.velocity.y;
          targetDeltaV = Math.sqrt(dvx * dvx + dvy * dvy);
        }
      }

      // Transfer phase angle
      let phaseAngle = 0;
      let phaseRequired = 0;
      let phaseError = 0;
      let phaseReady = false;

      if (parentBodyId && targetBodyId) {
        const parent = bodies.find((b) => b.id === parentBodyId);
        const target = bodies.find((b) => b.id === targetBodyId);

        if (parent && target) {
          const rocketToPlanet = Math.atan2(
            selectedRocket.position.y - parent.position.y,
            selectedRocket.position.x - parent.position.x,
          );
          const targetToPlanet = Math.atan2(
            target.position.y - parent.position.y,
            target.position.x - parent.position.x,
          );

          let currentPhase =
            ((targetToPlanet - rocketToPlanet) * 180) / Math.PI;
          while (currentPhase > 180) currentPhase -= 360;
          while (currentPhase < -180) currentPhase += 360;
          phaseAngle = currentPhase;

          const r1 = Math.sqrt(
            Math.pow(selectedRocket.position.x - parent.position.x, 2) +
              Math.pow(selectedRocket.position.y - parent.position.y, 2),
          );
          const r2 = Math.sqrt(
            Math.pow(target.position.x - parent.position.x, 2) +
              Math.pow(target.position.y - parent.position.y, 2),
          );

          const period_target =
            2 *
            Math.PI *
            Math.sqrt(
              Math.pow(r2, 3) /
                (physicsConfig.gravitationalConstant * parent.mass),
            );
          const a_transfer = (r1 + r2) / 2;
          const period_transfer =
            2 *
            Math.PI *
            Math.sqrt(
              Math.pow(a_transfer, 3) /
                (physicsConfig.gravitationalConstant * parent.mass),
            );

          const travelTime = period_transfer / 2;
          const targetMotion = (360 / period_target) * travelTime;
          const requiredPhase = 180 - targetMotion;

          let normalizedRequired = requiredPhase;
          while (normalizedRequired > 180) normalizedRequired -= 360;
          while (normalizedRequired < -180) normalizedRequired += 360;
          phaseRequired = normalizedRequired;

          let error = Math.abs(currentPhase - normalizedRequired);
          // Handle wrap around error
          if (error > 180) error = 360 - error;

          phaseError = error;
          phaseReady = error < 5;
        }
      }

      // Prediction Analysis
      let timeToPe = -1;
      let timeToAp = -1;
      let closestApproach = -1;

      if (predictionPaths && predictionSteps && targetBodyId) {
        const rocketPath = predictionPaths.find(
          (p) => p.id === selectedRocket.id,
        );
        const targetPath = predictSystem
          ? predictionPaths.find((p) => p.id === targetBodyId)
          : null;
        const targetBody = bodies.find((b) => b.id === targetBodyId);

        if (rocketPath && rocketPath.points.length) {
          // Optimized Iteration: Sample every Nth point to speed up this loop on UI thread
          // Or just rely on the 100ms throttle.
          // Let's rely on Throttle first.

          let minDist = Infinity;
          rocketPath.points.forEach((p, idx) => {
            const targetPos =
              targetPath && targetPath.points[idx]
                ? targetPath.points[idx]
                : targetBody?.position || { x: 0, y: 0 };
            const d = Math.sqrt(
              Math.pow(p.x - targetPos.x, 2) + Math.pow(p.y - targetPos.y, 2),
            );
            if (d < minDist) minDist = d;
          });
          closestApproach = minDist;
        }
      }

      setTelemetry({
        speed,
        heading,
        altitude,
        fuelPercent,
        apoapsis,
        periapsis,
        period,
        targetDist,
        targetName,
        targetDeltaV,
        phaseAngle,
        phaseRequired,
        phaseError,
        phaseReady,
        timeToPe,
        timeToAp,
        closestApproach,
        fuel: selectedRocket.fuel || 0,
        landed: selectedRocket.landedOnBodyId,
      });
    };

    calculateTelemetry(); // Run immediately on mount
    const interval = setInterval(calculateTelemetry, 100); // And then every 100ms (10Hz)
    return () => clearInterval(interval);
  }, []); // Empty dependency array = Runs once, interval persists

  // Rendezvous Calculator - finds intercept point based on predictions
  const rendezvousData = useMemo(() => {
    if (
      !selectedRocket ||
      !rendezvousTargetId ||
      !predictionPaths ||
      !predictionSteps
    ) {
      return null;
    }

    const rocketPath = predictionPaths.find((p) => p.id === selectedRocket.id);
    const targetPath = predictSystem
      ? predictionPaths.find((p) => p.id === rendezvousTargetId)
      : null;
    const targetBody = bodies.find((b) => b.id === rendezvousTargetId);

    if (!rocketPath || rocketPath.points.length === 0) return null;

    const totalDuration = predictionSteps * physicsConfig.timeStep;
    const dtPerPoint = totalDuration / rocketPath.points.length;

    // Find first point where distance is less than threshold
    for (let i = 0; i < rocketPath.points.length; i++) {
      const rocketPos = rocketPath.points[i];
      const targetPos =
        targetPath && targetPath.points[i]
          ? targetPath.points[i]
          : targetBody?.position || { x: 0, y: 0 };

      const dx = rocketPos.x - targetPos.x;
      const dy = rocketPos.y - targetPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= rendezvousDistance) {
        return {
          timeToRendezvous: i * dtPerPoint,
          meetingPoint: rocketPos,
          distance: distance,
          targetName: targetBody?.name || "Unknown",
        };
      }
    }

    return null; // No rendezvous found within prediction window
  }, [
    selectedRocket,
    rendezvousTargetId,
    rendezvousDistance,
    predictionPaths,
    predictionSteps,
    physicsConfig,
    predictSystem,
    bodies,
  ]);

  // Notify parent component about rendezvous point changes
  useEffect(() => {
    if (onRendezvousPointChange) {
      onRendezvousPointChange(rendezvousData?.meetingPoint || null);
    }
  }, [rendezvousData, onRendezvousPointChange]);

  const missionTabProps: MissionTabProps = {
    isRecording,
    toggleRecording,
    handleLaunchPending,
    selectedRocket,
    recordedManeuvers,
    handleExportFlightPlan,
    handleImportFlightPlan,
    loadRecordedToFlightPlan,
    maneuverType,
    setManeuverType,
    thrustPower,
    setThrustPower,
    burstDuration,
    setBurstDuration,
    burstAngle,
    setBurstAngle,
    maneuverParam,
    setManeuverParam,
    maneuverTargetId,
    setManeuverTargetId,
    maneuverParentId,
    setManeuverParentId,
    altitudeDirection,
    setAltitudeDirection,
    nodeTime,
    setNodeTime,
    dvPrograde,
    setDvPrograde,
    dvRadial,
    setDvRadial,
    handleAddManeuver,
    handleRemoveManeuver,
    editingManeuverId,
    setEditingManeuverId,
    bodies,
    physicsConfig,
  };

  // Mobile UI - Transparent Overlay Design
  if (isMobile) {
    return (
      <div className="fixed inset-0 pointer-events-none z-30">
        {/* Notification */}
        {notification && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-2xl animate-bounce pointer-events-auto z-50">
            {notification}
          </div>
        )}

        {/* TOP-CENTER: Complete Telemetry Display */}
        {selectedRocket && !isSpawning && telemetry && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 pointer-events-auto z-40 max-w-[90vw]">
            <div className="bg-slate-900/10 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg overflow-hidden">
              {/* Compact Header - Always Visible */}
              <div
                className="px-3 py-1.5 flex items-center gap-3"
                onClick={() => setShowTelemetry(!showTelemetry)}
              >
                <div
                  className={`p-1 rounded ${telemetry.landed ? "bg-green-900/50 text-green-400" : "bg-blue-900/50 text-blue-400"}`}
                >
                  <Rocket size={12} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-white leading-none">
                    {selectedRocket.name}
                  </div>
                  <div className="text-[8px] text-slate-400">
                    {telemetry.speed.toFixed(1)} u/s
                  </div>
                </div>
                {/* Fuel indicator */}
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${telemetry.fuelPercent < 20 ? "bg-red-500" : "bg-orange-500"}`}
                    style={{ width: `${telemetry.fuelPercent}%` }}
                  />
                </div>
                <ChevronDown
                  size={12}
                  className={`text-slate-400 transition-transform ${showTelemetry ? "rotate-180" : ""}`}
                />
              </div>

              {/* Expanded Complete Telemetry */}
              {showTelemetry && (
                <div className="px-3 py-2 border-t border-slate-700/50 space-y-2">
                  {/* Active Maneuver Indicator */}
                  {selectedRocket.maneuvers &&
                    selectedRocket.maneuvers.some(
                      (m) => m.status === "active",
                    ) && (
                      <div className="bg-green-900/30 border border-green-500/30 p-1.5 rounded text-center mb-2 animate-pulse">
                        <div className="text-[9px] text-green-400 font-bold uppercase">
                          Maneuver Executing...
                        </div>
                      </div>
                    )}

                  {/* Basic Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[8px] text-slate-500">HDG</div>
                      <div className="text-[10px] text-white font-mono">
                        {telemetry.heading.toFixed(0)}°
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] text-slate-500">ALT</div>
                      <div className="text-[10px] text-cyan-300 font-mono">
                        {telemetry.altitude.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] text-slate-500">FUEL</div>
                      <div className="text-[10px] text-orange-300 font-mono">
                        {telemetry.fuelPercent.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Orbital Parameters */}
                  {telemetry.apoapsis >= 0 && (
                    <div className="border-t border-slate-700/30 pt-2">
                      <div className="text-[8px] text-slate-500 uppercase mb-1">
                        Orbital Parameters
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[8px] text-slate-500">Ap</div>
                          <div className="text-[10px] text-blue-300 font-mono">
                            {telemetry.apoapsis.toFixed(0)}
                          </div>
                          {telemetry.timeToAp >= 0 && (
                            <div className="text-[8px] text-slate-400">
                              T-{telemetry.timeToAp.toFixed(0)}s
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-500">Pe</div>
                          <div className="text-[10px] text-blue-300 font-mono">
                            {telemetry.periapsis.toFixed(0)}
                          </div>
                          {telemetry.timeToPe >= 0 && (
                            <div className="text-[8px] text-slate-400">
                              T-{telemetry.timeToPe.toFixed(0)}s
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-500">
                            Period
                          </div>
                          <div className="text-[10px] text-blue-300 font-mono">
                            {formatTime(telemetry.period)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Info */}
                  {telemetry.targetName && (
                    <div className="border-t border-slate-700/30 pt-2">
                      <div className="text-[8px] text-emerald-400 uppercase mb-1">
                        → Target: {telemetry.targetName}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                          <div className="text-[8px] text-slate-500">
                            Distance
                          </div>
                          <div className="text-[10px] text-white font-mono">
                            {telemetry.targetDist.toFixed(1)} u
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-500">
                            Rel ΔV
                          </div>
                          <div className="text-[10px] text-emerald-300 font-mono">
                            {telemetry.targetDeltaV.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      {telemetry.closestApproach >= 0 && (
                        <div className="mt-1 bg-slate-800/50 p-1 rounded flex justify-between items-center">
                          <div className="text-[8px] text-slate-400 uppercase">
                            Closest Approach
                          </div>
                          <div className="text-[9px] font-bold text-indigo-300">
                            {telemetry.closestApproach.toFixed(1)} u
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transfer Phase */}
                  {parentBodyId && targetBodyId && (
                    <div className="border-t border-slate-700/30 pt-2">
                      <div className="text-[8px] text-slate-500 uppercase mb-1 flex items-center justify-between">
                        <span>Transfer Phase</span>
                        {telemetry.phaseReady ? (
                          <span className="text-[8px] bg-green-500 text-black px-1 rounded font-bold animate-pulse">
                            WINDOW OPEN
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-600">
                            Wait...
                          </span>
                        )}
                      </div>

                      {/* Phase Progress Bar */}
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden relative mb-1">
                        <div
                          className={`absolute top-0 bottom-0 w-1/5 left-1/2 -translate-x-1/2 ${telemetry.phaseReady ? "bg-green-500/20" : "bg-slate-700"}`}
                        />
                        <div
                          className={`absolute top-0 bottom-0 w-1 ${telemetry.phaseReady ? "bg-green-500" : "bg-orange-500"}`}
                          style={{
                            left: `${Math.min(100, Math.max(0, 50 + (telemetry.phaseAngle - telemetry.phaseRequired)))}%`,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[8px] text-slate-500">
                            Current
                          </div>
                          <div className="text-[10px] text-white font-mono">
                            {telemetry.phaseAngle.toFixed(1)}°
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-500">
                            Required
                          </div>
                          <div className="text-[10px] text-purple-300 font-mono">
                            {telemetry.phaseRequired.toFixed(1)}°
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-500">Error</div>
                          <div
                            className={`text-[10px] font-mono ${telemetry.phaseReady ? "text-green-400" : "text-red-400"}`}
                          >
                            {telemetry.phaseError.toFixed(1)}°
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {maneuverType === "manual_node" && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">
                      Time to Burn (s)
                    </label>
                    <input
                      type="number"
                      value={nodeTime}
                      onChange={(e) => setNodeTime(parseFloat(e.target.value))}
                      step="10"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">
                        Prograde (m/s)
                      </label>
                      <input
                        type="number"
                        value={dvPrograde}
                        onChange={(e) =>
                          setDvPrograde(parseFloat(e.target.value))
                        }
                        step="1.0"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">
                        Radial Out (m/s)
                      </label>
                      <input
                        type="number"
                        value={dvRadial}
                        onChange={(e) =>
                          setDvRadial(parseFloat(e.target.value))
                        }
                        step="1.0"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOP-LEFT: Close & Spawn */}
        <div className="fixed top-24 left-2 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 shadow-lg"
          >
            <X size={18} />
          </button>
          <button
            onClick={onSpawnToggle}
            className={`w-10 h-10 rounded-full backdrop-blur-sm border flex items-center justify-center shadow-lg ${isSpawning ? "bg-orange-600 border-orange-500 text-white" : "bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white"}`}
          >
            <Crosshair size={18} />
          </button>

          <button
            onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
            className={`w-10 h-10 rounded-full backdrop-blur-sm border flex items-center justify-center shadow-lg ${isSpawning ? "bg-orange-600 border-orange-500 text-white" : "bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white"}`}
          >
            <Sliders size={18} />
          </button>
        </div>

        {/* TOP-RIGHT: SAS Modes */}
        {selectedRocket && !isSpawning && (
          <div className="fixed top-24 right-2 pointer-events-auto">
            <div className="bg-slate-900/10 backdrop-blur-sm border border-slate-700 rounded-xl p-2 shadow-lg">
              <div className="text-[8px] text-slate-500 uppercase font-bold mb-1 text-center">
                SAS
              </div>
              <select
                value={sasReferenceBodyId}
                onChange={(e) => {
                  setSasReferenceBodyId(e.target.value);
                  if (e.target.value && selectedRocket) {
                    onUpdateRocket(selectedRocket.id, {
                      orbitReferenceId: e.target.value,
                    });
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[9px] text-slate-200 mb-1"
              >
                <option value="">Ref (Auto)...</option>
                {bodies
                  .filter((b) => !b.isRocket && b.id !== selectedRocket?.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name.substring(0, 8)}
                    </option>
                  ))}
              </select>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setSAS("off")}
                  className={`w-9 h-9 rounded-lg text-[9px] font-bold flex items-center justify-center ${!selectedRocket.sasMode || selectedRocket.sasMode === "off" ? "bg-slate-600 text-white" : "bg-slate-800/50 text-slate-500"}`}
                >
                  OFF
                </button>
                <button
                  onClick={() => setSAS("prograde")}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedRocket.sasMode === "prograde" ? "bg-emerald-600 text-white" : "bg-slate-800/50 text-emerald-500"}`}
                >
                  <CircleDot size={16} />
                </button>
                <button
                  onClick={() => setSAS("retrograde")}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedRocket.sasMode === "retrograde" ? "bg-red-600 text-white" : "bg-slate-800/50 text-red-500"}`}
                >
                  <X size={16} />
                </button>
                <button
                  onClick={() => setSAS("radial_out")}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedRocket.sasMode === "radial_out" ? "bg-blue-600 text-white" : "bg-slate-800/50 text-blue-500"}`}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM-LEFT: Manual Thrust Controls */}
        {selectedRocket && !isSpawning && (
          <div className="fixed bottom-24 left-2 pointer-events-auto">
            <div className="bg-slate-900/10 backdrop-blur-sm border border-slate-700 rounded-xl p-2 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => handleRotate(-15)}
                  className="w-10 h-10 rounded-lg bg-slate-800/80 hover:bg-indigo-600 flex items-center justify-center text-white active:scale-95"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onMouseDown={handleManualThrustStart}
                  onMouseUp={handleManualThrustEnd}
                  onMouseLeave={() => {
                    if (manualThrusting) handleManualThrustEnd();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleManualThrustStart();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleManualThrustEnd();
                  }}
                  onTouchCancel={(e) => {
                    e.preventDefault();
                    handleManualThrustEnd();
                  }}
                  className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${manualThrusting ? "bg-orange-500 scale-95" : "bg-orange-600 hover:bg-orange-500"}`}
                >
                  <ArrowUp size={24} className="text-white" />
                </button>
                <button
                  onClick={() => handleRotate(15)}
                  className="w-10 h-10 rounded-lg bg-slate-800/80 hover:bg-indigo-600 flex items-center justify-center text-white active:scale-95"
                >
                  <RotateCw size={18} />
                </button>
              </div>
              <input
                type="range"
                min="0.0001"
                max="0.05"
                step="0.001"
                value={manualThrustPower}
                onChange={(e) => setManualThrustPower(Number(e.target.value))}
                className="w-full accent-orange-600 h-1"
              />
              <div className="text-[8px] text-orange-400 font-mono text-center mt-1">
                {manualThrustPower.toFixed(5)}N
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM-RIGHT: Auto Maneuvers */}
        {selectedRocket && !isSpawning && (
          <div className="fixed bottom-24 right-2 pointer-events-auto">
            <div className="bg-slate-900/10 backdrop-blur-sm border border-slate-700 rounded-xl p-2 shadow-lg space-y-1">
              {/* Circularize */}
              <div className="flex gap-1">
                <select
                  value={circularizeBodyId}
                  onChange={(e) => setCircularizeBodyId(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[9px] text-slate-200"
                >
                  <option value="">Body...</option>
                  {bodies
                    .filter((b) => !b.isRocket && b.id !== selectedRocket?.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name.substring(0, 6)}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() =>
                    triggerAutoManeuver("auto_circularize", circularizeBodyId)
                  }
                  disabled={!circularizeBodyId}
                  className="w-10 h-10 rounded-lg bg-slate-800/80 hover:bg-indigo-600 disabled:opacity-30 flex items-center justify-center text-white active:scale-95"
                  title="Circularize"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              {/* Land */}
              <div className="flex gap-1">
                <select
                  value={landBodyId}
                  onChange={(e) => setLandBodyId(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[9px] text-slate-200"
                >
                  <option value="">Body...</option>
                  {bodies
                    .filter((b) => !b.isRocket && b.id !== selectedRocket?.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name.substring(0, 6)}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => triggerAutoManeuver("auto_land", landBodyId)}
                  disabled={!landBodyId}
                  className="w-10 h-10 rounded-lg bg-slate-800/80 hover:bg-red-600 disabled:opacity-30 flex items-center justify-center text-white active:scale-95"
                  title="Land/Stop"
                >
                  <ArrowDownToLine size={16} />
                </button>
              </div>
              {/* Transfer */}
              <div className="space-y-1">
                <div className="flex gap-1">
                  <select
                    value={transferTargetBodyId}
                    onChange={(e) => setTransferTargetBodyId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[9px] text-slate-200"
                  >
                    <option value="">Tgt...</option>
                    {bodies
                      .filter((b) => !b.isRocket && b.id !== selectedRocket?.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name.substring(0, 4)}
                        </option>
                      ))}
                  </select>
                  <select
                    value={transferParentBodyId}
                    onChange={(e) => setTransferParentBodyId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[9px] text-slate-200"
                  >
                    <option value="">Par...</option>
                    {bodies
                      .filter((b) => !b.isRocket && b.id !== selectedRocket?.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name.substring(0, 4)}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  onClick={() =>
                    triggerAutoManeuver(
                      "auto_transfer",
                      transferTargetBodyId,
                      transferParentBodyId,
                    )
                  }
                  disabled={!transferTargetBodyId || !transferParentBodyId}
                  className="w-full h-10 rounded-lg bg-slate-800/80 hover:bg-emerald-600 disabled:opacity-30 flex items-center justify-center text-white active:scale-95"
                  title="Transfer"
                >
                  <TrendingUp size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Menu Overlay */}
        {showAdvancedMenu && selectedRocket && (
          <div className="fixed inset-0 bg-black/10  pointer-events-auto z-[70] flex items-end">
            <div className="w-full bg-slate-900/10 backdrop-blur-sm border-t border-slate-700 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Rocket size={18} className="text-orange-400" />
                  Advanced Controls
                </h3>
                <button
                  onClick={() => setShowAdvancedMenu(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Tabs */}
              <div className="flex bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab("flight")}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${activeTab === "flight" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  <Settings size={14} /> GENERAL
                </button>
                <button
                  onClick={() => setActiveTab("mission")}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${activeTab === "mission" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  <Radio size={14} /> MISSION
                </button>
                <button
                  onClick={() => setActiveTab("config")}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${activeTab === "config" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  <Sliders size={14} /> SYSTEM
                </button>
              </div>

              {/* --- GENERAL TAB (Ref/Target/Camera) --- */}
              {activeTab === "flight" && (
                <div className="space-y-4">
                  {/* Reference & Target Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">
                      Navigation Targets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {onParentChange && (
                        <select
                          value={parentBodyId || ""}
                          onChange={(e) => handleParentChange(e.target.value)}
                          className="bg-slate-800 text-xs text-white p-3 rounded-lg border border-slate-700 w-full"
                        >
                          <option value="">Ref: Auto</option>
                          {bodies
                            .filter((b) => b.id !== selectedRocket.id)
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                Ref: {b.name}
                              </option>
                            ))}
                        </select>
                      )}
                      <select
                        value={targetBodyId}
                        onChange={(e) => onTargetChange(e.target.value)}
                        className="bg-slate-800 text-xs text-white p-3 rounded-lg border border-slate-700 w-full"
                      >
                        <option value="">Target: None</option>
                        {bodies
                          .filter(
                            (b) =>
                              b.id !== selectedRocket.id &&
                              b.id !== parentBodyId,
                          )
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              Target: {b.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Camera Controls */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">
                      Camera
                    </label>
                    <button
                      onClick={onToggleFollow}
                      className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${isFollowing ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
                    >
                      {isFollowing ? (
                        <Ban size={16} />
                      ) : (
                        <Crosshair size={16} />
                      )}{" "}
                      {isFollowing ? "Unlock Camera" : "Follow Rocket"}
                    </button>
                  </div>

                  {/* Rendezvous Calculator */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">
                      Rendezvous Calculator
                    </label>
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-3">
                      <select
                        value={rendezvousTargetId}
                        onChange={(e) => setRendezvousTargetId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200"
                      >
                        <option value="">Select Target...</option>
                        {bodies
                          .filter(
                            (b) => !b.isRocket && b.id !== selectedRocket.id,
                          )
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                      </select>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Max Distance (units)
                        </label>
                        <input
                          type="number"
                          value={rendezvousDistance}
                          onChange={(e) =>
                            setRendezvousDistance(parseFloat(e.target.value))
                          }
                          step="1"
                          min="1"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200"
                        />
                      </div>
                      {rendezvousData ? (
                        <div className="bg-green-900/20 border border-green-500/30 rounded p-2 space-y-1">
                          <div className="text-[10px] text-green-400 font-bold uppercase">
                            Rendezvous Found!
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Target:{" "}
                            <span className="text-white font-bold">
                              {rendezvousData.targetName}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Time:{" "}
                            <span className="text-cyan-400 font-mono">
                              {rendezvousData.timeToRendezvous.toFixed(1)}s
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Distance:{" "}
                            <span className="text-emerald-400 font-mono">
                              {rendezvousData.distance.toFixed(2)} units
                            </span>
                          </div>
                        </div>
                      ) : rendezvousTargetId ? (
                        <div className="bg-orange-900/20 border border-orange-500/30 rounded p-2">
                          <div className="text-[10px] text-orange-400">
                            No rendezvous within prediction window
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Manual Staging Control (Mobile) */}
                  {selectedRocket.shipStructure &&
                    selectedRocket.shipStructure.currentStageIndex <
                      selectedRocket.shipStructure.stages.length - 1 && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">
                          Staging
                        </label>
                        <button
                          onClick={() => onStage?.(selectedRocket.id)}
                          className="w-full py-3 bg-red-900/50 hover:bg-red-700 border border-red-500/30 rounded-lg text-xs font-bold text-red-200 uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <ArrowUp size={16} /> Separate Stage{" "}
                          {selectedRocket.shipStructure.currentStageIndex + 1}
                        </button>
                      </div>
                    )}
                </div>
              )}

              {/* --- MISSION TAB --- */}
              {activeTab === "mission" && (
                <MissionTabMobile {...missionTabProps} />
              )}

              {/* --- SYSTEM TAB --- */}
              {activeTab === "config" && (
                <div className="space-y-6">
                  {/* Time Dilation */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Clock size={12} /> Time Dilation
                    </h4>
                    <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                      {[0.1, 1, 10, 100, 1000].map((val) => (
                        <button
                          key={val}
                          onClick={() => onSpeedChange(val)}
                          className={`flex-1 py-2 rounded text-[10px] font-bold ${Math.abs(speed - val) < 0.01 ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-700"}`}
                        >
                          {val}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Physics Step */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs mb-1 text-slate-400">
                      <span>Physics Step</span>
                      <span className="text-indigo-300 font-mono">
                        {physicsConfig.timeStep.toFixed(3)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.001"
                      max="1.0"
                      step="0.001"
                      value={physicsConfig.timeStep}
                      onChange={(e) =>
                        onUpdatePhysicsConfig({
                          timeStep: Number(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-500 bg-slate-700 h-1 rounded-lg"
                    />
                  </div>

                  {/* Visualizations
                                    <div className="space-y-2 pt-4 border-t border-slate-700">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Eye size={12} /> Visualizations</h4>
                                        <button 
                                            onClick={onToggleTheoreticalOrbit}
                                            className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-between px-3 ${showTheoreticalOrbit ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                        >
                                            <span className="flex items-center gap-2"><Globe size={14} /> Theoretical Orbit</span>
                                            <span className="text-[10px]">{showTheoreticalOrbit ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button 
                                            onClick={onToggleTransferWindow}
                                            className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-between px-3 ${showTransferWindow ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                        >
                                            <span className="flex items-center gap-2"><TrendingUp size={14} /> Transfer Window</span>
                                            <span className="text-[10px]">{showTransferWindow ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div> */}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spawn Mode UI */}
        {isSpawning && (
          <div className="fixed bottom-24 left-4 right-4 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl">
              <div className="text-xs text-orange-200 mb-3 bg-orange-900/20 border border-orange-500/30 p-2 rounded">
                Click on a planet or empty space to spawn rocket
              </div>
              <input
                type="text"
                value={spawnConfig.name}
                onChange={(e) =>
                  onUpdateSpawnConfig({ ...spawnConfig, name: e.target.value })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2"
                placeholder="Rocket Name"
                maxLength={20}
              />
              <div className="mb-2">
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Design
                </label>
                <select
                  value={spawnConfig.design || "rocket"}
                  onChange={(e) =>
                    onUpdateSpawnConfig({
                      ...spawnConfig,
                      design: e.target.value as ShipDesign,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none placeholder-slate-500"
                >
                  <option value="rocket">Single Stage</option>
                  <option value="multistage">Multi-Stage</option>
                  <option value="station">Space Station</option>
                  <option value="satellite">Satellite</option>
                </select>
              </div>

              {/* Dynamic Configuration Fields */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {spawnConfig.design === "multistage" ? (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-400 uppercase mb-1">
                        Stages
                      </label>
                      <input
                        type="number"
                        value={spawnConfig.stages || 3}
                        onChange={(e) => {
                          const count = Math.max(
                            2,
                            Math.min(10, Number(e.target.value)),
                          );
                          // Initialize stageConfigs if needed or resize it
                          let newConfigs = spawnConfig.stageConfigs
                            ? [...spawnConfig.stageConfigs]
                            : [];

                          // Resize logic
                          if (newConfigs.length < count) {
                            // Add missing
                            for (let i = newConfigs.length; i < count; i++) {
                              const isPayload = i === count - 1;
                              const scale = 1.0 - (i / (count - 1)) * 0.5;
                              newConfigs.push({
                                fuel: isPayload
                                  ? 500
                                  : Math.round(5000 * scale),
                                thrust: isPayload
                                  ? 0.2
                                  : Math.round(1.0 * scale * 10) / 10,
                              });
                            }
                          } else if (newConfigs.length > count) {
                            // Trim
                            newConfigs = newConfigs.slice(0, count);
                          }

                          onUpdateSpawnConfig({
                            ...spawnConfig,
                            stages: count,
                            stageConfigs: newConfigs,
                          });
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none"
                        min={2}
                        max={10}
                      />
                    </div>
                    {/* Per Stage Configuration */}
                    {spawnConfig.stageConfigs &&
                      spawnConfig.stageConfigs.length > 0 && (
                        <div className="col-span-2 space-y-2 mt-2 bg-slate-800/50 p-2 rounded border border-slate-700 max-h-40 overflow-y-auto custom-scrollbar">
                          {spawnConfig.stageConfigs.map((cfg, idx) => (
                            <div key={idx} className="flex gap-2 items-end">
                              <div className="w-8 text-[10px] text-slate-400 mb-2 font-bold">
                                {idx === spawnConfig.stageConfigs!.length - 1
                                  ? "PAY"
                                  : `S${idx + 1}`}
                              </div>
                              <div className="flex-1">
                                <label className="block text-[8px] text-slate-500 uppercase">
                                  Fuel
                                </label>
                                <input
                                  type="number"
                                  value={cfg.fuel}
                                  onChange={(e) => {
                                    const newConfigs = [
                                      ...(spawnConfig.stageConfigs || []),
                                    ];
                                    newConfigs[idx] = {
                                      ...newConfigs[idx],
                                      fuel: Number(e.target.value),
                                    };
                                    onUpdateSpawnConfig({
                                      ...spawnConfig,
                                      stageConfigs: newConfigs,
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-white"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[8px] text-slate-500 uppercase">
                                  Thrust
                                </label>
                                <input
                                  type="number"
                                  value={cfg.thrust}
                                  onChange={(e) => {
                                    const newConfigs = [
                                      ...(spawnConfig.stageConfigs || []),
                                    ];
                                    newConfigs[idx] = {
                                      ...newConfigs[idx],
                                      thrust: Number(e.target.value),
                                    };
                                    onUpdateSpawnConfig({
                                      ...spawnConfig,
                                      stageConfigs: newConfigs,
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-white"
                                  step={0.1}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 uppercase mb-1">
                        Fuel
                      </label>
                      <input
                        type="number"
                        value={spawnConfig.fuel || 100}
                        onChange={(e) =>
                          onUpdateSpawnConfig({
                            ...spawnConfig,
                            fuel: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 uppercase mb-1">
                        Thrust
                      </label>
                      <input
                        type="number"
                        value={spawnConfig.thrust || 1}
                        onChange={(e) =>
                          onUpdateSpawnConfig({
                            ...spawnConfig,
                            thrust: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none"
                        step={0.1}
                        min={0.1}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">
                    Mass
                  </label>
                  <input
                    type="number"
                    value={spawnConfig.mass}
                    onChange={(e) =>
                      onUpdateSpawnConfig({
                        ...spawnConfig,
                        mass: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none placeholder-slate-500"
                    min={0.0001}
                    max={0.1}
                    step={0.0001}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">
                    Radius
                  </label>
                  <input
                    type="number"
                    value={spawnConfig.radius}
                    onChange={(e) =>
                      onUpdateSpawnConfig({
                        ...spawnConfig,
                        radius: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none placeholder-slate-500"
                    min={0.2}
                    max={5}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                {ROCKET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() =>
                      onUpdateSpawnConfig({ ...spawnConfig, color: c })
                    }
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full ${spawnConfig.color === c ? "ring-2 ring-white scale-110" : "opacity-60"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop UI (unchanged)
  return (
    <div
      className={`fixed ${isMobile ? `bottom-20 left-0 right-0 ${isCollapsed ? "h-auto" : "h-[50vh] "}` : "top-16 bottom-16 right-0 w-96"} bg-slate-900/10 z-30 flex flex-col transition-all duration-300 ${!isMobile && isCollapsed ? "pt-1 w-[38px] h-[32px] top-8" : "border-slate-700 border rounded-lg"}`}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header / Toggle */}
      <div
        className={`p-1 flex bg-indigo-900/30  ${isCollapsed ? "flex-col justify-start gap-0 p-0 bg-indigo-900/10" : "justify-between gap-0 p-0 bg-indigo-900/10"} items-center transition-all`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors  bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl "
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <ArrowRightLeft
              size={26}
              className="rotate-180 text-purple-400 group-hover:text-purple-300"
            />
          ) : (
            <ArrowRightLeft
              size={26}
              className="text-purple-400 group-hover:text-purple-300"
            />
          )}
        </button>

        {!isCollapsed && (
          <>
            <div className="flex items-center gap-2 text-white font-bold truncate">
              <Rocket size={26} className="text-orange-400" />
              <span className="text-sm">Control</span>
            </div>
            <div className="flex gap-0">
              <button
                onClick={onSpawnToggle}
                className={`p-1 rounded transition-colors ${isSpawning ? "bg-orange-600 text-white" : "text-slate-400 hover:bg-slate-800"} bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl `}
                title="Spawn Mode"
              >
                <Crosshair
                  size={26}
                  className="rotate-180 text-purple-400 group-hover:text-purple-300"
                />
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded"
              >
                <X size={26} />
              </button>
            </div>
          </>
        )}
        {isCollapsed && (
          <div className="">
            <button
              onClick={onSpawnToggle}
              className={`p-1 rounded transition-colors ${isSpawning ? "bg-orange-600 text-white" : "text-slate-400 hover:bg-slate-800"} bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl `}
              title="Spawn Mode"
            >
              <Crosshair
                size={26}
                className="text-purple-400 group-hover:text-purple-300"
              />
            </button>
          </div>
        )}
      </div>

      {/* Notification (Overlay when collapsed) */}
      {notification && (
        <div
          className={`absolute top-16 left-4 right-4 bg-green-600 text-white p-2 rounded text-xs font-bold text-center animate-bounce shadow-lg z-50 ${isCollapsed ? "left-[-200px] w-48" : ""}`}
        >
          {notification}
        </div>
      )}

      {/* Content - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {isSpawning ? (
            <div className="space-y-4">
              <div className="bg-orange-900/20 border border-orange-500/30 p-3 rounded text-xs text-orange-200">
                Click on a planet to launch from surface (inherits velocity) or
                click in empty space to spawn at rest.
              </div>

              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Rocket Name
                </label>
                <input
                  type="text"
                  value={spawnConfig.name}
                  onChange={(e) =>
                    onUpdateSpawnConfig({
                      ...spawnConfig,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none placeholder-slate-500"
                  maxLength={20}
                />
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Design
                </label>
                <select
                  value={spawnConfig.design || "rocket"}
                  onChange={(e) =>
                    onUpdateSpawnConfig({
                      ...spawnConfig,
                      design: e.target.value as ShipDesign,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none placeholder-slate-500 mb-2"
                >
                  <option value="rocket">Single Stage</option>
                  <option value="multistage">Multi-Stage (3)</option>
                  <option value="station">Space Station</option>
                  <option value="satellite">Satellite</option>
                </select>

                {/* Dynamic Configuration Fields */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {spawnConfig.design === "multistage" ? (
                    <>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-400 uppercase mb-1">
                          Stages
                        </label>
                        <input
                          type="number"
                          value={spawnConfig.stages || 3}
                          onChange={(e) => {
                            const count = Math.max(
                              2,
                              Math.min(10, Number(e.target.value)),
                            );
                            // Initialize stageConfigs if needed or resize it
                            let newConfigs = spawnConfig.stageConfigs
                              ? [...spawnConfig.stageConfigs]
                              : [];

                            // Resize logic
                            if (newConfigs.length < count) {
                              // Add missing
                              for (let i = newConfigs.length; i < count; i++) {
                                const isPayload = i === count - 1;
                                const scale = 1.0 - (i / (count - 1)) * 0.5;
                                newConfigs.push({
                                  fuel: isPayload
                                    ? 500
                                    : Math.round(5000 * scale),
                                  thrust: isPayload
                                    ? 0.2
                                    : Math.round(1.0 * scale * 10) / 10,
                                });
                              }
                            } else if (newConfigs.length > count) {
                              // Trim
                              newConfigs = newConfigs.slice(0, count);
                            }

                            onUpdateSpawnConfig({
                              ...spawnConfig,
                              stages: count,
                              stageConfigs: newConfigs,
                            });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none"
                          min={2}
                          max={10}
                        />
                      </div>
                      {/* Per Stage Configuration */}
                      {spawnConfig.stageConfigs &&
                        spawnConfig.stageConfigs.length > 0 && (
                          <div className="col-span-2 space-y-2 mt-2 bg-slate-800/50 p-2 rounded border border-slate-700 max-h-40 overflow-y-auto custom-scrollbar">
                            {spawnConfig.stageConfigs.map((cfg, idx) => (
                              <div key={idx} className="flex gap-2 items-end">
                                <div className="w-8 text-[10px] text-slate-400 mb-2 font-bold">
                                  {idx === spawnConfig.stageConfigs!.length - 1
                                    ? "PAY"
                                    : `S${idx + 1}`}
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[8px] text-slate-500 uppercase">
                                    Fuel
                                  </label>
                                  <input
                                    type="number"
                                    value={cfg.fuel}
                                    onChange={(e) => {
                                      const newConfigs = [
                                        ...(spawnConfig.stageConfigs || []),
                                      ];
                                      newConfigs[idx] = {
                                        ...newConfigs[idx],
                                        fuel: Number(e.target.value),
                                      };
                                      onUpdateSpawnConfig({
                                        ...spawnConfig,
                                        stageConfigs: newConfigs,
                                      });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-white"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[8px] text-slate-500 uppercase">
                                    Thrust
                                  </label>
                                  <input
                                    type="number"
                                    value={cfg.thrust}
                                    onChange={(e) => {
                                      const newConfigs = [
                                        ...(spawnConfig.stageConfigs || []),
                                      ];
                                      newConfigs[idx] = {
                                        ...newConfigs[idx],
                                        thrust: Number(e.target.value),
                                      };
                                      onUpdateSpawnConfig({
                                        ...spawnConfig,
                                        stageConfigs: newConfigs,
                                      });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-white"
                                    step={0.1}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs text-slate-400 uppercase mb-1">
                          Fuel
                        </label>
                        <input
                          type="number"
                          value={spawnConfig.fuel || 100}
                          onChange={(e) =>
                            onUpdateSpawnConfig({
                              ...spawnConfig,
                              fuel: Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 uppercase mb-1">
                          Thrust
                        </label>
                        <input
                          type="number"
                          value={spawnConfig.thrust || 1}
                          onChange={(e) =>
                            onUpdateSpawnConfig({
                              ...spawnConfig,
                              thrust: Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none"
                          step={0.1}
                          min={0.1}
                        />
                      </div>
                    </>
                  )}
                </div>

                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Mass
                </label>
                <input
                  type="number"
                  value={spawnConfig.mass}
                  onChange={(e) =>
                    onUpdateSpawnConfig({
                      ...spawnConfig,
                      mass: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none placeholder-slate-500"
                  min={0.0001}
                  max={0.1}
                  step={0.0001}
                />

                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Radius
                </label>
                <input
                  type="number"
                  value={spawnConfig.radius}
                  onChange={(e) =>
                    onUpdateSpawnConfig({
                      ...spawnConfig,
                      radius: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none placeholder-slate-500"
                  min={0.2}
                  max={2}
                  step={0.01}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-2">
                  Hull Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ROCKET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() =>
                        onUpdateSpawnConfig({ ...spawnConfig, color: c })
                      }
                      style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full transition-transform ${spawnConfig.color === c ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : !selectedRocket ? (
            <div className="text-center text-slate-500 text-sm py-10 italic">
              Select a rocket to begin control.
              {bodies
                .filter((b) => b.isRocket)
                .map((b) => (
                  <div className="bg-slate-900/30 border-l-4 border-orange-500 backdrop-blur-md p-4 rounded-r-xl shadow-2xl mb-2">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-[10px] text-orange-400 font-bold tracking-widest uppercase">
                          Telemetry Data
                        </div>
                        <div
                          className={`text-xl font-bold text-white leading-none ${onSelectRocket ? "cursor-pointer hover:text-orange-400 transition-colors pointer-events-auto" : ""}`}
                          onClick={() => onSelectRocket?.(b.id)}
                          title={
                            onSelectRocket ? "Click to select this rocket" : ""
                          }
                        >
                          {b.name}
                        </div>
                      </div>
                      {b.landedOnBodyId ? (
                        <div className="flex items-center gap-1 bg-green-900/50 text-green-400 px-2 py-1 rounded text-[10px] font-bold border border-green-500/30">
                          <Anchor size={12} /> LANDED
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-blue-900/50 text-blue-400 px-2 py-1 rounded text-[10px] font-bold border border-blue-500/30">
                          <Rocket size={12} /> IN FLIGHT
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                          <Gauge size={10} /> Velocity
                        </div>
                        <div className="text-lg text-white font-bold">
                          {Math.sqrt(
                            b.velocity.x ** 2 + b.velocity.y ** 2,
                          ).toFixed(2)}{" "}
                          <span className="text-[10px] font-normal text-slate-400">
                            u/s
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                          <Compass size={10} /> Heading
                        </div>
                        <div className="text-lg text-white font-bold">
                          {(((b.angle || 0) * 180) / Math.PI).toFixed(1)}°
                        </div>
                      </div>
                    </div>

                    {/* FUEL BAR */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Fuel size={10} /> PROPELLANT
                        </span>
                        <span
                          className={
                            b.fuel && b.fuel < 10
                              ? "text-red-400 font-bold animate-pulse"
                              : ""
                          }
                        >
                          {(((b.fuel || 0) / (b.maxFuel || 1)) * 100).toFixed(
                            0,
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${b.fuel && b.fuel < 10 ? "bg-red-500" : "bg-orange-500"}`}
                          style={{
                            width: `${b.fuel && b.maxFuel ? (b.fuel / b.maxFuel) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <>
              {/* GLOBAL CONTEXT */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {onParentChange && (
                  <select
                    value={parentBodyId || ""}
                    onChange={(e) => handleParentChange(e.target.value)}
                    className="bg-slate-800 text-xs text-white p-2 rounded border border-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option value="">Ref: Auto</option>
                    {bodies
                      .filter((b) => b.id !== selectedRocket.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          Ref: {b.name}
                        </option>
                      ))}
                  </select>
                )}
                <select
                  value={targetBodyId}
                  onChange={(e) => {
                    const newTargetId = e.target.value;
                    onTargetChange(newTargetId);
                    if (newTargetId && newTargetId === parentBodyId) {
                      // Reset parent to Auto if target matches parent
                      if (onParentChange) onParentChange("");
                    }
                  }}
                  className="bg-slate-800 text-xs text-white p-2 rounded border border-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="">Target: None</option>
                  {bodies
                    .filter(
                      (b) =>
                        b.id !== selectedRocket.id && b.id !== parentBodyId,
                    )
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        Target: {b.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* TABS */}
              <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setActiveTab("flight")}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${activeTab === "flight" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  <Zap size={14} /> FLIGHT
                </button>
                <button
                  onClick={() => setActiveTab("mission")}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${activeTab === "mission" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  <Radio size={14} /> MISSION
                </button>
                <button
                  onClick={() => setActiveTab("config")}
                  className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${activeTab === "config" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  <Settings size={14} /> SYSTEM
                </button>
              </div>

              {/* --- FLIGHT TAB --- */}
              {activeTab === "flight" && (
                <div className="space-y-6">
                  {/* SAS */}
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex justify-between items-center">
                      SAS Autopilot
                      {selectedRocket.sasMode &&
                        selectedRocket.sasMode !== "off" && (
                          <span className="text-green-400 animate-pulse text-[10px]">
                            ACTIVE
                          </span>
                        )}
                    </div>
                    <select
                      value={sasReferenceBodyId}
                      onChange={(e) => {
                        setSasReferenceBodyId(e.target.value);
                        if (e.target.value && selectedRocket) {
                          onUpdateRocket(selectedRocket.id, {
                            orbitReferenceId: e.target.value,
                          });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200 mb-2"
                    >
                      <option value="">Reference Body (Auto)...</option>
                      {bodies
                        .filter(
                          (b) => !b.isRocket && b.id !== selectedRocket?.id,
                        )
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSAS("off")}
                        title="Off"
                        className={`flex-1 p-2 rounded flex justify-center ${!selectedRocket.sasMode || selectedRocket.sasMode === "off" ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-500"}`}
                      >
                        OFF
                      </button>
                      <button
                        onClick={() => setSAS("prograde")}
                        title="Prograde"
                        className={`flex-1 p-2 rounded flex justify-center ${selectedRocket.sasMode === "prograde" ? "bg-emerald-600 text-white" : "bg-slate-800 text-emerald-500"}`}
                      >
                        <CircleDot size={18} />
                      </button>
                      <button
                        onClick={() => setSAS("retrograde")}
                        title="Retrograde"
                        className={`flex-1 p-2 rounded flex justify-center ${selectedRocket.sasMode === "retrograde" ? "bg-red-600 text-white" : "bg-slate-800 text-red-500"}`}
                      >
                        <X size={18} />
                      </button>
                      <button
                        onClick={() => setSAS("radial_out")}
                        title="Radial Out"
                        className={`flex-1 p-2 rounded flex justify-center ${selectedRocket.sasMode === "radial_out" ? "bg-blue-600 text-white" : "bg-slate-800 text-blue-500"}`}
                      >
                        <ArrowUp size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Manual Staging Control */}
                  {selectedRocket.shipStructure &&
                    selectedRocket.shipStructure.currentStageIndex <
                      selectedRocket.shipStructure.stages.length - 1 && (
                      <div className="mb-4">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">
                          Staging
                        </div>
                        <button
                          onClick={() => onStage?.(selectedRocket.id)}
                          className="w-full py-3 bg-red-900/50 hover:bg-red-700 border border-red-500/30 rounded-lg text-xs font-bold text-red-200 uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <ArrowUp size={16} /> Separate Stage{" "}
                          {selectedRocket.shipStructure.currentStageIndex + 1}
                        </button>
                      </div>
                    )}

                  {/* MANUAL PAD */}
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">Manual Override</span>
                      <span className="text-orange-400 font-mono">
                        {manualThrustPower.toFixed(5)}N
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0001"
                      max="0.005"
                      step="0.0001"
                      value={manualThrustPower}
                      onChange={(e) =>
                        setManualThrustPower(Number(e.target.value))
                      }
                      className="w-full accent-orange-600 bg-slate-700 h-1 rounded-lg mb-4"
                    />

                    <div className="flex justify-center gap-4 items-center">
                      <button
                        onClick={() => handleRotate(-15)}
                        className="w-12 h-12 rounded-full bg-slate-700 hover:bg-indigo-600 flex items-center justify-center text-white active:scale-95 transition-all"
                      >
                        <RotateCcw size={20} />
                      </button>

                      <button
                        onMouseDown={handleManualThrustStart}
                        onMouseUp={handleManualThrustEnd}
                        onMouseLeave={() => {
                          if (manualThrusting) handleManualThrustEnd();
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleManualThrustStart();
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleManualThrustEnd();
                        }}
                        onTouchCancel={(e) => {
                          e.preventDefault();
                          handleManualThrustEnd();
                        }}
                        className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${manualThrusting ? "bg-orange-500 scale-95 shadow-inner" : "bg-orange-600 hover:bg-orange-500 shadow-xl"}`}
                      >
                        <ArrowUp size={32} className="text-white" />
                        <span className="text-[10px] font-bold text-white/80">
                          IGNITE
                        </span>
                      </button>

                      <button
                        onClick={() => handleRotate(15)}
                        className="w-12 h-12 rounded-full bg-slate-700 hover:bg-indigo-600 flex items-center justify-center text-white active:scale-95 transition-all"
                      >
                        <RotateCw size={20} />
                      </button>
                    </div>
                  </div>

                  {/* AUTO MANEUVERS */}
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">
                      Auto Maneuvers
                    </div>
                    <div className="space-y-2">
                      {/* Circularize */}
                      <div className="flex gap-2">
                        <select
                          value={circularizeBodyId}
                          onChange={(e) => setCircularizeBodyId(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200"
                        >
                          <option value="">Select Body...</option>
                          {bodies
                            .filter(
                              (b) => !b.isRocket && b.id !== selectedRocket?.id,
                            )
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() =>
                            triggerAutoManeuver(
                              "auto_circularize",
                              circularizeBodyId,
                            )
                          }
                          disabled={!circularizeBodyId}
                          className="px-4 py-2 bg-slate-800 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 border border-slate-700"
                        >
                          <RefreshCw size={14} /> CIRCULARIZE
                        </button>
                      </div>

                      {/* Land */}
                      <div className="flex gap-2">
                        <select
                          value={landBodyId}
                          onChange={(e) => setLandBodyId(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200"
                        >
                          <option value="">Select Body...</option>
                          {bodies
                            .filter(
                              (b) => !b.isRocket && b.id !== selectedRocket?.id,
                            )
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() =>
                            triggerAutoManeuver("auto_land", landBodyId)
                          }
                          disabled={!landBodyId}
                          className="px-4 py-2 bg-slate-800 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 border border-slate-700"
                        >
                          <ArrowDownToLine size={14} /> LAND
                        </button>
                      </div>

                      {/* Transfer */}
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <select
                            value={transferTargetBodyId}
                            onChange={(e) =>
                              setTransferTargetBodyId(e.target.value)
                            }
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200"
                          >
                            <option value="">Target...</option>
                            {bodies
                              .filter(
                                (b) =>
                                  !b.isRocket && b.id !== selectedRocket?.id,
                              )
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                          </select>
                          <select
                            value={transferParentBodyId}
                            onChange={(e) =>
                              setTransferParentBodyId(e.target.value)
                            }
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200"
                          >
                            <option value="">Parent...</option>
                            {bodies
                              .filter(
                                (b) =>
                                  !b.isRocket && b.id !== selectedRocket?.id,
                              )
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <button
                          onClick={() =>
                            triggerAutoManeuver(
                              "auto_transfer",
                              transferTargetBodyId,
                              transferParentBodyId,
                            )
                          }
                          disabled={
                            !transferTargetBodyId || !transferParentBodyId
                          }
                          className="w-full py-2 bg-slate-800 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 border border-slate-700"
                        >
                          <TrendingUp size={14} /> TRANSFER INJECTION
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rendezvous Calculator */}
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">
                      Rendezvous Calculator
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={rendezvousTargetId}
                          onChange={(e) =>
                            setRendezvousTargetId(e.target.value)
                          }
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200"
                        >
                          <option value="">Select Target...</option>
                          {bodies
                            .filter(
                              (b) => !b.isRocket && b.id !== selectedRocket?.id,
                            )
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Max Distance (units)
                        </label>
                        <input
                          type="number"
                          value={rendezvousDistance}
                          onChange={(e) =>
                            setRendezvousDistance(parseFloat(e.target.value))
                          }
                          step="1"
                          min="1"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                      {rendezvousData ? (
                        <div className="bg-green-900/20 border border-green-500/30 rounded p-2 space-y-1">
                          <div className="text-[10px] text-green-400 font-bold uppercase">
                            Rendezvous Found!
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Target:{" "}
                            <span className="text-white font-bold">
                              {rendezvousData.targetName}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Time:{" "}
                            <span className="text-cyan-400 font-mono">
                              {rendezvousData.timeToRendezvous.toFixed(1)}s
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Distance:{" "}
                            <span className="text-emerald-400 font-mono">
                              {rendezvousData.distance.toFixed(2)} units
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Position:{" "}
                            <span className="text-purple-400 font-mono">
                              ({rendezvousData.meetingPoint.x.toFixed(1)},{" "}
                              {rendezvousData.meetingPoint.y.toFixed(1)})
                            </span>
                          </div>
                        </div>
                      ) : rendezvousTargetId ? (
                        <div className="bg-orange-900/20 border border-orange-500/30 rounded p-2">
                          <div className="text-[10px] text-orange-400">
                            No rendezvous within prediction window
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* --- MISSION TAB --- */}
              {activeTab === "mission" && (
                <MissionTabDesktop {...missionTabProps} />
              )}

              {/* --- CONFIG TAB --- */}
              {activeTab === "config" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Clock size={12} /> Time Dilation
                    </h4>
                    <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                      {[0.1, 1, 10, 100, 1000].map((val) => (
                        <button
                          key={val}
                          onClick={() => onSpeedChange(val)}
                          className={`flex-1 py-1 rounded text-[10px] font-bold ${Math.abs(speed - val) < 0.01 ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-700"}`}
                        >
                          {val}x
                        </button>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1 text-slate-400">
                        <span>Physics Step</span>
                        <span className="text-indigo-300 font-mono">
                          {physicsConfig.timeStep.toFixed(3)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.001"
                        max="1.0"
                        step="0.001"
                        value={physicsConfig.timeStep}
                        onChange={(e) =>
                          onUpdatePhysicsConfig({
                            timeStep: Number(e.target.value),
                          })
                        }
                        className="w-full accent-indigo-500 bg-slate-700 h-1 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* <div className="pt-4 border-t border-slate-700">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Eye size={12} /> Visualizations</h4>
                                    
                                    <div className="space-y-2">
                                        <button 
                                            onClick={onToggleTheoreticalOrbit}
                                            className={`w-full py-2 rounded text-xs font-bold transition-colors flex items-center justify-between px-3 ${showTheoreticalOrbit ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Globe size={14} /> Theoretical Orbit
                                            </span>
                                            <span className="text-[10px]">{showTheoreticalOrbit ? 'ON' : 'OFF'}</span>
                                        </button>
                                        
                                        <button 
                                            onClick={onToggleTransferWindow}
                                            className={`w-full py-2 rounded text-xs font-bold transition-colors flex items-center justify-between px-3 ${showTransferWindow ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <TrendingUp size={14} /> Transfer Window
                                            </span>
                                            <span className="text-[10px]">{showTransferWindow ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div> */}

                  <div className="pt-4 border-t border-slate-700">
                    <button
                      onClick={onToggleFollow}
                      className={`w-full py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 ${isFollowing ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                    >
                      {isFollowing ? (
                        <Ban size={14} />
                      ) : (
                        <Crosshair size={14} />
                      )}{" "}
                      {isFollowing ? "Unlock Camera" : "Follow Rocket"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RocketPanel;
