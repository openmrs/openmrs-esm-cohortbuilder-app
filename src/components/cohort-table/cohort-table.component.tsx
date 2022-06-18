import React from "react";
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from "carbon-components-react";
import EmptyData from "../empty-data/empty-data.component";

interface CohortTableProps {
  patients: fhir.Patient[];
}

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

export const CohortTable = ({ patients }: CohortTableProps) => {
  return (
    <div>
      <DataTable rows={[]} headers={headers}>
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
              {rows.map((row) => (
                <TableRow {...getRowProps({ row })}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
      <EmptyData displayText="data" />
    </div>
  );
};
