import {
  GoogleGenAI,
  Type,
  FunctionDeclaration,
  Tool,
  Modality,
  ThinkingLevel,
} from "@google/genai";

// Get API key from localStorage first, then fallback to environment variable
const getApiKey = (): string => {
  if (typeof window !== "undefined") {
    const storedKey = localStorage.getItem("gemini_api_key");
    if (storedKey && storedKey.trim()) {
      return storedKey.trim();
    }
  }
  return process.env.API_KEY || "";
};

// Get AI instance with current API key (allows hot-reloading of API key changes)
const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

// --- Tool Definitions ---

const spawnBodyTool: FunctionDeclaration = {
  name: "spawn_body",
  description: "Create a new planet or star in the simulation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Name of the body" },
      mass: {
        type: Type.NUMBER,
        description:
          "Mass of the body (1-1000). Earth is ~45, Jupiter ~600, Sun ~5000.",
      },
      distance: {
        type: Type.NUMBER,
        description: "Distance from center (50-1000). Earth is 160.",
      },
      velocity: {
        type: Type.NUMBER,
        description: "Tangential velocity (0-10). Earth is ~4.0.",
      },
      color: {
        type: Type.STRING,
        description: "Hex color code (e.g. #FF0000) or name.",
      },
    },
    required: ["name", "mass", "distance", "velocity", "color"],
  },
};

const spawnBodyComplexTool: FunctionDeclaration = {
  name: "spawn_body_complex",
  description:
    "Create a new celestial body with full control over position and velocity vectors. Use this for precise placement of bodies at specific coordinates with specific velocity vectors.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Name of the body" },
      mass: {
        type: Type.NUMBER,
        description:
          "Mass of the body (1-1000). Earth is ~45, Jupiter ~600, Sun ~5000.",
      },
      radius: {
        type: Type.NUMBER,
        description:
          "Visual radius of the body (1-50). Earth is ~8, Sun is ~30.",
      },
      color: {
        type: Type.STRING,
        description: "Hex color code (e.g. #FF0000) or name.",
      },
      positionX: {
        type: Type.NUMBER,
        description: "X coordinate of spawn position in simulation units.",
      },
      positionY: {
        type: Type.NUMBER,
        description: "Y coordinate of spawn position in simulation units.",
      },
      velocityX: {
        type: Type.NUMBER,
        description: "X component of velocity vector.",
      },
      velocityY: {
        type: Type.NUMBER,
        description: "Y component of velocity vector.",
      },
      isStar: {
        type: Type.BOOLEAN,
        description:
          "Whether this body should be rendered as a star with glow effects.",
      },
    },
    required: [
      "name",
      "mass",
      "radius",
      "color",
      "positionX",
      "positionY",
      "velocityX",
      "velocityY",
    ],
  },
};

const deleteBodyTool: FunctionDeclaration = {
  name: "delete_body",
  description: "Delete/Remove a specific planet or star from the simulation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bodyName: {
        type: Type.STRING,
        description: "The name of the body to delete.",
      },
    },
    required: ["bodyName"],
  },
};

const makeStarTool: FunctionDeclaration = {
  name: "make_star",
  description:
    "Convert an existing planet into a star (increases mass, adds glow, turns it into a light source).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bodyName: {
        type: Type.STRING,
        description: "The name of the body to transform into a star.",
      },
    },
    required: ["bodyName"],
  },
};

const controlSimulationTool: FunctionDeclaration = {
  name: "control_simulation",
  description: "Control the simulation playback and speed.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      isRunning: {
        type: Type.BOOLEAN,
        description: "True to play, False to pause.",
      },
      speed: {
        type: Type.NUMBER,
        description: "Simulation speed multiplier (0.1 to 100.0).",
      },
    },
  },
};

const changePresetTool: FunctionDeclaration = {
  name: "change_preset",
  description: "Load a specific solar system configuration.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      presetId: {
        type: Type.STRING,
        description:
          "The ID of the preset: 'solar', 'inner', 'binary', 'threebody', 'figure8', 'butterfly', 'moth', 'yinyang', 'equilateral', 'euler', 'trappist', 'random', or 'blank'.",
      },
    },
    required: ["presetId"],
  },
};

const selectBodyTool: FunctionDeclaration = {
  name: "select_body",
  description:
    "Select and show info for a specific body. Does not lock camera.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bodyName: {
        type: Type.STRING,
        description: "The name of the planet or star to select.",
      },
    },
    required: ["bodyName"],
  },
};

const followBodyTool: FunctionDeclaration = {
  name: "follow_body",
  description: "Lock the camera to follow and center a specific body.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bodyName: {
        type: Type.STRING,
        description: "The name of the body to follow.",
      },
    },
    required: ["bodyName"],
  },
};

