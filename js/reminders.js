const Reminders = {
    REMINDER_DAYS: 3,

    getUpcomingPayments() {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const upcoming = [];
        const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        const isWithinWindow = (paymentDay) => {
            if (paymentDay < currentDay) {
                return (paymentDay + this.getDaysInMonth(currentMonth, currentYear)) - currentDay <= this.REMINDER_DAYS;
            }
            return paymentDay - currentDay <= this.REMINDER_DAYS;
        };

        const getDisplayDate = (paymentDay) => {
            let targetMonth = currentMonth;
            let targetYear = currentYear;
            if (paymentDay < currentDay) {
                targetMonth++;
                if (targetMonth > 11) { targetMonth = 0; targetYear++; }
            }
            return `${String(paymentDay).padStart(2, '0')}.${String(targetMonth + 1).padStart(2, '0')}.${targetYear}`;
        };

        const credits = Storage.getCredits();
        credits.forEach(c => {
            if (c.lastPaymentMonth === currentMonthKey) return;
            if (isWithinWindow(c.paymentDay)) {
                upcoming.push({
                    type: 'credit',
                    name: `${c.bankName} — ${c.creditName}`,
                    amount: c.minimumPayment,
                    paymentDay: c.paymentDay,
                    displayDate: getDisplayDate(c.paymentDay)
                });
            }
        });

        const subs = Storage.getSubscriptions().filter(s => s.active);
        subs.forEach(s => {
            if (isWithinWindow(s.paymentDay)) {
                upcoming.push({
                    type: 'subscription',
                    name: s.serviceName,
                    amount: s.amount,
                    paymentDay: s.paymentDay,
                    displayDate: getDisplayDate(s.paymentDay)
                });
            }
        });

        return upcoming;
    },

    checkAndShow() {
        const upcoming = this.getUpcomingPayments();
        const banner = document.getElementById('reminderBanner');
        const text = document.getElementById('reminderText');

        if (upcoming.length === 0) {
            if (banner) banner.style.display = 'none';
            return;
        }

        if (banner && text) {
            const overdue = upcoming.filter(p => {
                const today = new Date();
                return p.paymentDay < today.getDate();
            });
            const soon = upcoming.filter(p => {
                const today = new Date();
                return p.paymentDay >= today.getDate();
            });

            let msg = '';
            if (overdue.length > 0) {
                msg += `Просрочено платежей: ${overdue.length}. `;
            }
            if (soon.length > 0) {
                msg += `Скоро спишется: ${soon.length} платежей в ближайшие 3 дня.`;
            }
            text.textContent = msg;
            banner.style.display = 'block';

            if (Notification.permission === 'granted') {
                upcoming.forEach(p => {
                    const daysLeft = UI.daysUntil(p.paymentDay);
                    const daysText = daysLeft < 0 ? 'ПРОСРОЧЕНО!' : `через ${daysLeft} дн.`;
                    new Notification(`Напоминание: ${p.name}`, {
                        body: `Сумма: ${UI.fmoney(p.amount)} | ${daysText} | ${p.displayDate}`,
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔔</text></svg>'
                    });
                });
            }
        }
    },

    requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },

    getDaysInMonth(month, year) {
        return new Date(year, month + 1, 0).getDate();
    }
};
