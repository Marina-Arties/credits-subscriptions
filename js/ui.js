const UI = {
    tabs: ['overview', 'credits', 'subscriptions', 'analytics'],
    currentTab: 'overview',
    charts: {},

    init() {
        this.currentTab = 'overview';
        this.renderMain();
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.nav__btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.nav__btn[data-tab="${tab}"]`);
        if (btn) btn.classList.add('active');
        this.renderMain();
    },

    renderMain() {
        const container = document.getElementById('mainContent');
        switch (this.currentTab) {
            case 'overview': container.innerHTML = this.renderOverview(); break;
            case 'credits': container.innerHTML = this.renderCreditsPage(); break;
            case 'subscriptions': container.innerHTML = this.renderSubscriptionsPage(); break;
            case 'analytics': container.innerHTML = this.renderAnalyticsPage(); setTimeout(() => this.initCharts(), 100); break;
        }
    },

    renderOverview() {
        const credits = Storage.getCredits();
        const subs = Storage.getSubscriptions();
        const totalDebt = credits.reduce((s, c) => s + c.remainingDebt, 0);
        const monthlyMin = credits.reduce((s, c) => s + c.minimumPayment, 0);
        const totalPaid = credits.reduce((s, c) => s + c.actualPaidTotal, 0);
        const monthlySubs = subs.filter(s => s.active).reduce((s, sub) => s + sub.amount, 0);
        const upcoming = Reminders.getUpcomingPayments();

        let html = '<div class="cards-grid">';
        html += `<div class="card"><div class="card__label">Остаток долга</div><div class="card__value card__value--danger">${this.fmoney(totalDebt)}</div><div class="card__sub">По ${credits.length} кредитам</div></div>`;
        html += `<div class="card"><div class="card__label">Мин. платёж / мес</div><div class="card__value card__value--warning">${this.fmoney(monthlyMin)}</div><div class="card__sub">Обязательные платежи</div></div>`;
        html += `<div class="card"><div class="card__label">Фактически оплачено</div><div class="card__value card__value--success">${this.fmoney(totalPaid)}</div><div class="card__sub">Общая сумма выплат</div></div>`;
        html += `<div class="card"><div class="card__label">Подписки / мес</div><div class="card__value card__value--primary">${this.fmoney(monthlySubs)}</div><div class="card__sub">${subs.filter(s => s.active).length} активных</div></div>`;
        html += '</div>';

        if (upcoming.length > 0) {
            html += '<div class="section"><div class="section__header"><h3 class="section__title">Ближайшие списания (3 дня)</h3></div><div class="table-wrap"><table><thead><tr><th>Тип</th><th>Название</th><th>Сумма</th><th>Дата списания</th><th>Дней осталось</th></tr></thead><tbody>';
            upcoming.forEach(p => {
                const daysLeft = this.daysUntil(p.paymentDay);
                const cls = daysLeft < 0 ? 'overdue' : 'upcoming';
                html += `<tr class="${cls}"><td>${p.type === 'credit' ? 'Кредит' : 'Подписка'}</td><td>${this.esc(p.name)}</td><td>${this.fmoney(p.amount)}</td><td>${p.displayDate}</td><td>${daysLeft < 0 ? '<span class="badge badge--danger">Просрочено</span>' : '<span class="badge badge--warning">' + daysLeft + ' дн.</span>'}</td></tr>`;
            });
            html += '</tbody></table></div></div>';
        }

        html += '<div class="section"><div class="section__header"><h3 class="section__title">Все кредиты</h3></div>';
        if (credits.length === 0) {
            html += '<div class="empty-state"><p class="empty-state__text">Нет добавленных кредитов</p></div>';
        } else {
            html += '<div class="table-wrap"><table><thead><tr><th>Банк</th><th>Название</th><th>Остаток</th><th>Мин. платёж</th><th>Ставка</th><th>Оплачено</th><th>Дата</th></tr></thead><tbody>';
            credits.forEach(c => {
                html += `<tr><td>${this.esc(c.bankName)}</td><td>${this.esc(c.creditName)}</td><td>${this.fmoney(c.remainingDebt)}</td><td>${this.fmoney(c.minimumPayment)}</td><td>${c.interestRate}%</td><td>${this.fmoney(c.actualPaidTotal)}</td><td>${c.paymentDay} число</td></tr>`;
            });
            html += '</tbody></table></div>';
        }
        html += '</div>';

        return html;
    },

    renderCreditsPage() {
        const credits = Storage.getCredits();
        let html = '<div class="section"><div class="section__header"><h3 class="section__title">Кредиты</h3><button class="btn btn-primary" onclick="App.showCreditModal()">+ Добавить кредит</button></div>';
        if (credits.length === 0) {
            html += '<div class="empty-state"><p class="empty-state__text">Нет кредитов</p><button class="btn btn-primary" onclick="App.showCreditModal()">Добавить первый кредит</button></div>';
        } else {
            html += '<div class="accordion">';
            credits.forEach(c => {
                const paidPct = c.totalAmount > 0 ? Math.round((c.actualPaidTotal / (c.totalAmount - c.remainingDebt + c.actualPaidTotal)) * 100) : 0;
                const payoffPct = c.totalAmount > 0 ? Math.round(((c.totalAmount - c.remainingDebt) / c.totalAmount) * 100) : 0;
                let debtClass = 'danger';
                if (c.remainingDebt < c.totalAmount * 0.3) debtClass = 'success';
                else if (c.remainingDebt < c.totalAmount * 0.6) debtClass = 'warning';

                html += `<div class="accordion-item" id="accordion-${c.id}">
                    <div class="accordion-header" onclick="UI.toggleAccordion('${c.id}')">
                        <span class="accordion-header__icon">&#9654;</span>
                        <div class="accordion-header__main">
                            <span class="accordion-header__name">${this.esc(c.creditName)}</span>
                            <span class="accordion-header__bank">${this.esc(c.bankName)}</span>
                            <span class="accordion-header__debt accordion-header__debt--${debtClass}">${this.fmoney(c.remainingDebt)}</span>
                        </div>
                        <span class="accordion-header__arrow">&#9660;</span>
                    </div>
                    <div class="accordion-body">
                        <div class="accordion-body__grid">
                            <div class="accordion-body__item">
                                <div class="accordion-body__label">Сумма кредита</div>
                                <div class="accordion-body__value">${this.fmoney(c.totalAmount)}</div>
                            </div>
                            <div class="accordion-body__item">
                                <div class="accordion-body__label">Процентная ставка</div>
                                <div class="accordion-body__value">${c.interestRate}% годовых</div>
                            </div>
                            <div class="accordion-body__item">
                                <div class="accordion-body__label">Мин. платёж / мес</div>
                                <div class="accordion-body__value">${this.fmoney(c.minimumPayment)}</div>
                            </div>
                            <div class="accordion-body__item">
                                <div class="accordion-body__label">Фактически оплачено</div>
                                <div class="accordion-body__value">${this.fmoney(c.actualPaidTotal)}</div>
                            </div>
                            <div class="accordion-body__item">
                                <div class="accordion-body__label">Остаток долга</div>
                                <div class="accordion-body__value accordion-body__value--danger">${this.fmoney(c.remainingDebt)}</div>
                            </div>
                            <div class="accordion-body__item">
                                <div class="accordion-body__label">Дата списания</div>
                                <div class="accordion-body__value">${c.paymentDay} число каждого месяца</div>
                            </div>
                        </div>
                        <div class="accordion-body__progress">
                            <span style="font-size:0.8rem;color:var(--text-secondary)">Погашено: ${payoffPct}%</span>
                            <div class="accordion-body__progress-bar">
                                <div class="accordion-body__progress-fill" style="width:${payoffPct}%;background:var(--primary)"></div>
                            </div>
                        </div>
                        <div class="accordion-body__actions">
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();App.showCreditModal('${c.id}')">Редактировать</button>
                            <button class="btn btn-success btn-sm" onclick="event.stopPropagation();App.logPayment('${c.id}')">Внести платёж</button>
                            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();App.deleteCredit('${c.id}')">Удалить</button>
                        </div>
                    </div>
                </div>`;
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    },

    renderSubscriptionsPage() {
        const subs = Storage.getSubscriptions();
        let html = '<div class="section"><div class="section__header"><h3 class="section__title">Подписки</h3><button class="btn btn-primary" onclick="App.showSubscriptionModal()">+ Добавить подписку</button></div>';
        if (subs.length === 0) {
            html += '<div class="empty-state"><p class="empty-state__text">Нет подписок</p><button class="btn btn-primary" onclick="App.showSubscriptionModal()">Добавить первую подписку</button></div>';
        } else {
            html += '<div class="table-wrap"><table><thead><tr><th>Сервис</th><th>Категория</th><th>Сумма</th><th>Дата списания</th><th>Статус</th><th></th></tr></thead><tbody>';
            subs.forEach(s => {
                html += `<tr>
                    <td>${this.esc(s.serviceName)}</td>
                    <td>${this.esc(s.category)}</td>
                    <td>${this.fmoney(s.amount)}</td>
                    <td>${s.paymentDay} число</td>
                    <td>${s.active ? '<span class="badge badge--success">Активна</span>' : '<span class="badge badge--muted">Неактивна</span>'}</td>
                    <td class="actions-cell">
                        <button class="btn btn-outline btn-sm" onclick="App.showSubscriptionModal('${s.id}')">Ред.</button>
                        <button class="btn btn-outline btn-sm" onclick="App.toggleSubscription('${s.id}')">${s.active ? 'Отключить' : 'Включить'}</button>
                        <button class="btn btn-danger btn-sm" onclick="App.deleteSubscription('${s.id}')">Удал.</button>
                    </td>
                </tr>`;
            });
            html += '</tbody></table></div>';
        }
        html += '</div>';
        return html;
    },

    renderAnalyticsPage() {
        const credits = Storage.getCredits();
        const recs = Analytics.getRecommendations(credits);

        let html = '<div class="cards-grid">';
        const totalDebt = credits.reduce((s, c) => s + c.remainingDebt, 0);
        const monthlyMin = credits.reduce((s, c) => s + c.minimumPayment, 0);
        const weightedRate = credits.length > 0 && totalDebt > 0
            ? (credits.reduce((s, c) => s + c.remainingDebt * c.interestRate, 0) / totalDebt).toFixed(1)
            : '0';
        const totalPaid = credits.reduce((s, c) => s + c.actualPaidTotal, 0);
        html += `<div class="card"><div class="card__label">Общий долг</div><div class="card__value card__value--danger">${this.fmoney(totalDebt)}</div></div>`;
        html += `<div class="card"><div class="card__label">Средняя ставка</div><div class="card__value card__value--warning">${weightedRate}%</div><div class="card__sub">Средневзвешенная</div></div>`;
        html += `<div class="card"><div class="card__label">Мин. платёж / мес</div><div class="card__value card__value--primary">${this.fmoney(monthlyMin)}</div></div>`;
        html += `<div class="card"><div class="card__label">Всего оплачено</div><div class="card__value card__value--success">${this.fmoney(totalPaid)}</div></div>`;
        html += '</div>';

        if (credits.length === 0) {
            html += '<div class="section"><div class="empty-state"><p class="empty-state__text">Добавьте кредиты, чтобы увидеть аналитику</p></div></div>';
            return html;
        }

        html += '<div class="analytics-grid">';
        html += '<div class="section"><h3 class="section__title">Структура долга</h3><div class="chart-container"><canvas id="debtChart"></canvas></div></div>';
        html += '<div class="section"><h3 class="section__title">Минимальные платежи</h3><div class="chart-container"><canvas id="paymentChart"></canvas></div></div>';
        html += '</div>';

        html += '<div class="section"><h3 class="section__title">Рекомендации по погашению</h3>';
        html += '<p style="margin-bottom:12px;color:var(--text-secondary)">Стратегии для максимально быстрого закрытия кредитов:</p>';

        if (recs.avalanche.length > 0) {
            html += '<h4 style="margin-bottom:8px;">Метод Лавина (сначала — с высокой ставкой)</h4>';
            recs.avalanche.forEach(r => {
                html += `<div class="recommendation-card">
                    <h4>#${r.priority} ${this.esc(r.bankName)} — ${this.esc(r.creditName)}</h4>
                    <p>Остаток: ${this.fmoney(r.remainingDebt)} | Ставка: ${r.interestRate}% | Мин. платёж: ${this.fmoney(r.minimumPayment)}</p>
                    <p>Месяцев до погашения: <strong>${r.monthsToPayoff}</strong> | ${r.reason}</p>
                </div>`;
            });
        }

        if (recs.snowball.length > 0) {
            html += '<h4 style="margin:16px 0 8px">Метод Снежный ком (сначала — с малым остатком)</h4>';
            recs.snowball.forEach(r => {
                html += `<div class="recommendation-card">
                    <h4>#${r.priority} ${this.esc(r.bankName)} — ${this.esc(r.creditName)}</h4>
                    <p>Остаток: ${this.fmoney(r.remainingDebt)} | Ставка: ${r.interestRate}% | Мин. платёж: ${this.fmoney(r.minimumPayment)}</p>
                    <p>Месяцев до погашения: <strong>${r.monthsToPayoff}</strong> | ${r.reason}</p>
                </div>`;
            });
        }

        html += '<div class="extra-payment-calc"><h4 style="margin-bottom:8px;">Калькулятор досрочного погашения</h4>';
        html += '<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px;">Узнайте, как дополнительный платёж ускорит закрытие кредита:</p>';
        html += '<select id="extraPaymentCredit" style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-right:8px">';
        credits.forEach(c => {
            html += `<option value="${c.id}">${this.esc(c.bankName)} — ${this.esc(c.creditName)} (${this.fmoney(c.remainingDebt)})</option>`;
        });
        html += '</select>';
        html += '<input type="number" id="extraPaymentAmount" placeholder="Сумма сверх мин. платежа" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;width:200px;margin-right:8px" min="0">';
        html += '<button class="btn btn-primary btn-sm" onclick="Analytics.calculateExtraPaymentImpact()">Рассчитать</button>';
        html += '<div id="extraPaymentResult" class="result"></div></div>';
        html += '</div>';

        return html;
    },

    initCharts() {
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};

        const credits = Storage.getCredits();
        if (credits.length === 0) return;

        const labels = credits.map(c => `${c.bankName}: ${c.creditName}`);
        const colors = ['#1a73e8','#d93025','#f9ab00','#0d904f','#9334e6','#e37400','#1967d2','#c5221f'];

        const debtCtx = document.getElementById('debtChart');
        if (debtCtx) {
            this.charts.debt = new Chart(debtCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: credits.map(c => c.remainingDebt),
                        backgroundColor: colors.slice(0, credits.length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
                        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${UI.fmoney(ctx.raw)}` } }
                    }
                }
            });
        }

        const paymentCtx = document.getElementById('paymentChart');
        if (paymentCtx) {
            this.charts.payment = new Chart(paymentCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Мин. платёж',
                        data: credits.map(c => c.minimumPayment),
                        backgroundColor: colors.slice(0, credits.length),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: ctx => `${UI.fmoney(ctx.raw)}` } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { callback: v => UI.fmoney(v) }
                        }
                    }
                }
            });
        }
    },

    showModal(title, bodyHtml) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHtml;
        document.getElementById('modalOverlay').classList.add('active');
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    },

    toggleAccordion(id) {
        const item = document.getElementById('accordion-' + id);
        if (!item) return;
        item.classList.toggle('open');
    },

    showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show toast--' + (type || 'success');
        setTimeout(() => toast.classList.remove('show'), 2500);
    },

    fmoney(value) {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    },

    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    daysUntil(paymentDay) {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        let targetDate = new Date(currentYear, currentMonth, paymentDay);
        if (paymentDay < currentDay) {
            targetDate = new Date(currentYear, currentMonth + 1, paymentDay);
        }
        return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    },

    getCreditFormHtml(credit) {
        const isEdit = !!credit;
        const data = credit || {};
        const idField = isEdit ? `<input type="hidden" id="creditId" value="${data.id}">` : '';
        return `
            <form id="creditForm" onsubmit="App.saveCredit(event)">
                ${idField}
                <div class="form-row">
                    <div class="form-group"><label>Банк</label><input type="text" id="creditBank" value="${this.esc(data.bankName || '')}" required placeholder="Сбербанк, ВТБ..."></div>
                    <div class="form-group"><label>Название кредита</label><input type="text" id="creditName" value="${this.esc(data.creditName || '')}" required placeholder="Потребительский, Ипотека..."></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Сумма кредита (руб)</label><input type="number" id="creditTotal" value="${data.totalAmount || ''}" required min="0" step="0.01"></div>
                    <div class="form-group"><label>Остаток долга (руб)</label><input type="number" id="creditRemaining" value="${data.remainingDebt || ''}" required min="0" step="0.01"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Процентная ставка (% годовых)</label><input type="number" id="creditRate" value="${data.interestRate || ''}" required min="0" max="100" step="0.1"></div>
                    <div class="form-group"><label>Минимальный платёж (руб/мес)</label><input type="number" id="creditMinPayment" value="${data.minimumPayment || ''}" required min="0" step="0.01"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>День списания (число)</label><input type="number" id="creditPaymentDay" value="${data.paymentDay || ''}" required min="1" max="31"></div>
                    <div class="form-group"><label>Фактически оплачено (руб)</label><input type="number" id="creditPaid" value="${data.actualPaidTotal || 0}" required min="0" step="0.01"></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить' : 'Добавить кредит'}</button>
                </div>
            </form>`;
    },

    getSubscriptionFormHtml(sub) {
        const isEdit = !!sub;
        const data = sub || { active: true };
        const idField = isEdit ? `<input type="hidden" id="subId" value="${data.id}">` : '';
        return `
            <form id="subForm" onsubmit="App.saveSubscription(event)">
                ${idField}
                <div class="form-row">
                    <div class="form-group"><label>Сервис</label><input type="text" id="subService" value="${this.esc(data.serviceName || '')}" required placeholder="Netflix, Spotify..."></div>
                    <div class="form-group"><label>Категория</label>
                        <select id="subCategory">
                            <option value="Стриминг" ${data.category === 'Стриминг' ? 'selected' : ''}>Стриминг</option>
                            <option value="Софт" ${data.category === 'Софт' ? 'selected' : ''}>Софт</option>
                            <option value="Облако" ${data.category === 'Облако' ? 'selected' : ''}>Облако</option>
                            <option value="Музыка" ${data.category === 'Музыка' ? 'selected' : ''}>Музыка</option>
                            <option value="Спорт" ${data.category === 'Спорт' ? 'selected' : ''}>Спорт</option>
                            <option value="Другое" ${data.category === 'Другое' ? 'selected' : ''}>Другое</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Сумма (руб/мес)</label><input type="number" id="subAmount" value="${data.amount || ''}" required min="0" step="0.01"></div>
                    <div class="form-group"><label>День списания (число)</label><input type="number" id="subPaymentDay" value="${data.paymentDay || ''}" required min="1" max="31"></div>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="subActive" ${data.active !== false ? 'checked' : ''}> Подписка активна</label>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить' : 'Добавить подписку'}</button>
                </div>
            </form>`;
    }
};
