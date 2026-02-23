import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import {
  IconCheck, IconMapPin, IconCreditCard, IconWallet, IconBanknote,
  IconShield, IconTruck, IconReturn, IconPhone, IconMail, IconArrowLeft,
  IconLock
} from './Icons';
import { PhoneVerification } from './PhoneVerification';


interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

interface AddressData {
  id: number;
  type: string;
  street: string;
  city: string;
  zip: string;
  state: string;
  phone: string;
  is_default?: boolean;
}

interface CheckoutProps {
  items: CartItem[];
  shippingFee?: number;
  freeShippingThreshold?: number;
  onPlaceOrder: (items: CartItem[], address: any, paymentMethod: string) => Promise<boolean>;
  onNavigateCart: () => void;
  onNavigateHome: () => void;
  storeCustomer?: any;
  isMockPreview?: boolean;
}

export const Checkout: React.FC<CheckoutProps> = ({
  items,
  shippingFee = 199,
  freeShippingThreshold = 2500,
  onPlaceOrder,
  onNavigateCart,
  onNavigateHome,
  storeCustomer,
  isMockPreview = false
}) => {
  const [step, setStep] = useState<'checkout' | 'confirmation'>('checkout');
  const [loading, setLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod'>('card');
  const [selectedAddressId, setSelectedAddressId] = useState<number>(0);
  const [isNewAddress, setIsNewAddress] = useState(false);
  const [addresses, setAddresses] = useState<AddressData[]>([]);

  useEffect(() => {
    if (storeCustomer) {
      fetchAddresses();
    }
  }, [storeCustomer]);

  const fetchAddresses = async () => {
    try {
      const { data } = await supabase
        .from('store_addresses')
        .select('*')
        .eq('customer_id', storeCustomer.customer_id || storeCustomer.id)
        .order('is_default', { ascending: false });

      if (data && data.length > 0) {
        setAddresses(data);
        // Auto-select default or first address
        const defaultAddr = data.find(a => a.is_default) || data[0];
        setSelectedAddressId(defaultAddr.id);
      } else {
        setIsNewAddress(true);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  const [formData, setFormData] = useState({
    name: storeCustomer?.display_name || '',
    phone: storeCustomer?.phone || '+91 ',
    street: '',
    building: '',
    city: '',
    state: '',
    zip: '',
    addressType: 'Home',
    isDefault: false
  });

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shippingCost = deliveryMethod === 'express'
    ? 299
    : (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold ? 0 : shippingFee);
  const tax = subtotal * 0.12; // 12% GST Approx
  const total = subtotal + shippingCost + tax;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (isNewAddress) {
      if (!formData.name) newErrors.name = 'Full name is required';
      if (!formData.phone) newErrors.phone = 'Phone number is required';
      if (!formData.street) newErrors.street = 'Street address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.zip) newErrors.zip = 'Pin Code is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // If no address selected and not creating new one, force selection or new
    // Allow proceeding without validation in mock preview mode
    if (!isMockPreview) {
      if (!isNewAddress && selectedAddressId === 0) {
        setIsNewAddress(true);
        return;
      }

      if (!validate()) {
        const firstError = document.querySelector('.error-field');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setLoading(true);

    // Construct address object
    let address;
    if (isNewAddress) {
      address = {
        ...formData,
        type: formData.addressType,
        is_default: formData.isDefault
      };
    } else {
      const savedAddress = addresses.find(a => a.id === selectedAddressId);
      if (savedAddress) {
        address = {
          ...savedAddress,
          name: formData.name || storeCustomer?.display_name || 'Customer' // Ensure name is included
        };
      }
    }

    try {
      const success = await onPlaceOrder(items, address, paymentMethod);
      if (success) {
        // Trigger WhatsApp Notification - REMOVED
        /*
        const customerPhone = verifiedPhone || formData.phone;
        if (customerPhone && customerPhone.length >= 10) {
           // sendWhatsApp removed
        }
        */
        setStep('confirmation');
      }
    } catch (error) {
      console.error("Order placement failed", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CONFIRMATION SCREEN ---
  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background-dark flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="bg-white dark:bg-surface-dark p-8 md:p-12 rounded-3xl shadow-xl max-w-lg w-full text-center border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          {/* Confetti / Decoration Background */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-green-400 to-primary"></div>

          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <IconCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">Order Confirmed!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Thank you for your purchase. Your order <span className="font-bold text-gray-900 dark:text-white">#FS-{Math.floor(Math.random() * 10000)}</span> has been placed successfully.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-8 text-left text-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500 dark:text-gray-400">Total Amount</span>
              <span className="font-bold text-gray-900 dark:text-white">₹{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Estimated Delivery</span>
              <span className="font-bold text-gray-900 dark:text-white">{deliveryMethod === 'express' ? '1-2 Days' : '3-5 Days'}</span>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="w-full bg-primary hover:bg-green-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Continue Shopping
          </button>

          <p className="mt-6 text-xs text-gray-400">
            A confirmation email has been sent to your inbox.
          </p>
        </div>
      </div>
    );
  }

  // --- CHECKOUT FORM ---
  return (
    <div className="min-h-screen bg-white dark:bg-background-dark pb-32 md:pb-10 transition-colors">

      {/* Progress Header */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-center md:justify-between relative">
          <button
            onClick={onNavigateCart}
            className="absolute left-4 md:static flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <IconArrowLeft className="w-4 h-4" /> <span className="hidden md:inline">Back to Bag</span>
          </button>

          <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm font-bold tracking-wide">
            <span className="text-gray-400">Bag</span>
            <span className="w-4 h-0.5 bg-gray-200 dark:bg-gray-700"></span>
            <span className="text-primary dark:text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">2</span>
              Checkout
            </span>
            <span className="w-4 h-0.5 bg-gray-200 dark:bg-gray-700"></span>
            <span className="text-gray-400">Done</span>
          </div>

          <div className="hidden md:block w-24"></div> {/* Spacer for center alignment */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 grid lg:grid-cols-12 gap-8 lg:gap-12">

        {/* LEFT COLUMN: FORMS */}
        <div className="lg:col-span-7 space-y-8 animate-in slide-in-from-left-4 duration-500">

          {/* 1. Address Section */}
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">1</span>
              Delivery Address
            </h2>

            <div className="space-y-4">
              {/* Saved Addresses */}
              {!isNewAddress && addresses.map(addr => (
                <label
                  key={addr.id}
                  className={`block border rounded-2xl p-4 cursor-pointer transition-all ${selectedAddressId === addr.id
                    ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10 ring-1 ring-primary'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 dark:text-white">{addr.type}</span>
                        {addr.is_default && <span className="text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded">Default</span>}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{addr.street}, {addr.city}, {addr.state} - {addr.zip}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{addr.phone}</p>
                    </div>
                  </div>
                </label>
              ))}

              {/* Add New Address Toggle */}
              <button
                onClick={() => { setIsNewAddress(!isNewAddress); setSelectedAddressId(0); }}
                className={`w-full py-3 border-2 border-dashed rounded-xl text-sm font-bold transition-all ${isNewAddress
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {isNewAddress ? 'Cancel & Use Saved Address' : '+ Add New Address'}
              </button>

              {/* New Address Form */}
              {isNewAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Name</label>
                    <input
                      type="text" name="name" value={formData.name} onChange={handleInputChange}
                      className={`w-full bg-gray-50 dark:bg-surface-dark border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all ${errors.name ? 'border-red-500 error-field' : 'border-gray-200 dark:border-gray-700'}`}
                      placeholder="e.g. Jane Doe"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Address Type</label>
                    <div className="flex gap-4">
                      {['Home', 'Work', 'Other'].map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="addressType"
                            value={type}
                            checked={formData.addressType === type}
                            onChange={e => setFormData({ ...formData, addressType: e.target.value })}
                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Flat, House no., Building, Company, Apartment</label>
                    <input
                      type="text" name="building" value={formData.building} onChange={handleInputChange}
                      className={`w-full bg-gray-50 dark:bg-surface-dark border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all border-gray-200 dark:border-gray-700`}
                      placeholder="e.g. Flat 101, Fashion Heights"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Area, Street, Sector, Village</label>
                    <input
                      type="text" name="street" value={formData.street} onChange={handleInputChange}
                      className={`w-full bg-gray-50 dark:bg-surface-dark border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all ${errors.street ? 'border-red-500 error-field' : 'border-gray-200 dark:border-gray-700'}`}
                      placeholder="e.g. 123 Fashion Ave"
                    />
                    {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">City</label>
                    <input
                      type="text" name="city" value={formData.city} onChange={handleInputChange}
                      className={`w-full bg-gray-50 dark:bg-surface-dark border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all ${errors.city ? 'border-red-500 error-field' : 'border-gray-200 dark:border-gray-700'}`}
                      placeholder="e.g. New York"
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Pin Code</label>
                    <input
                      type="text" name="zip" value={formData.zip} onChange={handleInputChange}
                      inputMode="numeric"
                      className={`w-full bg-gray-50 dark:bg-surface-dark border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all ${errors.zip ? 'border-red-500 error-field' : 'border-gray-200 dark:border-gray-700'}`}
                      placeholder="e.g. 400001"
                    />
                    {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone Number</label>
                    <input
                      type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                      inputMode="tel"
                      className={`w-full bg-gray-50 dark:bg-surface-dark border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all ${errors.phone ? 'border-red-500 error-field' : 'border-gray-200 dark:border-gray-700'}`}
                      placeholder="e.g. +91 98765 43210"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 justify-start">
                    <input
                      type="checkbox"
                      id="saveAddr"
                      checked={formData.isDefault}
                      onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                    />
                    <label htmlFor="saveAddr" className="text-sm text-gray-600 dark:text-gray-400 select-none cursor-pointer">Save as default address</label>
                  </div>
                </div>
              )}
            </div>
          </section>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* 2. Delivery Method */}
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">2</span>
              Delivery Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`border rounded-2xl p-4 cursor-pointer transition-all relative overflow-hidden ${deliveryMethod === 'standard'
                  ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10 ring-1 ring-primary'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                onClick={() => setDeliveryMethod('standard')}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900 dark:text-white">Standard Delivery</span>
                  <span className="text-green-600 dark:text-green-400 font-bold text-sm">FREE</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Delivered by Mon, Oct 25</p>
                <p className="text-[10px] text-gray-400">3-5 Business Days</p>
                {deliveryMethod === 'standard' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"></div>}
              </label>

              <label
                className={`border rounded-2xl p-4 cursor-pointer transition-all relative overflow-hidden ${deliveryMethod === 'express'
                  ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10 ring-1 ring-primary'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                onClick={() => setDeliveryMethod('express')}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900 dark:text-white">Express Delivery</span>
                  <span className="text-gray-900 dark:text-white font-bold text-sm">₹299.00</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Delivered by Tomorrow</p>
                <p className="text-[10px] text-gray-400">1-2 Business Days</p>
                {deliveryMethod === 'express' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"></div>}
              </label>
            </div>
          </section>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* 3. Payment Method */}
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">3</span>
              Payment Method
            </h2>

            <div className="space-y-4">
              <div className="flex gap-4 overflow-x-auto pb-2 hide-scroll">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl border font-bold text-sm whitespace-nowrap transition-all ${paymentMethod === 'card'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black border-transparent shadow-md'
                    : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                >
                  <IconCreditCard className="w-4 h-4" /> Credit/Debit Card
                </button>
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl border font-bold text-sm whitespace-nowrap transition-all ${paymentMethod === 'upi'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black border-transparent shadow-md'
                    : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                >
                  <IconWallet className="w-4 h-4" /> UPI / Wallets
                </button>
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl border font-bold text-sm whitespace-nowrap transition-all ${paymentMethod === 'cod'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black border-transparent shadow-md'
                    : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                >
                  <IconBanknote className="w-4 h-4" /> Cash on Delivery
                </button>
              </div>

              {/* Card Inputs */}
              {paymentMethod === 'card' && (
                <div className="bg-gray-50 dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Card Number</label>
                    <div className="relative">
                      <input type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pl-12 outline-none focus:border-primary transition-colors" />
                      <IconCreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Expiry Date</label>
                      <input type="text" placeholder="MM/YY" className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">CVV</label>
                      <input type="text" placeholder="123" className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="saveCard" className="rounded text-primary focus:ring-primary border-gray-300" />
                    <label htmlFor="saveCard" className="text-sm text-gray-600 dark:text-gray-400">Save card securely for future</label>
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="bg-gray-50 dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-700 text-center animate-in fade-in slide-in-from-top-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Redirecting to secure payment gateway...</p>
                  <div className="flex justify-center gap-4 opacity-50">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              )}

              {paymentMethod === 'cod' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                    <IconBanknote className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                      You can pay via Cash or UPI when the delivery agent arrives at your doorstep. Please ensure you have exact change if paying by cash.
                    </p>
                  </div>

                  {/* Phone Verification for COD */}
                  {!isMockPreview && (
                    <PhoneVerification
                      initialPhone={formData.phone}
                      onPhoneChange={(phone) => setFormData(prev => ({ ...prev, phone }))}
                      onVerifySuccess={(phone) => {
                        setIsPhoneVerified(true);
                        setVerifiedPhone(phone);
                        setFormData(prev => ({ ...prev, phone })); // Sync verified phone back to form
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: STICKY SUMMARY */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-6">

            {/* Summary Card */}
            <div className="bg-gray-50 dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold font-display text-lg text-gray-900 dark:text-white">Order Summary</h3>
                <button onClick={onNavigateCart} className="text-xs font-bold text-primary dark:text-primary-light hover:underline">Edit Bag</button>
              </div>

              {/* Items List (Collapsed View) */}
              <div className="space-y-4 mb-6 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-16 h-20 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-gray-600">
                      <img src={item.product.image} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Size: {item.size} • Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="border-gray-200 dark:border-gray-600 mb-4" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? <span className="text-green-600 font-bold">Free</span> : `₹${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax (12%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-600 mt-4">
                <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">₹{total.toFixed(2)}</span>
                  <p className="text-[10px] text-gray-500">Including GST</p>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || (!isMockPreview && paymentMethod === 'cod' && !isPhoneVerified)}
                className="w-full mt-6 bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-green-900 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ minHeight: '48px', WebkitTapHighlightColor: 'transparent' }}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <IconCheck className="w-5 h-5" />}
                {loading ? 'Processing...' : (isMockPreview ? 'Place Mock Order' : 'Place Order')}
              </button>

              <p className="text-xs text-center text-gray-500 mt-4 flex items-center justify-center gap-1">
                <IconLock className="w-3 h-3" /> Secure Payment
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};