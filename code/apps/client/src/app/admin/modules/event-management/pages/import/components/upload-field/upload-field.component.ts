import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  selector: 'badman-upload-field',
  templateUrl: './upload-field.component.html',
  styleUrls: ['./upload-field.component.scss'],
})
export class UploadFieldComponent implements OnInit {
  @Output()
  fileAdded: EventEmitter<FileList> = new EventEmitter<FileList>();

  @Input()
  status!: Observable<{
    completed: boolean;
    finished: number;
    total: number;
  }>;

  canImport$ = new BehaviorSubject(true);

  ngOnInit(): void {
    this.status
      .pipe(
        map((x) => x.completed),
        distinctUntilChanged()
      )
      .subscribe((r) => {
        this.canImport$.next(r);
      });
  }

  addFiles(file?: FileList) {
    // TODO: Convert this event emitter to allow simultanious uploads
    if (this.canImport$.value) {
      this.fileAdded.emit(file);
    }
  }
}
