import {
    useReducer,
    useCallback,
    useRef,
    useLayoutEffect,
} from 'react';
import { isDefined } from '@togglecorp/fujs';

import {
    accumulateDifferentialErrors,
    accumulateErrors,
    analyzeErrors,
    accumulateValues,
} from '#utils/schema';

import type { Schema, Error } from '#utils/schema';

export type EntriesAsList<T> = {
    [K in keyof T]: [T[K], K, ...unknown[]];
}[keyof T];

export type EntriesAsKeyValue<T> = {
    [K in keyof T]: {key: K, value: T[K] };
}[keyof T];

// eslint-disable-next-line @typescript-eslint/ban-types
function useForm<T extends object>(
    initialFormValue: T,
    schema: Schema<T>,
) {
    type ErrorAction = { type: 'SET_ERROR', error: Error<T> | undefined };
    type ValueAction = EntriesAsKeyValue<T> & { type: 'SET_VALUE_FIELD' };

    function formReducer(
        prevState: { value: T, error: Error<T> | undefined },
        action: ValueAction | ErrorAction,
    ) {
        if (action.type === 'SET_VALUE_FIELD') {
            const { key, value } = action;
            const oldValue = prevState.value;
            const oldError = prevState.error;

            const newValue = {
                ...oldValue,
                [key]: value,
            };
            const newError = accumulateDifferentialErrors(
                oldValue,
                newValue,
                oldError,
                schema,
            );

            return {
                ...prevState,
                value: newValue,
                error: newError,
            };
        }
        if (action.type === 'SET_ERROR') {
            const { error } = action;
            return {
                ...prevState,
                error,
            };
        }
        console.error('Action is not supported');
        return prevState;
    }

    const [state, dispatch] = useReducer(
        formReducer,
        { value: initialFormValue, error: undefined },
    );

    const onValueChange = useCallback(
        (...entries: EntriesAsList<T>) => {
            const action: ValueAction = {
                type: 'SET_VALUE_FIELD',
                key: entries[1],
                value: entries[0],
            };
            dispatch(action);
        },
        [],
    );

    const validate = useCallback(
        () => {
            const stateErrors = accumulateErrors(state.value, schema);
            const stateErrored = analyzeErrors(stateErrors);
            if (stateErrored) {
                return { errored: true, error: stateErrors, value: undefined };
            }
            const validatedValues = accumulateValues(
                state.value,
                schema,
                { noFalsyValues: true, falsyValue: undefined },
            );
            return { errored: false, value: validatedValues, error: undefined };
        },
        [schema, state],
    );

    const setError = useCallback(
        (errors: Error<T> | undefined) => {
            const action: ErrorAction = {
                type: 'SET_ERROR',
                error: errors,
            };
            dispatch(action);
        },
        [],
    );

    return {
        value: state.value,
        error: state.error,
        onValueChange,
        onErrorSet: setError,
        validate,
    };
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function useFormObject<K extends string | number, T extends object>(
    name: K,
    value: T,
    onChange: (newValue: T, inputName: K) => void,
) {
    const ref = useRef<T>(value);
    const onValueChange = useCallback(
        (...entries: EntriesAsList<T>) => {
            const newValue = {
                ...ref.current,
                [entries[1]]: entries[0],
            };
            onChange(newValue, name);
        },
        [name, onChange],
    );

    useLayoutEffect(
        () => {
            ref.current = value;
        },
        [value],
    );
    return onValueChange;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function useFormArray<K extends string, T extends object>(
    name: K,
    value: T[],
    onChange: (newValue: T[], inputName: K) => void,
) {
    const ref = useRef<T[]>(value);
    const onValueChange = useCallback(
        (val: T, index: number) => {
            const newValue = [
                ...ref.current,
            ];
            newValue[index] = val;
            onChange(newValue, name);
        },
        [name, onChange],
    );

    const onValueRemove = useCallback(
        (index: number) => {
            const newValue = [
                ...ref.current,
            ];
            newValue.splice(index, 1);
            onChange(newValue, name);
        },
        [name, onChange],
    );

    useLayoutEffect(
        () => {
            ref.current = value;
        },
        [value],
    );
    return { onValueChange, onValueRemove };
}

export function createSubmitHandler<T>(
    validator: () => ({ errored: boolean, error: Error<T> | undefined, value: T | undefined }),
    setError: (errors: Error<T> | undefined) => void,
    callback: (value: T) => void,
) {
    return (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const { errored, error, value } = validator();
        setError(error);
        if (!errored && isDefined(value)) {
            callback(value);
        }
    };
}
export default useForm;
