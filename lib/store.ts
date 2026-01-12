import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    }
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

interface ChatState {
  currentRoom: string | null;
  currentDirectMessage: string | null; // userId
  rooms: any[];
  directMessages: Record<string, any[]>; // userId -> messages
  messages: Record<string, any[]>; // roomId -> messages
  users: any[];
  invitations: any[];
  typingUsers: Record<string, Set<string>>; // roomId/userId -> Set of user IDs typing
  onlineUsers: Set<string>; // Set of online user IDs
  view: 'rooms' | 'direct' | 'users' | 'invitations';
  setCurrentRoom: (roomId: string | null) => void;
  setCurrentDirectMessage: (userId: string | null) => void;
  setRooms: (rooms: any[]) => void;
  setUsers: (users: any[]) => void;
  setInvitations: (invitations: any[]) => void;
  addMessage: (roomId: string, message: any) => void;
  addDirectMessage: (userId: string, message: any) => void;
  setMessages: (roomId: string, messages: any[]) => void;
  setDirectMessages: (userId: string, messages: any[]) => void;
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void;
  setUserOnline: (userId: string, isOnline: boolean) => void;
  setView: (view: 'rooms' | 'direct' | 'users' | 'invitations') => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentRoom: null,
  currentDirectMessage: null,
  rooms: [],
  directMessages: {},
  messages: {},
  users: [],
  invitations: [],
  typingUsers: {},
  onlineUsers: new Set<string>(),
  view: 'rooms',
  setCurrentRoom: (roomId) => set({ currentRoom: roomId, currentDirectMessage: null }),
  setCurrentDirectMessage: (userId) => set({ currentDirectMessage: userId, currentRoom: null }),
  setRooms: (rooms) => set({ rooms }),
  setUsers: (users) => set({ users }),
  setInvitations: (invitations) => set({ invitations }),
      addMessage: (roomId, message) =>
        set((state) => {
          const existingMessages = state.messages[roomId] || [];
          // Check if message already exists to prevent duplicates
          const messageExists = existingMessages.some((msg: any) => msg.id === message.id);
          if (messageExists) {
            return state; // Don't add duplicate
          }
          return {
            messages: {
              ...state.messages,
              [roomId]: [...existingMessages, message],
            },
          };
        }),
  addDirectMessage: (userId, message) =>
    set((state) => {
      const existingMessages = state.directMessages[userId] || [];
      // Prevent duplicates by checking message ID
      const messageExists = existingMessages.some((msg: any) => msg.id === message.id);
      if (messageExists) {
        return state; // Don't add duplicate
      }
      return {
        directMessages: {
          ...state.directMessages,
          [userId]: [...existingMessages, message],
        },
      };
    }),
  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: messages,
      },
    })),
  setDirectMessages: (userId, messages) =>
    set((state) => ({
      directMessages: {
        ...state.directMessages,
        [userId]: messages,
      },
    })),
  setTyping: (roomId, userId, isTyping) =>
    set((state) => {
      const typingSet = state.typingUsers[roomId] || new Set<string>();
      if (isTyping) {
        typingSet.add(userId);
      } else {
        typingSet.delete(userId);
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: typingSet,
        },
      };
    }),
  setUserOnline: (userId, isOnline) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      if (isOnline) {
        newOnlineUsers.add(userId);
      } else {
        newOnlineUsers.delete(userId);
      }
      return { onlineUsers: newOnlineUsers };
    }),
  setView: (view) => set({ view }),
}));
