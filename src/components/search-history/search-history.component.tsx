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

const headers = [
  {
    key: "id",
    header: "#",
  },
  {
    key: "query",
    header: "Query",
  },
  {
    key: "results",
    header: "Results",
  },
  {
    key: "query-definition",
    header: "Query Definition Options",
  },
  {
    key: "cohort-definition",
    header: "Cohort Definition Options",
  },
];

export const SearchHistory = () => {
  return (
    <div>
      SearchHistory
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
    </div>
  );
};
