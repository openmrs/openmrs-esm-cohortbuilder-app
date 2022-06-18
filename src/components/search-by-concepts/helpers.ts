export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * builds a query description based on query input
 * @param {object} state the current state
 * @param {string} conceptName the concept name
 * @returns {string} date in the required format
 */
export const queryDescriptionBuilder = (state, conceptName: string) => {
  const { modifier, timeModifier, onOrAfter, onOrBefore } = state;

  const operatorSelectInput = document.querySelector("#timeModifier");

  const operatorText = "";

  const newModifier = "";

  let modifierDescription;

  if (modifier && isNaN(modifier)) {
    modifierDescription = `= ${newModifier}`;
  } else if (modifier) {
    modifierDescription = `${operatorText} ${newModifier}`;
  } else {
    modifierDescription = "";
  }

  const onOrAfterDescription = onOrAfter
    ? `since ${formatDate(onOrAfter)}`
    : "";
  const onOrBeforeDescription = onOrBefore
    ? `until ${formatDate(onOrBefore)}`
    : "";

  return `Patients with ${timeModifier} ${conceptName} ${modifierDescription} ${onOrAfterDescription} ${onOrBeforeDescription}`.trim();
};
