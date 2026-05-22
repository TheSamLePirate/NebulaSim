import React, { useEffect, useRef } from 'react';

interface VideoDisplayProps {
  stream: MediaStream | null;
  isMirrored: boolean;
}

export const VideoDisplay: React.FC<VideoDisplayProps> = ({ stream, isMirrored }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 w-full h-full bg-zinc-900 overflow-hidden flex items-center justify-center z-[80]">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''
            }`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          <span>No video signal</span>
        </div>
      )}
    </div>
  );
};