import { Component, inject, input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  auth = inject(Auth);
  users = input<any[]>([]);
  @Output() userClick = new EventEmitter<any>();
}
