import React from 'react';

import {
    TextInput,
    SelectInput,
    Button,
} from '@togglecorp/toggle-ui';

import Section from '#components/Section';
import NonFieldError from '#components/NonFieldError';
import TrafficLightInput from '#components/TrafficLightInput';
import Row from '#components/Row';

import { PartialForm } from '#types';
import { useFormObject } from '#utils/form';
import type { Error } from '#utils/schema';
import {
    enumKeySelector,
    enumLabelSelector,
} from '#utils/common';

import { getGeoLocationReviewProps } from '../utils';
import {
    GeoLocationFormProps,
    ReviewInputFields,
    EntryReviewStatus,
} from '../types';

type GeoLocationInputValue = PartialForm<GeoLocationFormProps>;
type GeoLocationInputValueWithId = PartialForm<GeoLocationFormProps> & { id: string };

interface GeoLocationInputProps {
    index: number;
    value: GeoLocationInputValue;
    error: Error<GeoLocationFormProps> | undefined;
    onChange: (value: PartialForm<GeoLocationFormProps>, index: number) => void;
    onRemove: (index: number) => void;
    className?: string;
    disabled?: boolean;
    mode: 'view' | 'review' | 'edit';
    review?: ReviewInputFields;
    onReviewChange?: (newValue: EntryReviewStatus, name: string) => void;
    figureId: string;
    accuracyOptions?: { name: string, description?: string | null }[] | null | undefined;
    identifierOptions?: { name: string, description?: string | null }[] | null | undefined;
    trafficLightShown: boolean;
}

function GeoLocationInput(props: GeoLocationInputProps) {
    const {
        value,
        onChange,
        onRemove,
        error,
        index,
        className,
        disabled,
        mode,
        review,
        onReviewChange,
        figureId,
        accuracyOptions,
        identifierOptions,
        trafficLightShown,
    } = props;

    const editMode = mode === 'edit';
    const reviewMode = mode === 'review';

    const onValueChange = useFormObject(index, value, onChange);
    const { id: geoLocationId } = value as GeoLocationInputValueWithId;

    return (
        <Section
            className={className}
            heading={value.name}
            subSection
            actions={editMode && (
                <Button
                    onClick={onRemove}
                    name={index}
                    disabled={disabled}
                >
                    Remove
                </Button>
            )}
        >
            <NonFieldError>
                {error?.$internal}
            </NonFieldError>
            <Row>
                <TextInput
                    label="District"
                    name="district"
                    value={value.state}
                    disabled={disabled}
                    readOnly
                />
                <TextInput
                    label="Town"
                    name="town"
                    value={value.city}
                    disabled={disabled}
                    readOnly
                />
            </Row>
            <Row>
                <SelectInput
                    label="Type *"
                    name="identifier"
                    value={value.identifier}
                    keySelector={enumKeySelector}
                    labelSelector={enumLabelSelector}
                    options={identifierOptions}
                    onChange={onValueChange}
                    error={error?.fields?.identifier}
                    disabled={disabled}
                    readOnly={!editMode}
                    icons={trafficLightShown && review && (
                        <TrafficLightInput
                            disabled={!reviewMode}
                            onChange={onReviewChange}
                            {...getGeoLocationReviewProps(review, figureId, geoLocationId, 'identifier')}
                        />
                    )}
                />
                <SelectInput
                    label="Accuracy *"
                    name="accuracy"
                    value={value.accuracy}
                    keySelector={enumKeySelector}
                    labelSelector={enumLabelSelector}
                    options={accuracyOptions}
                    onChange={onValueChange}
                    error={error?.fields?.accuracy}
                    disabled={disabled}
                    readOnly={!editMode}
                    icons={trafficLightShown && review && (
                        <TrafficLightInput
                            disabled={!reviewMode}
                            onChange={onReviewChange}
                            {...getGeoLocationReviewProps(review, figureId, geoLocationId, 'accuracy')}
                        />
                    )}
                />
            </Row>
        </Section>
    );
}

export default GeoLocationInput;
