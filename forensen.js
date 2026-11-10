
function getDates(startDate, endDate, daysToInclude) {
    var start = new Date(endDate);
    start.setHours(12); // This is a bit dirty, but it circumvents the Summer time issue.
    var dates = [];

    for (var d = new Date(startDate); d <= start; d.setDate(d.getDate() + 1)) {
        d.setHours(12); // This is a bit dirty, but it circumvents the Summer time issue.

        if (daysToInclude.includes(d.getDay())) {
            dates.push(new Date(d).toISOString().replace(/T.*/, '').split('-').reverse().join('-'));
        }
    }
    return dates;
}

function convertDate(date) {
    var splitDate = date.split('-')[1];
    if (splitDate[0] == '0') {
        splitDate = date.split('-')[1][1];
    }
    return splitDate;
}

async function submitEntries() {
    const startDate = new Date(document.getElementById('startDate').getAttribute('value'));
    const endDate = new Date(document.getElementById('endDate').getAttribute('value'));

    if (endDate < startDate) {
        alert("De einddatum mag niet voor de startdatum zijn.");
        return;
    }

    if(endDate > new Date())
    {
        alert("De einddatum mag niet in de toekomst liggen");
        return;
    }

    var daysToInclude = [];
    await isElementLoaded('#workDays')
        .then(async (workDays) => {
            workDays.querySelectorAll('afas-field-row').forEach(day => {
                const selected = day.querySelector('afas-switch');
                if (selected.getAttribute('value') === 'true') {
                    daysToInclude.push(parseInt(selected.getAttribute('data-day')));
                }
            });
        });


    const dates = getDates(startDate, endDate, daysToInclude);
    const str = document.getElementById('toelichting').getAttribute('value');
    try {
        for (var i = 0; i < dates.length; i++) {
            await enterEntry(dates[i], str);
        }
    } catch (e) {
        console.log(e);
    }
}

/**
 * Wait for {ms} seconds
 * @param {*} ms 
 * @returns 
 */
const waitFor = (ms = 500) => new Promise(res => setTimeout(res, ms));

/**
 * Attaches an MutationObserver to the body and fires the callback function when the element is removed
 * @param {*} element 
 * @param {*} callback 
 */
function watchDomForDeletions(selector) {
    return new Promise(function (resolve) {
        const element = document.querySelector(selector);
        const observer = new MutationObserver((mutations, observer) => {
            for (const mutation of mutations) {
                for (const removedNode of mutation.removedNodes) {
                    if (removedNode == element) {
                        observer.disconnect();
                        resolve();
                    }
                }
            }
        });

        observer.observe(document, { childList: true, subtree: true });
    });
}

function watchDomForAdditions(selector) {
    return new Promise(function (resolve) {

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                var nodes = Array.from(mutation.addedNodes);
                for (var node of nodes) {
                    if (node.matches && node.matches(selector)) {
                        observer.disconnect();
                        resolve(node);
                        return;
                    }
                };
            });
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
    });
}

async function isElementLoaded(element, parent = document) {
    while (parent.querySelector(element) === null) {
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
    await waitFor(500);
    return parent.querySelector(element);
}

async function sendKeyboardEventToElement(element, data) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: data }));
    element.value = data;
    element.dispatchEvent(new Event('input', {}));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: data, }));
    const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
    });
    element.dispatchEvent(event);
    await (100);
}

