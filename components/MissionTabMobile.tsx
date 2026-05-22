import React from "react";
import {
  Disc,
  Square,
  Play,
  Download,
  Upload,
  Save,
  Plus,
  Trash2,
  CircleDot,
  X,
} from "lucide-react";
import { MissionTabProps } from "./RocketMissionTab.types";
import { calculateTransferInfo } from "@/services/orbitalMath";
import { Maneuver } from "../types";

const MissionTabMobile: React.FC<MissionTabProps> = ({
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
}) => {
  if (!selectedRocket) {
    return null;
  }

  const maneuvers = selectedRocket.maneuvers ?? [];
  const hasActiveManeuver = maneuvers.some(
    (maneuver) => maneuver.status === "active",
  );

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
            <Disc size={14} /> Flight Recorder
          </h4>
          {isRecording && (
            <div className="text-[10px] text-red-500 font-bold animate-pulse flex items-center gap-1">
              <CircleDot size={8} fill="currentColor" /> REC
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={toggleRecording}
            className={`flex-1 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${isRecording ? "bg-slate-700 text-white" : "bg-red-900/30 text-red-400 border border-red-900/50"}`}
          >
            {isRecording ? (
              <Square size={14} fill="currentColor" />
            ) : (
              <Disc size={14} />
            )}
            {isRecording ? "STOP" : "START REC"}
          </button>
          <button
            onClick={handleLaunchPending}
            disabled={
              !maneuvers.some((maneuver) => maneuver.status === "pending")
            }
            className="flex-1 py-3 bg-green-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
          >
            <Play size={14} fill="currentColor" /> EXECUTE
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportFlightPlan}
            disabled={recordedManeuvers.length === 0}
            className="flex-1 py-2 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700 flex justify-center gap-1"
          >
            <Download size={12} /> EXPORT
          </button>
          <label className="flex-1 py-2 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700 flex justify-center gap-1 cursor-pointer">
            <Upload size={12} /> IMPORT
            <input
              type="file"
              accept=".json"
              onChange={handleImportFlightPlan}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Add Maneuver
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={maneuverType}
            onChange={(event) =>
              setManeuverType(event.target.value as Maneuver["type"])
            }
            className="col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="burn">Burn (Thrust)</option>
            <option value="wait">Wait (Coast)</option>
            <option value="rotate">Rotate (Turn)</option>
            <option value="sas">SAS (Stabilizer)</option>
            <option value="auto_circularize">Auto Circularize</option>
            <option value="auto_transfer">Auto Transfer</option>
            <option value="auto_intercept">Auto Intercept (Lambert)</option>
            <option value="manual_node">Manual Node</option>
            <option value="wait_for_transfer">Wait for Transfer Window</option>
            <option value="wait_for_altitude">Wait for Altitude</option>
            <option value="burn_until_altitude">Burn Until Altitude</option>
            <option value="change_simulation_speed">Change Sim Speed</option>
            <option value="stage">Stage Separation</option>
            <option value="auto_land">Auto Land</option>
          </select>
        </div>

        <div className="space-y-2">
          {maneuverType === "burn" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Thrust
                  </label>
                  <input
                    type="number"
                    value={thrustPower}
                    onChange={(event) =>
                      setThrustPower(parseFloat(event.target.value))
                    }
                    step="0.01"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Duration (s)
                  </label>
                  <input
                    type="number"
                    value={burstDuration}
                    onChange={(event) =>
                      setBurstDuration(parseFloat(event.target.value))
                    }
                    step="0.1"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Angle Offset (deg)
                </label>
                <input
                  type="number"
                  value={burstAngle}
                  onChange={(event) =>
                    setBurstAngle(parseFloat(event.target.value))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
            </>
          )}

          {maneuverType === "wait" && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                Duration (s)
              </label>
              <input
                type="number"
                value={burstDuration}
                onChange={(event) =>
                  setBurstDuration(parseFloat(event.target.value))
                }
                step="0.1"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
          )}

          {maneuverType === "rotate" && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                Rotation Angle (deg)
              </label>
              <input
                type="number"
                value={maneuverParam}
                onChange={(event) => setManeuverParam(event.target.value)}
                placeholder="e.g. 90 or -45"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
          )}

          {maneuverType === "sas" && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  SAS Mode
                </label>
                <select
                  value={maneuverParam}
                  onChange={(event) => setManeuverParam(event.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="">Select Mode...</option>
                  <option value="off">Off (Hold)</option>
                  <option value="prograde">Prograde</option>
                  <option value="retrograde">Retrograde</option>
                  <option value="radial_out">Radial Out</option>
                  <option value="radial_in">Radial In</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Reference Body (for orientation)
                </label>
                <select
                  value={maneuverParentId}
                  onChange={(event) => setManeuverParentId(event.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="">Auto-detect</option>
                  {bodies
                    .filter(
                      (body) => !body.isRocket && body.id !== selectedRocket.id,
                    )
                    .map((body) => (
                      <option key={body.id} value={body.id}>
                        {body.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {maneuverType === "auto_circularize" && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                Reference Body (to circularize around)
              </label>
              <select
                value={maneuverTargetId}
                onChange={(event) => setManeuverTargetId(event.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="">Select Body...</option>
                {bodies
                  .filter(
                    (body) => !body.isRocket && body.id !== selectedRocket.id,
                  )
                  .map((body) => (
                    <option key={body.id} value={body.id}>
                      {body.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {maneuverType === "auto_land" && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                Target Body (to land on)
              </label>
              <select
                value={maneuverTargetId}
                onChange={(event) => setManeuverTargetId(event.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="">Select Target...</option>
                {bodies
                  .filter(
                    (body) => !body.isRocket && body.id !== selectedRocket.id,
                  )
                  .map((body) => (
                    <option key={body.id} value={body.id}>
                      {body.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {(maneuverType === "auto_transfer" ||
            maneuverType === "wait_for_transfer" ||
            maneuverType === "auto_intercept") && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Target Body (Destination)
                </label>
                <select
                  value={maneuverTargetId}
                  onChange={(event) => setManeuverTargetId(event.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="">Select Target...</option>
                  {bodies
                    .filter(
                      (body) => !body.isRocket && body.id !== selectedRocket.id,
                    )
                    .map((body) => (
                      <option key={body.id} value={body.id}>
                        {body.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Reference Body (Current Orbit Parent)
                </label>
                <select
                  value={maneuverParentId}
                  onChange={(event) => setManeuverParentId(event.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="">Auto-detect</option>
                  {bodies
                    .filter(
                      (body) => !body.isRocket && body.id !== selectedRocket.id,
                    )
                    .map((body) => (
                      <option key={body.id} value={body.id}>
                        {body.name}
                      </option>
                    ))}
                </select>
              </div>
              {maneuverType === "wait_for_transfer" && (
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Phase Angle Error (deg)
                  </label>
                  <input
                    type="number"
                    value={maneuverParam}
                    onChange={(event) => setManeuverParam(event.target.value)}
                    placeholder="e.g. 0.5"
                    step="0.1"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              )}
              {maneuverType === "auto_intercept" && (
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Time of Flight (s)
                  </label>
                  <input
                    type="number"
                    value={maneuverParam}
                    onChange={(event) => setManeuverParam(event.target.value)}
                    placeholder="e.g. 30"
                    step="1"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
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
                  onChange={(event) =>
                    setNodeTime(parseFloat(event.target.value))
                  }
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
                    onChange={(event) =>
                      setDvPrograde(parseFloat(event.target.value))
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
                    onChange={(event) =>
                      setDvRadial(parseFloat(event.target.value))
                    }
                    step="1.0"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {maneuverType === "wait_for_altitude" && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Target Altitude (km)
                </label>
                <input
                  type="number"
                  value={maneuverParam}
                  onChange={(event) => setManeuverParam(event.target.value)}
                  placeholder="e.g. 100"
                  step="1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Direction
                </label>
                <select
                  value={altitudeDirection}
                  onChange={(event) =>
                    setAltitudeDirection(
                      event.target.value as "ascending" | "descending",
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="ascending">Ascending (Going Up)</option>
                  <option value="descending">Descending (Going Down)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Reference Body
                </label>
                <select
                  value={maneuverParentId}
                  onChange={(event) => setManeuverParentId(event.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="">Auto-detect</option>
                  {bodies
                    .filter(
                      (body) => !body.isRocket && body.id !== selectedRocket.id,
                    )
                    .map((body) => (
                      <option key={body.id} value={body.id}>
                        {body.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {maneuverType === "burn_until_altitude" && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Target Altitude (km)
                </label>
                <input
                  type="number"
                  value={maneuverParam}
                  onChange={(event) => setManeuverParam(event.target.value)}
                  placeholder="e.g. 100"
                  step="1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Thrust
                  </label>
                  <input
                    type="number"
                    value={thrustPower}
                    onChange={(event) =>
                      setThrustPower(parseFloat(event.target.value))
                    }
                    step="0.01"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Angle Offset (deg)
                  </label>
                  <input
                    type="number"
                    value={burstAngle}
                    onChange={(event) =>
                      setBurstAngle(parseFloat(event.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Reference Body
                </label>
                <select
                  value={maneuverParentId}
                  onChange={(event) => setManeuverParentId(event.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="">Auto-detect</option>
                  {bodies
                    .filter(
                      (body) => !body.isRocket && body.id !== selectedRocket.id,
                    )
                    .map((body) => (
                      <option key={body.id} value={body.id}>
                        {body.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {maneuverType === "change_simulation_speed" && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                New Speed Multiplier
              </label>
              <select
                value={maneuverParam}
                onChange={(event) => setManeuverParam(event.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="">Select Speed...</option>
                <option value="0.1">0.1x</option>
                <option value="1">1x</option>
                <option value="10">10x</option>
                <option value="100">100x</option>
                <option value="1000">1000x</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleAddManeuver}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded flex items-center justify-center gap-1 transition-colors"
        >
          <Plus size={14} />
          Add to Plan
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
          <span>Sequence Queue</span>
          {recordedManeuvers.length > 0 && (
            <button
              onClick={loadRecordedToFlightPlan}
              className="text-indigo-400 flex gap-1 items-center"
            >
              <Save size={12} /> Load Rec
            </button>
          )}
        </div>

        {hasActiveManeuver && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-2">
            <div className="text-[9px] text-green-400 font-bold uppercase mb-1 flex items-center gap-1">
              <Play size={10} /> Mission Executing
            </div>
            <div className="text-xs text-white font-mono">
              {(() => {
                const completedCount = maneuvers.filter(
                  (maneuver) => maneuver.status === "completed",
                ).length;
                const totalCount = maneuvers.length;
                return `Step ${completedCount + 1}/${totalCount}`;
              })()}
            </div>
          </div>
        )}

        <div className="bg-slate-900/50 rounded-lg p-2 max-h-[280px] overflow-y-auto space-y-1 border border-slate-800">
          {maneuvers.length === 0 && (
            <div className="text-[10px] text-slate-600 text-center italic py-2">
              Queue Empty
            </div>
          )}
          {maneuvers.map((maneuver) => {
            let progressInfo = "";
            let progressBar: React.ReactNode = null;
            let progressPercent = maneuver.progress * 100;

            if (maneuver.status === "active") {
              if (maneuver.type === "wait" || maneuver.type === "burn") {
                const remainingTime =
                  maneuver.duration * (1 - maneuver.progress);
                progressInfo = `${remainingTime.toFixed(1)}s left`;
                progressBar = (
                  <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: `${progressPercent.toFixed(0)}%` }}
                    />
                  </div>
                );
              } else if (
                maneuver.targetDeltaV &&
                maneuver.appliedDeltaV !== undefined
              ) {
                progressInfo = `${maneuver.appliedDeltaV.toFixed(1)}/${maneuver.targetDeltaV.toFixed(1)} m/s`;
                progressBar = (
                  <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-100"
                      style={{ width: `${progressPercent.toFixed(0)}%` }}
                    />
                  </div>
                );
              } else if (
                maneuver.type === "wait_for_altitude" ||
                maneuver.type === "burn_until_altitude"
              ) {
                const parentBody = bodies.find(
                  (body) => body.id === maneuver.parentBodyId,
                );
                if (parentBody) {
                  const dx = selectedRocket.position.x - parentBody.position.x;
                  const dy = selectedRocket.position.y - parentBody.position.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  const currentAlt = distance - parentBody.radius;
                  const targetAlt =
                    parseFloat(String(maneuver.param).split(":")[0]) || 100;
                  progressPercent = maneuver.progress * 100;
                  progressInfo = `${currentAlt.toFixed(1)}/${targetAlt.toFixed(1)}km`;
                  progressBar = (
                    <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all duration-100"
                        style={{ width: `${progressPercent.toFixed(0)}%` }}
                      />
                    </div>
                  );
                }
              } else if (maneuver.type === "wait_for_transfer") {
                const target = bodies.find(
                  (body) => body.id === maneuver.targetBodyId,
                );
                let referenceParent = bodies.find(
                  (body) => body.id === maneuver.parentBodyId,
                );
                if (!referenceParent && target) {
                  referenceParent = bodies
                    .filter((body) => !body.isRocket && body.id !== target.id)
                    .sort((a, b) => b.mass - a.mass)[0];
                }

                if (target && referenceParent) {
                  const transferInfo = calculateTransferInfo(
                    selectedRocket,
                    referenceParent,
                    target,
                    physicsConfig.gravitationalConstant,
                  );
                  const targetError = parseFloat(String(maneuver.param)) || 0.5;
                  progressPercent = 100 - Math.min(100, transferInfo.error);
                  progressInfo = `${transferInfo.error.toFixed(2)}° error - ${progressPercent.toFixed(0)}%`;
                  progressBar = (
                    <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-100 ${transferInfo.error < targetError ? "bg-green-500" : "bg-orange-500"}`}
                        style={{ width: `${progressPercent.toFixed(0)}%` }}
                      />
                    </div>
                  );
                }
              } else {
                progressInfo = `${progressPercent.toFixed(0)}%`;
                progressBar = (
                  <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-100"
                      style={{ width: `${progressPercent.toFixed(0)}%` }}
                    />
                  </div>
                );
              }
            }

            return (
              <div
                key={maneuver.id}
                onClick={() =>
                  maneuver.status === "pending" &&
                  setEditingManeuverId(maneuver.id)
                }
                className={`text-[10px] flex flex-col gap-1 p-1.5 rounded border transition-colors ${maneuver.status === "pending" ? "cursor-pointer hover:border-slate-500" : ""} ${
                  editingManeuverId === maneuver.id
                    ? "bg-indigo-900/40 border-indigo-500"
                    : maneuver.status === "active"
                      ? "bg-green-900/20 border-green-500/30"
                      : maneuver.status === "completed"
                        ? "bg-slate-800/50 border-transparent opacity-50"
                        : "bg-slate-800 border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      maneuver.status === "active"
                        ? "bg-green-500 animate-pulse"
                        : maneuver.status === "completed"
                          ? "bg-slate-600"
                          : "bg-orange-500"
                    }`}
                  />
                  <div className="flex-1 text-slate-300 min-w-0">
                    <span className="font-bold text-slate-200 mr-1">
                      {maneuver.type === "wait"
                        ? "WAIT"
                        : maneuver.type === "wait_for_transfer"
                          ? "WAIT TRANSFER"
                          : maneuver.type === "wait_for_altitude"
                            ? "WAIT ALT"
                            : maneuver.type === "burn_until_altitude"
                              ? "BURN TO ALT"
                              : maneuver.type === "change_simulation_speed"
                                ? "SET SPEED"
                                : maneuver.type === "manual_node"
                                  ? "NODE"
                                  : maneuver.type.startsWith("auto_")
                                    ? maneuver.type
                                        .replace("auto_", "AUTO ")
                                        .toUpperCase()
                                    : maneuver.type.toUpperCase()}
                    </span>
                    <span className="text-slate-500 font-mono text-[9px]">
                      {maneuver.type === "wait" || maneuver.type === "burn"
                        ? `${maneuver.duration.toFixed(1)}s`
                        : ""}
                      {maneuver.type === "burn"
                        ? ` @ ${(maneuver.thrust * 100).toFixed(0)}%`
                        : ""}
                      {maneuver.type === "manual_node"
                        ? `T+${(maneuver.timeFromNow || 0).toFixed(0)}s dV:${Math.sqrt((maneuver.deltaVPrograde || 0) ** 2 + (maneuver.deltaVRadial || 0) ** 2).toFixed(1)}`
                        : ""}
                      {maneuver.type === "rotate" ? `${maneuver.param}°` : ""}
                      {maneuver.type === "sas" ? `${maneuver.param}` : ""}
                      {maneuver.type === "change_simulation_speed"
                        ? `${maneuver.param}x`
                        : ""}
                      {maneuver.type === "wait_for_transfer"
                        ? `Err < ${maneuver.param}°`
                        : ""}
                      {maneuver.type === "wait_for_altitude" ||
                      maneuver.type === "burn_until_altitude"
                        ? `${maneuver.param}km`
                        : ""}
                      {maneuver.targetBodyId
                        ? ` -> ${bodies.find((body) => body.id === maneuver.targetBodyId)?.name.substring(0, 8)}`
                        : ""}
                    </span>
                  </div>
                  {maneuver.status === "pending" && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveManeuver(maneuver.id);
                      }}
                      className="text-slate-500 hover:text-red-400 flex-shrink-0"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                  {maneuver.status === "active" && (
                    <span className="text-green-400 font-mono text-[9px] flex-shrink-0">
                      {progressInfo}
                    </span>
                  )}
                </div>
                {progressBar}
              </div>
            );
          })}
        </div>
      </div>

      {editingManeuverId &&
        maneuvers.find(
          (maneuver) =>
            maneuver.id === editingManeuverId &&
            maneuver.type === "manual_node",
        ) && (
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-indigo-300 uppercase">
                Editing Manual Node
              </h4>
              <button
                onClick={() => setEditingManeuverId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Time to Burn (s)
              </label>
              <input
                type="number"
                value={nodeTime}
                onChange={(event) =>
                  setNodeTime(parseFloat(event.target.value))
                }
                step="0.1"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Prograde (m/s)
                </label>
                <input
                  type="number"
                  value={dvPrograde}
                  onChange={(event) =>
                    setDvPrograde(parseFloat(event.target.value))
                  }
                  step="0.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Radial Out (m/s)
                </label>
                <input
                  type="number"
                  value={dvRadial}
                  onChange={(event) =>
                    setDvRadial(parseFloat(event.target.value))
                  }
                  step="0.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 italic">
              Total ΔV: {Math.sqrt(dvPrograde ** 2 + dvRadial ** 2).toFixed(2)}{" "}
              m/s
            </div>
          </div>
        )}
    </div>
  );
};

export default MissionTabMobile;
