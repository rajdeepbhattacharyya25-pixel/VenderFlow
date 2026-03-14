import AdminApprovalPanel from './AdminApprovalPanel';

const AdminProducts: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Approvals & Moderation</h1>
            <AdminApprovalPanel />
        </div>
    );
};

export default AdminProducts;
