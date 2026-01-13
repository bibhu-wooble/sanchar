'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useChatStore } from '@/lib/store';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

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
      <div className="h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 font-medium">Loading Sanchar...</div>
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
    <div className="h-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="font-bold text-gray-800">Sanchar</span>
        </div>
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {user?.name?.[0]?.toUpperCase()}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto flex flex-col transition-all duration-300 bg-white border-r border-gray-200 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'} md:w-64`}>
        {/* Workspace Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              S
            </div>
            {!sidebarCollapsed && <span className="font-bold text-gray-800 text-lg">Sanchar</span>}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-800 truncate">{user?.name}</div>
                <div className="text-xs text-gray-500 truncate">Online</div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Channels Section */}
          <div className="px-4 py-2">
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Channels</span>
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="text-gray-500 hover:text-gray-700 text-lg"
                  title="Create channel"
                >
                  +
                </button>
              </div>
            )}
            
            {/* Public Channels */}
            {publicRooms.map((room: any, index: number) => (
              <button
                key={room.id}
                onClick={() => {
                  setCurrentRoom(room.id);
                  setView('rooms');
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all duration-200 hover-lift ${
                  currentRoom === room.id
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <span className={currentRoom === room.id ? 'text-white' : 'text-gray-500'}>#</span>
                {!sidebarCollapsed && <span className="truncate">{room.name}</span>}
              </button>
            ))}

            {/* Private Channels */}
            {privateRooms.length > 0 && !sidebarCollapsed && (
              <>
                <div className="mt-4 mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Private</span>
                </div>
                {privateRooms.map((room: any, index: number) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      setCurrentRoom(room.id);
                      setView('rooms');
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all duration-200 hover-lift ${
                      currentRoom === room.id
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <span className={currentRoom === room.id ? 'text-white' : 'text-gray-500'}>🔒</span>
                    {!sidebarCollapsed && <span className="truncate">{room.name}</span>}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Direct Messages Section */}
          <div className="px-4 py-2 border-t border-gray-200">
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Direct Messages</span>
              </div>
            )}
            {directMessageUsers.map((u: any) => (
              <button
                key={u.id}
                onClick={() => handleStartDirectMessage(u.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  currentDirectMessage === u.id
                    ? 'bg-purple-100 text-purple-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                    onlineUsers.has(u.id) ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  {onlineUsers.has(u.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                {!sidebarCollapsed && <span className="truncate">{u.name}</span>}
              </button>
            ))}
          </div>

          {/* All Users (for starting new DMs) */}
          {!sidebarCollapsed && (
            <div className="px-4 py-2 border-t border-gray-200">
              <div className="mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Users</span>
              </div>
              {users.slice(0, 10).map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => handleStartDirectMessage(u.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                      onlineUsers.has(u.id) ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    {onlineUsers.has(u.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <span className="truncate">{u.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 p-2">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            {!sidebarCollapsed ? 'Sign out' : '🚪'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white md:static">
        {/* Header */}
        <div className="h-14 md:h-16 border-b border-gray-200 bg-white flex items-center justify-between px-3 md:px-4 shadow-sm z-10">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-gray-500 hidden sm:inline">#</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-gray-800 text-sm md:text-base truncate">
                {currentRoom
                  ? rooms.find((r: any) => r.id === currentRoom)?.name || 'Channel'
                  : currentDirectMessage
                  ? users.find((u: any) => u.id === currentDirectMessage)?.name || 'Direct Message'
                  : 'Select a channel or DM'}
              </span>
              {currentDirectMessage && (
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${onlineUsers.has(currentDirectMessage) ? 'bg-green-500' : 'bg-gray-400'}`} title={onlineUsers.has(currentDirectMessage) ? 'Online' : 'Offline'} />
              )}
            </div>
            {currentRoom && (
              <button
                onClick={() => {
                  setSelectedRoomForInvite(currentRoom);
                  setShowInviteModal(true);
                }}
                className="ml-2 md:ml-4 text-xs md:text-sm text-gray-500 hover:text-gray-700 hidden sm:block"
              >
                Invite
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-2 md:px-3 py-1 text-xs md:text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              <span className="hidden sm:inline">Join</span>
              <span className="sm:hidden">+</span>
            </button>
            {invitations.length > 0 && (
              <button
                onClick={() => setView('invitations')}
                className="px-2 md:px-3 py-1 text-xs md:text-sm bg-purple-600 text-white rounded hover:bg-purple-700 relative"
              >
                <span className="hidden sm:inline">Invitations</span>
                <span className="sm:hidden">📬</span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] md:text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                  {invitations.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 via-blue-50/30 to-gray-50 messages-container py-3 md:py-4 px-2 md:px-4">
          {currentMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full animate-fade-in">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4 animate-bounce-slow">💬</div>
                <div className="text-xl font-semibold mb-2 text-gray-700">No messages yet</div>
                <div className="text-gray-500">Start the conversation!</div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {currentMessages
                .filter((msg: any, idx: number, arr: any[]) => {
                  // Remove duplicates by checking if this message ID already appeared earlier
                  return arr.findIndex((m: any) => m.id === msg.id) === idx;
                })
                .map((message: any, index: number, filteredArray: any[]) => {
                const isMyMessage = message.userId === user?.id;
                const prevMessage = index > 0 ? filteredArray[index - 1] : null;
                const nextMessage = index < filteredArray.length - 1 ? filteredArray[index + 1] : null;
                const isSameUser = prevMessage && prevMessage.userId === message.userId;
                const isConsecutive = isSameUser && 
                  new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000;
                const showAvatar = !isConsecutive && !isMyMessage;
                const showName = !isConsecutive && !isMyMessage;
                const showTime = !nextMessage || nextMessage.userId !== message.userId ||
                  new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime() > 300000;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-1 group`}
                    style={{ animationDelay: `${index * 0.02}s` }}
                  >
                    <div className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar - only for received messages */}
                      {showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg ring-2 ring-white">
                          {message.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      {!showAvatar && !isMyMessage && <div className="w-8 flex-shrink-0" />}
                      
                      {/* Message Container */}
                      <div className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} gap-0.5`}>
                        {/* Sender Name - only for received messages */}
                        {showName && (
                          <div className="text-xs text-gray-500 px-2 py-0.5 font-medium">
                            {message.user?.name || 'Unknown'}
                          </div>
                        )}
                        
                        {/* Message Bubble */}
                        <div
                          className={`relative px-3 py-2 rounded-2xl transition-all duration-200 ${
                            isMyMessage
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm shadow-lg hover:shadow-xl'
                              : 'bg-white text-gray-800 rounded-tl-sm shadow-md hover:shadow-lg border border-gray-100'
                          } ${isConsecutive ? (isMyMessage ? 'rounded-tr-md' : 'rounded-tl-md') : ''}`}
                        >
                          <div className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${isMyMessage ? 'text-white' : 'text-gray-800'}`}>
                            {message.content}
                          </div>
                          
                          {/* Time inside bubble */}
                          <div className={`flex items-center gap-1 mt-1 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMyMessage && (
                              <svg className="w-3 h-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 bg-white shadow-lg">
          {/* Typing Indicator - Above input box */}
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
              .filter((name) => name !== user?.name); // Exclude current user
            
            if (typingUserNames.length === 0) return null;
            
            return (
              <div className="px-4 py-2 text-sm text-gray-500 italic animate-pulse-slow border-b border-gray-200 bg-gray-50 animate-slide-down">
                <span className="inline-flex items-center gap-1">
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </span>
                  {typingUserNames.length === 1
                    ? `${typingUserNames[0]} is typing...`
                    : typingUserNames.length === 2
                    ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`
                    : `${typingUserNames[0]}, ${typingUserNames[1]} and ${typingUserNames.length - 2} others are typing...`}
                </span>
              </div>
            );
          })()}
          
          <div className="p-3 md:p-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-3 md:px-4 py-2 border border-gray-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all duration-200">
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleTyping(false);
                    handleSendMessage();
                  }
                }}
                onBlur={() => {
                  handleTyping(false);
                }}
                placeholder={`Type a message...`}
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 text-sm md:text-base py-1"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`p-2 md:p-2.5 rounded-full transition-all duration-200 flex-shrink-0 ${
                  newMessage.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg hover:scale-110'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/50 modal-backdrop flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowCreateChannel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in hover-lift" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Create a channel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. marketing"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateChannel()}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivateChannel}
                  onChange={(e) => setIsPrivateChannel(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="private" className="text-sm text-gray-700">
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
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 button-press"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 hover-lift button-press shadow-md"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in hover-lift" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Invite to channel</h3>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleSendInvitation()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setSelectedRoomForInvite(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 button-press"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitation}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 hover-lift button-press shadow-md"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in hover-lift" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Join a channel</h3>
            <input
              type="text"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
              placeholder="Enter channel key"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoomByKey()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinKey('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 button-press"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinRoomByKey}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 hover-lift button-press shadow-md"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitations View */}
      {view === 'invitations' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-slide-up max-h-96 overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Pending Invitations</h3>
            {invitations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No pending invitations</div>
            ) : (
              <div className="space-y-3">
                {invitations.map((inv: any) => (
                  <div key={inv.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-1">{inv.room.name}</div>
                    <div className="text-sm text-gray-600 mb-3">
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
              className="mt-4 w-full py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
