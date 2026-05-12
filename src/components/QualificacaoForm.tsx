'use client';
import { useState } from 'react';

export default function QualificacaoForm() {
    const [form, setForm] = useState({
        lead_name: '', tax_id: '', intent_type: 'Investir',
        financial_capacity: 0, monthly_income: 0,
        decision_urgency: 'medio', has_collateral: false,
        consent_credit_check: true, target_roi: 15
    });
    const [status, setStatus] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('enviando');
        const res = await fetch('/api/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        const data = await res.json();
        setStatus(data.decision === 'ATACAR' ? 'aprovado' : data.decision === 'NUTRIR' ? 'nutrir' : 'rejeitado');
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg border border-gray-700 space-y-6">
            <h2 className="text-2xl font-bold text-[#D4AF37]">Qualificação Soberana</h2>
            <input type="text" placeholder="Nome completo" required className="w-full p-3 bg-gray-700 rounded"
                onChange={e => setForm({...form, lead_name: e.target.value})} />
            <input type="text" placeholder="CPF/CNPJ" required className="w-full p-3 bg-gray-700 rounded"
                onChange={e => setForm({...form, tax_id: e.target.value})} />
            <select className="w-full p-3 bg-gray-700 rounded"
                onChange={e => setForm({...form, intent_type: e.target.value})}>
                <option value="Investir">Investir</option>
                <option value="Comprar">Comprar</option>
                <option value="Alugar">Alugar</option>
                <option value="Land Banking">Land Banking</option>
            </select>
            <input type="number" placeholder="Orçamento disponível (R$)" required className="w-full p-3 bg-gray-700 rounded"
                onChange={e => setForm({...form, financial_capacity: Number(e.target.value)})} />
            <input type="number" placeholder="Renda mensal comprovável (R$)" required className="w-full p-3 bg-gray-700 rounded"
                onChange={e => setForm({...form, monthly_income: Number(e.target.value)})} />
            <select className="w-full p-3 bg-gray-700 rounded"
                onChange={e => setForm({...form, decision_urgency: e.target.value})}>
                <option value="medio">Médio (1-3 meses)</option>
                <option value="urgente">Urgente (até 30 dias)</option>
                <option value="longo">Longo (mais de 3 meses)</option>
            </select>
            <label className="flex items-center gap-2 text-gray-300">
                <input type="checkbox" checked={form.has_collateral}
                    onChange={e => setForm({...form, has_collateral: e.target.checked})} />
                Possui imóvel para garantia?
            </label>
            <input type="number" placeholder="ROI esperado (%)" required className="w-full p-3 bg-gray-700 rounded"
                onChange={e => setForm({...form, target_roi: Number(e.target.value)})} />
            <button type="submit" className="btn-gold-glow w-full py-3 rounded-lg font-bold"
                disabled={status === 'enviando'}>
                {status === 'enviando' ? 'Processando...' : 'Enviar Qualificação'}
            </button>
            {status === 'aprovado' && <p className="text-green-400 font-semibold">Aprovado! Em instantes você será conectado ao nosso time.</p>}
            {status === 'nutrir' && <p className="text-yellow-400 font-semibold">Recebemos sua qualificação. Vamos nutri-lo com conteúdos exclusivos.</p>}
            {status === 'rejeitado' && <p className="text-red-400 font-semibold">No momento não temos um match adequado. Manteremos seu perfil em prospecção.</p>}
        </form>
    );
}