async function enterEntry(date, str) {
    return new Promise(async function (resolve) {
        await isElementLoaded('afas-button[label="Nieuw"]')
            .then(async (newButton) => {
                newButton.click();
                return isElementLoaded('div.floatingContent afas-date-input');
            }).then(async (dateInput) => {
                if (dateInput && dateInput.shadowRoot) {
                    const input = dateInput.shadowRoot.querySelector('input[aria-label="Datum boeking"]');
                    await sendKeyboardEventToElement(input, date);
                }
                return isElementLoaded('div.floatingContent afas-reference');
            }).then((dateValidationArrow) => {
                const input = dateValidationArrow.shadowRoot.querySelector('div.toggle');
                input.click();
                return dateValidationArrow.shadowRoot.querySelector('afas-text-input');
            }).then((dateValidationDateSelector) => {
                const child = dateValidationDateSelector.shadowRoot.querySelector('input');
                dateValidationDateSelector.focus();
                child.value = convertDate(date);
                child.dispatchEvent(new Event('input'));
                return child;
            }).then(async (dateValidationDateSelector) => {
                const char = convertDate(date);
                await sendKeyboardEventToElement(dateValidationDateSelector, char);
               
                return isElementLoaded('div.floatingWindow afas-textarea-input[label="Toelichting"]');
            }).then(async (additionalInformation) => {
                
                additionalInformation.setAttribute('value', str);
                additionalInformation.dispatchEvent(new Event('input'));
                
                const child = additionalInformation.shadowRoot.querySelector('textarea');
                child.dispatchEvent(new Event('change'));

                return isElementLoaded('div.floatingWindow afas-button[data-webbutton-id="AntaUpdateCloseWebForm"]');
            }).then(async (finishButton) => {
                if (finishButton && finishButton.shadowRoot) {
                    var button = finishButton;
                    button = button.shadowRoot.querySelector("div button");
                    await waitFor(200);
                    button.click();
                }
                return watchDomForAdditions('afas-button[label="Nieuw"]');
            }).then(async () => {
                resolve();
            });
    });
}

