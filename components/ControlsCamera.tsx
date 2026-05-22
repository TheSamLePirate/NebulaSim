import React from 'react';
import { CameraDevice } from '../types';

interface ControlsProps {
  devices: CameraDevice[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  isMirrored: boolean;
  onToggleMirror: () => void;
  isLoading: boolean;
  error: string | null;
}

export const ControlsCamera: React.FC<ControlsProps> = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  isMirrored,
  onToggleMirror,
  isLoading,
  error
}) => {

  if (error) return null;

  return (
    <div className="flex flex-wrap gap-4 items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl w-full max-w-2xl mx-auto transition-all">

      {/* Device Selector */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
        </div>
        <select
          value={selectedDeviceId}
          onChange={(e) => onDeviceChange(e.target.value)}
          disabled={isLoading || devices.length === 0}
          className="appearance-none pl-10 pr-10 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-xl border border-zinc-700 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer w-64 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {devices.length === 0 ? (
            <option value="">Searching for cameras...</option>
          ) : (
            devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))
          )}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400 group-hover:text-zinc-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </div>
      </div>

      {/* Mirror Toggle Button */}
      <button
        onClick={onToggleMirror}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isMirrored
            ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
          }`}
        title="Mirror Video"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.5 21.5-3-3" /><path d="m21.5 5.5-3 3" /><path d="m21.5 13.5-3-3" /><path d="M2 12c0 5.5 4.5 10 10 10 1.5 0 2.9-.3 4.2-.9" /><path d="M12 2C6.5 2 2 6.5 2 12" /></svg>
        <span>{isMirrored ? 'Mirrored' : 'Normal'}</span>
      </button>

      {/* Device Count Badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-800 text-xs font-medium text-zinc-400">
        <div className={`w-2 h-2 rounded-full ${devices.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
        {devices.length} {devices.length === 1 ? 'Source' : 'Sources'}
      </div>
    </div>
  );
};