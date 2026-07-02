const App = {
    init() {
        document.querySelectorAll('.nav__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                UI.switchTab(btn.dataset.tab);
            });
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        Reminders.requestPermission();
        Reminders.checkAndShow();
        UI.init();
    },

    showCreditModal(id) {
        let credit = null;
        if (id) {
            credit = Storage.getCredits().find(c => c.id === id);
        }
        UI.showModal(
            credit ? 'Редактировать кредит' : 'Добавить кредит',
            UI.getCreditFormHtml(credit)
        );
    },

    saveCredit(event) {
        event.preventDefault();
        const id = document.getElementById('creditId')?.value;
        const data = {
            bankName: document.getElementById('creditBank').value.trim(),
            creditName: document.getElementById('creditName').value.trim(),
            totalAmount: parseFloat(document.getElementById('creditTotal').value) || 0,
            remainingDebt: parseFloat(document.getElementById('creditRemaining').value) || 0,
            interestRate: parseFloat(document.getElementById('creditRate').value) || 0,
            minimumPayment: parseFloat(document.getElementById('creditMinPayment').value) || 0,
            paymentDay: parseInt(document.getElementById('creditPaymentDay').value) || 1,
            actualPaidTotal: parseFloat(document.getElementById('creditPaid').value) || 0
        };

        if (!data.bankName || !data.creditName) {
            UI.showToast('Заполните название банка и кредита', 'error');
            return;
        }

        if (id) {
            Storage.updateCredit(id, data);
            UI.showToast('Кредит обновлён');
        } else {
            Storage.addCredit(data);
            UI.showToast('Кредит добавлен');
        }
        this.closeModal();
        UI.renderMain();
        Reminders.checkAndShow();
    },

    deleteCredit(id) {
        if (!confirm('Удалить кредит?')) return;
        Storage.deleteCredit(id);
        UI.showToast('Кредит удалён');
        UI.renderMain();
        Reminders.checkAndShow();
    },

    logPayment(id) {
        const credits = Storage.getCredits();
        const credit = credits.find(c => c.id === id);
        if (!credit) return;

        const amount = prompt(
            `Внести платёж по кредиту "${credit.bankName} — ${credit.creditName}"\nОстаток: ${UI.fmoney(credit.remainingDebt)}\nМин. платёж: ${UI.fmoney(credit.minimumPayment)}`,
            credit.minimumPayment
        );

        if (amount === null) return;
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) return;

        const newPaid = credit.actualPaidTotal + paymentAmount;
        const newRemaining = Math.max(0, credit.remainingDebt - paymentAmount);

        Storage.updateCredit(id, {
            actualPaidTotal: newPaid,
            remainingDebt: newRemaining
        });

        UI.showToast(`Платёж ${UI.fmoney(paymentAmount)} внесён. Остаток: ${UI.fmoney(newRemaining)}`);
        UI.renderMain();
        Reminders.checkAndShow();
    },

    showSubscriptionModal(id) {
        let sub = null;
        if (id) {
            sub = Storage.getSubscriptions().find(s => s.id === id);
        }
        UI.showModal(
            sub ? 'Редактировать подписку' : 'Добавить подписку',
            UI.getSubscriptionFormHtml(sub)
        );
    },

    saveSubscription(event) {
        event.preventDefault();
        const id = document.getElementById('subId')?.value;
        const data = {
            serviceName: document.getElementById('subService').value.trim(),
            category: document.getElementById('subCategory').value,
            amount: parseFloat(document.getElementById('subAmount').value) || 0,
            paymentDay: parseInt(document.getElementById('subPaymentDay').value) || 1,
            active: document.getElementById('subActive').checked
        };

        if (!data.serviceName) {
            UI.showToast('Введите название сервиса', 'error');
            return;
        }

        if (id) {
            Storage.updateSubscription(id, data);
            UI.showToast('Подписка обновлена');
        } else {
            Storage.addSubscription(data);
            UI.showToast('Подписка добавлена');
        }
        this.closeModal();
        UI.renderMain();
        Reminders.checkAndShow();
    },

    deleteSubscription(id) {
        if (!confirm('Удалить подписку?')) return;
        Storage.deleteSubscription(id);
        UI.showToast('Подписка удалена');
        UI.renderMain();
        Reminders.checkAndShow();
    },

    toggleSubscription(id) {
        const subs = Storage.getSubscriptions();
        const sub = subs.find(s => s.id === id);
        if (!sub) return;
        Storage.updateSubscription(id, { active: !sub.active });
        UI.showToast(sub.active ? 'Подписка отключена' : 'Подписка включена');
        UI.renderMain();
        Reminders.checkAndShow();
    },

    closeModal() {
        UI.closeModal();
    },

    exportData() {
        const data = {
            credits: Storage.getCredits(),
            subscriptions: Storage.getSubscriptions(),
            settings: Storage.getSettings(),
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `credits_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.showToast('Данные экспортированы. Сохраните файл в облачную папку для синхронизации.');
    },

    importData(input) {
        if (!input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.credits || !data.subscriptions) {
                    UI.showToast('Неверный формат файла', 'error');
                    return;
                }
                const action = confirm(
                    'Заменить текущие данные импортированными?\n\n' +
                    'OK — заменить все данные\nОтмена — объединить (добавить новые записи к существующим)'
                );
                if (action) {
                    Storage.saveCredits(data.credits);
                    Storage.saveSubscriptions(data.subscriptions);
                    if (data.settings) Storage.saveSettings(data.settings);
                } else {
                    const existingCredits = Storage.getCredits();
                    const existingSubs = Storage.getSubscriptions();
                    const mergedCredits = [...existingCredits];
                    data.credits.forEach(c => {
                        if (!mergedCredits.find(e => e.id === c.id)) mergedCredits.push(c);
                    });
                    const mergedSubs = [...existingSubs];
                    data.subscriptions.forEach(s => {
                        if (!mergedSubs.find(e => e.id === s.id)) mergedSubs.push(s);
                    });
                    Storage.saveCredits(mergedCredits);
                    Storage.saveSubscriptions(mergedSubs);
                }
                UI.showToast('Данные импортированы');
                UI.renderMain();
                Reminders.checkAndShow();
            } catch (err) {
                UI.showToast('Ошибка чтения файла', 'error');
            }
        };
        reader.readAsText(input.files[0]);
        input.value = '';
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
