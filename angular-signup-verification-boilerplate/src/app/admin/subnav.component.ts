import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-subnav',
  templateUrl: './subnav.component.html'
})
export class SubnavComponent implements OnInit {
  showSubNav: boolean = true;

  constructor(private router: Router) { }

  ngOnInit() {
    // Any initialization logic if needed
  }
}