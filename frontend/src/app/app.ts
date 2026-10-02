import { Component, inject, signal, effect, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from './components/sidebar/sidebar';
import { ChatWindow } from './components/chat-window/chat-window';
import { MessageInput } from './components/message-input/message-input';
import { ChatService } from './services/chat';
import { Auth } from './services/auth';
import { Login } from './components/login/login';
import { ProfileSettings } from './components/profile-settings/profile-settings';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, ChatWindow, MessageInput, Login, ProfileSettings],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  providers: [ChatService]
})
export class App implements AfterViewChecked, OnDestroy {
  chatService = inject(ChatService);
  auth = inject(Auth);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isSidebarOpen = signal(true);
  selectedChat = signal<any>(null); // To track which chat is open
  isProfileOpen = signal(false);
  isCalling = signal(false);
  isDarkMode = signal(false);
  callingType = signal('');
  messages = signal<any[]>([]);
  searchQuery = signal('');
  filteredUsers = signal<any[]>([]);
  allUsers = signal<any[]>([]);
  currentTab = signal('chats'); // 'chats', 'status', 'channels'
  typingUsers = signal<string[]>([]);
  myStatuses = signal<any[]>([]);
  viewingStatus = signal<any>(null);
  window = typeof window !== 'undefined' ? window : null;

  private subs = new Subscription();

  isRefreshing = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      // On desktop, we want both sidebar and chat window. 
      // On mobile, we want sidebar (chat list) initially.
      this.isSidebarOpen.set(true);
      
      // Force light mode as requested
      this.isDarkMode.set(false);
      document.documentElement.classList.remove('dark');
      localStorage.setItem('whatsapp_dark_mode', 'false');
      
