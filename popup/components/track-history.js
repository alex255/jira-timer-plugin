'use strict';

Vue.component('track-history', {
    template: /*html*/`
        <div class="track-history" :class="{ctrlDown: ctrlDown}">
            <template v-if="history && history.length">
                <template v-for="(historyGroup, day, dayIndex) in historyByDay()" :key="'day-'+dayIndex">
                    <div class="history-group">
                        <button v-if="historyGroup.sync" class="icon-btn sync-btn" @click="syncTrackings(day)"
                                :title="'Synchronize ' + historyGroup.sync + ' tracking(s)'">
                            <span class="material-icons md-14">sync</span>
                        </button>
                        <span class="group-date">{{day}}</span>
                        <span class="group-duration">{{historyGroup.duration}}</span>
                    </div>
                    <div class="history-item-container" v-for="(track, index) in historyGroup.tracks" :key="'track-'+ track.id + (historyGroup.idx + index)">
                        <div class="history-item">
                            <button v-if="fuck" class="icon-btn" @click="saveTracking(track)" title="Save to current tab's issue page">
                                <span class="material-icons md-18">save</span>
                            </button>
                            <span class="item-content" :class="{highlighted: highlighted === historyGroup.idx + index}">
                                <span class="item-text">
                                    <span v-if="track.issue">
                                        <span class="clickable" @click="openIssue(track.parentIssue)" :title="track.parentSummary + '\\nClick to open'">
                                            {{track.parentIssue}} /
                                        </span>
                                        <span class="clickable" @click.exact="openIssue(track.issue)" @click.ctrl.exact="copyToClipBoard(track.issue)"
                                              :title="track.summary + '\\nClick to open\\nCtrl + Click to copy'">
                                            {{track.issue}} /
                                        </span>
                                        {{track.summary}}
                                    </span>
                                    <span v-if="track.comment"># {{track.comment}}</span>
                                </span>
                                <span class="item-duration" :title="'Started at ' + track.start">{{track.duration}}</span>
                            </span>
                            <button class="icon-btn track-start" @click="startTracking(track)" title="Click to start&#xA;tracking again">
                                <span class="material-icons md-20">play_arrow</span>
                            </button>
                        </div>
                        <track-editor :index="historyGroup.idx + index" :trOpened="editorOpened[historyGroup.idx + index].opened" @editor-toggle="editorToggle"></track-editor>
                    </div>
                </template>
                <button class="clear-btn" @click="clearHistory">Clear history</button>
            </template>
            <template v-else>
                <div class="empty-list">No history item</div>
            </template>
        </div>
    `,
    data: function () {
        return {
            editorOpened: [],
            ctrlDown: false,
            highlighted: false
        }
    },
    props: ['history', 'fuck'], //fuck used to be issuePage, but one point it stopped working...
    mixins: [
        startTrackingMixin,
        openIssueMixin,
        copyToClipBoardMixin
    ],
    methods: {
        historyByDay: function () {
            if (!app.history) { return {}; }
            const res = app.history.reduce((acc, cur, idx) => {
                const date = cur.start.split(' ')[0];
                if (!acc[date]) { acc[date] = { tracks: [], duration: 0, sync: 0, idx }; }
                if (cur.issue && !cur.id) { acc[date].sync++; }
                acc[date].duration += durStrToMinutes(cur.duration);
                acc[date].tracks.push(cur);
                return acc;
            }, {});
            Object.keys(res).forEach(date => {
                res[date].duration = minutesToDurStr(res[date].duration);
            });
            return res;
        },
        syncTrackings: function (day) {
            sendMessage({workLog: {action: 'sync', date: day}});
        },
        saveTracking: function(item) {
            tabs.query({active: true, currentWindow: true}, function(tbs) {
                tabs.sendMessage(tbs[0].id, {trackingToSave: item});
            });
        },
        editorToggle: function(index) {
            this.editorOpened[index].opened = !this.editorOpened[index].opened;
            this.editorOpened.forEach((val, idx) => {
                if (idx !== index && val.opened === true) { this.editorOpened[idx].opened = false; }
            });
        },
        clearHistory: function() {
            storage.set({history: []});
        },
        keyDown: function(event) {
            if (event.keyCode === 17 && !this.ctrlDown) { this.ctrlDown = true; }
        },
        keyUp: function(event) {
            if (event.keyCode === 17 && this.ctrlDown) { this.ctrlDown = false; }
        }
    },
    created: function () {
        this.editorOpened = app.history.map(h => ({opened: false}));
        window.addEventListener('keydown', this.keyDown);
        window.addEventListener('keyup', this.keyUp);
        this.$root.$on('track-hover', (idx, hover) => this.highlighted = hover ? idx : false);
    },
    beforeUpdate: function () {
        if (this.editorOpened.length !== app.history.length) {
            this.editorOpened = app.history.map(h => ({opened: false}));
        }
    },
    beforeDestroy: function() {
        window.removeEventListener('keydown', this.keyDown);
        window.removeEventListener('keyup', this.keyUp);
    }
});
