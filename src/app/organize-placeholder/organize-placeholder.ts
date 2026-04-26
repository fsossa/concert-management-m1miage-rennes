import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-organize-placeholder',
  standalone: true,
  templateUrl: './organize-placeholder.html'
})
export class OrganizePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  protected get sectionTitle(): string {
    return this.route.snapshot.data['title'] ?? 'Section';
  }
}
