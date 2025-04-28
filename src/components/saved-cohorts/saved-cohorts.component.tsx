import React, { useState } from 'react';
import { DataTable, Pagination, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { onDeleteCohort, useCohorts } from './saved-cohorts.resources';
import type { PaginationData } from '../../types';
import EmptyData from '../empty-data/empty-data.component';
import SavedCohortsOptions from './saved-cohorts-options/saved-cohorts-options.component';
import mainStyles from '../../cohort-builder.scss';
import styles from './saved-cohorts.scss';

interface SavedCohortsProps {
  onViewCohort: (queryId: string) => Promise<void>;
}

const SavedCohorts: React.FC<SavedCohortsProps> = ({ onViewCohort }) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { cohorts } = useCohorts();

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

  const handleDeleteCohort = async (cohortId: string) => {
    try {
      await onDeleteCohort(cohortId);
      showSnackbar({
        title: t('cohortDeleted', 'Cohort deleted'),
        kind: 'success',
        isLowContrast: true,
        subtitle: t('cohortDeleted', 'Cohort deleted'),
      });
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: error?.message,
      });
    }
  };

  return (
    <div className={styles.container}>
      <p className={mainStyles.text}>
        {t('savedCohortDescription', 'You can only search for Cohort Definitions that you have saved using a Name.')}
      </p>
      <DataTable rows={cohorts} headers={headers} useZebraStyles>
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
                .slice((page - 1) * pageSize)
                .slice(0, pageSize)
                .map((row, index: number) => (
                  <TableRow {...getRowProps({ row })} key={index}>
                    {row.cells.map((cell, index: number) => (
                      <TableCell key={index}>{cell.value}</TableCell>
                    ))}
                    <TableCell className={mainStyles.optionCell}>
                      <SavedCohortsOptions
                        cohort={cohorts[index]}
                        onViewCohort={onViewCohort}
                        onDeleteCohort={handleDeleteCohort}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
      {cohorts?.length > 10 && (
        <Pagination
          backwardText={t('previousPage', 'Previous page')}
          forwardText={t('nextPage', 'Next page')}
          itemsPerPageText={t('itemsPerPage', 'Items per page:')}
          onChange={handlePagination}
          page={1}
          pageSize={10}
          pageSizes={[10, 20, 30, 40, 50]}
          size="md"
          totalItems={cohorts.length}
        />
      )}
      {!cohorts?.length && <EmptyData displayText={t('cohorts', 'cohorts')} />}
    </div>
  );
};

export default SavedCohorts;
