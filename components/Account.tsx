import React, { useState, useRef, useEffect } from 'react';
import {
  IconUser, IconShoppingBag, IconHeart, IconTruck, IconChevronRight,
  IconEdit, IconCamera, IconLock, IconMapPin, IconCreditCard, IconBell,
  IconPhone, IconMessage, IconEmail, IconInstagram, IconLogOut, IconX, IconChevronDown,
  IconCheck, IconTrash, IconFilter, IconArrowLeft, IconPlus
} from './Icons';
import { supabase } from '../lib/supabase';
import { updateStoreCustomer, getStoreCards, addStoreCard, deleteStoreCard, StoreCard } from '../lib/storeAuth';

interface AccountProps {
  onNavigate: (view: any) => void;
  showToast: (message: string) => void;
  onLogout: () => void;
  storeCustomer?: any;
}

interface AddressData {
  id: string | number; // Support UUIDs
  type: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
  building?: string;
  phone?: string;
}

export const Account: React.FC<AccountProps> = ({ onNavigate, showToast, onLogout, storeCustomer }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Enhanced Profile State
  const [profile, setProfile] = useState({
    firstName: 'Alex',
    lastName: 'Doe',
    email: 'alex.doe@example.com',
    phone: '+91 ',
    altPhone: '',
    gender: 'Male',
    dob: '',
    avatar: null as string | null
  });

  const [notifications, setNotifications] = useState({
    delivery: true,
    offers: false
  });

  // Structured Address Data
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [cards, setCards] = useState<StoreCard[]>([]);

  // Address Editing State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
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
  const [editingCard, setEditingCard] = useState({
    last4: '',
    expiry: '12/28',
    type: 'Visa',
    isDefault: false
  });


  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUser();
    if (storeCustomer) {
      fetchAddresses();
      fetchCards();
    }
  }, [storeCustomer]);

  const fetchCards = async () => {
    if (!storeCustomer) return;
    const data = await getStoreCards(
      storeCustomer.customer_id || storeCustomer.id,
      storeCustomer.seller_id
    );
    setCards(data);
  };

  const fetchAddresses = async () => {
    if (!storeCustomer) return;

    const { data } = await supabase
      .from('store_addresses')
      .select('*')
      .eq('customer_id', storeCustomer.customer_id || storeCustomer.id)
      .order('is_default', { ascending: false });

    if (data) {
      setAddresses(data.map(addr => ({
        id: addr.id,
        type: addr.type,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        isDefault: addr.is_default,
        building: addr.building,
        phone: addr.phone
      })));
    }
  };

  const checkUser = async () => {
    // If storeCustomer is provided, try to use it
    if (storeCustomer) {
      setUser(storeCustomer);

      // Self-healing: If data missing, try to get from Supabase Auth User
      let derivedMeta = storeCustomer.metadata || {};
      let derivedName = storeCustomer.display_name || "";
      let derivedAvatar = storeCustomer.avatar_url || "";

      if (!derivedMeta.first_name || !derivedName) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.user_metadata) {
          const meta = authUser.user_metadata;
          const parts = [];
          if (meta.given_name) parts.push(meta.given_name);
          if (meta.family_name) parts.push(meta.family_name);

          const googleName = parts.length > 0 ? parts.join(' ') : (meta.full_name || meta.name || "");

          // Fill missing holes
          if (!derivedName || derivedName === "undefined undefined") derivedName = googleName || authUser.email?.split('@')[0] || "";

          if (!derivedMeta.first_name || derivedMeta.first_name === "undefined") {
            derivedMeta.first_name = meta.given_name || derivedName.split(' ')[0] || "";
          }
          if (!derivedMeta.last_name || derivedMeta.last_name === "undefined") {
            derivedMeta.last_name = meta.family_name || derivedName.split(' ').slice(1).join(' ') || "";
          }
          if (!derivedAvatar) derivedAvatar = meta.avatar_url || meta.picture || "";

          // Background Update (Fire and forget)
          if (storeCustomer.seller_id) {
            updateStoreCustomer(storeCustomer.seller_id, storeCustomer.id, {
              display_name: derivedName,
              avatar_url: derivedAvatar,
              metadata: { ...derivedMeta, source: 'google_healing_v2' }
            });
          }
        }
      }

      // Handle bad data in existing state
      if (derivedName === "undefined undefined") derivedName = "";

      const fullName = derivedName ||
        storeCustomer.user_metadata?.full_name ||
        storeCustomer.user_metadata?.name || "";

      setProfile(prev => ({
        ...prev,
        firstName: (derivedMeta.first_name && derivedMeta.first_name !== "undefined") ? derivedMeta.first_name : (fullName.split(' ')[0] || ''),
        lastName: (derivedMeta.last_name && derivedMeta.last_name !== "undefined") ? derivedMeta.last_name : (fullName.split(' ').slice(1).join(' ') || ''),
        email: storeCustomer.email,
        phone: storeCustomer.phone || prev.phone,
        altPhone: storeCustomer.alt_phone || prev.altPhone,
        gender: storeCustomer.gender || prev.gender,
        dob: storeCustomer.dob || prev.dob,
        avatar: derivedAvatar || prev.avatar
      }));

      if (storeCustomer.metadata && typeof storeCustomer.metadata === 'object' && storeCustomer.metadata.notifications) {
        setNotifications(storeCustomer.metadata.notifications);
      }

      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
    // ... rest of google auth fallback ...
  };

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
      // TODO: Upload to Supabase Storage in real app
      showToast('Profile photo updated (local preview only)');
    }
  };

  const handleSaveProfile = async () => {
    if (!storeCustomer) {
      showToast('Please login to save profile');
      return;
    }

    const updates = {
      display_name: `${profile.firstName} ${profile.lastName}`.trim(),
      phone: profile.phone,
      alt_phone: profile.altPhone,
      gender: profile.gender,
      dob: profile.dob,
      avatar_url: profile.avatar,
      metadata: {
        ...storeCustomer.metadata,
        first_name: profile.firstName,
        last_name: profile.lastName,
        notifications
      }
    };

    const { success, error } = await updateStoreCustomer(
      storeCustomer.seller_id,
      storeCustomer.customer_id || storeCustomer.id,
      updates
    );

    if (success) {
      showToast('Personal information saved');
      // Update local state by merging updates
      setUser((prev: any) => ({ ...prev, ...updates }));
    } else {
      showToast(error || 'Failed to save changes');
    }
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
      isDefault: false, // Default to false for new
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

  const handleSaveAddress = async () => {
    if (!editingAddress.street || !editingAddress.city || !editingAddress.zip) {
      showToast("Please fill in required address fields");
      return;
    }

    if (!storeCustomer) return;

    const addressData = {
      customer_id: storeCustomer.customer_id || storeCustomer.id,
      seller_id: storeCustomer.seller_id,
      type: editingAddress.type,
      street: editingAddress.street,
      building: editingAddress.building,
      city: editingAddress.city,
      state: editingAddress.state,
      zip: editingAddress.zip,
      phone: editingAddress.phone,
      is_default: editingAddress.isDefault
    };

    // If setting default, unset others locally first for UI responsiveness
    if (editingAddress.isDefault) {
      // Ideally run a transaction or batch update, but sequential is fine for now
      await supabase.from('store_addresses')
        .update({ is_default: false })
        .eq('customer_id', storeCustomer.customer_id || storeCustomer.id);
    }

    if (editingAddress.id === 0) {
      // Create
      const { data, error } = await supabase
        .from('store_addresses')
        .insert(addressData)
        .select()
        .single();

      if (error) {
        console.error(error);
        showToast('Failed to add address');
        return;
      }
      showToast('New address added');
    } else {
      // Update
      const { error } = await supabase
        .from('store_addresses')
        .update(addressData)
        .eq('id', editingAddress.id);

      if (error) {
        console.error(error);
        showToast('Failed to update address');
        return;
      }
      showToast('Address updated');
    }

    fetchAddresses(); // Refresh list
    setIsAddressModalOpen(false);
  };

  const handleDeleteAddress = async (id: string | number) => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      const { error } = await supabase
        .from('store_addresses')
        .delete()
        .eq('id', id);

      if (error) {
        showToast('Failed to delete');
        return;
      }

      setAddresses(prev => prev.filter(a => a.id !== id));
      showToast('Address deleted');
      if (editingAddress.id === id) setIsAddressModalOpen(false);
    }
  };

  const handleOpenAddCard = () => {
    setEditingCard({
      last4: '',
      expiry: '12/28',
      type: 'Visa',
      isDefault: cards.length === 0
    });
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async () => {
    if (!editingCard.last4 || editingCard.last4.length !== 4) {
      showToast("Please enter the last 4 digits");
      return;
    }

    if (!storeCustomer) return;

    const { success, card, error } = await addStoreCard({
      customer_id: storeCustomer.customer_id || storeCustomer.id,
      seller_id: storeCustomer.seller_id,
      type: editingCard.type,
      last4: editingCard.last4,
      expiry: editingCard.expiry,
      is_default: editingCard.isDefault
    });

    if (success && card) {
      setCards(prev => [card, ...prev]);
      showToast('New payment method added');
      setIsCardModalOpen(false);
    } else {
      showToast(error || 'Failed to add card');
    }
  };

  const handleRemoveCard = async (id: string) => {
    const { success, error } = await deleteStoreCard(id);
    if (success) {
      setCards(prev => prev.filter(c => c.id !== id));
      showToast('Payment method removed');
    } else {
      showToast(error || 'Failed to remove card');
    }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconUser className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-3">Login to your account</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
          Sign in to access your orders, saved addresses, and wishlist.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          Login / Sign Up
        </button>
      </div>
    );
  }

  // --- MAIN ACCOUNT VIEW ---
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-24 animate-in slide-in-from-bottom-4 duration-500">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        aria-label="Upload profile photo"
      />

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white transition-colors">My Account</h1>
      </div>

      {/* Personal Information Section */}
      <div className="bg-white dark:bg-surface-dark rounded-[2rem] p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-700/50 mb-10 transition-colors">
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <IconUser className="w-5 h-5" />
            </div>
            Personal Information
          </h2>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-500 transition-all text-xs font-bold uppercase tracking-wide"
          >
            <IconLogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Avatar Area */}
          <div className="flex flex-col items-center gap-4 shrink-0">
            <div className="relative group cursor-pointer" onClick={handlePhotoClick} role="button" tabIndex={0} aria-label="Change profile photo" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePhotoClick(); }}>
              <div className="w-32 h-32 rounded-full bg-gray-50 dark:bg-gray-800 p-1 shadow-sm transition-all group-hover:shadow-md overflow-hidden border-2 border-gray-100 dark:border-gray-700">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-800">
                    <IconUser className="w-12 h-12" />
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                  <IconCamera className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="absolute bottom-1 right-1 w-9 h-9 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center border border-gray-100 dark:border-gray-600 text-primary dark:text-primary-light hover:scale-110 transition-transform">
                <IconEdit className="w-4 h-4" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">Tap to update</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">First Name</label>
              <input
                type="text"
                name="firstName"
                value={profile.firstName}
                onChange={handleInputChange}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={profile.lastName}
                onChange={handleInputChange}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
                placeholder="Enter last name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="name@example.com"
                  disabled
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <IconEmail className="w-3 h-3 text-gray-500" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
                  placeholder="+91 98765 43210"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <IconPhone className="w-3 h-3 text-gray-500" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Alternate Phone</label>
              <div className="relative">
                <input
                  type="tel"
                  name="altPhone"
                  value={profile.altPhone}
                  onChange={handleInputChange}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
                  placeholder="+91 98765 43210"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <IconPhone className="w-3 h-3 text-gray-500" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="gender-select" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Gender</label>
              <select
                id="gender-select"
                name="gender"
                title="Select Gender"
                aria-label="Select Gender"
                value={profile.gender}
                onChange={handleInputChange}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="dob-input" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Date of Birth</label>
              <input
                id="dob-input"
                type="date"
                name="dob"
                title="Date of Birth"
                value={profile.dob}
                onChange={handleInputChange}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary outline-none transition-all text-gray-500 dark:text-gray-400"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-4 mt-6">
              <button className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                <IconLock className="w-4 h-4" /> Change Password
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-8 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-100 font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <IconCheck className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-8">

        {/* Info Grid (Orders, Wishlist) */}
        <div className="grid md:grid-cols-2 gap-6">
          <div
            onClick={() => onNavigate('orders')}
            className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
              <IconShoppingBag className="w-24 h-24 dark:text-gray-600" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <IconShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-1 transition-colors">My Orders</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 transition-colors">Track, return, or buy things again.</p>
              <span className="text-sm font-semibold text-green-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                View Order History <IconChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('wishlist')}
            className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
              <IconHeart className="w-24 h-24 dark:text-gray-600" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <IconHeart className="w-6 h-6" fill />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-1 transition-colors">Wishlist</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 transition-colors">View and manage your saved items.</p>
              <span className="text-sm font-semibold text-red-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                View Wishlist <IconChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Addresses and Payments Section - REFINED UI */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* Addresses Card */}
          <div className="bg-white dark:bg-surface-dark p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 shadow-sm transition-colors relative h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center">
                  <IconMapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-heading text-gray-900 dark:text-white text-xl">Addresses</h3>
              </div>
              <button
                onClick={handleOpenAddAddress}
                className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-bold uppercase tracking-wider rounded-full hover:border-gray-900 dark:hover:border-white transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <IconPlus className="w-3.5 h-3.5" />
                Add New
              </button>
            </div>

            <div className="space-y-4">
              {addresses.map(addr => (
                <div
                  key={addr.id}
                  className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all group relative"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{addr.type}</span>
                        {addr.isDefault && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-100">DEFAULT</span>}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                        {addr.building ? `${addr.building}, ` : ''}{addr.street}<br />
                        {addr.city}, {addr.state} - {addr.zip}
                      </p>
                      {addr.phone && <p className="text-xs text-gray-400 mt-2 font-medium">Ph: {addr.phone}</p>}
                    </div>
                    <button
                      onClick={() => handleOpenEditAddress(addr)}
                      className="text-gray-400 hover:text-primary p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                      aria-label={`Edit ${addr.type} address`}
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {addresses.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  No addresses saved yet.
                </div>
              )}
            </div>
          </div>

          {/* Payments Card */}
          <div className="bg-white dark:bg-surface-dark p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 shadow-sm transition-colors relative h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full flex items-center justify-center">
                  <IconCreditCard className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-heading text-gray-900 dark:text-white text-xl">Payments</h3>
              </div>
              <button
                onClick={handleOpenAddCard}
                className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-bold uppercase tracking-wider rounded-full hover:border-gray-900 dark:hover:border-white transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <IconPlus className="w-3.5 h-3.5" />
                Add New
              </button>
            </div>

            <div className="space-y-4">
              {cards.map(card => (
                <div key={card.id} className="flex justify-between items-center p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-gray-900 dark:bg-black rounded-lg flex items-center justify-center text-[9px] text-white font-bold tracking-widest uppercase shadow-sm">
                      {card.type}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white transition-colors flex items-center gap-2">
                        •••• {card.last4}
                        {card.is_default && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Default</span>}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Expires {card.expiry}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCard(card.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                    aria-label={`Remove card ending in ${card.last4}`}
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {cards.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  No payment methods saved.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications and Help */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Notifications Card - NEW */}
          <div className="bg-white dark:bg-surface-dark p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 shadow-sm transition-colors h-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-full flex items-center justify-center">
                <IconBell className="w-5 h-5" />
              </div>
              <h3 className="font-bold font-heading text-gray-900 dark:text-white text-xl">Notifications</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Delivery Updates</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Get notified when your order is on the way.</p>
                </div>
                <button
                  onClick={() => setNotifications(prev => ({ ...prev, delivery: !prev.delivery }))}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${notifications.delivery ? 'bg-green-800' : 'bg-gray-200 dark:bg-gray-700'}`}
                  aria-label="Toggle delivery updates notifications"
                  aria-pressed={notifications.delivery}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${notifications.delivery ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Offers & Promotions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive exclusive deals and discounts.</p>
                </div>
                <button
                  onClick={() => setNotifications(prev => ({ ...prev, offers: !prev.offers }))}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${notifications.offers ? 'bg-green-800' : 'bg-gray-200 dark:bg-gray-700'}`}
                  aria-label="Toggle offers and promotions notifications"
                  aria-pressed={notifications.offers}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${notifications.offers ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Help Section - NEW COLORFUL BUTTONS */}
          <div className="bg-white dark:bg-surface-dark p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 shadow-sm transition-colors h-full text-center">
            <h3 className="font-bold font-heading text-gray-900 dark:text-white text-2xl mb-2">Need Help? Reach Us Easily</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-sm mx-auto">
              Our customer success team is here to assist you. We usually respond within a few hours during business hours.
            </p>

            <div className="grid grid-cols-4 gap-3 mb-6">
              <a href="tel:+15551234567" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors group h-32">
                <div className="w-10 h-10 rounded-full border-2 border-green-500 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                  <IconPhone className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-green-700">Call Us</span>
              </a>

              <a href="sms:+15551234567" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-teal-50 hover:bg-teal-100 transition-colors group h-32">
                <div className="w-10 h-10 rounded-full border-2 border-teal-500 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                  <IconMessage className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-teal-700">Send SMS</span>
              </a>

              <a href="mailto:support@fashionstore.com" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors group h-32">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <IconEmail className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-700">Email Us</span>
              </a>

              <a href="#" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-pink-50 hover:bg-pink-100 transition-colors group h-32">
                <div className="w-10 h-10 rounded-full border-2 border-pink-500 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                  <IconInstagram className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-pink-700">Instagram</span>
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
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
              <h3 className="text-xl font-bold font-heading text-gray-900 dark:text-white">
                {editingAddress.id === 0 ? 'Add New Address' : 'Edit Address'}
              </h3>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                aria-label="Close address modal"
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
                      onClick={() => setEditingAddress(prev => ({ ...prev, type }))}
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
                    aria-label="Delete this address"
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

      {/* Card Edit/Add Modal Overlay */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCardModalOpen(false)}
          ></div>

          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-t-2xl md:rounded-2xl shadow-2xl p-6 md:p-8 animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-heading text-gray-900 dark:text-white">Add Card</h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                title="Close Modal"
                aria-label="Close card modal"
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Card Type</label>
                <div className="flex gap-2">
                  {['Visa', 'Mastercard', 'AMEX'].map(t => (
                    <button
                      key={t}
                      onClick={() => setEditingCard(prev => ({ ...prev, type: t }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editingCard.type === t ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Last 4 Digits</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editingCard.last4}
                  onChange={(e) => setEditingCard(prev => ({ ...prev, last4: e.target.value.replace(/\D/g, '') }))}
                  placeholder="e.g. 4242"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    value={editingCard.expiry}
                    onChange={(e) => setEditingCard(prev => ({ ...prev, expiry: e.target.value }))}
                    placeholder="12/28"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group mt-4">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={editingCard.isDefault}
                    onChange={(e) => setEditingCard(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="sr-only"
                    aria-label="Set as primary payment method"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors duration-300 ${editingCard.isDefault ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${editingCard.isDefault ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Set as Primary Method</span>
              </label>

              <button
                onClick={handleSaveCard}
                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 mt-6"
              >
                Save Payment Method
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
