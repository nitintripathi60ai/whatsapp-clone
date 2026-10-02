import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import type { Message } from '../models/message.interface';

@Injectable({
  providedIn: 'root',
})


export class ChatService {
  private socket: Socket | null = null;
  private url = '';
  private currentRoomId = '';

  constructor() {
    if (typeof window !== 'undefined') {
      const prodUrl = (window as any).BACKEND_URL;
      if (prodUrl) {
        this.url = prodUrl;
      } else if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('10.242')) {
        // You can set your production backend URL here
        this.url = 'https://whatsapp-backend-yourname.render.com';
      } else {
        this.url = `http://${window.location.hostname}:3000`;
      }
    }
  }

  connect() {
    if (this.socket?.connected) return;
    this.socket = io(this.url);
  }

  joinRoom(roomId: string) {
    this.currentRoomId = roomId;
    this.socket?.emit('joinRoom', roomId);
  }

  sendMessage(message: string, sender: { phone: string, name: string }, type: string = 'text', fileData: string | null = null) {
    if (!this.currentRoomId) return;
    this.socket?.emit('sendMessage', { roomId: this.currentRoomId, message, sender, type, fileData });
  }

  onNewMessage(): Observable<any> {
    return new Observable(observer => {
      this.socket?.on('newMessage', (data) => observer.next(data));
      return () => this.socket?.off('newMessage');
    });
  }

  onMessageReactionUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket?.on('messageReactionUpdate', (data) => observer.next(data));
      return () => this.socket?.off('messageReactionUpdate');
    });
  }

  reactToMessage(messageId: string, emoji: string, senderPhone: string) {
    this.socket?.emit('reactToMessage', { messageId, emoji, senderPhone });
  }

  onPreviousMessages(): Observable<any[]> {
    return new Observable(observer => {
      this.socket?.on('previousMessages', (data) => observer.next(data));
      return () => this.socket?.off('previousMessages');
    });
  }

  onUserTyping(): Observable<any> {
    return new Observable(observer => {
      this.socket?.on('userTyping', (data) => observer.next(data));
      return () => this.socket?.off('userTyping');
    });
  }

  onUserRegistered(): Observable<any> {
    return new Observable(observer => {
      this.socket?.on('userRegistered', (data) => observer.next(data));
      return () => this.socket?.off('userRegistered');
    });
  }

  typing(isTyping: boolean, user: string) {
    if (!this.currentRoomId) return;
    this.socket?.emit('typing', { roomId: this.currentRoomId, isTyping, user });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
