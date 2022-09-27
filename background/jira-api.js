'use strict';

var jiraApi = (function(storage) {
    console.log('jiraApi bg_script active...');

    const fields = ['summary', 'progress', 'timetracking', 'timeoriginalestimate', 'issuetype', 'status', 'assignee', 'parent', 'subtasks'];
    const expand = ['transitions'];

    let current = {};
    let settings = {};

    storage.get({ settings: settings, current: current }, function(result) {
        settings = result.settings;
        current = result.current;
    });
    
    storage.onChanged.addListener(async function (changes) {
        if (changes.current && changes.current.newValue.issue && changes.current.newValue.issue !== current.issue) {
            current = changes.current.newValue;
        }
        if (changes.settings && haveChanges(changes.settings.newValue)) {
            settings = changes.settings.newValue;
            if (settings.jiraUserEmail && settings.jiraUserToken && settings.jiraUrl) {
                try {
                    const myself = await getMySelf();
                    settings.mySelf = mapMySelf(myself);
                    storage.set({settings: settings});
                    console.log('Settings changed:', settings);
                } catch(error) {
                    resetMySelf();
                }
            } else {
                resetMySelf();
            }
        }
    });

    function haveChanges(newValue) {
        return newValue.jiraUserEmail !== settings.jiraUserEmail
            || newValue.jiraUserToken !== settings.jiraUserToken
            || newValue.jiraUrl !== settings.jiraUrl;
    }

    function resetMySelf() {
        if (settings.mySelf) {
            delete settings.mySelf;
            storage.set({settings: settings});
        }
    }

    function mapMySelf(res) {
        return {
            accountId: res.accountId,
            active: res.active,
            avatar: res.avatarUrls['24x24'],
            displayName: res.displayName,
            self: res.self
        };
    }

    async function fetchJson(method, path, fields, expand, body) {
        try {
            let queryParams = fields || expand ? '?' : '';
            queryParams += fields ? 'fields=' + fields.join(',') : '';
            queryParams += fields && expand ? '&' : '';
            queryParams += expand ? 'expand=' + expand.join(',') : '';
            const response = await fetch(`${settings.jiraUrl}/rest/api/2/` + path + queryParams, { 
                method: method, 
                headers: {
                    'Authorization': `${settings.jiraUserEmail}:${settings.jiraUserToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : undefined
            });
            const string = await response.text();
            return string === "" ? {} : JSON.parse(string);
        } catch(error) {
            return error;
        }
    };

    async function getMySelf() {
        return await fetchJson('GET', 'myself');
    };

    async function getIssue(issueKey) {
        return await fetchJson('GET', 'issue/' + issueKey, fields, expand);
    }

    async function getCurrent() {
        if (!current.issue) { return {}; }
        return await getIssue(current.issue);
    }

    async function transitionIssue(issueKey, transitionId) {
        return await fetchJson('POST', `issue/${issueKey}/transitions`, null, null, {
            transition: { id: transitionId }
        });
    }

    async function assignIssue(issueKey) {
        return await fetchJson('PUT', `issue/${issueKey}/assignee`, null, null, {
            accountId: settings.mySelf.accountId
        });
    }

    async function createWorkLog(issue) {
        return await fetchJson('POST', `issue/${issue.issue}/worklog`, null, null, {
            timeSpent: issue.duration,
            comment: issue.comment,
            started: moment.utc(dateStrToMoment(issue.start)).format('YYYY-MM-DDTHH:mm:ss[.000+0000]')
        });
    }

    /** https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-worklog-get */
    async function getIssueWorkLogs(issueKey, startedAfter) {
        let queryParams = startedAfter ? `&startedAfter=${startedAfter}` : '';
        return await fetchJson('GET', `issue/${issueKey}/worklog?maxResults=1000&startAt=0${queryParams}`);
    }

    async function searchIssuesByWorkLogDate(workLogDateFrom) {
        const jql = `worklogDate>="${workLogDateFrom}" and worklogAuthor="${settings.mySelf.accountId}"`;
        return await fetchJson('GET', `search?fields=${['worklog', ...fields].join(',')}&startAt=0&maxResults=1000&jql=${jql}`);
    }

    return {
        getMySelf: getMySelf,
        getIssue: getIssue,
        getCurrent: getCurrent,
        transitionIssue: transitionIssue,
        assignIssue: assignIssue,
        createWorkLog: createWorkLog,
        getIssueWorkLogs: getIssueWorkLogs,
        searchIssuesByWorkLogDate: searchIssuesByWorkLogDate
    };
})(chrome.storage.local);
