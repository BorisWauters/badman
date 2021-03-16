import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/_shared';
import { ClubManagementRoutingModule } from './club-management-routing.module';
import { ClubFieldsComponent } from './components/club-fields/club-fields.component';
import { AddClubComponent } from './pages/add-club/add-club.component';
import { EditClubComponent } from './pages/edit-club/edit-club.component';
// import { AddTeamComponent } from './pages/add-team/add-team.component';
import { AddPlayerComponent } from './dialogs/add-player/add-player.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ClubEditRoleComponent } from './pages/edit-club/components/club-edit-role/club-edit-role.component';
import { RoleFieldsComponent } from './components/role-fields/role-fields.component';
import { AddRoleComponent } from './pages/add-role/add-role.component';
import { EditRoleComponent } from './pages/edit-role/edit-role.component';

const materialModules = [
  FormsModule,
  MatButtonModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatSnackBarModule,
  MatSortModule,
  MatCheckboxModule,
  MatTableModule,
  ReactiveFormsModule,
  MatIconModule,
];

@NgModule({
  declarations: [
    AddClubComponent,
    EditClubComponent,
    EditRoleComponent,
    ClubFieldsComponent,
    RoleFieldsComponent,
    // AddTeamComponent,
    AddPlayerComponent,
    AddRoleComponent,
    ClubEditRoleComponent,
  ],
  imports: [SharedModule, ...materialModules, ClubManagementRoutingModule],
  exports: [ClubFieldsComponent],
})
export class ClubManagementModule {}
