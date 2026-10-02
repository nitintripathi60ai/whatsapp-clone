import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-settings.html',
  styleUrl: './profile-settings.scss'
})
export class ProfileSettings {
  auth = inject(Auth);
  @Output() close = new EventEmitter<void>();

  user = this.auth.currentUser();
  name = this.user?.name || '';
  about = this.user?.about || '';
  profilePic = this.user?.profilePic || '';
  loading = false;
  showSuccess = signal(false);

  async onUpdate() {
    this.loading = true;
    this.showSuccess.set(false);
    try {
      await this.auth.updateProfile({
        name: this.name,
        about: this.about,
        profilePic: this.profilePic
      });
      this.showSuccess.set(true);
      // Success message delay
      setTimeout(() => {
        this.showSuccess.set(false);
        this.close.emit();
      }, 1500);
    } catch (err) {
      console.error('Update failed:', err);
      alert('Profile update failed. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profilePic = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
}