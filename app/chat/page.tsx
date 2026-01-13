'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useChatStore } from '@/lib/store';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import {
  Hash,
  Lock,
  Users,
  Settings,
  MoreHorizontal,
  Smile,
  Paperclip,
  Send,
  AtSign,
  Menu,
  PanelRightOpen,
  PanelRight,
  Plus,
  Search,
  Bell,
  LogOut,
  User,
  X,
  Reply,
  MoreVertical,
} from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const { user, token, logout, isAuthenticated } = useAuthStore();
  const {
    currentRoom,
    currentDirectMessage,
    rooms,
    directMessages,
    messages,
    users,
    invitations,
    typingUsers,
    onlineUsers,
    view,
    setCurrentRoom,
    setCurrentDirectMessage,
    setRooms,
    setUsers,
    setInvitations,
    addMessage,
    addDirectMessage,
    setMessages,
    setDirectMessages,
    setTyping,
    setUserOnline,
    setView,
  } = useChatStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRoomForInvite, setSelectedRoomForInvite] = useState<string | null>(null);
  const [joinKey, setJoinKey] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push('/login');
      return;
    }

    // Use environment variable or default to same origin (relative URL)
    // NOTE: Vercel doesn't support WebSockets. Set NEXT_PUBLIC_SOCKET_URL to a separate socket server
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      autoConnect: true,
    });
    
    // Handle connection errors gracefully
    socketInstance.on('connect_error', (error) => {
      console.warn('Socket connection failed. Real-time features disabled:', error.message);
      // App will continue to work, just without real-time updates
    });
    
    socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    setSocket(socketInstance);

    if (user?.id) {
      socketInstance.emit('join_room', `user_${user.id}`);
      // Mark current user as online
      socketInstance.emit('user_online', { userId: user.id });
      setUserOnline(user.id, true);
    }

    loadRooms();
    loadUsers();
    loadInvitations();

    socketInstance.on('receive_message', (message) => {
      if (message.roomId) {
        // Check if message already exists to prevent duplicates
        const existingMessages = messages[message.roomId] || [];
        const messageExists = existingMessages.some((msg: any) => msg.id === message.id);
        
        if (!messageExists) {
          addMessage(message.roomId, message);
          scrollToBottom();
        }
      }
    });

    socketInstance.on('receive_direct_message', (message) => {
      console.log('Received direct message via socket:', message);
      // Determine the other user's ID
      let otherUserId = null;
      
      if (message.userId === user?.id) {
        // Message from current user - use current conversation
        if (currentDirectMessage) {
          otherUserId = currentDirectMessage;
        } else {
          return; // Can't determine recipient
        }
      } else {
        // Message from another user
        otherUserId = message.userId;
      }
      
      if (otherUserId) {
        // Check if message already exists (prevent duplicates)
        const existingMessages = directMessages[otherUserId] || [];
        const messageExists = existingMessages.some((msg: any) => msg.id === message.id);
        
        if (!messageExists) {
          addDirectMessage(otherUserId, message);
          scrollToBottom();
        }
      }
    });

    // Typing indicators
    socketInstance.on('user_typing', ({ roomId, userId, isTyping: typing }: { roomId?: string; userId: string; isTyping: boolean }) => {
      if (userId !== user?.id) {
        const targetId = roomId || userId;
        console.log('Typing event received:', { roomId, userId, typing, targetId });
        setTyping(targetId, userId, typing);
        
        // Auto-clear typing after 5 seconds
        if (typing) {
          setTimeout(() => {
            setTyping(targetId, userId, false);
          }, 5000);
        }
      }
    });

    socketInstance.on('user_stopped_typing', ({ roomId, userId }: { roomId?: string; userId: string }) => {
      if (userId !== user?.id) {
        const targetId = roomId || userId;
        setTyping(targetId, userId, false);
      }
    });

    socketInstance.on('connect', () => {
      if (currentRoom) {
        socketInstance.emit('join_room', currentRoom);
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [token, isAuthenticated]);

  useEffect(() => {
    if (currentRoom && socket) {
      loadMessages(currentRoom);
      socket.emit('join_room', currentRoom);
    }
  }, [currentRoom, socket]);

  useEffect(() => {
    if (currentDirectMessage && socket && user) {
      loadDirectMessages(currentDirectMessage);
      // Join conversation room for real-time updates
      const conversationId = [user.id, currentDirectMessage].sort().join('_');
      socket.emit('join_room', `dm_${conversationId}`);
      // Also join user room for typing
      socket.emit('join_room', `user_${currentDirectMessage}`);
    }
  }, [currentDirectMessage, socket, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, directMessages, currentRoom, currentDirectMessage]);

  const loadRooms = async () => {
    try {
      if (!token) return;
      const response = await api.getUserRooms(token);
      if (response.success) {
        setRooms(response.rooms.map((r: any) => r.room));
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      if (!token) return;
      const response = await api.getAllUsers(token);
      if (response.success) {
        setUsers(response.users);
        // Update online status for loaded users
        response.users.forEach((u: any) => {
          if (u.isOnline) {
            setUserOnline(u.id, true);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      if (!token) return;
      const response = await api.getInvitations(token);
      if (response.success) {
        setInvitations(response.invitations);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const response = await api.getRoomMessages(roomId);
      if (response.success) {
        setMessages(roomId, response.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadDirectMessages = async (userId: string) => {
    try {
      if (!token) {
        console.error('No token available for loading messages');
        return;
      }
      console.log('Loading messages for user:', userId);
      const response = await api.getDirectMessages(userId, token);
      console.log('Messages response:', response);
      if (response.success) {
        console.log('Loaded messages:', response.messages?.length || 0, 'messages');
        setDirectMessages(userId, response.messages || []);
        scrollToBottom();
      } else {
        console.error('Failed to load messages');
      }
    } catch (error: any) {
      console.error('Failed to load direct messages:', error);
      console.error('Error details:', error.message);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !token || !user) return;

    try {
      const response = await api.createRoom({
        name: newChannelName,
        userIds: [user.id],
        token,
        isPrivate: isPrivateChannel,
      });
      if (response.success) {
        setRooms([...rooms, response.room]);
        setNewChannelName('');
        setIsPrivateChannel(false);
        setShowCreateChannel(false);
        setCurrentRoom(response.room.id);
        setView('rooms');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to create channel');
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim() || !selectedRoomForInvite || !token) return;

    try {
      const response = await api.sendInvitation(selectedRoomForInvite, inviteEmail, token);
      if (response.success) {
        alert('Invitation sent!');
        setInviteEmail('');
        setShowInviteModal(false);
        setSelectedRoomForInvite(null);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to send invitation');
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!token) return;

    try {
      const response = await api.acceptInvitation(invitationId, token);
      if (response.success) {
        loadRooms();
        loadInvitations();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    if (!token) return;

    try {
      const response = await api.rejectInvitation(invitationId, token);
      if (response.success) {
        loadInvitations();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to reject invitation');
    }
  };

  const handleJoinRoomByKey = async () => {
    if (!joinKey.trim() || !token) return;

    try {
      const response = await api.joinRoomByKey(joinKey, token);
      if (response.success) {
        setRooms([...rooms, response.room]);
        setJoinKey('');
        setShowJoinModal(false);
        setCurrentRoom(response.room.id);
        setView('rooms');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to join room');
    }
  };

  const handleTyping = useCallback((typing: boolean) => {
    if (!socket || !user) return;
    
    const targetId = currentRoom || currentDirectMessage;
    if (!targetId) return;

    console.log('Emitting typing event:', { 
      roomId: currentRoom || undefined, 
      userId: currentDirectMessage || undefined, 
      isTyping: typing,
      targetId
    });

    socket.emit('typing', {
      roomId: currentRoom || undefined,
      userId: currentDirectMessage || undefined,
      isTyping: typing,
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 2000);
    }
  }, [socket, user, currentRoom, currentDirectMessage]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socket || !user) return;

    // Stop typing indicator
    handleTyping(false);

    if (currentRoom) {
      // For room messages, emit via socket (server will save and broadcast)
      socket.emit('send_message', {
        roomId: currentRoom,
        userId: user.id,
        content: newMessage,
      });
      setNewMessage('');
      messageInputRef.current?.focus();
    } else if (currentDirectMessage) {
      // For direct messages, save via API first
      try {
        if (!token) {
          alert('Not authenticated. Please login again.');
          return;
        }
        
        const response = await api.sendDirectMessage(currentDirectMessage, newMessage, token);
        
        if (response.success && response.message) {
          // Add message to local state immediately (only once from API)
          addDirectMessage(currentDirectMessage, response.message);
          scrollToBottom();
          
          // Emit via socket for real-time to other user (don't add to our state again)
          socket.emit('send_direct_message', {
            receiverId: currentDirectMessage,
            userId: user.id,
            content: newMessage,
            messageId: response.message.id, // Include message ID to prevent duplicates
          });
          
          setNewMessage('');
          messageInputRef.current?.focus();
        } else {
          throw new Error('Failed to send message');
        }
      } catch (error: any) {
        console.error('Error sending direct message:', error);
        const errorMessage = error.message || error.toString() || 'Failed to send message';
        alert(`Error: ${errorMessage}`);
        // Don't clear the message input on error so user can retry
      }
    }
  };

  const handleStartDirectMessage = (userId: string) => {
    setCurrentDirectMessage(userId);
    setView('direct');
    setMobileSidebarOpen(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-[hsl(var(--border))] border-t-[hsl(var(--accent))] rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-[hsl(var(--foreground))] font-medium">Loading Sanchar...</div>
        </div>
      </div>
    );
  }

  const currentMessages = currentRoom
    ? messages[currentRoom] || []
    : currentDirectMessage
    ? directMessages[currentDirectMessage] || []
    : [];

  const publicRooms = rooms.filter((r: any) => r.type === 'public');
  const privateRooms = rooms.filter((r: any) => r.type === 'private');
  const directMessageUsers = users.filter((u: any) => {
    const hasMessages = directMessages[u.id] && directMessages[u.id].length > 0;
    return hasMessages;
  });

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[hsl(var(--background))] overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden h-14 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] flex items-center justify-between px-4 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-lg text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
          >
            {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="w-8 h-8 bg-[hsl(var(--accent))] rounded-lg flex items-center justify-center text-[hsl(var(--accent-foreground))] font-bold shadow-md">
            S
          </div>
          <span className="font-bold text-[hsl(var(--foreground))]">Sanchar</span>
        </div>
        <div className="w-8 h-8 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center text-[hsl(var(--accent-foreground))] font-bold text-sm shadow-md">
          {user?.name?.[0]?.toUpperCase()}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto flex flex-col transition-all duration-300 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'} md:w-64`}>
        {/* Workspace Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--accent))] rounded-lg flex items-center justify-center text-[hsl(var(--accent-foreground))] font-bold shadow-lg">
              S
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1">
                <span className="font-bold text-[hsl(var(--foreground))] text-lg">Sanchar</span>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Your Workspace</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelRightOpen className="w-5 h-5" />
            ) : (
              <PanelRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Create Channel Button */}
          {!sidebarCollapsed && (
            <div className="p-4">
              <button
                onClick={() => setShowCreateChannel(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] transition text-sm font-medium text-[hsl(var(--foreground))]"
              >
                <Plus size={18} />
                Create Channel
              </button>
            </div>
          )}

          {/* Channels Section */}
          <div className="px-4 pb-2">
            {!sidebarCollapsed && (
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] px-3 mb-2">CHANNELS</p>
            )}
            <div className="space-y-1">
              {/* Public Channels */}
              {publicRooms.map((room: any, index: number) => (
                <button
                  key={room.id}
                  onClick={() => {
                    setCurrentRoom(room.id);
                    setView('rooms');
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                    currentRoom === room.id
                      ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-semibold'
                      : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
                  }`}
                >
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">#{room.name}</span>}
                </button>
              ))}

              {/* Private Channels */}
              {privateRooms.length > 0 && !sidebarCollapsed && (
                <>
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] px-3 mb-2 mt-4">PRIVATE</p>
                  {privateRooms.map((room: any, index: number) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        setCurrentRoom(room.id);
                        setView('rooms');
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                        currentRoom === room.id
                          ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-semibold'
                          : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
                      }`}
                    >
                      <Lock className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{room.name}</span>}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Direct Messages Section */}
          {!sidebarCollapsed && (
            <div className="px-4 pb-2 border-t border-[hsl(var(--border))] mt-2">
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] px-3 mb-2 mt-4">DIRECT MESSAGES</p>
              <div className="space-y-1">
                {directMessageUsers.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartDirectMessage(u.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      currentDirectMessage === u.id
                        ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-semibold'
                        : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${onlineUsers.has(u.id) ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Users (for starting new DMs) */}
          {!sidebarCollapsed && (
            <div className="px-4 pb-2 border-t border-[hsl(var(--border))] mt-2">
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] px-3 mb-2 mt-4">ALL USERS</p>
              <div className="space-y-1">
                {users.slice(0, 10).map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartDirectMessage(u.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
                  >
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${onlineUsers.has(u.id) ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[hsl(var(--border))] p-4 space-y-1">
          <button
            onClick={() => {/* Settings - to be implemented */}}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[hsl(var(--secondary))] transition text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <Settings size={18} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[hsl(var(--secondary))] transition text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[hsl(var(--background))] md:static">
        {/* Header */}
        <div className="h-16 px-6 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--card))]">
          <div>
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
              {currentRoom
                ? `# ${rooms.find((r: any) => r.id === currentRoom)?.name || 'Channel'}`
                : currentDirectMessage
                ? users.find((u: any) => u.id === currentDirectMessage)?.name || 'Direct Message'
                : 'Select a channel or DM'}
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {currentRoom
                ? `${rooms.find((r: any) => r.id === currentRoom)?.participants?.length || 0} members`
                : currentDirectMessage
                ? onlineUsers.has(currentDirectMessage) ? 'Online' : 'Offline'
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentRoom && (
              <button
                onClick={() => {
                  setSelectedRoomForInvite(currentRoom);
                  setShowInviteModal(true);
                }}
                className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition"
                title="Invite to channel"
              >
                <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            )}
            {invitations.length > 0 && (
              <button
                onClick={() => setView('invitations')}
                className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition relative"
                title="View invitations"
              >
                <Bell className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {invitations.length}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowJoinModal(true)}
              className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition"
              title="Join channel"
            >
              <Plus className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <button className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition">
              <MoreVertical size={20} className="text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 messages-container bg-[hsl(var(--background))]">
          {currentMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full animate-fade-in">
              <div className="text-center text-[hsl(var(--muted-foreground))]">
                <div className="text-6xl mb-4 animate-bounce-slow">💬</div>
                <div className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))]">No messages yet</div>
                <div className="text-[hsl(var(--muted-foreground))]">Start the conversation!</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentMessages
                .filter((msg: any, idx: number, arr: any[]) => {
                  return arr.findIndex((m: any) => m.id === msg.id) === idx;
                })
                .map((message: any, index: number, filteredArray: any[]) => {
                const isMyMessage = message.userId === user?.id;
                const prevMessage = index > 0 ? filteredArray[index - 1] : null;
                const isSameUser = prevMessage && prevMessage.userId === message.userId;
                const isConsecutive = isSameUser && 
                  new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000;
                const showAvatar = !isConsecutive && !isMyMessage;
                
                return (
                  <div
                    key={message.id}
                    className={`group flex gap-3 ${isMyMessage ? 'flex-row-reverse' : ''} hover:bg-[hsl(var(--secondary))]/30 px-4 py-2 rounded-lg transition message-enter`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isMyMessage 
                          ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' 
                          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                      }`}
                    >
                      {showAvatar || isMyMessage ? (message.user?.name?.[0]?.toUpperCase() || 'U') : <div className="w-8" />}
                    </div>

                    <div className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} flex-1`}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                          {isMyMessage ? 'You' : (message.user?.name || 'Unknown')}
                        </p>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`px-4 py-2 rounded-lg max-w-xs ${
                          isMyMessage 
                            ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' 
                            : 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>

                      {/* Message Actions - Show on hover */}
                      <div className={`hidden group-hover:flex gap-1 mt-1 ${isMyMessage ? 'flex-row-reverse' : ''} fade-in-up`}>
                        <button
                          className="p-1 hover:bg-[hsl(var(--secondary))] rounded transition"
                          title="Add reaction"
                        >
                          <Smile size={16} className="text-[hsl(var(--muted-foreground))]" />
                        </button>
                        <button
                          className="p-1 hover:bg-[hsl(var(--secondary))] rounded transition"
                          title="Reply"
                        >
                          <Reply size={16} className="text-[hsl(var(--muted-foreground))]" />
                        </button>
                        <button
                          className="p-1 hover:bg-[hsl(var(--secondary))] rounded transition"
                          title="More options"
                        >
                          <MoreVertical size={16} className="text-[hsl(var(--muted-foreground))]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Typing Indicator */}
        {(() => {
          const targetId = currentRoom || currentDirectMessage;
          if (!targetId) return null;
          const typing = typingUsers[targetId];
          if (!typing || typing.size === 0) return null;
          
          const typingUserIds = Array.from(typing);
          const typingUserNames = typingUserIds
            .map((id) => {
              const user = users.find((u: any) => u.id === id);
              return user?.name || 'Someone';
            })
            .filter((name) => name !== user?.name);
          
          if (typingUserNames.length === 0) return null;
          
          return (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[hsl(var(--border))]">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">...</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))] animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--muted-foreground))] animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {typingUserNames.length === 1
                  ? `${typingUserNames[0]} is typing...`
                  : typingUserNames.length === 2
                  ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`
                  : `${typingUserNames[0]} and ${typingUserNames.length - 1} others are typing...`}
              </p>
            </div>
          );
        })()}

        {/* Message Input */}
        <div className="h-20 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-end gap-3">
            <button
              className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition"
              title="Attach file"
              onClick={() => {/* File attachment - to be implemented */}}
            >
              <Paperclip size={20} className="text-[hsl(var(--muted-foreground))]" />
            </button>

            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (e.target.value.trim()) {
                  handleTyping(true);
                } else {
                  handleTyping(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleTyping(false);
                  handleSendMessage();
                }
              }}
              onBlur={() => {
                handleTyping(false);
              }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
            />

            <button
              className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition"
              title="Add emoji"
              onClick={() => {/* Emoji picker - to be implemented */}}
            >
              <Smile size={20} className="text-[hsl(var(--muted-foreground))]" />
            </button>

            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`p-2 rounded-lg transition ${
                newMessage.trim()
                  ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:opacity-90'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/50 modal-backdrop flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowCreateChannel(false)}>
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in hover-lift border border-[hsl(var(--border))]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Create a channel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Channel name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. marketing"
                  className="w-full px-4 py-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateChannel()}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivateChannel}
                  onChange={(e) => setIsPrivateChannel(e.target.checked)}
                  className="w-4 h-4 rounded border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--accent))] focus:ring-[hsl(var(--accent))]"
                />
                <label htmlFor="private" className="text-sm text-[hsl(var(--foreground))]">
                  Make private (only invited members can access)
                </label>
              </div>
              <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                  setIsPrivateChannel(false);
                }}
                className="px-4 py-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-xl transition-all duration-200 button-press"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                className="px-4 py-2 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-xl hover:opacity-90 transition-all duration-200 hover-lift button-press shadow-md"
              >
                Create
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 modal-backdrop flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowInviteModal(false)}>
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in hover-lift border border-[hsl(var(--border))]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Invite to channel</h3>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleSendInvitation()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setSelectedRoomForInvite(null);
                }}
                className="px-4 py-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-xl transition-all duration-200 button-press"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitation}
                className="px-4 py-2 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-xl hover:opacity-90 transition-all duration-200 hover-lift button-press shadow-md"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 modal-backdrop flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowJoinModal(false)}>
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in hover-lift border border-[hsl(var(--border))]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Join a channel</h3>
            <input
              type="text"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
              placeholder="Enter channel key"
              className="w-full px-4 py-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoomByKey()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinKey('');
                }}
                className="px-4 py-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-xl transition-all duration-200 button-press"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinRoomByKey}
                className="px-4 py-2 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-xl hover:opacity-90 transition-all duration-200 hover-lift button-press shadow-md"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitations View */}
      {view === 'invitations' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-[hsl(var(--card))] rounded-lg shadow-xl w-full max-w-md p-6 animate-slide-up max-h-96 overflow-y-auto border border-[hsl(var(--border))]">
            <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Pending Invitations</h3>
            {invitations.length === 0 ? (
              <div className="text-center text-[hsl(var(--muted-foreground))] py-8">No pending invitations</div>
            ) : (
              <div className="space-y-3">
                {invitations.map((inv: any) => (
                  <div key={inv.id} className="border border-[hsl(var(--border))] rounded-lg p-4 bg-[hsl(var(--secondary))]">
                    <div className="font-semibold text-[hsl(var(--foreground))] mb-1">{inv.room.name}</div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
                      Invited by {inv.inviter.name}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptInvitation(inv.id)}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectInvitation(inv.id)}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setView('rooms')}
              className="mt-4 w-full py-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
