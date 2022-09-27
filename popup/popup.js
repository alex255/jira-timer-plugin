'use strict';

window.addEventListener('load', function () {
    window.app = new Vue({
        el: '#app',
        data: {
            settings: {},
            current: {},
            history: [],
            focused: [],
            comment: '',
            tab: 1,
            issuePage: false,
            highlighted: false,
        },
        mixins: [
            startTrackingMixin,
            openIssueMixin
        ],
        methods: {
            stopTracking: function () {
                storage.set({ current: {} });
            },
            selectTab: function (tabId) {
                storage.set({ tab: tabId });
            },
        },
        created: function () {
            storage.get({ settings: this.settings, current: this.current, history: this.history, focused: this.focused, tab: this.tab }, function (result) {
                app.$set(app, 'settings', result.settings);
                app.$set(app, 'current', result.current);
                app.$set(app, 'history', result.history);
                app.$set(app, 'focused', result.focused);
                app.$set(app, 'tab', result.tab);
            });
            storage.onChanged.addListener(function (changes) {
                if (changes.settings) { app.$set(app, 'settings', changes.settings.newValue); }
                if (changes.current) { app.$set(app, 'current', changes.current.newValue); }
                if (changes.history) { app.$set(app, 'history', changes.history.newValue); }
                if (changes.focused) { app.$set(app, 'focused', changes.focused.newValue); }
                if (changes.tab) { app.$set(app, 'tab', changes.tab.newValue); }
            });
            tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
                if (tabs && tabs.length && tabs[0].url) {
                    this.issuePage = tabs[0].url.indexOf(issueBaseUrl) === 0;
                }
            });
            sendMessage('wake');
            this.$root.$on('track-hover', (idx, hover) => this.highlighted = idx === -1 ? hover : false);
        }
    });
})