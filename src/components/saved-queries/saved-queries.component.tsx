import React, { useState } from "react";

import { showToast } from "@openmrs/esm-framework";
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Pagination,
  Search,
  Button,
  InlineLoading,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import mainStyles from "../../cohort-builder.scss";
import { PaginationData } from "../../types";
import EmptyData from "../empty-data/empty-data.component";
import SavedQueriesOptions from "./saved-queries-options/saved-queries-options.component";
import { getQueries } from "./saved-queries.resource";
import styles from "./saved-queries.scss";

interface SavedCohortsProps {
  viewQuery: (queryId: string) => Promise<void>;
}

const SavedQueries: React.FC<SavedCohortsProps> = ({ viewQuery }) => {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [queries, setQueries] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const { t } = useTranslation();

  const headers = [
    {
      key: "id",
      header: t("id", "id"),
    },
    {
      key: "name",
      header: t("name", "Name"),
    },
    {
      key: "description",
      header: t("description", "Description"),
    },
  ];

  const handlePagination = ({ page, pageSize }: PaginationData) => {
    setPage(page);
    setPageSize(pageSize);
  };

  const handleSearch = async () => {
    try {
      setIsLoading(true);
      const queries = await getQueries(searchText);
      setQueries(queries);
      setIsLoading(false);
    } catch (error) {
      showToast({
        title: t("somethingWentWrong", "Something went wrong"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchContainer}>
        <Search
          closeButtonLabelText={t("clearSearch", "Clear search")}
          id="query-search"
          labelText={t("searchConcepts", "Search Queries")}
          placeholder={t("searchConcepts", "Search Queries")}
          onChange={(e) => setSearchText(e.target.value)}
          onClear={() => setSearchText("")}
          size="lg"
          value={searchText}
        />
        <Button
          kind="primary"
          className={styles.searchBtn}
          onClick={handleSearch}
        >
          {isLoading ? (
            <InlineLoading description={t("loading", "Loading")} />
          ) : (
            t("search", "Search")
          )}
        </Button>
      </div>
      <p>
        You can only search for Query Definitions that you have saved using a
        Name.
      </p>
      <DataTable rows={queries} headers={headers} useZebraStyles>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
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
                    {row.cells.map((cell, index) => (
                      <TableCell key={index}>{cell.value}</TableCell>
                    ))}
                    <TableCell className={mainStyles.optionCell}>
                      <SavedQueriesOptions
                        query={queries[index]}
                        viewQuery={viewQuery}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
      {queries.length > 10 && (
        <Pagination
          backwardText={t("previousPage", "Previous page")}
          forwardText={t("nextPage", "Next page")}
          itemsPerPageText={t("itemsPerPage:", "Items per page:")}
          onChange={handlePagination}
          page={1}
          pageSize={10}
          pageSizes={[10, 20, 30, 40, 50]}
          size="md"
          totalItems={queries.length}
        />
      )}
      {!queries.length && <EmptyData displayText="queries" />}
    </div>
  );
};

export default SavedQueries;
