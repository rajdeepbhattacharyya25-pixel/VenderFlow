import React from 'react';
import { LoginModal } from '../LoginModal';
import { useNavigate } from 'react-router-dom';

const DashboardLogin = () => {
    const navigate = useNavigate();

    // If user closes modal, redirect to home
    const handleClose = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen relative bg-stone-950 flex items-center justify-center overflow-hidden">
            {/* Background Effects matching Storefront 'Discovery' section aesthetics */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20 opacity-100"></div>

            {/* Decorative Orbs */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

            {/* Content Container - z-index ensures it sits above background but modal has higher z-index */}
            <div className="relative z-10 text-center space-y-4 p-4">
                {/* Optional: Add a logo or welcome text behind the modal if needed, 
                    but LoginModal has its own backdrop which might obscure this. 
                    Since LoginModal renders with `fixed inset-0`, it will cover this entire div. 
                    So this background is strictly for what's visible *behind* the semi-transparent modal backdrop. 
                */}
            </div>

            <LoginModal
                isOpen={true}
                onClose={handleClose}
                initialMode="seller"
            />
        </div>
    );
};

export default DashboardLogin;
