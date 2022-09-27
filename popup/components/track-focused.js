'use strict';

Vue.component('track-focused', {
    template: /*html*/`
        <div class="track-focused">
            <template v-if="focused && focused.length">
                <template v-for="(parentIssue, focusedIndex) in focused" :key="'parent-'+focusedIndex">
                    <div class="focused-parent">
                        <span class="clickable material-icons md-18" 
                            @click="deleteFocused(focusedIndex)" title="Click to delete focus">
                            clear
                        </span>
                        <span class="parent-content">
                            <span class="clickable" @click="openIssue(parentIssue.issue)">{{parentIssue.issue}} / </span>
                            {{parentIssue.summary}}
                        </span>
                    </div>
                    <div class="focused-subtask" v-for="(subtask, index) in parentIssue.subtasks" :key="'subtask-'+index">
                        <button v-if="current.duration" class="icon-btn set-current-btn" 
                                @click="setCurrentIssue(subtask.issue)" title="Set issue for current tracking">
                            <span class="material-icons rotate-180 md-18">wrap_text</span>
                        </button>
                        <span class="item-content">
                            <span class="item-issue">
                                <span class="clickable" @click.exact="openIssue(subtask.issue)" @click.ctrl.exact="copyToClipBoard(subtask.issue)"
                                      :title="'Click to open\\nCtrl + Click to copy'">
                                    {{subtask.issue}} /
                                </span>
                                {{subtask.summary}}
                            </span>
                        </span>
                        <button class="icon-btn track-start" @click="startTracking(subtask)" title="Click to start&#xA;tracking">
                            <span class="material-icons md-20">play_arrow</span>
                        </button>
                    </template>
                    <button class="clear-btn" @click="clearFocused">Clear all focused</button>
                </template>
            </template>
            <template v-else>
                <div class="empty-list">No focused issue</div>
            </template>
        </div>
    `,
    props: ['focused', 'current'],
    mixins: [
        startTrackingMixin,
        openIssueMixin,
        copyToClipBoardMixin
    ],
    methods: {
        setCurrentIssue: function(issue) {
            const newCurrent = deepCopy(this.current);
            newCurrent.issue = issue;
            storage.set({current: newCurrent});
        },
        deleteFocused: function(index) {
            const newFocused = app.focused.filter((item, idx) => idx !== index);
            storage.set({focused: newFocused});
        },
        clearFocused: function() {
            storage.set({focused: []});
        },
    }
});
