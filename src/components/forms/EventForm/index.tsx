import React, { useState, useContext, useEffect } from 'react';
import { _cs, isDefined } from '@togglecorp/fujs';
import {
    TextInput,
    SelectInput,
    Button,
    Modal,
    DateInput,
    TextArea,
} from '@togglecorp/toggle-ui';
import {
    gql,
    useQuery,
    useMutation,
} from '@apollo/client';

import NonFieldError from '#components/NonFieldError';
import CrisisForm from '#components/forms/CrisisForm';
import CountryMultiSelectInput, { CountryOption } from '#components/selections/CountryMultiSelectInput';
import NotificationContext from '#components/NotificationContext';
import CrisisSelectInput, { CrisisOption } from '#components/selections/CrisisSelectInput';
import Loading from '#components/Loading';
import ActorSelectInput, { ActorOption } from '#components/selections/ActorSelectInput';

import useModalState from '#hooks/useModalState';

import { removeNull } from '#utils/schema';
import type { ObjectSchema } from '#utils/schema';
import useForm, { createSubmitHandler } from '#utils/form';
import { transformToFormError } from '#utils/errorTransform';
import {
    basicEntityKeySelector,
    basicEntityLabelSelector,
    enumKeySelector,
    enumLabelSelector,
} from '#utils/common';

import {
    requiredCondition,
    requiredStringCondition,
    idCondition,
    clearCondition,
} from '#utils/validation';

import {
    PartialForm,
    PurgeNull,
} from '#types';

import {
    EventOptionsQuery,
    EventQuery,
    EventQueryVariables,
    CreateEventMutation,
    CreateEventMutationVariables,
    UpdateEventMutation,
    UpdateEventMutationVariables,
} from '#generated/types';
import styles from './styles.css';

const EVENT_OPTIONS = gql`
    query EventOptions {
        eventType: __type(name: "CRISIS_TYPE") {
            enumValues {
                name
                description
            }
        }
        otherSubType: __type(name: "EVENT_OTHER_SUB_TYPE") {
            enumValues {
                name
                description
            }
        }
        actorList {
            results {
                id
                name
            }
        }
        triggerList {
            results {
                id
                name
            }
        }
        subTriggerList {
            results {
                id
                name
            }
        }
        disasterCategoryList {
            results {
                id
                name
                subCategories {
                    results {
                        id
                        name
                        types {
                            results {
                                id
                                name
                                subTypes {
                                    results {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        violenceList {
            results {
                id
                name
                subTypes {
                    results {
                        id
                        name
                    }
                }
            }
        }
    }
`;

const EVENT = gql`
    query Event($id: ID!) {
        event(id: $id) {
            actor {
                id
                name
            }
            countries {
                id
                name
            }
            crisis {
                id
                name
            }
            disasterSubType {
                id
            }
            endDate
            eventNarrative
            eventType
            glideNumber
            id
            name
            startDate
            trigger {
                id
            }
            triggerSubType {
                id
            }
            violenceSubType {
                id
            }
            otherSubType
        }
    }
`;

const CREATE_EVENT = gql`
    mutation CreateEvent($event: EventCreateInputType!) {
        createEvent(data: $event) {
            result {
                id
                name
            }
            errors
        }
    }
`;

const UPDATE_EVENT = gql`
    mutation UpdateEvent($event: EventUpdateInputType!) {
        updateEvent(data: $event) {
            result {
                id
                name
            }
            errors
        }
    }
`;

// FIXME: the comparision should be type-safe but
// we are currently downcasting string literals to string
const conflict = 'CONFLICT' as const;
const disaster = 'DISASTER' as const;
const other = 'OTHER' as const;

// eslint-disable-next-line @typescript-eslint/ban-types
type WithId<T extends object> = T & { id: string };
type EventFormFields = CreateEventMutationVariables['event'];
type FormType = PurgeNull<PartialForm<WithId<Omit<EventFormFields, 'eventType' | 'otherSubType'> & { eventType: string, otherSubType: string }>>>;

