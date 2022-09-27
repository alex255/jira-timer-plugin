'use strict';

Vue.component('track-settings', {
    template: /*html*/`
        <div class="track-settings">
            <div class="setting-profile" v-if="settings && settings.mySelf">
                <img class="profile-image" :src="settings.mySelf.avatar">
                <span class="profile-name clickable" @click="openLink(settings.jiraUrl + '/jira/people/' + settings.mySelf.accountId)">
                    {{ settings.mySelf.displayName }}
                </span>
            </div>
            <div class="setting-profile empty-profile" v-else>
                <span class="material-icons">account_circle</span>
                <span>No user</span>
            </div>
            <div v-if="settings">
                <fieldset>
                    <legend>Jira</legend>
                    <div class="track-setting">
                        <label for="jiraUrl">Url: </label>
                        <input name="jiraUrl" v-model="settings.jiraUrl" placeholder="http://">
                    </div>
                    <div class="track-setting">
                        <label for="jiraUserEmail">User email: </label>
                        <input name="jiraUserEmail" v-model="settings.jiraUserEmail" placeholder="user@mail.io">
                    </div>
                    <div class="track-setting">
                        <label for="jiraUserToken">User token: </label>
                        <input name="jiraUserToken" v-model="settings.jiraUserToken" type="password" placeholder="R4nD0mCh4R4ct3r5...">
                        <span class="clickable material-icons md-18" @click="openLink('https://confluence.atlassian.com/cloud/api-tokens-938839638.html')">
                            help_outline
                        </span>
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Misc</legend>
                    <div class="track-setting">
                        <label for="targetTime">Daily work: </label>
                        <input name="targetTime" v-model="settings.targetTime" placeholder="xh xm">
                    </div>
                </fieldset>
                <fieldset>
                    <legend>WorkLog synchronization</legend>
                    <div class="track-setting">
                        <label for="loadDays">For the last </label>
                        <input name="loadDays" v-model="daysToLoad">
                        <span>days</span>&nbsp;&nbsp;
                        <button class="load-btn" @click="loadWorkLog">
                            Load <span class="loader" v-if="loading"></span>
                        </button>
                    </div>
                </fieldset>
                <button class="clear-btn" @click="saveSettings">Save</button>
            </div>
        </div>
    `,
    data: function () {
        return {
            daysToLoad: 5,
            loading: false,
        }
    },
    props: ['settings'],
    mixins: [
        openLinkMixin
    ],
    methods: {
        loadWorkLog: function() {
            this.loading = true;
            sendMessage({workLog: {action: 'load', days: this.daysToLoad}}, (result) => {
                console.log('result:', result);
                this.loading = false;
            });
        },
        saveSettings: function() {
            storage.set({ settings: app.settings });
        }
    }
});
