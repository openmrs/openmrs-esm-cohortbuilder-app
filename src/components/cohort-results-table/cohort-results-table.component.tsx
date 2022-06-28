import React, { useState } from "react";

import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Pagination,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { Patient } from "../../types/types";
import EmptyData from "../empty-data/empty-data.component";
import styles from "./cohort-results-table.scss";

const headers = [
  {
    key: "id",
    header: "OpenMRS ID",
  },
  {
    key: "name",
    header: "Name",
  },
  {
    key: "age",
    header: "Age",
  },
  {
    key: "gender",
    header: "Gender",
  },
];

interface PaginationData {
  page: number;
  pageSize: number;
}

interface CohortResultsTableProps {
  patients: Patient[];
}

export const CohortResultsTable: React.FC<CohortResultsTableProps> = ({
  patients,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { t } = useTranslation();

  const handlePagination = ({ page, pageSize }: PaginationData) => {
    setPage(page);
    setPageSize(pageSize);
  };

  return (
    <div className={styles.container}>
      <p className={styles.heading}>{t("searchResults", "Search Results")}</p>
      <DataTable rows={patients} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
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
          backwardText={t("previousPage", "Previous page")}
          forwardText={t("nextPage", "Next page")}
          itemsPerPageText={t("itemsPerPage:", "Items per page:")}
          onChange={handlePagination}
          page={1}
          pageSize={10}
          pageSizes={[10, 20, 30, 40, 50]}
          size="md"
          totalItems={patients.length}
        />
      )}
      {!patients.length && <EmptyData displayText="data" />}
    </div>
  );
};