type FormSchema = ObjectSchema<FormType>
type FormSchemaFields = ReturnType<FormSchema['fields']>;

const schema: FormSchema = {
    fields: (value): FormSchemaFields => {
        const basicFields: FormSchemaFields = {
            id: [idCondition],
            countries: [requiredCondition],
            startDate: [],
            endDate: [],
            eventType: [requiredStringCondition],
            glideNumber: [],
            name: [requiredStringCondition],
            crisis: [],
            eventNarrative: [],

            disasterSubType: [clearCondition],
            violenceSubType: [clearCondition],
            actor: [clearCondition],
            trigger: [clearCondition],
            triggerSubType: [clearCondition],
            otherSubType: [clearCondition],
        };
        if (value.eventType === conflict) {
            return {
                ...basicFields,
                violenceSubType: [],
                actor: [],
                trigger: [],
                triggerSubType: [],
            };
        }
        if (value.eventType === disaster) {
            return {
                ...basicFields,
                disasterSubType: [],
            };
        }
        if (value.eventType === other) {
            return {
                ...basicFields,
                otherSubType: [],
            };
        }
        return basicFields;
    },
};

interface WithGroup {
    violenceId: string;
    violenceName: string;
}
const groupKeySelector = (item: WithGroup) => item.violenceId;
const groupLabelSelector = (item: WithGroup) => item.violenceName;

interface WithOtherGroup {
    disasterTypeId: string;
    disasterTypeName: string;
    disasterSubCategoryId: string;
    disasterSubCategoryName: string;
    disasterCategoryId: string;
    disasterCategoryName: string;
}
const otherGroupKeySelector = (item: WithOtherGroup) => (
    `${item.disasterCategoryId}-${item.disasterSubCategoryId}-${item.disasterTypeId}`
);
const otherGroupLabelSelector = (item: WithOtherGroup) => (
    `${item.disasterCategoryName} › ${item.disasterSubCategoryName} › ${item.disasterTypeName}`
);

interface EventFormProps {
    className?: string;
    onEventCreate?: (result: NonNullable<NonNullable<CreateEventMutation['createEvent']>['result']>) => void;
    id?: string;
    readOnly?: boolean;
    onEventFormCancel?: () => void;
    defaultCrisis?: CrisisOption | null | undefined;
}