const followCenterOfMassTool: FunctionDeclaration = {
  name: "follow_center_of_mass",
  description:
    "Lock the camera to follow the center of mass of the entire system.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const configureVisualsTool: FunctionDeclaration = {
  name: "configure_visuals",
  description:
    "Toggle various visual effects and customize rendering parameters.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      showGrid: {
        type: Type.BOOLEAN,
        description: "Show the spacetime gravity distortion grid.",
      },
      gridSpacing: {
        type: Type.NUMBER,
        description: "Distance between grid lines (50-200).",
      },
      gridOpacity: {
        type: Type.NUMBER,
        description: "Opacity of grid lines (0.1-1.0).",
      },
      showWaves: {
        type: Type.BOOLEAN,
        description: "Show gravitational waves from moving bodies.",
      },
      waveSpeedMultiplier: {
        type: Type.NUMBER,
        description: "Multiplier for wave expansion speed (0.5-2.0).",
      },
      showGlow: {
        type: Type.BOOLEAN,
        description: "Show atmospheric and star glows.",
      },
      glowIntensity: {
        type: Type.NUMBER,
        description: "Intensity of the glow effect (0.5-2.0).",
      },
      showTrails: { type: Type.BOOLEAN, description: "Show orbital trails." },
      trailLength: {
        type: Type.NUMBER,
        description:
          "Maximum number of points in the orbital trail (50-5000). Higher = longer trails.",
      },
      centerOfMassThreshold: {
        type: Type.NUMBER,
        description:
          "Max distance from origin for bodies to be included in Center of Mass calculation (500-10000).",
      },
      showCenterOfMass: {
        type: Type.BOOLEAN,
        description:
          "Show a visual marker for the Center of Mass and its threshold circle.",
      },
      showStars: {
        type: Type.BOOLEAN,
        description: "Show the background starfield.",
      },
      showNebula: {
        type: Type.BOOLEAN,
        description: "Show background nebula clouds.",
      },
      starDensity: {
        type: Type.NUMBER,
        description: "Number of stars in the background (100-2000).",
      },
      starTwinkleSpeed: {
        type: Type.NUMBER,
        description: "Speed of star twinkling (0.1-5.0).",
      },
      nebulaCloudCount: {
        type: Type.NUMBER,
        description: "Number of nebula clouds (0-50).",
      },
      nebulaOpacity: {
        type: Type.NUMBER,
        description: "Opacity of nebula clouds (0.1-1.0).",
      },
      showEclipses: {
        type: Type.BOOLEAN,
        description: "Show volumetric shadows cast by planets.",
      },
    },
  },
};

const configurePhysicsTool: FunctionDeclaration = {
  name: "configure_physics",
  description:
    "Configure the fundamental constants of the simulation physics engine.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      gravitationalConstant: {
        type: Type.NUMBER,
        description:
          "The Big G constant. Default is 0.5. Higher values = stronger gravity.",
      },
      collisions: {
        type: Type.BOOLEAN,
        description: "Enable or disable collisions and merging of bodies.",
      },
      timeStep: {
        type: Type.NUMBER,
        description:
          "Base physics time step. Default 0.5. Range 0.001 to 2.0. Lower = more accurate, Higher = faster/unstable.",
      },
    },
  },
};

const setCameraTool: FunctionDeclaration = {
  name: "set_camera",
  description: "Control the camera zoom level or reset the view.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      zoom: {
        type: Type.NUMBER,
        description: "Zoom level (0.1 to 5.0). 1.0 is default.",
      },
      reset: {
        type: Type.BOOLEAN,
        description: "Reset camera to center and default zoom.",
      },
    },
  },
};

const spawnRocketTool: FunctionDeclaration = {
  name: "spawn_rocket",
  description:
    "Spawn a new rocket ship. Can spawn in free space or landed on a planet.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      parentBodyName: {
        type: Type.STRING,
        description:
          "Optional name of the planet to spawn/land on. If omitted, spawns in free space near the center.",
      },
    },
  },
};

const controlRocketTool: FunctionDeclaration = {
  name: "control_rocket",
  description: "Real-time control for a rocket ship.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rocketName: {
        type: Type.STRING,
        description: "Name of the rocket to control.",
      },
      action: {
        type: Type.STRING,
        description:
          "'rotate' (turn by degrees), 'thrust' (manual main engine on/off), or 'stop' (kill engines).",
      },
      value: {
        type: Type.NUMBER,
        description:
          "For 'rotate', the degrees to turn (e.g., 90, -45). For 'thrust', treated as power (default 0.05) if non-zero.",
      },
    },
    required: ["rocketName", "action"],
  },
};

