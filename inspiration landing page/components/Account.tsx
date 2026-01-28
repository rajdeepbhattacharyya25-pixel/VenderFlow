import React, { useState, useRef } from 'react';
import { 
  IconUser, IconShoppingBag, IconHeart, IconTruck, IconChevronRight, 
  IconEdit, IconCamera, IconLock, IconMapPin, IconCreditCard, IconBell, 
  IconPhone, IconMessage, IconEmail, IconInstagram, IconLogOut, IconX, IconChevronDown,
  IconCheck, IconTrash, IconFilter, IconArrowLeft
} from './Icons';

interface AccountProps {
  onNavigate: (view: any) => void;
  showToast: (message: string) => void;
  onLogout: () => void;
}

interface AddressData {
  id: number;
  type: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
  building?: string;
  phone?: string;
}

export const Account: React.FC<AccountProps> = ({ onNavigate, showToast, onLogout }) => {
  // Enhanced Profile State
  const [profile, setProfile] = useState({
    firstName: 'Alex',
    lastName: 'Doe',
    email: 'alex.doe@example.com',
    phone: '', 
    altPhone: '',
    gender: 'Male',
    dob: '',
    avatar: null as string | null
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    delivery: true,
    offers: false
  });

  // Structured Address Data
  const [addresses, setAddresses] = useState<AddressData[]>([
    { id: 1, type: 'Home', street: '123 Fashion Ave', city: 'New York', state: 'NY', zip: '10001', isDefault: true, building: 'Apt 4B', phone: '+1 (555) 123-4567' },
    { id: 2, type: 'Work', street: '456 Tech Blvd', city: 'San Francisco', state: 'CA', zip: '94105', isDefault: false, building: 'Floor 4, Suite 200', phone: '+1 (555) 987-6543' },
  ]);

  // Address Editing State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressData>({
    id: 0,
    type: 'Home',
    street: '',
    city: '',
    state: '',
    zip: '',
    isDefault: false,
    building: '',
    phone: ''
  });

  const [cards, setCards] = useState([
    { id: 1, type: 'Visa', last4: '4242', expiry: '12/25', isDefault: true },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setProfile(prev => ({ ...prev, avatar: url }));
      showToast('Profile photo updated successfully');
    }
  };

  const handleSaveProfile = () => {
    if (profile.phone) {
        setAddresses(prev => prev.map(addr => 
            addr.isDefault ? { ...addr, phone: profile.phone } : addr
        ));
    }
    showToast('Personal information updated successfully');
  };

  // --- Address Management Handlers ---

  const handleOpenAddAddress = () => {
    setEditingAddress({
      id: 0,
      type: 'Home',
      street: '',
      city: '',
      state: '',
      zip: '',
      isDefault: false,
      building: '',
      phone: profile.phone || ''
    });
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: AddressData) => {
    setEditingAddress({ ...addr });
    setIsAddressModalOpen(true);
  };

  const handleAddressFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setEditingAddress(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveAddress = () => {
    if (!editingAddress.street || !editingAddress.city || !editingAddress.zip) {
        showToast("Please fill in required address fields");
        return;
    }

    if (editingAddress.phone) {
        setProfile(prev => ({ ...prev, phone: editingAddress.phone! }));
    }

    if (editingAddress.id === 0) {
      const newId = Date.now();
      const newAddress = { ...editingAddress, id: newId };
      
      setAddresses(prev => {
        let updated = [...prev];
        if (newAddress.isDefault) {
           updated = updated.map(a => ({ ...a, isDefault: false }));
        }
        return [...updated, newAddress];
      });
      showToast('New address added');
    } else {
      setAddresses(prev => {
         let updated = prev.map(a => a.id === editingAddress.id ? editingAddress : a);
         if (editingAddress.isDefault) {
            updated = updated.map(a => a.id === editingAddress.id ? a : { ...a, isDefault: false });
         }
         return updated;
      });
      showToast('Address updated');
    }
    setIsAddressModalOpen(false);
  };

  const handleDeleteAddress = (id: number) => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      setAddresses(prev => prev.filter(a => a.id !== id));
      showToast('Address deleted');
      if (editingAddress.id === id) setIsAddressModalOpen(false);
    }
  };

  const handleAddCard = () => {
    const num = prompt("Enter last 4 digits:", "8888");
    if (num) {
      const newCard = {
        id: Date.now(),
        type: 'Mastercard',
        last4: num,
        expiry: '01/28',
        isDefault: false
      };
      setCards(prev => [...prev, newCard]);
      showToast('New payment method added');
    }
  };

  const handleRemoveCard = (id: number) => {
    if (window.confirm("Remove this card?")) {
      setCards(prev => prev.filter(c => c.id !== id));
      showToast('Payment method removed');
    }
  };

  // --- MAIN ACCOUNT VIEW ---
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-24 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />

      <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-6 transition-colors">My Account</h1>

      {/* Personal Information Section */}
      <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-8 transition-colors">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <IconUser className="w-5 h-5 text-primary dark:text-primary-light" /> Personal Information
          </h2>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-500 transition-all text-xs font-bold uppercase tracking-wide"
          >
            <IconLogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar Area */}
          <div className="flex flex-col items-center gap-3 shrink-0">
             <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                <div className="w-28 h-28 rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-md transition-all group-hover:shadow-lg overflow-hidden">
                   {profile.avatar ? (
                     <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                        <IconUser className="w-12 h-12" />
                     </div>
                   )}
                   {/* Overlay */}
                   <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <IconCamera className="w-8 h-8 text-white" />
                   </div>
                </div>
                <div className="absolute bottom-0 right-1 w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center border border-gray-100 dark:border-gray-600 text-primary dark:text-primary-light">
                   <IconEdit className="w-4 h-4" />
                </div>
             </div>
             <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Tap to update</p>
          </div>

          {/* Form Fields */}
          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">First Name</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                  placeholder="Enter first name"
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Last Name</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                  placeholder="Enter last name"
                />
             </div>

             <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" 
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                    placeholder="name@example.com"
                  />
                  <IconEmail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Phone Number</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    name="phone"
                    value={profile.phone}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                    placeholder="+1 (555) 000-0000"
                  />
                  <IconPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
             </div>
             
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Alternate Phone</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    name="altPhone"
                    value={profile.altPhone}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                    placeholder="+1 (555) 000-0000"
                  />
                  <IconPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Gender</label>
                <select 
                  name="gender"
                  value={profile.gender}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Date of Birth</label>
                <input 
                  type="date" 
                  name="dob"
                  value={profile.dob}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all text-gray-500 dark:text-gray-400"
                />
             </div>

             <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                   <IconLock className="w-4 h-4" /> Change Password
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="px-8 py-3 rounded-xl bg-gray-900 dark:bg-primary text-white hover:bg-gray-800 dark:hover:bg-primary/90 font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                   <IconCheck className="w-4 h-4" /> Save Changes
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-8">
        
        {/* Info Grid (Orders, Wishlist, Addresses, Payments) */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* NEW: Orders Card */}
          <div 
            onClick={() => onNavigate('orders')}
            className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
               <IconShoppingBag className="w-24 h-24 dark:text-gray-600" />
             </div>
             <div className="relative z-10">
               <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <IconShoppingBag className="w-5 h-5" />
               </div>
               <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 transition-colors">My Orders</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 transition-colors">Track, return, or buy things again.</p>
               <span className="text-sm font-semibold text-green-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                 View Order History <IconChevronRight className="w-4 h-4" />
               </span>
             </div>
          </div>

          {/* Wishlist Card */}
          <div 
            onClick={() => onNavigate('wishlist')}
            className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
               <IconHeart className="w-24 h-24 dark:text-gray-600" />
             </div>
             <div className="relative z-10">
               <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <IconHeart className="w-5 h-5" fill />
               </div>
               <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 transition-colors">Wishlist</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 transition-colors">View and manage your saved items.</p>
               <span className="text-sm font-semibold text-red-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                 View Wishlist <IconChevronRight className="w-4 h-4" />
               </span>
             </div>
          </div>

          {/* Addresses Card */}
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors relative overflow-hidden">
             <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center">
                      <IconMapPin className="w-5 h-5" />
                   </div>
                   <h3 className="font-bold text-gray-900 dark:text-white text-lg transition-colors">Addresses</h3>
                </div>
                <button 
                  onClick={handleOpenAddAddress}
                  className="text-xs font-bold bg-gray-900 dark:bg-primary text-white px-3 py-1.5 rounded-full hover:bg-gray-800 dark:hover:bg-primary/90 transition-colors"
                >
                  + Add
                </button>
             </div>
             
             <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 relative z-10">
               {addresses.map(addr => (
                 <div 
                    key={addr.id} 
                    onClick={() => handleOpenEditAddress(addr)}
                    className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer transition-colors group"
                 >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-200 uppercase transition-colors">{addr.type}</span>
                        {addr.isDefault && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 rounded font-bold">DEFAULT</span>}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {addr.building ? `${addr.building}, ` : ''}{addr.street}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {addr.city}, {addr.state} - {addr.zip}
                      </p>
                      {addr.phone && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Ph: {addr.phone}</p>}
                    </div>
                    <div className="text-gray-400 group-hover:text-primary transition-colors p-1">
                       <IconEdit className="w-4 h-4" />
                    </div>
                 </div>
               ))}
               {addresses.length === 0 && (
                   <div className="text-center py-4 text-sm text-gray-400">No addresses saved yet.</div>
               )}
             </div>
          </div>

           {/* Payments Card */}
           <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-full flex items-center justify-center">
                      <IconCreditCard className="w-5 h-5" />
                   </div>
                   <h3 className="font-bold text-gray-900 dark:text-white text-lg transition-colors">Payments</h3>
                </div>
                <button 
                  onClick={handleAddCard}
                  className="text-xs font-bold bg-gray-900 dark:bg-primary text-white px-3 py-1.5 rounded-full hover:bg-gray-800 dark:hover:bg-primary/90 transition-colors"
                >
                  + Add
                </button>
             </div>
             <div className="space-y-3">
               {cards.map(card => (
                 <div key={card.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-5 bg-gray-800 dark:bg-gray-700 rounded flex items-center justify-center text-[8px] text-white font-bold tracking-widest uppercase">
                        {card.type}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-200 transition-colors">•••• {card.last4}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 transition-colors">Expires {card.expiry}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {card.isDefault && <span className="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">DEFAULT</span>}
                        <button 
                            onClick={() => handleRemoveCard(card.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                        >
                          <IconX className="w-3.5 h-3.5" />
                        </button>
                    </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Notifications Card */}
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-full flex items-center justify-center">
                   <IconBell className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg transition-colors">Notifications</h3>
             </div>
             <div className="space-y-4">
               {[
                 { key: 'delivery', label: 'Delivery Updates', sub: 'Get notified when your order is on the way.' },
                 { key: 'offers', label: 'Offers & Promotions', sub: 'Receive exclusive deals and discounts.' }
               ].map((item) => (
                 <div key={item.key} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-200 transition-colors">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">{item.sub}</p>
                    </div>
                    <button 
                      onClick={() => setNotifications(prev => {
                          const newVal = !prev[item.key as keyof typeof notifications];
                          showToast(`${item.label} ${newVal ? 'enabled' : 'disabled'}`);
                          return {...prev, [item.key]: newVal};
                      })}
                      className={`w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${notifications[item.key as keyof typeof notifications] ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                 </div>
               ))}
             </div>
          </div>

        </div>

        {/* Help & Support Section */}
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden transition-colors">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-2 transition-colors">Need Help? Reach Us Easily</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-lg mx-auto transition-colors">
              Our customer success team is here to assist you. We usually respond within a few hours during business hours.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-6">
              <a href="tel:+15551234567" className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group">
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-green-600 dark:text-green-400">
                  <IconPhone className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Call Us</span>
              </a>
              
              <a href="sms:+15551234567" className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors group">
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-teal-600 dark:text-teal-400">
                  <IconMessage className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Send SMS</span>
              </a>
              
              <a href="mailto:support@fashionstore.com" className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group">
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400">
                  <IconEmail className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Email Us</span>
              </a>
              
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors group">
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-pink-600 dark:text-pink-400">
                  <IconInstagram className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Instagram</span>
              </a>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Support Online 9 AM - 6 PM EST
            </div>
          </div>
        </div>

      </div>

      {/* Address Edit/Add Modal Overlay */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
           <div 
             className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
             onClick={() => setIsAddressModalOpen(false)}
           ></div>
           
           <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-t-2xl md:rounded-2xl shadow-2xl p-6 md:p-8 animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 relative">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white">
                    {editingAddress.id === 0 ? 'Add New Address' : 'Edit Address'}
                </h3>
                <button 
                  onClick={() => setIsAddressModalOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                >
                   <IconX className="w-5 h-5" />
                </button>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Label</label>
                   <div className="flex gap-3">
                      {['Home', 'Work', 'Other'].map(type => (
                         <button
                           key={type}
                           onClick={() => setEditingAddress(prev => ({...prev, type}))}
                           className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${editingAddress.type === type ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}
                         >
                            {type}
                         </button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Flat, House no., Building, Company, Apartment</label>
                   <input 
                      type="text" 
                      name="building" 
                      value={editingAddress.building || ''} 
                      onChange={handleAddressFormChange}
                      placeholder="e.g. Flat 101, Fashion Heights"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary transition-all text-sm text-gray-900 dark:text-white" 
                   />
                </div>

                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Area, Street, Sector, Village</label>
                   <input 
                      type="text" 
                      name="street" 
                      value={editingAddress.street} 
                      onChange={handleAddressFormChange}
                      placeholder="e.g. 123 Fashion Ave"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary transition-all text-sm text-gray-900 dark:text-white" 
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">City</label>
                      <input 
                        type="text" 
                        name="city" 
                        value={editingAddress.city} 
                        onChange={handleAddressFormChange}
                        placeholder="New York"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary transition-all text-sm text-gray-900 dark:text-white" 
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">State</label>
                      <input 
                        type="text" 
                        name="state" 
                        value={editingAddress.state} 
                        onChange={handleAddressFormChange}
                        placeholder="NY"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary transition-all text-sm text-gray-900 dark:text-white" 
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Pin Code</label>
                      <input 
                          type="text" 
                          name="zip" 
                          value={editingAddress.zip} 
                          onChange={handleAddressFormChange}
                          placeholder="110001"
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary transition-all text-sm text-gray-900 dark:text-white" 
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Phone Number</label>
                      <input 
                          type="tel" 
                          name="phone" 
                          value={editingAddress.phone || ''} 
                          onChange={handleAddressFormChange}
                          placeholder="10-digit mobile number"
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary transition-all text-sm text-gray-900 dark:text-white" 
                      />
                   </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                   <input 
                     type="checkbox" 
                     name="isDefault"
                     id="modalDefaultAddr"
                     checked={editingAddress.isDefault}
                     onChange={handleAddressFormChange}
                     className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                   />
                   <label htmlFor="modalDefaultAddr" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Set as default address</label>
                </div>

                <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
                   {editingAddress.id !== 0 && (
                      <button 
                        onClick={() => handleDeleteAddress(editingAddress.id)}
                        className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                         <IconTrash className="w-5 h-5" />
                      </button>
                   )}
                   <button 
                     onClick={handleSaveAddress}
                     className="flex-1 bg-primary hover:bg-green-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     Save Address
                   </button>
                </div>
             </div>
           </div>
        </div>
      )}

    </div>
  );
};