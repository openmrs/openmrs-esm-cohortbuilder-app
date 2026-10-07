import React, { useState } from 'react';
import {
  DataTable,
  DataTableSkeleton,
  InlineNotification,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Pagination,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import type { PaginationData } from '../../types';
import { deleteDataSet, useQueries } from './saved-queries.resources';
import EmptyData from '../empty-data/empty-data.component';
import SavedQueriesOptions from './saved-queries-options/saved-queries-options.component';
import mainStyles from '../../cohort-builder.scss';
import styles from './saved-queries.scss';

interface SavedQueriesProps {
  onViewQuery: (queryId: string) => Promise<void>;
}

const SavedQueries: React.FC<SavedQueriesProps> = ({ onViewQuery }) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { queries, error, isLoading, mutate } = useQueries();
  // The list can shrink after a delete, so keep the current page within range.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(queries.length / pageSize)));

  const deleteQuery = async (queryId: string) => {
    try {
      await deleteDataSet(queryId);
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        isLowContrast: true,
        subtitle: t('queryIsDeleted', 'the query is deleted'),
      });
      await mutate();
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: error?.message,
      });
    }
  };

  const headers = [
    {
      key: 'name',
      header: t('name', 'Name'),
    },
    {
      key: 'description',
      header: t('description', 'Description'),
    },
  ];

  const handlePagination = ({ page, pageSize }: PaginationData) => {
    setPage(page);
    setPageSize(pageSize);
  };

  return (
    <div className={styles.container}>
      <p className={mainStyles.text}>
        {t('savedQueryDescription', 'You can only search for Query Definitions that you have saved using a Name.')}
      </p>
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('errorLoadingQueries', 'Error loading saved queries')}
          subtitle={error.message}
        />
      )}
      {isLoading ? (
        <DataTableSkeleton headers={headers} rowCount={3} showHeader={false} showToolbar={false} />
      ) : (
        <DataTable rows={queries} headers={headers} useZebraStyles>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                  <TableHeader className={mainStyles.optionHeader}></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows
                  .slice((currentPage - 1) * pageSize)
                  .slice(0, pageSize)
                  .map((row, index: number) => (
                    <TableRow {...getRowProps({ row })} key={index}>
                      {row.cells.map((cell, index) => (
                        <TableCell key={index}>{cell.value}</TableCell>
                      ))}
                      <TableCell className={mainStyles.optionCell}>
                        <SavedQueriesOptions
                          query={queries[(currentPage - 1) * pageSize + index]}
                          onViewQuery={onViewQuery}
                          deleteQuery={deleteQuery}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </DataTable>
      )}
      {queries.length > 10 && (
        <Pagination
          backwardText={t('previousPage', 'Previous page')}
          forwardText={t('nextPage', 'Next page')}
          itemsPerPageText={t('itemsPerPage', 'Items per page:')}
          onChange={handlePagination}
          page={currentPage}
          pageSize={pageSize}
          pageSizes={[10, 20, 30, 40, 50]}
          size="md"
          totalItems={queries.length}
        />
      )}
      {!isLoading && !error && !queries.length && <EmptyData displayText={t('queries', 'queries')} />}
    </div>
  );
};

export default SavedQueries;
