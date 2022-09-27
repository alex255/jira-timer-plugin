'use strict';

Vue.component('track-editor', {
    template: /*html*/`
        <div class="track-editor-container" :class="{'for-current': forCurrent, 'read-only': trackEdited.id}">
            <button class="icon-btn track-edit-btn" :class="{active: trOpened}" 
                    @click.exact="toggleEditor" @click.ctrl.exact="deleteTracking" title="Click to edit tracking">
                <span class="material-icons md-18"></span>
            </button>
            <form class="track-editor-form" v-if="trOpened">
                <div class="edit-line">
                    <button type="submit" class="icon-btn track-save-btn" :disabled="trackEdited.id"
                            @click="saveEdited" title="Click to save changes">
                        <span class="material-icons md-18">save</span>
                    </button>
                    <input class="edit-comment" v-model="trackEdited.comment" 
                           :disabled="trackEdited.id" placeholder="# Comment" title="Comment">
                </div>
                <div class="edit-line">
                    <!-- inside a form every button must have a type="button" -->
                    <button type="button" class="icon-btn track-clear-btn" @click="deleteTracking" title="Click to delete tracking">
                        <span class="material-icons md-18">clear</span>
                    </button>
                    <input class="edit-issue" v-model="trackEdited.issue" 
                           :disabled="trackEdited.id" placeholder="ILP-" title="Issue">
                    <input class="edit-start" :value="trackEdited.start" @change="startChange" 
                           :disabled="trackEdited.id" placeholder="YYYY.MM.DD. HH:mm" title="Start time">
                    <span class="edit-alignment">
                        <button type="button" class="icon-btn" @click="alignStart" :disabled="trackEdited.id || !endDateOfPrevHistoryItem"
                                :title="'Align start time with previous track end: ' + endDateOfPrevHistoryItem">
                            <span class="material-icons md-18">vertical_align_bottom</span>
                        </button>
                        <button type="button" class="icon-btn" @click="alignStartAndEnd" title="Align start and end"
                                :disabled="trackEdited.id || !endDateOfPrevHistoryItem || !startDateOfNextHistoryItem">
                            <span class="material-icons md-18">swap_vert</span>
                        </button>
                        <button type="button" class="icon-btn" @click="alignEnd" :disabled="trackEdited.id || !startDateOfNextHistoryItem" 
                                :title="'Align duration with next track start: ' + startDateOfNextHistoryItem">
                            <span class="material-icons md-18">vertical_align_top</span>
                        </button>
                    </span>
                    <input class="edit-duration"v-model="trackEdited.duration" 
                           :disabled="trackEdited.id || forCurrent"  placeholder="xh xm" title="Duration">
                </div>
            </form>
        </div>
    `,
    data: function () {
        return {
            opened: false,
            forCurrent: true,
            idx: -1,
            trackEdited: { start: '', issue: '', comment: '' },
            endDateOfPrevHistoryItem: '',
            startDateOfNextHistoryItem: '',
        }
    },
    props: ['index', 'trOpened'],
    mixins: [
        startTrackingMixin,
        openIssueMixin
    ],
    methods: {
        toggleEditor: function () {
            if (this.forCurrent) {
                this.opened = this.trOpened = !this.trOpened;
            } else {
                this.$emit('editor-toggle', this.idx);
            }
            // wait for parent to update trOpened props
            this.$nextTick(() => this.trOpened ? this.updateTrackEdited() : null);
        },
        saveEdited: function () {
            if (!this.trackEdited.issue && !this.trackEdited.comment) {
                this.trackEdited.comment = '<No comment>';
            }
            if (this.forCurrent) {
                const start = dateStrToMoment(this.trackEdited.start);
                this.trackEdited.duration = minutesToDurStr(moment().diff(start, 'm'));
                this.opened = this.trOpened = false;
                storage.set({ current: this.trackEdited });
            } else {
                this.$emit('editor-toggle', this.idx);
                const newHistory = app.history.map((item, idx) => idx === this.idx ? this.trackEdited : item);
                storage.set({ history: newHistory });
            }
        },
        deleteTracking: function() {
            if (this.forCurrent) {
                this.trackEdited.duration = '0m';
                storage.set({ current: this.trackEdited });
                storage.set({ current: {} });
                this.opened = this.trOpened = false;
            } else {
                const newHistory = app.history.filter((item, idx) => idx !== this.idx);
                storage.set({history: newHistory});
            }
        },
        startChange: function(event) {
            this.updateStartAndDuration(event.target.value);
        },
        alignStart: function() {
            this.updateStartAndDuration(this.endDateOfPrevHistoryItem);
        },
        alignEnd: function() {
            const newEnd = dateStrToMoment(this.startDateOfNextHistoryItem);
            const trackEnd = dateStrToMoment(endDateOfTrackItem(this.trackEdited));
            const trackDuration = durStrToMinutes(this.trackEdited.duration);
            const modifier = newEnd.diff(trackEnd, 'm');
            this.trackEdited.duration = minutesToDurStr(trackDuration + modifier);
        },
        alignStartAndEnd: function() {
            this.alignStart();
            this.alignEnd();
        },
        updateStartAndDuration: function(start) {
            const newStart = dateStrToMoment(start);
            if (!newStart.isValid()) { return start = this.trackEdited.start; }
            start = newStart.format(WORK_LOG_DISPLAY_FORMAT);
            const trackStart = dateStrToMoment(this.trackEdited.start);
            const trackDuration = durStrToMinutes(this.trackEdited.duration);
            const modifier = trackStart.diff(newStart, 'm');
            this.trackEdited.duration = minutesToDurStr(trackDuration + modifier);
            this.trackEdited.start = start;
        },
        updateTrackEdited: function() {
            this.trackEdited = deepCopy(this.forCurrent ? app.current : app.history[this.idx]);
            this.endDateOfPrevHistoryItem = endDateOfTrackItem(app.history[this.idx + 1]);
            if (this.idx > 0) {
                this.startDateOfNextHistoryItem = app.history[this.idx - 1].start;
            } else if (this.idx === 0 && app.current.start) {
                this.startDateOfNextHistoryItem = app.current.start;
            }
        }
    },
    created: function () {
        this.idx = parseInt(this.index, 10);
        this.forCurrent = (this.idx === -1);
        if (this.forCurrent) {
            this.opened = this.trOpened = false;
        }
        this.updateTrackEdited();
        this.$root.$on('editor-toggle', (idx) => this.idx === idx ? this.toggleEditor() : null);
    },
    updated: function () {
        if (this.forCurrent) {
            this.trOpened = this.opened;
            const trackStart = dateStrToMoment(this.trackEdited.start);
            this.trackEdited.duration = minutesToDurStr(moment().diff(trackStart, 'm'))
        }
    },
});
