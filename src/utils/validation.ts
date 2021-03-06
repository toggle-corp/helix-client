import { isValidEmail } from '@togglecorp/fujs';
import { isValidUrl } from '#utils/common';

type Maybe<T> = T | undefined | null;

function isDefined<T>(value: Maybe<T>): value is T {
    return value !== undefined && value !== null;
}

function isDefinedString(value: Maybe<string>): value is string {
    return isDefined(value) && value.trim() !== '';
}

export function requiredCondition(value: unknown) {
    return !isDefined(value)
        ? 'The field is required'
        : undefined;
}

export function requiredListCondition<T>(value: Maybe<T[]>) {
    return !isDefined(value) || value.length === 0
        ? 'The field is required'
        : undefined;
}

export function requiredStringCondition(value: Maybe<string>) {
    return !isDefinedString(value)
        ? 'The field is required'
        : undefined;
}

export function blacklistCondition<T>(x: T[]) {
    return (value: Maybe<T>) => (
        isDefined(value) && x.includes(value)
            ? `The field cannot be ${value}`
            : undefined
    );
}

export function whitelistCondition<T>(x: T[]) {
    return (value: Maybe<T>) => (
        isDefined(value) && !x.includes(value)
            ? `The field cannot be ${value}`
            : undefined
    );
}

export function lengthGreaterThanCondition(x: number) {
    return (value: Maybe<string | unknown[]>) => (
        isDefined(value) && value.length <= x
            ? `Length must be greater than ${x}`
            : undefined
    );
}
export function lengthSmallerThanCondition(x: number) {
    // NOTE: isDefinedString is not really required here
    return (value: Maybe<string | unknown[]>) => (
        isDefined(value) && value.length > x
            ? `Length must be smaller than ${x}`
            : undefined
    );
}

export function greaterThanCondition(x: number) {
    return (value: Maybe<number>) => (
        isDefined(value) && value <= x
            ? `Field must be greater than ${x}`
            : undefined
    );
}
export function smallerThanCondition(x: number) {
    return (value: Maybe<number>) => (
        isDefined(value) && value > x
            ? `The field must be smaller than ${x}`
            : undefined
    );
}

export function emailCondition(value: Maybe<string>) {
    return isDefinedString(value) && !isValidEmail(value)
        ? 'The field must be a valid email'
        : undefined;
}

export function urlCondition(value: Maybe<string>) {
    return isDefinedString(value) && !isValidUrl(value)
        ? 'The field must be a valid url'
        : undefined;
}

// NOTE: this is a special condition function,
// it defines that the field should be null
export function clearCondition() {
    return undefined;
}

// NOTE: this is a special condition function,
// it defines that the field is non-nullable
export function idCondition() {
    return undefined;
}

// NOTE: this is a special condition function,
// it defines that the field should be [] when it is not defined
export function arrayCondition() {
    return undefined;
}
