import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss',
})
export class MessageInput {
  chatService = inject(ChatService);
  auth = inject(Auth);
  message = '';
  showAttachmentMenu = signal(false);
  private typingTimeout: any;

  toggleAttachments() {
    this.showAttachmentMenu.update(v => !v);
  }

  onFileSelected(event: any, type: string) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const user = this.auth.currentUser();
        if (user) {
          let msgType = 'file';
          if (file.type.startsWith('image/')) msgType = 'image';
          else if (file.type.startsWith('video/')) msgType = 'video';
          
          this.chatService.sendMessage(file.name, {
            name: user.name,
            phone: user.phone
          }, msgType, e.target.result);
        }
      };
      reader.readAsDataURL(file);
      this.showAttachmentMenu.set(false);
    }
  }

  onTyping() {
    const user = this.auth.currentUser();
    if (user) {
      this.chatService.typing(true, user.name);
      
      if (this.typingTimeout) clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.chatService.typing(false, user.name);
      }, 2000);
    }
  }

  send() {
    const user = this.auth.currentUser();
    if (this.message.trim() && user) {
      console.log('Sending message from:', user.phone);
      this.chatService.sendMessage(this.message.trim(), {
        name: user.name,
        phone: user.phone
      });
      this.message = '';
      this.chatService.typing(false, user.name);
    }
  }


  pay() {
    alert('WhatsApp Pay feature is coming soon! (Simulation)');
  }

  voiceCall() {
    alert('Voice recording/calling feature is coming soon! (Simulation)');
  }
}
