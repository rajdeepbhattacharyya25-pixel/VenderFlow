import React, { useState, useEffect, useRef } from 'react';
import { adminDb } from '../../../lib/admin-api';
import { supabase } from '../../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { X, MessageSquare, Send, Paperclip, Clock, FileText, Image, Video, Download, CheckCircle, Check, CheckCheck } from 'lucide-react';

interface Ticket {
    id: string;
    subject: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    seller: {
        id: string;
        store_name: string;
        slug: string;
    } | null;
    unread_count?: number;
}

interface Attachment {
    url: string;
    name: string;
    type: string;
    size: number;
}

interface Message {
    id: string;
    content: string;
    sender_role: 'admin' | 'seller';
    created_at: string;
    attachment_url?: string;
    attachment_name?: string;
    attachment_type?: string;
    is_read?: boolean;
}

interface AdminSupportModalProps {
    onClose: () => void;
}

const AdminSupportModal: React.FC<AdminSupportModalProps> = ({ onClose }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [attachment, setAttachment] = useState<Attachment | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [localTyping, setLocalTyping] = useState(false);
    const [typingChannel, setTypingChannel] = useState<RealtimeChannel | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'video/mp4', 'video/webm', 'video/quicktime'
    ];

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);
            adminDb.markTicketMessagesAsRead(selectedTicket.id);

            // Clear unread count for this ticket in local state
            setTickets(prev => prev.map(t =>
                t.id === selectedTicket.id ? { ...t, unread_count: 0 } : t
            ));

            const channelName = `ticket-${selectedTicket.id}`;
            const filterString = `ticket_id=eq.${selectedTicket.id}`;

            const channel = supabase
                .channel(channelName, {
                    config: { presence: { key: 'admin' } },
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const opponentTyping = Object.values(state).some(
                        (presences: any) => presences.some((p: any) => p.role === 'seller' && p.isTyping)
                    );
                    setIsTyping(opponentTyping);
                })
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: filterString
                }, (payload) => {
                    const newMessage = payload.new as Message;
                    if (newMessage.sender_role === 'seller') {
                        adminDb.markTicketMessagesAsRead(selectedTicket.id);
                    }
                    setMessages(prev => {
                        if (prev.some(msg => msg.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });
                    scrollToBottom();
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'support_messages',
                    filter: filterString
                }, (payload) => {
                    const updatedMessage = payload.new as Message;
                    setMessages(prev => prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg));
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({ role: 'admin', isTyping: false });
                    }
                });

            setTypingChannel(channel);

            return () => {
                channel.unsubscribe();
            };
        }
    }, [selectedTicket]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReply(e.target.value);

        if (!localTyping && typingChannel) {
            setLocalTyping(true);
            typingChannel.track({ role: 'admin', isTyping: true });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (typingChannel) {
                typingChannel.track({ role: 'admin', isTyping: false });
                setLocalTyping(false);
            }
        }, 2000);
    };

    const fetchTickets = async () => {
        const result = await adminDb.listSupportTickets();
        if (result.success && result.tickets) {
            // Fetch unread counts for each ticket
            const ticketsWithUnread = await Promise.all(
                result.tickets.map(async (ticket: Ticket) => {
                    const { count } = await supabase
                        .from('support_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('ticket_id', ticket.id)
                        .eq('sender_role', 'seller')
                        .eq('is_read', false);
                    return { ...ticket, unread_count: count || 0 };
                })
            );
            setTickets(ticketsWithUnread);
        }
        setLoading(false);
    };

    const fetchMessages = async (ticketId: string) => {
        const result = await adminDb.getTicketMessages(ticketId);
        if (result.success && result.messages) {
            setMessages(result.messages);
            scrollToBottom();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            alert('Invalid file type. Please upload an image, PDF, or video.');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert('File is too large. Maximum size is 10MB.');
            return;
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const fileExt = file.name.split('.').pop();
            const fileName = `admin/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('support-attachments')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('support-attachments')
                .getPublicUrl(fileName);

            setAttachment({
                url: publicUrl,
                name: file.name,
                type: file.type,
                size: file.size
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
    };

    const sendReply = async () => {
        if ((!reply.trim() && !attachment) || !selectedTicket) return;

        const result = await adminDb.replyToTicket(
            selectedTicket.id,
            reply || (attachment ? `Attachment: ${attachment.name}` : ''),
            attachment ? {
                url: attachment.url,
                name: attachment.name,
                type: attachment.type
            } : undefined
        );
        if (result.success) {
            setReply('');
            setAttachment(null);

            if (typingChannel) {
                typingChannel.track({ role: 'admin', isTyping: false });
                setLocalTyping(false);
            }
            // Update the ticket's updated_at in the list to move it to top
            setTickets(prev => {
                const updated = prev.map(t =>
                    t.id === selectedTicket.id
                        ? { ...t, updated_at: new Date().toISOString() }
                        : t
                );
                return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            });
        }
    };

    const closeTicket = async () => {
        if (!selectedTicket) return;
        if (confirm('Are you sure you want to close this ticket?')) {
            const result = await adminDb.updateTicketStatus(selectedTicket.id, 'closed');
            if (result.success) {
                setTickets(prev => {
                    const updated = prev.map(t =>
                        t.id === selectedTicket.id
                            ? { ...t, status: 'closed' as const, updated_at: new Date().toISOString() }
                            : t
                    );
                    return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                });
                setSelectedTicket(prev => prev ? { ...prev, status: 'closed' } : null);
            }
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        return status === 'open'
            ? 'bg-emerald-500 text-white'
            : 'bg-amber-500 text-white';
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image size={16} />;
        if (type.startsWith('video/')) return <Video size={16} />;
        if (type === 'application/pdf') return <FileText size={16} />;
        return <FileText size={16} />;
    };

    const renderAttachment = (msg: Message) => {
        if (!msg.attachment_url) return null;

        const type = msg.attachment_type || '';
        const isImage = type.startsWith('image/');
        const isVideo = type.startsWith('video/');
        const isPdf = type === 'application/pdf';

        return (
            <div className="mt-2">
                {isImage && (
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                        <img
                            src={msg.attachment_url}
                            alt={msg.attachment_name || 'Attachment'}
                            className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        />
                    </a>
                )}
                {isVideo && (
                    <video
                        src={msg.attachment_url}
                        controls
                        className="max-w-full max-h-48 rounded-lg"
                    />
                )}
                {isPdf && (
                    <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <FileText size={20} />
                        <span className="text-sm truncate">{msg.attachment_name || 'Document.pdf'}</span>
                        <Download size={16} className="ml-auto" />
                    </a>
                )}
                {!isImage && !isVideo && !isPdf && msg.attachment_url && (
                    <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <FileText size={20} />
                        <span className="text-sm truncate">{msg.attachment_name || 'File'}</span>
                        <Download size={16} className="ml-auto" />
                    </a>
                )}
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,application/pdf,video/*"
                className="hidden"
            />

            <div
                className="bg-neutral-100 dark:bg-neutral-900 rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl flex overflow-hidden border border-neutral-200 dark:border-neutral-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar - Ticket List */}
                <div className={`${selectedTicket ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800`}>
                    <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Support Tickets</h2>
                        <button
                            onClick={onClose}
                            className="md:hidden p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-500"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-6">
                        {loading ? (
                            <div className="text-neutral-700 dark:text-neutral-400 text-center py-4">Loading...</div>
                        ) : tickets.length === 0 ? (
                            <div className="text-neutral-700 dark:text-neutral-400 text-center py-8">No tickets found.</div>
                        ) : (
                            <>
                                {/* Recent Chats (Top 2) */}
                                {tickets.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-2">
                                            Recent Chats
                                        </h3>
                                        <div className="space-y-2">
                                            {tickets.slice(0, 2).map(ticket => (
                                                <button
                                                    key={ticket.id}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTicket?.id === ticket.id
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-neutral-800'
                                                        }`}
                                                >
                                                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 truncate flex items-center gap-2">
                                                        {ticket.subject}
                                                        {(ticket.unread_count ?? 0) > 0 && (
                                                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" title={`${ticket.unread_count} unread`} />
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 truncate">{ticket.seller?.store_name || 'Unknown Seller'}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${getStatusColor(ticket.status)}`}>
                                                            {ticket.status}
                                                        </span>
                                                        <span className="text-xs text-neutral-600 dark:text-neutral-400">{formatDate(ticket.updated_at)}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Past Conversations (Rest) */}
                                {tickets.length > 2 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-2 mt-4">
                                            Past Conversations
                                        </h3>
                                        <div className="space-y-2">
                                            {tickets.slice(2).map(ticket => (
                                                <button
                                                    key={ticket.id}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer opacity-75 hover:opacity-100 ${selectedTicket?.id === ticket.id
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 opacity-100'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-neutral-50 dark:bg-neutral-800/50'
                                                        }`}
                                                >
                                                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 truncate flex items-center gap-2">
                                                        {ticket.subject}
                                                        {(ticket.unread_count ?? 0) > 0 && (
                                                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" title={`${ticket.unread_count} unread`} />
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 truncate">{ticket.seller?.store_name || 'Unknown Seller'}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${getStatusColor(ticket.status)}`}>
                                                            {ticket.status}
                                                        </span>
                                                        <span className="text-xs text-neutral-500 dark:text-neutral-500 font-mono">
                                                            {formatDateTime(ticket.updated_at)}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Main Content - Chat */}
                <div className={`${!selectedTicket ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-neutral-50 dark:bg-neutral-950 relative`}>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full shadow-md text-neutral-500 transition-colors hidden md:flex"
                        title="Close"
                    >
                        <X size={20} />
                    </button>

                    {selectedTicket ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-5 pr-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="md:hidden p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-500"
                                        title="Back"
                                    >
                                        ←
                                    </button>
                                    <div>
                                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{selectedTicket.seller?.store_name || 'Unknown Seller'}</p>
                                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{selectedTicket.subject}</h2>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pr-12">
                                    {selectedTicket.status === 'open' && (
                                        <button
                                            onClick={closeTicket}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium transition-colors shadow-sm"
                                            title="Close this ticket"
                                        >
                                            <CheckCircle size={14} className="text-emerald-500" />
                                            Close Ticket
                                        </button>
                                    )}
                                    <div className="flex items-center gap-1.5 text-neutral-500">
                                        <Clock size={16} />
                                        <span className="text-sm">{formatDate(selectedTicket.created_at)}</span>
                                    </div>
                                    <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${getStatusColor(selectedTicket.status)}`}>
                                        {selectedTicket.status}
                                    </span>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white dark:bg-neutral-950 relative">
                                {messages.map((msg, idx) => {
                                    const isAdmin = msg.sender_role === 'admin';
                                    const showLabel = idx === 0 || messages[idx - 1].sender_role !== msg.sender_role;
                                    const sellerName = selectedTicket.seller?.store_name || 'Seller';

                                    const currentMsgDate = new Date(msg.created_at).toDateString();
                                    const prevMsgDate = idx > 0 ? new Date(messages[idx - 1].created_at).toDateString() : null;
                                    const showDateSeparator = currentMsgDate !== prevMsgDate;

                                    return (
                                        <React.Fragment key={msg.id || idx}>
                                            {/* Date Grouping Separator */}
                                            {showDateSeparator && (
                                                <div className="flex justify-center my-6">
                                                    <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs font-medium rounded-full shadow-sm">
                                                        {currentMsgDate === new Date().toDateString() ? 'Today' :
                                                            currentMsgDate === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                                                                formatDate(msg.created_at)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                                {/* Sender Label */}
                                                {showLabel && (
                                                    <div className={`flex items-center gap-2 mb-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isAdmin ? 'bg-indigo-600 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                                                            }`}>
                                                            {isAdmin ? 'A' : sellerName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                            {isAdmin ? 'Support Agent' : sellerName}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Message Bubble */}
                                                <div className={`max-w-[85%] md:max-w-[70%] ${isAdmin ? 'ml-auto' : 'mr-auto'}`}>
                                                    <div className={`px-4 py-3 shadow-sm ${isAdmin
                                                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-2xl rounded-tl-sm'
                                                        }`}>
                                                        {msg.content && !msg.content.startsWith('Attachment:') && (
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                        )}
                                                        {renderAttachment(msg)}
                                                    </div>
                                                    {/* Read Receipt */}
                                                    {isAdmin && (
                                                        <div className="flex justify-end mt-1 px-1">
                                                            {msg.is_read ? (
                                                                <CheckCheck size={14} className="text-emerald-500" title="Read" />
                                                            ) : (
                                                                <Check size={14} className="text-neutral-400" title="Delivered" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}

                                {/* Typing Indicator */}
                                {isTyping && (
                                    <div className="flex items-start">
                                        <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300 mr-2 shrink-0">
                                            {selectedTicket.seller?.store_name?.charAt(0).toUpperCase() || 'S'}
                                        </div>
                                        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-fit shadow-sm">
                                            <div className="flex space-x-1.5 h-4 items-center">
                                                <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} className="h-2" />
                            </div>

                            {/* Attachment Preview */}
                            {attachment && (
                                <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
                                    <div className="flex items-center gap-3 p-2 bg-white dark:bg-neutral-900 rounded-lg">
                                        <div className="text-indigo-600 dark:text-indigo-400">
                                            {getFileIcon(attachment.type)}
                                        </div>
                                        <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate flex-1">
                                            {attachment.name}
                                        </span>
                                        <button
                                            onClick={removeAttachment}
                                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500"
                                            title="Remove"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Input Area */}
                            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        sendReply();
                                    }}
                                    className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800 p-2 pl-4 rounded-full border border-neutral-200 dark:border-neutral-700"
                                >
                                    <input
                                        type="text"
                                        value={reply}
                                        onChange={handleInput}
                                        placeholder="Type your message..."
                                        aria-label="Message input"
                                        className="flex-1 min-w-0 bg-transparent focus:outline-none text-neutral-900 dark:text-white placeholder-neutral-500 py-3 md:py-2 text-[16px] md:text-sm"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                                        title="Attach file (PDF, Image, Video - max 10MB)"
                                    >
                                        {uploading ? (
                                            <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Paperclip size={20} />
                                        )}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!reply.trim() && !attachment}
                                        className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                        title="Send message"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8">
                            <div className="w-20 h-20 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare size={40} className="text-neutral-500 dark:text-neutral-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Support Dashboard</h3>
                            <p className="max-w-xs text-center text-sm text-neutral-600 dark:text-neutral-400">Select a ticket from the sidebar to view and respond.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSupportModal;
