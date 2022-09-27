const WORK_LOG_DISPLAY_FORMAT = 'YYYY.MM.DD. HH:mm';

var debounce = function(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    }
};

var deepCopy = function(obj) {
    return JSON.parse(JSON.stringify(obj));
}

var durStrToMinutes = function (dur) {
    let result = 0;
    const hours = dur.match(/(\d+)h/);
    const minutes = dur.match(/(\d+)m/);
    if (hours) { result += parseInt(hours[1], 10) * 60; }
    if (minutes) { result += parseInt(minutes[1], 10); }
    return result;
};

var minutesToDurStr = function (minutes) {
    return moment.duration(minutes, 'm').format("h[h] m[m]");
};

var dateStrToMoment = function(date) {
    return moment(date, WORK_LOG_DISPLAY_FORMAT);
}

var endDateOfTrackItem = function (item) {
    if (item) {
        const start = dateStrToMoment(item.start);
        const duration = durStrToMinutes(item.duration);
        return start.add(duration, 'm').format(WORK_LOG_DISPLAY_FORMAT);
    }
    return '';
}