const programAdvancedFlightPlanTool: FunctionDeclaration = {
  name: "program_advanced_flight_plan",
  description: `Program a comprehensive flight plan with multiple maneuver types. Supports all maneuver types:
    - 'burn': Timed thrust burn with specific angle
    - 'wait': Passive wait for specified duration
    - 'rotate': Rotate rocket by degrees
    - 'sas': Set Stability Assist System mode
    - 'auto_land': Automatic landing on target body
    - 'auto_transfer': Automatic Hohmann transfer to target
    - 'auto_circularize': Circularize orbit around target
    - 'wait_for_transfer': Wait for optimal transfer window
    - 'wait_for_altitude': Wait until reaching target altitude (ascending/descending)
    - 'burn_until_altitude': Burn continuously until reaching target altitude
    - 'change_simulation_speed': Change simulation speed multiplier (e.g. 100x)
    - 'stage': Jettison the current stage of a multi-stage rocket (no parameters)`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      rocketName: { type: Type.STRING, description: "Name of the rocket." },
      maneuvers: {
        type: Type.ARRAY,
        description: "List of maneuvers to execute in sequence.",
        items: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description:
                "Maneuver type: 'burn', 'wait', 'rotate', 'sas', 'auto_land', 'auto_transfer', 'auto_circularize', 'wait_for_transfer', 'wait_for_altitude', 'burn_until_altitude', 'change_simulation_speed', 'stage'",
            },
            // For 'burn' and 'burn_until_altitude'
            thrust: {
              type: Type.NUMBER,
              description:
                "Thrust power (0.001-0.1). Required for 'burn' and 'burn_until_altitude'.",
            },
            duration: {
              type: Type.NUMBER,
              description:
                "Duration in seconds. Required for 'burn' and 'wait'.",
            },
            angleOffset: {
              type: Type.NUMBER,
              description:
                "Angle offset in degrees relative to rocket heading. Required for 'burn' and 'burn_until_altitude'.",
            },

            // For 'rotate'
            rotationAngle: {
              type: Type.NUMBER,
              description:
                "Rotation angle in degrees (e.g., 90, -45). Required for 'rotate'.",
            },

            // For 'sas'
            sasMode: {
              type: Type.STRING,
              description:
                "SAS mode: 'off', 'prograde', 'retrograde', 'radial_out', 'radial_in'. Required for 'sas'.",
            },

            // For 'change_simulation_speed'
            simulationSpeed: {
              type: Type.NUMBER,
              description:
                "New simulation speed multiplier (e.g., 0.1, 1, 10, 100, 1000). Required for 'change_simulation_speed'.",
            },

            // For auto maneuvers and altitude maneuvers
            targetBodyName: {
              type: Type.STRING,
              description:
                "Name of target body. Required for 'auto_land', 'auto_transfer', 'auto_circularize', 'wait_for_transfer'.",
            },
            parentBodyName: {
              type: Type.STRING,
              description:
                "Name of parent/reference body (optional, auto-detects if not specified). For transfers and altitude maneuvers.",
            },

            // For 'wait_for_transfer'
            phaseAngleError: {
              type: Type.NUMBER,
              description:
                "Phase angle error margin in degrees (e.g., 0.5-2.0). Required for 'wait_for_transfer'.",
            },

            // For 'wait_for_altitude' and 'burn_until_altitude'
            targetAltitude: {
              type: Type.NUMBER,
              description:
                "Target altitude in kilometers. Required for 'wait_for_altitude' and 'burn_until_altitude'.",
            },
            altitudeDirection: {
              type: Type.STRING,
              description:
                "'ascending' (going up) or 'descending' (going down). Required for 'wait_for_altitude'.",
            },
          },
          required: ["type"],
        },
      },
    },
    required: ["rocketName", "maneuvers"],
  },
};

const executeManeuverPlanTool: FunctionDeclaration = {
  name: "execute_maneuver_plan",
  description:
    "Execute the programmed flight plan for a rocket. This only activates the pending plan, it does not define it.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rocketName: { type: Type.STRING, description: "Name of the rocket." },
    },
    required: ["rocketName"],
  },
};

const getRocketTelemetryTool: FunctionDeclaration = {
  name: "get_rocket_telemetry",
  description:
    "Get current speed, distance to a target body, bearing, and relative velocity (Delta V) for a rocket.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rocketName: { type: Type.STRING, description: "Name of the rocket." },
      targetBodyName: {
        type: Type.STRING,
        description:
          "Name of the reference body (e.g. 'Earth', 'Moon'). Optional.",
      },
    },
    required: ["rocketName"],
  },
};

const addManualNodeTool: FunctionDeclaration = {
  name: "add_manual_node",
  description:
    "Add a manual maneuver node to a rocket's flight plan. This allows precise delta-V planning with prograde and radial components.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rocketName: { type: Type.STRING, description: "Name of the rocket." },
      timeFromNow: {
        type: Type.NUMBER,
        description:
          "Time in seconds from now when to execute the burn (e.g., 60 for 1 minute from now).",
      },
      deltaVPrograde: {
        type: Type.NUMBER,
        description:
          "Delta-V in the prograde direction in m/s. Positive = speed up, Negative = slow down.",
      },
      deltaVRadial: {
        type: Type.NUMBER,
        description:
          "Delta-V in the radial direction in m/s. Positive = radial out, Negative = radial in.",
      },
    },
    required: ["rocketName", "timeFromNow", "deltaVPrograde", "deltaVRadial"],
  },
};

const createModuleGroupTool: FunctionDeclaration = {
  name: "create_module_group",
  description: "Create a new visual group for Flight Computer modules.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Name of the group." },
      color: {
        type: Type.STRING,
        description: "Color of the group header (hex).",
      },
      parentGroupName: {
        type: Type.STRING,
        description: "Optional name of a parent group to nest this under.",
      },
    },
    required: ["name"],
  },
};

