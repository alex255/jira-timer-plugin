'use strict';

const storage = chrome.storage.local;
const tabs = chrome.tabs;
const sendMessage = chrome.runtime.sendMessage;
const issueBaseUrl = 'https://nexiuslearning.atlassian.net/browse/';
const RELATIVE_MODIFIER_REGEX = /^- ?(\d+h ?)?(\d+m ?)?((\d+h ?)|(\d+m ?))/;
const START_MODIFIER_REGEX = /^@ ?((\d{1,2}):(\d{1,2})) ?/;


var modifyWithComment = function(newItem) {
    const result = Object.assign({}, newItem);
    modifyRelative(result);
    modifyStart(result);
    return result;
}

var modifyRelative = function(result) {
    if (app.comment.length) {
        const relativeModifier = app.comment.match(RELATIVE_MODIFIER_REGEX);
        if (relativeModifier) {
            const commentWithoutMod = app.comment.replace(relativeModifier[0], '');
            const comment = commentWithoutMod.length ? commentWithoutMod : '<No comment>';
            const modifier = durStrToMinutes(relativeModifier[0]);
            if (app.current.duration) {
                const duration = durStrToMinutes(app.current.duration);
                if (duration > modifier) {
                    result.comment = comment;
                    result.duration = minutesToDurStr(modifier);
                    result.start = moment().subtract(modifier, 'm').format(WORK_LOG_DISPLAY_FORMAT);
                    app.current.duration = minutesToDurStr(duration - modifier);
                    console.log('current modified:', JSON.stringify(app.current));
                    storage.set({ current: Object.assign({}, app.current) });
                }
            } else {
                result.comment = comment;
                result.start = moment().subtract(modifier, 'm').format(WORK_LOG_DISPLAY_FORMAT);
            }
        }
    }
}

var modifyStart = function(result) {
    if (app.comment.length) {
        const startModifier = app.comment.match(START_MODIFIER_REGEX);
        if (startModifier) {
            const commentWithoutMod = app.comment.replace(startModifier[0], '');
            const comment = commentWithoutMod.length ? commentWithoutMod : '<No comment>';
            const start = moment(startModifier[1], 'h:m');
            if(moment().isAfter(start)) {
                if (app.current.duration) {
                    const currentStart = dateStrToMoment(app.current.start);
                    const currentDuration = durStrToMinutes(app.current.duration);
                    const currentEnd = moment(currentStart).add(currentDuration, 'm');
                    console.log('start:', currentStart, start.isBetween(currentStart, currentEnd));
                    if(start.isBetween(currentStart, currentEnd)) {
                        var modifier = currentEnd.diff(start, 'm');
                        result.comment = comment;
                        result.duration = minutesToDurStr(modifier);
                        result.start = start.format(WORK_LOG_DISPLAY_FORMAT);
                        const duration = durStrToMinutes(app.current.duration);
                        app.current.duration = minutesToDurStr(duration - modifier);
                        console.log('current modified:', JSON.stringify(app.current));
                        storage.set({ current: Object.assign({}, app.current) });
                    }
                } else {
                    result.comment = commentWithoutMod.length ? commentWithoutMod : '<No comment>';
                    result.start = start.format(WORK_LOG_DISPLAY_FORMAT);
                }
            }
        }
    }
}
