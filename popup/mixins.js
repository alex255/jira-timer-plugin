'use strict';

const startTrackingMixin = {
    methods: {
        startTracking: function (item) {
            let newItem = Object.assign({}, item, {
                start: moment().format(WORK_LOG_DISPLAY_FORMAT),
                duration: '0m',
                comment: (item ? item.comment : (app.comment.length ? app.comment : '<No comment>')),
            });
            if (newItem.id) { delete newItem.id; }
            if (!item && app.comment.length) {
                newItem = modifyWithComment(newItem);
            }
            storage.set({ current: {} });
            storage.set({ current: newItem });
            app.comment = '';
            app.currentEditor = false;
        }
    }
};

const openIssueMixin = {
    methods: {
        openIssue: function (issue) {
            if (!issue) { return; }
            const currentUrl = issueBaseUrl + issue;
            tabs.query({ url: issueBaseUrl + '*' }, (tbs) => {
                if (!tbs.some(tb => {
                    if (tb.url === currentUrl) {
                        tabs.update(tb.id, { selected: true }); // select tab
                        chrome.windows.update(tb.windowId, { focused: true }); // bring front the window
                        return true;
                    }
                })) {
                    tabs.create({ url: currentUrl });  // open new tab
                }
            });
        }
    }
};

const openLinkMixin = {
    methods: {
        openLink: function (link) {
            if (!link || link.length === 0) { return; }
            tabs.create({ url: link });
        }
    }
};

const copyToClipBoardMixin = {
    methods: {
        copyToClipBoard: function (text) {
            const input = document.createElement('textarea');
            document.body.appendChild(input);
            input.value = text;
            input.focus();
            input.select();
            document.execCommand('Copy');
            input.blur();
            document.body.removeChild(input);
        }
    }
};
