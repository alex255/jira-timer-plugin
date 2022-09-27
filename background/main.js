
let interval;
let settings = {};
let current = {};
let history = [];
let focused = [];

const storage = chrome.storage.local;
const browserAction = chrome.browserAction;

storage.get({ settings: settings, current: current, history: history, focused: focused }, function(result) {
    settings = result.settings;
    current = result.current;
    history = result.history;
    focused = result.focused;
    console.log('settings:', settings);
    console.log('current:', current);
    console.log('focused:', focused);
    console.table(history, ['issue', 'comment', 'duration', 'start']);
    defaultSettings();
    updateTimer();
});

storage.onChanged.addListener(async function (changes) {
    await handleCurrentChanges(changes);
    await handleHistoryChanges(changes);
    await handleFocusedChanges(changes);
    // TODO: settings?
});

async function handleCurrentChanges(changes) {
    if (changes.current) {
        if (Object.keys(changes.current.newValue).length === 0 && Object.keys(current).length > 0) {
            console.log('changed to empty so saving current');
            await saveCurrent();
            current = changes.current.newValue;
            updateTimer();
        } else {
            if (haveChanges(changes.current.newValue)) {
                current = changes.current.newValue;
                await updateIssueFromJira(current);
                storage.set({current: current});
                console.log('current issue changed to:', current);
                updateTimer();
            } else {
                current = changes.current.newValue;
                console.log('no changes...', current);
                updateBrowserAction();
            }
        }
    }
}

async function handleHistoryChanges(changes) {
    if (changes.history) {
        if (changes.history.newValue.length < history.length) { // something deleted
            history = changes.history.newValue;
        } else { // something changed
            const changedIdx = changes.history.newValue.findIndex((item, idx) => history[idx] && item.issue !== history[idx].issue);
            history = changes.history.newValue;
            if (changedIdx > -1) {
                await updateIssueFromJira(history[changedIdx]);
                console.log('changedHistoryItem:', history[changedIdx]);
                storage.set({history: history});
            }
        }
    }
}

async function handleFocusedChanges(changes) {
    if (changes.focused) {
        if (focused.length < changes.focused.newValue.length) {
            const newFocusedItem = changes.focused.newValue.find(f => !f.summary);
            await updateIssueAndSubtasksFromJira(newFocusedItem);
            focused = changes.focused.newValue;
            storage.set({focused: changes.focused.newValue});
        } else {
            focused = changes.focused.newValue;
        }
    }
}

function todaysDuration() {
    let sum = 0;
    if (history && history.length) {
        const today = moment().format(WORK_LOG_DISPLAY_FORMAT).split(' ')[0];
        sum += history.filter(h => h.start.indexOf(today) === 0).reduce((acc, cur) => acc += durStrToMinutes(cur.duration), 0);
    }
    return sum + (current && current.duration ? durStrToMinutes(current.duration) : 0);
}

async function updateIssueFromJira(track) {
    if (track) {
        if (track.issue) {
            const issue = await jiraApi.getIssue(track.issue);
            if (issue && issue.fields) {
                track.summary = issue.fields.summary;
                track.parentIssue = issue.fields.parent.key;
                track.parentSummary = issue.fields.parent.fields.summary;
                track.timeoriginalestimate = issue.fields.timeoriginalestimate;
                // transitionIssue(issue);
                // assignIssue(issue);
            }
        } else {
            ['issue', 'summary', 'parentIssue', 'parentSummary', 'timeoriginalestimate'].forEach(k => delete track[k]);
        }
    }
}

async function updateIssueAndSubtasksFromJira(track) {
    if (track && track.issue) {
        const issue = await jiraApi.getIssue(track.issue);
        track.summary = issue.fields.summary;
        track.subtasks = issue.fields.subtasks.map(s => ({
            issue: s.key,
            summary: s.fields.summary,
            parentIssue: track.issue,
            parentSummary: issue.fields.summary
        }));
    }
}

function transitionIssue(issue) {
    if (issue.transitions) {
        issue.transitions.some(t => {
            if (t.name === 'Start Progress') {
                jiraApi.transitionIssue(issue.key, t.id);
                return true;
            }
        });
    }
}

function assignIssue(issue) {
    if (settings.mySelf && (!issue.fields.assignee || issue.fields.assignee.accountId !== settings.mySelf.accountId)) {
        jiraApi.assignIssue(issue.key);
    }
}

function defaultSettings() {
    if (Object.keys(settings).length === 0 || settings.jiraUrl.length === 0) {
        storage.set({settings: {
            jiraUrl: 'https://webshippy.atlassian.net',
            targetTime: '8h'
        }});
    }
}

function haveChanges(newValue) {
    return newValue.issue !== current.issue
        || newValue.comment !== current.comment
        || newValue.start !== current.start;
}

async function saveCurrent() {
    if (!current.start || !current.duration || current.duration === '0m') { return; }
    const item = JSON.parse(JSON.stringify(current));
    history.unshift(item);
    storage.set({history: history});
}

function updateBrowserAction() {
    const today = todaysDuration();
    const overtime = today > durStrToMinutes(settings.targetTime);
    const icon = (current.duration ? (overtime ? 'alert' : 'on') : 'off');
    browserAction.setIcon({path: `images/${icon}-48.png`});
    browserAction.setTitle({title: 'nxTracker' + (current.duration ? 
        (current.issue ? `\ntracking: ${current.issue}` : '') + 
        `\nduration: ${current.duration}` : ''
    )});
    // browserAction.setBadgeText({text: current.issue ? current.duration : ''});
}

function updateTimer() {
    updateBrowserAction();
    return current.issue || current.comment ? startTimer() : stopTimer();
}

function startTimer() {
    stopTimer();
    const update = function() {
        const start = moment(current.start, WORK_LOG_DISPLAY_FORMAT);
        current.duration = moment.duration(moment().diff(start, 'm'), 'm').format("h[h] m[m]");
        storage.set({current: current});
        console.log('tick...', current);
    }
    update();
    interval = setInterval(() => update(), 1000 * 60);
}

function stopTimer() {
    if (interval) { clearInterval(interval); }
}

chrome.runtime.onMessage.addListener(function(message) {
    if (message === 'wake') {
        updateTimer();
    }
});