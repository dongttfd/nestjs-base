import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { fromUnixTime, isValid } from 'date-fns';

@ValidatorConstraint()
class ValidTimeStampConstraint implements ValidatorConstraintInterface {
  validate(value: number) {
    return (
      isValid(fromUnixTime(value)) && value > 0 && value.toString().length >= 13
    );
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} invalid timestamp in milliseconds`;
  }
}

export default (validationOptions?: ValidationOptions) => {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: ValidTimeStampConstraint,
    });
  };
};