const addFlightComputerModuleTool: FunctionDeclaration = {
  name: "add_flight_computer_module",
  description:
    "Add a Flight Computer module. Supports ALL module types including logic, sensors, and controllers.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      moduleType: {
        type: Type.STRING,
        description:
          "Type of module: 'orbit_info', 'transfer_window', 'rendezvous_tracker', 'track_distance', 'track_velocity', 'body_info', 'body_by', 'lagrange_calculator', 'marker', 'line_drawer', 'circle_drawer', 'horizontal_bar', 'logic_gate', 'maths', 'button', 'selector', 'keyboard', 'slider', 'edge_detector', 'change_detector', 'wait', 'notify', 'beep', 'thrust_burst', 'maneuver_executor', 'follow', 'music_controller', 'custom_script', 'system_monitor'",
      },
      rocketName: {
        type: Type.STRING,
        description: "Primary subject (Rocket/Body name).",
      },
      referenceBodyName: {
        type: Type.STRING,
        description: "Reference body name (optional).",
      },
      targetBodyName: {
        type: Type.STRING,
        description: "Target body name (optional).",
      },
      customName: {
        type: Type.STRING,
        description: "Custom name for the module.",
      },
      groupName: {
        type: Type.STRING,
        description: "Name of the group to add this module to.",
      },
      color: { type: Type.STRING, description: "Hex color." },

      // Generic Configuration via JSON
      configuration: {
        type: Type.STRING,
        description:
          "JSON string containing specific configuration for the module type. Examples:\n" +
          "- Logic: { logicOperator: 'AND' }\n" +
          "- Notify: { comparisonOperator: '>', comparisonValue: 100, notifyMessage: 'Alert!' }\n" +
          "- Beep: { beepPitch: 440, beepRate: 4, beepTriggerMode: 'risiing' }\n" +
          "- Maths: { mathOperator: 'multiply', mathValueA: 2 }\n" +
          "- Slider: { sliderMin: 0, sliderMax: 100 }\n" +
          "- Marker: { markerShape: 'ring', markerTitle: 'POI' }\n",
      },
    },
    required: ["moduleType", "rocketName"],
  },
};

const removeFlightComputerModuleTool: FunctionDeclaration = {
  name: "remove_flight_computer_module",
  description: "Remove a Flight Computer module by its custom name.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      moduleName: {
        type: Type.STRING,
        description: "The custom name of the module to remove.",
      },
    },
    required: ["moduleName"],
  },
};

const updateFlightComputerModuleTool: FunctionDeclaration = {
  name: "update_flight_computer_module",
  description:
    "Update an existing Flight Computer module's configuration, including dashboard layout.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      moduleName: {
        type: Type.STRING,
        description: "Name of the module to update.",
      },
      configuration: {
        type: Type.STRING,
        description:
          "JSON string of properties to update. Merged into the module. \n" +
          "Examples:\n" +
          "- Dashboard: { dashboardConfig: { x: 0, y: 0, showTitle: true, customLabel: 'Altimeter' } }\n" +
          "- Inputs: { inputs: { primary: { type: 'body', value: 'Earth' } } }\n" +
          "- Settings: { color: '#ff0000', sliderMax: 50 }\n",
      },
    },
    required: ["moduleName", "configuration"],
  },
};

const getFlightComputerDataTool: FunctionDeclaration = {
  name: "get_flight_computer_data",
  description: "Get data from ALL active Flight Computer modules.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const toggleFlightComputerModuleTool: FunctionDeclaration = {
  name: "toggle_flight_computer_module",
  description: "Enable or disable a Flight Computer module by its custom name.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      moduleName: {
        type: Type.STRING,
        description: "The custom name of the module.",
      },
      enabled: {
        type: Type.BOOLEAN,
        description: "True to enable, false to disable.",
      },
    },
    required: ["moduleName", "enabled"],
  },
};

const getRocketFlightPlanTool: FunctionDeclaration = {
  name: "get_rocket_flight_plan",
  description:
    "Get detailed information about a rocket's flight plan including all maneuvers, their status (pending/active/completed), and current execution progress. Shows mission status and step-by-step breakdown.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rocketName: { type: Type.STRING, description: "Name of the rocket." },
    },
    required: ["rocketName"],
  },
};

const getBodyInfoTool: FunctionDeclaration = {
  name: "get_body_info",
  description:
    "Get detailed information about a specific body or all bodies. Returns physical properties like mass, radius, position, velocity. Does NOT return tracks or predictions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bodyName: {
        type: Type.STRING,
        description:
          "Optional name of the body to get info for. If omitted, returns info for all bodies.",
      },
    },
  },
};

