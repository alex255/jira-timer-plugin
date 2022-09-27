
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.workLog) {
        if (message.workLog.action === 'load') {
            getWorkLogForDaysBefore(message.workLog.days).then((result) => {
                storage.set({history: result});
                sendResponse('ok');
            });
            return true; // makes it async
        }
        if (message.workLog.action === 'sync') {
            console.log('sync...', message.workLog.date);
            syncWorkLogForDate(message.workLog.date);
        }
    }
});

async function getWorkLogForDaysBefore(days) {
    const from = moment().subtract(days, 'd').startOf('day').utc();
    const workLogDateFrom = from.format('YYYY-MM-DD');
    const startedAfter = from.valueOf();
    const result = await jiraApi.searchIssuesByWorkLogDate(workLogDateFrom);
    console.log(`getWorkLogForDaysBefore ${days} result`, result);

    let workLogs = [];
    for (issue of result.issues) {
        const issueLog = issue.fields.worklog;
        if (issueLog.total < issueLog.maxResults) {
            issueLog.worklogs.filter(l => workLogFilter(l, from)).forEach(
                log => workLogs.push(workLogToHistoryItem(issue, log))
            );
        } else {
            const bigIssue = await jiraApi.getIssueWorkLogs(issue.key, startedAfter);
            bigIssue.worklogs.filter(l => workLogFilter(l, from)).forEach(
                log => workLogs.push(workLogToHistoryItem(issue, log))
            );
        }
    }
    workLogs.sort((a, b) => b.start.diff(a.start));
    console.log(`getWorkLogForDaysBefore ${days} result as workLogs`, workLogs);
    workLogs = workLogs.map(log => ({...log, start: log.start.format(WORK_LOG_DISPLAY_FORMAT)}));
    console.table(workLogs, ['issue', 'comment', 'summary', 'start', 'duration']);
    return workLogs;
}

function syncWorkLogForDate(date) {
    storage.get({ history: [] }, async function(result) {
        for (item of result.history) {
            if (item.start.indexOf(date) === 0 && item.issue && !item.id) {
                const created = await jiraApi.createWorkLog(item);
                if (created.id) { item.id = created.id; }
            }
        }
        storage.set({history: result.history});
    });
}

function workLogFilter(log, from) {
    return log.author.accountId === settings.mySelf.accountId && moment(log.started).isAfter(from)
}

function workLogToHistoryItem(issue, workLog) {
    return {
        issue: issue.key,
        id: workLog.id,
        comment: workLog.comment,
        start: moment(workLog.started),
        duration: workLog.timeSpent,
        summary: issue.fields.summary,
        parentIssue: issue.fields.parent.key,
        parentSummary: issue.fields.parent.fields.summary,
        timeoriginalestimate: issue.fields.timeoriginalestimate,
    }
}