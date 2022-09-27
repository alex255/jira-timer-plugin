(function (document, $, storage, debounce) {
    'use strict';
    console.log('focus-control script active...');

    const START_ICON = 'gps_not_fixed';
    const STOP_ICON = 'gps_fixed';
    const START_TITLE = 'Focus this issue';
    const STOP_TITLE = 'Stop focusing this issue';
    const START_BTN_HEADER = `<span class="icon-default material-icons focus-ctrl header-ctrl" title="${START_TITLE}">${START_ICON}</span>`;

    let focused = [];

    storage.get({ focused: focused }, function(result) {
        focused = result.focused;
        console.log('focused:', focused);
    });

    storage.onChanged.addListener(function (changes) {
        if (changes.focused) {
            focused = changes.focused.newValue;
            focused.forEach(f => startFocusing(f));
        }
    });

    function onMutation() {
        const issueLinks = $('.issue-link');
        if (issueLinks.length && !$('.focus-ctrl').length) {
            insertFocusIcons($(issueLinks.get().reverse()));
            $('.focus-ctrl').on('click', onToggleClick);
        }
    }

    function insertFocusIcons(issueLinks) {
        issueLinks.each(function() {
            const link = $(this);
            if (!link.hasClass('processed')) {
                processIssueLink(link);
            }
        });
        focused.forEach(f => startFocusing(f));
    }

    function processIssueLink(link) {
        const issueKey = link.attr('data-issue-key');
        processHeaderLink(link, issueKey);
    }

    function processHeaderLink(link, issueKey) {
        const header = link.parent().parent().parent();
        if (
            header.hasClass('aui-page-header-main') && 
            header.find('.focus-ctrl.header-ctrl').length === 0 &&
            header.find('#parent_issue_summary').length === 0
        ) {
            $(START_BTN_HEADER).attr('data-issue-key', issueKey).appendTo(header[0]);
            link.addClass('processed');
        }
    }

    function onToggleClick() {
        const btn = $(this);
        const issue = btn.attr('data-issue-key');
        if (btn.attr('id') === 'focused') {
            const newFocused = focused.filter(f => f.issue !== issue);
            stopFocusing();
            storage.set({focused: newFocused});
        } else {
            focused.push({issue});
            storage.set({focused: focused});
        }
    }

    function startFocusing(focused) {
        stopFocusing();
        if (!focused.issue) { return; }
        const btn = $(`.focus-ctrl[data-issue-key=${focused.issue}]`);
        if (!btn.length) { return; }
        btn.text(STOP_ICON);
        btn.attr('title', STOP_TITLE);
        btn.attr('id', 'focused');
    }

    function stopFocusing() {
        const btn = $('#focused');
        if (!btn.length) { return; }
        btn.text(START_ICON);
        btn.attr('title', START_TITLE);
        btn.removeAttr('id');
    }

    new MutationObserver(debounce(onMutation, 500)).observe(document, { childList: true, subtree: true });
})(document, jQuery, chrome.storage.local, debounce);