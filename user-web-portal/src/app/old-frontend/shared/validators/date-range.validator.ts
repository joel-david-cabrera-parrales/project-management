import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dateRangeValidator(dateInitField: string, dateEndField: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const dateInitControl = control.get(dateInitField);
    const dateEndControl = control.get(dateEndField);
    const dateInit = dateInitControl?.value;
    const dateEnd = dateEndControl?.value;

    if (!dateInit || !dateEnd) return null;
    if (!dateInitControl?.dirty && !dateEndControl?.dirty) return null;

    return dateEnd >= dateInit ? null : { dateRange: true };
  };
}
