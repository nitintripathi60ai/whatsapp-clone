import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';
import { ChatService } from '../../services/chat';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss',
})
export class ChatWindow {
  auth = inject(Auth);
  chatService = inject(ChatService);
  messages = input<any[]>([]);
  showReactionMenu = signal<string | null>(null);

  isMe(message: any): boolean {
    return message.senderPhone === this.auth.currentUser()?.phone;
  }

  formatTime(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  toggleReactionMenu(msgId: string) {
    if (this.showReactionMenu() === msgId) {
      this.showReactionMenu.set(null);
    } else {
      this.showReactionMenu.set(msgId);
    }
  }

  react(msgId: string, emoji: string) {
    const user = this.auth.currentUser();
    if (user) {
      this.chatService.reactToMessage(msgId, emoji, user.phone);
      this.showReactionMenu.set(null);
    }
  }
}

