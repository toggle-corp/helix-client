import React, { useMemo, useState } from 'react';
import {
    gql,
    useQuery,
} from '@apollo/client';
import { _cs } from '@togglecorp/fujs';
import {
    SearchMultiSelectInput,
    SearchMultiSelectInputProps,
} from '@togglecorp/toggle-ui';

import useDebouncedValue from '#hooks/useDebouncedValue';
<<<<<<< HEAD
import { GetFigureTagListQuery, GetFigureTagListQueryVariables } from '#generated/types';
=======
import { GetFigureTagsQuery, GetFigureTagsQueryVariables } from '#generated/types';
>>>>>>> b5a1202... CRUD on Extraction Query

import styles from './styles.css';

const FIGURE_TAGS = gql`
<<<<<<< HEAD
    query GetFigureTagList($search: String){
=======
    query GetFigureTags($search: String){
>>>>>>> b5a1202... CRUD on Extraction Query
        figureTagList(name_Icontains: $search){
            results {
                id
                name
            }
        }
    }
`;

<<<<<<< HEAD
export type FigureTagOption = NonNullable<NonNullable<GetFigureTagListQuery['figureTagList']>['results']>[number];
=======
export type FigureTagOption = NonNullable<NonNullable<GetFigureTagsQuery['figureTagList']>['results']>[number];
>>>>>>> b5a1202... CRUD on Extraction Query

const keySelector = (d: FigureTagOption) => d.id;
const labelSelector = (d: FigureTagOption) => d.name;

type Def = { containerClassName?: string };
type SelectInputProps<
    K extends string,
> = SearchMultiSelectInputProps<
    string,
    K,
    FigureTagOption,
    Def,
    'onSearchValueChange' | 'searchOptions' | 'searchOptionsShownInitially' | 'optionsPending' | 'keySelector' | 'labelSelector'
>;

function FigureTagMultiSelectInput<K extends string>(props: SelectInputProps<K>) {
    const {
        className,
        ...otherProps
    } = props;

    const [searchText, setSearchText] = useState('');

    const debouncedSearchText = useDebouncedValue(searchText);

    const searchVariable = useMemo(
<<<<<<< HEAD
        (): GetFigureTagListQueryVariables | undefined => (
=======
        (): GetFigureTagsQueryVariables | undefined => (
>>>>>>> b5a1202... CRUD on Extraction Query
            debouncedSearchText ? { search: debouncedSearchText } : undefined
        ),
        [debouncedSearchText],
    );

    const {
        loading,
        data,
<<<<<<< HEAD
    } = useQuery<GetFigureTagListQuery>(FIGURE_TAGS, {
=======
    } = useQuery<GetFigureTagsQuery>(FIGURE_TAGS, {
>>>>>>> b5a1202... CRUD on Extraction Query
        skip: !searchVariable,
        variables: searchVariable,
    });

    const searchOptions = data?.figureTagList?.results;

    return (
        <SearchMultiSelectInput
            {...otherProps}
            className={_cs(styles.figureTagSelectInput, className)}
            keySelector={keySelector}
            labelSelector={labelSelector}
            onSearchValueChange={setSearchText}
            searchOptions={searchOptions}
            optionsPending={loading}
            searchOptionsShownInitially={false}
        />
    );
}

export default FigureTagMultiSelectInput;
