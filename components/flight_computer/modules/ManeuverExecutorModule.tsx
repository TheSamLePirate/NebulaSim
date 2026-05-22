import React from "react";
import {
  Body,
  FlightComputerModule,
  FlightComputerInput,
  PhysicsConfig,
  RendezvousSolution,
  FlightComputerModuleType,
  Maneuver,
} from "../../../types";
import { resolveInput } from "../../../services/orbitalMath";
import {
  getInput,
  isModuleActive,
  MANEUVER_TYPE_OPTIONS,
  getUpdateForInput,
} from "../utils";
import InputSelector from "../InputSelector";
import { Play, Square } from "lucide-react";

interface ModuleProps {
  module: FlightComputerModule;
  bodies: Body[];
  modules: FlightComputerModule[];
  physicsConfig: PhysicsConfig;
  rendezvousSolutionMap: Record<string, RendezvousSolution>;
  onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
  onAddModule: (
    type: FlightComputerModuleType,
    inputs?: Record<string, FlightComputerInput>,
  ) => void;
}

const ManeuverExecutorModule: React.FC<ModuleProps> = ({
  module,
  bodies,
  modules,
  physicsConfig,
  rendezvousSolutionMap,
  onUpdateModule,
}) => {
  const execType = module.maneuverExecutorType || "burn";
  const execStatus = module.maneuverExecutorStatus || "idle";
  const execProgress = module.maneuverExecutorProgress ?? 0;

  const resolveVectorInputValue = (input?: FlightComputerInput) =>
    resolveInput(
      input,
      bodies,
      modules,
      physicsConfig.gravitationalConstant,
      rendezvousSolutionMap,
    );

  const executorRocket = resolveVectorInputValue(getInput(module, "primary"));
  const requiresTarget = [
    "auto_circularize",
    "auto_transfer",
    "auto_intercept",
    "auto_land",
    "wait_for_transfer",
  ].includes(execType);
  const requiresParent = [
    "auto_transfer",
    "wait_for_transfer",
    "auto_intercept",
    "wait_for_altitude",
    "burn_until_altitude",
    "sas",
  ].includes(execType);
  const targetSelected =
    module.maneuverExecutorTargetBodyId || module.targetBodyId;
  const parentSelected =
    module.maneuverExecutorParentBodyId || module.referenceBodyId;
  const canExecute =
    !!executorRocket &&
    (!requiresTarget || targetSelected) &&
    (!requiresParent || parentSelected);
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round(execProgress * 100)),
  );

  const queueExecutor = () => {
    onUpdateModule(module.id, {
      maneuverExecutorRequestId: Date.now(),
      maneuverExecutorStatus: "queued",
      maneuverExecutorProgress: 0,
    });
  };

  const cancelExecutor = () => {
    onUpdateModule(module.id, {
      maneuverExecutorActiveManeuverId: undefined,
      maneuverExecutorStatus: "idle",
      maneuverExecutorProgress: 0,
      maneuverExecutorRequestId: undefined,
    });
  };

  const handleFieldChange = (patch: Partial<FlightComputerModule>) =>
    onUpdateModule(module.id, patch);

  const moduleActive = isModuleActive(
    module,
    bodies,
    modules,
    physicsConfig,
    rendezvousSolutionMap,
  );

  return (
    <div className="mt-2 space-y-3">
      <div>
        <label className="text-[9px] text-slate-500 uppercase block mb-1">
          Maneuver Type
        </label>
        <select
          value={execType}
          onChange={(e) =>
            handleFieldChange({
              maneuverExecutorType: e.target.value as Maneuver["type"],
            })
          }
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
        >
          {MANEUVER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {["burn", "burn_until_altitude"].includes(execType) && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Thrust
            </label>
            <input
              type="number"
              step="0.001"
              value={module.maneuverExecutorThrust ?? 0}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorThrust: parseFloat(e.target.value),
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Duration (s)
            </label>
            <input
              type="number"
              step="0.1"
              value={module.maneuverExecutorDuration ?? 0}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorDuration: parseFloat(e.target.value),
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Angle (deg)
            </label>
            <input
              type="number"
              step="1"
              value={module.maneuverExecutorAngleDeg ?? 0}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorAngleDeg: parseFloat(e.target.value),
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            />
          </div>
        </div>
      )}

      {execType === "wait" && (
        <div>
          <label className="text-[9px] text-slate-500 uppercase block mb-1">
            Duration (s)
          </label>
          <input
            type="number"
            step="0.1"
            value={module.maneuverExecutorDuration ?? 0}
            onChange={(e) =>
              handleFieldChange({
                maneuverExecutorDuration: parseFloat(e.target.value),
              })
            }
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          />
        </div>
      )}

      {execType === "rotate" && (
        <div>
          <label className="text-[9px] text-slate-500 uppercase block mb-1">
            Rotation (deg)
          </label>
          <input
            type="number"
            value={Number(module.maneuverExecutorParam ?? 0)}
            onChange={(e) =>
              handleFieldChange({
                maneuverExecutorParam: parseFloat(e.target.value),
              })
            }
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          />
        </div>
      )}

      {execType === "sas" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Mode
            </label>
            <select
              value={(module.maneuverExecutorParam as string) || "prograde"}
              onChange={(e) =>
                handleFieldChange({ maneuverExecutorParam: e.target.value })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="off">Off</option>
              <option value="prograde">Prograde</option>
              <option value="retrograde">Retrograde</option>
              <option value="radial_out">Radial Out</option>
              <option value="radial_in">Radial In</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Reference Body
            </label>
            <select
              value={module.maneuverExecutorParentBodyId || ""}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorParentBodyId: e.target.value || undefined,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="">Auto</option>
              {bodies
                .filter((b) => !b.isRocket)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {[
        "auto_circularize",
        "auto_transfer",
        "auto_intercept",
        "auto_land",
        "wait_for_transfer",
      ].includes(execType) && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Target Body
            </label>
            <select
              value={module.maneuverExecutorTargetBodyId || ""}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorTargetBodyId: e.target.value || undefined,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="">Select...</option>
              {bodies
                .filter((b) => !b.isRocket)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Parent Body
            </label>
            <select
              value={module.maneuverExecutorParentBodyId || ""}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorParentBodyId: e.target.value || undefined,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="">Auto</option>
              {bodies
                .filter((b) => !b.isRocket)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {execType === "auto_intercept" && (
        <div>
          <label className="text-[9px] text-slate-500 uppercase block mb-1">
            Time of Flight (s)
          </label>
          <input
            type="number"
            step="1"
            value={Number(module.maneuverExecutorParam ?? 30)}
            onChange={(e) =>
              handleFieldChange({
                maneuverExecutorParam: parseFloat(e.target.value),
              })
            }
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          />
        </div>
      )}

      {execType === "wait_for_transfer" && (
        <div>
          <label className="text-[9px] text-slate-500 uppercase block mb-1">
            Phase Error (deg)
          </label>
          <input
            type="number"
            step="0.1"
            value={Number(module.maneuverExecutorParam ?? 1)}
            onChange={(e) =>
              handleFieldChange({
                maneuverExecutorParam: parseFloat(e.target.value),
              })
            }
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          />
        </div>
      )}

      {execType === "wait_for_altitude" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-slate-500 uppercase block mb-1">
                Altitude
              </label>
              <input
                type="number"
                value={Number(module.maneuverExecutorParam ?? 0)}
                onChange={(e) =>
                  handleFieldChange({
                    maneuverExecutorParam: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase block mb-1">
                Direction
              </label>
              <select
                value={module.maneuverExecutorAltitudeDirection || "ascending"}
                onChange={(e) =>
                  handleFieldChange({
                    maneuverExecutorAltitudeDirection: e.target.value as
                      | "ascending"
                      | "descending",
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="ascending">Ascending</option>
                <option value="descending">Descending</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Reference Body
            </label>
            <select
              value={module.maneuverExecutorParentBodyId || ""}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorParentBodyId: e.target.value || undefined,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="">Auto</option>
              {bodies
                .filter((b) => !b.isRocket)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {execType === "burn_until_altitude" && (
        <div className="space-y-2">
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Target Altitude
            </label>
            <input
              type="number"
              value={Number(module.maneuverExecutorParam ?? 0)}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorParam: parseFloat(e.target.value),
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Reference Body
            </label>
            <select
              value={module.maneuverExecutorParentBodyId || ""}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorParentBodyId: e.target.value || undefined,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="">Auto</option>
              {bodies
                .filter((b) => !b.isRocket)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {execType === "manual_node" && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-slate-500 uppercase block mb-1">
                Time (s)
              </label>
              <input
                type="number"
                value={module.maneuverExecutorDuration ?? 0}
                onChange={(e) =>
                  handleFieldChange({
                    maneuverExecutorDuration: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase block mb-1">
                ΔV Prograde
              </label>
              <input
                type="number"
                value={module.maneuverExecutorDeltaVPrograde ?? 0}
                onChange={(e) =>
                  handleFieldChange({
                    maneuverExecutorDeltaVPrograde: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase block mb-1">
                ΔV Radial
              </label>
              <input
                type="number"
                value={module.maneuverExecutorDeltaVRadial ?? 0}
                onChange={(e) =>
                  handleFieldChange({
                    maneuverExecutorDeltaVRadial: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Reference Body
            </label>
            <select
              value={module.maneuverExecutorParentBodyId || ""}
              onChange={(e) =>
                handleFieldChange({
                  maneuverExecutorParentBodyId: e.target.value || undefined,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="">Auto</option>
              {bodies
                .filter((b) => !b.isRocket)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {execType === "change_simulation_speed" && (
        <div>
          <label className="text-[9px] text-slate-500 uppercase block mb-1">
            Speed Multiplier
          </label>
          <select
            value={String(module.maneuverExecutorParam ?? 1)}
            onChange={(e) =>
              handleFieldChange({
                maneuverExecutorParam: Number(e.target.value),
              })
            }
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          >
            {[0.1, 1, 10, 100, 1000].map((val) => (
              <option key={val} value={val}>
                {val}x
              </option>
            ))}
          </select>
        </div>
      )}

      {execType === "stage" && (
        <div className="text-[9px] text-slate-400 italic px-1">
          Jettisons the active stage of a multi-stage rocket. No parameters
          needed — executes instantly.
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-slate-700/30">
        <InputSelector
          label="Plan Trigger (Bool)"
          value={getInput(module, "queueTrigger")}
          onChange={(input) =>
            onUpdateModule(
              module.id,
              getUpdateForInput(module, "queueTrigger", input),
            )
          }
          bodies={bodies}
          modules={modules}
          currentModuleId={module.id}
          allowedTypes={["boolean", "module_output"]}
        />
        <InputSelector
          label="Execute Trigger (Bool)"
          value={getInput(module, "executeTrigger")}
          onChange={(input) =>
            onUpdateModule(
              module.id,
              getUpdateForInput(module, "executeTrigger", input),
            )
          }
          bodies={bodies}
          modules={modules}
          currentModuleId={module.id}
          allowedTypes={["boolean", "module_output"]}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={queueExecutor}
          disabled={!canExecute || !moduleActive}
          className={`w-full py-2 text-xs font-bold rounded flex items-center justify-center gap-1 ${canExecute && moduleActive ? "bg-green-600 hover:bg-green-500 text-white" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
        >
          <Play size={12} /> Execute
        </button>
        <button
          onClick={cancelExecutor}
          disabled={!module.maneuverExecutorActiveManeuverId}
          className={`w-full py-2 text-xs font-bold rounded flex items-center justify-center gap-1 ${module.maneuverExecutorActiveManeuverId ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
        >
          <Square size={12} /> Cancel
        </button>
      </div>

      <div className="bg-slate-900/40 rounded p-2 border border-slate-800 space-y-1">
        <div className="flex justify-between text-[10px] uppercase">
          <span className="text-slate-400">Status</span>
          <span className="text-slate-200 font-bold">
            {execStatus.toUpperCase()}
          </span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`${execStatus === "running" ? "bg-green-500" : "bg-slate-500"} h-full transition-all`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 text-right">
          {progressPercent}%
        </div>
      </div>
      <div className="text-[9px] text-slate-500 italic">
        Configure the maneuver parameters and execute to push it onto the
        rocket's mission queue. Progress mirrors the main mission planner.
      </div>
    </div>
  );
};

export default ManeuverExecutorModule;
