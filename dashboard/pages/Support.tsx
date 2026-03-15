import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Plus, MessageSquare, Paperclip, Clock, X, FileText, Image, Video, Download, Check, CheckCheck } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { clsx } from 'clsx';

interface Ticket {
    id: string;
    subject: string;
    status: 'open' | 'closed';
    created_at: string;
    last_message?: string;
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

const QUICK_REPLIES = [
    "I need an update on this issue.",
    "Can we close this ticket?",
    "Thank you for the help!",
    "I attached a screenshot it."
];

const Support: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [newTicketSubject, setNewTicketSubject] = useState('');
    const [newTicketMessage, setNewTicketMessage] = useState('');
    const [isCreatingTicket, setIsCreatingTicket] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sellerName, setSellerName] = useState('You');
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
        fetchSellerName();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);

            // Mark unread admin messages as read initially
            markMessagesAsRead(selectedTicket.id);

            const channelName = `ticket-${selectedTicket.id}`;
            const filterString = `ticket_id=eq.${selectedTicket.id}`;

            const channel = supabase
                .channel(channelName, {
                    config: { presence: { key: 'seller' } },
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const opponentTyping = Object.values(state).some(
                        (presences: any) => presences.some((p: any) => p.role === 'admin' && p.isTyping)
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
                    if (newMessage.sender_role === 'admin') {
                        markMessagesAsRead(selectedTicket.id);
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
                        await channel.track({ role: 'seller', isTyping: false });
                    }
                });

            setTypingChannel(channel);

            return () => {
                channel.unsubscribe();
            };
        }
    }, [selectedTicket]);

    const markMessagesAsRead = async (ticketId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('support_messages')
                .update({ is_read: true })
                .eq('ticket_id', ticketId)
                .eq('sender_role', 'admin')
                .eq('is_read', false);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);

        if (!localTyping && typingChannel) {
            setLocalTyping(true);
            typingChannel.track({ role: 'seller', isTyping: true });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (typingChannel) {
                typingChannel.track({ role: 'seller', isTyping: false });
                setLocalTyping(false);
            }
        }, 2000);
    };

    const fetchSellerName = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('sellers')
                .select('store_name')
                .eq('id', user.id)
                .single();
            if (data?.store_name) {
                setSellerName(data.store_name);
            }
        }
    };

    const fetchTickets = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (ticketId: string) => {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return;
        }
        setMessages(data || []);
        scrollToBottom();
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
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

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

    const createTicket = async () => {
        if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: ticket, error: ticketError } = await supabase
                .from('support_tickets')
                .insert({
                    seller_id: user.id,
                    subject: newTicketSubject,
                    status: 'open'
                })
                .select()
                .single();

            if (ticketError) throw ticketError;

            const { error: messageError } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: ticket.id,
                    sender_id: user.id,
                    sender_role: 'seller',
                    content: newTicketMessage
                });

            if (messageError) throw messageError;

            setTickets(prev => [ticket, ...prev]);
            setSelectedTicket(ticket);
            setIsCreatingTicket(false);
            setNewTicketSubject('');
            setNewTicketMessage('');
            fetchMessages(ticket.id);
        } catch (error) {
            console.error('Error creating ticket:', error);
        }
    };

    const sendMessage = async () => {
        if ((!newMessage.trim() && !attachment) || !selectedTicket) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const messageData: Record<string, unknown> = {
                ticket_id: selectedTicket.id,
                sender_id: user.id,
                sender_role: 'seller',
                content: newMessage || (attachment ? `Attachment: ${attachment.name}` : '')
            };

            if (attachment) {
                messageData.attachment_url = attachment.url;
                messageData.attachment_name = attachment.name;
                messageData.attachment_type = attachment.type;
            }

            const { data, error } = await supabase
                .from('support_messages')
                .insert(messageData)
                .select()
                .single();

            if (error) throw error;

            // Manually add message to list (optimistic update)
            // This ensures the user sees the message immediately even if Realtime is slow or fails
            if (data) {
                const newMsg = data as Message;
                setMessages(prev => {
                    if (prev.some(msg => msg.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                scrollToBottom();
            }

            // Optimistic update handles UI so we just clear inputs
            setNewMessage('');
            setAttachment(null);

            // Stop typing indicator on send
            if (typingChannel) {
                typingChannel.track({ role: 'seller', isTyping: false });
                setLocalTyping(false);
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            alert(`Failed to send message: ${error.message || JSON.stringify(error)}`);
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
        <div className="h-[calc(100dvh-100px)] flex bg-neutral-100 dark:bg-neutral-950 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,application/pdf,video/*"
                className="hidden"
                aria-label="Attach file"
            />

            {/* Tickets Sidebar */}
            <div className={clsx(
                "w-full lg:w-80 flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800",
                (selectedTicket || isCreatingTicket) ? 'hidden lg:flex' : 'flex'
            )}>
                <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Support Tickets</h2>
                    <button
                        onClick={() => {
                            setIsCreatingTicket(true);
                            setSelectedTicket(null);
                        }}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                        title="New Ticket"
                        aria-label="Create new ticket"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-6">
                    {loading ? (
                        <div className="text-center py-8 text-neutral-700 dark:text-neutral-400">Loading...</div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-12 px-4 text-neutral-700 dark:text-neutral-400">
                            <MessageSquare className="mx-auto mb-3 text-neutral-500" size={32} />
                            <p className="font-medium">No tickets yet</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Create one to get help!</p>
                        </div>
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
                                                onClick={() => {
                                                    setSelectedTicket(ticket);
                                                    setIsCreatingTicket(false);
                                                }}
                                                className={clsx(
                                                    "w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer",
                                                    selectedTicket?.id === ticket.id
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-neutral-800'
                                                )}
                                            >
                                                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 truncate">{ticket.subject}</h3>
                                                <div className="flex items-center justify-between">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded text-xs font-bold uppercase",
                                                        getStatusColor(ticket.status)
                                                    )}>
                                                        {ticket.status}
                                                    </span>
                                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{formatDate(ticket.created_at)}</span>
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
                                                onClick={() => {
                                                    setSelectedTicket(ticket);
                                                    setIsCreatingTicket(false);
                                                }}
                                                className={clsx(
                                                    "w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer opacity-75 hover:opacity-100",
                                                    selectedTicket?.id === ticket.id
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 opacity-100'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-neutral-50 dark:bg-neutral-800/50'
                                                )}
                                            >
                                                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 truncate">{ticket.subject}</h3>
                                                <div className="flex items-center justify-between">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded text-xs font-bold uppercase",
                                                        getStatusColor(ticket.status)
                                                    )}>
                                                        {ticket.status}
                                                    </span>
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-500 font-mono">
                                                        {formatDateTime(ticket.created_at)}
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

            {/* Main Content */}
            <div className={clsx(
                "flex-1 flex-col bg-neutral-50 dark:bg-neutral-900",
                (!selectedTicket && !isCreatingTicket) ? 'hidden lg:flex' : 'flex'
            )}>
                {isCreatingTicket ? (
                    <div className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">New Support Ticket</h2>
                                <p className="text-neutral-600 dark:text-neutral-400 mt-1">Describe your issue and we'll help you.</p>
                            </div>
                            <button
                                onClick={() => setIsCreatingTicket(false)}
                                className="lg:hidden p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg"
                                title="Back"
                                aria-label="Back to tickets"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={newTicketSubject}
                                    onChange={(e) => setNewTicketSubject(e.target.value)}
                                    placeholder="Brief summary of the issue"
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Message</label>
                                <textarea
                                    value={newTicketMessage}
                                    onChange={(e) => setNewTicketMessage(e.target.value)}
                                    placeholder="Detailed description..."
                                    className="w-full h-64 px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setIsCreatingTicket(false)}
                                    className="px-6 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createTicket}
                                    disabled={!newTicketSubject.trim() || !newTicketMessage.trim()}
                                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    Submit Ticket
                                </button>
                            </div>
                        </div>
                    </div>
                ) : selectedTicket ? (
                    <div className="flex flex-col h-full">
                        {/* Chat Header */}
                        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="lg:hidden w-10 h-10 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-500 transition-colors"
                                    title="Back"
                                    aria-label="Back to ticket list"
                                >
                                    <X size={20} />
                                </button>
                                <h2 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white truncate max-w-[200px] md:max-w-md">{selectedTicket.subject}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex items-center gap-1.5 text-neutral-500">
                                    <Clock size={16} />
                                    <span className="text-sm">{formatDate(selectedTicket.created_at)}</span>
                                </div>
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                    getStatusColor(selectedTicket.status)
                                )}>
                                    {selectedTicket.status}
                                </span>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white dark:bg-neutral-950 relative">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_role === 'seller';
                                const showLabel = idx === 0 || messages[idx - 1].sender_role !== msg.sender_role;

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

                                        <div className={clsx(
                                            "flex flex-col",
                                            isMe ? 'items-end' : 'items-start'
                                        )}>
                                            {/* Sender Label */}
                                            {showLabel && (
                                                <div className={clsx(
                                                    "flex items-center gap-2 mb-2",
                                                    isMe ? 'flex-row-reverse' : ''
                                                )}>
                                                    <div className={clsx(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                                        isMe ? 'bg-indigo-600 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                                                    )}>
                                                        {isMe ? sellerName.charAt(0).toUpperCase() : 'A'}
                                                    </div>
                                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        {isMe ? sellerName : 'Admin'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Message Bubble */}
                                            <div className={clsx(
                                                "max-w-[85%] md:max-w-[70%]",
                                                isMe ? 'ml-auto' : 'mr-auto'
                                            )}>
                                                <div className={clsx(
                                                    "px-4 py-3 shadow-sm",
                                                    isMe
                                                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-2xl rounded-tl-sm'
                                                )}>
                                                    {msg.content && !msg.content.startsWith('Attachment:') && (
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    )}
                                                    {renderAttachment(msg)}
                                                </div>
                                                {/* Read Receipt */}
                                                {isMe && (
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
                                    <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500 mr-2 shrink-0">
                                        A
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
                        <div className="p-3 md:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                            {/* Quick Replies */}
                            {selectedTicket.status === 'open' && (
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                                    {QUICK_REPLIES.map(reply => (
                                        <button
                                            key={reply}
                                            type="button"
                                            onClick={() => {
                                                setNewMessage(reply);
                                                // Optional: auto-send
                                                // if (typingChannel) {
                                                //    setNewMessage(reply);
                                                //    sendMessage();
                                                // }
                                            }}
                                            className="whitespace-nowrap px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-800 shrink-0 touch-manipulation"
                                        >
                                            {reply}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    sendMessage();
                                }}
                                className="flex items-center gap-2 md:gap-3 bg-neutral-100 dark:bg-neutral-800 p-1.5 md:p-2 pl-3 md:pl-4 rounded-full border border-neutral-300 dark:border-neutral-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all shadow-sm"
                            >
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading || selectedTicket.status === 'closed'}
                                    className="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50 shrink-0 relative z-20"
                                    title="Attach file (PDF, Image, Video - max 10MB)"
                                    aria-label="Attach file"
                                >
                                    {uploading ? (
                                        <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Paperclip size={20} />
                                    )}
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={handleInput}
                                    placeholder="Type a message..."
                                    className="flex-1 min-w-0 bg-transparent focus:outline-none text-neutral-900 dark:text-white placeholder-neutral-500 py-3 md:py-2 caret-neutral-900 dark:caret-white relative z-10 text-[16px] md:text-sm"
                                    disabled={selectedTicket.status === 'closed'}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !attachment) || selectedTicket.status === 'closed'}
                                    className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 relative z-20"
                                    title="Send message"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                            {selectedTicket.status === 'closed' && (
                                <p className="text-center text-xs text-neutral-400 mt-3">
                                    This ticket is closed. Create a new one for help.
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <div className="w-20 h-20 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare size={40} className="text-neutral-500 dark:text-neutral-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Select a ticket</h3>
                        <p className="max-w-xs text-center text-sm text-neutral-600 dark:text-neutral-400">Choose a ticket from the sidebar or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Support;
