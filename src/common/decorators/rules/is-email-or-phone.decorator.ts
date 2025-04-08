import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isEmail,
  matches,
} from 'class-validator';
import { VIETNAM_PHONE_NUMBER_REGEX } from '@/config';

@ValidatorConstraint()
class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && (
      isEmail(value) || matches(value, VIETNAM_PHONE_NUMBER_REGEX)
    );
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid email or phone number`;
  }
}

export default (validationOptions?: ValidationOptions) => {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: MatchConstraint,
    });
  };
};
