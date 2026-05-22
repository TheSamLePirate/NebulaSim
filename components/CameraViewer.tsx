import React, { useState, useEffect } from 'react';
import { useWebcam } from '../hooks/useWebcam';
import { VideoDisplay } from './VideoDisplay';
import { ControlsCamera } from './ControlsCamera';

const CameraViewer: React.FC = () => {
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [isMirrored, setIsMirrored] = useState<boolean>(false);

    // Use null initially to let the hook pick the default camera, then sync state
    const { stream, error, isLoading, devices, permissionDenied } = useWebcam(selectedDeviceId || null);

    // When devices load initially, set the selected ID to the active stream's device if possible
    useEffect(() => {
        if (!selectedDeviceId && devices.length > 0) {
            // Default to the first one if we don't know which is active, 
            // or rely on browser default (which the hook handles by passing null)
            // but syncing the select box is good UX.

            //select device with "Iphone" in label
            const device = devices.find((device) => device.label.includes('iPhone'));
            if (device) {
                setSelectedDeviceId(device.deviceId);
            }


        }
    }, [devices, selectedDeviceId]);

    return (

        <div className="absolute top-0 left-0 right-0 bottom-0 w-full h-full bg-zinc-950 flex flex-col p-4 md:p-8 overflow-hidden z-[70]">




            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-center w-full mx-auto gap-6 z-[70]">

                {/* Video Container */}
                <div className="w-full relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">

                        {/* Loading Overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
                                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                                <span className="text-zinc-400 text-sm font-medium animate-pulse">Initializing stream...</span>
                            </div>
                        )}

                        {/* Error Overlay */}
                        {error && (
                            <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">Camera Error</h3>
                                <p className="text-zinc-400 max-w-md mb-6">{error}</p>
                                {permissionDenied && (
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Try Again
                                    </button>
                                )}
                            </div>
                        )}

                        <VideoDisplay stream={stream} isMirrored={isMirrored} />
                    </div>
                </div>

                {/* Controls Bar */}
                {/* <ControlsCamera
                    devices={devices}
                    selectedDeviceId={selectedDeviceId}
                    onDeviceChange={setSelectedDeviceId}
                    isMirrored={isMirrored}
                    onToggleMirror={() => setIsMirrored(prev => !prev)}
                    isLoading={isLoading}
                    error={error}
                /> */}

            </main>
        </div>

    );
};

export default CameraViewer;


