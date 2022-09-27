'use strict';

Vue.component('track-timeline', {
    template: /*html*/`
        <div class="track-timeline" :title="getTitle()">
            <div class="timeline-item overtime" v-if="settings && overtime && overtime > 0"
                    :style="{ right: 0, width: overtime + '%' }" :title="'!! Overtime !!\\nSince: ' + overtimeFrom"
            ></div>
            <template v-if="history && timeline.length">
                <div class="timeline-item" v-for="(item, index) in timeline" :key="'timeline-'+index" 
                     :style="{ left: item.left + '%', width: item.width + '%' }" :title="getItemTitle(item)" 
                     @click="open(index)" @mouseleave="hover(index, false)" @mouseover="hover(index, true)"
                ></div>
            </template>
            <div class="timeline-item current" v-if="current && current.duration"
                    :style="{ left: currentItem.left + '%', width: currentItem.width + '%' }"
                    :title="'Current tracking:\\n' + getItemTitle(currentItem)"
                    @click="open(-1)" @mouseleave="hover(-1, false)" @mouseover="hover(-1, true)"
            ><span></span></div>
        </div>
    `,
    data: function () {
        return {
            timeline: [],
            currentItem: { left: 0, width: 0, end: '' },
            target: 8 * 60,
            targetStr: '8h',
            sumStr: '0m',
            dayEndStr: '-',
            overtime: 0,
            overtimeFrom: ''
        }
    },
    props: ['history', 'current', 'settings'],
    methods: {
        getTitle: function() {
            return `Progress: ${this.sumStr} / ${this.targetStr}\nEnd of day: ${this.dayEndStr}`;
        },
        getItemTitle: function (track) {
            return (track.issue ? `${track.parentIssue} / ${track.issue} / ${track.summary}` : '') + 
                (track.issue && track.comment ? ' ' : '') +
                (track.comment ? '# ' + track.comment : '') +
                '\n' + track.start.split(' ')[1] + ' <- ' + track.duration + ' -> ' + track.end.split(' ')[1];
        },
        open: function(index) {
            this.$root.$emit('editor-toggle', index);
        },
        hover: function(index, over) {
            this.$root.$emit('track-hover', index, over);
        }
    },
    beforeUpdate: function () {
        if (this.settings.targetTime) {
            this.targetStr = this.settings.targetTime;
            this.target = durStrToMinutes(this.settings.targetTime);
        }
        if (this.history.length || this.current.duration) {
            let historyToday, overtimeDate;
            let sumToday = 0;

            if (this.history.length) {
                const today = moment().format(WORK_LOG_DISPLAY_FORMAT).split(' ')[0];
                historyToday = deepCopy(this.history.filter(h => h.start.indexOf(today) === 0));
                sumToday += historyToday.slice().reverse().reduce((acc, cur) => {
                    const dur = durStrToMinutes(cur.duration);
                    acc += dur;
                    if (!overtimeDate && acc > this.target) {
                        overtimeDate = dateStrToMoment(cur.start).add(dur - (acc - this.target), 'm');
                    }
                    return acc; 
                }, 0);
            }
            if (this.current.duration) {
                const dur = durStrToMinutes(this.current.duration);
                sumToday += dur;
                if (!overtimeDate && sumToday > this.target) {
                    overtimeDate = dateStrToMoment(this.current.start).add(dur - (sumToday - this.target), 'm');
                }
            }

            if (historyToday.length || this.current.duration) {
                const dayStart = dateStrToMoment(historyToday.length ? historyToday.slice(-1)[0].start : this.current.start);
                const allTracksEnd = dateStrToMoment(endDateOfTrackItem(this.current.duration ? this.current : historyToday[0]));
                const dayEnd = moment(allTracksEnd).add(this.target - sumToday, 'm');
                const minsPerDay = allTracksEnd.isBefore(dayEnd) ? dayEnd.diff(dayStart, 'm') : allTracksEnd.diff(dayStart, 'm');

                const extendItem = function(item) {
                    const mins = durStrToMinutes(item.duration);
                    const start = dateStrToMoment(item.start);
                    item.left = ((start.diff(dayStart, 'm') / minsPerDay) * 100).toFixed(1);
                    item.width = ((mins / minsPerDay) * 100).toFixed(1);
                    item.end = endDateOfTrackItem(item);
                    return item;
                }

                this.timeline = historyToday.length ? historyToday.map(h => extendItem(h)) : [];
                this.currentItem = this.current.duration ? extendItem(deepCopy(this.current)) : { left: 0, width: 0, end: '' };
                this.overtime = overtimeDate ? (((minsPerDay - overtimeDate.diff(dayStart, 'm')) / minsPerDay) * 100).toFixed(1) : 0;
                this.overtimeFrom = overtimeDate ? overtimeDate.format(WORK_LOG_DISPLAY_FORMAT).split(' ')[1] : '';
                this.sumStr = minutesToDurStr(sumToday);
                this.dayEndStr = moment(dayEnd).format(WORK_LOG_DISPLAY_FORMAT).split(' ')[1];
            }
        }
    }
});
