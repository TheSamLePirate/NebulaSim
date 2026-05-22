import React, { useState } from 'react';
import { X, Check, ArrowRightLeft } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

interface BuilderPanelProps {
  onClose: () => void;
  onAddBody: (data: NewBodyData) => void;
}

export interface NewBodyData {
    name: string;
    mass: number;
    distance: number;
    velocity: number;
    color: string;
    radius: number;
}

const COLORS = ['#EB4D4B', '#22A6B3', '#D980FA', '#F79F1F', '#7ED6DF', '#BadC58', '#FFBE76'];

const BuilderPanel: React.FC<BuilderPanelProps> = ({ onClose, onAddBody }) => {
  const [name, setName] = useState('New Planet');
  const [mass, setMass] = useState(20);
  const [dist, setDist] = useState(250);
  const [vel, setVel] = useState(3.0);
  const [color, setColor] = useState(COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onAddBody({
          name,
          mass,
          distance: dist,
          velocity: vel,
          color,
          radius: Math.max(4, Math.log(mass) * 3) // Approx radius based on mass
      });
      onClose();
  };

  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div 
        className={`fixed ${isMobile ? `${isCollapsed ? 'bottom-20 h-auto' : 'top-0 bottom-20'} left-0 right-0 w-full` : 'top-16 bottom-16 left-0 w-96'} bg-slate-900/95 backdrop-blur-md border-r border-slate-700 shadow-2xl z-50 flex flex-col transition-all duration-300 ${!isMobile && isCollapsed ? 'w-12' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
    >
      <div className={`p-2 border-b border-slate-700 flex ${isCollapsed ? 'flex-col justify-start gap-4' : 'justify-between'} items-center bg-slate-800/50 transition-all`}>
        {!isCollapsed && (
          <h2 className="text-lg font-bold text-white">Create Body</h2>
        )}
        
        <div className={`flex ${isCollapsed ? 'flex-col' : ''} items-center gap-2`}>
          {!isCollapsed && (
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded">
              <X size={16} />
            </button>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ArrowRightLeft size={18} /> : <ArrowRightLeft size={18} className="rotate-180" />}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar relative">
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">Name</label>
                  <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                      maxLength={15}
                  />
              </div>

              <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">Mass (Gravity strength)</label>
                  <input 
                      type="range" min="1" max="1000" step="10" 
                      value={mass} onChange={e => setMass(Number(e.target.value))}
                      className="w-full"
                  />
                  <div className="text-right text-xs text-blue-300 font-mono">{mass} units</div>
              </div>

              <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">Distance from Center</label>
                  <input 
                      type="range" min="50" max="1000" step="10" 
                      value={dist} onChange={e => setDist(Number(e.target.value))}
                      className="w-full"
                  />
                  <div className="text-right text-xs text-blue-300 font-mono">{dist} units</div>
              </div>

              <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">Initial Tangential Velocity</label>
                  <input 
                      type="range" min="0" max="10" step="0.1" 
                      value={vel} onChange={e => setVel(Number(e.target.value))}
                      className="w-full"
                  />
                  <div className="text-right text-xs text-blue-300 font-mono">{vel.toFixed(1)} units/frame</div>
              </div>

              <div>
                  <label className="block text-xs text-slate-400 uppercase mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                      {COLORS.map(c => (
                          <button
                              key={c}
                              type="button"
                              onClick={() => setColor(c)}
                              style={{ backgroundColor: c }}
                              className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                          />
                      ))}
                  </div>
              </div>

              <button 
                  type="submit" 
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                  <Check size={18} /> Spawn Body
              </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default BuilderPanel;