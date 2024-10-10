
function getDates(startDate, endDate, daysToInclude) {
    const end = new Date(endDate);
    const current = new Date(startDate);
    const dates = new Array();

    while (current <= end) {
        if (daysToInclude.includes(current.getDay())) {
            dates.push(new Date(current).toISOString().replace(/T.*/, '').split('-').reverse().join('-'));
        }
        current.setDate(current.getDate() + 1);
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
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const workDays = document.querySelectorAll('.workday');
    var daysToInclude = [];
    workDays.forEach(workDay => {
        if (workDay.checked) {
            daysToInclude.push(parseInt(workDay.value));
        }
    });
    const dates = getDates(startDate, endDate, daysToInclude);

    console.log(dates);
    try {
        for (var i = 0; i < dates.length; i++) {
            await enterEntry(dates[i]);
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
const waitFor = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

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

async function enterEntry(date) {
    return new Promise(async function (resolve) {
        await isElementLoaded('button[data-webbutton-id="new"]').then((newButton) => {
            newButton.click();
            return  ('div.floatingWindow');
        }).then((floatingWindow) => {
            return isElementLoaded('input[data-title="Datum boeking"]');
        }).then((dateInput) => {
            dateInput.focus();
            dateInput.value = date;
            dateInput.dispatchEvent(new Event('input'));
            dateInput.blur();
            return isElementLoaded('div.typeahead__arrow');
        }).then((dateValidationArrow) => {
            dateValidationArrow.click();
            return isElementLoaded('div.content-menu__item input.input');
        }).then((dateValidationDateSelector) => {
            dateValidationDateSelector.focus();
            dateValidationDateSelector.value = convertDate(date);
            dateValidationDateSelector.dispatchEvent(new Event('input'));
            return dateValidationDateSelector;
        }).then(async (dateValidationDateSelector) => {
            await watchDomForAdditions('span.typeahead-item__code');
            await isElementLoaded('div.has-focus span.typeahead-item__code').then((span) => {
                if (span.innerText.split('(')[1].split(')')[0] === convertDate(date)) {
                    const event = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        which: 13,
                        keyCode: 13,
                    });
                    dateValidationDateSelector.dispatchEvent(event);
                }
            });
            return isElementLoaded('button[data-webbutton-id="AntaUpdateCloseWebForm"]');
        }).then(async (finishButton) => {
            finishButton.click();
            return watchDomForDeletions('div.floatingWindow');
        }).then(() => {
            return watchDomForAdditions('button[data-webbutton-id="new"]');
        }).then((button) => {
            resolve();
        });
    });
}

isElementLoaded('div.property').then((fieldControl) => {
    if (!fieldControl.contains(document.getElementById('bulkInsert'))) {
        var currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        currentDate = currentDate.toJSON().slice(0, 10);

        const bulkinsertDiv = document.createElement('div');
        bulkinsertDiv.setAttribute('id', 'bulkInsert');

        var label = document.createElement('label');
        label.setAttribute('for', 'startDate');
        label.innerText = "Startdatum:";
        bulkinsertDiv.appendChild(label);

        var datePicker = document.createElement('input');
        datePicker.setAttribute('type', 'date');
        datePicker.setAttribute('class', 'fieldcontrol__content valuecontrol date date-only has-input');
        datePicker.setAttribute('id', 'startDate');
        datePicker.setAttribute('max', currentDate);
        datePicker.setAttribute('value', currentDate);
        bulkinsertDiv.appendChild(datePicker);

        label = document.createElement('label');
        label.setAttribute('for', 'endDate');
        label.innerText = "Einddatum:";
        bulkinsertDiv.appendChild(label);

        currentDate = new Date();
        currentDate = currentDate.toJSON().slice(0, 10);

        datePicker = document.createElement('input');
        datePicker.setAttribute('type', 'date');
        datePicker.setAttribute('class', 'fieldcontrol__content valuecontrol date date-only has-input');
        datePicker.setAttribute('id', 'endDate');
        datePicker.setAttribute('max', currentDate);
        datePicker.setAttribute('value', currentDate);
        bulkinsertDiv.appendChild(datePicker);

        const workDayDiv = document.createElement('div');
        workDayDiv.setAttribute('id', 'workdays');
        const dayNames = ["Ma", "Di", "Wo", "Do", "Vr"];
        label = document.createElement('label');
        label.innerText = "Op welke dagen werkt u:"
        workDayDiv.appendChild(label);

        for (var i = 0; i < 5; i++) {

            label = document.createElement('label');
            label.setAttribute('for', 'weekday' + (i + 1));
            label.innerText = dayNames[i];

            var newCheckbox = document.createElement("input");
            newCheckbox.setAttribute('id', 'weekday' + (i + 1));
            newCheckbox.setAttribute('class', 'workday');
            newCheckbox.type = "checkbox";
            newCheckbox.value = i + 1;
            newCheckbox.checked = true;


            const singleDayDiv = document.createElement('div');
            singleDayDiv.appendChild(newCheckbox);
            singleDayDiv.appendChild(label);
            workDayDiv.appendChild(singleDayDiv);
        }
        bulkinsertDiv.append(workDayDiv);

        const button = document.createElement('button');
        button.setAttribute('class', 'webbutton');
        button.setAttribute('id', 'startBulk');
        button.setAttribute('class', 'webbutton webbutton-text-only webbutton-color-normal cursorpointer');
        button.setAttribute('type', 'button');
        button.onclick = submitEntries;

        const span = document.createElement('span');
        span.setAttribute('class', 'webbutton-text');
        span.innerText = "Start";
        button.appendChild(span);

        bulkinsertDiv.appendChild(button);

        fieldControl.appendChild(bulkinsertDiv);
    }
});