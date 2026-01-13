// Use relative URLs (same origin) in production, or environment variable if set
// This ensures API calls work on the same domain (no CORS issues)
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

      // Check if response is ok before parsing
      if (!response.ok) {
        // Try to parse error response as JSON
        let errorData: any = {};
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await response.json();
          } catch (e) {
            // If JSON parsing fails, use status text
            errorData = { error: response.statusText || `HTTP error! status: ${response.status}` };
          }
        } else {
          // If not JSON, try to get text
          try {
            const text = await response.text();
            errorData = { error: text || response.statusText || `HTTP error! status: ${response.status}` };
          } catch (e) {
            errorData = { error: response.statusText || `HTTP error! status: ${response.status}` };
          }
        }
        
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        console.error('API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      // Parse successful response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API Error: Expected JSON but got:', contentType, text.substring(0, 100));
        throw new Error('Invalid response format from server');
      }

      const data = await response.json();
      return data as T;
    } catch (error: any) {
      // If it's already an Error with a message, re-throw it
      if (error instanceof Error && error.message) {
        console.error('Request failed:', endpoint, error.message);
        throw error;
      }
      // Otherwise, wrap it
      console.error('Request failed:', endpoint, error);
      throw new Error(error.message || 'Network error occurred');
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
