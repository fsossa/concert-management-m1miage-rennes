import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-concert-search',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './concert-search.html'
})
export class ConcertSearchComponent {
  protected readonly results = [
    { id: 301, title: 'Synth Beats', topic: 'Electro', artist: 'Nova Pulse', date: '06 Mai 2026' },
    { id: 302, title: 'Street Legends', topic: 'Rap', artist: 'K-One', date: '14 Mai 2026' },
    { id: 303, title: 'Soul Reverie', topic: 'Jazz', artist: 'Lina Blue', date: '20 Mai 2026' },
    { id: 304, title: 'Night Riffs', topic: 'Rock', artist: 'Red Axis', date: '26 Mai 2026' }
  ];
}
