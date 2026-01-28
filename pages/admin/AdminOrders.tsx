import React from 'react';
import { ShoppingCart } from 'lucide-react';

const AdminOrders: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Platform Orders</h1>
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center text-neutral-500 border-dashed">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>Wait for next phase: Global transaction monitoring and mediation.</p>
            </div>
        </div>
    );
};

export default AdminOrders;
