import React from 'react';
import { _cs } from '@togglecorp/fujs';

import Header from '#components/Header';
import Footer from '#components/Footer';

import styles from './styles.css';

interface Props {
    className?: string;
    heading?: React.ReactNode;
    headerIcons?: React.ReactNode;
    headerActions?: React.ReactNode;
    children?: React.ReactNode;
    headerClassName?: string;
    contentClassName?: string;
    footerContent?: React.ReactNode;
    footerActions?: React.ReactNode;
}

function Container(props: Props) {
    const {
        className,
        heading,
        children,
        headerActions,
        headerIcons,
        headerClassName,
        contentClassName,
        footerContent,
        footerActions,
    } = props;

    return (
        <div className={_cs(styles.container, className)}>
            {(heading || headerActions || headerIcons) && (
                <Header
                    icons={headerIcons}
                    actions={headerActions}
                    className={_cs(styles.header, headerClassName)}
                    heading={heading}
                />
            )}
            <div className={_cs(styles.content, contentClassName)}>
                { children }
            </div>
            {(footerContent || footerActions) && (
                <Footer
                    actions={footerActions}
                    className={styles.footer}
                >
                    { footerContent }
                </Footer>
            )}
        </div>
    );
}

export default Container;
