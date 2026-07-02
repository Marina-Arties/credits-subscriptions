const Analytics = {
    getRecommendations(credits) {
        if (credits.length === 0) return { avalanche: [], snowball: [] };

        const calculateMonths = (credit, extraPayment = 0) => {
            const monthlyRate = credit.interestRate / 100 / 12;
            const payment = credit.minimumPayment + extraPayment;
            if (payment <= 0 || credit.remainingDebt <= 0) return 0;
            if (monthlyRate <= 0) {
                return Math.ceil(credit.remainingDebt / payment);
            }
            const n = Math.log(payment / (payment - credit.remainingDebt * monthlyRate)) / Math.log(1 + monthlyRate);
            return Math.max(1, Math.ceil(n));
        };

        const enriched = credits.map(c => ({
            ...c,
            monthsToPayoff: calculateMonths(c)
        }));

        const avalanche = [...enriched].sort((a, b) => b.interestRate - a.interestRate);
        const snowball = [...enriched].sort((a, b) => a.remainingDebt - b.remainingDebt);

        const format = (arr) => arr.map((c, i) => ({
            ...c,
            priority: i + 1,
            reason: this.getReason(c, i, arr)
        }));

        return {
            avalanche: format(avalanche),
            snowball: format(snowball)
        };
    },

    getReason(credit, index, list) {
        if (credit.interestRate >= 20) return 'Высокая ставка — гасите в первую очередь, чтобы сэкономить на процентах.';
        if (credit.remainingDebt <= list.reduce((min, c) => Math.min(min, c.remainingDebt), Infinity)) return 'Самый маленький остаток — быстрое закрытие даст психологический выигрыш.';
        if (index === 0) return 'Наивысший приоритет — начните с этого кредита.';
        return `Закрывайте после кредита #${index}.`;
    },

    calculateExtraPaymentImpact() {
        const creditId = document.getElementById('extraPaymentCredit')?.value;
        const amountInput = document.getElementById('extraPaymentAmount');
        const resultDiv = document.getElementById('extraPaymentResult');

        if (!creditId || !amountInput || !resultDiv) return;

        const credits = Storage.getCredits();
        const credit = credits.find(c => c.id === creditId);
        const extraAmount = parseFloat(amountInput.value) || 0;

        if (!credit || extraAmount <= 0) {
            resultDiv.textContent = 'Введите сумму дополнительного платежа.';
            return;
        }

        const monthlyRate = credit.interestRate / 100 / 12;
        const basePayment = credit.minimumPayment;
        const newPayment = basePayment + extraAmount;

        const calcMonths = (payment) => {
            if (payment <= 0 || credit.remainingDebt <= 0) return Infinity;
            if (monthlyRate <= 0) return Math.ceil(credit.remainingDebt / payment);
            const n = Math.log(payment / (payment - credit.remainingDebt * monthlyRate)) / Math.log(1 + monthlyRate);
            return Math.max(1, Math.ceil(n));
        };

        const baseMonths = calcMonths(basePayment);
        const newMonths = calcMonths(newPayment);
        const monthsSaved = baseMonths - newMonths;
        const totalBasePayments = baseMonths * basePayment;
        const totalNewPayments = newMonths * newPayment;
        const savings = totalBasePayments - totalNewPayments;

        if (newMonths >= baseMonths) {
            resultDiv.innerHTML = `<span style="color:var(--text-secondary)">Дополнительный платёж в ${UI.fmoney(extraAmount)} не сокращает срок (проверьте данные кредита).</span>`;
            return;
        }

        resultDiv.innerHTML = `
            <strong>С доп. платежом ${UI.fmoney(extraAmount)}:</strong><br>
            Срок погашения: <strong>${newMonths} мес.</strong> (было ${baseMonths} мес.)<br>
            Экономия времени: <strong>${monthsSaved} мес.</strong><br>
            Экономия денег: <strong>${UI.fmoney(Math.max(0, savings))}</strong>
        `;
    }
};
