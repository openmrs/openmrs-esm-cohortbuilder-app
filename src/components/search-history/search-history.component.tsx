import React from "react";

import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Button,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import EmptyData from "../empty-data/empty-data.component";
import styles from "./search-history.style.scss";

export const SearchHistory = () => {
  const { t } = useTranslation();

  const headers = [
    {
      key: "id",
      header: "#",
    },
    {
      key: "query",
      header: t("query", "Query"),
    },
    {
      key: "results",
      header: t("results", "Results"),
    },
    {
      key: "query-definition",
      header: t("query-definition", "Query Definition Options"),
    },
    {
      key: "cohort-definition",
      header: t("cohort-definition", "Cohort Definition Options"),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.heading}>{t("searchHistory", "Search History")}</p>
        <Button kind="danger--tertiary">
          {t("clearHistory", "Clear Search History")}
        </Button>
      </div>
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
      <EmptyData displayText="history" />
    </div>
  );
};