function EventForm(props: EventFormProps) {
    const {
        onEventCreate,
        id,
        readOnly,
        className,
        onEventFormCancel,
        defaultCrisis,
    } = props;

    const [
        shouldShowAddCrisisModal,
        crisisModalId,
        showAddCrisisModal,
        hideAddCrisisModal,
    ] = useModalState();

    const [
        countries,
        setCountries,
    ] = useState<CountryOption[] | null | undefined>();
    const [
        crises,
        setCrises,
    ] = useState<CrisisOption[] | null | undefined>(defaultCrisis ? [defaultCrisis] : undefined);
    const [
        actors,
        setActors,
    ] = useState<ActorOption[] | null | undefined>();

    const defaultFormValues: PartialForm<FormType> = { crisis: defaultCrisis?.id };

    const {
        pristine,
        value,
        error,
        onValueChange,
        validate,
        onErrorSet,
        onValueSet,
        onPristineSet,
    } = useForm(defaultFormValues, schema);

    useEffect(
        () => {
            // NOTE:
            // If value.trigger is undefined, then clear out value.triggerSubType
            if (!value.trigger) {
                onValueChange(undefined, 'triggerSubType' as const);
            }
        },
        [value.trigger, onValueChange],
    );

    const { notify } = useContext(NotificationContext);

    const {
        loading: eventDataLoading,
        error: eventDataError,
    } = useQuery<EventQuery, EventQueryVariables>(
        EVENT,
        {
            skip: !id,
            variables: id ? { id } : undefined,
            onCompleted: (response) => {
                const { event } = response;
                if (!event) {
                    return;
                }

                if (event.countries) {
                    setCountries(event.countries);
                }

                if (event.crisis) {
                    setCrises([event.crisis]);
                }

                if (event.actor) {
                    setActors([event.actor]);
                }

                const sanitizedValue = {
                    ...event,
                    // FIXME: the typing error should be fixed on the server
                    countries: event.countries?.map((item) => item.id),
                    actor: event.actor?.id,
                    crisis: event.crisis?.id,
                    violenceSubType: event.violenceSubType?.id,
                    trigger: event.trigger?.id,
                    triggerSubType: event.triggerSubType?.id,
                    disasterSubType: event.disasterSubType?.id,
                };
                onValueSet(removeNull(sanitizedValue));
            },
        },
    );

    const {
        data,
        loading: eventOptionsLoading,
        error: eventOptionsError,
    } = useQuery<EventOptionsQuery>(EVENT_OPTIONS);
    const [
        createEvent,
        { loading: createLoading },
    ] = useMutation<CreateEventMutation, CreateEventMutationVariables>(
        CREATE_EVENT,
        {
            onCompleted: (response) => {
                const {
                    createEvent: createEventRes,
                } = response;
                if (!createEventRes) {
                    return;
                }
                const { errors, result } = createEventRes;
                if (errors) {
                    const formError = transformToFormError(removeNull(errors));
                    notify({ children: 'Failed to create event.' });
                    onErrorSet(formError);
                }
                if (onEventCreate && result) {
                    notify({ children: 'Event created successfully!' });
                    onPristineSet(true);
                    onEventCreate(result);
                }
            },
            onError: (errors) => {
                notify({ children: 'Failed to create event.' });
                onErrorSet({
                    $internal: errors.message,
                });
            },
        },
    );

    const [
        updateEvent,
        { loading: updateLoading },
    ] = useMutation<UpdateEventMutation, UpdateEventMutationVariables>(
        UPDATE_EVENT,
        {
            onCompleted: (response) => {
                const {
                    updateEvent: updateEventRes,
                } = response;
                if (!updateEventRes) {
                    return;
                }
                const { errors, result } = updateEventRes;
                if (errors) {
                    const formError = transformToFormError(removeNull(errors));
                    notify({ children: 'Failed to update event.' });
                    onErrorSet(formError);
                }
                if (onEventCreate && result) {
                    notify({ children: 'Event updated successfully!' });
                    onPristineSet(true);
                    onEventCreate(result);
                }
            },
            onError: (errors) => {
                notify({ children: 'Failed to update event.' });
                onErrorSet({
                    $internal: errors.message,
                });
            },
        },
    );

    const handleCrisisCreate = React.useCallback(
        (newCrisis: CrisisOption) => {
            setCrises((oldCrises) => [...(oldCrises ?? []), newCrisis]);
            onValueChange(newCrisis.id, 'crisis' as const);
            hideAddCrisisModal();
        },
        [onValueChange, hideAddCrisisModal],
    );

    const handleSubmit = React.useCallback((finalValues: FormType) => {
        if (finalValues.id) {
            updateEvent({
                variables: {
                    event: finalValues as WithId<EventFormFields>,
                },
            });
        } else {
            createEvent({
                variables: {
                    event: finalValues as EventFormFields,
                },
            });
        }
    }, [createEvent, updateEvent]);

    const loading = createLoading || updateLoading || eventDataLoading;
    const errored = !!eventDataError;
    const disabled = loading || errored;

    const eventOptionsDisabled = eventOptionsLoading || !!eventOptionsError;

    const violenceSubTypeOptions = data?.violenceList?.results?.flatMap((violence) => (
        violence.subTypes?.results?.map((violenceSubType) => ({
            ...violenceSubType,
            violenceId: violence.id,
            violenceName: violence.name,
        }))
    ))?.filter(isDefined);

    // eslint-disable-next-line max-len
    const disasterSubTypeOptions = data?.disasterCategoryList?.results?.flatMap((disasterCategory) => (
        disasterCategory.subCategories?.results?.flatMap((disasterSubCategory) => (
            disasterSubCategory.types?.results?.flatMap((disasterType) => (
                disasterType.subTypes?.results?.map((disasterSubType) => ({
                    ...disasterSubType,
                    disasterTypeId: disasterType.id,
                    disasterTypeName: disasterType.name,
                    disasterSubCategoryId: disasterSubCategory.id,
                    disasterSubCategoryName: disasterSubCategory.name,
                    disasterCategoryId: disasterCategory.id,
                    disasterCategoryName: disasterCategory.name,
                }))
            ))
        ))
    ))?.filter(isDefined);

    const otherSubTypeOptions = data?.otherSubType?.enumValues;

    const children = (
        <>
            {loading && <Loading absolute />}
            <NonFieldError>
                {error?.$internal}
            </NonFieldError>
            <div className={styles.crisisRow}>
                <CrisisSelectInput
                    options={crises}
                    className={styles.crisisSelectInput}
                    label="Crisis *"
                    name="crisis"
                    error={error?.fields?.crisis}
                    value={value.crisis}
                    onChange={onValueChange}
                    disabled={disabled}
                    onOptionsChange={setCrises}
                    readOnly={!!defaultCrisis?.id || readOnly}
                />
                {!defaultCrisis?.id && !readOnly && (
                    <Button
                        name={undefined}
                        onClick={showAddCrisisModal}
                        className={styles.addCrisisButton}
                        disabled={disabled}
                    >
                        Add Crisis
                    </Button>
                )}
                {shouldShowAddCrisisModal && (
                    <Modal
                        className={styles.addCrisisModal}
                        bodyClassName={styles.body}
                        onClose={hideAddCrisisModal}
                        heading="Add Crisis"
                    >
                        <CrisisForm
                            id={crisisModalId}
                            onCrisisCreate={handleCrisisCreate}
                            onCrisisFormCancel={hideAddCrisisModal}
                        />
                    </Modal>
                )}
            </div>
            <div className={styles.row}>
                <TextInput
                    label="Event Name *"
                    name="name"
                    value={value.name}
                    onChange={onValueChange}
                    error={error?.fields?.name}
                    disabled={disabled}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.twoColumnRow}>
                <SelectInput
                    options={data?.eventType?.enumValues}
                    label="Event Type *"
                    name="eventType"
                    error={error?.fields?.eventType}
                    value={value.eventType}
                    onChange={onValueChange}
                    keySelector={enumKeySelector}
                    labelSelector={enumLabelSelector}
                    disabled={disabled || eventOptionsDisabled}
                    readOnly={readOnly}
                />
            </div>
            {value.eventType === conflict && (
                <>
                    <div className={styles.twoColumnRow}>
                        <SelectInput
                            options={violenceSubTypeOptions}
                            keySelector={basicEntityKeySelector}
                            labelSelector={basicEntityLabelSelector}
                            label="Violence"
                            name="violenceSubType"
                            value={value.violenceSubType}
                            onChange={onValueChange}
                            disabled={disabled || eventOptionsDisabled}
                            error={error?.fields?.violenceSubType}
                            readOnly={readOnly}
                            groupLabelSelector={groupLabelSelector}
                            groupKeySelector={groupKeySelector}
                            grouped
                        />
                        <ActorSelectInput
                            options={actors}
                            label="Actor"
                            name="actor"
                            error={error?.fields?.actor}
                            value={value.actor}
                            onChange={onValueChange}
                            disabled={disabled || eventOptionsDisabled}
                            onOptionsChange={setActors}
                            readOnly={readOnly}
                        />
                    </div>
                    <div className={styles.twoColumnRow}>
                        <SelectInput
                            options={data?.triggerList?.results}
                            keySelector={basicEntityKeySelector}
                            labelSelector={basicEntityLabelSelector}
                            label="Trigger"
                            name="trigger"
                            value={value.trigger}
                            onChange={onValueChange}
                            error={error?.fields?.trigger}
                            disabled={disabled || eventOptionsDisabled}
                            readOnly={readOnly}
                        />
                        <SelectInput
                            options={data?.subTriggerList?.results}
                            keySelector={basicEntityKeySelector}
                            labelSelector={basicEntityLabelSelector}
                            label="Trigger Sub-type"
                            name="triggerSubType"
                            value={value.triggerSubType}
                            onChange={onValueChange}
                            error={error?.fields?.triggerSubType}
                            disabled={disabled || eventOptionsDisabled || !value.trigger}
                            readOnly={readOnly}
                        />
                    </div>
                </>
            )}
            {value.eventType === disaster && (
                <div className={styles.twoColumnRow}>
                    <SelectInput
                        options={disasterSubTypeOptions}
                        keySelector={basicEntityKeySelector}
                        labelSelector={basicEntityLabelSelector}
                        label="Disaster Category"
                        name="disasterSubType"
                        value={value.disasterSubType}
                        onChange={onValueChange}
                        disabled={disabled || eventOptionsDisabled}
                        error={error?.fields?.disasterSubType}
                        readOnly={readOnly}
                        groupLabelSelector={otherGroupLabelSelector}
                        groupKeySelector={otherGroupKeySelector}
                        grouped
                    />
                </div>
            )}
            {value.eventType === other && (
                <div className={styles.twoColumnRow}>
                    <SelectInput
                        label="Other Subtypes *"
                        name="otherSubType"
                        options={otherSubTypeOptions}
                        value={value.otherSubType}
                        keySelector={enumKeySelector}
                        labelSelector={enumLabelSelector}
                        onChange={onValueChange}
                        error={error?.fields?.otherSubType}
                        disabled={disabled}
                        readOnly={readOnly}
                    />
                </div>
            )}
            <div className={styles.twoColumnRow}>
                <CountryMultiSelectInput
                    options={countries}
                    onOptionsChange={setCountries}
                    label="Countries *"
                    name="countries"
                    value={value.countries}
                    onChange={onValueChange}
                    error={error?.fields?.countries}
                    disabled={disabled}
                    readOnly={readOnly}
                />
                <TextInput
                    label="Glide Number"
                    name="glideNumber"
                    value={value.glideNumber}
                    onChange={onValueChange}
                    error={error?.fields?.glideNumber}
                    disabled={disabled}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.twoColumnRow}>
                <DateInput
                    label="Start Date"
                    name="startDate"
                    value={value.startDate}
                    onChange={onValueChange}
                    disabled={disabled}
                    error={error?.fields?.startDate}
                    readOnly={readOnly}
                />
                <DateInput
                    label="End Date"
                    name="endDate"
                    value={value.endDate}
                    onChange={onValueChange}
                    disabled={disabled}
                    error={error?.fields?.endDate}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.row}>
                <TextArea
                    label="Event Narrative"
                    name="eventNarrative"
                    value={value.eventNarrative}
                    onChange={onValueChange}
                    disabled={disabled}
                    error={error?.fields?.eventNarrative}
                    readOnly={readOnly}
                />
            </div>
            {!readOnly && (
                <div className={styles.formButtons}>
                    {!!onEventFormCancel && (
                        <Button
                            name={undefined}
                            onClick={onEventFormCancel}
                            className={styles.button}
                            disabled={disabled}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        name={undefined}
                        disabled={disabled || pristine}
                        variant="primary"
                        className={styles.button}
                    >
                        Submit
                    </Button>
                </div>
            )}
        </>
    );

    if (readOnly) {
        // NOTE: so that we can embed this inside another form as readOnly view
        return (
            <div className={_cs(className, styles.eventForm)}>
                {children}
            </div>
        );
    }

    return (
        <form
            className={_cs(className, styles.eventForm)}
            onSubmit={createSubmitHandler(validate, onErrorSet, handleSubmit)}
        >
            {children}
        </form>
    );
}

export default EventForm;
