(function (document, $, storage, moment, debounce) {
    'use strict';
    console.log('track-control script active...');

    const WORK_LOG_DISPLAY_FORMAT = 'YYYY.MM.DD. HH:mm';

    const START_ICON = 'play_arrow';
    const STOP_ICON = 'timer';
    const START_TITLE = 'Start tracking';
    const STOP_TITLE = 'Stop tracking';
    const START_BTN_HEADER = `<span class="icon-default material-icons track-ctrl header-ctrl" title="${START_TITLE}">${START_ICON}</span>`;
    const START_BTN_SUMMARY = `<span class="icon-default material-icons track-ctrl summary-ctrl" title="${START_TITLE}">${START_ICON}</span>`;
    const START_BTN_SUMMARY_GHX = `<span class="icon-default material-icons track-ctrl ghx-ctrl" title="${START_TITLE}">${START_ICON}</span>`;
    const DURATION = `<div class="track-duration"></div>`;

    let durationEl;
    let current = {};

    storage.get({ current: current }, function(result) {
        current = result.current;
    });

    storage.onChanged.addListener(function (changes) {
        if (changes.current) {
            updateCurrent(changes.current.newValue);
        }
    });

    function updateCurrent(current) {
        startTracking(current.issue);
        updateDuration(current.issue, current.duration);
    }

    function onMutation() {
        let issueLinks, ghxLinks;
        issueLinks = $('.issue-link:not(.processed)');
        if (issueLinks.length && !$('.track-ctrl').length) {
            insertTrackIcons($(issueLinks.get().reverse()), processIssueLink);
        }
        if ($('#ghx-detail-contents').length) {
            ghxLinks = $('.js-detailview.ghx-key:not(.processed)');
            if (ghxLinks.length && !$('.ghx-ctrl').length) {
                insertTrackIcons(ghxLinks, processGhxLink);
            }
        }
        if (issueLinks.length || ghxLinks.length) {
            $('.track-ctrl').off('click', onToggleClick).on('click', onToggleClick);
        }
    }

    function insertTrackIcons(issueLinks, processor) {
        issueLinks.each(function() {
            const link = $(this);
            if (!link.hasClass('processed')) {
                processor(link);
            }
        });
        if (current.issue) {
            updateCurrent(current);
        }
    }

    function processGhxLink(link) {
        const issueKey = link.text();
        if (issueKey.length) {
            const subtask = link.parent().parent().parent();
            if (subtask.length) {
                const summary = subtask.find('.ghx-summary');
                if (summary.length) {
                    $(START_BTN_SUMMARY_GHX).attr('data-issue-key', issueKey).appendTo(summary[0]);
                    link.addClass('processed');
                }
            }
        }
    }

    function processIssueLink(link) {
        const issueKey = link.attr('data-issue-key');
        processHeaderLink(link, issueKey);
        processSummaryLink(link, issueKey);
    }

    function processHeaderLink(link, issueKey) {
        const header = link.parent().parent().parent();
        if (
            header.hasClass('aui-page-header-main') && 
            header.find('.track-ctrl.header-ctrl').length === 0 &&
            header.find('#parent_issue_summary').length > 0
        ) {
            $(START_BTN_HEADER).attr('data-issue-key', issueKey).appendTo(header[0]);
            durationEl = $(DURATION).attr('data-issue-key', issueKey).appendTo(header[0]);
            link.addClass('processed');
        }
    }

    function processSummaryLink(link, issueKey) {
        const summary = link.parent();
        if(summary.hasClass('stsummary')) {
            $(START_BTN_SUMMARY).attr('data-issue-key', issueKey).appendTo(summary[0]);
            link.addClass('processed');
        }
    }

    function onToggleClick() {
        const btn = $(this);
        if (btn.attr('id') === 'tracking') {
            storage.set({current: {}});
        } else {
            current.issue = btn.attr('data-issue-key');
            current.start = moment().format(WORK_LOG_DISPLAY_FORMAT);
            current.duration = '0m';
            current.comment = '';
            storage.set({current: {}}); // save current
            storage.set({current: current});
        }
    }

    function startTracking(issue) {
        stopTracking();
        if (!issue) { return; }
        const btn = $(`.track-ctrl[data-issue-key=${issue}]`);
        if (!btn.length) { return; }
        btn.text(STOP_ICON);
        btn.attr('title', STOP_TITLE + ' 0m');
        btn.attr('id', 'tracking');
    }

    function stopTracking() {
        const btn = $('#tracking');
        if (!btn.length) { return; }
        btn.text(START_ICON);
        btn.attr('title', START_TITLE);
        btn.removeAttr('id');
        updateDuration();
    }

    function updateDuration(issue, duration) {
        if (!durationEl) { return; }
        if (!issue) { durationEl.text(''); }
        const dur = $(`.track-duration[data-issue-key=${issue}]`);
        if (!dur.length) { return ; }
        dur.text(duration || '');
    }

    $(window).focus(function() {
        if (chrome.runtime) {
            chrome.runtime.sendMessage('wake');
        }
    });

    new MutationObserver(debounce(onMutation, 500)).observe(document, { childList: true, subtree: true });
})(document, jQuery, chrome.storage.local, moment, debounce);