(function ($, moment, onMessage) {
    'use strict';
    console.log('save-tracking script active...');

    const WORK_LOG_DISPLAY_FORMAT = 'YYYY.MM.DD. HH:mm';
    const WORK_LOG_INPUT_FORMAT = 'DD/MMM/YYYY h:mm A';

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

    onMessage.addListener(function(request) {
        if (request.trackingToSave){
            const track = request.trackingToSave;
            openWorkLog(
                toDateInputFormat(track.start),
                track.duration,
                track.comment
            );
        }
    });

})(jQuery, moment, chrome.runtime.onMessage);