isElementLoaded('.contentmasterpart .page .zonelayout .zonetable:nth-child(2)').then((zone) => {
    if (!zone.contains(document.getElementById('bulkInsert'))) {


        // First construct a row
        let firstZoneRow = document.createElement('fieldset');
        firstZoneRow.setAttribute('class', 'zonerow');
        firstZoneRow.setAttribute('id', 'bulkInsert');

        // Then construct a zoneRowExtra
        const zoneRowExtra = document.createElement('div');
        zoneRowExtra.setAttribute('class', 'zonetable extra');
        zoneRowExtra.style = 'max-width:1600px;margin-left:auto;margin-right:auto;';

        // Then construct a subZoneRow        
        let subZoneRow = document.createElement('div');
        subZoneRow.setAttribute('class', 'zonerow');

        // Then construct a zoneCell and make it reusable
        let firstZoneCell = document.createElement('div');
        firstZoneCell.setAttribute('class', 'zonecell');

        // Then construct a zoneCell and make it reusable
        let secondZoneCell = document.createElement('div');
        secondZoneCell.setAttribute('class', 'zonecell');

        // Add a fieldset to the first zone cell
        let fieldSet = document.createElement('div');
        fieldSet.setAttribute('class', 'fieldset')

        let legend = document.createElement('div');
        legend.setAttribute('class', 'legend');
        legend.setAttribute('id', 'additionalInformation');

        let legendHeader = document.createElement('h3');
        legendHeader.innerText = "Data";
        fieldSet = document.createElement('div');
        fieldSet.setAttribute('class', 'fieldset')
        fieldSet
            .appendChild(legendHeader)
            .appendChild(legend);
        // Prepare all the stuff that needs to go into the first fieldset
        var currentDate = new Date()
        currentDate.setHours(12, 0, 0, 0);
        currentDate = currentDate.toJSON();

        let fieldRow = document.createElement('afas-field-row');
        fieldRow.setAttribute('orientation', 'horizontal');

        // Start of: Start date selection
        let label = document.createElement('afas-label');
        label.setAttribute('for', 'startDateInput_labelFor');
        label.setAttribute('slot', 'label');
        label.innerText = "Startdatum";

        let dateInputDiv = document.createElement('div');
        dateInputDiv.setAttribute('class', 'is-empty');
        dateInputDiv.setAttribute('slot', 'value');
        dateInputDiv.setAttribute('data-field-id', 'startDateInput');

        let afasDateInput = document.createElement('afas-date-input');
        afasDateInput.setAttribute('id', 'startDate');
        afasDateInput.setAttribute('preferred-width', '150');
        afasDateInput.setAttribute('value', currentDate);
        afasDateInput.setAttribute('max', currentDate);

        fieldRow.appendChild(label);
        fieldRow.appendChild(dateInputDiv)
            .appendChild(afasDateInput);
        fieldSet.appendChild(fieldRow);
        // End of: Start date selection

        // Start of: End date selection
        fieldRow = document.createElement('afas-field-row');
        fieldRow.setAttribute('orientation', 'horizontal');

        label = document.createElement('afas-label');
        label.setAttribute('for', 'endDateInput_labelFor');
        label.setAttribute('slot', 'label');
        label.innerText = "Einddatum";

        dateInputDiv = document.createElement('div');
        dateInputDiv.setAttribute('class', 'is-empty');
        dateInputDiv.setAttribute('slot', 'value');
        dateInputDiv.setAttribute('data-field-id', 'endDateInput');

        afasDateInput = document.createElement('afas-date-input');
        afasDateInput.setAttribute('id', 'endDate');
        afasDateInput.setAttribute('preferred-width', '150');
        afasDateInput.setAttribute('value', currentDate);
        afasDateInput.setAttribute('min', currentDate);

        fieldRow.appendChild(label);
        fieldRow.appendChild(dateInputDiv)
            .appendChild(afasDateInput);
        fieldSet.appendChild(fieldRow);
        // End of: Start date selection
        firstZoneCell.appendChild(fieldSet);

        // Start of: Workday selection
        const subFieldSet = document.createElement('div');
        subFieldSet.setAttribute('id', 'workDays');
        subFieldSet.setAttribute('class', 'fieldset');

        legend = document.createElement('div');
        legend.setAttribute('class', 'legend');
        legend.setAttribute('id', 'workDaySelection');

        legendHeader = document.createElement('h3');
        legendHeader.innerText = "Werkdagen";
        subFieldSet
            .appendChild(legend)
            .appendChild(legendHeader);

        const dayNames = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];
        for (var i = 0; i < 5; i++) {
            fieldRow = document.createElement('afas-field-row');
            fieldRow.setAttribute('orientation', 'horizontal');
            fieldRow.setAttribute('cols', '1');

            label = document.createElement('afas-label');
            label.setAttribute('for', 'workDaySelector_labelFor');
            label.setAttribute('slot', 'label');
            label.innerText = dayNames[i];

            const valueControlDiv = document.createElement('div');
            valueControlDiv.setAttribute('slot', 'value');

            const valueControl = document.createElement('afas-switch');
            valueControl.setAttribute('data-day', (i + 1));
            valueControl.setAttribute('class', 'workDay');
            valueControl.setAttribute('value', 'true');

            fieldRow.appendChild(label);
            fieldRow.appendChild(valueControlDiv)
                .appendChild(valueControl);
            subFieldSet.appendChild(fieldRow);
        }
        // End of: Workday selection
        firstZoneCell.appendChild(subFieldSet);

        // Start of: start button
        const button = document.createElement('afas-button');
        button.setAttribute('label', 'Start');
        button.setAttribute('tone', 'default');
        button.setAttribute('size', 'large');
        button.onclick = submitEntries;
        // End of: start button
        firstZoneCell.appendChild(button);

        // Start of: content of second zone cell
        const afasFieldRow = document.createElement('afas-field-row');
        afasFieldRow.setAttribute('id', 'hi');
        afasFieldRow.setAttribute('part', 'fieldrow');
        afasFieldRow.setAttribute('class', 'is-horizontal');

        legend = document.createElement('div');
        legend.setAttribute('class', 'legend');
        legend.setAttribute('id', 'additionalInformation');

        legendHeader = document.createElement('h3');
        legendHeader.innerText = "Toelichting";

        // Add a fieldset to the second zone cell
        fieldSet = document.createElement('div');
        fieldSet.setAttribute('class', 'fieldset')
        fieldSet
            .appendChild(legendHeader)
            .appendChild(legend);
        secondZoneCell.appendChild(fieldSet);

        const afasTextareaInput = document.createElement('afas-textarea-input');
        afasTextareaInput.setAttribute('id', 'toelichting');
        afasTextareaInput.setAttribute('label', 'Toelichting');
        secondZoneCell.appendChild(afasTextareaInput);

        // Append everything to the parent
        zone
            .appendChild(firstZoneRow)
            .appendChild(zoneRowExtra)
            .appendChild(subZoneRow)
            .append(firstZoneCell, secondZoneCell);
    }
});