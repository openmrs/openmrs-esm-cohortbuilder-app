import { composeJson } from "../../cohort-builder.utils";

export const getQueryDetails = (attributeId, attributeValues) => {
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
  attributeId,
  selectedAttributeValues
) => {
  let label = "Patients";
  const uuid = attributeId;
  const attributeLabel = uuid;
  // ? patientAttributes.find((attribute) => attribute.uuid === uuid).display
  // : " with any attribute";

  const attributeValues =
    selectedAttributeValues.length > 0
      ? selectedAttributeValues
          .map((attribute) => attribute.label)
          .join(", ")
          .replace(/,(?=[^,]*$)/, " or")
      : "";

  label += uuid
    ? ` with${attributeValues ? "" : " any"} ${attributeLabel}`
    : attributeLabel;

  label += attributeValues
    ? ` equal to ${attributeValues.length > 1 && "either"} ${attributeValues}`
    : "";
  return label;
};

/*
{
  "key": "reporting.library.cohortDefinition.builtIn.personWithAttribute",
  "parameterValues": {
      "attributeType": "8d871f2a-c2cc-11de-8d13-0010c6dffd0f",
      "values": [
          "married",
          "test"
      ]
  },
  "type": "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition"
}
*/
