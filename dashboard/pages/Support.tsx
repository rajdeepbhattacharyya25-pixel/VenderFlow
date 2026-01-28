import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Plus, MessageSquare, Paperclip, Clock, X, FileText, Image, Video, Download } from 'lucide-react';
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
}

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

            // Sanitized strings for subscription
            const channelName = `ticket-${selectedTicket.id}`;
            const filterString = `ticket_id=eq.${selectedTicket.id}`;

            const subscription = supabase
                .channel(channelName)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: filterString
                }, (payload) => {
                    const newMessage = payload.new as Message;
                    setMessages(prev => {
                        // Prevent duplicates if already added manually
                        if (prev.some(msg => msg.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });
                    scrollToBottom();
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [selectedTicket]);

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

            setNewMessage('');
            setAttachment(null);
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
        <div className="h-[calc(100vh-100px)] flex bg-neutral-100 dark:bg-neutral-950 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,application/pdf,video/*"
                className="hidden"
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
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-neutral-700 dark:text-neutral-400">Loading...</div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-12 px-4 text-neutral-700 dark:text-neutral-400">
                            <MessageSquare className="mx-auto mb-3 text-neutral-500" size={32} />
                            <p className="font-medium">No tickets yet</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Create one to get help!</p>
                        </div>
                    ) : (
                        tickets.map(ticket => (
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
                        ))
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
                        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="lg:hidden p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-500"
                                    title="Back"
                                >
                                    ←
                                </button>
                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{selectedTicket.subject}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-neutral-500">
                                    <Clock size={16} />
                                    <span className="text-sm">{formatDate(selectedTicket.created_at)}</span>
                                </div>
                                <span className={clsx(
                                    "px-3 py-1 rounded text-xs font-bold uppercase",
                                    getStatusColor(selectedTicket.status)
                                )}>
                                    {selectedTicket.status}
                                </span>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-neutral-950">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_role === 'seller';
                                const showLabel = idx === 0 || messages[idx - 1].sender_role !== msg.sender_role;

                                return (
                                    <div key={msg.id || idx} className={clsx(
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
                                            "max-w-[70%]",
                                            isMe ? 'ml-10' : 'mr-10'
                                        )}>
                                            <div className={clsx(
                                                "rounded-2xl px-5 py-3",
                                                isMe
                                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-l-4 border-emerald-500 rounded-bl-sm'
                                            )}>
                                                {msg.content && !msg.content.startsWith('Attachment:') && (
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                )}
                                                {renderAttachment(msg)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
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
                                    sendMessage();
                                }}
                                className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800 p-2 pl-4 rounded-full border border-neutral-300 dark:border-neutral-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all shadow-sm"
                            >
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading || selectedTicket.status === 'closed'}
                                    className="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50 shrink-0 relative z-20"
                                    title="Attach file (PDF, Image, Video - max 10MB)"
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
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type message here..."
                                    className="flex-1 min-w-0 bg-transparent focus:outline-none text-neutral-900 dark:text-white placeholder-neutral-500 py-2 caret-neutral-900 dark:caret-white relative z-10"
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
