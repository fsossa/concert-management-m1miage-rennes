import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-management-placeholder',
  standalone: true,
  templateUrl: './management-placeholder.html'
})
export class ManagementPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  protected get sectionTitle(): string {
    return this.route.snapshot.data['title'] ?? 'Section';
  }
}