export const createChatSession = (
  initialHistory: { role: "user" | "model"; text: string }[] = [],
) => {
  const systemInstruction = `You are "Cosmos", an omnipotent AI astronomer and controller of this N-body gravity simulation.
    
    You have DIRECT CONTROL over the simulation via tools. 
    - Creation/Destruction: Use 'spawn_body' to create bodies at orbital distances. Use 'spawn_body_complex' for precise placement with exact position and velocity vectors. Use 'delete_body' to remove planets. Use 'make_star' to ignite a planet into a sun.
    - Physics: Use 'control_simulation' for pause/speed. Use 'configure_physics' for gravity (G), collisions, and time steps.
    - Presets: Use 'change_preset' for 'solar', 'inner', 'binary', 'threebody', 'figure8', 'butterfly', 'moth', 'yinyang', 'equilateral', 'euler', 'trappist', 'random', or 'blank'.
    - Navigation: Use 'select_body' (info) or 'follow_body' (lock camera). Use 'follow_center_of_mass' to track the system's balance point.
    - Camera: Use 'set_camera' to zoom in/out or reset view.
    - Visuals: Use 'configure_visuals' to toggle effects OR tune them. You can control star density, twinkling, nebula opacity, trail lengths, show the center of mass, show eclipses (shadows), and more.
    - Rockets: You can 'spawn_rocket' on planets or in space. You can 'control_rocket' to rotate or thrust manually.
    - Telemetry: Use 'get_rocket_telemetry' to find a rocket's speed, or its distance/angle/delta-v relative to a planet.
    
    ADVANCED FLIGHT PLANNING:
    You can create sophisticated mission plans using 'program_advanced_flight_plan' with these maneuver types:
    
    1. BURN: Timed thrust burn
       - Parameters: thrust (0.001-0.1), duration (seconds), angleOffset (degrees)
       - Example: {type: "burn", thrust: 0.01, duration: 2.0, angleOffset: 0}
    
    2. WAIT: Passive coast for duration
       - Parameters: duration (seconds)
       - Example: {type: "wait", duration: 5.0}
    
    3. ROTATE: Turn rocket by degrees
       - Parameters: rotationAngle (degrees)
       - Example: {type: "rotate", rotationAngle: 90}
    
    4. SAS: Set stability assist mode
       - Parameters: sasMode ("off", "prograde", "retrograde", "radial_out", "radial_in")
       - Example: {type: "sas", sasMode: "prograde"}
    
    5. AUTO_LAND: Automatic landing on target
       - Parameters: targetBodyName
       - Example: {type: "auto_land", targetBodyName: "Moon"}
    
    6. AUTO_TRANSFER: Automatic Hohmann transfer
       - Parameters: targetBodyName, parentBodyName (optional)
       - Example: {type: "auto_transfer", targetBodyName: "Mars", parentBodyName: "Sun"}
    
    7. AUTO_CIRCULARIZE: Circularize current orbit
       - Parameters: targetBodyName
       - Example: {type: "auto_circularize", targetBodyName: "Earth"}
    
    8. WAIT_FOR_TRANSFER: Wait for optimal transfer window
       - Parameters: targetBodyName, parentBodyName (optional), phaseAngleError (degrees, e.g., 0.5-2.0)
       - Example: {type: "wait_for_transfer", targetBodyName: "Mars", phaseAngleError: 1.0}
    
    9. WAIT_FOR_ALTITUDE: Wait until reaching altitude
       - Parameters: targetAltitude (km), altitudeDirection ("ascending" or "descending"), parentBodyName (optional)
       - Example: {type: "wait_for_altitude", targetAltitude: 200, altitudeDirection: "ascending"}
       - Use "ascending" to wait for apoapsis, "descending" for periapsis
    
    11. CHANGE_SIMULATION_SPEED: Change simulation speed multiplier
        - Parameters: simulationSpeed (e.g., 0.1, 1, 10, 100, 1000)
        - Example: {type: "change_simulation_speed", simulationSpeed: 100}

    EXAMPLE MISSION PLANS:
    
    Earth to Moon Transfer:
    [
      {type: "burn_until_altitude", targetAltitude: 200, thrust: 0.01, angleOffset: 0},
      {type: "wait_for_altitude", targetAltitude: 190, altitudeDirection: "ascending"},
      {type: "change_simulation_speed", simulationSpeed: 10},
      {type: "sas", sasMode: "prograde"},
      {type: "wait_for_transfer", targetBodyName: "Moon", phaseAngleError: 1.0},
      {type: "change_simulation_speed", simulationSpeed: 100},
      {type: "auto_transfer", targetBodyName: "Moon"},
      {type: "change_simulation_speed", simulationSpeed: 1},
      {type: "auto_land", targetBodyName: "Moon"}
    ]
    
    Orbit Circularization:
    [
      {type: "wait_for_altitude", targetAltitude: 150, altitudeDirection: "ascending"},
      {type: "auto_circularize", targetBodyName: "Earth"}
    ]
    
    Simple Coast and Burn:
    [
      {type: "burn", thrust: 0.01, duration: 2.0, angleOffset: 0},
      {type: "wait", duration: 30.0},
      {type: "burn", thrust: 0.01, duration: 1.5, angleOffset: 180}
    ]
    
    To execute: Use 'execute_maneuver_plan' after programming.
    Use 'execute_maneuver_plan' to only when asked to execute. When a user ask to plan a mission or a maneuvre, do not execute it unless asked to.
    Note: Rocket mass is very small (0.001). Typical thrust values are 0.001 to 0.004 N.
    
    FLIGHT PLAN MONITORING:
    Use 'get_rocket_flight_plan' to get detailed status of a rocket's mission:
    - Shows all programmed maneuvers with their parameters
    - Status of each step: 'pending' (queued), 'active' (executing), 'completed' (done)
    - Current progress percentage for active maneuvers
    - Mission launch status (are maneuvers activated or just planned?)
    - Useful for monitoring mission execution and troubleshooting
    Example: Check if Apollo 11's transfer burn completed successfully
    
    MANUAL MANEUVER NODES:
    Use 'add_manual_node' to add precise delta-V nodes to a rocket's flight plan. This is useful for:
    - Fine-tuning orbital adjustments
    - Creating specific delta-V burns with prograde and radial components
    - Planning complex multi-burn sequences
    Example: {rocketName: "Explorer 1", timeFromNow: 120, deltaVPrograde: 50.5, deltaVRadial: -10.2}
    
    FLIGHT COMPUTER:
    The Flight Computer provides real-time calculations and tracking. Use these tools:

    1. ADD MODULE ('add_flight_computer_module'):
       Add new modules using the 'configuration' JSON for specific settings.
       RETURNS: JSON with the full module object including its ID. Use this ID to wire other modules to it.
       Example response: { "success": true, "message": "...", "module": { "id": "fc_1234567890_abc123", "type": "...", "inputs": {...}, ... } }
    
    2. UPDATE MODULE ('update_flight_computer_module'):
       Modify ANY aspect of an existing module using a JSON string.
       
       USE CASES:
       - Move on Dashboard: { dashboardConfig: { x: 2, y: 0 } } (Grid columns: 6, Rows: 4)
       - Change Settings: { comparisonValue: 500, color: "#ffff00" }
       - Rewire Inputs: { inputs: { target: { type: 'body', value: 'Moon' } } }
    
    3. GET DATA ('get_flight_computer_data'):
       Retrieves full state of active modules.
    
    4. CREATE GROUP ('create_module_group'):
       Create a named group to organize modules.
       Example: { name: "Launch Systems", color: "#ff0000" }
    
    5. REMOVE MODULE ('remove_flight_computer_module'):
       Remove a module by its custom name
    
    6. TOGGLE MODULE ('toggle_flight_computer_module'):
       Enable or disable a module without removing it

    AVAILABLE MODULE TYPES:
    - Info: 'orbit_info', 'transfer_window', 'rendezvous_tracker', 'track_distance', 'track_velocity', 'body_info', 'body_by', 'lagrange_calculator'
    - Visual: 'marker', 'line_drawer', 'circle_drawer', 'horizontal_bar'
    - Logic: 'logic_gate', 'maths', 'button', 'selector', 'keyboard', 'slider', 'edge_detector', 'change_detector', 'wait'
    - Actions: 'notify', 'beep', 'thrust_burst', 'maneuver_executor', 'follow', 'music_controller'
    - Advanced: 'custom_script', 'system_monitor'

    MODULE INPUT/OUTPUT WIRING SYSTEM:
    Modules communicate through a standardized input/output system. Each input can be either:
    1. A direct body reference: { "type": "body", "value": "<body-id>" }
    2. A module output reference: { "type": "module_output", "value": "<module-id>:<output-key>", "label": "<display-label>" }
    
    CRITICAL: When wiring modules together, you MUST use the module's actual ID (e.g., "fc_1765458284995_a1b2c3d").
    When you create a module with 'add_flight_computer_module', the response contains the full module object with its ID.
    Use that ID immediately to wire other modules to it without needing to call 'get_flight_computer_data'.
    
    INPUT FORMAT FOR MODULE OUTPUTS:
    {
      "inputs": {
        "<input-name>": {
          "type": "module_output",
          "value": "<module-id>:<output-key>",
          "label": "<Module Name> - <Output Name>"
        }
      }
    }
    
    EXAMPLE - Wiring a Logic Gate to a Notify module's output:
    Step 1: Create notify module -> response contains { "module": { "id": "fc_1765458284995_abc123", ... } }
    Step 2: Create logic_gate using that ID:
    {
      "configuration": "{ \\"inputs\\": { \\"inputA\\": { \\"type\\": \\"module_output\\", \\"value\\": \\"fc_1765458284995_abc123:triggered\\", \\"label\\": \\"Altitude Alert - Triggered\\" } } }"
    }
    
    EXAMPLE - Wiring a Rendezvous Tracker to a Lagrange Calculator's L2 output:
    Step 1: Create lagrange_calculator -> response contains { "module": { "id": "fc_1765458300000_xyz789", ... } }
    Step 2: Create rendezvous_tracker using that ID:
    {
      "configuration": "{ \\"inputs\\": { \\"target\\": { \\"type\\": \\"module_output\\", \\"value\\": \\"fc_1765458300000_xyz789:l2\\", \\"label\\": \\"Lagrange - L2 Point\\" } } }"
    }
    
    EXAMPLE - Wiring a Marker to show a custom_script's vector result:
    Step 1: Create custom_script -> response contains { "module": { "id": "fc_1765458400000_def456", ... } }
    Step 2: Create marker using that ID:
    {
      "configuration": "{ \\"inputs\\": { \\"position\\": { \\"type\\": \\"module_output\\", \\"value\\": \\"fc_1765458400000_def456:result\\", \\"label\\": \\"Script - Result (Vector)\\" } } }"
    }
    
    COMMON INPUT NAMES BY MODULE TYPE:
    - orbit_info: 'primary' (body/vector), 'reference' (body), 'activate' (boolean)
    - transfer_window: 'primary' (body), 'reference' (body), 'target' (body), 'activate' (boolean)
    - rendezvous_tracker: 'primary' (body/rocket), 'target' (body/vector), 'activate' (boolean)
    - track_distance/track_velocity: 'primary' (body), 'target' (body), 'activate' (boolean)
    - lagrange_calculator: 'body' (smaller body), 'reference' (larger body), 'activate' (boolean)
    - logic_gate: 'inputA' (boolean), 'inputB' (boolean), 'activate' (boolean)
    - maths: 'valueA' (scalar), 'valueB' (scalar), 'activate' (boolean)
    - notify: 'inputA' (scalar to compare), 'activate' (boolean)
    - marker: 'position' (body/vector), 'activate' (boolean)
    - thrust_burst: 'trigger' (boolean), 'activate' (boolean)
    - maneuver_executor: 'primary' (rocket), 'target' (body/vector), 'activate' (boolean)
    - custom_script: 'input0', 'input1', 'input2'... (any type), 'activate' (boolean)
    - body_info: 'target' (body)
    - body_by: 'value' (string - body name or ID)
    - line_drawer: 'point_a' (body/vector), 'point_b' (body/vector), 'activate' (boolean)
    - circle_drawer: 'position' (body/vector), 'radius' (scalar), 'activate' (boolean)
    
    COMMON OUTPUT KEYS BY MODULE TYPE:
    - orbit_info: 'altitude', 'periapsis', 'apoapsis', 'period', 'eccentricity', 'pe_point', 'pa_point', 'primary_body', 'reference_body'
    - transfer_window: 'ready', 'error', 'wait_time', 'transfer_time', 'insertion_point', 'intercept_point'
    - rendezvous_tracker: 'time', 'distance', 'delta_v_total', 'delta_v_prograde', 'delta_v_radial', 'position'
    - track_distance: 'distance'
    - track_velocity: 'speed'
    - lagrange_calculator: 'l1', 'l2', 'l3', 'l4', 'l5', 'body', 'reference_body'
    - logic_gate: 'result' (boolean)
    - maths: 'result' (scalar)
    - notify: 'triggered' (boolean)
    - button: 'state' (boolean)
    - keyboard: 'state' (boolean), 'key' (string)
    - slider: 'value' (scalar)
    - custom_script: 'result' (depends on customScriptOutputType), 'state' (boolean - async ready)
    - body_info: 'mass', 'radius', 'pos_x', 'pos_y', 'vel_x', 'vel_y', 'name', 'id', 'fuel', etc.
    - body_by: 'body'
    - selector: 'body'
    - edge_detector: 'triggered' (boolean)
    - change_detector: 'triggered' (boolean)
    - wait: 'triggered' (boolean), 'remaining_time' (scalar)
    - line_drawer: 'hit' (boolean), 'hit_position' (vector), 'length' (scalar), 'vector' (vector)
    - circle_drawer: 'foundObject' (boolean), 'objectId' (string), 'closestPoint' (vector)

    LAGRANGE POINT CALCULATOR MODULE ('lagrange_calculator'):
    Calculates the 5 Lagrange points for a two-body system (Sun-Earth, Earth-Moon, etc.).
    
    INPUTS:
    - 'body': The smaller mass body (e.g., Earth in Sun-Earth system, Moon in Earth-Moon system)
    - 'reference': The larger mass body (e.g., Sun in Sun-Earth system, Earth in Earth-Moon system)
    - 'activate': Boolean to enable/disable the module
    
    OUTPUTS (Vector2D positions in world coordinates):
    - 'l1': L1 point - Between the two bodies, closer to smaller body (unstable)
    - 'l2': L2 point - Beyond the smaller body, away from larger body (unstable)
    - 'l3': L3 point - Opposite side of larger body from smaller body (unstable)
    - 'l4': L4 point - Leading triangular point, 60 degrees ahead (stable, Trojan asteroids)
    - 'l5': L5 point - Trailing triangular point, 60 degrees behind (stable, Trojan asteroids)
    - 'body': Returns the resolved body input
    - 'reference_body': Returns the resolved reference body input
    
    USAGE EXAMPLE:
    To create a Lagrange calculator for the Sun-Earth system:
    {
      "moduleType": "lagrange_calculator",
      "rocketName": "Earth",  // Uses Earth as the 'body' input
      "referenceBodyName": "Sun",  // Uses Sun as the 'reference' input
      "customName": "Sun-Earth Lagrange Points"
    }
    
    Or with explicit configuration:
    {
      "moduleType": "lagrange_calculator",
      "customName": "Earth-Moon L Points",
      "configuration": "{ \\"inputs\\": { \\"body\\": { \\"type\\": \\"body\\", \\"value\\": \\"moon-id\\" }, \\"reference\\": { \\"type\\": \\"body\\", \\"value\\": \\"earth-id\\" } } }"
    }
    
    SCIENTIFIC NOTES:
    - L1, L2, L3 are collinear (unstable) - objects drift away without station-keeping
    - L4, L5 are triangular (stable) - form equilateral triangles with both bodies
    - L4 leads the smaller body in its orbit, L5 trails behind
    - Jupiter's Trojan asteroids occupy L4 and L5 of the Sun-Jupiter system
    - JWST orbits at Sun-Earth L2; SOHO orbits at Sun-Earth L1
    
    CHAINING WITH OTHER MODULES:
    The Lagrange point outputs can be used as targets for:
    - 'rendezvous_tracker': Track distance and delta-V to reach a Lagrange point
    - 'marker': Visualize Lagrange points on the canvas
    - 'maneuver_executor': Navigate to a Lagrange point

    CRITICAL: When analyzing data, you will receive body information. This data has been optimized. 
    Do NOT ask for or expect 'trail' or 'prediction' arrays in the Body objects as they are too large. 
    Rely on 'get_flight_computer_data' or 'get_rocket_telemetry' for dynamic values.

    ---
    ADVANCED: CUSTOM SCRIPTING
    You can write arbitrary JavaScript to control the simulation using the 'custom_script' module.
    
    CONFIG:
    {
      "moduleType": "custom_script",
      "configuration": JSON.stringify({
         "customScriptCode": "YOUR_JS_CODE_HERE",
         "customScriptOutputType": "scalar" | "boolean" | "vector",
         "customScriptMode": "sync" | "async" (default sync),
         "customScriptContinuousRun": true | false (default false)
      })
    }

    EXECUTION CONTEXT:
    Your code runs inside a function with these arguments: (input, console, game).
    
    1. 'input': Array of resolved values from module inputs (e.g., input[0], input[1]).
    2. 'console': Use console.log() for debugging (visible in module logs).
    3. 'game': The OMNIPOTENT access object.
       const game = {
                               bodies,
                               modules,
                               physicsConfig,
                               rendezvousPoints,
                               actions: {
                                   updateModule
                                   addModule,
                                   removeModule,
                                   toggleModule,
                                   setFollowingBody,
                                   updateRocket,
                                   handlePresetChange,
                                   setSpeed,
                                   setIsRunning,
                                   onReset,
                                   onTimeReverse
                                   onZoom,
                                   setNbColumns,
                                   setNbRows,
                                   setGap,
                                   handleUpdateCandidate,
                                   handleSpawnManual,
                                   setCreationCandidate,
                                   createAndSpawnBody,
                                   setShowImageSlideShow,
                                   nextImage,
                                   prevImage,
                                   handleJumpToImage,
                                   getApiValue,
                                   getApiValueAndReset,
                                   postApiValue,
                                   sleep,
                                   map01ToPI
                                   setShowCameraViewer
                                   setShowParralaxe,
                                   handleStageRocket
                               },
                               helpers: {
                                   formatTime: (totalSeconds: number) => formatTime(totalSeconds)
                               },
                               fps,
                               simulationTime,
                               scale,
                               isRunning,
                               speed,
                               nbColumns,
                               nbRows,
                               gap,
                           };

    EXAMPLE: AUTO-STAGING SCRIPT
    // Checks if fuel is empty and stages the rocket
    const rocket = game.bodies.find(b => b.id === input[0]); // Assumes input 0 is rocket ID
    if (rocket && rocket.fuel < 0.1) {
       console.log("Fuel empty! Staging...");
       game.actions.handleStageRocket(rocket.id);
       return 1; // Signal stage complete
    }
    return 0;

    IMPORTANT: Escape your code string properly within the JSON configuration.
    ---
    
    Flight Computer modules are persistent and update in real-time. 
    
    Be helpful, scientific, and concise. If you execute a tool, strictly confirm what you did in the text response.
    `;

  const tools: Tool[] = [
    {
      functionDeclarations: [
        spawnBodyTool,
        spawnBodyComplexTool,
        deleteBodyTool,
        makeStarTool,
        controlSimulationTool,
        changePresetTool,
        selectBodyTool,
        followBodyTool,
        followCenterOfMassTool,
        configureVisualsTool,
        configurePhysicsTool,
        setCameraTool,
        spawnRocketTool,
        controlRocketTool,
        programAdvancedFlightPlanTool,
        executeManeuverPlanTool,
        getRocketTelemetryTool,
        addManualNodeTool,
        getRocketFlightPlanTool,
        addFlightComputerModuleTool,
        updateFlightComputerModuleTool, // NEW
        removeFlightComputerModuleTool,
        getFlightComputerDataTool,
        toggleFlightComputerModuleTool,
        createModuleGroupTool,
        getBodyInfoTool,
      ],
    },
  ];

  const useGeminiPro = false;

  if (useGeminiPro) {
    return getAI().chats.create({
      model: "gemini-3-pro-preview",
      config: {
        systemInstruction,
        tools: tools,
        temperature: 0.7,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
      history: initialHistory.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });
  } else {
    return getAI().chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction,
        tools: tools,
        temperature: 0.7,
      },
      history: initialHistory.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });
  }
};

export const generateSpeech = async (
  text: string,
): Promise<string | undefined> => {
  try {
    const result = await getAI().models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return undefined;
  }
};
