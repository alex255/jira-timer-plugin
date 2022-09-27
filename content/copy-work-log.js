(function (document, $, moment, debounce) {
    'use strict';
    console.log('copy-work-log script active...');

    const WORK_LOG_DISPLAY_FORMAT = 'YYYY.MM.DD. HH:mm';
    const WORK_LOG_INPUT_FORMAT = 'DD/MMM/YYYY h:mm A';
    const COPY_LINK = 
        `<a href="#" class="copy-link" title="Copy work log">
            <span class="icon-default material-icons md-16">queue</span>
        </a>`;

    function onMutation() {
        const isWorkLogPanelActive = !!$('#worklog-tabpanel.active').length;
        if (isWorkLogPanelActive) {
            const copyControlsInserted = !!$('.copy-link').length;
            if (!copyControlsInserted) {
                insertCopyIcons($('.issue-data-block'));
            }
        }
    }

    function insertCopyIcons(workLogItems) {
        workLogItems.each(function() {
            const links = $(this).find('.action-links');
            if (links.children().length < 2) {
                $(COPY_LINK).appendTo(links).on('click', onCopyClick);
            }
        });
    }

    function onCopyClick() {
        const workLogContainer = $(this).parent().parent().parent();
        const date = workLogContainer.find('span.date').text();
        const start = toDateInputFormat(date);
        const duration = workLogContainer.find('.worklog-duration').text();
        let comment = workLogContainer.find('.worklog-comment').text().trim();
        comment = comment !== '<No comment>' ? comment : '';
        openWorkLog(start, duration, comment);
    }

    function openWorkLog(start, duration, comment) {
        $('#log-work')[0].click();
        setTimeout(() => {
            $("#log-work-time-logged").val(duration);
            $("#log-work-date-logged-date-picker").val(start);
            $("#log-work-dialog #comment").val(comment);
        }, 500);
    }

    function toDateInputFormat(date) {
        return moment(date, WORK_LOG_DISPLAY_FORMAT).format(WORK_LOG_INPUT_FORMAT);
    }

    new MutationObserver(debounce(onMutation, 500)).observe(document, { childList: true, subtree: true });
})(document, jQuery, moment, debounce);
