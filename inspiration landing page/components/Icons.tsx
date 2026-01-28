import React from 'react';
import { 
  Search, 
  User, 
  ShoppingBag, 
  Heart, 
  Star, 
  StarHalf, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  Filter, 
  Truck, 
  ShieldCheck, 
  RefreshCw,
  Facebook,
  Camera,
  AtSign,
  X,
  Check,
  Menu,
  Home,
  LayoutGrid,
  Share2,
  Eye,
  Phone,
  MessageCircle,
  CreditCard,
  Bell,
  MapPin,
  Edit2,
  LogOut,
  Lock,
  Mail,
  Sun,
  Moon,
  Trash2,
  ArrowUpDown,
  AlertCircle,
  TrendingUp,
  Zap,
  ArrowLeft,
  Wallet,
  Banknote
} from 'lucide-react';

export const IconSearch: React.FC<{ className?: string }> = ({ className }) => <Search className={className} />;
export const IconUser: React.FC<{ className?: string }> = ({ className }) => <User className={className} />;
export const IconShoppingBag: React.FC<{ className?: string }> = ({ className }) => <ShoppingBag className={className} />;
export const IconHeart: React.FC<{ className?: string, fill?: boolean }> = ({ className, fill = false }) => (
  <Heart className={className} fill={fill ? "currentColor" : "none"} />
);
export const IconStar: React.FC<{ className?: string, fill?: boolean }> = ({ className, fill = false }) => (
  <Star className={className} fill={fill ? "currentColor" : "none"} />
);
export const IconStarHalf: React.FC<{ className?: string }> = ({ className }) => <StarHalf className={className} />;
export const IconChevronDown: React.FC<{ className?: string }> = ({ className }) => <ChevronDown className={className} />;
export const IconChevronRight: React.FC<{ className?: string }> = ({ className }) => <ChevronRight className={className} />;
export const IconChevronLeft: React.FC<{ className?: string }> = ({ className }) => <ChevronLeft className={className} />;
export const IconFilter: React.FC<{ className?: string }> = ({ className }) => <Filter className={className} />;
export const IconTruck: React.FC<{ className?: string }> = ({ className }) => <Truck className={className} />;
export const IconShield: React.FC<{ className?: string }> = ({ className }) => <ShieldCheck className={className} />;
export const IconReturn: React.FC<{ className?: string }> = ({ className }) => <RefreshCw className={className} />;
export const IconFacebook: React.FC<{ className?: string }> = ({ className }) => <Facebook className={className} />;
export const IconInstagram: React.FC<{ className?: string }> = ({ className }) => <Camera className={className} />;
export const IconEmail: React.FC<{ className?: string }> = ({ className }) => <AtSign className={className} />;
export const IconX: React.FC<{ className?: string }> = ({ className }) => <X className={className} />;
export const IconCheck: React.FC<{ className?: string }> = ({ className }) => <Check className={className} />;
export const IconMenu: React.FC<{ className?: string }> = ({ className }) => <Menu className={className} />;
export const IconHome: React.FC<{ className?: string }> = ({ className }) => <Home className={className} />;
export const IconGrid: React.FC<{ className?: string }> = ({ className }) => <LayoutGrid className={className} />;
export const IconShare: React.FC<{ className?: string }> = ({ className }) => <Share2 className={className} />;
export const IconEye: React.FC<{ className?: string }> = ({ className }) => <Eye className={className} />;
export const IconSun: React.FC<{ className?: string }> = ({ className }) => <Sun className={className} />;
export const IconMoon: React.FC<{ className?: string }> = ({ className }) => <Moon className={className} />;

// New Account Icons
export const IconPhone: React.FC<{ className?: string }> = ({ className }) => <Phone className={className} />;
export const IconMessage: React.FC<{ className?: string }> = ({ className }) => <MessageCircle className={className} />;
export const IconCreditCard: React.FC<{ className?: string }> = ({ className }) => <CreditCard className={className} />;
export const IconBell: React.FC<{ className?: string }> = ({ className }) => <Bell className={className} />;
export const IconMapPin: React.FC<{ className?: string }> = ({ className }) => <MapPin className={className} />;
export const IconEdit: React.FC<{ className?: string }> = ({ className }) => <Edit2 className={className} />;
export const IconLogOut: React.FC<{ className?: string }> = ({ className }) => <LogOut className={className} />;
export const IconLock: React.FC<{ className?: string }> = ({ className }) => <Lock className={className} />;
export const IconCamera: React.FC<{ className?: string }> = ({ className }) => <Camera className={className} />;
export const IconMail: React.FC<{ className?: string }> = ({ className }) => <Mail className={className} />;

// Wishlist Specific Icons
export const IconTrash: React.FC<{ className?: string }> = ({ className }) => <Trash2 className={className} />;
export const IconSort: React.FC<{ className?: string }> = ({ className }) => <ArrowUpDown className={className} />;
export const IconAlert: React.FC<{ className?: string }> = ({ className }) => <AlertCircle className={className} />;
export const IconTrending: React.FC<{ className?: string }> = ({ className }) => <TrendingUp className={className} />;
export const IconZap: React.FC<{ className?: string }> = ({ className }) => <Zap className={className} />;

// Checkout Icons
export const IconArrowLeft: React.FC<{ className?: string }> = ({ className }) => <ArrowLeft className={className} />;
export const IconWallet: React.FC<{ className?: string }> = ({ className }) => <Wallet className={className} />;
export const IconBanknote: React.FC<{ className?: string }> = ({ className }) => <Banknote className={className} />;