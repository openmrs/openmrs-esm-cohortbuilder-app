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
import SavedCohortsOptions from "./saved-cohorts-options/saved-cohorts-options.component";
import { deleteCohort, getCohorts } from "./saved-cohorts.resource";
import styles from "./saved-cohorts.scss";

interface SavedCohortsProps {
  viewCohort: (queryId: string) => Promise<void>;
}

const SavedCohorts: React.FC<SavedCohortsProps> = ({ viewCohort }) => {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cohorts, setCohorts] = useState([]);
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
      const cohorts = await getCohorts(searchText);
      setCohorts(cohorts);
      setIsLoading(false);
      showToast({
        title: t("success", "Success!"),
        kind: "success",
        critical: true,
        description: t("searchCompleted", "Search is completed"),
      });
    } catch (error) {
      showToast({
        title: t("cohortDeleteError", "Error deleting the cohort"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const handleDeleteCohort = async (cohortId: string) => {
    try {
      await deleteCohort(cohortId);
      setCohorts(cohorts.filter((cohort) => cohort.uuid != cohortId));
      showToast({
        title: t("success", "Success"),
        kind: "success",
        critical: true,
        description: "the cohort is deleted",
      });
    } catch (error) {
      showToast({
        title: t("cohortDeleteError", "Error deleting the cohort"),
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
          id="cohort-search"
          labelText={t("searchCohorts", "Search Cohorts")}
          placeholder={t("searchCohorts", "Search Cohorts")}
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
      <p className={mainStyles.text}>
        {t(
          "savedCohortDescription",
          "You can only search for Cohort Definitions that you have saved using a Name."
        )}
      </p>
      <DataTable rows={cohorts} headers={headers} useZebraStyles>
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
                    {row.cells.map((cell, index: number) => (
                      <TableCell key={index}>{cell.value}</TableCell>
                    ))}
                    <TableCell className={mainStyles.optionCell}>
                      <SavedCohortsOptions
                        cohort={cohorts[index]}
                        viewCohort={viewCohort}
                        deleteCohort={handleDeleteCohort}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
      {cohorts.length > 10 && (
        <Pagination
          backwardText={t("previousPage", "Previous page")}
          forwardText={t("nextPage", "Next page")}
          itemsPerPageText={t("itemsPerPage:", "Items per page:")}
          onChange={handlePagination}
          page={1}
          pageSize={10}
          pageSizes={[10, 20, 30, 40, 50]}
          size="md"
          totalItems={cohorts.length}
        />
      )}
      {!cohorts.length && <EmptyData displayText="cohorts" />}
    </div>
  );
};

export default SavedCohorts;
