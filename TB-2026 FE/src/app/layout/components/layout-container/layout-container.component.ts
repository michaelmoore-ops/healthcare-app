import { Component } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { RouterModule } from '@angular/router';
import { IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-layout-container',
  imports: [FooterComponent, RouterModule, IonRouterOutlet],
  templateUrl: './layout-container.component.html',
  styleUrl: './layout-container.component.scss'
})
export class LayoutContainerComponent {

}
