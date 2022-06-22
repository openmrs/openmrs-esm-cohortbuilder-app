import React, { useEffect, useState } from "react";
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
import { getGlobalStore } from "@openmrs/esm-framework";

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

export const CohortTable = () => {
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    patientsStore.subscribe((patients) => {
      patients.patients.map(
        (patient) => (patient.id = patient.patientId.toString())
      );
      setTableData(patients.patients);
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
              {rows.map((row, index) => (
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
      {!tableData.length && <EmptyData displayText="data" />}
    </div>
  );
};
