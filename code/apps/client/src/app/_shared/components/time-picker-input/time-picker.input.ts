import { FocusMonitor } from '@angular/cdk/a11y';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  HostBinding,
  Inject,
  Input,
  OnDestroy,
  Optional,
  Self,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NgControl,
  Validators,
} from '@angular/forms';
import {
  MAT_FORM_FIELD,
  MatFormField,
  MatFormFieldControl,
} from '@angular/material/form-field';
import moment from 'moment';
import { Moment } from 'moment';
import { Subject } from 'rxjs';

const selector = 'app-time-picker-input';
@Component({
  selector: 'badman-time-picker-input',
  templateUrl: './time-picker-input.html',
  styleUrls: ['./time-picker-input.scss'],
  providers: [
    { provide: MatFormFieldControl, useExisting: TimePickerInputComponent },
  ],
})
export class TimePickerInputComponent
  implements ControlValueAccessor, MatFormFieldControl<Moment>, OnDestroy
{
  static nextId = 0;

  private _placeholder!: string;
  private _required = false;
  private _disabled = false;

  @ViewChild('hours') hoursInput!: HTMLInputElement;
  @ViewChild('minutes') minutesInput!: HTMLInputElement;

  parts: FormGroup;
  stateChanges = new Subject<void>();
  focused = false;
  touched = false;

  @HostBinding('id')
  id = `${selector}-${TimePickerInputComponent.nextId++}`;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange = (_: unknown) => {
    //
  };
  onTouched = () => {
    //
  };

  get empty() {
    const {
      value: { hours, minutes },
    } = this.parts;

    return !hours && !minutes;
  }

  @HostBinding('class.time-picker-floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  @Input()
  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(value: string) {
    this._placeholder = value;
    this.stateChanges.next();
  }

  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
    this.stateChanges.next();
  }

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
    this._disabled ? this.parts.disable() : this.parts.enable();
    this.stateChanges.next();
  }

  @Input()
  get value(): Moment | null {
    if (this.parts.valid) {
      const {
        value: { hours, minutes },
      } = this.parts;
      return moment(`${hours}:${minutes}`, 'HH:mm');
    }
    return null;
  }
  set value(tel: Moment | null) {
    const t = tel || moment();
    this.parts.setValue({ hours: t.format('HH'), minutes: t.format('mm') });
    this.stateChanges.next();
  }

  get errorState(): boolean {
    return this.parts.invalid && this.touched;
  }

  constructor(
    formBuilder: FormBuilder,
    private _focusMonitor: FocusMonitor,
    private _elementRef: ElementRef<HTMLElement>,
    @Optional() @Inject(MAT_FORM_FIELD) public _formField: MatFormField,
    @Optional() @Self() public ngControl: NgControl
  ) {
    this.parts = formBuilder.group({
      hours: [
        null,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(24),
          Validators.minLength(0),
          Validators.maxLength(2),
        ],
      ],
      minutes: [
        null,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(59),
          Validators.minLength(0),
          Validators.maxLength(2),
        ],
      ],
    });

    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this._focusMonitor.stopMonitoring(this._elementRef);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onFocusIn(event: FocusEvent) {
    if (!this.focused) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onFocusOut(event: FocusEvent) {
    if (
      !this._elementRef.nativeElement.contains(event.relatedTarget as Element)
    ) {
      this.touched = true;
      this.focused = false;
      this.onTouched();
      this.stateChanges.next();
    }
  }

  autoFocusNext(
    control: AbstractControl,
    nextElement?: HTMLInputElement
  ): void {
    if (!control.errors && nextElement) {
      this._focusMonitor.focusVia(nextElement, 'program');
    }
  }

  autoFocusPrev(
    control: AbstractControl,
    prevElement: HTMLInputElement,
    minLength = 1
  ): void {
    if ((control.value?.length ?? 0) < minLength) {
      this._focusMonitor.focusVia(prevElement, 'program');
    }
  }

  setDescribedByIds(ids: string[]) {
    const controlElement = this._elementRef.nativeElement.querySelector(
      '.app-time-picker-input-container'
    );
    if (controlElement) {
      controlElement.setAttribute('aria-describedby', ids.join(' '));
    }
  }

  onContainerClick() {
    // if (this.parts.controls['minutes'].valid) {
    //   this._focusMonitor.focusVia(this.hoursInput, 'program');
    // } else if (this.parts.controls['hours'].valid) {
    //   this._focusMonitor.focusVia(this.minutesInput, 'program');
    // } else {
    //   this._focusMonitor.focusVia(this.hoursInput, 'program');
    // }
  }

  writeValue(tel: Moment | null): void {
    this.value = tel;
  }

  registerOnChange(fn: (_: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _handleInput(_: AbstractControl): void {
    this.onChange(this.value);
  }
}
