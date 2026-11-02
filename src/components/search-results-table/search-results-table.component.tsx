import React, { useState } from 'react';
import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, Pagination } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import type { PaginationData, Patient } from '../../types';
import EmptyData from '../empty-data/empty-data.component';
import mainStyle from '../../cohort-builder.scss';
import styles from './search-results-table.scss';

interface SearchResultsTableProps {
  patients: Patient[];
}

const SearchResultsTable: React.FC<SearchResultsTableProps> = ({ patients }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [shownPatients, setShownPatients] = useState(patients);
  const { t } = useTranslation();

  // A new search replaces the results, so start again from the first page.
  if (patients !== shownPatients) {
    setShownPatients(patients);
    setPage(1);
  }

  const headers = [
    {
      key: 'identifier',
      header: t('openmrsId', 'OpenMRS ID'),
    },
    {
      key: 'name',
      header: t('name', 'Name'),
    },
    {
      key: 'age',
      header: t('age', 'Age'),
    },
    {
      key: 'gender',
      header: t('gender', 'Gender'),
    },
  ];

  const handlePagination = ({ page, pageSize }: PaginationData) => {
    setPage(page);
    setPageSize(pageSize);
  };

  return (
    <div className={styles.container}>
      <p className={mainStyle.heading}>{t('searchResults', 'Search Results')}</p>
      <DataTable rows={patients} headers={headers} useZebraStyles>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows
                .slice((page - 1) * pageSize)
                .slice(0, pageSize)
                .map((row, index) => (
                  <TableRow {...getRowProps({ row })} key={index}>
                    {row.cells.map((cell, index) => (
                      <TableCell key={index}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
      {patients.length > 10 && (
        <Pagination
          backwardText={t('previousPage', 'Previous page')}
          forwardText={t('nextPage', 'Next page')}
          itemsPerPageText={t('itemsPerPage', 'Items per page:')}
          onChange={handlePagination}
          page={page}
          pageSize={pageSize}
          pageSizes={[10, 20, 30, 40, 50]}
          size="md"
          totalItems={patients.length}
        />
      )}
      {!patients.length && <EmptyData displayText={t('data', 'data')} />}
    </div>
  );
};

export default SearchResultsTable;
