
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

async function sendKeyboardEventToElement(element, data)
{
    element.dispatchEvent(new KeyboardEvent('keydown', { key: data }));
    element.value = data;
    element.dispatchEvent(new Event('input', { }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: data, }));
    const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
            });
    element.dispatchEvent(event);
    await(100);
}

async function enterEntry(date) {
    return new Promise(async function (resolve) {
        await isElementLoaded('afas-button[label="Nieuw"]')
        .then(async (newButton) => {
            newButton.click();
            return isElementLoaded('afas-date-input');
        }).then(async (dateInput) => {
            if (dateInput && dateInput.shadowRoot) {
                const input = dateInput.shadowRoot.querySelector('input[aria-label="Datum boeking"]');
                await sendKeyboardEventToElement(input, date);
            }
            return isElementLoaded('afas-reference');
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
            return isElementLoaded('div.floatingWindow afas-button[data-webbutton-id="AntaUpdateCloseWebForm"]');
        }).then(async (finishButton) => {
            if(finishButton && finishButton.shadowRoot)
            {
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

isElementLoaded('div.property').then((fieldControl) => {
    if (!fieldControl.contains(document.getElementById('bulkInsert'))) {
        var currentDate = new Date();
        currentDate.setDate(currentDate.getDate());
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