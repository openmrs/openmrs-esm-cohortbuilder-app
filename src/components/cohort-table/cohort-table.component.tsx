import React, { useEffect, useState } from "react";

import { getGlobalStore } from "@openmrs/esm-framework";
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

import EmptyData from "../empty-data/empty-data.component";

const headers = [
  {
    key: "patientId",
    header: "OpenMRS ID",
  },
  {
    key: "firstname",
    header: "First Name",
  },
  {
    key: "lastname",
    header: "Last Name",
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

const patientsStore = getGlobalStore("patients");

interface PaginationData {
  page: number;
  pageSize: number;
}

export const CohortTable = () => {
  const [tableData, setTableData] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handlePagination = ({ page, pageSize }: PaginationData) => {
    setPage(page);
    setPageSize(pageSize);
  };

  useEffect(() => {
    patientsStore.subscribe((store) => {
      store.patients.map(
        (patient) => (patient.id = patient.patientId.toString())
      );
      setTableData(store.patients);
    });
  }, []);

  return (
    <div>
      <DataTable rows={tableData} headers={headers}>
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
      {tableData.length > 10 && (
        <Pagination
          backwardText="Previous page"
          forwardText="Next page"
          itemsPerPageText="Items per page:"
          onChange={handlePagination}
          page={1}
          pageSize={10}
          pageSizes={[10, 20, 30, 40, 50]}
          size="md"
          totalItems={tableData.length}
        />
      )}
      {!tableData.length && <EmptyData displayText="data" />}
    </div>
  );
};
