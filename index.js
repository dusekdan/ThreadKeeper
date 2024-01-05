const L = console.log;

window.addEventListener("load", () => {
    L("Document loaded.");
    initThreadKeeper();
});


const initThreadKeeper = () => {
    L("initThreadKeeper called.");

    document.getElementById("main-form").addEventListener("submit", event => { 
        event.preventDefault(); 
        handleSubmit("main");
    });

    document.getElementById("main-name").focus();

    // Change from sometime in 2022/2023 - the default value can not be just pointed
    // to new Date(), but some pre-processing must be done on it.
    document.getElementById("main-time").value = currentDateTime();

    loadRecords();

    setInterval(() => {
        // Set up refreshing time remaining
        reloadRecords();
    }, 1000);
}

/* Source: https://stackoverflow.com/a/71971670 */
const currentDateTime = () => {
    var tzoffset = new Date().getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOString = new Date(Date.now() - tzoffset)
    .toISOString()
    .slice(0, -1);

    // convert to YYYY-MM-DDTHH:MM
    const datetimeInputString = localISOString.substring(0,
    ((localISOString.indexOf("T") | 0) + 6) | 0);
    
    
    return datetimeInputString;
}

const reloadRecords = () => {
    document.getElementById("records").innerHTML = '';
    loadRecords();
}

const loadRecords = () => {
    let recordsTable = document.getElementById("records");
    let data = getStorage();

    for (let i = 0; i < data.length; i++) {

        if (data[i]["isComplete"]) {
            continue;
        }

        let trEl = document.createElement("tr");
        
        let nameTd = document.createElement("td");
        nameTd.innerText = data[i]["name"] + " (Next step: " + lastActionToNextStep(data[i]["lastActionBy"]) + ")";

        let nextStepInTd = document.createElement("td");
        nextStepInTd.innerHTML = getRemainingTimeTextFor(data[i]);

        let actionButtonTd = document.createElement("td");

        let nextStepBtn = document.createElement("button");
        nextStepBtn.textContent = ">>";
        nextStepBtn.classList.add("btn", "btn-success");

        nextStepBtn.addEventListener("click", () => {
            moveToNextStep(data[i]["id"]);
            reloadRecords();
        });

        let completeBtn = document.createElement("button");
        completeBtn.textContent = "Done";
        completeBtn.classList.add("btn", "btn-danger");
        
        completeBtn.addEventListener("click", () => {
            let shouldProceed = confirm("Are you sure you want to complete this item? This action cannot be taken back.");

            if (shouldProceed) {
                moveToComplete(data[i]["id"]);
                reloadRecords();
            }
        });

        actionButtonTd.appendChild(nextStepBtn);
        actionButtonTd.appendChild(completeBtn);

        trEl.appendChild(nameTd);
        trEl.appendChild(nextStepInTd);
        trEl.appendChild(actionButtonTd);

        recordsTable.appendChild(trEl);
    }
}

const getRemainingTimeTextFor = data => {
    // Current time
    let now = Math.floor(Date.now() / 1000);

    // Future time is current time + "data['escalation']"
    let offset = data["escalation"] * 60 * 60;
    let creationTimeInSec = Math.floor((new Date(data["time"])).getTime() / 1000);

    let remainingTime = (creationTimeInSec + offset) - now;
    if (remainingTime <= 0) {
        // Past due
        return "<span  class=\"text-danger\">" + secondsToTimeRemaining(remainingTime) + "</span>";
    } else {
        // Some time remains
        return "<span class=\"text-success\">" + secondsToTimeRemaining(remainingTime) + "</span>";
    }
}

const moveToComplete = id => {
    let data = getStorage();

    for (i = 0; i < data.length; i++) {
        if (data[i]["id"] == id) {
            data[i]["isComplete"] = true;
            break;
        }
    }

    updateStorage(data);
}

const moveToNextStep = id => {
    let data = getStorage();

    for (i = 0; i < data.length; i++) {
        if (data[i]["id"] == id) {
            if (data[i]["lastActionBy"] == "them") {
                L("Updating lastActionBy to 'me' for id=" + id)
                data[i]["lastActionBy"] = "me";
            } else {
                L("Updating lastActionBy to 'them' for id=" + id)
                data[i]["lastActionBy"] = "them";
            }
            
            data[i]["time"] = new Date();
            
            break;
        }
    }

    updateStorage(data);
}


const handleSubmit = type => {
    if (type == "main") {
        let time = document.getElementById("main-time").value;
        let name = document.getElementById("main-name").value;

        let escalation = document.getElementById("main-period").value; 
        L("Name: " + name + ", Time: " + time);
        
        let threads = getStorage();
        
        let newThread = {
            id: uuidv4(),
            name: name,
            time: time,
            escalation: escalation,
            lastActionBy: "them", // or "me"
            isComplete: false
        }

        threads.push(newThread);
        window.localStorage.setItem("threads", JSON.stringify(threads));

        reloadRecords();
    }
}

const lastActionToNextStep = lastAction => {
    if (lastAction == "them") {
        return "me";
    }

    return "them";
}

const getStorage = () => {
    let storage = window.localStorage;

    if (storage.getItem("threads") == null) {
        storage.setItem("threads", "[]");
    }

    return JSON.parse(storage.getItem("threads"));
}

const updateStorage = data => {
    if (data) {
        window.localStorage.setItem("threads",JSON.stringify(data));
        return;
    }

    L("ERR: No data to store");
}

/**
 * Source: https://stackoverflow.com/a/2117523
 */
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

/**
 * Source: https://stackoverflow.com/a/36099084
 */
function secondsToTimeRemaining(scnd) {
    var seconds = parseInt(scnd, 10);
    var days = Math.floor(seconds / (3600*24));
    seconds  -= days*3600*24;
    var hrs   = Math.floor(seconds / 3600);
    seconds  -= hrs*3600;
    var mnts = Math.floor(seconds / 60);
    seconds  -= mnts*60;

    return days + "d " + hrs + "h " + mnts + "m " + seconds + "s";
}