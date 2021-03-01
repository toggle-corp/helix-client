import React, { useCallback, useContext } from 'react';
import {
    Button,
    TextInput,
} from '@togglecorp/toggle-ui';
import {
    gql,
    useMutation,
    useQuery,
} from '@apollo/client';

import useForm, { createSubmitHandler } from '#utils/form';
import type { ObjectSchema } from '#utils/schema';
import { removeNull } from '#utils/schema';
import { transformToFormError } from '#utils/errorTransform';
import { idCondition, requiredCondition } from '#utils/validation';

import {
    PartialForm,
    PurgeNull,
} from '#types';
import {
    UserQuery,
    UpdateUserMutation,
    UpdateUserMutationVariables,
    CreateAttachmentMutation,
    CreateAttachmentMutationVariables,
} from '#generated/types';

import FileUploader from '#components/FileUploader';
import NonFieldError from '#components/NonFieldError';
import NotificationContext from '#components/NotificationContext';
import Loading from '#components/Loading';

import styles from './styles.css';

const GET_USER = gql`
    query PullUserProfile($id: ID!) {
        user(id: $id) {
            id
            firstName
            lastName
        }
    }
`;

const UPDATE_USER = gql`
    mutation UpdateUserProfile($data: UserUpdateInputType!) {
        updateUser(data: $data) {
            result {
                id
                firstName
                lastName
            }
            errors
        }
    }
`;

const UPLOAD_PROFILE_PICTURE = gql`
    mutation UploadProfilePicture($attachment: Upload!) {
        createAttachment(data: {attachment: $attachment, attachmentFor: "1"}) {
            errors
            ok
            result {
                attachment
                id
            }
        }
    }
`;

// eslint-disable-next-line @typescript-eslint/ban-types
type UserFormFields = UpdateUserMutationVariables['data'];
type FormType = PurgeNull<PartialForm<UserFormFields>>;

type FormSchema = ObjectSchema<FormType>
type FormSchemaFields = ReturnType<FormSchema['fields']>;

const schema: FormSchema = {
    fields: (): FormSchemaFields => ({
        id: [idCondition],
        firstName: [requiredCondition],
        lastName: [requiredCondition],
    }),
};

interface UserFormProps {
    userId: string;
    onUserFormClose: () => void;
}

const defaultFormValues: PartialForm<FormType> = {};

function UserForm(props:UserFormProps) {
    const {
        onUserFormClose,
        userId,
    } = props;

    const { notify } = useContext(NotificationContext);

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

    const {
        loading: userLoading,
        error: userError,
    } = useQuery<UserQuery>(
        GET_USER,
        {
            // skip: !userId,
            // variables: userId ? { id: userId } : undefined,
            variables: { id: userId },
            onCompleted: (response) => {
                const { user } = response;
                if (!user) {
                    return;
                }

                onValueSet(removeNull(user));
            },
        },
    );

    const [
        updateUser,
        { loading: updateLoading },
    ] = useMutation<UpdateUserMutation, UpdateUserMutationVariables>(
        UPDATE_USER,
        {
            onCompleted: (response) => {
                const { updateUser: updateUserRes } = response;
                if (!updateUserRes) {
                    return;
                }
                const { errors, result } = updateUserRes;
                if (errors) {
                    const formError = transformToFormError(removeNull(errors));
                    notify({ children: 'Failed to update user.' });
                    onErrorSet(formError);
                }
                if (result) {
                    notify({ children: 'User updated successfully!' });
                    onPristineSet(true);
                    onUserFormClose();
                }
            },
            onError: (errors) => {
                notify({ children: 'Failed to update user.' });
                onErrorSet({
                    $internal: errors.message,
                });
            },
        },
    );

    const handleSubmit = useCallback(
        (finalValues: PartialForm<FormType>) => {
            const variables = {
                data: finalValues,
            } as UpdateUserMutationVariables;
            updateUser({
                variables,
            });
        }, [updateUser],
    );

    const [
        uploadProfielPicture,
        { loading: imageLoading },
    ] = useMutation<CreateAttachmentMutation, CreateAttachmentMutationVariables>(
        UPLOAD_PROFILE_PICTURE,
        {
            onCompleted: (response) => {
                const { createAttachment: createAttachmentRes } = response;
                if (!createAttachmentRes) {
                    return;
                }
                const { errors, result } = createAttachmentRes;
                if (errors) {
                    console.log('ERROR: Field to upload', errors);
                    notify({ children: 'Failed to create attachment' });
                }
                if (result) {
                    console.log('SUCCESS', result);
                }
            },
            onError: (err) => {
                console.log('error', err);
                notify({ children: err.message });
            },
        },
    );

    const handleAttachmentProcess = useCallback(
        (files: File[]) => {
            uploadProfielPicture({
                variables: { attachment: files[0] },
                context: {
                    hasUpload: true, // activate Upload link
                },
            });
        },
        [uploadProfielPicture],
    );

    const loading = userLoading || updateLoading || imageLoading;
    const errored = !!userError;
    const disabled = loading || errored;

    return (
        <form
            className={styles.form}
            onSubmit={createSubmitHandler(validate, onErrorSet, handleSubmit)}
        >
            {loading && <Loading absolute /> }
            <NonFieldError>
                {error?.$internal}
            </NonFieldError>
            <div className={styles.twoColumnRow}>
                <TextInput
                    label="First Name*"
                    name="firstName"
                    value={value.firstName}
                    onChange={onValueChange}
                    error={error?.fields?.firstName}
                    disabled={disabled}
                />
                <TextInput
                    label="Last Name*"
                    name="lastName"
                    value={value.lastName}
                    onChange={onValueChange}
                    error={error?.fields?.lastName}
                    disabled={disabled}
                />
            </div>
            <div className={styles.row}>
                <FileUploader
                    onChange={handleAttachmentProcess}
                    variant="primary"
                    accept="image/png, image/jpeg"
                    disabled={disabled}
                >
                    Upload Profile Picture
                </FileUploader>
            </div>
            <div className={styles.formButtons}>
                <Button
                    name={undefined}
                    onClick={onUserFormClose}
                    className={styles.button}
                    disabled={disabled}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    name={undefined}
                    className={styles.button}
                    variant="primary"
                    disabled={disabled || pristine}
                >
                    Submit
                </Button>
            </div>
        </form>
    );
}

export default UserForm;
