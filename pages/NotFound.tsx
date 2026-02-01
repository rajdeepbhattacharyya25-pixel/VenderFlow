import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home } from 'lucide-react';
import '../components/OfflineOverlay.css'; // Reuse spotlight animations

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center relative overflow-hidden font-body p-4">

            {/* --- VISUAL EFFECTS (Reusing OfflineOverlay styles) --- */}
            {/* Spotlight Layer */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="spotlight-container swing-mechanism" style={{ opacity: 0.6 }}>
                    <div className="spotlight-source" />
                    <div className="spotlight-beam" />
                </div>
            </div>

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#0a0a0a_90%)]" />

            {/* --- PHYSICS REVEAL LAYER (404 Text) --- */}
            {/* Positioned absolutely to sync with the beam which is page-relative */}
            <div className="wifi-physics-layer">
                {/* The Target: 404 Text */}
                <h1 className="four-oh-four-target text-[120px] md:text-[180px] font-display font-bold leading-none tracking-tighter select-none">
                    404
                </h1>

                {/* The Mask Container */}
                <div className="wifi-mask-container">
                    <div className="swing-mechanism">
                        {/* The Mask Hole (Beam) */}
                        <div className="wifi-mask-beam" />
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center mt-32">

                {/* Spacer to maintain layout since 404 is now absolute */}
                <div className="h-[180px] w-full" aria-hidden="true" />

                <div className="animate-in slide-in-from-bottom-10 fade-in duration-700 delay-300 mt-12 flex flex-col items-center">

                    <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                        <h2 className="offline-title m-0 text-3xl md:text-5xl underline decoration-double decoration-white decoration-1 underline-offset-8">
                            Lost in the Void?
                        </h2>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] text-sm md:text-base whitespace-nowrap"
                        >
                            <Home size={18} />
                            Go Home
                        </button>
                    </div>

                    <p className="text-neutral-400 text-lg max-w-lg mx-auto mb-10 leading-relaxed typewriter">
                        Page not found. It may have moved or never existed !
                    </p>
                </div>

            </div>
        </div>
    );
};

export default NotFound;
