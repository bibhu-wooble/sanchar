const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface CreateRoomData {
  name: string;
  userIds: string[];
  token: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({ error: 'Failed to parse response' }));

      if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
        console.error('API Error:', errorMessage, data);
        throw new Error(errorMessage);
      }

      return data as T;
    } catch (error: any) {
      console.error('Request failed:', endpoint, error);
      throw error;
    }
  }

  async register(data: RegisterData) {
    return this.request<{ success: boolean; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData) {
    return this.request<{ success: boolean; token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRoom(data: CreateRoomData & { isPrivate?: boolean; type?: string }) {
    return this.request<{ success: boolean; room: any }>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserRooms(token: string) {
    return this.request<{ success: boolean; rooms: any[] }>('/api/rooms/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getRoomMessages(roomId: string) {
    return this.request<{ success: boolean; messages: any[] }>(`/api/rooms/${roomId}/messages`);
  }

  async sendInvitation(roomId: string, email: string, token: string) {
    return this.request<{ success: boolean; invitation: any }>('/api/invitations/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ roomId, email }),
    });
  }

  async getInvitations(token: string) {
    return this.request<{ success: boolean; invitations: any[] }>('/api/invitations', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async acceptInvitation(invitationId: string, token: string) {
    return this.request<{ success: boolean }>(`/api/invitations/${invitationId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async rejectInvitation(invitationId: string, token: string) {
    return this.request<{ success: boolean }>(`/api/invitations/${invitationId}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async joinRoomByKey(joinKey: string, token: string) {
    return this.request<{ success: boolean; room: any }>('/api/rooms/join', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ joinKey }),
    });
  }

  async getAllUsers(token: string) {
    return this.request<{ success: boolean; users: any[] }>('/api/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getDirectMessages(userId: string, token: string) {
    return this.request<{ success: boolean; messages: any[] }>(`/api/direct-messages/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async sendDirectMessage(receiverId: string, content: string, token: string) {
    try {
      const response = await this.request<{ success: boolean; message: any; error?: string }>('/api/direct-messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId, content }),
      });
      return response;
    } catch (error: any) {
      console.error('API Error:', error);
      throw new Error(error.message || 'Failed to send message');
    }
  }
}

export const api = new ApiClient();
