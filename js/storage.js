const Storage = {
    KEYS: {
        CREDITS: 'loanapp_credits',
        SUBSCRIPTIONS: 'loanapp_subscriptions',
        SETTINGS: 'loanapp_settings'
    },

    getCredits() {
        return JSON.parse(localStorage.getItem(this.KEYS.CREDITS) || '[]');
    },

    saveCredits(credits) {
        localStorage.setItem(this.KEYS.CREDITS, JSON.stringify(credits));
    },

    addCredit(credit) {
        const credits = this.getCredits();
        credit.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        credit.createdAt = new Date().toISOString();
        credits.push(credit);
        this.saveCredits(credits);
        return credit;
    },

    updateCredit(id, data) {
        const credits = this.getCredits();
        const idx = credits.findIndex(c => c.id === id);
        if (idx !== -1) {
            credits[idx] = { ...credits[idx], ...data };
            this.saveCredits(credits);
        }
    },

    deleteCredit(id) {
        const credits = this.getCredits().filter(c => c.id !== id);
        this.saveCredits(credits);
    },

    getSubscriptions() {
        return JSON.parse(localStorage.getItem(this.KEYS.SUBSCRIPTIONS) || '[]');
    },

    saveSubscriptions(subs) {
        localStorage.setItem(this.KEYS.SUBSCRIPTIONS, JSON.stringify(subs));
    },

    addSubscription(sub) {
        const subs = this.getSubscriptions();
        sub.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        sub.createdAt = new Date().toISOString();
        subs.push(sub);
        this.saveSubscriptions(subs);
        return sub;
    },

    updateSubscription(id, data) {
        const subs = this.getSubscriptions();
        const idx = subs.findIndex(s => s.id === id);
        if (idx !== -1) {
            subs[idx] = { ...subs[idx], ...data };
            this.saveSubscriptions(subs);
        }
    },

    deleteSubscription(id) {
        const subs = this.getSubscriptions().filter(s => s.id !== id);
        this.saveSubscriptions(subs);
    },

    getSettings() {
        return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS) || '{}');
    },

    saveSettings(settings) {
        const current = this.getSettings();
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
    }
};
