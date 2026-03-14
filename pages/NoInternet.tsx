import React from 'react';
import { RotateCcw, WifiOff } from 'lucide-react';

const NoInternet = () => {
    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 lg:p-12 bg-surface-light dark:bg-background-dark transition-colors duration-300">
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                {/* Visual Section */}
                <div className="order-1 lg:order-1 flex justify-center lg:justify-end relative">
                    {/* Decorative Elements for Desktop */}
                    <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-gray-100 to-gray-50 dark:from-surface-dark dark:to-transparent rounded-full opacity-0 lg:opacity-100 blur-3xl pointer-events-none" />

                    <div className="relative w-full max-w-[320px] md:max-w-[400px] lg:max-w-[500px]">
                        {/* We use a container to giving it a nice frame on desktop */}
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-surface-dark">
                            <img
                                src="/no-internet.gif"
                                alt="No Internet Animation"
                                className="w-full h-auto object-cover"
                            />
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="order-2 lg:order-2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium text-sm">
                            <WifiOff className="w-4 h-4" />
                            <span>Offline</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-medium text-gray-900 dark:text-gray-50 leading-[1.1]">
                            No Internet <br className="hidden lg:block" />
                            <span className="text-gray-400 dark:text-gray-600">Connection</span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-body max-w-lg leading-relaxed">
                            It seems you've lost connection to our servers. Check your network status and try again to continue using the platform.
                        </p>
                    </div>

                    <button
                        onClick={handleRetry}
                        className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-body font-medium text-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:scale-95"
                    >
                        <div className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                        <RotateCcw className="relative w-5 h-5 transition-transform duration-700 group-hover:rotate-180" />
                        <span className="relative">Try Reconnecting</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoInternet;