      window.addEventListener('resize', () => {
        // If we switch to desktop, ensure sidebar is open
        if (window.innerWidth > 768) {
          this.isSidebarOpen.set(true);
        } else if (!this.selectedChat()) {
          // If we switch to mobile and no chat is selected, ensure sidebar is open
          this.isSidebarOpen.set(true);
        }
      });
    }

    effect((onCleanup) => {
      const user = this.auth.currentUser();
      if (user) {
        this.chatService.connect();
        this.loadUsers();
        
        // Refresh users every 15 seconds to show new registrations
        const userRefreshInterval = setInterval(() => {
          this.loadUsers();
        }, 15000);

        // Use a unique set of message IDs to prevent duplicates
        const messageIds = new Set<string>();

        const sub1 = this.chatService.onNewMessage().subscribe(msg => {
          // Verify if message belongs to the currently selected chat room
          const currentChat = this.selectedChat();
          const currentUser = this.auth.currentUser();
          if (currentChat && currentUser) {
            const expectedRoomId = [currentUser.phone, currentChat.phone].sort().join('_');
            if (msg.roomId === expectedRoomId) {
              if (msg._id && messageIds.has(msg._id)) return;
              if (msg._id) messageIds.add(msg._id);
              this.messages.update(m => [...m, msg]);
            }
          }
        });

        const sub2 = this.chatService.onPreviousMessages().subscribe(msgs => {
          this.messages.set(msgs);
          messageIds.clear();
          msgs.forEach(m => m._id && messageIds.add(m._id));
        });

        const sub3 = this.chatService.onMessageReactionUpdate().subscribe(({ messageId, reactions }) => {
          this.messages.update(msgs => msgs.map(m => 
            m._id === messageId ? { ...m, reactions } : m
          ));
        });

        const sub4 = this.chatService.onUserTyping().subscribe(({ isTyping, user: typingUser }) => {
          if (typingUser === this.auth.currentUser()?.name) return;
          this.typingUsers.update(users => {
            if (isTyping) return [...new Set([...users, typingUser])];
            return users.filter(u => u !== typingUser);
          });
        });

        const sub5 = this.chatService.onUserRegistered().subscribe(() => {
          this.loadUsers();
        });

        onCleanup(() => {
          clearInterval(userRefreshInterval);
          sub1.unsubscribe();
          sub2.unsubscribe();
          sub3.unsubscribe();
          sub4.unsubscribe();
          sub5.unsubscribe();
        });
      }
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  toggleDarkMode() {
    this.isDarkMode.update(v => {
      const newVal = !v;
      localStorage.setItem('whatsapp_dark_mode', String(newVal));
      if (newVal) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newVal;
    });
  }

  async loadUsers() {
    try {
      const users = await this.auth.getAllUsers();
      const currentUser = this.auth.currentUser();
      
      if (users && Array.isArray(users)) {
        // Filter out the current user and ensure valid user data from database
        const realUsers = users.filter((u: any) => 
          u.phone && 
          u.name && 
          u.phone !== currentUser?.phone
        );
        
        this.allUsers.set(realUsers);
        
        if (!this.searchQuery()) {
          this.filteredUsers.set(realUsers);
        }
      }
    } catch (err) {
      console.error('Error loading users from database:', err);
    }
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    if (!query) {
      this.filteredUsers.set(this.allUsers());
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = this.allUsers().filter(u => 
      u.name.toLowerCase().includes(lowerQuery) || 
      u.phone.includes(query)
    );
    this.filteredUsers.set(filtered);
  }

  askAI() {
    const aiMessage = prompt("Ask WhatsApp AI anything:");
    if (aiMessage) {
      // Simulate AI Chat
      const user = this.auth.currentUser();
      this.messages.update(m => [...m, {
        sender: 'WhatsApp AI',
        text: `You asked: "${aiMessage}". I'm here to help! (This is a simulated AI response)`,
        senderPhone: 'AI',
        senderProfilePic: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Meta_Platforms_Inc._logo.svg/1024px-Meta_Platforms_Inc._logo.svg.png',
        timestamp: new Date()
      }]);
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  selectChat(chat: any) {
    console.log('selectChat called:', chat, 'isMobile:', this.isMobile());
    this.selectedChat.set(chat);
    console.log('selectedChat set, value:', this.selectedChat());
    this.messages.set([]); // Clear messages before loading new ones
    
    // Create a unique roomId for two users based on their phone numbers
    const currentUser = this.auth.currentUser();
    if (currentUser && chat.phone) {
      // Sort phone numbers to ensure the same roomId for both users (A_B and B_A will both be A_B)
      const roomId = [currentUser.phone, chat.phone].sort().join('_');
      console.log('Joining room:', roomId);
      this.chatService.joinRoom(roomId);
    }

    // On mobile, hide sidebar to show the chat window
    if (this.isMobile()) {
      console.log('Mobile detected, closing sidebar');
      this.isSidebarOpen.set(false);
      console.log('isSidebarOpen now:', this.isSidebarOpen());
    }
  }

  backToChats() {
    this.selectedChat.set(null);
    if (this.isMobile()) {
      this.isSidebarOpen.set(true);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  isMobile(): boolean {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  }

  toggleProfile() {
    this.isProfileOpen.update(v => !v);
  }

  onProfileClose() {
    this.isProfileOpen.set(false);
    // Refresh user data in case it changed
    this.loadUsers();
  }

  startCall(type: string) {
    this.isCalling.set(true);
    this.callingType.set(type);
    setTimeout(() => {
      this.isCalling.set(false);
      alert(`${type} call ended (Simulation)`);
    }, 5000);
  }

  addStatus(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const newStatus = {
          id: Date.now(),
          url: e.target.result,
          time: 'Just now',
          viewed: false
        };
        this.myStatuses.update(s => [newStatus, ...s]);
        // Open the viewer immediately for the new status
        this.viewStatus(newStatus);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    event.target.value = '';
  }

  viewStatus(status: any) {
    this.viewingStatus.set(status);
    
    // Mark as viewed
    this.myStatuses.update(ss => ss.map(s => s.id === status.id ? { ...s, viewed: true } : s));
    
    // Auto close after 3 seconds
    setTimeout(() => {
      if (this.viewingStatus() === status) {
        this.viewingStatus.set(null);
      }
    }, 3000);
  }

  createCommunity() {
    const name = prompt("Enter community name:");
    if (name) {
      alert(`Community "${name}" created successfully! (Simulation)`);
      this.currentTab.set('chats');
    }
  }

  createCallLink() {
    const link = `https://whatsapp.com/call/${Math.random().toString(36).substring(7)}`;
    const confirmCopy = confirm(`Call link created: ${link}\n\nDo you want to copy this link?`);
    if (confirmCopy) {
      if (typeof navigator !== 'undefined') {
        navigator.clipboard.writeText(link);
        alert('Link copied to clipboard!');
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.addStatusFromData(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  addStatusFromData(url: string) {
    this.myStatuses.update(s => [...s, {
      id: Date.now(),
      url: url,
      time: 'Just now',
      viewed: false
    }]);
    alert('Status updated successfully!');
  }
}
