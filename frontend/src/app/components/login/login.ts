import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit, OnDestroy {
  auth = inject(Auth);
  
  phone = signal('');
  name = signal('');
  otp = signal('');
  step = signal(1); // 1: Phone, 2: OTP, 3: New User Name
  loading = signal(false);
  userExists = signal(false);
  serverOtp = signal(''); // For simulation

  ngOnInit() {}

  ngOnDestroy() {}

  async onRequestOtp() {
    if (!this.phone()) return;
    this.loading.set(true);
    try {
      const res = await this.auth.requestOtp(this.phone());
      this.userExists.set(res.userExists);
      this.name.set(res.name || ''); // Get name from backend if exists
      this.serverOtp.set(res.otp); 
      
      // Artificial delay to show "Connecting..." state
      setTimeout(() => {
        this.step.set(2);
        this.loading.set(false);
        if (this.serverOtp()) {
          console.log(`[DEV] Your OTP is: ${this.serverOtp()}`);
        }
      }, 1000);
    } catch (err) {
      alert('Failed to send OTP');
      this.loading.set(false);
    }
  }

  async onVerifyOtp() {
    if (!this.otp()) return;
    this.loading.set(true);
    try {
      // Directly verify OTP. If user is new, backend/service will handle default name.
      await this.auth.verifyOtp(this.phone(), this.otp());
    } catch (err) {
      alert('Invalid OTP. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  reset() {
    this.step.set(1);
    this.otp.set('');
  }
}