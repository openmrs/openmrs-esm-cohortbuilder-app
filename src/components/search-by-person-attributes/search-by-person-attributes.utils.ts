import { composeJson } from "../../cohort-builder.utils";

export const getQueryDetails = (
  attributeId: string,
  attributeValues: string[]
) => {
  const searchParameters = {
    personWithAttribute: [
      {
        name: "attributeType",
        value: attributeId,
      },
      {
        name: "values",
        value: attributeValues,
      },
    ],
  };
  const queryDetails = composeJson(searchParameters);

  return queryDetails;
};

export const getSearchByAttributesDescription = (
  attributeId: string,
  selectedAttributeValues: string[]
) => {
  let description = "Patients";
  const attributeValues =
    selectedAttributeValues.length > 0
      ? selectedAttributeValues.join(", ").replace(/,(?=[^,]*$)/, " or")
      : "";

  description += attributeId
    ? ` with${attributeValues ? "" : " any"} ${attributeId}`
    : attributeId;

  description += attributeValues
    ? ` equal to ${attributeValues.length > 1 && "either"} ${attributeValues}`
    : "";
  return description;
};
