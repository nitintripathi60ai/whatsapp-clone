import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private userKey = 'whatsapp_clone_user';
  currentUser = signal<any>(this.getUserFromStorage());

  private getUserFromStorage() {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  private getBaseUrl() {
    if (typeof window !== 'undefined') {
      // Check for a global configuration or use localhost as fallback
      const prodUrl = (window as any).BACKEND_URL;
      if (prodUrl) return prodUrl;
      
      // If we are on a custom domain (not localhost/IP), we might need a specific prod backend
      if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('10.242')) {
        // You can set your production backend URL here
        return 'https://whatsapp-backend-yourname.render.com';
      }
      
      return `http://${window.location.hostname}:3000`;
    }
    return 'http://localhost:3000';
  }

  async requestOtp(phone: string) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!response.ok) throw new Error('OTP request failed');
      return await response.json();
    } catch (err) {
      console.error('OTP Request error:', err);
      // Fallback for simulation
      return { message: 'OTP sent (Simulation)', userExists: false, otp: '123456' };
    }
  }

  async verifyOtp(phone: string, otp: string, name?: string) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, name }),
      });
      if (!response.ok) throw new Error('Verification failed');
      const user = await response.json();
      this.saveUser(user);
      return user;
    } catch (err) {
      console.error('OTP Verification error:', err);
      // Fallback for development
      if (otp === '123456') {
        const fallbackUser = {
          _id: 'fallback_' + Date.now(),
          phone,
          name: name || 'User ' + phone.slice(-4),
          profilePic: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
          about: 'Hey there! I am using WhatsApp.'
        };
        this.saveUser(fallbackUser);
        return fallbackUser;
      }
      throw err;
    }
  }

  async login(phone: string, name: string) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      if (!response.ok) throw new Error('Login failed');
      const user = await response.json();
      this.saveUser(user);
      return user;
    } catch (err) {
      console.warn('Backend login failed, using local fallback:', err);
      // Fallback for development/simulation
      const fallbackUser = {
        _id: 'fallback_' + Date.now(),
        phone,
        name,
        profilePic: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
        about: 'Hey there! I am using WhatsApp.'
      };
      this.saveUser(fallbackUser);
      return fallbackUser;
    }
  }

  async updateProfile(userData: { name: string, about: string, profilePic: string }) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, phone: this.currentUser().phone }),
      });
      if (!response.ok) throw new Error('Update failed');
      const user = await response.json();
      this.saveUser(user);
      return user;
    } catch (err) {
      console.warn('Backend update failed, using local fallback:', err);
      // Fallback for development/simulation
      const updatedUser = { 
        ...this.currentUser(), 
        ...userData 
      };
      this.saveUser(updatedUser);
      return updatedUser;
    }
  }

  async getAllUsers() {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/users`);
      return await response.json();
    } catch (err) {
      console.error('Fetch users error:', err);
      return [];
    }
  }

  private saveUser(user: any) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    this.currentUser.set(user);
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.userKey);
    }
    this.currentUser.set(null);
  }

  isLoggedIn() {
    return !!this.currentUser();
  }
}
